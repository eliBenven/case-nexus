/**
 * FinaleScene — Big mission statement + branding to close it out.
 * Everything bigger, centered, breathing room.
 */

import React from 'react';
import { AbsoluteFill, useCurrentFrame, Img, staticFile } from 'remotion';
import { COLORS, FPS, FONTS } from '../config';
import { fade, slideUp } from '../styles';

export const FinaleScene: React.FC = () => {
  const f = useCurrentFrame();

  const missionStart = 1 * FPS;

  return (
    <AbsoluteFill
      style={{
        background: COLORS.bg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: FONTS.sans,
      }}
    >
      {/* Subtle gold glow behind text */}
      <div
        style={{
          position: 'absolute',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${COLORS.goldGlowStrong} 0%, transparent 70%)`,
          opacity: 0.4,
          filter: 'blur(80px)',
        }}
      />

      {/* Mission statement — BIG */}
      <div
        style={{
          textAlign: 'center',
          maxWidth: 1100,
          opacity: fade(f, missionStart, 35),
          transform: `translateY(${slideUp(f, missionStart, 30, 35)}px)`,
          marginBottom: 80,
        }}
      >
        <div
          style={{
            fontSize: 48,
            fontWeight: 500,
            color: COLORS.text,
            lineHeight: 1.5,
            fontStyle: 'italic',
          }}
        >
          Making sure no public defender's client
          <br />
          falls through the cracks.
        </div>
      </div>

      {/* CASE NEXUS — big gold */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: COLORS.gold,
            letterSpacing: '0.08em',
            textShadow: `0 0 60px ${COLORS.goldGlowStrong}, 0 0 120px ${COLORS.goldGlow}`,
          }}
        >
          CASE NEXUS
        </div>
        <div
          style={{
            fontSize: 18,
            fontFamily: FONTS.mono,
            color: COLORS.textMuted,
            letterSpacing: '0.04em',
          }}
        >
          github.com/eliBenven/case-nexus
        </div>
      </div>

      {/* Author info */}
      <div
        style={{
          position: 'absolute',
          bottom: 80,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <Img
          src={staticFile('icon.png')}
          style={{ width: 28, height: 28, borderRadius: 6 }}
        />
        <span
          style={{
            fontSize: 18,
            color: COLORS.textSecondary,
            fontWeight: 500,
          }}
        >
          Eli Benveniste &middot; VenTech
        </span>
      </div>
    </AbsoluteFill>
  );
};
