import { useGame } from '../state/store';
import { TitleScreen } from './TitleScreen';
import { GameScreen } from './GameScreen';
import { EndScreen } from './EndScreen';
import { HandoffOverlay } from './HandoffOverlay';

export function App() {
  const screen = useGame((s) => s.screen);
  return (
    <>
      {screen === 'title' && <TitleScreen />}
      {(screen === 'game' || screen === 'end') && <GameScreen />}
      {screen === 'end' && <EndScreen />}
      <HandoffOverlay />
    </>
  );
}
