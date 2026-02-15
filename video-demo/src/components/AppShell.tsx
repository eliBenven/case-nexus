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

        {/* Left: Logo — no icon, gradient text matches real app */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                fontFamily: FONTS.sans,
                fontSize: 21,
                fontWeight: 700,
                letterSpacing: '0.02em',
                background: `linear-gradient(135deg, ${COLORS.text} 0%, rgba(212, 175, 55, 0.7) 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Case Nexus
            </span>
          </div>
          <span style={{ fontSize: 10.5, color: COLORS.textMuted, letterSpacing: '0.08em', fontWeight: 400, textTransform: 'uppercase' as const }}>
            AI-Powered Legal Caseload Intelligence
          </span>
        </div>

        {/* Center: Token Visualization Bar — pill wrapper matches .token-viz */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '6px 16px',
          background: COLORS.bgTertiary,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 20,
          minWidth: 420,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 500, color: COLORS.text, whiteSpace: 'nowrap' as const }}>
            <span style={{ fontSize: 12, color: COLORS.gold }}>{'\u2022'}</span>
            <span>Opus 4.6 Tokens</span>
          </div>
          {/* Bar — flex fill within pill */}
          <div style={{ flex: 1, height: 5, borderRadius: 3, background: COLORS.bg, overflow: 'hidden', minWidth: 60 }}>
            <div style={{
              width: `${barPercent}%`,
              height: '100%',
              borderRadius: 3,
              background: `linear-gradient(90deg, ${COLORS.goldDim}, ${COLORS.gold}, ${COLORS.goldBright})`,
              boxShadow: '0 0 8px rgba(201, 168, 76, 0.25)',
            }} />
          </div>
          {/* Total count */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, whiteSpace: 'nowrap' as const }}>
            <span style={{ fontSize: 12, fontFamily: FONTS.mono, color: COLORS.gold, fontWeight: 600 }}>
              {totalTokens > 0 ? fmt(totalTokens) : '0'}
            </span>
            <span style={{ fontSize: 10, color: COLORS.textMuted }}>/ 1M context</span>
          </div>

          {/* Breakdown chips — with pill backgrounds */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <TokenChip label="In" value={fmt(tokenInput)} color={COLORS.blue} />
            <TokenChip label="Think" value={fmt(tokenThinking)} color={COLORS.purple} />
            <TokenChip label="Out" value={fmt(tokenOutput)} color={COLORS.green} />
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontFamily: FONTS.mono, padding: '2px 8px', borderRadius: 10, background: COLORS.bg, color: COLORS.gold, whiteSpace: 'nowrap' as const }}>
              <strong style={{ fontWeight: 500 }}>{tokenCalls}</strong> calls
            </span>
          </div>
        </div>

        {/* Right: Badges + Chat button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {showCorpusBadge && (
            <span style={{ fontSize: 10, padding: '4px 12px', background: COLORS.greenBg, color: COLORS.green, border: `1px solid rgba(34, 197, 94, 0.2)`, borderRadius: 20, fontWeight: 500 }}>
              Legal Corpus
            </span>
          )}
          <span style={{ fontSize: 10, padding: '4px 12px', background: COLORS.goldGlow, color: COLORS.gold, border: `1px solid ${COLORS.borderAccent}`, borderRadius: 20, fontWeight: 500, letterSpacing: '0.3px' }}>
            Claude Opus 4.6
          </span>
          <span style={{ fontSize: 10, padding: '4px 12px', borderRadius: 20, fontWeight: 500, letterSpacing: '0.3px', background: sc.bg, color: sc.fg }}>
            {statusText}
          </span>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '7px 16px',
            background: `linear-gradient(135deg, ${COLORS.goldDim} 0%, ${COLORS.gold} 50%, ${COLORS.goldBright} 100%)`,
            borderRadius: 8,
            cursor: 'pointer',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#07080c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#07080c', letterSpacing: '0.02em' }}>Chat</span>
          </div>
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
          <div style={{ flex: 1, overflow: 'hidden', padding: '4px 0' }}>
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
  <span style={{
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 10,
    fontFamily: FONTS.mono,
    padding: '2px 8px',
    borderRadius: 10,
    background: COLORS.bg,
    whiteSpace: 'nowrap' as const,
  }}>
    <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: color }} />
    {label}: <strong style={{ color, fontWeight: 500 }}>{value}</strong>
  </span>
);

const SyncButton: React.FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', textAlign: 'center', color: COLORS.textMuted }}>
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      padding: '5px 14px',
      background: COLORS.greenBg,
      border: '1px solid rgba(34, 197, 94, 0.2)',
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 500,
      color: COLORS.green,
      marginBottom: 10,
    }}>
      <span style={{ width: 6, height: 6, background: COLORS.green, borderRadius: '50%' }} />
      Fulton County Superior Court
    </div>
    <p style={{ fontSize: 12, marginBottom: 12, color: COLORS.textMuted, fontWeight: 300 }}>Case Management System</p>
    <div style={{
      padding: '12px 28px',
      background: `linear-gradient(135deg, ${COLORS.gold} 0%, ${COLORS.goldBright} 100%)`,
      color: '#0a0b0e',
      fontWeight: 600,
      fontSize: 14,
      borderRadius: LAYOUT.radius,
      letterSpacing: '0.3px',
      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 3px rgba(212, 175, 55, 0.2)`,
    }}>
      Sync Caseload
    </div>
    <p style={{ fontSize: 12, marginTop: 8, color: COLORS.textMuted, fontWeight: 300 }}>Pull assigned cases from court CMS</p>
  </div>
);

const CaseItem: React.FC<{ caseData: MockCase; selected?: boolean }> = ({ caseData, selected }) => {
  const isFelony = caseData.severity === 'felony';
  const borderColor = isFelony ? COLORS.red : COLORS.blue;

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
          {isFelony && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 12, fontWeight: 600, letterSpacing: '0.3px', background: COLORS.redBg, color: COLORS.red }}>F</span>}
          {!isFelony && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 12, fontWeight: 600, letterSpacing: '0.3px', background: COLORS.blueBg, color: COLORS.blue }}>M</span>}
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
