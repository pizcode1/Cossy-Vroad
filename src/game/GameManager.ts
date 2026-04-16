import * as THREE from 'three';
import { AudioManager } from '../core/AudioManager';
import { clamp } from '../core/utils';
import { UIManager } from '../ui/UIManager';
import { ChunkManager } from './ChunkManager';
import { CHARACTERS, LANE_WIDTH, REAR_PUSH_BASE } from './config';
import { ObstacleSpawner } from './ObstacleSpawner';
import { PlayerController } from './PlayerController';
import type { GameState, DeathReason } from './types';

export class GameManager {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 150);
  private readonly renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  private readonly clock = new THREE.Clock();

  private readonly chunkManager: ChunkManager;
  private readonly obstacleSpawner: ObstacleSpawner;
  private readonly player: PlayerController;
  private readonly ui: UIManager;
  private readonly audio = new AudioManager();

  private state: GameState = 'start';
  private activeCharacter = CHARACTERS[0];
  private score = 0;
  private maxRowReached = 0;
  private difficulty = 1;
  private deathReason: DeathReason | null = null;
  private rearLine = -5;
  private trainWarningTimer = 0;

  private lastTouch: { x: number; y: number } | null = null;

  constructor(private readonly root: HTMLElement) {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0x88c7ff);
    root.append(this.renderer.domElement);

    this.scene.fog = new THREE.Fog(0x88c7ff, 12, 55);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x4a6b8f, 1.1);
    this.scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(7, 14, 5);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    dir.shadow.camera.left = -18;
    dir.shadow.camera.right = 18;
    dir.shadow.camera.top = 18;
    dir.shadow.camera.bottom = -18;
    this.scene.add(dir);

    this.chunkManager = new ChunkManager(this.scene);
    this.obstacleSpawner = new ObstacleSpawner(this.scene);
    this.player = new PlayerController(this.scene);
    this.ui = new UIManager(root, CHARACTERS);

    this.ui.onStart = () => {
      this.audio.unlock();
      this.startRun();
    };
    this.ui.onRestart = () => this.startRun();
    this.ui.onCharacterChange = (id) => {
      this.activeCharacter = this.chunkManager.getCharacterDefinition(id);
      if (this.state !== 'playing') {
        this.resetWorld();
      }
    };

    this.registerInput();
    this.resetWorld();
    this.ui.showStart();

    window.addEventListener('resize', this.onResize);
    this.loop();
  }

  private registerInput(): void {
    window.addEventListener('keydown', (e) => {
      if (this.state !== 'playing') return;
      if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') this.move(0, 1);
      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') this.move(-1, 0);
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') this.move(1, 0);
      if ((e.key === 'ArrowDown' || e.key.toLowerCase() === 's') && this.activeCharacter.canMoveBack) this.move(0, -1);
    });

    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', (event) => {
      this.lastTouch = { x: event.clientX, y: event.clientY };
    });
    canvas.addEventListener('pointerup', (event) => {
      if (this.state !== 'playing' || !this.lastTouch) return;
      const dx = event.clientX - this.lastTouch.x;
      const dy = event.clientY - this.lastTouch.y;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      if (absX < 12 && absY < 12) {
        this.move(0, 1);
      } else if (absX > absY) {
        this.move(dx > 0 ? 1 : -1, 0);
      } else if (dy < 0) {
        this.move(0, 1);
      } else if (this.activeCharacter.canMoveBack) {
        this.move(0, -1);
      }
      this.lastTouch = null;
    });
  }

  private move(dx: number, dz: number): void {
    this.player.enqueueMove(dx, dz);
    this.audio.playHop(this.activeCharacter.hopSoundHz);
  }

  private resetWorld(): void {
    this.score = 0;
    this.maxRowReached = 0;
    this.difficulty = 1;
    this.rearLine = -REAR_PUSH_BASE;
    this.deathReason = null;
    this.chunkManager.reset(this.activeCharacter);
    this.obstacleSpawner.reset();
    this.player.reset(this.activeCharacter);
    this.ui.setScore(0);
    this.updateBiomeBackground();
    this.placeCamera(true);
  }

  private startRun(): void {
    this.state = 'playing';
    this.ui.hideOverlay();
    this.resetWorld();
  }

  private die(reason: DeathReason): void {
    if (this.state !== 'playing') return;
    this.state = 'dead';
    this.deathReason = reason;
    if (reason === 'water') this.audio.playSplash();
    else this.audio.playCrash();
    this.ui.showDead(this.score);
  }

  private update(delta: number): void {
    if (this.state !== 'playing') return;

    const forward = this.player.update(delta, Math.floor(LANE_WIDTH / 2));
    if (forward) {
      this.maxRowReached = Math.max(this.maxRowReached, this.player.row);
      this.score = this.maxRowReached;
      this.ui.setScore(this.score);
    }

    this.difficulty = 1 + Math.floor(this.score / 12);
    this.rearLine += delta * (0.42 + this.difficulty * 0.02);
    this.ui.setWarning(this.player.row - this.rearLine < 3.3);

    if (this.player.row < this.rearLine) {
      this.die('rear');
      return;
    }

    this.chunkManager.ensureRows(this.player.row, this.difficulty, this.activeCharacter);
    this.obstacleSpawner.cleanupRows(this.player.row - 10);
    this.obstacleSpawner.update(delta, [...this.chunkManager.rows.values()], this.difficulty);

    this.handleCollisions();
    this.placeCamera();
  }

  private handleCollisions(): void {
    const pos = this.player.getPosition();
    const row = this.chunkManager.rows.get(Math.round(pos.z));
    if (!row) return;

    const hazards = this.obstacleSpawner.activeHazards().filter((h) => h.rowIndex === row.index);

    for (const hazard of hazards) {
      const halfLength = hazard.length * 0.5;
      const dx = Math.abs(hazard.mesh.position.x - pos.x);
      if (dx < halfLength + 0.35) {
        this.die(hazard.type === 'train' ? 'train' : 'vehicle');
        return;
      }
    }

    if (row.type === 'water') {
      const onLog = hazards.some((hazard) => {
        if (hazard.type !== 'log') return false;
        const halfLength = hazard.length * 0.5;
        const dx = Math.abs(hazard.mesh.position.x - pos.x);
        return dx < halfLength + 0.2;
      });

      if (!onLog) {
        this.die('water');
        return;
      }

      const carryingLog = hazards.find((hazard) => hazard.type === 'log' && Math.abs(hazard.mesh.position.x - pos.x) < hazard.length * 0.5 + 0.2);
      if (carryingLog) {
        this.player.group.position.x = clamp(
          this.player.group.position.x + carryingLog.direction * carryingLog.speed * (1 / 60),
          -Math.floor(LANE_WIDTH / 2),
          Math.floor(LANE_WIDTH / 2),
        );
      }
    }

    if (row.type === 'rail') {
      const train = hazards.find((h) => h.type === 'train');
      if (train && Math.abs(train.mesh.position.x - pos.x) < 4.5) {
        this.trainWarningTimer = 0.2;
        this.audio.playTrainWarning();
      }
    }

    this.trainWarningTimer = Math.max(0, this.trainWarningTimer - 1 / 60);
  }

  private placeCamera(snap = false): void {
    const target = this.player.getPosition();
    const desired = new THREE.Vector3(target.x + 8, 13, target.z - 9);

    if (snap) {
      this.camera.position.copy(desired);
    } else {
      this.camera.position.lerp(desired, 0.08);
    }

    this.camera.lookAt(target.x, 0, target.z + 3);
  }

  private updateBiomeBackground(): void {
    if (this.activeCharacter.biome === 'default') {
      this.renderer.setClearColor(0x88c7ff);
      this.scene.fog = new THREE.Fog(0x88c7ff, 12, 55);
    }
    if (this.activeCharacter.biome === 'snow') {
      this.renderer.setClearColor(0xc9e8ff);
      this.scene.fog = new THREE.Fog(0xc9e8ff, 12, 58);
    }
    if (this.activeCharacter.biome === 'scifi') {
      this.renderer.setClearColor(0x382458);
      this.scene.fog = new THREE.Fog(0x382458, 12, 60);
    }
  }

  private readonly onResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  private loop = (): void => {
    const delta = Math.min(this.clock.getDelta(), 0.033);
    this.update(delta);
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.loop);
  };
}
