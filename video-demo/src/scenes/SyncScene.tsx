/**
 * SyncScene — Shows the app with cases populating in the sidebar.
 * Cursor clicks "Sync Caseload" → cases stream into the sidebar → stats update.
 */

import React from 'react';
import { useCurrentFrame } from 'remotion';
import { COLORS, FPS, FONTS } from '../config';
import { countUp, fade } from '../styles';
import { AppShell } from '../components/AppShell';
import { Cursor, type CursorWaypoint } from '../components/Cursor';

const CURSOR_WAYPOINTS: CursorWaypoint[] = [
  { frame: 0, x: 960, y: 540 },           // start center
  { frame: 20, x: 150, y: 340 },          // move to Sync Caseload button (sidebar center)
  { frame: 50, x: 150, y: 340, click: true }, // click Sync
  { frame: 100, x: 200, y: 300 },         // drift up to watch cases load
  { frame: 200, x: 200, y: 200 },         // watch loading
  { frame: 350, x: 500, y: 100 },         // glance at token bar
  { frame: 360, x: 500, y: 100, hidden: true }, // hide cursor
];

export const SyncScene: React.FC = () => {
  const f = useCurrentFrame();

  // Before click (frame 50): 0 cases. After click: ramp up to 500
  const clickFrame = 50;
  const casesLoaded = f < clickFrame ? 0 : countUp(f, clickFrame, 240, 0, 500);
  const visibleInSidebar = f < clickFrame ? 0 : countUp(f, clickFrame, 120, 0, 20);

  const felonies = Math.round(casesLoaded * 0.334);
  const misdemeanors = casesLoaded - felonies;

  return (
    <>
      <AppShell
        casesVisible={visibleInSidebar}
        totalCases={casesLoaded}
        felonyCount={felonies}
        misdemeanorCount={misdemeanors}
        statusText={f < clickFrame ? 'Ready' : casesLoaded < 500 ? 'Syncing...' : 'Ready'}
        statusColor={f < clickFrame ? 'ready' : casesLoaded < 500 ? 'loading' : 'ready'}
      >
        {/* Main content: big counter + loading animation */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center' }}>
          {f < clickFrame ? (
            /* Before sync: welcome state */
            <WelcomeContent opacity={fade(f, 0, 20)} />
          ) : (
            /* After sync: counter + stats */
            <SyncingContent frame={f} clickFrame={clickFrame} casesLoaded={casesLoaded} />
          )}
        </div>
      </AppShell>

      <Cursor waypoints={CURSOR_WAYPOINTS} appearAt={5} />
    </>
  );
};

/* Welcome hero — matches real .welcome-hero with 4 feature cards */
const FEATURES = [
  { num: '01', title: 'Health Check', desc: 'Scan all 500 cases for deadline risks, cross-case connections, and strategic opportunities', tag: '1M Context Window' },
  { num: '02', title: 'Deep Analysis', desc: 'Individual case strategy with visible AI reasoning', tag: 'Extended Thinking' },
  { num: '03', title: 'Adversarial Sim', desc: 'Watch prosecution vs defense debate in real-time', tag: 'Dual Thinking Chains' },
  { num: '04', title: 'Motion Drafting', desc: 'Generate comprehensive legal motions', tag: '128K Output' },
];

const WelcomeContent: React.FC<{ opacity: number }> = ({ opacity }) => (
  <div style={{ opacity, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
    <div>
      <div style={{ fontSize: 42, fontWeight: 800, color: COLORS.text, marginBottom: 6, letterSpacing: '-0.01em', textAlign: 'center' }}>
        Case Nexus
      </div>
      <div style={{ fontSize: 15, color: COLORS.textSecondary, fontWeight: 400, textAlign: 'center' }}>
        AI-powered intelligence for public defenders
      </div>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16, maxWidth: 900 }}>
      {FEATURES.map((f) => (
        <div key={f.num} style={{
          padding: '20px 16px',
          borderRadius: 12,
          border: `1px solid ${COLORS.border}`,
          background: COLORS.bgCard,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          <span style={{ fontSize: 28, fontWeight: 800, color: COLORS.gold, fontFamily: FONTS.mono }}>{f.num}</span>
          <span style={{ fontSize: 15, fontWeight: 600, color: COLORS.text }}>{f.title}</span>
          <span style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.4 }}>{f.desc}</span>
          <span style={{
            fontSize: 10,
            fontFamily: FONTS.mono,
            color: COLORS.gold,
            padding: '3px 8px',
            borderRadius: 4,
            background: COLORS.goldGlow,
            border: `1px solid ${COLORS.borderAccent}`,
            alignSelf: 'flex-start',
            marginTop: 'auto',
          }}>
            {f.tag}
          </span>
        </div>
      ))}
    </div>
  </div>
);

const SyncingContent: React.FC<{ frame: number; clickFrame: number; casesLoaded: number }> = ({ frame, clickFrame, casesLoaded }) => (
  <div style={{ opacity: fade(frame, clickFrame, 20), display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
    <div style={{ fontSize: 120, fontWeight: 900, fontFamily: FONTS.mono, color: COLORS.gold, lineHeight: 1 }}>
      {casesLoaded}
    </div>
    <div style={{ fontSize: 24, color: COLORS.textSecondary, marginTop: 8 }}>
      cases synced from court system
    </div>

    {/* Category breakdown */}
    {casesLoaded >= 100 && (
      <div style={{ display: 'flex', gap: 32, marginTop: 40, justifyContent: 'center', opacity: fade(frame, clickFrame + 90, 30) }}>
        <StatBox label="Felonies" count={Math.round(casesLoaded * 0.334)} color={COLORS.red} />
        <StatBox label="Misdemeanors" count={Math.round(casesLoaded * 0.476)} color={COLORS.blue} />
        <StatBox label="Drug Offenses" count={Math.round(casesLoaded * 0.134)} color={COLORS.purple} />
        <StatBox label="Traffic/DUI" count={Math.round(casesLoaded * 0.056)} color={COLORS.green} />
      </div>
    )}

    {/* Legal corpus badge */}
    {casesLoaded >= 450 && (
      <div style={{ marginTop: 40, display: 'flex', gap: 20, justifyContent: 'center', opacity: fade(frame, clickFrame + 200, 30) }}>
        <CorpusBadge value="73" label="GA Statutes" />
        <CorpusBadge value="8,969" label="USC Sections" />
        <CorpusBadge value="8" label="Amendments" />
        <CorpusBadge value="35" label="Case Law" />
      </div>
    )}
  </div>
);

const StatBox: React.FC<{ label: string; count: number; color: string }> = ({ label, count, color }) => (
  <div style={{ textAlign: 'center' }}>
    <div style={{ fontSize: 36, fontWeight: 800, fontFamily: FONTS.mono, color }}>{count}</div>
    <div style={{ fontSize: 14, color: COLORS.textMuted, marginTop: 4 }}>{label}</div>
  </div>
);

const CorpusBadge: React.FC<{ value: string; label: string }> = ({ value, label }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '12px 20px', borderRadius: 12, border: `1px solid ${COLORS.border}`, background: COLORS.bgSecondary, minWidth: 110 }}>
    <span style={{ fontSize: 24, fontWeight: 800, fontFamily: FONTS.mono, color: COLORS.gold }}>{value}</span>
    <span style={{ fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.mono }}>{label}</span>
  </div>
);
