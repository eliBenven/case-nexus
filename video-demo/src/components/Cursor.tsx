/**
 * Animated cursor component for synthetic screen recordings.
 *
 * Usage:
 *   <Cursor waypoints={[
 *     { frame: 0,   x: 960, y: 540 },         // start center
 *     { frame: 30,  x: 400, y: 120 },         // move to button
 *     { frame: 45,  x: 400, y: 120, click: true }, // click
 *     { frame: 90,  x: 700, y: 500 },         // move elsewhere
 *   ]} />
 */

import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { COLORS } from '../config';

export interface CursorWaypoint {
  frame: number;
  x: number;
  y: number;
  click?: boolean;
  hidden?: boolean;
}

interface CursorProps {
  waypoints: CursorWaypoint[];
  /** Delay frames before the cursor first appears */
  appearAt?: number;
}

export const Cursor: React.FC<CursorProps> = ({ waypoints, appearAt = 0 }) => {
  const f = useCurrentFrame();

  if (waypoints.length === 0 || f < appearAt) return null;

  // Find the two waypoints we're between
  let prevWp = waypoints[0];
  let nextWp = waypoints[0];
  for (let i = 0; i < waypoints.length; i++) {
    if (waypoints[i].frame <= f) {
      prevWp = waypoints[i];
      nextWp = waypoints[i + 1] ?? waypoints[i];
    }
  }

  // Interpolate position with ease-in-out
  // Guard: if both waypoints share the same frame, skip interpolation
  const sameFrame = prevWp.frame === nextWp.frame;
  const x = sameFrame
    ? nextWp.x
    : interpolate(f, [prevWp.frame, nextWp.frame], [prevWp.x, nextWp.x], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: Easing.inOut(Easing.cubic),
      });
  const y = sameFrame
    ? nextWp.y
    : interpolate(f, [prevWp.frame, nextWp.frame], [prevWp.y, nextWp.y], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: Easing.inOut(Easing.cubic),
      });

  // Check if we're at a click waypoint (within 8 frames of a click)
  const clickWp = waypoints.find(
    (wp) => wp.click && Math.abs(f - wp.frame) < 12,
  );
  const isClicking = !!clickWp;
  const clickProgress = clickWp
    ? interpolate(f, [clickWp.frame, clickWp.frame + 12], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 0;

  // Click ring expansion
  const ringScale = clickProgress;
  const ringOpacity = interpolate(clickProgress, [0, 0.3, 1], [0, 0.6, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Cursor press effect: slight scale down on click
  const cursorScale = isClicking
    ? interpolate(
        f,
        [clickWp!.frame - 3, clickWp!.frame, clickWp!.frame + 6],
        [1, 0.85, 1],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
      )
    : 1;

  // Check if hidden
  const isHidden = waypoints.find(
    (wp) => wp.hidden && wp.frame <= f,
  );
  const isShown = waypoints.find(
    (wp) => !wp.hidden && wp.frame <= f && wp.frame > (isHidden?.frame ?? -1),
  );
  if (isHidden && !isShown) return null;

  // Appear animation
  const opacity = interpolate(f, [appearAt, appearAt + 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // The SVG cursor tip is at (2, 2) within its viewBox.
  // Offset the container so the tip lands exactly at (x, y).
  const TIP_X = 2;
  const TIP_Y = 2;

  return (
    <div
      style={{
        position: 'absolute',
        left: x - TIP_X,
        top: y - TIP_Y,
        zIndex: 9999,
        pointerEvents: 'none',
        opacity,
      }}
    >
      {/* Click ring — centered on cursor tip */}
      {isClicking && (
        <div
          style={{
            position: 'absolute',
            left: TIP_X - 20,
            top: TIP_Y - 20,
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: `2px solid ${COLORS.gold}`,
            transform: `scale(${1 + ringScale * 1.5})`,
            opacity: ringOpacity,
          }}
        />
      )}

      {/* Cursor SVG — macOS-style pointer */}
      <svg
        width="24"
        height="28"
        viewBox="0 0 24 28"
        style={{
          transform: `scale(${cursorScale})`,
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
          transformOrigin: `${TIP_X}px ${TIP_Y}px`,
        }}
      >
        <path
          d="M 2 2 L 2 22 L 7.5 17 L 12.5 26 L 15.5 24.5 L 10.5 15.5 L 17 14.5 L 2 2 Z"
          fill="white"
          stroke="#222"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  );
};
