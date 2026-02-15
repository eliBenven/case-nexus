import React from 'react';
import { Composition } from 'remotion';
import { DemoVideo } from './DemoVideo';
import { TOTAL_DURATION_FRAMES, FPS, WIDTH, HEIGHT } from './config';

export const Root: React.FC = () => {
  return (
    <Composition
      id="DemoVideo"
      component={DemoVideo}
      durationInFrames={TOTAL_DURATION_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  );
};
