/**
 * HealthCheckScene — The hero feature: 500 cases → 275K tokens → AI finds patterns.
 *
 * Matches the real app's health check "thinking view" exactly:
 *   - Thinking header: spinner + status text + token count + elapsed time
 *   - 5 numbered phase steps (pending → active → complete)
 *   - Collapsible "View raw AI reasoning" with streaming monospace text
 *
 * Timeline:
 *   0-2.3s:  App visible, cursor moves to Health Check button → click
 *   2.3-4s:  Thinking view appears, Step 1 active
 *   4-22s:   Steps advance one by one, thinking text streams
 *   22-28s:  All steps complete, findings summary appears
 *   28-34s:  Alerts overlay fades in
 */

import React from 'react';
import { useCurrentFrame } from 'remotion';
import { COLORS, FPS, FONTS } from '../config';
import { countUp, fade, slideUp } from '../styles';
import { AppShell } from '../components/AppShell';
import { Cursor, type CursorWaypoint } from '../components/Cursor';

// ── Cursor path ──────────────────────────────────────────────

const CURSOR: CursorWaypoint[] = [
  { frame: 0, x: 960, y: 400 },
  { frame: 40, x: 1750, y: 103 },
  { frame: 70, x: 1750, y: 103, click: true },
  { frame: 140, x: 800, y: 350 },           // watch steps progress
  { frame: 500, x: 600, y: 650 },           // glance at raw reasoning
  { frame: 700, x: 800, y: 400 },           // watch findings
  { frame: 800, x: 800, y: 400, hidden: true },
];

// ── Phase steps (matches real HC_PHASES in app.js) ───────────

interface Phase {
  icon: string;
  label: string;
}

const HC_PHASES: Phase[] = [
  { icon: '1', label: 'Scanning deadlines & speedy trial calculations' },
  { icon: '2', label: 'Finding cross-case connections' },
  { icon: '3', label: 'Checking constitutional issues' },
  { icon: '4', label: 'Analyzing plea offers & disparities' },
  { icon: '5', label: 'Generating priority actions' },
];

// ── Header titles that rotate with each active step ──────────

const HEADER_TITLES = [
  'Scanning deadlines & speedy trial risks...',
  'Finding cross-case connections...',
  'Checking constitutional issues...',
  'Assessing plea offers & disparities...',
  'Generating priority actions...',
  'Analysis complete',
];

// ── Raw thinking text (matches screenshot) ───────────────────

const RAW_THINKING = `Looking at the case data, I'm seeing several felonies approaching critical thresholds — Keisha Robinson and DeShawn Morris are both well past 180 days, and Monique Scott is at 281 days, which is extremely concerning for case management. Stephanie Santos is nearly at the 180-day mark, and there are multiple misdemeanors well past the 90-day window that need immediate attention, with Eric Johnson's case being the most overdue at over 400 days. I'm seeing more cases with critical timelines, and now I'm noticing some plea offers that are expiring imminently — within just 10 to 13 days — which means I need to prioritize these alongside the longest-pending cases to avoid losing negotiation opportunities. I'm seeing more cases with expiration dates clustering around mid-March, and now I'm noticing a pattern with Judge Richard Okonkwo appearing across multiple jurisdictions.

Looking at the judge-prosecutor combinations, there's a clear disparity: Judge Williams paired with ADA Weiss tends toward leniency, while Judge Kim with ADA Grant produces much harsher sentences for similar charges. This is most striking when I compare Mitchell's case against Chen's — nearly identical assault facts but Mitchell received a significantly more punitive plea offer. Even more concerning is the Tiffany Hall case, where a simple battery misdemeanor resulted in a three-year probation offer that seems disproportionate to the charge.

Cross-referencing arresting officers across all 500 cases... Officer J. Rodriguez appears in CR-2025-0012, CR-2025-0089, CR-2025-0118, CR-2025-0134 — all four involve contested vehicle searches during routine traffic stops. This is a systematic Fourth Amendment pattern that could form the basis of a consolidated suppression motion.`;

// ── Alert data ───────────────────────────────────────────────

interface Alert {
  severity: 'critical' | 'warning' | 'info';
  eyebrow?: string;
  title: string;
  detail: string;
  cases: string[];
}

const ALERTS: Alert[] = [
  {
    severity: 'critical',
    title: '4th Amendment Pattern',
    detail: 'Officer Rodriguez — contested vehicle searches across 4 cases',
    cases: ['CR-2025-0012', 'CR-2025-0089', 'CR-2025-0118', 'CR-2025-0134'],
  },
  {
    severity: 'critical',
    eyebrow: '3 DAYS',
    title: 'Speedy Trial Deadline',
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
    eyebrow: '10 DAYS',
    title: 'Plea Offers Expiring',
    detail: '3 plea windows closing mid-March — response deadlines imminent',
    cases: ['CR-2025-0133', 'CR-2025-0166', 'CR-2025-0278'],
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

// ── Component ────────────────────────────────────────────────

export const HealthCheckScene: React.FC = () => {
  const f = useCurrentFrame();

  const clickFrame = 70;
  const isAnalyzing = f >= clickFrame;
  const phaseStart = clickFrame + 30; // Steps begin animating

  // Phase timing: each step is active for ~120 frames (4s), total ~600 frames for 5 steps
  const phaseDuration = 120;
  const activePhaseIdx = isAnalyzing
    ? Math.min(Math.floor((f - phaseStart) / phaseDuration), 5)
    : -1;
  const allComplete = activePhaseIdx >= 5;

  // Token counts
  const tokenInput = isAnalyzing ? countUp(f, clickFrame, 150, 0, 275000) : 0;
  const tokenThinking = isAnalyzing ? countUp(f, clickFrame + 60, 500, 0, 60000) : 0;
  const tokenOutput = allComplete ? countUp(f, phaseStart + 5 * phaseDuration, 100, 0, 12000) : 0;

  // Elapsed timer (fake, compressed — real would be ~110s)
  const elapsedSec = isAnalyzing ? countUp(f, clickFrame, 600, 0, 110) : 0;

  // Raw thinking character reveal
  const thinkingCharsVisible = isAnalyzing
    ? Math.min(RAW_THINKING.length, Math.round(((f - clickFrame - 40) / 500) * RAW_THINKING.length))
    : 0;

  // Alerts appear after all phases complete
  const alertsStart = phaseStart + 5 * phaseDuration + 20;
  const alertInterval = 1.2 * FPS;

  // Header title
  const headerTitle = !isAnalyzing
    ? 'Ready'
    : allComplete
      ? HEADER_TITLES[5]
      : HEADER_TITLES[Math.max(0, Math.min(activePhaseIdx, 4))];

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
        statusText={!isAnalyzing ? 'Ready' : allComplete ? 'Complete' : 'Analyzing...'}
        statusColor={!isAnalyzing ? 'ready' : allComplete ? 'ready' : 'analyzing'}
        showCorpusBadge={isAnalyzing}
      >
        {!isAnalyzing ? (
          /* ── Pre-click: Command center ── */
          <PreClickContent />
        ) : (
          /* ── Post-click: Health Check thinking view ── */
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            height: '100%',
            opacity: fade(f, clickFrame + 10, 20),
          }}>
            {/* ── Thinking header ── */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 4,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Spinner — rotating half-circle */}
                {!allComplete && (
                  <Spinner frame={f} />
                )}
                {allComplete && (
                  <span style={{ fontSize: 18, color: COLORS.green }}>&#10003;</span>
                )}
                <span style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: COLORS.text,
                  letterSpacing: '-0.01em',
                }}>
                  {headerTitle}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <span style={{
                  fontSize: 12,
                  fontFamily: FONTS.mono,
                  color: COLORS.textMuted,
                }}>
                  {Math.round(tokenThinking).toLocaleString()} thinking tokens
                </span>
                <span style={{
                  fontSize: 12,
                  fontFamily: FONTS.mono,
                  color: COLORS.textMuted,
                }}>
                  {elapsedSec}s
                </span>
              </div>
            </div>

            {/* ── Phase steps ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {HC_PHASES.map((phase, i) => {
                const state: 'pending' | 'active' | 'complete' =
                  i < activePhaseIdx ? 'complete'
                    : i === activePhaseIdx ? 'active'
                      : 'pending';

                return (
                  <PhaseStep
                    key={i}
                    icon={phase.icon}
                    label={phase.label}
                    state={state}
                    frame={f}
                    activateFrame={phaseStart + i * phaseDuration}
                  />
                );
              })}
            </div>

            {/* ── View raw AI reasoning (collapsible-style) ── */}
            {f >= clickFrame + 60 && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, maxHeight: f >= alertsStart ? 180 : undefined, opacity: fade(f, clickFrame + 60, 25), transition: 'max-height 0.3s ease' }}>
                <div style={{
                  fontSize: 12,
                  color: COLORS.textMuted,
                  marginBottom: 8,
                  cursor: 'pointer',
                }}>
                  &#9660; View raw AI reasoning
                </div>
                <div style={{
                  flex: 1,
                  background: COLORS.bgTertiary,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 8,
                  padding: '14px 18px',
                  overflow: 'hidden',
                  minHeight: 0,
                }}>
                  <pre style={{
                    margin: 0,
                    fontSize: 12.5,
                    fontFamily: FONTS.mono,
                    color: COLORS.textSecondary,
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word',
                    lineHeight: 1.65,
                  }}>
                    {thinkingCharsVisible > 0 ? RAW_THINKING.slice(0, thinkingCharsVisible) : ''}
                    {thinkingCharsVisible > 0 && thinkingCharsVisible < RAW_THINKING.length && (
                      <span style={{ color: COLORS.gold }}>&#9608;</span>
                    )}
                  </pre>
                </div>
              </div>
            )}

            {/* ── Findings alerts (appear after all steps complete) ── */}
            {f >= alertsStart && (
              <div style={{
                display: 'flex',
                gap: 14,
                flexWrap: 'wrap',
                flexShrink: 0,
                opacity: fade(f, alertsStart, 25),
              }}>
                {ALERTS.map((alert, i) => {
                  const start = alertsStart + i * alertInterval;
                  if (f < start) return null;
                  const color = SEV_COLORS[alert.severity];
                  const label = SEV_LABELS[alert.severity];

                  return (
                    <div
                      key={i}
                      style={{
                        flex: '1 1 340px',
                        minHeight: 140,
                        padding: '24px 28px',
                        borderRadius: 12,
                        border: `2px solid ${color}50`,
                        background: `${color}0c`,
                        opacity: fade(f, start, 20),
                        transform: `translateY(${slideUp(f, start, 16, 20)}px)`,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-start',
                        gap: 0,
                        boxShadow: `0 0 20px ${color}15, inset 0 1px 0 ${color}12`,
                      }}
                    >
                      {/* Row 1: severity badge + eyebrow — fixed height */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 24, marginBottom: 8 }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: 5,
                          background: `${color}22`,
                          fontSize: 11,
                          fontFamily: FONTS.mono,
                          fontWeight: 800,
                          color,
                          letterSpacing: '0.1em',
                        }}>
                          {label}
                        </span>
                        {alert.eyebrow && (
                          <span style={{
                            fontSize: 11,
                            fontFamily: FONTS.mono,
                            fontWeight: 700,
                            color,
                            letterSpacing: '0.06em',
                            opacity: 0.8,
                          }}>
                            {alert.eyebrow}
                          </span>
                        )}
                      </div>
                      {/* Row 2: title — fixed height */}
                      <div style={{ fontSize: 19, fontWeight: 700, color, height: 24, marginBottom: 8 }}>{alert.title}</div>
                      {/* Row 3: detail */}
                      <div style={{ fontSize: 15, color: COLORS.textSecondary, lineHeight: 1.4, marginBottom: 10 }}>
                        {alert.detail}
                      </div>
                      {/* Row 4: case badges */}
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 'auto' }}>
                        {alert.cases.map((c) => (
                          <span key={c} style={{
                            fontSize: 12,
                            fontFamily: FONTS.mono,
                            color: COLORS.gold,
                            padding: '4px 10px',
                            borderRadius: 4,
                            border: `1px solid ${COLORS.gold}30`,
                            background: `${COLORS.gold}0a`,
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
        )}
      </AppShell>

      <Cursor waypoints={CURSOR} appearAt={10} />
    </>
  );
};

// ── Sub-components ────────────────────────────────────────────

/** Spinner — CSS-like rotating arc via frame-based rotation */
const Spinner: React.FC<{ frame: number }> = ({ frame }) => {
  const rotation = (frame * 6) % 360; // ~6 degrees per frame = full rotation in 2s
  return (
    <div style={{
      width: 20,
      height: 20,
      borderRadius: '50%',
      border: `2.5px solid ${COLORS.border}`,
      borderTopColor: COLORS.gold,
      transform: `rotate(${rotation}deg)`,
      flexShrink: 0,
    }} />
  );
};

/** Phase step card — matches real .hc-phase */
const PhaseStep: React.FC<{
  icon: string;
  label: string;
  state: 'pending' | 'active' | 'complete';
  frame: number;
  activateFrame: number;
}> = ({ icon, label, state, frame, activateFrame }) => {
  const isPending = state === 'pending';
  const isActive = state === 'active';
  const isComplete = state === 'complete';

  // Animated dots for active state
  const dots = isActive ? '.'.repeat(1 + (Math.floor(frame / 10) % 3)) : '';

  const borderColor = isComplete ? COLORS.green : isActive ? COLORS.gold : COLORS.border;
  const bgColor = isActive ? COLORS.goldGlow : COLORS.bgSecondary;

  const iconBg = isComplete
    ? 'rgba(34, 197, 94, 0.1)'
    : isActive
      ? COLORS.goldDim + '40'
      : COLORS.bgTertiary;
  const iconBorder = isComplete
    ? COLORS.green
    : isActive
      ? COLORS.gold
      : COLORS.border;
  const iconColor = isComplete
    ? COLORS.green
    : isActive
      ? COLORS.gold
      : COLORS.textMuted;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '12px 16px',
      borderRadius: 8,
      border: `1px solid ${borderColor}`,
      background: bgColor,
      opacity: isPending ? 0.35 : isComplete ? 0.7 : 1,
    }}>
      {/* Numbered circle */}
      <div style={{
        fontFamily: FONTS.mono,
        fontSize: 12,
        fontWeight: 700,
        width: 24,
        height: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '50%',
        background: iconBg,
        border: `1px solid ${iconBorder}`,
        color: iconColor,
        flexShrink: 0,
      }}>
        {icon}
      </div>

      {/* Label */}
      <span style={{
        flex: 1,
        fontSize: 14,
        fontWeight: 500,
        color: isPending ? COLORS.textMuted : COLORS.text,
      }}>
        {label}
      </span>

      {/* Status indicator */}
      <span style={{
        fontFamily: FONTS.mono,
        fontSize: 14,
        fontWeight: 700,
        minWidth: 20,
        textAlign: 'center' as const,
        color: isComplete ? COLORS.green : isActive ? COLORS.gold : 'transparent',
      }}>
        {isComplete ? '\u2713' : isActive ? dots : ''}
      </span>
    </div>
  );
};

/** Pre-click content: Command center matching the other scenes */
const PreClickContent: React.FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <StatPill value="500" label="Cases" />
        <StatPill value="167" label="Felonies" color={COLORS.red} />
        <StatPill value="333" label="Misdemeanors" color={COLORS.blue} />
        <StatPill value="487" label="Active" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          padding: '10px 20px',
          background: `linear-gradient(135deg, ${COLORS.goldDim} 0%, ${COLORS.gold} 50%, ${COLORS.goldBright} 100%)`,
          color: '#07080c',
          fontWeight: 700,
          fontSize: 13,
          borderRadius: 8,
          letterSpacing: '0.02em',
        }}>
          Cascade Intelligence
        </div>
        <div style={{
          padding: '9px 18px',
          background: COLORS.surfaceRaised,
          color: COLORS.text,
          fontWeight: 500,
          fontSize: 13,
          borderRadius: 8,
          border: `1px solid ${COLORS.borderLight}`,
        }}>
          Health Check
        </div>
        <div style={{
          padding: '7px 14px',
          background: 'transparent',
          color: COLORS.textSecondary,
          fontSize: 11,
          borderRadius: 8,
        }}>
          + Widget
        </div>
      </div>
    </div>
  </div>
);

const StatPill: React.FC<{ value: string; label: string; color?: string }> = ({ value, label, color }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 14px',
    borderRadius: 20,
    border: `1px solid ${color ? color + '30' : COLORS.border}`,
    background: COLORS.bgCard,
    fontSize: 12,
    fontWeight: 500,
    color: COLORS.textSecondary,
  }}>
    <span style={{ fontWeight: 700, fontFamily: FONTS.mono, color: color || COLORS.text }}>{value}</span>
    {label}
  </div>
);
