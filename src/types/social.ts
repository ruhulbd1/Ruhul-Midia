export interface FollowRelation {
  id: string; // `${followerId}_${followingId}`
  followerId: string;
  followerName: string;
  followingId: string;
  followingName: string;
  createdAt: string;
}

export type ActivityType = 'watch_earn' | 'upload_bonus' | 'ad_reward' | 'withdrawal' | 'follow' | 'register';

export interface UserActivity {
  id: string;
  userId: string;
  type: ActivityType;
  title: string;
  details?: string;
  points?: number;
  amountBdt?: number;
  status?: string;
  timestamp: string;
}

export interface AppNotification {
  id: string;
  userId: string; // recipient or 'all'
  title: string;
  message: string;
  type: 'reward' | 'follow' | 'withdrawal' | 'video' | 'system';
  read: boolean;
  timestamp: string;
  actionUrl?: string;
}
