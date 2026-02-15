import React from 'react';
import { AbsoluteFill, useCurrentFrame, Img, staticFile } from 'remotion';
import { COLORS } from '../config';
import { fade, container } from '../styles';

export const TitleScene: React.FC = () => {
  const f = useCurrentFrame();

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
          opacity: fade(f, 0, 40, 0, 1),
        }}
      />

      {/* Subtle gold vignette glow at center */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse at 50% 40%, ${COLORS.gold}08 0%, transparent 60%)`,
          opacity: fade(f, 30, 50),
        }}
      />
    </AbsoluteFill>
  );
};
