export interface Team {
  id: string;
  name: string;
  order: number;
  logoUrl?: string;
  createdAt: string;
}

export interface Round {
  id: string;
  label: string;
  order: number;
  createdAt: string;
}

export interface ResultItem {
  id: string;
  roundId: string;
  teamId: string;
  kill: number;
  placement: number | null;
  booyah: boolean;
  updatedAt?: string;
}

export interface PlacementPoints {
  [rank: string]: number;
}

export interface SettingsConfig {
  pointPerKill: number;
  booyahBonus: number;
  placementPoints: PlacementPoints;
  tournamentName: string;
  bannerUrl: string;
  currentRoundId: string;
  currentRoundLabel: string;
  status: 'waiting' | 'live' | 'finished';
  isBroadcasting: boolean;
}

export interface RoundBreakdown {
  roundId: string;
  roundLabel: string;
  kill: number;
  placement: number | null;
  booyah: boolean;
  killPoints: number;
  placementPoints: number;
  booyahPoints: number;
  roundTotalPoints: number;
}

export interface CalculatedTeamScore {
  team: Team;
  totalPoints: number;
  totalKill: number;
  totalBooyah: number;
  totalPlacementPoints: number;
  rank: number;
  roundBreakdown: RoundBreakdown[];
}
