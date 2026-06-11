'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useGame } from '@/context/GameContext';
import { Check, Copy, UserPlus, X } from 'lucide-react';
import styles from './WaitingRoom.module.css';

export function WaitingRoom() {
  const { gameState, roomCode, isHost, startGame, kickPlayer, playerId } = useGame();
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  if (!gameState || !roomCode) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const el = document.createElement('textarea');
      el.value = roomCode;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyLink = async () => {
    const link = `${window.location.origin}/room/${roomCode}`;
    try {
      await navigator.clipboard.writeText(link);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // Fallback
      const el = document.createElement('textarea');
      el.value = link;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const connectedCount = gameState.players.filter((p) => p.connected).length;
  const canStart = connectedCount >= 2;

  return (
    <div className={styles.page}>
      <div className={styles.sheet}>
        <span className={`${styles.crop} ${styles.cropTL}`} aria-hidden="true" />
        <span className={`${styles.crop} ${styles.cropTR}`} aria-hidden="true" />
        <span className={`${styles.crop} ${styles.cropBL}`} aria-hidden="true" />
        <span className={`${styles.crop} ${styles.cropBR}`} aria-hidden="true" />

        {/* Header */}
        <div className={styles.header}>
          <Link href="/" className={styles.backLink}>
            ← ABANDON SHEET
          </Link>
          <p className={styles.formLabel}>FORM B-2 · ASSEMBLY ROSTER</p>
          <h1 className={styles.title}>Waiting Room</h1>
        </div>

        {/* Room Code */}
        <div className={styles.codeSection}>
          <p className={styles.codeLabel}>ROOM CODE — SHARE WITH YOUR TEAM</p>
          <button className={styles.codeBox} onClick={handleCopy} id="btn-copy-code">
            <span className={styles.code}>{roomCode}</span>
            <span className={styles.copyHint}>
              {copied ? (
                <>
                  <Check size={13} /> COPIED TO CLIPBOARD
                </>
              ) : (
                <>
                  <Copy size={13} /> CLICK TO COPY
                </>
              )}
            </span>
          </button>
          <button className={`btn btn-secondary ${styles.linkBtn}`} onClick={handleCopyLink}>
            {linkCopied ? (
              <>
                <Check size={14} /> Link Copied!
              </>
            ) : (
              <>
                <UserPlus size={14} /> Copy Invite Link
              </>
            )}
          </button>
        </div>

        {/* Players */}
        <div className={styles.playersSection}>
          <div className={styles.playersHeader}>
            <h2>REGISTERED ARCHITECTS</h2>
            <span className={styles.playerCount}>
              {connectedCount} / {gameState.maxPlayers}
            </span>
          </div>

          <div className={styles.playerList}>
            {gameState.players.map((player, index) => (
              <div
                key={player.id}
                className={`${styles.playerCard} animate-fade-in-up`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <span className={styles.playerIndex}>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className={styles.playerAvatar}>
                  {player.name.charAt(0).toUpperCase()}
                </div>
                <div className={styles.playerInfo}>
                  <span className={styles.playerName}>
                    {player.name}
                    {player.id === playerId && (
                      <span className={styles.youBadge}>YOU</span>
                    )}
                    {player.isHost && (
                      <span className={styles.hostBadge}>HOST</span>
                    )}
                  </span>
                  <span className={styles.playerStatus}>
                    <span
                      className={`${styles.statusDot} ${player.connected ? styles.statusOnline : styles.statusOffline
                        }`}
                    />
                    {player.connected ? 'ON SITE' : 'OFF SITE'}
                  </span>
                </div>
                {isHost && player.id !== playerId && (
                  <button
                    className={styles.kickBtn}
                    onClick={() => kickPlayer(player.id)}
                    title="Remove player"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}

            {/* Empty slots */}
            {Array.from({ length: gameState.maxPlayers - gameState.players.length }).map(
              (_, i) => (
                <div key={`empty-${i}`} className={styles.emptySlot}>
                  <span className={styles.playerIndex}>
                    {String(gameState.players.length + i + 1).padStart(2, '0')}
                  </span>
                  <div className={styles.emptyAvatar} />
                  <span className={styles.emptyText}>AWAITING ARCHITECT…</span>
                </div>
              )
            )}
          </div>
        </div>

        {/* Start Button */}
        {isHost && (
          <div className={styles.startSection}>
            <button
              className={`btn btn-primary btn-lg ${styles.startBtn}`}
              onClick={startGame}
              disabled={!canStart}
              id="btn-start-game"
            >
              {canStart
                ? `Begin Drafting (${connectedCount} architects)`
                : 'Need at least 2 architects'}
              <span aria-hidden="true">→</span>
            </button>
          </div>
        )}

        {!isHost && (
          <div className={styles.waitMessage}>
            <div className={styles.waitDots}>
              <span className={styles.dot} />
              <span className={styles.dot} />
              <span className={styles.dot} />
            </div>
            <p>WAITING FOR HOST TO BEGIN DRAFTING…</p>
          </div>
        )}
      </div>
    </div>
  );
}
