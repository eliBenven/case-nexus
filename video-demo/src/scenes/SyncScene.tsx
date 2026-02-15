/**
 * SyncScene — Shows the app with cases populating in the sidebar.
 * Cursor clicks "Sync Caseload" → cases stream into the sidebar → stats update.
 */

import React from 'react';
import { useCurrentFrame } from 'remotion';
import { FPS } from '../config';
import { countUp, fade } from '../styles';
import { AppShell } from '../components/AppShell';
import { Cursor, type CursorWaypoint } from '../components/Cursor';

const CURSOR_WAYPOINTS: CursorWaypoint[] = [
  { frame: 0, x: 960, y: 540 },           // start center
  { frame: 20, x: 172, y: 440 },          // move to Sync button
  { frame: 50, x: 172, y: 440, click: true }, // click Sync
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

const WelcomeContent: React.FC<{ opacity: number }> = ({ opacity }) => (
  <div style={{ opacity }}>
    <div style={{ fontSize: 52, fontWeight: 800, color: '#d4af37', marginBottom: 10, letterSpacing: '-0.01em' }}>
      Case Nexus
    </div>
    <div style={{ fontSize: 16, color: '#9295ad', fontWeight: 300, letterSpacing: '0.5px' }}>
      AI-Powered Legal Caseload Intelligence
    </div>
  </div>
);

const SyncingContent: React.FC<{ frame: number; clickFrame: number; casesLoaded: number }> = ({ frame, clickFrame, casesLoaded }) => (
  <div style={{ opacity: fade(frame, clickFrame, 20) }}>
    <div style={{ fontSize: 120, fontWeight: 900, fontFamily: "'JetBrains Mono', monospace", color: '#d4af37', lineHeight: 1 }}>
      {casesLoaded}
    </div>
    <div style={{ fontSize: 24, color: '#9295ad', marginTop: 8 }}>
      cases synced from court system
    </div>

    {/* Category breakdown */}
    {casesLoaded >= 100 && (
      <div style={{ display: 'flex', gap: 32, marginTop: 40, opacity: fade(frame, clickFrame + 90, 30) }}>
        <StatBox label="Felonies" count={Math.round(casesLoaded * 0.334)} color="#e5484d" />
        <StatBox label="Misdemeanors" count={Math.round(casesLoaded * 0.476)} color="#3e63dd" />
        <StatBox label="Drug Offenses" count={Math.round(casesLoaded * 0.134)} color="#8e4ec6" />
        <StatBox label="Traffic/DUI" count={Math.round(casesLoaded * 0.056)} color="#30a46c" />
      </div>
    )}

    {/* Legal corpus badge */}
    {casesLoaded >= 450 && (
      <div style={{ marginTop: 40, display: 'flex', gap: 20, opacity: fade(frame, clickFrame + 200, 30) }}>
        <CorpusBadge icon="⚖️" value="73" label="GA Statutes" />
        <CorpusBadge icon="📜" value="8,969" label="USC Sections" />
        <CorpusBadge icon="🛑" value="8" label="Amendments" />
        <CorpusBadge icon="📚" value="35" label="Case Law" />
      </div>
    )}
  </div>
);

const StatBox: React.FC<{ label: string; count: number; color: string }> = ({ label, count, color }) => (
  <div style={{ textAlign: 'center' }}>
    <div style={{ fontSize: 36, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color }}>{count}</div>
    <div style={{ fontSize: 14, color: '#585a72', marginTop: 4 }}>{label}</div>
  </div>
);

const CorpusBadge: React.FC<{ icon: string; value: string; label: string }> = ({ icon, value, label }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '12px 20px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', background: '#0c0e15', minWidth: 110 }}>
    <span style={{ fontSize: 18 }}>{icon}</span>
    <span style={{ fontSize: 24, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: '#d4af37' }}>{value}</span>
    <span style={{ fontSize: 11, color: '#585a72', fontFamily: "'JetBrains Mono', monospace" }}>{label}</span>
  </div>
);
