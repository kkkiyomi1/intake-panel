export type DayKey = string; // YYYY-MM-DD

export interface MealEntry {
  preReported: boolean;
  postReported: boolean;
  preTime?: string;
  postTime?: string;
  note?: string;
}

export interface DayRecord {
  date: DayKey;
  meal1: MealEntry;
  meal2: MealEntry;
  commanderReviewed: boolean;
  reason?: string;
  rewardGranted?: boolean;
  consequenceExecuted?: boolean;
  updatedByUid?: string;
  updatedByRole?: Role;
  updatedAt?: number;
}

export interface Settings {
  rewardInterval: number;
  requireCommanderReview: boolean;
  month: number;
  year: number;
  majorRewardLabel: string;
  consequenceLabel: string;
}

export type Role = "commander" | "participant" | "visitor";

export interface RoomMeta {
  roomId: string;
  openJoin: boolean;
  joinCode: string; // 6 digits
  createdAt: number;
}

export interface Member {
  uid: string;
  role: Role;
  createdAt: number;
}
