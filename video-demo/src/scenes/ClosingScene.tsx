/**
 * ClosingScene — Capabilities list overlay on dimmed app shell.
 * No emoji. Monospace indices. Alternating slide directions.
 */

import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { COLORS, FPS, FONTS } from '../config';
import { fade, slideFromLeft, slowZoom } from '../styles';
import { AppShell } from '../components/AppShell';

const CAPABILITIES = [
  { feature: 'Million-token context window', detail: '275K+ tokens in one prompt' },
  { feature: 'Extended thinking with streaming', detail: 'Visible reasoning chains' },
  { feature: 'Autonomous tool use (9 tools)', detail: 'Agentic investigation loop' },
  { feature: '128K output generation', detail: 'Court-ready legal motions' },
  { feature: 'Sequential reasoning chains', detail: '3-phase adversarial simulation' },
];

const TOTAL_FRAMES = 17 * FPS;

export const ClosingScene: React.FC = () => {
  const f = useCurrentFrame();

  const listStart = 2 * FPS;
  const zoom = slowZoom(f, TOTAL_FRAMES, 0.03);

  return (
    <>
      {/* App shell in background — semi-visible dashboard */}
      <AppShell
        casesVisible={20}
        totalCases={500}
        felonyCount={167}
        misdemeanorCount={333}
        tokenInput={275000}
        tokenThinking={60000}
        tokenOutput={12000}
        tokenCalls={14}
        statusText="Ready"
        statusColor="ready"
        showCorpusBadge
      >
        <div />
      </AppShell>

      {/* Dark overlay to dim the background */}
      <AbsoluteFill style={{ background: 'rgba(7, 8, 12, 0.88)' }} />

      {/* Content overlay with slow zoom */}
      <AbsoluteFill style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: FONTS.sans,
        transform: `scale(${zoom})`,
      }}>
        {/* Header — shown immediately, no animation */}
        <div style={{
          position: 'absolute',
          top: 100,
          fontSize: 14,
          fontFamily: FONTS.mono,
          color: COLORS.textMuted,
          letterSpacing: '0.15em',
          textTransform: 'uppercase' as const,
        }}>
          Claude Opus 4.6 Capabilities
        </div>

        {/* Feature list — alternating slide directions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: -20 }}>
          {CAPABILITIES.map((cap, i) => {
            const itemStart = listStart + i * 18;
            // Alternate: odd items slide from left, even from right
            const slideX = slideFromLeft(f, itemStart, i % 2 === 0 ? 50 : -50, 24);
            return (
              <div
                key={cap.feature}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 18,
                  opacity: fade(f, itemStart, 18),
                  transform: `translateX(${slideX}px)`,
                }}
              >
                {/* Monospace index instead of emoji */}
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 10,
                  background: COLORS.bgTertiary,
                  border: `1px solid ${COLORS.borderAccent}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  fontFamily: FONTS.mono,
                  fontWeight: 700,
                  color: COLORS.gold,
                }}>
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 600, color: COLORS.text }}>{cap.feature}</div>
                  <div style={{ fontSize: 14, color: COLORS.textMuted, marginTop: 2 }}>{cap.detail}</div>
                </div>
              </div>
            );
          })}
        </div>

      </AbsoluteFill>
    </>
  );
};
