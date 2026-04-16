import * as THREE from 'three';
import { AudioManager } from '../core/AudioManager';
import { clamp } from '../core/utils';
import { UIManager } from '../ui/UIManager';
import { ChunkManager } from './ChunkManager';
import { CHARACTERS, LANE_WIDTH, REAR_PUSH_BASE } from './config';
import { ObstacleSpawner } from './ObstacleSpawner';
import { PlayerController } from './PlayerController';
export class GameManager {
    root;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 150);
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    clock = new THREE.Clock();
    chunkManager;
    obstacleSpawner;
    player;
    ui;
    audio = new AudioManager();
    state = 'start';
    activeCharacter = CHARACTERS[0];
    score = 0;
    maxRowReached = 0;
    difficulty = 1;
    deathReason = null;
    rearLine = -5;
    trainWarningTimer = 0;
    lastTouch = null;
    constructor(root) {
        this.root = root;
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
    registerInput() {
        window.addEventListener('keydown', (e) => {
            if (this.state !== 'playing')
                return;
            if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w')
                this.move(0, 1);
            if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a')
                this.move(-1, 0);
            if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd')
                this.move(1, 0);
            if ((e.key === 'ArrowDown' || e.key.toLowerCase() === 's') && this.activeCharacter.canMoveBack)
                this.move(0, -1);
        });
        const canvas = this.renderer.domElement;
        canvas.addEventListener('pointerdown', (event) => {
            this.lastTouch = { x: event.clientX, y: event.clientY };
        });
        canvas.addEventListener('pointerup', (event) => {
            if (this.state !== 'playing' || !this.lastTouch)
                return;
            const dx = event.clientX - this.lastTouch.x;
            const dy = event.clientY - this.lastTouch.y;
            const absX = Math.abs(dx);
            const absY = Math.abs(dy);
            if (absX < 12 && absY < 12) {
                this.move(0, 1);
            }
            else if (absX > absY) {
                this.move(dx > 0 ? 1 : -1, 0);
            }
            else if (dy < 0) {
                this.move(0, 1);
            }
            else if (this.activeCharacter.canMoveBack) {
                this.move(0, -1);
            }
            this.lastTouch = null;
        });
    }
    move(dx, dz) {
        this.player.enqueueMove(dx, dz);
        this.audio.playHop(this.activeCharacter.hopSoundHz);
    }
    resetWorld() {
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
    startRun() {
        this.state = 'playing';
        this.ui.hideOverlay();
        this.resetWorld();
    }
    die(reason) {
        if (this.state !== 'playing')
            return;
        this.state = 'dead';
        this.deathReason = reason;
        if (reason === 'water')
            this.audio.playSplash();
        else
            this.audio.playCrash();
        this.ui.showDead(this.score);
    }
    update(delta) {
        if (this.state !== 'playing')
            return;
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
    handleCollisions() {
        const pos = this.player.getPosition();
        const row = this.chunkManager.rows.get(Math.round(pos.z));
        if (!row)
            return;
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
                if (hazard.type !== 'log')
                    return false;
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
                this.player.group.position.x = clamp(this.player.group.position.x + carryingLog.direction * carryingLog.speed * (1 / 60), -Math.floor(LANE_WIDTH / 2), Math.floor(LANE_WIDTH / 2));
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
    placeCamera(snap = false) {
        const target = this.player.getPosition();
        const desired = new THREE.Vector3(target.x + 8, 13, target.z - 9);
        if (snap) {
            this.camera.position.copy(desired);
        }
        else {
            this.camera.position.lerp(desired, 0.08);
        }
        this.camera.lookAt(target.x, 0, target.z + 3);
    }
    updateBiomeBackground() {
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
    onResize = () => {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    };
    loop = () => {
        const delta = Math.min(this.clock.getDelta(), 0.033);
        this.update(delta);
        this.renderer.render(this.scene, this.camera);
        requestAnimationFrame(this.loop);
    };
}
//# sourceMappingURL=GameManager.js.map