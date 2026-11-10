/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Volume2, VolumeX, Trophy, RotateCcw, Zap, Globe, Sparkles, Heart, ChevronLeft, ChevronRight } from 'lucide-react';

// --- Types & Constants ---
type GameState = 'START' | 'PLAYING' | 'GAMEOVER';
type Language = 'en' | 'tr';
export type BirdSkin = 'classic' | 'red_hawk' | 'shadow_crow' | 'golden_falcon' | 'cyber_bird';

export interface BirdVariantInfo {
  id: BirdSkin;
  name: { en: string; tr: string };
  desc: { en: string; tr: string };
  bodyColor: string;
  outlineColor: string;
  bellyColor: string;
  wingColor: string;
  beakColor: string;
  eyeColor: string;
  pupilColor: string;
  cheekColor: string;
  poopColor: string;
  splatColor: string;
}

export const BIRD_VARIANTS: Record<BirdSkin, BirdVariantInfo> = {
  classic: {
    id: 'classic',
    name: { en: 'CLASSIC BIRD', tr: 'KLASİK KUŞ' },
    desc: { en: 'The timeless yellow legend', tr: 'Efsanevi sarı kuş' },
    bodyColor: '#f9d226',
    outlineColor: '#4a2800',
    bellyColor: '#fff4a3',
    wingColor: '#ffffff',
    beakColor: '#f85e2b',
    eyeColor: '#ffffff',
    pupilColor: '#0a0a0a',
    cheekColor: 'rgba(255, 95, 87, 0.4)',
    poopColor: '#78350f',
    splatColor: '#92400e',
  },
  red_hawk: {
    id: 'red_hawk',
    name: { en: 'PHOENIX HAWK', tr: 'ANKA ŞAHİN' },
    desc: { en: 'Fierce crimson flame bird', tr: 'Kızıl alevli yırtıcı' },
    bodyColor: '#ef4444',
    outlineColor: '#450a0a',
    bellyColor: '#fca5a5',
    wingColor: '#f97316',
    beakColor: '#fbbf24',
    eyeColor: '#fef08a',
    pupilColor: '#7f1d1d',
    cheekColor: 'rgba(239, 68, 68, 0.6)',
    poopColor: '#991b1b',
    splatColor: '#dc2626',
  },
  shadow_crow: {
    id: 'shadow_crow',
    name: { en: 'SHADOW RAVEN', tr: 'GÖLGE KUZGUN' },
    desc: { en: 'Mystic midnight stalker', tr: 'Gizemli gece avcısı' },
    bodyColor: '#312e81',
    outlineColor: '#0f172a',
    bellyColor: '#c084fc',
    wingColor: '#6366f1',
    beakColor: '#38bdf8',
    eyeColor: '#a5f3fc',
    pupilColor: '#0891b2',
    cheekColor: 'rgba(168, 85, 247, 0.4)',
    poopColor: '#581c87',
    splatColor: '#7e22ce',
  },
  golden_falcon: {
    id: 'golden_falcon',
    name: { en: 'ROYAL GOLD', tr: 'ALTIN DOĞAN' },
    desc: { en: 'Gilded with royal crown jewels', tr: 'Saf altın tüylü kraliyet kuşu' },
    bodyColor: '#f59e0b',
    outlineColor: '#78350f',
    bellyColor: '#fef08a',
    wingColor: '#fbbf24',
    beakColor: '#d97706',
    eyeColor: '#ffffff',
    pupilColor: '#1e3a8a',
    cheekColor: 'rgba(245, 158, 11, 0.5)',
    poopColor: '#d97706',
    splatColor: '#f59e0b',
  },
  cyber_bird: {
    id: 'cyber_bird',
    name: { en: 'CYBER MECH', tr: 'SİBER MEKA' },
    desc: { en: 'Neon laser cybernetic avian', tr: 'Neon lazerli sibernetik kuş' },
    bodyColor: '#06b6d4',
    outlineColor: '#083344',
    bellyColor: '#a5f3fc',
    wingColor: '#ec4899',
    beakColor: '#10b981',
    eyeColor: '#f43f5e',
    pupilColor: '#ffffff',
    cheekColor: 'rgba(236, 72, 153, 0.5)',
    poopColor: '#0891b2',
    splatColor: '#06b6d4',
  },
};

const BIRD_SKIN_KEYS: BirdSkin[] = ['classic', 'red_hawk', 'shadow_crow', 'golden_falcon', 'cyber_bird'];

interface Pipe {
  x: number;
  topHeight: number;
  bottomY: number;
  passed: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
}

interface ScorePopup {
  x: number;
  y: number;
  text: string;
  color?: string;
  alpha: number;
  vy: number;
  life: number;
}

interface Soldier {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  walkTimer: number;
  throwCooldown: number;
  windupTimer: number; // >0 means arm raised, about to shoot
  hasSpottedBird: boolean; // triggers immediate shot when bird comes into view
  isAlive: boolean;
  knockbackVx: number;
  knockbackVy: number;
  rotation: number;
  alpha: number;
}

interface Rock {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  size: number;
  active: boolean;
  power: number;
}

interface Poop {
  x: number;
  y: number;
  vx: number;
  vy: number;
  active: boolean;
  color: string;
}

interface GroundSplat {
  x: number;
  y: number;
  color: string;
  width: number;
  alpha: number;
}

// Translations dictionary
const translations = {
  en: {
    title: 'FLAPPY BIRD',
    subtitle: 'RETRO ARCADE',
    getReady: 'GET READY!',
    tapToFly: 'SPACE / TAP TO JUMP',
    poopHelp: 'SHIFT OR 💩 TO POOP ON SOLDIERS',
    score: 'SCORE',
    highScore: 'BEST',
    speed: 'SPEED',
    gameOver: 'GAME OVER',
    playAgain: 'PLAY AGAIN',
    newBest: 'NEW RECORD!',
    speedUp: 'SPEED UP! +20%',
    soldierWarning: 'SOLDIERS INCOMING! DODGE ROCKS!',
    medal: 'MEDAL',
    bronze: 'BRONZE',
    silver: 'SILVER',
    gold: 'GOLD',
    platinum: 'PLATINUM',
    pointsInfo: '+10 PTS PER PIPE • SOLDIERS AT 40+ PTS',
    controlsInfo: 'Jump: Space / Click • Poop: Shift / 💩 Button',
    skinSelect: 'SELECT BIRD SKIN',
    poopBtn: 'POOP',
    lives: 'LIVES',
  },
  tr: {
    title: 'FLAPPY BİRD',
    subtitle: 'RETRO ATARİ',
    getReady: 'HAZIR OL!',
    tapToFly: 'ZIPLAMAK İÇİN BOŞLUK / DOKUN',
    poopHelp: 'ASKERLERİN KAFASINA PİSLEMEK İÇİN SHIFT YA DA 💩',
    score: 'SKOR',
    highScore: 'EN İYİ',
    speed: 'HIZ',
    gameOver: 'OYUN BİTTİ',
    playAgain: 'YENİDEN OYNA',
    newBest: 'YENİ REKOR!',
    speedUp: 'HIZLANDI! +%20',
    soldierWarning: 'DİKKAT! ASKERLER TAŞ ATIYOR!',
    medal: 'MADALYA',
    bronze: 'BRONZ',
    silver: 'GÜMÜŞ',
    gold: 'ALTIN',
    platinum: 'PLATİN',
    pointsInfo: 'BORU BAŞINA +10 PUAN • 40 PUANDAN SONRA ASKERLER GELİR',
    controlsInfo: 'Zıpla: Boşluk / Tık • Pisle: Shift / 💩 Butonu',
    skinSelect: 'KUŞ GÖRÜNÜMÜ SEÇ',
    poopBtn: 'PİSLE',
    lives: 'CAN',
  },
};

// Static background assets for 0-allocation rendering
const STATIC_CLOUDS = [
  { x: 30, y: 70, s: 1 },
  { x: 190, y: 110, s: 0.8 },
  { x: 310, y: 55, s: 1.1 },
];

const STATIC_BUILDINGS = [
  { width: 45, height: 45 },
  { width: 50, height: 70 },
  { width: 42, height: 95 },
  { width: 48, height: 55 },
  { width: 45, height: 80 },
  { width: 52, height: 60 },
  { width: 40, height: 85 },
  { width: 46, height: 50 },
];

// High-performance Web Audio Synthesizer
class RetroAudio {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  playFlap() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(740, now + 0.08);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
    } catch {
      // AudioContext fallback
    }
  }

  playPoop() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.12);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.14);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
    } catch {
      // AudioContext fallback
    }
  }

  playSplat() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      // Squishy comic splat sound
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(50, now + 0.18);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
    } catch {
      // AudioContext fallback
    }
  }

  playRockThrow() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.08);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
    } catch {
      // AudioContext fallback
    }
  }

  playHurt() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.setValueAtTime(110, now + 0.08);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
    } catch {
      // AudioContext fallback
    }
  }

  playScore() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.07); // A5
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.24);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
    } catch {
      // AudioContext fallback
    }
  }

  playSpeedUp() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const now = this.ctx.currentTime + idx * 0.055;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
        osc.onended = () => {
          osc.disconnect();
          gain.disconnect();
        };
      });
    } catch {
      // AudioContext fallback
    }
  }

  playHit() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.14);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.16);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
    } catch {
      // AudioContext fallback
    }
  }

  playDie() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(380, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.35);
      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.38);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
    } catch {
      // AudioContext fallback
    }
  }
}

const audio = new RetroAudio();

export default function App() {
  // State variables for high level UI
  const [lang, setLang] = useState<Language>('tr');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [selectedSkin, setSelectedSkin] = useState<BirdSkin>('classic');
  const [gameState, setGameState] = useState<GameState>('START');
  const [finalScore, setFinalScore] = useState<number>(0);
  const [finalHighScore, setFinalHighScore] = useState<number>(0);
  const [finalSpeedMultiplier, setFinalSpeedMultiplier] = useState<number>(1);
  const [isNewRecord, setIsNewRecord] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Fast direct DOM refs for HUD
  const hudHighScoreRef = useRef<HTMLSpanElement | null>(null);
  const hudSpeedRef = useRef<HTMLSpanElement | null>(null);

  // Mutable Game World
  const worldRef = useRef({
    width: 360,
    height: 600,
    groundHeight: 80,
    groundOffset: 0,
    bgOffset: 0,
    // Bird state
    birdX: 75,
    birdY: 260,
    birdVelocity: 0,
    birdGravity: 0.38,
    birdJump: -6.8,
    birdRadius: 15,
    birdRotation: 0,
    wingFrame: 0,
    wingTimer: 0,
    lives: 3,
    maxLives: 3,
    invulnerableTimer: 0,
    poopCooldown: 0,
    // Pipe parameters (slower, well-paced classic tempo)
    pipes: [] as Pipe[],
    pipeSpawnTimer: 0,
    basePipeInterval: 88,
    pipeWidth: 58,
    pipeGap: 138,
    baseScrollSpeed: 2.2,
    // Soldiers & Combat
    soldiers: [] as Soldier[],
    soldierSpawnTimer: 0,
    rocks: [] as Rock[],
    poops: [] as Poop[],
    groundSplats: [] as GroundSplat[],
    nextSoldierId: 1,
    // Score & Speed
    score: 0,
    highScore: 0,
    speedMultiplier: 1,
    speedAlertTimer: 0,
    soldierWarningTimer: 0,
    hasShownSoldierWarning: false,
    // Visual FX
    particles: [] as Particle[],
    popups: [] as ScorePopup[],
    screenShake: 0,
    gameState: 'START' as GameState,
    skyGradient: null as CanvasGradient | null,
    lang: 'tr' as Language,
    skin: 'classic' as BirdSkin,
  });

  // Sync skin and language with worldRef
  useEffect(() => {
    worldRef.current.lang = lang;
  }, [lang]);

  useEffect(() => {
    worldRef.current.skin = selectedSkin;
    try {
      localStorage.setItem('flappy_selected_skin', selectedSkin);
    } catch {
      // ignore
    }
  }, [selectedSkin]);

  // Keep sound enabled state in sync
  useEffect(() => {
    audio.enabled = soundEnabled;
  }, [soundEnabled]);

  // Load saved highscore and skin
  useEffect(() => {
    const saved = localStorage.getItem('flappy_retro_highscore');
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed)) {
        worldRef.current.highScore = parsed;
        setFinalHighScore(parsed);
        if (hudHighScoreRef.current) {
          hudHighScoreRef.current.innerText = parsed.toString();
        }
      }
    }
    const savedSkin = localStorage.getItem('flappy_selected_skin') as BirdSkin;
    if (savedSkin && BIRD_VARIANTS[savedSkin]) {
      setSelectedSkin(savedSkin);
      worldRef.current.skin = savedSkin;
    }
  }, []);

  // Jump / Flap handler
  const performFlap = useCallback(() => {
    const world = worldRef.current;

    if (world.gameState === 'START') {
      world.gameState = 'PLAYING';
      setGameState('PLAYING');
      world.birdVelocity = world.birdJump;
      audio.playFlap();
      return;
    }

    if (world.gameState === 'PLAYING') {
      world.birdVelocity = world.birdJump;
      audio.playFlap();

      // Jump puff particles
      if (world.particles.length < 24) {
        for (let i = 0; i < 3; i++) {
          world.particles.push({
            x: world.birdX - 10,
            y: world.birdY + (Math.random() * 6 - 3),
            vx: -(Math.random() * 1.5 + 1),
            vy: Math.random() * 1.4 - 0.7,
            color: '#ffffff',
            size: Math.random() * 2.5 + 1.5,
            alpha: 0.75,
            life: 0,
            maxLife: 15,
          });
        }
      }
    }
  }, []);

  // Poop Shoot Handler ("Bird can shoot them with shift button and poop in their heads")
  const performPoop = useCallback(() => {
    const world = worldRef.current;
    if (world.gameState !== 'PLAYING') return;
    if (world.poopCooldown > 0) return;

    world.poopCooldown = 18; // ~0.3s cooldown
    const currentVariant = BIRD_VARIANTS[world.skin] || BIRD_VARIANTS.classic;

    // Poop drops directly down on the floor right underneath the bird!
    world.poops.push({
      x: world.birdX,
      y: world.birdY + 14,
      vx: 0,
      vy: 3.8,
      active: true,
      color: currentVariant.poopColor,
    });

    audio.playPoop();

    // Poop steam particle
    world.particles.push({
      x: world.birdX,
      y: world.birdY + 12,
      vx: 0,
      vy: -1.2,
      color: 'rgba(255, 255, 255, 0.65)',
      size: 2.5,
      alpha: 0.7,
      life: 0,
      maxLife: 14,
    });
  }, []);

  // Restart Game
  const restartGame = useCallback(() => {
    const world = worldRef.current;
    world.birdY = 260;
    world.birdVelocity = 0;
    world.birdRotation = 0;
    world.lives = 3;
    world.invulnerableTimer = 0;
    world.poopCooldown = 0;
    world.pipes.length = 0;
    world.soldiers.length = 0;
    world.rocks.length = 0;
    world.poops.length = 0;
    world.groundSplats.length = 0;
    world.particles.length = 0;
    world.popups.length = 0;
    world.pipeSpawnTimer = 45;
    world.soldierSpawnTimer = 0;
    world.screenShake = 0;
    world.score = 0;
    world.speedMultiplier = 1;
    world.speedAlertTimer = 0;
    world.soldierWarningTimer = 0;
    world.hasShownSoldierWarning = false;
    world.gameState = 'PLAYING';

    if (hudSpeedRef.current) {
      hudSpeedRef.current.innerText = '1.0x';
    }

    setIsNewRecord(false);
    setGameState('PLAYING');
    audio.playFlap();
  }, []);

  // Keyboard controls listener (Space = Flap, Shift = Poop)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        e.preventDefault();
        performPoop();
        return;
      }

      if (e.code === 'Space' || e.key === ' ' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (worldRef.current.gameState === 'GAMEOVER') {
          restartGame();
        } else {
          performFlap();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [performFlap, performPoop, restartGame]);

  // Skin Switchers
  const cycleSkin = (dir: 1 | -1) => {
    const currentIndex = BIRD_SKIN_KEYS.indexOf(selectedSkin);
    const nextIndex = (currentIndex + dir + BIRD_SKIN_KEYS.length) % BIRD_SKIN_KEYS.length;
    const nextSkin = BIRD_SKIN_KEYS[nextIndex];
    setSelectedSkin(nextSkin);
    worldRef.current.skin = nextSkin;
    audio.playFlap();
  };

  // Main Canvas Render & Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    const world = worldRef.current;

    // Pre-create the sky gradient once
    const skyGrad = ctx.createLinearGradient(0, 0, 0, world.height - world.groundHeight);
    skyGrad.addColorStop(0, '#4fc3f7');
    skyGrad.addColorStop(0.65, '#81d4fa');
    skyGrad.addColorStop(1, '#b3e5fc');
    world.skyGradient = skyGrad;

    let animationFrameId: number;
    let lastTime = performance.now();

    // Helper: draw retro pipe
    const drawPipe = (x: number, y: number, width: number, height: number, isTop: boolean) => {
      if (height <= 0) return;

      const lipHeight = 24;
      const lipExtension = 5;
      const darkBorder = '#1c3e07';
      const mainGreen = '#6cb726';
      const highlightGreen = '#a8e552';
      const shadowGreen = '#488c14';

      ctx.lineWidth = 2.5;

      if (isTop) {
        const stemHeight = Math.max(0, height - lipHeight);

        // Pipe stem
        ctx.fillStyle = mainGreen;
        ctx.fillRect(x, 0, width, stemHeight);

        ctx.fillStyle = highlightGreen;
        ctx.fillRect(x + 5, 0, 7, stemHeight);

        ctx.fillStyle = shadowGreen;
        ctx.fillRect(x + width - 11, 0, 8, stemHeight);

        ctx.strokeStyle = darkBorder;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, stemHeight);
        ctx.moveTo(x + width, 0);
        ctx.lineTo(x + width, stemHeight);
        ctx.stroke();

        // Lip cap
        const lipX = x - lipExtension;
        const lipY = stemHeight;
        const lipW = width + lipExtension * 2;

        ctx.fillStyle = mainGreen;
        ctx.fillRect(lipX, lipY, lipW, lipHeight);

        ctx.fillStyle = highlightGreen;
        ctx.fillRect(lipX + 5, lipY, 7, lipHeight);

        ctx.fillStyle = shadowGreen;
        ctx.fillRect(lipX + lipW - 12, lipY, 9, lipHeight);

        ctx.strokeStyle = darkBorder;
        ctx.strokeRect(lipX, lipY, lipW, lipHeight);
      } else {
        const lipX = x - lipExtension;
        const lipY = y;
        const lipW = width + lipExtension * 2;

        ctx.fillStyle = mainGreen;
        ctx.fillRect(lipX, lipY, lipW, lipHeight);

        ctx.fillStyle = highlightGreen;
        ctx.fillRect(lipX + 5, lipY, 7, lipHeight);

        ctx.fillStyle = shadowGreen;
        ctx.fillRect(lipX + lipW - 12, lipY, 9, lipHeight);

        ctx.strokeStyle = darkBorder;
        ctx.strokeRect(lipX, lipY, lipW, lipHeight);

        // Pipe stem
        const stemY = y + lipHeight;
        const stemHeight = height - lipHeight;
        if (stemHeight > 0) {
          ctx.fillStyle = mainGreen;
          ctx.fillRect(x, stemY, width, stemHeight);

          ctx.fillStyle = highlightGreen;
          ctx.fillRect(x + 5, stemY, 7, stemHeight);

          ctx.fillStyle = shadowGreen;
          ctx.fillRect(x + width - 11, stemY, 8, stemHeight);

          ctx.strokeStyle = darkBorder;
          ctx.beginPath();
          ctx.moveTo(x, stemY);
          ctx.lineTo(x, y + height);
          ctx.moveTo(x + width, stemY);
          ctx.lineTo(x + width, y + height);
          ctx.stroke();
        }
      }
    };

    // Helper: draw Bird with custom variant styling
    const drawBird = (x: number, y: number, rotation: number, frame: number, skinKey: BirdSkin, invulnerable: boolean) => {
      const skin = BIRD_VARIANTS[skinKey] || BIRD_VARIANTS.classic;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);

      // Flashing invulnerability effect
      if (invulnerable && Math.floor(Date.now() / 60) % 2 === 0) {
        ctx.globalAlpha = 0.45;
      }

      const r = 16;

      // Drop shadow
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath();
      ctx.ellipse(0, r + 4, r * 0.9, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Main body
      ctx.fillStyle = skin.bodyColor;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = skin.outlineColor;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Belly highlight
      ctx.fillStyle = skin.bellyColor;
      ctx.beginPath();
      ctx.arc(-2, 3, r * 0.65, 0, Math.PI * 2);
      ctx.fill();

      // Special variant headgear / crest details
      if (skinKey === 'golden_falcon') {
        // Royal Crown
        ctx.fillStyle = '#fbbf24';
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-6, -14);
        ctx.lineTo(-4, -20);
        ctx.lineTo(-1, -15);
        ctx.lineTo(2, -21);
        ctx.lineTo(5, -15);
        ctx.lineTo(8, -19);
        ctx.lineTo(6, -13);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Ruby gem in crown
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(1, -15, 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (skinKey === 'red_hawk') {
        // Flame feather crest
        ctx.fillStyle = '#f97316';
        ctx.strokeStyle = '#7f1d1d';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-4, -13);
        ctx.lineTo(-12, -22);
        ctx.lineTo(-2, -16);
        ctx.lineTo(4, -23);
        ctx.lineTo(5, -13);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (skinKey === 'cyber_bird') {
        // Cyber Antenna
        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-2, -15);
        ctx.lineTo(-5, -23);
        ctx.stroke();
        ctx.fillStyle = '#06b6d4';
        ctx.beginPath();
        ctx.arc(-5, -23, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Eye
      const eyeX = 6;
      const eyeY = -5;
      ctx.fillStyle = skin.eyeColor;
      ctx.beginPath();
      ctx.arc(eyeX, eyeY, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = skin.outlineColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Pupil
      ctx.fillStyle = skin.pupilColor;
      ctx.beginPath();
      ctx.arc(eyeX + 2, eyeY, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Eye glint
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(eyeX + 1.2, eyeY - 1.2, 1, 0, Math.PI * 2);
      ctx.fill();

      // Beak
      ctx.fillStyle = skin.beakColor;
      ctx.beginPath();
      ctx.moveTo(8, -1);
      ctx.lineTo(20, 2);
      ctx.lineTo(8, 7);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = skin.outlineColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Crease
      ctx.beginPath();
      ctx.moveTo(9, 2.5);
      ctx.lineTo(17, 2.5);
      ctx.stroke();

      // Wing
      ctx.fillStyle = skin.wingColor;
      ctx.strokeStyle = skin.outlineColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (frame === 0) {
        ctx.ellipse(-7, -4, 7, 5, -0.4, 0, Math.PI * 2);
      } else if (frame === 1) {
        ctx.ellipse(-8, 1, 8, 4.5, 0, 0, Math.PI * 2);
      } else {
        ctx.ellipse(-7, 5, 7, 5, 0.4, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.stroke();

      // Blush cheek
      ctx.fillStyle = skin.cheekColor;
      ctx.beginPath();
      ctx.arc(1, 4, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    // Helper: draw Soldier Enemy (Bigger, animated & clear retro details)
    const drawSoldier = (s: Soldier) => {
      ctx.save();
      ctx.translate(s.x, s.y);

      if (!s.isAlive) {
        ctx.rotate(s.rotation);
        ctx.globalAlpha = Math.max(0, s.alpha);
      }

      const sw = s.width; // 38
      const sh = s.height; // 52

      // Drop shadow
      ctx.fillStyle = 'rgba(0,0,0,0.24)';
      ctx.beginPath();
      ctx.ellipse(sw / 2, sh - 1, sw * 0.44, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Walking Leg Cycle: animated boots stepping
      const legSwing = s.isAlive ? Math.sin(s.walkTimer * 0.28) * 4.5 : 0;

      // Back leg & boot
      ctx.fillStyle = '#0f172a'; // dark military boots
      ctx.fillRect(sw * 0.18 - legSwing, sh - 11, 10, 11);
      ctx.fillStyle = '#365314'; // camo pants
      ctx.fillRect(sw * 0.18 - legSwing, sh - 22, 10, 12);

      // Front leg & boot
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(sw * 0.54 + legSwing, sh - 11, 10, 11);
      ctx.fillStyle = '#365314';
      ctx.fillRect(sw * 0.54 + legSwing, sh - 22, 10, 12);

      // Boot highlights
      ctx.fillStyle = '#475569';
      ctx.fillRect(sw * 0.18 - legSwing + 1, sh - 6, 8, 2);
      ctx.fillRect(sw * 0.54 + legSwing + 1, sh - 6, 8, 2);

      // Torso / Camouflage Jacket
      ctx.fillStyle = '#4d7c0f'; // army green jacket
      ctx.fillRect(5, 18, sw - 10, 17);
      ctx.strokeStyle = '#14532d';
      ctx.lineWidth = 2;
      ctx.strokeRect(5, 18, sw - 10, 17);

      // Camo spots on jacket
      ctx.fillStyle = '#365314';
      ctx.fillRect(8, 22, 7, 5);
      ctx.fillRect(sw - 16, 27, 7, 4);

      // Ammo cross-belt & golden buckle
      ctx.fillStyle = '#78350f';
      ctx.fillRect(6, 21, sw - 12, 4);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(sw / 2 - 3, 21, 6, 4);

      // Head & Face (Clear, prominent target zone for pooping!)
      ctx.fillStyle = '#fed7aa'; // clear warm skin tone
      ctx.fillRect(9, 6, 20, 15);
      ctx.strokeStyle = '#9a3412';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(9, 6, 20, 15);

      // Eyes & Expression
      if (s.isAlive) {
        // Angry focused warrior eyes
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(11, 11, 4, 3);
        ctx.fillRect(20, 11, 4, 3);

        // Angry slanting eyebrows
        ctx.fillStyle = '#7f1d1d';
        ctx.beginPath();
        ctx.moveTo(10, 10); ctx.lineTo(16, 12);
        ctx.moveTo(25, 10); ctx.lineTo(19, 12);
        ctx.stroke();

        // Determined grit mouth
        ctx.fillStyle = '#78350f';
        ctx.fillRect(14, 16, 7, 2);
      } else {
        // Comedic X_X knocked out eyes
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        // Left X
        ctx.beginPath();
        ctx.moveTo(11, 10); ctx.lineTo(15, 14);
        ctx.moveTo(15, 10); ctx.lineTo(11, 14);
        // Right X
        ctx.moveTo(20, 10); ctx.lineTo(24, 14);
        ctx.moveTo(24, 10); ctx.lineTo(20, 14);
        ctx.stroke();

        // O mouth
        ctx.fillStyle = '#7f1d1d';
        ctx.beginPath();
        ctx.arc(17, 17, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Military Helmet with steel rim & star insignia
      ctx.fillStyle = '#15803d'; // helmet dome
      ctx.beginPath();
      ctx.arc(19, 7, 13, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = '#052e16';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Helmet visor brim
      ctx.fillStyle = '#166534';
      ctx.fillRect(4, 5, 30, 4);
      ctx.strokeRect(4, 5, 30, 4);

      // Yellow Star insignia on helmet
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(19, 3, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Arms & Slingshot Animation
      if (s.isAlive) {
        if (s.windupTimer > 0) {
          // AIMING POSE: Arms raised forward drawing back slingshot aimed directly at bird!
          // Left arm holding wooden slingshot forward
          ctx.strokeStyle = '#78350f';
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.moveTo(sw - 10, 22);
          ctx.lineTo(sw + 4, 16);
          ctx.stroke();

          // Wooden Y-fork
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(sw + 4, 16); ctx.lineTo(sw + 9, 11);
          ctx.moveTo(sw + 4, 16); ctx.lineTo(sw + 9, 21);
          ctx.stroke();

          // Elastic rubber band stretched back
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(sw + 9, 11); ctx.lineTo(sw - 6, 17);
          ctx.moveTo(sw + 9, 21); ctx.lineTo(sw - 6, 17);
          ctx.stroke();

          // Loaded stone in pouch
          ctx.fillStyle = '#64748b';
          ctx.beginPath();
          ctx.arc(sw - 6, 17, 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#1e293b';
          ctx.stroke();

          // Right arm pulling back
          ctx.fillStyle = '#fed7aa';
          ctx.fillRect(sw - 12, 16, 7, 5);

          // Animated Comic Exclamation Alert Bubble bouncing above helmet!
          const bubbleY = -15 + Math.sin(Date.now() * 0.012) * 2;
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(19, bubbleY, 9, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 11px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('!', 19, bubbleY + 4);
        } else {
          // WALKING POSE: arm swinging holding wooden slingshot
          ctx.fillStyle = '#fed7aa';
          ctx.fillRect(sw - 6, 21, 5, 8);
          // Wooden slingshot at side
          ctx.fillStyle = '#78350f';
          ctx.fillRect(sw - 3, 23, 4, 10);
        }
      }

      // If knocked out by poop: show huge splat dripping down helmet and face!
      if (!s.isAlive) {
        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.ellipse(19, 2, 14, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Dripping splats
        ctx.fillRect(11, 6, 4, 8);
        ctx.fillRect(23, 7, 3, 7);

        // Comic dizzy stars
        const starTime = Date.now() * 0.008;
        ctx.fillStyle = '#fbbf24';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('💫', 19 + Math.cos(starTime) * 13, -9 + Math.sin(starTime) * 4);
        ctx.fillText('⭐', 19 + Math.cos(starTime + Math.PI) * 13, -9 + Math.sin(starTime + Math.PI) * 4);
      }

      ctx.restore();
    };

    // Helper: draw Rock projectile with speed streak trail
    const drawRock = (rock: Rock) => {
      ctx.save();
      ctx.translate(rock.x, rock.y);
      ctx.rotate(rock.rotation);

      // Speed streak trail behind rock based on throw power
      if (rock.power >= 5.5) {
        // Blazing orange trail for high power throws
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.65)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-rock.vx * 2.5, -rock.vy * 2.5);
        ctx.stroke();
      } else {
        // Standard motion streak
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-rock.vx * 1.8, -rock.vy * 1.8);
        ctx.stroke();
      }

      // Chunky stone body
      ctx.fillStyle = rock.power >= 6.5 ? '#78350f' : '#64748b';
      ctx.beginPath();
      ctx.moveTo(-rock.size, -rock.size * 0.7);
      ctx.lineTo(rock.size * 0.8, -rock.size);
      ctx.lineTo(rock.size, rock.size * 0.6);
      ctx.lineTo(rock.size * 0.2, rock.size);
      ctx.lineTo(-rock.size * 0.9, rock.size * 0.5);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Stone highlight
      ctx.fillStyle = rock.power >= 6.5 ? '#f59e0b' : '#94a3b8';
      ctx.beginPath();
      ctx.arc(-2, -2, rock.size * 0.35, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    // Helper: draw Poop projectile falling directly down
    const drawPoop = (poop: Poop) => {
      ctx.save();
      ctx.translate(poop.x, poop.y);

      // Droplet steam trail
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.fillRect(-1, -8, 2, 7);

      // Swirled soft-serve retro poop
      ctx.fillStyle = poop.color;
      ctx.strokeStyle = '#1c1917';
      ctx.lineWidth = 1.5;

      // Bottom tier
      ctx.beginPath();
      ctx.ellipse(0, 4, 7, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Middle tier
      ctx.beginPath();
      ctx.ellipse(0, 0, 5, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Tip curl
      ctx.beginPath();
      ctx.moveTo(-2, -3);
      ctx.quadraticCurveTo(0, -7, 3, -7);
      ctx.quadraticCurveTo(1, -4, 2, -2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Highlight sheen
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.arc(-2, 0, 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    // Helper: draw Background
    const drawBackground = () => {
      ctx.fillStyle = world.skyGradient || '#81d4fa';
      ctx.fillRect(0, 0, world.width, world.height - world.groundHeight);

      // Distant hills
      ctx.fillStyle = '#8bc34a';
      const hillBaseY = world.height - world.groundHeight;
      for (let i = 0; i < 5; i++) {
        const hillX = ((i * 120 - world.bgOffset * 0.3) % (world.width + 120)) - 60;
        ctx.beginPath();
        ctx.arc(hillX, hillBaseY + 30, 80, Math.PI, 0);
        ctx.fill();
      }

      // Distant City Skyline
      ctx.fillStyle = '#66bb6a';
      for (let i = 0; i < STATIC_BUILDINGS.length; i++) {
        const b = STATIC_BUILDINGS[i];
        const bX = ((i * 65 - world.bgOffset * 0.5) % (world.width + 100)) - 50;
        ctx.fillRect(bX, hillBaseY - b.height, b.width, b.height);

        // Windows
        ctx.fillStyle = '#a5d6a7';
        for (let wy = hillBaseY - b.height + 8; wy < hillBaseY - 8; wy += 14) {
          ctx.fillRect(bX + 8, wy, 6, 6);
          ctx.fillRect(bX + 22, wy, 6, 6);
        }
        ctx.fillStyle = '#66bb6a';
      }

      // Clouds
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      for (let i = 0; i < STATIC_CLOUDS.length; i++) {
        const c = STATIC_CLOUDS[i];
        const cx = ((c.x - world.bgOffset * 0.2) % (world.width + 100)) - 50;
        const cy = c.y;
        ctx.beginPath();
        ctx.arc(cx, cy, 18 * c.s, 0, Math.PI * 2);
        ctx.arc(cx + 15 * c.s, cy - 8 * c.s, 22 * c.s, 0, Math.PI * 2);
        ctx.arc(cx + 35 * c.s, cy, 18 * c.s, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    // Helper: draw Ground & Splats
    const drawGround = () => {
      const gy = world.height - world.groundHeight;

      ctx.fillStyle = '#3e7b1a';
      ctx.fillRect(0, gy, world.width, 4);

      ctx.fillStyle = '#73bf2e';
      ctx.fillRect(0, gy + 4, world.width, 14);

      // Light grass blades
      ctx.fillStyle = '#9ce659';
      const stripeW = 16;
      for (let x = -stripeW; x < world.width + stripeW; x += stripeW) {
        const sx = x - (world.groundOffset % stripeW);
        ctx.beginPath();
        ctx.moveTo(sx, gy + 4);
        ctx.lineTo(sx + 6, gy + 4);
        ctx.lineTo(sx + 1, gy + 14);
        ctx.closePath();
        ctx.fill();
      }

      // Dirt body
      ctx.fillStyle = '#ded895';
      ctx.fillRect(0, gy + 18, world.width, world.groundHeight - 18);

      ctx.fillStyle = '#c8bc6d';
      ctx.fillRect(0, gy + 18, world.width, 3);

      const dirtStripeW = 20;
      for (let x = -dirtStripeW; x < world.width + dirtStripeW; x += dirtStripeW) {
        const dx = x - (world.groundOffset % dirtStripeW);
        ctx.fillRect(dx, gy + 32, 10, 4);
        ctx.fillRect(dx + 8, gy + 52, 8, 4);
      }

      // Ground poop splats
      for (let i = 0; i < world.groundSplats.length; i++) {
        const sp = world.groundSplats[i];
        ctx.save();
        ctx.globalAlpha = sp.alpha;
        ctx.fillStyle = sp.color;
        ctx.beginPath();
        ctx.ellipse(sp.x, gy + 4, sp.width, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    };

    const triggerGameOver = () => {
      if (world.gameState === 'GAMEOVER') return;
      world.gameState = 'GAMEOVER';
      world.screenShake = 3;

      const currentHigh = Math.max(world.score, world.highScore);
      const isRecord = world.score > world.highScore;
      world.highScore = currentHigh;
      try {
        localStorage.setItem('flappy_retro_highscore', currentHigh.toString());
      } catch {
        // quota ignore
      }

      setFinalScore(world.score);
      setFinalHighScore(currentHigh);
      setFinalSpeedMultiplier(world.speedMultiplier);
      setIsNewRecord(isRecord);
      setGameState('GAMEOVER');

      audio.playHit();
      setTimeout(() => {
        audio.playDie();
      }, 100);

      // Spawn crash particles with chosen skin color
      const skin = BIRD_VARIANTS[world.skin] || BIRD_VARIANTS.classic;
      for (let i = 0; i < 16; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = Math.random() * 3.5 + 1.2;
        world.particles.push({
          x: world.birdX,
          y: world.birdY,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd - 1.2,
          color: i % 2 === 0 ? skin.bodyColor : skin.wingColor,
          size: Math.random() * 3.5 + 1.5,
          alpha: 1,
          life: 0,
          maxLife: 30,
        });
      }
    };

    // The Master 60FPS Game Loop
    const loop = (currentTime: number) => {
      const rawDelta = currentTime - lastTime;
      if (rawDelta > 100) {
        lastTime = currentTime;
      }
      const dt = Math.min((currentTime - lastTime) / 16.666, 1.4);
      lastTime = currentTime;

      const currentState = world.gameState;

      // Screen shake decay
      if (world.screenShake > 0) {
        world.screenShake -= 0.3 * dt;
        if (world.screenShake < 0) world.screenShake = 0;
      }

      // 1. UPDATE PHYSICS
      if (currentState === 'START') {
        world.birdY = 260 + Math.sin(currentTime * 0.007) * 8;
        world.birdRotation = 0;
        world.wingTimer += dt;
        if (world.wingTimer > 5) {
          world.wingFrame = (world.wingFrame + 1) % 3;
          world.wingTimer = 0;
        }
        world.groundOffset += 2.0 * dt;
        world.bgOffset += 0.5 * dt;
      } else if (currentState === 'PLAYING') {
        // Cooldowns
        if (world.poopCooldown > 0) world.poopCooldown -= dt;
        if (world.invulnerableTimer > 0) world.invulnerableTimer -= dt;

        // Calculate speed based on score: +20% every 30 points
        const tier = Math.floor(world.score / 30);
        const currentMult = Math.pow(1.2, tier);
        if (currentMult !== world.speedMultiplier) {
          world.speedMultiplier = currentMult;
          world.speedAlertTimer = 75;
          audio.playSpeedUp();
          if (hudSpeedRef.current) {
            hudSpeedRef.current.innerText = `${currentMult.toFixed(1)}x`;
          }
        }

        const effectiveSpeed = world.baseScrollSpeed * currentMult;

        // Bird velocity & position
        world.birdVelocity += world.birdGravity * dt;
        world.birdY += world.birdVelocity * dt;

        // Tilt rotation: smooth angle interpolation (buttery smooth flight)
        const targetRot = world.birdVelocity < 0 ? Math.max(-0.45, world.birdVelocity * 0.08) : Math.min(1.2, (world.birdVelocity - 2) * 0.12);
        world.birdRotation += (targetRot - world.birdRotation) * 0.28 * dt;

        // Wing animation (relaxed, classic tempo)
        world.wingTimer += dt;
        if (world.wingTimer > (world.birdVelocity < 0 ? 3 : 7)) {
          world.wingFrame = (world.wingFrame + 1) % 3;
          world.wingTimer = 0;
        }

        // Scrolling
        world.groundOffset += effectiveSpeed * dt;
        world.bgOffset += effectiveSpeed * 0.35 * dt;

        // Ceiling collision
        if (world.birdY - world.birdRadius < 0) {
          world.birdY = world.birdRadius;
          world.birdVelocity = 0;
        }

        // Ground collision (Instant death)
        const groundY = world.height - world.groundHeight;
        if (world.birdY + world.birdRadius >= groundY) {
          world.birdY = groundY - world.birdRadius;
          triggerGameOver();
        }

        // Pipe spawning: random heights with safe margins
        world.pipeSpawnTimer += dt * (currentMult >= 1.4 ? 1.12 : 1);
        const interval = Math.max(68, world.basePipeInterval / Math.pow(currentMult, 0.35));
        if (world.pipeSpawnTimer >= interval) {
          world.pipeSpawnTimer = 0;
          const minPipeTop = 60;
          const maxPipeTop = groundY - world.pipeGap - 60;
          const randomTopHeight = minPipeTop + Math.random() * (maxPipeTop - minPipeTop);

          world.pipes.push({
            x: world.width + 10,
            topHeight: randomTopHeight,
            bottomY: randomTopHeight + world.pipeGap,
            passed: false,
          });
        }

        // Move pipes & collision detection
        for (let i = world.pipes.length - 1; i >= 0; i--) {
          const p = world.pipes[i];
          p.x -= effectiveSpeed * dt;

          // Passing pipe: +10 points to score
          if (!p.passed && p.x + world.pipeWidth < world.birdX - world.birdRadius) {
            p.passed = true;
            world.score += 10;

            if (world.score > world.highScore) {
              world.highScore = world.score;
              if (hudHighScoreRef.current) {
                hudHighScoreRef.current.innerText = world.score.toString();
              }
            }

            audio.playScore();

            // Floating +10 text
            world.popups.push({
              x: world.birdX + 12,
              y: world.birdY - 12,
              text: '+10',
              alpha: 1,
              vy: -1.2,
              life: 0,
            });

            // Sparkles
            for (let k = 0; k < 5; k++) {
              world.particles.push({
                x: world.birdX,
                y: world.birdY,
                vx: (Math.random() - 0.5) * 2.8,
                vy: (Math.random() - 0.5) * 2.8,
                color: '#ffe600',
                size: Math.random() * 2.8 + 1.5,
                alpha: 1,
                life: 0,
                maxLife: 22,
              });
            }
          }

          // Pipe collision (Instant death)
          const birdBoxLeft = world.birdX - world.birdRadius * 0.8;
          const birdBoxRight = world.birdX + world.birdRadius * 0.8;
          const birdBoxTop = world.birdY - world.birdRadius * 0.8;
          const birdBoxBottom = world.birdY + world.birdRadius * 0.8;

          if (birdBoxRight > p.x && birdBoxLeft < p.x + world.pipeWidth) {
            if (birdBoxTop < p.topHeight || birdBoxBottom > p.bottomY) {
              triggerGameOver();
              break;
            }
          }

          // Offscreen cull
          if (p.x + world.pipeWidth < -30) {
            world.pipes.splice(i, 1);
          }
        }

        // -------------------------------------------------------------
        // SOLDIER LOGIC: "add soldiers after 40 points (multiplies by every 40 points)"
        // -------------------------------------------------------------
        if (world.score >= 40) {
          // Alert player first time soldiers appear
          if (!world.hasShownSoldierWarning) {
            world.hasShownSoldierWarning = true;
            world.soldierWarningTimer = 110;
          }

          const soldierTier = Math.floor(world.score / 40); // 1 at 40-79, 2 at 80-119, 3 at 120-159
          const maxSoldiers = Math.min(4, soldierTier);

          const activeSoldiers = world.soldiers.filter((s) => s.isAlive).length;

          world.soldierSpawnTimer += dt;
          if (activeSoldiers < maxSoldiers && world.soldierSpawnTimer > 80) {
            world.soldierSpawnTimer = 0;
            // Bigger soldier: width 38, height 52
            const soldierH = 52;
            const soldierW = 38;

            world.soldiers.push({
              id: world.nextSoldierId++,
              x: world.width + 30 + Math.random() * 40,
              y: groundY - soldierH,
              width: soldierW,
              height: soldierH,
              walkTimer: 0,
              throwCooldown: 0,
              windupTimer: 0,
              hasSpottedBird: false,
              isAlive: true,
              knockbackVx: 0,
              knockbackVy: 0,
              rotation: 0,
              alpha: 1,
            });
          }
        }

        // Update soldiers
        for (let i = world.soldiers.length - 1; i >= 0; i--) {
          const s = world.soldiers[i];

          if (s.isAlive) {
            // Soldier walks left with ground scroll + walking pace
            s.x -= (effectiveSpeed + 0.35) * dt;
            s.walkTimer += dt;

            // Step dust puff VFX while walking
            if (Math.random() < 0.15) {
              world.particles.push({
                x: s.x + (Math.random() < 0.5 ? 8 : 28),
                y: groundY - 2,
                vx: 0.5,
                vy: -0.4,
                color: 'rgba(210, 195, 140, 0.6)',
                size: 2,
                alpha: 0.6,
                life: 0,
                maxLife: 10,
              });
            }

            // Immediately spot the bird as soon as entering the screen!
            if (!s.hasSpottedBird && s.x <= world.width - 5) {
              s.hasSpottedBird = true;
              s.windupTimer = 8; // immediate visual alert ('!' windup)
              s.throwCooldown = 8; // shoots in 8 frames upon sighting!
            }

            // Timers countdown
            if (s.throwCooldown > 0) {
              s.throwCooldown -= dt;
            }
            if (s.windupTimer > 0) {
              s.windupTimer -= dt;
            }

            // Pre-throw windup for subsequent shots
            if (s.hasSpottedBird && s.throwCooldown <= 18 && s.throwCooldown > 0 && s.x > 50 && s.x < world.width) {
              s.windupTimer = 18;
            }

            // Shoot rock directly at bird upon sighting, with power scaling as game progresses!
            if (s.hasSpottedBird && s.throwCooldown <= 0 && s.x > 30 && s.x < world.width) {
              s.throwCooldown = 75 + Math.random() * 35; // reload cooldown
              s.windupTimer = 0;

              // Launch point from slingshot
              const launchX = s.x + 8;
              const launchY = s.y + 16;
              const dx = world.birdX - launchX;
              const dy = world.birdY - launchY;
              const dist = Math.hypot(dx, dy) || 1;

              // "the power of the throw gradually the game progress":
              // scales from 4.2 up to 9.2 as score climbs!
              const throwPower = 4.2 + Math.min(5.0, Math.max(0, world.score - 40) * 0.04);

              // "the soldiers stone is has to be directly to the bird"
              const vx = (dx / dist) * throwPower;
              const vy = (dy / dist) * throwPower;

              world.rocks.push({
                x: launchX,
                y: launchY,
                vx: vx,
                vy: vy,
                rotation: 0,
                size: 5.5,
                active: true,
                power: throwPower,
              });

              audio.playRockThrow();
            }
          } else {
            // Defeated soldier: flies away spinning
            s.x += s.knockbackVx * dt;
            s.y += s.knockbackVy * dt;
            s.knockbackVy += 0.32 * dt;
            s.rotation += 0.16 * dt;
            s.alpha -= 0.02 * dt;

            if (s.y > world.height + 40 || s.alpha <= 0) {
              world.soldiers.splice(i, 1);
              continue;
            }
          }

          // Offscreen cull
          if (s.x + s.width < -40) {
            world.soldiers.splice(i, 1);
          }
        }

        // -------------------------------------------------------------
        // ROCKS LOGIC: Stones fly directly towards the bird with streak trails
        // -------------------------------------------------------------
        for (let i = world.rocks.length - 1; i >= 0; i--) {
          const r = world.rocks[i];
          r.x += r.vx * dt;
          r.y += r.vy * dt;
          r.rotation += (0.16 + r.power * 0.02) * dt;

          // Smoke / streak trail VFX
          if (Math.random() < 0.42) {
            world.particles.push({
              x: r.x - r.vx * 0.35,
              y: r.y - r.vy * 0.35,
              vx: (Math.random() - 0.5) * 0.6,
              vy: (Math.random() - 0.5) * 0.6,
              color: r.power >= 5.5 ? '#f59e0b' : '#94a3b8',
              size: Math.random() * 2 + 1,
              alpha: 0.65,
              life: 0,
              maxLife: 12,
            });
          }

          // Check collision with bird
          const distToBird = Math.hypot(r.x - world.birdX, r.y - world.birdY);
          if (distToBird < world.birdRadius + r.size) {
            r.active = false;

            if (world.invulnerableTimer <= 0) {
              world.lives -= 1;
              world.invulnerableTimer = 55;
              world.screenShake = 2.5;

              audio.playHurt();

              // Spawn rock dust impact particles
              for (let k = 0; k < 8; k++) {
                world.particles.push({
                  x: r.x,
                  y: r.y,
                  vx: (Math.random() - 0.5) * 3.5,
                  vy: (Math.random() - 0.5) * 3.5,
                  color: '#94a3b8',
                  size: 2.5,
                  alpha: 1,
                  life: 0,
                  maxLife: 16,
                });
              }

              // Check if bird died from 3 hits
              if (world.lives <= 0) {
                world.rocks.splice(i, 1);
                triggerGameOver();
                break;
              }
            }
          }

          // Cull rock if ground hit or offscreen
          if (r.y >= groundY || r.x < -30 || r.x > world.width + 30 || !r.active) {
            if (r.y >= groundY && r.active) {
              world.particles.push({
                x: r.x,
                y: groundY - 2,
                vx: (Math.random() - 0.5) * 1.5,
                vy: -1,
                color: '#c8bc6d',
                size: 2.5,
                alpha: 0.7,
                life: 0,
                maxLife: 12,
              });
            }
            world.rocks.splice(i, 1);
          }
        }

        // -------------------------------------------------------------
        // POOP LOGIC: Poop falls directly on the floor or hits soldier's head!
        // -------------------------------------------------------------
        for (let i = world.poops.length - 1; i >= 0; i--) {
          const p = world.poops[i];
          // Drops directly down onto the floor!
          p.x += p.vx * dt; // vx = 0
          p.y += p.vy * dt;
          p.vy += 0.45 * dt; // direct gravity acceleration downwards

          let hitSoldier = false;

          // Check collision with bigger soldier: sw = 38, sh = 52
          for (let sIdx = 0; sIdx < world.soldiers.length; sIdx++) {
            const s = world.soldiers[sIdx];
            if (!s.isAlive) continue;

            // Hit zone: width 38, height 52
            if (p.x >= s.x - 4 && p.x <= s.x + s.width + 4 && p.y >= s.y - 8 && p.y <= s.y + s.height) {
              hitSoldier = true;
              s.isAlive = false;
              s.knockbackVx = (Math.random() - 0.5) * 2 - 2.5;
              s.knockbackVy = -5.4; // comic spin up and away
              audio.playSplat();

              // Headshot check (upper head region of soldier)
              const isHeadshot = p.y <= s.y + 24;
              const bonus = isHeadshot ? 30 : 20;
              world.score += bonus;
              if (world.score > world.highScore) {
                world.highScore = world.score;
                if (hudHighScoreRef.current) {
                  hudHighScoreRef.current.innerText = world.score.toString();
                }
              }

              // Splat text popup with VFX
              world.popups.push({
                x: s.x + 4,
                y: s.y - 14,
                text: isHeadshot ? '+30 HEADSHOT!' : '+20 SPLAT!',
                color: isHeadshot ? '#ef4444' : '#f59e0b',
                alpha: 1,
                vy: -1.3,
                life: 0,
              });

              // Comic splat explosion VFX
              const currentVariant = BIRD_VARIANTS[world.skin] || BIRD_VARIANTS.classic;
              for (let k = 0; k < 16; k++) {
                const angle = Math.random() * Math.PI * 2;
                const spd = Math.random() * 3.8 + 1.2;
                world.particles.push({
                  x: s.x + s.width / 2,
                  y: s.y + 8,
                  vx: Math.cos(angle) * spd,
                  vy: Math.sin(angle) * spd - 1.2,
                  color: k % 2 === 0 ? currentVariant.splatColor : '#fde047',
                  size: Math.random() * 3.5 + 2,
                  alpha: 1,
                  life: 0,
                  maxLife: 26,
                });
              }

              break;
            }
          }

          if (hitSoldier) {
            world.poops.splice(i, 1);
            continue;
          }

          // Poop hit floor directly: leaves ground splat & splash droplets
          if (p.y >= groundY) {
            world.groundSplats.push({
              x: p.x,
              y: groundY,
              color: p.color,
              width: 14 + Math.random() * 6,
              alpha: 0.9,
            });

            // Splash droplets VFX
            for (let k = 0; k < 6; k++) {
              world.particles.push({
                x: p.x,
                y: groundY - 2,
                vx: (Math.random() - 0.5) * 2.5,
                vy: -(Math.random() * 2 + 1),
                color: p.color,
                size: Math.random() * 2.5 + 1.5,
                alpha: 0.85,
                life: 0,
                maxLife: 16,
              });
            }

            world.poops.splice(i, 1);
          }
        }

        // Scroll ground splats with the ground
        for (let i = world.groundSplats.length - 1; i >= 0; i--) {
          const sp = world.groundSplats[i];
          sp.x -= effectiveSpeed * dt;
          if (sp.x < -30) {
            world.groundSplats.splice(i, 1);
          }
        }
      } else if (currentState === 'GAMEOVER') {
        const groundY = world.height - world.groundHeight;
        if (world.birdY + world.birdRadius < groundY) {
          world.birdVelocity += world.birdGravity * 1.3 * dt;
          world.birdY += world.birdVelocity * dt;
          world.birdRotation = Math.min(1.5, world.birdRotation + 0.1 * dt);
        } else {
          world.birdY = groundY - world.birdRadius;
        }
      }

      // Update Particles
      for (let i = world.particles.length - 1; i >= 0; i--) {
        const pt = world.particles[i];
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.life += dt;
        pt.alpha = Math.max(0, 1 - pt.life / pt.maxLife);
        if (pt.life >= pt.maxLife) {
          world.particles.splice(i, 1);
        }
      }

      // Update Score Popups
      for (let i = world.popups.length - 1; i >= 0; i--) {
        const pop = world.popups[i];
        pop.y += pop.vy * dt;
        pop.life += dt;
        pop.alpha = Math.max(0, 1 - pop.life / 32);
        if (pop.life >= 32) {
          world.popups.splice(i, 1);
        }
      }

      // Banner timers
      if (world.speedAlertTimer > 0) world.speedAlertTimer -= dt;
      if (world.soldierWarningTimer > 0) world.soldierWarningTimer -= dt;

      // 2. RENDER
      ctx.save();

      // Screen Shake
      if (world.screenShake > 0) {
        const shakeX = (Math.random() - 0.5) * world.screenShake * 5;
        const shakeY = (Math.random() - 0.5) * world.screenShake * 5;
        ctx.translate(shakeX, shakeY);
      }

      // Draw Sky & Clouds
      drawBackground();

      // Draw Pipes
      for (let i = 0; i < world.pipes.length; i++) {
        const p = world.pipes[i];
        drawPipe(p.x, 0, world.pipeWidth, p.topHeight, true);
        const bottomHeight = world.height - world.groundHeight - p.bottomY;
        drawPipe(p.x, p.bottomY, world.pipeWidth, bottomHeight, false);
      }

      // Draw Soldiers
      for (let i = 0; i < world.soldiers.length; i++) {
        drawSoldier(world.soldiers[i]);
      }

      // Draw Rocks
      for (let i = 0; i < world.rocks.length; i++) {
        drawRock(world.rocks[i]);
      }

      // Draw Poops
      for (let i = 0; i < world.poops.length; i++) {
        drawPoop(world.poops[i]);
      }

      // Draw Ground
      drawGround();

      // Draw Particles
      for (let i = 0; i < world.particles.length; i++) {
        const pt = world.particles[i];
        ctx.save();
        ctx.globalAlpha = pt.alpha;
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Draw Bird
      drawBird(
        world.birdX,
        world.birdY,
        world.birdRotation,
        world.wingFrame,
        world.skin,
        world.invulnerableTimer > 0
      );

      // Draw Popups
      for (let i = 0; i < world.popups.length; i++) {
        const pop = world.popups[i];
        ctx.save();
        ctx.globalAlpha = pop.alpha;
        ctx.font = 'bold 13px "Press Start 2P", monospace';
        ctx.fillStyle = pop.color || '#ffea00';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.strokeText(pop.text, pop.x, pop.y);
        ctx.fillText(pop.text, pop.x, pop.y);
        ctx.restore();
      }

      // Draw HUD (Score + 3 Hearts)
      if (currentState === 'PLAYING') {
        ctx.save();

        // 3 Hearts (Health against soldier rocks: 3 hits to die)
        const heartStartX = 16;
        const heartY = 32;
        for (let h = 0; h < world.maxLives; h++) {
          const isAlive = h < world.lives;
          ctx.font = '16px monospace';
          ctx.textAlign = 'left';
          // Heart symbol with drop shadow
          ctx.fillStyle = isAlive ? '#ef4444' : '#475569';
          ctx.fillText(isAlive ? '❤️' : '🖤', heartStartX + h * 22, heartY);
        }

        // Center Score
        ctx.textAlign = 'center';
        ctx.font = '28px "Press Start 2P", monospace';
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 5;
        const scoreStr = world.score.toString();
        ctx.strokeText(scoreStr, world.width / 2, 70);
        ctx.fillText(scoreStr, world.width / 2, 70);

        ctx.restore();
      }

      // Speed Alert Canvas Overlay
      if (world.speedAlertTimer > 0) {
        const bannerAlpha = Math.min(1, world.speedAlertTimer / 20);
        ctx.save();
        ctx.globalAlpha = bannerAlpha;
        const bannerText = world.lang === 'tr' ? 'HIZLANDI! +%20' : 'SPEED UP! +20%';
        ctx.font = '11px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        const textMetrics = ctx.measureText(bannerText);
        const bannerW = textMetrics.width + 24;
        const bannerX = world.width / 2 - bannerW / 2;
        const bannerY = 95;

        ctx.fillStyle = '#f59e0b';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.fillRect(bannerX, bannerY, bannerW, 26);
        ctx.strokeRect(bannerX, bannerY, bannerW, 26);

        ctx.fillStyle = '#0f172a';
        ctx.fillText(bannerText, world.width / 2, bannerY + 17);
        ctx.restore();
      }

      // Soldier Warning Banner (At 40+ points)
      if (world.soldierWarningTimer > 0) {
        const warnAlpha = Math.min(1, world.soldierWarningTimer / 25);
        ctx.save();
        ctx.globalAlpha = warnAlpha;
        const warnText = world.lang === 'tr' ? '⚠️ ASKERLER GELİYOR! TAŞLARDAN KAÇ!' : '⚠️ SOLDIERS INCOMING! DODGE ROCKS!';
        ctx.font = '8px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        const textMetrics = ctx.measureText(warnText);
        const bannerW = textMetrics.width + 16;
        const bannerX = world.width / 2 - bannerW / 2;
        const bannerY = 130;

        ctx.fillStyle = '#dc2626';
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 2;
        ctx.fillRect(bannerX, bannerY, bannerW, 24);
        ctx.strokeRect(bannerX, bannerY, bannerW, 24);

        ctx.fillStyle = '#ffffff';
        ctx.fillText(warnText, world.width / 2, bannerY + 16);
        ctx.restore();
      }

      ctx.restore();

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const t = translations[lang];

  // Compute Medal on Game Over
  const getMedal = () => {
    if (finalScore >= 120) return { name: t.platinum, color: 'from-cyan-300 to-blue-500', border: 'border-cyan-200' };
    if (finalScore >= 70) return { name: t.gold, color: 'from-amber-300 to-yellow-600', border: 'border-yellow-200' };
    if (finalScore >= 40) return { name: t.silver, color: 'from-slate-200 to-slate-400', border: 'border-slate-100' };
    if (finalScore >= 20) return { name: t.bronze, color: 'from-orange-400 to-amber-700', border: 'border-orange-200' };
    return null;
  };

  const medal = getMedal();
  const currentVariant = BIRD_VARIANTS[selectedSkin] || BIRD_VARIANTS.classic;

  return (
    <div className="flex flex-col items-center justify-center w-screen h-screen bg-slate-950 p-0 sm:p-4 overflow-hidden select-none">
      {/* Top Header Bar */}
      <div className="w-full max-w-[420px] flex items-center justify-between px-3 py-2 text-xs font-pixel text-slate-300 z-20">
        <div className="flex items-center gap-1.5 text-yellow-400 font-bold">
          <Trophy className="w-3.5 h-3.5 text-yellow-400" />
          <span>{t.highScore}: </span>
          <span ref={hudHighScoreRef}>{finalHighScore}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Speed Indicator */}
          <div className="flex items-center gap-1 px-2 py-0.5 rounded border bg-slate-800/80 border-slate-700 text-amber-300">
            <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
            <span ref={hudSpeedRef}>{finalSpeedMultiplier.toFixed(1)}x</span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-colors cursor-pointer"
            title={soundEnabled ? 'Mute' : 'Unmute'}
            aria-label="Toggle Sound"
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-rose-400" />}
          </button>

          {/* Language Toggle */}
          <button
            onClick={() => setLang(lang === 'en' ? 'tr' : 'en')}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] font-pixel text-emerald-300 transition-colors cursor-pointer"
            title="Change Language"
          >
            <Globe className="w-3 h-3" />
            <span>{lang.toUpperCase()}</span>
          </button>
        </div>
      </div>

      {/* Retro Mobile Phone Cabinet Container */}
      <div className="relative w-full max-w-[380px] h-[calc(100vh-60px)] max-h-[640px] sm:rounded-2xl overflow-hidden shadow-2xl border-0 sm:border-4 border-slate-800 bg-sky-400 flex flex-col">
        {/* Canvas */}
        <canvas
          ref={canvasRef}
          width={360}
          height={600}
          onMouseDown={(e) => {
            e.preventDefault();
            if (worldRef.current.gameState !== 'GAMEOVER') {
              performFlap();
            }
          }}
          onTouchStart={(e) => {
            // Prevent synthetic double click, tap flaps bird
            if (worldRef.current.gameState !== 'GAMEOVER') {
              performFlap();
            }
          }}
          className="w-full h-full object-cover cursor-pointer touch-none block"
        />

        {/* Mobile On-Screen POOP Action Button (for touch players to poop without keyboard Shift!) */}
        {gameState === 'PLAYING' && (
          <button
            onTouchStart={(e) => {
              e.stopPropagation();
              performPoop();
            }}
            onClick={(e) => {
              e.stopPropagation();
              performPoop();
            }}
            className="absolute bottom-5 right-4 z-20 flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-amber-900/90 hover:bg-amber-800 active:scale-90 border-2 border-amber-400 text-white shadow-xl cursor-pointer transition-transform"
            aria-label="Poop Button"
          >
            <span className="text-xl leading-none">💩</span>
            <span className="text-[7px] font-pixel mt-0.5 text-amber-200 font-bold">{t.poopBtn}</span>
          </button>
        )}

        {/* Start Game Screen Overlay (with Skin Selector) */}
        {gameState === 'START' && (
          <div className="absolute inset-0 bg-black/35 backdrop-blur-[1px] flex flex-col items-center justify-between p-4 z-10">
            {/* Title Banner */}
            <div className="flex flex-col items-center mt-3 text-center">
              <div className="text-2xl font-pixel text-yellow-400 drop-shadow-[0_4px_0_#b45309] tracking-wider mb-1">
                {t.title}
              </div>
              <div className="px-3 py-0.5 rounded bg-black/60 border border-amber-400/50 text-[9px] font-pixel text-amber-300 tracking-widest">
                {t.subtitle}
              </div>
            </div>

            {/* BIRD VARIANT SKIN SELECTOR */}
            <div className="w-full max-w-[300px] bg-slate-900/90 border-2 border-amber-400/70 rounded-xl p-3 flex flex-col items-center shadow-xl">
              <div className="text-[8px] font-pixel text-amber-300 tracking-wider mb-2">
                {t.skinSelect}
              </div>

              <div className="flex items-center justify-between w-full px-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    cycleSkin(-1);
                  }}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-amber-500/50 text-amber-300 cursor-pointer active:scale-95"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Skin Preview Icon & Badge */}
                <div className="flex flex-col items-center">
                  <div
                    className="w-12 h-12 rounded-full border-2 border-white/80 shadow-md flex items-center justify-center mb-1"
                    style={{ backgroundColor: currentVariant.bodyColor }}
                  >
                    <span className="text-lg">🐦</span>
                  </div>
                  <span className="text-[9px] font-pixel text-white font-bold text-center">
                    {currentVariant.name[lang]}
                  </span>
                  <span className="text-[7px] font-pixel text-amber-200/80 text-center mt-0.5 max-w-[170px]">
                    {currentVariant.desc[lang]}
                  </span>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    cycleSkin(1);
                  }}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-amber-500/50 text-amber-300 cursor-pointer active:scale-95"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tap instruction */}
            <div
              onClick={performFlap}
              className="flex flex-col items-center gap-2 text-center cursor-pointer active:scale-95 transition-transform"
            >
              <div className="w-12 h-12 rounded-full bg-white/20 border-2 border-white/80 flex items-center justify-center shadow-lg animate-pulse">
                <span className="text-xl font-pixel text-white">👆</span>
              </div>
              <div className="text-[10px] font-pixel text-white drop-shadow-[0_2px_0_#000] px-2 leading-relaxed">
                {t.tapToFly}
              </div>
              <div className="text-[8px] font-pixel text-amber-300 bg-black/50 px-2 py-1 rounded border border-amber-500/40">
                {t.poopHelp}
              </div>
            </div>

            {/* Feature info footer */}
            <div className="text-[8px] font-pixel text-sky-100/90 text-center bg-black/50 px-2.5 py-1 rounded-md border border-white/20">
              {t.pointsInfo}
            </div>
          </div>
        )}

        {/* Game Over Modal Overlay */}
        {gameState === 'GAMEOVER' && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px] flex flex-col items-center justify-center p-4 z-20">
            <div className="text-2xl font-pixel text-rose-500 drop-shadow-[0_3px_0_#881337] tracking-wider mb-4 animate-bounce">
              {t.gameOver}
            </div>

            <div className="w-full max-w-[310px] bg-gradient-to-b from-amber-100 to-amber-200 border-4 border-amber-900 rounded-xl p-4 shadow-2xl relative text-amber-950 font-pixel">
              {isNewRecord && (
                <div className="absolute -top-3.5 -right-2 bg-rose-600 border-2 border-white text-white text-[9px] font-pixel px-2 py-0.5 rounded shadow-lg transform rotate-6 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 fill-yellow-300 text-yellow-300" />
                  <span>{t.newBest}</span>
                </div>
              )}

              <div className="flex justify-between items-center gap-3">
                {/* Medal */}
                <div className="flex flex-col items-center justify-center w-24 p-2 bg-amber-300/60 rounded-lg border-2 border-amber-900/40">
                  <div className="text-[9px] font-pixel text-amber-900 mb-1.5 tracking-wider">
                    {t.medal}
                  </div>
                  {medal ? (
                    <div className="flex flex-col items-center">
                      <div className={`w-11 h-11 rounded-full bg-gradient-to-tr ${medal.color} border-2 ${medal.border} flex items-center justify-center shadow-md`}>
                        <Trophy className="w-5 h-5 text-white drop-shadow" />
                      </div>
                      <span className="text-[8px] font-pixel text-amber-950 mt-1 font-bold">
                        {medal.name}
                      </span>
                    </div>
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-amber-400/40 border-2 border-dashed border-amber-800/40 flex items-center justify-center text-[10px] text-amber-800/60">
                      -
                    </div>
                  )}
                </div>

                {/* Score & Best */}
                <div className="flex-1 flex flex-col gap-2 pl-2 border-l-2 border-amber-800/20">
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] text-amber-800 tracking-wider">
                      {t.score}
                    </span>
                    <span className="text-xl text-amber-950 font-black">
                      {finalScore}
                    </span>
                  </div>

                  <div className="flex flex-col items-end border-t border-amber-800/20 pt-1">
                    <span className="text-[9px] text-amber-800 tracking-wider">
                      {t.highScore}
                    </span>
                    <span className="text-xl text-amber-950 font-black">
                      {finalHighScore}
                    </span>
                  </div>
                </div>
              </div>

              {/* Skin & Speed info */}
              <div className="mt-3 pt-2 border-t border-amber-800/30 flex items-center justify-between text-[8px] text-amber-900">
                <span className="flex items-center gap-1 font-bold">
                  <span>{currentVariant.name[lang]}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-700 fill-amber-700" />
                  {t.speed}: {finalSpeedMultiplier.toFixed(1)}x
                </span>
              </div>
            </div>

            {/* Restart Button */}
            <button
              onClick={restartGame}
              className="mt-5 px-6 py-3 rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-600 hover:from-emerald-300 hover:to-emerald-500 active:translate-y-1 text-white font-pixel text-xs border-b-4 border-emerald-900 shadow-xl flex items-center gap-2 cursor-pointer transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{t.playAgain}</span>
            </button>

            <span className="mt-2 text-[9px] font-pixel text-slate-400">
              {lang === 'tr' ? 'veya BOŞLUK tuşuna bas' : 'or press SPACE'}
            </span>
          </div>
        )}
      </div>

      {/* Bottom controls help pill */}
      <div className="mt-2 text-center text-[9px] font-pixel text-slate-400 max-w-[420px] px-2 leading-relaxed">
        {t.controlsInfo}
      </div>
    </div>
  );
}
