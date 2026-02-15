/**
 * HealthCheckScene — The hero feature: 500 cases → 275K tokens → AI finds patterns.
 *
 * Timeline:
 *   0-3s:   App with cases loaded, cursor moves to Health Check button
 *   3-4s:   Click Health Check → status changes to "Analyzing"
 *   4-10s:  Token bar fills (275K), thinking counter ramps up
 *   10-20s: Extended thinking text streams in the main area
 *   20-34s: Alerts appear one by one (Rodriguez pattern, speedy trial, etc.)
 */

import React from 'react';
import { useCurrentFrame } from 'remotion';
import { COLORS, FPS, FONTS } from '../config';
import { countUp, fade, slideUp } from '../styles';
import { AppShell } from '../components/AppShell';
import { Cursor, type CursorWaypoint } from '../components/Cursor';

// ── Cursor path ──────────────────────────────────────────────

const CURSOR: CursorWaypoint[] = [
  { frame: 0, x: 500, y: 400 },
  { frame: 40, x: 1550, y: 86 },            // move to Health Check button area
  { frame: 70, x: 1550, y: 86, click: true }, // click
  { frame: 140, x: 900, y: 300 },            // watch thinking stream
  { frame: 400, x: 1400, y: 250 },           // look at alerts
  { frame: 600, x: 1400, y: 500 },           // scroll down alerts
  { frame: 610, x: 1400, y: 500, hidden: true },
];

// ── Alert data ───────────────────────────────────────────────

interface Alert {
  severity: 'critical' | 'warning' | 'info';
  title: string;
  detail: string;
  cases: string[];
}

const ALERTS: Alert[] = [
  {
    severity: 'critical',
    title: 'Fourth Amendment Pattern Detected',
    detail: 'Officer Rodriguez — contested vehicle searches across 4 cases',
    cases: ['CR-2025-0012', 'CR-2025-0089', 'CR-2025-0118', 'CR-2025-0134'],
  },
  {
    severity: 'critical',
    title: 'Speedy Trial Deadline — 3 Days',
    detail: 'State v. Marcus Webb — arraignment continuance exhausted',
    cases: ['CR-2025-0047'],
  },
  {
    severity: 'warning',
    title: 'Plea Disparity Detected',
    detail: 'Similar charges, same judge — offers differ by 18 months',
    cases: ['CR-2025-0203', 'CR-2025-0291'],
  },
  {
    severity: 'warning',
    title: 'Shared Witness Conflict',
    detail: 'CI-0041 listed as informant in 3 unrelated drug cases',
    cases: ['CR-2025-0067', 'CR-2025-0112', 'CR-2025-0188'],
  },
  {
    severity: 'info',
    title: 'Brady Material Risk',
    detail: 'Officer Daniels — pending internal affairs complaint',
    cases: ['CR-2025-0155', 'CR-2025-0301'],
  },
];

const SEV_COLORS: Record<string, string> = {
  critical: COLORS.red,
  warning: COLORS.orange,
  info: COLORS.blue,
};
const SEV_LABELS: Record<string, string> = {
  critical: 'CRITICAL',
  warning: 'WARNING',
  info: 'REVIEW',
};
const SEV_BG: Record<string, string> = {
  critical: COLORS.redBg,
  warning: COLORS.orangeBg,
  info: COLORS.blueBg,
};

// ── Thinking text ────────────────────────────────────────────

const THINKING_LINES = [
  'Analyzing 500 cases for cross-case patterns...',
  'Checking speedy trial deadlines across all active cases...',
  'Comparing plea offers for similar charge categories...',
  'Cross-referencing arresting officers across cases...',
  'Found: Officer J. Rodriguez appears in CR-2025-0012, CR-2025-0089, CR-2025-0118, CR-2025-0134',
  'All four cases involve contested vehicle searches during traffic stops',
  'Pattern suggests potential Fourth Amendment violation — systematic issue',
  'Checking witness overlap and informant usage patterns...',
  'Flagging cases approaching speedy trial limits...',
  'Generating prioritized risk assessment...',
];

// ── Component ────────────────────────────────────────────────

export const HealthCheckScene: React.FC = () => {
  const f = useCurrentFrame();

  const clickFrame = 70;
  const isAnalyzing = f >= clickFrame;

  // Token counts ramp up after click
  const tokenInput = isAnalyzing ? countUp(f, clickFrame, 150, 0, 275000) : 0;
  const tokenThinking = isAnalyzing ? countUp(f, clickFrame + 60, 200, 0, 60000) : 0;
  const tokenOutput = isAnalyzing ? countUp(f, clickFrame + 200, 150, 0, 12000) : 0;

  // Thinking lines appear over time
  const thinkStart = clickFrame + 90;
  const alertsStart = 20 * FPS;
  const alertInterval = 2.8 * FPS;

  return (
    <>
      <AppShell
        casesVisible={20}
        totalCases={500}
        felonyCount={167}
        misdemeanorCount={333}
        tokenInput={tokenInput}
        tokenThinking={tokenThinking}
        tokenOutput={tokenOutput}
        tokenCalls={isAnalyzing ? 1 : 0}
        statusText={!isAnalyzing ? 'Ready' : tokenOutput > 0 ? 'Complete' : 'Analyzing...'}
        statusColor={!isAnalyzing ? 'ready' : tokenOutput > 0 ? 'ready' : 'analyzing'}
        showCorpusBadge={isAnalyzing}
      >
        <div style={{ display: 'flex', gap: 28, height: '100%' }}>
          {/* ── Left: Token stats + Thinking stream ── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Health Check button (before click) / Header (after click) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
              <div style={{
                padding: '10px 24px',
                background: isAnalyzing ? COLORS.bgCard : `linear-gradient(135deg, ${COLORS.gold} 0%, ${COLORS.goldDim} 100%)`,
                color: isAnalyzing ? COLORS.gold : COLORS.bg,
                fontWeight: 700,
                fontSize: 14,
                borderRadius: 8,
                border: isAnalyzing ? `1px solid ${COLORS.borderAccent}` : 'none',
              }}>
                {isAnalyzing ? '⚕ Health Check — Scanning 500 cases' : '⚕ Health Check'}
              </div>
              {isAnalyzing && (
                <span style={{ fontSize: 12, color: COLORS.textMuted }}>
                  275,000+ tokens loaded into single prompt
                </span>
              )}
            </div>

            {/* Token stats */}
            {isAnalyzing && (
              <div style={{ display: 'flex', gap: 20, opacity: fade(f, clickFrame + 20, 30) }}>
                <TokenStat label="INPUT TOKENS" value={tokenInput} color={COLORS.blue} />
                <TokenStat label="THINKING" value={tokenThinking} color={COLORS.purple} />
                <TokenStat label="OUTPUT" value={tokenOutput} color={COLORS.green} />
              </div>
            )}

            {/* Badges */}
            {isAnalyzing && (
              <div style={{ display: 'flex', gap: 10, opacity: fade(f, clickFrame + 80, 25), flexWrap: 'wrap' }}>
                {['No RAG', 'No chunking', '500 cases at once'].map((label, i) => (
                  <span key={label} style={{
                    padding: '4px 14px',
                    borderRadius: 6,
                    border: `1px solid rgba(48, 164, 108, 0.25)`,
                    background: 'rgba(48, 164, 108, 0.06)',
                    fontSize: 12,
                    fontFamily: FONTS.mono,
                    color: COLORS.green,
                    opacity: fade(f, clickFrame + 80 + i * 12, 20),
                  }}>
                    {label}
                  </span>
                ))}
              </div>
            )}

            {/* Thinking stream */}
            {isAnalyzing && (
              <div style={{
                flex: 1,
                background: COLORS.bgSecondary,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 8,
                padding: '14px 18px',
                overflow: 'hidden',
                opacity: fade(f, thinkStart - 20, 25),
              }}>
                <div style={{ fontSize: 10, fontFamily: FONTS.mono, color: COLORS.textMuted, letterSpacing: '0.1em', marginBottom: 10 }}>
                  EXTENDED THINKING
                </div>
                {THINKING_LINES.map((line, i) => {
                  const lineStart = thinkStart + i * 30;
                  const visible = f >= lineStart;
                  if (!visible) return null;

                  // Typing effect: reveal characters over time
                  const charsVisible = Math.min(
                    line.length,
                    Math.round(((f - lineStart) / 18) * line.length),
                  );
                  const displayText = line.slice(0, charsVisible);
                  const isTyping = charsVisible < line.length;

                  return (
                    <div
                      key={i}
                      style={{
                        fontSize: 13,
                        fontFamily: FONTS.mono,
                        color: line.includes('Found:') || line.includes('Pattern suggests')
                          ? COLORS.gold
                          : COLORS.textSecondary,
                        lineHeight: 1.7,
                        opacity: fade(f, lineStart, 15),
                        fontWeight: line.includes('Found:') || line.includes('Pattern') ? 600 : 400,
                      }}
                    >
                      {displayText}
                      {isTyping && <span style={{ color: COLORS.gold, animation: 'none' }}>▊</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Right: Alerts feed ── */}
          {f >= alertsStart - 30 && (
            <div style={{ width: 500, display: 'flex', flexDirection: 'column', gap: 10, opacity: fade(f, alertsStart - 30, 25) }}>
              <div style={{ fontSize: 10, fontFamily: FONTS.mono, color: COLORS.textMuted, letterSpacing: '0.12em', marginBottom: 4 }}>
                FINDINGS
              </div>

              {ALERTS.map((alert, i) => {
                const start = alertsStart + i * alertInterval;
                const color = SEV_COLORS[alert.severity];
                const label = SEV_LABELS[alert.severity];

                return (
                  <div
                    key={i}
                    style={{
                      padding: '12px 16px',
                      borderRadius: 10,
                      border: `1px solid ${color}30`,
                      background: `${color}06`,
                      opacity: fade(f, start, 20),
                      transform: `translateY(${slideUp(f, start, 16, 20)}px)`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 5,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        padding: '2px 7px',
                        borderRadius: 4,
                        background: `${color}18`,
                        fontSize: 9,
                        fontFamily: FONTS.mono,
                        fontWeight: 700,
                        color,
                        letterSpacing: '0.08em',
                      }}>
                        {label}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 700, color }}>{alert.title}</span>
                    </div>
                    <div style={{ fontSize: 12, color: COLORS.textSecondary, opacity: fade(f, start + 8, 15) }}>
                      {alert.detail}
                    </div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', opacity: fade(f, start + 14, 15) }}>
                      {alert.cases.map((c) => (
                        <span key={c} style={{
                          fontSize: 10,
                          fontFamily: FONTS.mono,
                          color: COLORS.gold,
                          padding: '1px 7px',
                          borderRadius: 3,
                          border: `1px solid ${COLORS.gold}20`,
                          background: `${COLORS.gold}05`,
                        }}>
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </AppShell>

      <Cursor waypoints={CURSOR} appearAt={10} />
    </>
  );
};

// ── Helpers ──────────────────────────────────────────────────

const TokenStat: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div>
    <div style={{ fontSize: 10, fontFamily: FONTS.mono, color: COLORS.textMuted, letterSpacing: '0.1em', marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 32, fontWeight: 800, fontFamily: FONTS.mono, color }}>{Math.round(value).toLocaleString()}</div>
  </div>
);
