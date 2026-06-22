// ============================================================
// DecidArch LLM experiment — vLLM client
// ============================================================
// Thin wrapper over the vLLM OpenAI-compatible /chat/completions
// endpoint. Disables "thinking" for bounded, comparable token use,
// accumulates prompt/completion tokens, and offers a validated-JSON
// helper with a single reprompt before the caller falls back.

import { VLLM_BASE_URL, GEN } from './config.mjs';

/**
 * Create a client bound to one served model. Tracks cumulative token
 * usage and the number of LLM calls across the whole game.
 */
export function createLLM({ model, baseUrl = VLLM_BASE_URL, log = () => {} }) {
  const usage = { promptTokens: 0, completionTokens: 0, calls: 0, failures: 0 };
  // Full, ordered record of every LLM interaction in the game (prompt messages,
  // response, per-call token usage) for the replication package.
  const transcript = [];

  async function rawChat(messages, { temperature, label = '', maxTokens = GEN.maxTokens } = {}) {
    const body = {
      model,
      messages,
      temperature,
      // Generous safety-rail cap (see config.GEN.maxTokens) — stops rambles,
      // never clips a normal concise answer. No word-count hints in the prompts.
      max_tokens: maxTokens,
      // vLLM passes this through to the chat template. Both gemma4 and
      // Qwen3 templates honour enable_thinking; harmless if ignored.
      chat_template_kwargs: { enable_thinking: GEN.enableThinking },
    };

    let lastErr;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          lastErr = new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
          await sleep(800 * (attempt + 1));
          continue;
        }
        const json = await res.json();
        const u = json.usage || {};
        usage.promptTokens += u.prompt_tokens || 0;
        usage.completionTokens += u.completion_tokens || 0;
        usage.calls += 1;
        const content = json.choices?.[0]?.message?.content ?? '';
        transcript.push({
          call: usage.calls,
          label,
          temperature,
          messages,
          response: content.trim(),
          prompt_tokens: u.prompt_tokens || 0,
          completion_tokens: u.completion_tokens || 0,
        });
        return content.trim();
      } catch (err) {
        lastErr = err;
        await sleep(800 * (attempt + 1));
      }
    }
    throw lastErr || new Error('LLM request failed');
  }

  /** Free-text completion (used for debate chat turns). */
  async function text(messages, { temperature = GEN.tempAdvocacy, label = '', maxTokens } = {}) {
    return rawChat(messages, { temperature, label, maxTokens });
  }

  /**
   * JSON completion validated against a set of legal option ids. Returns
   * the parsed object {optionId, ...} or null if the model never produced
   * a valid option (after one corrective reprompt). On null the caller is
   * expected to apply a deterministic fallback.
   */
  async function chooseOption(messages, validOptionIds, { temperature = GEN.tempAdvocacy, label = '' } = {}) {
    const valid = new Set(validOptionIds);
    let convo = messages;
    for (let attempt = 0; attempt < 2; attempt++) {
      const content = await rawChat(convo, { temperature, label });
      const parsed = extractJson(content);
      if (parsed && typeof parsed.optionId === 'string' && valid.has(parsed.optionId)) {
        return { optionId: parsed.optionId, rationale: String(parsed.rationale ?? parsed.reason ?? '').trim(), raw: content };
      }
      // One corrective reprompt naming the exact legal ids.
      convo = [
        ...messages,
        { role: 'assistant', content },
        {
          role: 'user',
          content:
            `That was not valid. Reply with ONLY a JSON object and pick optionId from EXACTLY this list: ` +
            `${[...valid].join(', ')}. Format: {"optionId":"<one of the list>","rationale":"<short>"}`,
        },
      ];
    }
    usage.failures += 1;
    log(`  ⚠️  LLM gave no valid optionId after reprompt — caller will fall back.`);
    return null;
  }

  return { text, chooseOption, usage, transcript, model };
}

/** Pull the first JSON object out of a model response (tolerates fences/prose). */
export function extractJson(s) {
  if (!s) return null;
  // Strip ```json fences if present.
  const fenced = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : s;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
