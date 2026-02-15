/**
 * BuiltWithScene — Meta reveal: this demo video was built with Claude Code + Opus 4.6.
 *
 * Timeline:
 *   0-2.5s: Dark screen (audio says the hook line — we don't repeat it as text)
 *   2.5-6s: Terminal window appears with Claude Code prompt
 *   6-11s:  Commands + file outputs scroll through the terminal
 *   11-14s: Stats slide in from left
 *   14-17s: Punchline scales in
 */

import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { COLORS, FPS, FONTS } from '../config';
import { fade, scaleIn, slideFromLeft, slowZoom, slideUp } from '../styles';

// Terminal lines that scroll in sequentially
const TERMINAL_LINES: { text: string; color?: string; delay: number }[] = [
  { text: '$ claude "Build a Remotion video demo for Case Nexus"', color: COLORS.green, delay: 0 },
  { text: '', delay: 8 },
  { text: 'Creating video-demo/src/scenes/TitleScene.tsx', color: COLORS.textSecondary, delay: 12 },
  { text: 'Creating video-demo/src/scenes/ProblemScene.tsx', color: COLORS.textSecondary, delay: 20 },
  { text: 'Creating video-demo/src/scenes/HealthCheckScene.tsx', color: COLORS.textSecondary, delay: 28 },
  { text: 'Creating video-demo/src/scenes/CascadeScene.tsx', color: COLORS.textSecondary, delay: 36 },
  { text: 'Creating video-demo/src/scenes/AdversarialScene.tsx', color: COLORS.textSecondary, delay: 44 },
  { text: 'Creating video-demo/src/components/AppShell.tsx', color: COLORS.textSecondary, delay: 52 },
  { text: 'Creating video-demo/src/components/Cursor.tsx', color: COLORS.textSecondary, delay: 60 },
  { text: '', delay: 68 },
  { text: 'Generating title card image...', color: COLORS.gold, delay: 72 },
  { text: 'Generating narration audio (9 scenes)...', color: COLORS.gold, delay: 84 },
  { text: '', delay: 92 },
  { text: 'Done. 9 scenes, 3,300+ lines of Remotion code.', color: COLORS.green, delay: 96 },
];

// Stats that appear after the terminal
const STATS = [
  { label: 'Application', value: '20,000+', unit: 'lines of code' },
  { label: 'Video demo', value: '3,300+', unit: 'lines of Remotion' },
  { label: 'Scenes', value: '9', unit: 'animated sequences' },
  { label: 'Model', value: '1', unit: 'Claude Opus 4.6' },
];

const TOTAL_FRAMES = 19 * FPS;

export const BuiltWithScene: React.FC = () => {
  const f = useCurrentFrame();

  const terminalStart = Math.round(2.5 * FPS);
  const statsStart = 11 * FPS;
  const punchlineStart = 14 * FPS;

  const zoom = slowZoom(f, TOTAL_FRAMES, 0.03);

  return (
    <AbsoluteFill
      style={{
        background: COLORS.bg,
        fontFamily: FONTS.sans,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Slow zoom wrapper */}
      <AbsoluteFill style={{
        transform: `scale(${zoom})`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}>

        {/* Terminal window — slides up */}
        <div
          style={{
            width: 1000,
            maxHeight: 440,
            background: COLORS.bgSecondary,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 12,
            overflow: 'hidden',
            opacity: fade(f, terminalStart, 25),
            transform: `translateY(${slideUp(f, terminalStart, 30, 25)}px)`,
            marginTop: -30,
          }}
        >
          {/* Terminal title bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 16px',
              background: COLORS.bgTertiary,
              borderBottom: `1px solid ${COLORS.border}`,
            }}
          >
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#e5484d' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#e5a000' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#30a46c' }} />
            <span
              style={{
                flex: 1,
                textAlign: 'center',
                fontSize: 12,
                color: COLORS.textMuted,
                fontFamily: FONTS.mono,
              }}
            >
              Claude Code — case-nexus/video-demo
            </span>
          </div>

          {/* Terminal body */}
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {TERMINAL_LINES.map((line, i) => {
              const lineFrame = terminalStart + line.delay;
              if (f < lineFrame) return null;

              const elapsed = f - lineFrame;
              const charsVisible = Math.min(line.text.length, Math.round((elapsed / 15) * line.text.length));

              if (line.text === '') return <div key={i} style={{ height: 8 }} />;

              return (
                <div
                  key={i}
                  style={{
                    fontSize: 13.5,
                    fontFamily: FONTS.mono,
                    color: line.color || COLORS.text,
                    lineHeight: 1.7,
                    opacity: fade(f, lineFrame, 8),
                    whiteSpace: 'nowrap' as const,
                  }}
                >
                  {line.text.slice(0, charsVisible)}
                  {charsVisible < line.text.length && (
                    <span style={{ color: COLORS.gold }}>|</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Stats row — slide from left, staggered */}
        {f >= statsStart && (
          <div
            style={{
              display: 'flex',
              gap: 40,
              marginTop: 36,
              opacity: fade(f, statsStart, 20),
            }}
          >
            {STATS.map((stat, i) => (
              <div
                key={stat.label}
                style={{
                  textAlign: 'center',
                  opacity: fade(f, statsStart + i * 8, 15),
                  transform: `translateX(${slideFromLeft(f, statsStart + i * 8, 40, 18)}px)`,
                }}
              >
                <div
                  style={{
                    fontSize: 36,
                    fontWeight: 800,
                    fontFamily: FONTS.mono,
                    color: COLORS.gold,
                  }}
                >
                  {stat.value}
                </div>
                <div style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 4 }}>{stat.unit}</div>
                <div style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 2, textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Punchline — scale in with pop */}
        {f >= punchlineStart && (
          <div
            style={{
              position: 'absolute',
              bottom: 80,
              textAlign: 'center',
              opacity: fade(f, punchlineStart, 22),
              transform: `scale(${scaleIn(f, punchlineStart, 22, 0.9)})`,
            }}
          >
            <div
              style={{
                fontSize: 28,
                fontWeight: 600,
                color: COLORS.text,
                letterSpacing: '0.02em',
              }}
            >
              Even this video was built with{' '}
              <span
                style={{
                  color: COLORS.gold,
                  textShadow: `0 0 30px ${COLORS.goldGlowStrong}`,
                }}
              >
                Claude Code
              </span>
            </div>
          </div>
        )}

      </AbsoluteFill>

      {/* Soft gold glow behind terminal */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse at 50% 45%, ${COLORS.gold}06 0%, transparent 50%)`,
          pointerEvents: 'none' as const,
        }}
      />
    </AbsoluteFill>
  );
};
