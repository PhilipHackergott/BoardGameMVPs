// Composition root — mounts the React app. Engine stays pure; this layer projects state to the DOM.
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import './styles.css';

const el = document.getElementById('root');
if (el) createRoot(el).render(<App />);
