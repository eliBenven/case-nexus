/**
 * ClosingScene — Capabilities list overlay on dimmed app shell.
 * Mission statement + branding moved to FinaleScene.
 */

import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { COLORS, FPS, FONTS } from '../config';
import { fade, slideUp } from '../styles';
import { AppShell } from '../components/AppShell';

const CAPABILITIES = [
  { feature: 'Million-token context window', detail: '275K+ tokens in one prompt', icon: '📐' },
  { feature: 'Extended thinking with streaming', detail: 'Visible reasoning chains', icon: '🧠' },
  { feature: 'Autonomous tool use (9 tools)', detail: 'Agentic investigation loop', icon: '🔧' },
  { feature: '128K output generation', detail: 'Court-ready legal motions', icon: '📄' },
  { feature: 'Sequential reasoning chains', detail: '3-phase adversarial simulation', icon: '🔗' },
];

export const ClosingScene: React.FC = () => {
  const f = useCurrentFrame();

  const listStart = 2 * FPS;

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
        {/* Empty — we overlay on top */}
        <div />
      </AppShell>

      {/* Dark overlay to dim the background */}
      <AbsoluteFill style={{ background: 'rgba(7, 8, 12, 0.88)' }} />

      {/* Content overlay */}
      <AbsoluteFill style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: FONTS.sans,
      }}>
        {/* Header */}
        <div style={{
          position: 'absolute',
          top: 100,
          fontSize: 14,
          fontFamily: FONTS.mono,
          color: COLORS.textMuted,
          opacity: fade(f, 5, 20),
          letterSpacing: '0.15em',
          textTransform: 'uppercase' as const,
        }}>
          Claude Opus 4.6 Capabilities
        </div>

        {/* Feature list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: -20 }}>
          {CAPABILITIES.map((cap, i) => {
            const itemStart = listStart + i * 18;
            return (
              <div
                key={cap.feature}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 18,
                  opacity: fade(f, itemStart, 22),
                  transform: `translateX(${slideUp(f, itemStart, 30, 22)}px)`,
                }}
              >
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 10,
                  background: COLORS.bgTertiary,
                  border: `1px solid ${COLORS.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                }}>
                  {cap.icon}
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
