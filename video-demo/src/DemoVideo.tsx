import React from 'react';
import {
  AbsoluteFill,
  Sequence,
  Audio,
  staticFile,
  useCurrentFrame,
} from 'remotion';
import { getSceneFrames, FADE_OUT_SEC, FPS } from './config';
import { fadeOut } from './styles';
import { TitleScene } from './scenes/TitleScene';
import { ProblemScene } from './scenes/ProblemScene';
import { SyncScene } from './scenes/SyncScene';
import { HealthCheckScene } from './scenes/HealthCheckScene';
import { CascadeScene } from './scenes/CascadeScene';
import { AdversarialScene } from './scenes/AdversarialScene';
import { ClosingScene } from './scenes/ClosingScene';

// Map scene IDs → React components
const SCENE_COMPONENTS: Record<string, React.FC> = {
  title: TitleScene,
  problem: ProblemScene,
  sync: SyncScene,
  healthcheck: HealthCheckScene,
  cascade: CascadeScene,
  adversarial: AdversarialScene,
  closing: ClosingScene,
};

// Scenes that have narration audio files in public/audio/
const AUDIO_MAP: Record<string, string> = {
  problem: 'audio/problem.wav',
  sync: 'audio/sync.wav',
  healthcheck: 'audio/healthcheck.wav',
  cascade: 'audio/cascade.wav',
  adversarial: 'audio/adversarial.wav',
  closing: 'audio/closing.wav',
};

const FADE_OUT_FRAMES = Math.round(FADE_OUT_SEC * FPS);

// Wrapper that fades the scene to black at the end
const SceneFadeWrapper: React.FC<{
  durationFrames: number;
  children: React.ReactNode;
}> = ({ durationFrames, children }) => {
  const f = useCurrentFrame();
  const opacity = fadeOut(f, durationFrames, FADE_OUT_FRAMES);

  return (
    <AbsoluteFill style={{ opacity }}>
      {children}
    </AbsoluteFill>
  );
};

export const DemoVideo: React.FC = () => {
  const scenes = getSceneFrames();

  return (
    <AbsoluteFill style={{ backgroundColor: '#07080c' }}>
      {scenes.map((scene) => {
        const Component = SCENE_COMPONENTS[scene.id];
        if (!Component) return null;

        return (
          <Sequence
            key={scene.id}
            from={scene.startFrame}
            durationInFrames={scene.durationFrames}
            name={scene.title}
          >
            <SceneFadeWrapper durationFrames={scene.durationFrames}>
              <Component />
            </SceneFadeWrapper>
            {AUDIO_MAP[scene.id] && (
              <Audio src={staticFile(AUDIO_MAP[scene.id])} volume={1} />
            )}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
