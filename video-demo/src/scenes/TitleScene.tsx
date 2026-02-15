import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { COLORS, FONTS } from '../config';
import { container } from '../styles';

export const TitleScene: React.FC = () => {
  return (
    <AbsoluteFill style={container}>
      {/* Full-bleed Gemini-generated title card image */}
      <Img
        src={staticFile('title-card.png')}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />

      {/* Darken center area so text reads clearly over image */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at 50% 45%, rgba(7,8,12,0.82) 0%, rgba(7,8,12,0.45) 55%, transparent 80%)',
        }}
      />

      {/* Text overlays */}
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: FONTS.sans,
        }}
      >
        {/* Main title */}
        <div
          style={{
            fontSize: 96,
            fontWeight: 800,
            color: COLORS.gold,
            letterSpacing: '0.06em',
            textShadow: `0 0 60px ${COLORS.goldGlowStrong}, 0 2px 4px rgba(0,0,0,0.6)`,
          }}
        >
          CASE NEXUS
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 32,
            fontWeight: 400,
            color: COLORS.textSecondary,
            marginTop: 16,
            letterSpacing: '0.04em',
          }}
        >
          AI-Powered Criminal Defense Intelligence
        </div>

        {/* Tech badge */}
        <div
          style={{
            fontSize: 16,
            fontFamily: FONTS.mono,
            color: COLORS.textMuted,
            marginTop: 28,
            letterSpacing: '0.15em',
            textTransform: 'uppercase' as const,
          }}
        >
          Built on Claude Opus 4.6
        </div>
      </AbsoluteFill>

      {/* Subtle gold vignette glow at center */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse at 50% 40%, ${COLORS.gold}08 0%, transparent 60%)`,
          pointerEvents: 'none' as const,
        }}
      />
    </AbsoluteFill>
  );
};
