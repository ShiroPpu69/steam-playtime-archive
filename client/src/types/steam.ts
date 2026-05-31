export interface ArchiveGame {
  appid: number;
  name: string;
  playtimeForeverMinutes: number;
  playtimeForeverHours: number;
  playtimeForeverText: string;
  playtime2WeeksMinutes: number;
  iconUrl: string;
  imageUrl: string;
  hasCommunityVisibleStats: boolean;
  storeUrl: string;
}

export interface ArchiveResponse {
  steamid64: string;
  vanityName?: string;
  profileUrl: string;
  gameCount: number;
  totalPlaytimeMinutes: number;
  totalPlaytimeHours: number;
  playedGameCount: number;
  unplayedGameCount: number;
  recent2WeeksMinutes: number;
  averagePlaytimeHours: number;
  topGame?: ArchiveGame;
  top10Share: number;
  fromCache: boolean;
  lastSyncedAt: string;
  games: ArchiveGame[];
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: string;
  };
}

export interface HistoryRun {
  id: number;
  totalGames: number;
  totalPlaytimeMinutes: number;
  playedGameCount: number;
  unplayedGameCount: number;
  recent2WeeksMinutes: number;
  primaryDeltaAppid?: number;
  primaryDeltaName?: string;
  primaryDeltaMinutes: number;
  totalDeltaMinutes: number;
  createdAt: string;
}

export interface AchievementSummary {
  appid: number;
  achieved: number;
  total: number;
  completionRate: number;
}

export interface RecentGame {
  appid: number;
  name: string;
  playtime2WeeksMinutes: number;
  playtimeForeverMinutes: number;
  iconUrl: string;
  imageUrl: string;
  storeUrl: string;
}

export interface AppDetails {
  appid: number;
  name?: string;
  capsuleImage?: string;
  developers: string[];
  publishers: string[];
  genres: string[];
  isFree?: boolean;
  storeUrl: string;
}

export interface ArchiveProfile {
  id: number;
  steamid64: string;
  vanityName?: string;
  profileUrl: string;
  lastSyncedAt?: string;
  totalGames?: number;
  totalPlaytimeMinutes?: number;
  createdAt: string;
  updatedAt: string;
}

export interface GameHistoryPoint {
  appid: number;
  playtimeForeverMinutes: number;
  capturedAt: string;
}
