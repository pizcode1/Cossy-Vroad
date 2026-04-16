import type { CharacterDefinition } from '../game/config';

export class UIManager {
  readonly root: HTMLDivElement;
  readonly scoreEl: HTMLDivElement;
  readonly warningEl: HTMLDivElement;
  readonly overlay: HTMLDivElement;
  readonly titleEl: HTMLHeadingElement;
  readonly subtitleEl: HTMLParagraphElement;
  readonly startBtn: HTMLButtonElement;
  readonly restartBtn: HTMLButtonElement;
  readonly charsRow: HTMLDivElement;

  onStart: (() => void) | null = null;
  onRestart: (() => void) | null = null;
  onCharacterChange: ((id: string) => void) | null = null;

  constructor(parent: HTMLElement, characters: CharacterDefinition[]) {
    this.root = document.createElement('div');
    this.root.className = 'hud';

    this.scoreEl = document.createElement('div');
    this.scoreEl.className = 'score';
    this.scoreEl.textContent = '0';

    this.warningEl = document.createElement('div');
    this.warningEl.className = 'rear-warning';
    this.warningEl.textContent = 'MOVE FORWARD!';

    this.overlay = document.createElement('div');
    this.overlay.className = 'overlay';

    this.titleEl = document.createElement('h1');
    this.titleEl.textContent = 'Cossy Vroad';

    this.subtitleEl = document.createElement('p');
    this.subtitleEl.textContent = 'Hop forward, dodge hazards, survive forever.';

    this.startBtn = document.createElement('button');
    this.startBtn.textContent = 'Start Run';
    this.startBtn.onclick = () => this.onStart?.();

    this.restartBtn = document.createElement('button');
    this.restartBtn.textContent = 'Restart';
    this.restartBtn.className = 'secondary';
    this.restartBtn.onclick = () => this.onRestart?.();

    this.charsRow = document.createElement('div');
    this.charsRow.className = 'btn-row';

    for (const char of characters) {
      const btn = document.createElement('button');
      btn.textContent = char.name;
      btn.className = 'secondary';
      btn.onclick = () => this.onCharacterChange?.(char.id);
      this.charsRow.append(btn);
    }

    const actions = document.createElement('div');
    actions.className = 'btn-row';
    actions.append(this.startBtn, this.restartBtn);

    this.overlay.append(this.titleEl, this.subtitleEl, this.charsRow, actions);
    this.root.append(this.scoreEl, this.warningEl, this.overlay);
    parent.append(this.root);
  }

  setScore(score: number): void {
    this.scoreEl.textContent = `${score}`;
  }

  setWarning(visible: boolean): void {
    this.warningEl.classList.toggle('visible', visible);
  }

  showStart(): void {
    this.overlay.classList.remove('hidden');
    this.titleEl.textContent = 'Cossy Vroad';
    this.subtitleEl.textContent = 'Tap / Arrows / WASD to move. Stay ahead of the screen push.';
    this.startBtn.style.display = '';
    this.restartBtn.style.display = 'none';
  }

  showDead(score: number): void {
    this.overlay.classList.remove('hidden');
    this.titleEl.textContent = 'You Died';
    this.subtitleEl.textContent = `Final Score: ${score}`;
    this.startBtn.style.display = 'none';
    this.restartBtn.style.display = '';
  }

  hideOverlay(): void {
    this.overlay.classList.add('hidden');
  }
}
