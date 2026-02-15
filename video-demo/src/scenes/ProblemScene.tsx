import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { COLORS, FPS, FONTS } from '../config';
import { fade, slideUp, countUp, container, gridOverlay } from '../styles';

export const ProblemScene: React.FC = () => {
  const f = useCurrentFrame();

  const count = countUp(f, 10, 70, 0, 500);
  const textStart = 3 * FPS;
  const patternStart = 8 * FPS;
  const closingStart = 16 * FPS;

  return (
    <AbsoluteFill style={container}>
      <div style={{ ...gridOverlay, opacity: 0.5 }} />

      {/* Big counter */}
      <div
        style={{
          fontSize: 220,
          fontWeight: 900,
          fontFamily: FONTS.mono,
          color: COLORS.gold,
          opacity: fade(f, 5, 30),
          transform: `translateY(${slideUp(f, 5, 60, 40)}px)`,
          lineHeight: 1,
          textShadow: `0 0 60px ${COLORS.goldGlowStrong}`,
        }}
      >
        {count}
      </div>

      <div
        style={{
          fontSize: 40,
          fontWeight: 600,
          color: COLORS.text,
          opacity: fade(f, 30, 30),
          transform: `translateY(${slideUp(f, 30, 20, 30)}px)`,
          marginTop: 8,
        }}
      >
        active cases per public defender
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 280,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <div
          style={{
            fontSize: 28,
            color: COLORS.textSecondary,
            opacity: fade(f, textStart, 30),
            transform: `translateY(${slideUp(f, textStart, 20, 30)}px)`,
          }}
        >
          Walking into court with minutes to prepare
        </div>
        <div
          style={{
            fontSize: 28,
            color: COLORS.orange,
            opacity: fade(f, patternStart, 30),
            transform: `translateY(${slideUp(f, patternStart, 20, 30)}px)`,
            fontWeight: 600,
          }}
        >
          Unconstitutional patterns go unnoticed
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 120,
          fontSize: 42,
          fontWeight: 700,
          color: COLORS.gold,
          opacity: fade(f, closingStart, 30),
          transform: `translateY(${slideUp(f, closingStart, 30, 30)}px)`,
        }}
      >
        Case Nexus changes that.
      </div>

    </AbsoluteFill>
  );
};
