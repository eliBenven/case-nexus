/**
 * CascadeScene — Autonomous investigation with 9 tools.
 *
 * Timeline:
 *   0-3s:   App visible, cursor moves to Cascade button
 *   3-4s:   Click Cascade Intelligence
 *   4-8s:   Tool grid appears, first tool call fires
 *   8-25s:  Tool calls appear one by one with thinking indicators
 *   25-33s: Strategic brief renders
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
  { frame: 40, x: 1600, y: 103 },            // Cascade Intelligence button (right side of command center)
  { frame: 70, x: 1600, y: 103, click: true },
  { frame: 130, x: 800, y: 400 },           // watch tool calls
  { frame: 400, x: 800, y: 600 },           // watch brief
  { frame: 700, x: 800, y: 600, hidden: true },
];

// ── Tool data ────────────────────────────────────────────────

const TOOLS = [
  { name: 'get_case', icon: '📋' },
  { name: 'get_case_context', icon: '📑' },
  { name: 'get_legal_context', icon: '⚖️' },
  { name: 'get_alerts', icon: '🚨' },
  { name: 'get_connections', icon: '🔗' },
  { name: 'get_prior_analyses', icon: '🧠' },
  { name: 'search_case_law', icon: '📚' },
  { name: 'verify_citations', icon: '✅' },
  { name: 'search_precedents', icon: '🔍' },
];

interface ToolCall {
  round: number;
  tool: string;
  description: string;
  detail: string;
  color: string;
  thinkingText: string;
}

const TOOL_CALLS: ToolCall[] = [
  {
    round: 1,
    tool: 'get_case',
    description: 'Pulling case for investigation',
    detail: 'CR-2025-0012 — Marcus Webb — Traffic Stop DUI',
    color: COLORS.blue,
    thinkingText: 'This DUI case has a contested vehicle search during a traffic stop. Let me examine the arrest details...',
  },
  {
    round: 2,
    tool: 'get_legal_context',
    description: 'Looking up Georgia statute',
    detail: 'O.C.G.A. § 16-13-30 — Controlled Substances',
    color: COLORS.green,
    thinkingText: 'Need to check if the search falls under the vehicle exception or required a warrant...',
  },
  {
    round: 3,
    tool: 'search_case_law',
    description: 'Searching case law precedent',
    detail: 'State v. Henderson — Motion to suppress evidence from vehicle search',
    color: COLORS.orange,
    thinkingText: 'Henderson established that consent must be voluntary and uncoerced. This applies directly...',
  },
  {
    round: 4,
    tool: 'get_connections',
    description: 'Finding cross-case patterns',
    detail: 'Officer Rodriguez — 4 contested vehicle searches identified',
    color: COLORS.red,
    thinkingText: 'The same officer appears in CR-2025-0012, 0089, 0118, 0134 — all traffic stops with searches.',
  },
  {
    round: 5,
    tool: 'verify_citations',
    description: 'Verifying legal citations',
    detail: 'Web Search: 3 citations verified, 0 hallucinated',
    color: COLORS.purple,
    thinkingText: 'All cited cases confirmed via web search. Proceeding to strategic assessment...',
  },
];

// ── Component ────────────────────────────────────────────────

export const CascadeScene: React.FC = () => {
  const f = useCurrentFrame();

  const clickFrame = 70;
  const isActive = f >= clickFrame;
  const toolsStart = clickFrame + 30;
  const callsStart = clickFrame + 80;
  const callDuration = 4 * FPS;
  const briefStart = 22 * FPS;

  // Token counts
  const tokenInput = isActive ? countUp(f, clickFrame, 120, 0, 48000) : 0;
  const tokenThinking = isActive ? countUp(f, clickFrame + 30, 300, 0, 45000) : 0;
  const tokenOutput = isActive ? countUp(f, briefStart, 150, 0, 18000) : 0;
  const currentRound = isActive ? Math.min(5, Math.floor((f - callsStart) / callDuration) + 1) : 0;

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
        tokenCalls={isActive ? Math.min(currentRound, 5) : 0}
        statusText={!isActive ? 'Ready' : f >= briefStart + 100 ? 'Complete' : 'Investigating...'}
        statusColor={!isActive ? 'ready' : f >= briefStart + 100 ? 'ready' : 'analyzing'}
        showCorpusBadge={isActive}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
          {/* Command Center (matches real .command-center) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            {/* Stat pills */}
            <div style={{ display: 'flex', gap: 8 }}>
              <StatPill value="500" label="Cases" />
              <StatPill value="167" label="Felonies" color={COLORS.red} />
              <StatPill value="333" label="Misdemeanors" color={COLORS.blue} />
              <StatPill value="487" label="Active" />
            </div>
            {/* Action buttons (matches real .command-actions) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                padding: '10px 20px',
                background: isActive
                  ? COLORS.bgHover
                  : `linear-gradient(135deg, ${COLORS.goldDim} 0%, ${COLORS.gold} 50%, ${COLORS.goldBright} 100%)`,
                color: isActive ? COLORS.gold : '#07080c',
                fontWeight: 700,
                fontSize: 13,
                borderRadius: 8,
                letterSpacing: '0.02em',
                border: isActive ? `1px solid ${COLORS.borderAccent}` : 'none',
                boxShadow: isActive ? `0 0 12px rgba(212, 175, 55, 0.08)` : 'none',
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
          {/* Pinned: subtitle + tool grid */}
          {isActive && (
            <div style={{ flexShrink: 0 }}>
              <span style={{ fontSize: 12, color: COLORS.textMuted, opacity: fade(f, clickFrame + 10, 20), display: 'block', marginBottom: 12 }}>
                Cascade Intelligence — 9 tools • autonomous investigation
              </span>

              {/* Tool grid */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', opacity: fade(f, toolsStart, 25) }}>
                {TOOLS.map((tool, i) => {
                  // Is this tool currently being called?
                  const activeCall = TOOL_CALLS.find(
                    (tc) => tc.tool === tool.name && f >= callsStart + TOOL_CALLS.indexOf(tc) * callDuration && f < callsStart + (TOOL_CALLS.indexOf(tc) + 1) * callDuration,
                  );
                  const wasUsed = TOOL_CALLS.find(
                    (tc) => tc.tool === tool.name && f >= callsStart + TOOL_CALLS.indexOf(tc) * callDuration + callDuration,
                  );

                  return (
                    <span
                      key={tool.name}
                      style={{
                        padding: '5px 12px',
                        borderRadius: 6,
                        border: `1px solid ${activeCall ? COLORS.gold : wasUsed ? COLORS.green + '40' : COLORS.border}`,
                        background: activeCall ? `${COLORS.gold}12` : wasUsed ? `${COLORS.green}08` : COLORS.bgSecondary,
                        fontSize: 11,
                        fontFamily: FONTS.mono,
                        color: activeCall ? COLORS.gold : wasUsed ? COLORS.green : COLORS.textMuted,
                        opacity: fade(f, toolsStart + i * 6, 18),
                      }}
                    >
                      {tool.icon} {tool.name}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tool call timeline (scrollable area) */}
          {isActive && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden', minHeight: 0 }}>
              {TOOL_CALLS.map((call, i) => {
                const start = callsStart + i * callDuration;
                if (f < start) return null;

                const isThinking = f >= start + 20 && f < start + callDuration - 10;
                const isDone = f >= start + callDuration;
                const dots = isThinking ? '.'.repeat(1 + (Math.floor((f - start) / 8) % 3)) : '';

                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'stretch',
                      gap: 14,
                      opacity: fade(f, start, 20),
                      transform: `translateY(${slideUp(f, start, 20, 20)}px)`,
                    }}
                  >
                    {/* Round badge */}
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      background: `${call.color}15`,
                      border: `2px solid ${call.color}50`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                      fontWeight: 800,
                      fontFamily: FONTS.mono,
                      color: call.color,
                      flexShrink: 0,
                    }}>
                      {call.round}
                    </div>

                    {/* Content */}
                    <div style={{
                      flex: 1,
                      padding: '12px 18px',
                      borderRadius: 10,
                      border: `1px solid ${COLORS.border}`,
                      background: COLORS.bgSecondary,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 11, fontFamily: FONTS.mono, color: call.color, textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>
                          {call.description}
                        </span>
                        <span style={{ fontSize: 10, fontFamily: FONTS.mono, color: isDone ? COLORS.green : COLORS.textMuted }}>
                          {isDone ? '✓' : isThinking ? `thinking${dots}` : 'calling...'}
                        </span>
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: COLORS.text, marginTop: 4, opacity: fade(f, start + 15, 18) }}>
                        {call.detail}
                      </div>
                      {/* Thinking text */}
                      {(isThinking || isDone) && (
                        <div style={{ fontSize: 12, fontFamily: FONTS.mono, color: COLORS.textMuted, marginTop: 6, fontStyle: 'italic', opacity: fade(f, start + 25, 15) }}>
                          {call.thinkingText}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Strategic Brief */}
              {f >= briefStart && (
                <div style={{
                  padding: '20px 24px',
                  borderRadius: 12,
                  border: `1px solid ${COLORS.borderAccent}`,
                  background: COLORS.bgCard,
                  opacity: fade(f, briefStart, 30),
                  transform: `translateY(${slideUp(f, briefStart, 16, 25)}px)`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                  boxShadow: `0 0 24px ${COLORS.goldGlow}`,
                }}>
                  {/* Brief header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 11, fontFamily: FONTS.mono, fontWeight: 800, color: COLORS.gold, letterSpacing: '0.1em', padding: '3px 10px', borderRadius: 5, background: `${COLORS.gold}15` }}>
                        STRATEGIC BRIEF
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>
                        CR-2025-0012 — Marcus Webb
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <span style={{ fontSize: 10, fontFamily: FONTS.mono, color: COLORS.blue }}>8 rounds</span>
                      <span style={{ fontSize: 10, fontFamily: FONTS.mono, color: COLORS.green }}>9 tools</span>
                      <span style={{ fontSize: 10, fontFamily: FONTS.mono, color: COLORS.purple }}>45K thinking</span>
                    </div>
                  </div>

                  {/* Finding */}
                  <div style={{ opacity: fade(f, briefStart + 15, 20) }}>
                    <div style={{ fontSize: 11, fontFamily: FONTS.mono, fontWeight: 700, color: COLORS.red, letterSpacing: '0.06em', marginBottom: 4 }}>
                      PRIMARY FINDING
                    </div>
                    <div style={{ fontSize: 15, color: COLORS.text, lineHeight: 1.5 }}>
                      Officer J. Rodriguez conducted contested vehicle searches in 4 separate traffic stop cases (CR-2025-0012, 0089, 0118, 0134). All searches lack documented probable cause beyond initial stop. This constitutes a systematic Fourth Amendment pattern suitable for a consolidated motion to suppress.
                    </div>
                  </div>

                  {/* Recommendation */}
                  <div style={{ opacity: fade(f, briefStart + 30, 20) }}>
                    <div style={{ fontSize: 11, fontFamily: FONTS.mono, fontWeight: 700, color: COLORS.green, letterSpacing: '0.06em', marginBottom: 4 }}>
                      RECOMMENDED ACTION
                    </div>
                    <div style={{ fontSize: 14, color: COLORS.textSecondary, lineHeight: 1.5 }}>
                      File consolidated motion to suppress under <span style={{ color: COLORS.gold, fontFamily: FONTS.mono, fontSize: 13 }}>State v. Henderson</span> — officer pattern of warrantless vehicle searches without voluntary consent. Cite O.C.G.A. § 16-13-30 requirements for controlled substance seizure.
                    </div>
                  </div>

                  {/* Smart Actions */}
                  <div style={{ opacity: fade(f, briefStart + 45, 20), display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontSize: 11, fontFamily: FONTS.mono, fontWeight: 700, color: COLORS.gold, letterSpacing: '0.06em' }}>
                      SMART ACTIONS
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <SmartAction label="File Motion to Suppress" urgency="critical" />
                      <SmartAction label="Request Rodriguez Discovery" urgency="critical" />
                      <SmartAction label="Draft Consolidated Brief" urgency="high" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </AppShell>

      <Cursor waypoints={CURSOR} appearAt={10} />
    </>
  );
};

const SmartAction: React.FC<{ label: string; urgency: 'critical' | 'high' | 'medium' }> = ({ label, urgency }) => {
  const color = urgency === 'critical' ? COLORS.red : urgency === 'high' ? COLORS.orange : COLORS.blue;
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '12px 18px',
      borderRadius: 8,
      border: `1px solid ${color}40`,
      background: `${color}0a`,
      cursor: 'pointer',
    }}>
      <div style={{
        width: 20,
        height: 20,
        borderRadius: 5,
        border: `2px solid ${color}60`,
        flexShrink: 0,
      }} />
      <span style={{ fontSize: 16, fontWeight: 600, color: COLORS.text }}>{label}</span>
      <span style={{
        fontSize: 11,
        fontFamily: FONTS.mono,
        fontWeight: 700,
        color,
        letterSpacing: '0.08em',
        textTransform: 'uppercase' as const,
        marginLeft: 4,
      }}>
        {urgency}
      </span>
    </div>
  );
};

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
