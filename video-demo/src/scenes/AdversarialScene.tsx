/**
 * AdversarialScene — Three chained Claude sessions: Prosecution → Defense → Judge.
 *
 * Timeline:
 *   0-3s:   App with case selected, cursor moves to Adversarial Sim button
 *   3-4s:   Click → 3-phase progress bar appears
 *   4-12s:  Prosecution phase: thinking streams, content builds
 *   12-20s: Defense phase: reads prosecution, builds counter-arguments
 *   20-27s: Judicial phase: synthesizes both sides
 *   27-29s: Token summary appears
 */

import React from 'react';
import { useCurrentFrame } from 'remotion';
import { COLORS, FPS, FONTS } from '../config';
import { countUp, fade, slideUp } from '../styles';
import { AppShell } from '../components/AppShell';
import { Cursor, type CursorWaypoint } from '../components/Cursor';

const CURSOR: CursorWaypoint[] = [
  { frame: 0, x: 200, y: 300 },
  { frame: 30, x: 200, y: 300, click: true },  // click case in sidebar
  { frame: 60, x: 1700, y: 86 },               // move to Adversarial button
  { frame: 90, x: 1700, y: 86, click: true },   // click
  { frame: 180, x: 600, y: 400 },               // watch prosecution
  { frame: 400, x: 1100, y: 400 },              // watch defense
  { frame: 600, x: 850, y: 500 },               // watch judge
  { frame: 750, x: 850, y: 500, hidden: true },
];

// ── Phase data ───────────────────────────────────────────────

interface Phase {
  title: string;
  role: string;
  color: string;
  thinkingLines: string[];
  startSec: number;
}

const PHASES: Phase[] = [
  {
    title: 'Prosecution',
    role: 'Building strongest case',
    color: COLORS.red,
    startSec: 4,
    thinkingLines: [
      'Analyzing evidence chain: traffic stop initiated at 11:47 PM...',
      'Vehicle search yielded 47g suspected controlled substance...',
      'Officer Rodriguez noted "furtive movements" in report...',
      'Prior record: two misdemeanor convictions, no felonies...',
      'Aggravating factor: school zone proximity (0.3 miles)...',
      'Recommended charge: Possession with Intent to Distribute...',
    ],
  },
  {
    title: 'Defense',
    role: 'Dismantling prosecution',
    color: COLORS.blue,
    startSec: 12,
    thinkingLines: [
      'Reading prosecution brief... 6 key arguments identified...',
      'Challenging: "furtive movements" is subjective and vague...',
      'Officer Rodriguez has 4 contested searches — pattern of abuse...',
      'Consent was obtained under duress — flashing lights, late hour...',
      'State v. Henderson: consent must be voluntary and uncoerced...',
      'Motion to suppress: fruit of the poisonous tree doctrine...',
    ],
  },
  {
    title: 'Judicial Analysis',
    role: 'Synthesizing both sides',
    color: COLORS.gold,
    startSec: 20,
    thinkingLines: [
      'Weighing prosecution evidence against defense challenges...',
      'The consent issue is the pivotal question in this case...',
      'Rodriguez pattern strengthens defense Fourth Amendment claim...',
      'Prosecution case relies heavily on physical evidence...',
      'If suppression motion succeeds, prosecution case collapses...',
      'Recommendation: motion to suppress has strong prospects...',
    ],
  },
];

// ── Component ────────────────────────────────────────────────

export const AdversarialScene: React.FC = () => {
  const f = useCurrentFrame();

  const clickFrame = 90;
  const isActive = f >= clickFrame;

  const tokenThinking = isActive ? countUp(f, clickFrame, 600, 0, 80000) : 0;
  const tokenOutput = isActive ? countUp(f, clickFrame + 200, 400, 0, 24000) : 0;
  const summaryStart = 27 * FPS;

  // Current phase (0-indexed)
  const currentPhase = !isActive ? -1 :
    f < PHASES[1].startSec * FPS ? 0 :
    f < PHASES[2].startSec * FPS ? 1 : 2;

  return (
    <>
      <AppShell
        casesVisible={20}
        totalCases={500}
        felonyCount={167}
        misdemeanorCount={333}
        tokenInput={isActive ? 12000 : 0}
        tokenThinking={tokenThinking}
        tokenOutput={tokenOutput}
        tokenCalls={isActive ? 3 : 0}
        statusText={!isActive ? 'Ready' : f >= summaryStart ? 'Complete' : `Phase ${currentPhase + 1}/3`}
        statusColor={!isActive ? 'ready' : f >= summaryStart ? 'ready' : 'analyzing'}
        selectedCaseId="CR-2025-0012"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              padding: '10px 24px',
              background: isActive ? COLORS.bgCard : `linear-gradient(135deg, ${COLORS.red} 0%, #a63030 100%)`,
              color: isActive ? COLORS.red : '#fff',
              fontWeight: 700,
              fontSize: 14,
              borderRadius: 8,
              border: isActive ? `1px solid ${COLORS.red}30` : 'none',
            }}>
              ⚔ Adversarial Simulation
            </div>
            {isActive && (
              <span style={{ fontSize: 12, color: COLORS.textMuted, opacity: fade(f, clickFrame + 10, 20) }}>
                CR-2025-0012 — Marcus Webb — Traffic Stop DUI
              </span>
            )}
          </div>

          {/* Phase progress bar */}
          {isActive && (
            <div style={{ display: 'flex', gap: 4, opacity: fade(f, clickFrame + 20, 20) }}>
              {PHASES.map((phase, i) => {
                const phaseStart = phase.startSec * FPS;
                const isCurrentPhase = currentPhase === i;
                const isDone = currentPhase > i;
                const progress = !isDone && isCurrentPhase
                  ? fade(f, phaseStart, (PHASES[i + 1]?.startSec ?? 27) * FPS - phaseStart)
                  : isDone ? 1 : 0;

                return (
                  <div key={phase.title} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: isDone ? COLORS.green : isCurrentPhase ? phase.color : COLORS.textMuted }}>
                        {phase.title}
                      </span>
                      <span style={{ fontSize: 10, fontFamily: FONTS.mono, color: isDone ? COLORS.green : COLORS.textMuted }}>
                        {isDone ? '✓' : isCurrentPhase ? 'Reasoning...' : ''}
                      </span>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: COLORS.bgTertiary, overflow: 'hidden' }}>
                      <div style={{ width: `${progress * 100}%`, height: '100%', borderRadius: 2, background: isDone ? COLORS.green : phase.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Three panels */}
          {isActive && (
            <div style={{ flex: 1, display: 'flex', gap: 16 }}>
              {PHASES.map((phase, i) => {
                const phaseStart = phase.startSec * FPS;
                const phaseActive = f >= phaseStart;
                const isDone = currentPhase > i;

                // How many thinking lines to show
                const linesVisible = !phaseActive ? 0 :
                  Math.min(phase.thinkingLines.length, Math.floor((f - phaseStart) / 25));

                return (
                  <div
                    key={phase.title}
                    style={{
                      flex: 1,
                      borderRadius: 12,
                      border: `1px solid ${phaseActive ? phase.color + '40' : COLORS.border}`,
                      background: phaseActive ? `${phase.color}05` : COLORS.bgSecondary,
                      padding: '16px 14px',
                      opacity: fade(f, phaseStart - 30, 25),
                      transform: `translateY(${slideUp(f, phaseStart - 30, 20, 25)}px)`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                      overflow: 'hidden',
                    }}
                  >
                    {/* Phase header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 30,
                        height: 30,
                        borderRadius: '50%',
                        background: `${phase.color}20`,
                        border: `2px solid ${phase.color}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 14,
                        fontWeight: 800,
                        fontFamily: FONTS.mono,
                        color: phase.color,
                      }}>
                        {i + 1}
                      </div>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: phase.color }}>{phase.title}</div>
                        <div style={{ fontSize: 11, color: COLORS.textMuted }}>{phase.role}</div>
                      </div>
                    </div>

                    {/* Thinking lines */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {phase.thinkingLines.slice(0, linesVisible).map((line, li) => {
                        const lineStart = phaseStart + li * 25;
                        const charsVisible = Math.min(
                          line.length,
                          Math.round(((f - lineStart) / 20) * line.length),
                        );

                        return (
                          <div
                            key={li}
                            style={{
                              fontSize: 12,
                              fontFamily: FONTS.mono,
                              color: COLORS.textSecondary,
                              lineHeight: 1.5,
                              opacity: fade(f, lineStart, 12),
                            }}
                          >
                            {line.slice(0, charsVisible)}
                            {charsVisible < line.length && (
                              <span style={{ color: phase.color }}>▊</span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Status */}
                    <div style={{ fontSize: 11, fontFamily: FONTS.mono, color: isDone ? COLORS.green : phaseActive ? phase.color : COLORS.textMuted }}>
                      {isDone ? '✓ Complete' : phaseActive ? 'Reasoning...' : 'Waiting'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Token summary */}
          {f >= summaryStart && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 24,
              opacity: fade(f, summaryStart, 25),
              transform: `translateY(${slideUp(f, summaryStart, 15, 25)}px)`,
            }}>
              <span style={{ fontSize: 36, fontWeight: 800, fontFamily: FONTS.mono, color: COLORS.gold }}>
                {countUp(f, summaryStart + 5, 60, 0, 80000).toLocaleString()}+
              </span>
              <span style={{ fontSize: 18, color: COLORS.textSecondary }}>tokens of chained reasoning</span>
            </div>
          )}
        </div>
      </AppShell>

      <Cursor waypoints={CURSOR} appearAt={10} />
    </>
  );
};
