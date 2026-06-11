'use client';

import { useState, useRef, useEffect } from 'react';
import { useGame } from '@/context/GameContext';
import styles from './ChatPanel.module.css';

export function ChatPanel() {
  const { gameState, playerId, sendChat } = useGame();
  const [text, setText] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [gameState?.chatMessages]);

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
        onClick={() => setIsCollapsed(!isCollapsed)}
        aria-expanded={!isCollapsed}
      >
        <div className={styles.headerTitle}>
          Field Notes — Team Chat
        </div>
        <div className={styles.toggleIcon}>
          {isCollapsed ? '+' : '−'}
        </div>
      </button>

      {!isCollapsed && (
        <>
          <div className={styles.messages}>
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
            <div ref={messagesEndRef} />
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
        </>
      )}
    </div>
  );
}
