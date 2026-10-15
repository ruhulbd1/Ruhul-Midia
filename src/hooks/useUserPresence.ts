import { useEffect, useRef } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserPresence } from '../types/userPresence';

interface UseUserPresenceProps {
  userId: string;
  userName: string;
  userEmail?: string;
  userPhone?: string;
  points?: number;
  videosWatchedCount?: number;
}

export function useUserPresence({
  userId,
  userName,
  userEmail,
  userPhone,
  points,
  videosWatchedCount
}: UseUserPresenceProps) {
  const isOnlineRef = useRef(true);
  const heartbeatTimerRef = useRef<any>(null);

  useEffect(() => {
    if (!userId) return;

    const detectDevice = () => {
      const ua = navigator.userAgent;
      if (/android/i.test(ua)) return 'Android Device';
      if (/iPad|iPhone|iPod/.test(ua)) return 'iOS Device';
      if (/windows/i.test(ua)) return 'Windows PC';
      if (/macintosh/i.test(ua)) return 'Mac Desktop';
      return 'Web Browser';
    };

    const updatePresence = async (online: boolean) => {
      const now = Date.now();
      isOnlineRef.current = online;

      const presenceData: Partial<UserPresence> = {
        userId,
        userName: userName || 'ইউজার',
        userEmail: userEmail || undefined,
        userPhone: userPhone || undefined,
        online,
        lastSeen: new Date().toISOString(),
        lastActive: now,
        points: typeof points === 'number' ? points : 0,
        videosWatchedCount: typeof videosWatchedCount === 'number' ? videosWatchedCount : 0,
        device: detectDevice()
      };

      // 1. Update in Firestore
      try {
        await setDoc(doc(db, 'users', userId), presenceData, { merge: true });
      } catch (err) {
        // Soft catch if offline
      }

      // 2. Update via server endpoint
      try {
        if (!online && navigator.sendBeacon) {
          const blob = new Blob([JSON.stringify(presenceData)], { type: 'application/json' });
          navigator.sendBeacon('/api/users/presence', blob);
        } else {
          fetch('/api/users/presence', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(presenceData),
            keepalive: true
          }).catch(() => {});
        }
      } catch {}
    };

    // 1. Mark online immediately on connection / app open
    updatePresence(true);

    // 2. Periodic heartbeat every 25 seconds while active
    heartbeatTimerRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') {
        updatePresence(true);
      }
    }, 25000);

    // 3. Tab visibility changes (hidden vs visible)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        updatePresence(false);
      } else {
        updatePresence(true);
      }
    };

    // 4. Browser / Window unload and freeze
    const handleBeforeUnload = () => {
      updatePresence(false);
    };

    const handleOnline = () => {
      updatePresence(true);
    };

    const handleOffline = () => {
      updatePresence(false);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      updatePresence(false);
    };
  }, [userId, userName, userEmail, userPhone, points, videosWatchedCount]);
}
