export interface UserWallet {
  userId: string;
  userName: string;
  userEmail?: string;
  points: number;
  totalEarned: number;
  totalWithdrawn: number;
  videosWatchedCount: number;
  lastActive?: string;
}

export type PaymentMethod = 'bkash' | 'nagad' | 'rocket' | 'recharge';

export interface WithdrawalRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  method: PaymentMethod;
  accountNumber: string;
  points: number;
  amountBdt: number;
  status: 'pending' | 'approved' | 'rejected';
  date: string;
  createdAt: string;
  note?: string;
}

// 100 points = 1 BDT
export const POINTS_PER_BDT = 100;
export const POINTS_PER_VIDEO = 50;
export const POINTS_PER_AD = 30;
export const MIN_WITHDRAW_BDT = 20; // 20 BDT (2,000 points)
export const WATCH_TIME_REQUIRED_SECONDS = 15; // 15 seconds genuine watch time

export interface RewardSettings {
  pointsPerVideoUpload: number;    // Points per video link upload (e.g. 10)
  pointsPerWebsiteVisit: number;   // Points per website/ad visit task (e.g. 15)
  watchDurationSeconds: number;    // Video watch duration in seconds (e.g. 30)
  pointsPerVideoWatch: number;     // Points awarded per video watched (e.g. 25)
  pointsPerBdt?: number;           // Conversion rate points per BDT (default 100)
  minWithdrawBdt?: number;         // Minimum withdrawal in BDT (default 20)
}

export const DEFAULT_REWARD_SETTINGS: RewardSettings = {
  pointsPerVideoUpload: 10,
  pointsPerWebsiteVisit: 15,
  watchDurationSeconds: 15,
  pointsPerVideoWatch: 50,
  pointsPerBdt: 100,
  minWithdrawBdt: 20
};

export function pointsToBdt(points: number, rate: number = POINTS_PER_BDT): number {
  const currentRate = rate > 0 ? rate : POINTS_PER_BDT;
  return Number((points / currentRate).toFixed(2));
}

export function bdtToPoints(bdt: number, rate: number = POINTS_PER_BDT): number {
  const currentRate = rate > 0 ? rate : POINTS_PER_BDT;
  return Math.round(bdt * currentRate);
}
