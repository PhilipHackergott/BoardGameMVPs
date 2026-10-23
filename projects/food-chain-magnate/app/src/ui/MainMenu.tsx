import { useState } from 'react';
import { useGame } from '../state/store';
import { SettingsModal, HistoryModal } from './Modals';

export function MainMenu() {
  const { toSetup, hasSave, continueGame, toCampaign } = useGame();
  const [modal, setModal] = useState<'settings' | 'history' | null>(null);
  const canContinue = hasSave();

  return (
    <div className="menu-screen">
      <div className="marquee" style={{ textAlign: 'center' }}>
        <span className="est">★ EST. 1955 ★</span>
        <h1 className="logo">
          Food <span className="a">Chain</span> Magnate
        </h1>
        <div className="display" style={{ letterSpacing: 4, color: 'var(--turquoise)' }}>
          A FAST-FOOD EMPIRE BUILDER
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 330, margin: '28px auto 0' }}>
          {canContinue && (
            <button className="btn mustard" data-testid="continue" onClick={continueGame} style={{ fontSize: '1.2rem', padding: 12 }}>
              CONTINUE
            </button>
          )}
          <button className="btn primary" data-testid="new-game" onClick={toSetup} style={{ fontSize: '1.3rem', padding: 14 }}>
            NEW GAME
          </button>
          <button className="btn mustard" data-testid="campaign" onClick={toCampaign}>CAMPAIGN — RISE OF A FAST-FOOD EMPIRE</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" style={{ flex: 1 }} onClick={() => setModal('settings')}>⚙ Settings</button>
            <button className="btn" style={{ flex: 1 }} data-testid="history" onClick={() => setModal('history')}>📜 Past Games</button>
          </div>
        </div>
        <p className="muted" style={{ color: '#cfe', opacity: 0.7, marginTop: 24, fontSize: '0.72rem' }}>
          Unpublished, non-distributed personal prototype · do not distribute
        </p>
      </div>
      {modal === 'settings' && <SettingsModal onClose={() => setModal(null)} />}
      {modal === 'history' && <HistoryModal onClose={() => setModal(null)} />}
    </div>
  );
}
