'use client';

import { useState, useRef, useEffect } from 'react';
import { useGame } from '@/context/GameContext';
import styles from './ChatPanel.module.css';

interface ChatPanelProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function ChatPanel({ isCollapsed, onToggle }: ChatPanelProps) {
  const { gameState, playerId, sendChat } = useGame();
  const [text, setText] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [prevMsgLen, setPrevMsgLen] = useState(gameState?.chatMessages.length ?? 0);
  const [prevCollapsed, setPrevCollapsed] = useState(isCollapsed);
  const messagesRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages arrive or panel opens (no setState here)
  useEffect(() => {
    if (isCollapsed) return;
    const el = messagesRef.current;
    el?.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [gameState?.chatMessages, isCollapsed]);

  // Track unread count via React's "storing info from previous renders" pattern —
  // setState called during render (not inside an effect) with a bailout guard.
  const currentLen = gameState?.chatMessages.length ?? 0;
  if (prevCollapsed !== isCollapsed || prevMsgLen !== currentLen) {
    setPrevCollapsed(isCollapsed);
    setPrevMsgLen(currentLen);
    if (!isCollapsed) {
      setUnreadCount(0);
    } else if (currentLen > prevMsgLen) {
      setUnreadCount(c => c + (currentLen - prevMsgLen));
    }
  }

  if (!gameState) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    sendChat(text.trim());
    setText('');
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <div className={`${styles.container} ${isCollapsed ? styles.collapsed : ''}`}>
      <button
        className={styles.header}
        onClick={onToggle}
        aria-expanded={!isCollapsed}
      >
        <div className={styles.headerTitle}>
          Field Notes — Team Chat
          {unreadCount > 0 && (
            <span className={styles.badge}>{unreadCount}</span>
          )}
        </div>
        <div className={styles.toggleIcon}>
          {isCollapsed ? '+' : '−'}
        </div>
      </button>

      <div className={styles.body}>
        <div className={styles.bodyInner}>
          <div className={styles.messages} ref={messagesRef}>
            {gameState.chatMessages.length === 0 ? (
              <div className={styles.empty}>{'// no entries yet'}</div>
            ) : (
              gameState.chatMessages.map((msg) => {
                const isMe = msg.playerId === playerId;

                if (msg.isSystem) {
                  return (
                    <div key={msg.id} className={styles.systemMessage}>
                      {msg.text}
                    </div>
                  );
                }

                return (
                  <div key={msg.id} className={`${styles.messageWrapper} ${isMe ? styles.myMessage : ''}`}>
                    {!isMe && <span className={styles.sender}>{msg.playerName}</span>}
                    <div className={styles.bubble}>
                      {msg.text}
                    </div>
                    <span className={styles.time}>{formatTime(msg.timestamp)}</span>
                  </div>
                );
              })
            )}
          </div>

          <form onSubmit={handleSubmit} className={styles.inputArea}>
            <input
              type="text"
              className="input"
              placeholder="Message team..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={200}
            />
            <button type="submit" className="btn btn-primary" disabled={!text.trim()}>
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
