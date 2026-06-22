#!/usr/bin/env bash
# ============================================================
# Serve nvidia/Qwen3.5-122B-A10B-NVFP4 (MoE, NVFP4 4-bit) on vLLM.
# NVFP4 is NVIDIA's Blackwell-native 4-bit format; vLLM auto-detects it from the
# checkpoint (no --quantization flag needed). ~61 GB weights fit the 121 GB
# unified pool; 10B active + 4-bit weights keep decode fast. Context 16384.
# ============================================================
# GATED: the Spark holds only one model in memory at a time, so the
# gemma serve on :8000 must be stopped first (and the shared GPU must
# be free of other experiments). This script refuses to start if :8000
# is still occupied, rather than OOM the box.
#
#   bash serve_qwen.sh            # foreground
#   nohup bash serve_qwen.sh >~/qwen_serve.log 2>&1 &   # background
set -euo pipefail

PORT=8000
MODEL="nvidia/Qwen3.5-122B-A10B-NVFP4"

if curl -sf "http://localhost:${PORT}/v1/models" >/dev/null 2>&1; then
  echo "ERROR: something is already serving on :${PORT} (likely the gemma vLLM)."
  echo "Stop it first (e.g. the existing 'vllm serve google/gemma-4-26B-A4B-it' process),"
  echo "confirm no other experiment needs the GPU, then re-run this script."
  exit 1
fi

# Modest context: the experiment prompts are only a few-K tokens, so a small
# max-model-len keeps KV-cache memory comfortable.
exec vllm serve "${MODEL}" \
  --host 0.0.0.0 --port "${PORT}" \
  --gpu-memory-utilization 0.85 \
  --max-model-len 16384 \
  --max-num-batched-tokens 4096
