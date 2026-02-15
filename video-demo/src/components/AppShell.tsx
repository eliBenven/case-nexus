/**
 * AppShell — Pixel-accurate replica of the Case Nexus app layout.
 *
 * Renders: Header (token bar, badges) + Sidebar (case list) + Main Content area.
 * Each scene provides its own content via children prop.
 */

import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { COLORS, FONTS, LAYOUT, MOCK_CASES, type MockCase } from '../config';

// ── Types ────────────────────────────────────────────────────

export interface AppShellProps {
  /** Number of cases visible in the sidebar (animatable: 0 → 500) */
  casesVisible?: number;
  /** Total cases count shown in header stat */
  totalCases?: number;
  felonyCount?: number;
  misdemeanorCount?: number;
  /** Token bar values */
  tokenInput?: number;
  tokenThinking?: number;
  tokenOutput?: number;
  tokenCalls?: number;
  /** Status badge */
  statusText?: string;
  statusColor?: 'ready' | 'analyzing' | 'loading';
  /** Which case is selected/highlighted in the sidebar */
  selectedCaseId?: string | null;
  /** Show legal corpus badge */
  showCorpusBadge?: boolean;
  /** Main content */
  children?: React.ReactNode;
}

// ── Helper: format numbers with commas ───────────────────────

function fmt(n: number): string {
  return Math.round(n).toLocaleString();
}

// ── Component ────────────────────────────────────────────────

export const AppShell: React.FC<AppShellProps> = ({
  casesVisible = 0,
  totalCases = 0,
  felonyCount = 0,
  misdemeanorCount = 0,
  tokenInput = 0,
  tokenThinking = 0,
  tokenOutput = 0,
  tokenCalls = 0,
  statusText = 'Ready',
  statusColor = 'ready',
  selectedCaseId = null,
  showCorpusBadge = false,
  children,
}) => {
  const totalTokens = tokenInput + tokenThinking + tokenOutput;
  const barPercent = Math.min((totalTokens / 1_000_000) * 100, 100);

  const statusColors: Record<string, { bg: string; fg: string }> = {
    ready: { bg: COLORS.greenBg, fg: COLORS.green },
    analyzing: { bg: COLORS.goldGlow, fg: COLORS.gold },
    loading: { bg: COLORS.blueBg, fg: COLORS.blue },
  };
  const sc = statusColors[statusColor] || statusColors.ready;

  // How many cases to show from MOCK_CASES (max 20, but repeat pattern)
  const visibleCases = Math.min(Math.round(casesVisible), 20);

  return (
    <AbsoluteFill style={{ background: COLORS.bg, fontFamily: FONTS.sans, fontSize: 13.5, color: COLORS.text }}>
      {/* ── HEADER ─────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: LAYOUT.headerHeight,
          background: 'linear-gradient(180deg, rgba(12, 14, 21, 0.95) 0%, rgba(17, 20, 32, 0.85) 100%)',
          borderBottom: `1px solid ${COLORS.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          zIndex: 100,
          boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
        }}
      >
        {/* Gold accent line under header */}
        <div style={{ position: 'absolute', bottom: -1, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${COLORS.goldGlowStrong}, transparent)` }} />

        {/* Left: Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24, color: COLORS.gold }}>⚖</span>
            <span
              style={{
                fontFamily: FONTS.sans,
                fontSize: 21,
                fontWeight: 700,
                letterSpacing: '0.02em',
                color: COLORS.text,
              }}
            >
              Case Nexus
            </span>
          </div>
          <span style={{ fontSize: 10.5, color: COLORS.textMuted, letterSpacing: '0.08em', fontWeight: 400, textTransform: 'uppercase' as const }}>
            AI-Powered Legal Caseload Intelligence
          </span>
        </div>

        {/* Center: Token Visualization Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: COLORS.textMuted }}>
            <span style={{ fontSize: 14 }}>⚙</span>
            <span>Opus 4.6 Tokens</span>
          </div>
          {/* Bar */}
          <div style={{ width: 200, height: 6, borderRadius: 3, background: COLORS.bgTertiary, overflow: 'hidden' }}>
            <div style={{ width: `${barPercent}%`, height: '100%', borderRadius: 3, background: COLORS.gold, boxShadow: barPercent > 0 ? `0 0 12px ${COLORS.goldGlowStrong}` : 'none', transition: 'width 0.1s' }} />
          </div>
          {/* Total count */}
          <span style={{ fontSize: 12, fontFamily: FONTS.mono, color: COLORS.text, fontWeight: 600, minWidth: 50 }}>
            {totalTokens > 0 ? fmt(totalTokens) : '0'}
          </span>
          <span style={{ fontSize: 10, color: COLORS.textMuted }}>/ 1M context</span>

          {/* Breakdown chips */}
          <div style={{ display: 'flex', gap: 8, marginLeft: 8 }}>
            <TokenChip label="In" value={fmt(tokenInput)} color={COLORS.blue} />
            <TokenChip label="Think" value={fmt(tokenThinking)} color={COLORS.purple} />
            <TokenChip label="Out" value={fmt(tokenOutput)} color={COLORS.green} />
            <span style={{ fontSize: 10, fontFamily: FONTS.mono, color: COLORS.orange }}>⚡ {tokenCalls} calls</span>
          </div>
        </div>

        {/* Right: Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {showCorpusBadge && (
            <span style={{ fontSize: 10, padding: '4px 12px', background: COLORS.greenBg, color: COLORS.green, border: `1px solid rgba(34, 197, 94, 0.2)`, borderRadius: 20, fontWeight: 500 }}>
              ⚖ Legal Corpus
            </span>
          )}
          <span style={{ fontSize: 10, padding: '4px 12px', background: COLORS.goldGlow, color: COLORS.gold, border: `1px solid ${COLORS.borderAccent}`, borderRadius: 20, fontWeight: 500, letterSpacing: '0.3px' }}>
            Claude Opus 4.6
          </span>
          <span style={{ fontSize: 10, padding: '4px 12px', borderRadius: 20, fontWeight: 500, letterSpacing: '0.3px', background: sc.bg, color: sc.fg }}>
            {statusText}
          </span>
        </div>
      </div>

      {/* ── BODY (sidebar + main) ──────────────── */}
      <div style={{ position: 'absolute', top: LAYOUT.headerHeight, left: 0, right: 0, bottom: 0, display: 'flex' }}>
        {/* ── SIDEBAR ─────────────────────────── */}
        <div
          style={{
            width: LAYOUT.sidebarWidth,
            background: COLORS.bgSecondary,
            borderRight: `1px solid ${COLORS.border}`,
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            overflow: 'hidden',
          }}
        >
          {/* Sidebar header */}
          <div style={{ padding: '18px 18px 14px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: COLORS.textSecondary }}>
              Caseload
            </span>
            {totalCases > 0 && (
              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 12, fontWeight: 500, background: 'transparent', color: COLORS.textSecondary }}>{totalCases}</span>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 12, fontWeight: 500, background: COLORS.redBg, color: COLORS.red }}>{felonyCount} F</span>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 12, fontWeight: 500, background: COLORS.blueBg, color: COLORS.blue }}>{misdemeanorCount} M</span>
              </div>
            )}
          </div>

          {/* Search + filter */}
          <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8, borderBottom: `1px solid ${COLORS.border}` }}>
            <div style={{ width: '100%', padding: '8px 12px', background: COLORS.bgTertiary, border: `1px solid ${COLORS.border}`, borderRadius: LAYOUT.radiusSm, color: COLORS.textMuted, fontSize: 13 }}>
              Search cases...
            </div>
            <div style={{ width: '100%', padding: '8px 12px', background: COLORS.bgTertiary, border: `1px solid ${COLORS.border}`, borderRadius: LAYOUT.radiusSm, color: COLORS.textMuted, fontSize: 13 }}>
              All Cases
            </div>
          </div>

          {/* Case list */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {visibleCases === 0 ? (
              <SyncButton />
            ) : (
              MOCK_CASES.slice(0, visibleCases).map((c) => (
                <CaseItem key={c.id} caseData={c} selected={c.id === selectedCaseId} />
              ))
            )}
          </div>
        </div>

        {/* ── MAIN CONTENT ────────────────────── */}
        <div
          style={{
            flex: 1,
            overflow: 'hidden',
            position: 'relative',
            background: `
              radial-gradient(ellipse 60% 50% at 20% 0%, rgba(212, 175, 55, 0.02) 0%, transparent 60%),
              radial-gradient(ellipse 40% 40% at 80% 100%, rgba(62, 99, 221, 0.015) 0%, transparent 60%)
            `,
          }}
        >
          <div style={{ padding: 28, height: '100%' }}>
            {children}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── Sub-components ───────────────────────────────────────────

const TokenChip: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
  <span style={{ fontSize: 10, fontFamily: FONTS.mono, color: COLORS.textMuted }}>
    <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: color, marginRight: 4 }} />
    {label}: <strong style={{ color }}>{value}</strong>
  </span>
);

const SyncButton: React.FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', textAlign: 'center', color: COLORS.textMuted }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: COLORS.green, marginBottom: 16 }}>
      <span style={{ width: 6, height: 6, background: COLORS.green, borderRadius: '50%' }} />
      Fulton County Superior Court
    </div>
    <p style={{ fontSize: 12, marginBottom: 12, color: COLORS.textMuted }}>Case Management System</p>
    <div style={{
      padding: '10px 28px',
      background: `linear-gradient(135deg, ${COLORS.gold} 0%, ${COLORS.goldDim} 100%)`,
      color: COLORS.bg,
      fontWeight: 700,
      fontSize: 14,
      borderRadius: LAYOUT.radius,
      cursor: 'pointer',
    }}>
      Sync Caseload
    </div>
    <p style={{ fontSize: 11, marginTop: 8, color: COLORS.textMuted }}>Pull assigned cases from court CMS</p>
  </div>
);

const CaseItem: React.FC<{ caseData: MockCase; selected?: boolean }> = ({ caseData, selected }) => {
  const isFelony = caseData.severity === 'felony';
  const borderColor = isFelony ? COLORS.red : COLORS.blue;
  const badgeColor = isFelony ? COLORS.red : COLORS.blue;
  const badgeBg = isFelony ? COLORS.redBg : COLORS.blueBg;

  return (
    <div style={{
      padding: '12px 16px',
      borderBottom: `1px solid ${COLORS.border}`,
      borderLeft: `3px solid ${borderColor}`,
      background: selected ? COLORS.bgHover : 'transparent',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
        <span style={{ fontSize: 10, fontFamily: FONTS.mono, color: COLORS.textMuted, fontWeight: 400, letterSpacing: '0.02em' }}>
          {caseData.id}
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          {isFelony && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 10, fontWeight: 600, background: COLORS.redBg, color: COLORS.red }}>F</span>}
          {!isFelony && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 10, fontWeight: 600, background: COLORS.blueBg, color: COLORS.blue }}>M</span>}
        </div>
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: '-0.01em' }}>
        {caseData.name}
      </div>
      <div style={{ fontSize: 11.5, color: COLORS.textSecondary, marginTop: 3, fontWeight: 400 }}>
        {caseData.charge}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 12, textTransform: 'uppercase' as const, fontWeight: 500, letterSpacing: '0.5px', background: COLORS.greenBg, color: COLORS.green }}>
          {caseData.status}
        </span>
        <span style={{ fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.mono, fontWeight: 400 }}>
          {caseData.date}
        </span>
      </div>
    </div>
  );
};
