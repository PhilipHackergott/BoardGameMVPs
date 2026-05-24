import type { ReactNode } from 'react';
import { useGame } from '../state/store';
import { page } from './kit';
import { MainMenu } from './MainMenu';
import { DraftScreen } from './DraftScreen';
import { RevealScreen } from './RevealScreen';
import { RaceView } from './RaceView';
import { EndScreen } from './EndScreen';
import { TransitionLayer } from './TransitionLayer';

export function App() {
  const match = useGame((s) => s.match);

  let screen: ReactNode = <MainMenu />;
  if (match) {
    switch (match.phase) {
      case 'draft':
        screen = <DraftScreen />;
        break;
      case 'reveal':
        screen = <RevealScreen />;
        break;
      case 'race':
      case 'afterRace':
        screen = <RaceView />;
        break;
      case 'ended':
        screen = <EndScreen />;
        break;
    }
  }

  return (
    <div style={page}>
      {screen}
      <TransitionLayer />
    </div>
  );
}
