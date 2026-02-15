import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { COLORS, FPS, FONTS } from '../config';
import { fade, scaleIn, slideFromLeft, slowZoom, countUp, container } from '../styles';

const TOTAL_FRAMES = 22 * FPS;

export const ProblemScene: React.FC = () => {
  const f = useCurrentFrame();

  const count = countUp(f, 10, 70, 0, 500);
  const textStart = 3 * FPS;
  const patternStart = 8 * FPS;
  const closingStart = 16 * FPS;

  const zoom = slowZoom(f, TOTAL_FRAMES, 0.05);

  return (
    <AbsoluteFill style={container}>
      {/* Ken burns zoom wrapper */}
      <AbsoluteFill style={{
        transform: `scale(${zoom})`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}>

        {/* Big counter — scale in instead of slideUp */}
        <div
          style={{
            fontSize: 220,
            fontWeight: 900,
            fontFamily: FONTS.mono,
            color: COLORS.gold,
            opacity: fade(f, 5, 30),
            transform: `scale(${scaleIn(f, 5, 35, 0.8)})`,
            lineHeight: 1,
            textShadow: `0 0 60px ${COLORS.goldGlowStrong}`,
          }}
        >
          {count}
        </div>

        {/* Subtitle — hard cut, no animation */}
        <div
          style={{
            fontSize: 40,
            fontWeight: 600,
            color: COLORS.text,
            opacity: f >= 30 ? 1 : 0,
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
          {/* Slide from left */}
          <div
            style={{
              fontSize: 28,
              color: COLORS.textSecondary,
              opacity: fade(f, textStart, 25),
              transform: `translateX(${slideFromLeft(f, textStart, 60, 28)}px)`,
            }}
          >
            Walking into court with minutes to prepare
          </div>
          {/* Slide from left, slightly delayed */}
          <div
            style={{
              fontSize: 28,
              color: COLORS.orange,
              opacity: fade(f, patternStart, 25),
              transform: `translateX(${slideFromLeft(f, patternStart, 60, 28)}px)`,
              fontWeight: 600,
            }}
          >
            Unconstitutional patterns go unnoticed
          </div>
        </div>

        {/* Closing — scale in with pop */}
        <div
          style={{
            position: 'absolute',
            bottom: 120,
            fontSize: 42,
            fontWeight: 700,
            color: COLORS.gold,
            opacity: fade(f, closingStart, 20),
            transform: `scale(${scaleIn(f, closingStart, 22, 0.9)})`,
          }}
        >
          Case Nexus changes that.
        </div>

      </AbsoluteFill>
    </AbsoluteFill>
  );
};
