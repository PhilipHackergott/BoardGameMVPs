import { useGame } from '../state/store';
import { MainMenu } from './MainMenu';
import { NewGameSetup } from './NewGameSetup';
import { GameShell } from './GameShell';
import { EndScreen } from './EndScreen';
import { CampaignHub, ScenarioDebrief } from './Campaign';

export function App() {
  const screen = useGame((s) => s.screen);
  if (screen === 'menu') return <MainMenu />;
  if (screen === 'setup') return <NewGameSetup />;
  if (screen === 'campaign') return <CampaignHub />;
  if (screen === 'debrief') return <ScenarioDebrief />;
  if (screen === 'end') return <EndScreen />;
  return <GameShell />;
}
