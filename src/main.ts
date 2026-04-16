import './style.css';
import { GameManager } from './game/GameManager';

const app = document.getElementById('app');
if (!app) {
  throw new Error('Missing #app root');
}

new GameManager(app);
