export const TILE_SIZE = 1;
export const LANE_WIDTH = 13;
export const INITIAL_ROWS_AHEAD = 28;
export const ROWS_BEHIND_KEEP = 14;
export const SAFE_ZONE_BASE = 6;
export const REAR_PUSH_BASE = 4.5;

export type CharacterDefinition = {
  id: string;
  name: string;
  primaryColor: number;
  accentColor: number;
  biome: 'default' | 'snow' | 'scifi';
  hopSoundHz: number;
  moveCooldown: number;
  canMoveBack: boolean;
};

export const CHARACTERS: CharacterDefinition[] = [
  {
    id: 'chicken',
    name: 'Chicken',
    primaryColor: 0xffd454,
    accentColor: 0xf09030,
    biome: 'default',
    hopSoundHz: 630,
    moveCooldown: 0.12,
    canMoveBack: false,
  },
  {
    id: 'penguin',
    name: 'Penguin',
    primaryColor: 0xeff6ff,
    accentColor: 0x2f75ff,
    biome: 'snow',
    hopSoundHz: 500,
    moveCooldown: 0.1,
    canMoveBack: true,
  },
  {
    id: 'alien',
    name: 'Alien',
    primaryColor: 0x95ff9f,
    accentColor: 0x6a5cff,
    biome: 'scifi',
    hopSoundHz: 700,
    moveCooldown: 0.09,
    canMoveBack: true,
  },
];
