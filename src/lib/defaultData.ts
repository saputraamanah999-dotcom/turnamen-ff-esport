import { Team, Round, SettingsConfig } from '../types';

export const DEFAULT_TEAMS: Omit<Team, 'id'>[] = [
  { name: 'EVOS DIVINE', order: 1, logoUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=120&auto=format&fit=crop&q=80', createdAt: new Date().toISOString() },
  { name: 'RRQ KAZU', order: 2, logoUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=120&auto=format&fit=crop&q=80', createdAt: new Date().toISOString() },
  { name: 'ONIC OLYMPUS', order: 3, logoUrl: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=120&auto=format&fit=crop&q=80', createdAt: new Date().toISOString() },
  { name: 'BIGETRON DELTA', order: 4, logoUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=120&auto=format&fit=crop&q=80', createdAt: new Date().toISOString() },
  { name: 'MORPH TEAM', order: 5, logoUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=120&auto=format&fit=crop&q=80', createdAt: new Date().toISOString() },
  { name: 'SES ALFAINK', order: 6, logoUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=120&auto=format&fit=crop&q=80', createdAt: new Date().toISOString() },
  { name: 'GENESIS DOGMA', order: 7, logoUrl: 'https://images.unsplash.com/photo-1560253023-3ec5d502959f?w=120&auto=format&fit=crop&q=80', createdAt: new Date().toISOString() },
];

export const DEFAULT_ROUNDS: Omit<Round, 'id'>[] = [
  { label: 'Match 1 (Bermuda)', order: 1, createdAt: new Date().toISOString() },
  { label: 'Match 2 (Kalahari)', order: 2, createdAt: new Date().toISOString() },
  { label: 'Match 3 (Purgatory)', order: 3, createdAt: new Date().toISOString() },
  { label: 'Match 4 (Alpine)', order: 4, createdAt: new Date().toISOString() },
  { label: 'Match 5 (Nexterra)', order: 5, createdAt: new Date().toISOString() },
];

export const DEFAULT_SETTINGS: SettingsConfig = {
  pointPerKill: 1,
  booyahBonus: 0,
  tournamentName: 'FREE FIRE WORLD SERIES',
  bannerUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1920&auto=format&fit=crop&q=80',
  currentRoundId: '',
  currentRoundLabel: '',
  status: 'waiting',
  youtubeUrl: '',
  placementPoints: {
    "1": 12,
    "2": 9,
    "3": 8,
    "4": 7,
    "5": 6,
    "6": 5,
    "7": 4,
    "8": 3,
    "9": 2,
    "10": 1,
    "11": 0,
    "12": 0,
    "13": 0,
    "14": 0,
    "15": 0,
    "16": 0
  }
};
