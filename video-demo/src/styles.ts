import { interpolate } from 'remotion';
import { COLORS, FONTS } from './config';

// ── Animation helpers ────────────────────────────────────────

export const fade = (
  frame: number,
  start: number,
  duration = 30,
  from = 0,
  to = 1,
) =>
  interpolate(frame, [start, start + duration], [from, to], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

export const slideUp = (
  frame: number,
  start: number,
  distance = 40,
  duration = 30,
) =>
  interpolate(frame, [start, start + duration], [distance, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

export const countUp = (
  frame: number,
  startFrame: number,
  duration: number,
  from: number,
  to: number,
) =>
  Math.round(
    interpolate(frame, [startFrame, startFrame + duration], [from, to], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
  );

export const fadeOut = (
  frame: number,
  totalFrames: number,
  fadeDuration = 24,
) =>
  fadeDuration <= 0
    ? 1
    : interpolate(
        frame,
        [totalFrames - fadeDuration, totalFrames],
        [1, 0],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
      );

/** Scale from smaller → 1.0 (pop-in feel, replaces uniform slideUp) */
export const scaleIn = (
  frame: number,
  start: number,
  duration = 25,
  from = 0.88,
) =>
  interpolate(frame, [start, start + duration], [from, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

/** Slide from the left (horizontal entrance) */
export const slideFromLeft = (
  frame: number,
  start: number,
  distance = 50,
  duration = 28,
) =>
  interpolate(frame, [start, start + duration], [-distance, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

/** Slow ken-burns zoom: 1.0 → 1.0+amount over the full scene */
export const slowZoom = (
  frame: number,
  totalFrames: number,
  amount = 0.04,
) =>
  1 + interpolate(frame, [0, totalFrames], [0, amount], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

// ── Shared visual styles ─────────────────────────────────────

export const container: React.CSSProperties = {
  backgroundColor: COLORS.bg,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: FONTS.sans,
};

export const monoFont = FONTS.mono;

export const gridOverlay: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  backgroundImage: `
    linear-gradient(rgba(30,41,59,0.12) 1px, transparent 1px),
    linear-gradient(90deg, rgba(30,41,59,0.12) 1px, transparent 1px)
  `,
  backgroundSize: '60px 60px',
};
