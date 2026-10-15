export interface UserPresence {
  userId: string;
  userName: string;
  userEmail?: string;
  userPhone?: string;
  online: boolean;
  lastSeen: string;
  lastActive: number; // millisecond timestamp
  points?: number;
  videosWatchedCount?: number;
  device?: string;
  joinedAt?: string;
}

export interface PresenceStats {
  totalRegisteredUsers: number;
  onlineUsersCount: number;
}
