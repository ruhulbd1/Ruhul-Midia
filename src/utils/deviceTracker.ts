import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// 1. Get or Generate Permanent Device ID
export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return 'server_device';
  try {
    let devId = localStorage.getItem('ruhul_midia_device_id') || sessionStorage.getItem('ruhul_midia_device_id');
    if (!devId) {
      // Create persistent device identifier
      const screenRes = typeof window.screen !== 'undefined' 
        ? `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`
        : 'res';
      const rand = Math.random().toString(36).substring(2, 10);
      devId = `dev_${Date.now()}_${rand}`;
      localStorage.setItem('ruhul_midia_device_id', devId);
      sessionStorage.setItem('ruhul_midia_device_id', devId);
    }
    return devId;
  } catch {
    return 'dev_fallback_' + Date.now();
  }
}

// 2. Check if a video has ALREADY been rewarded for this User UID or this Device ID
export async function checkHasClaimedVideoReward(userId: string, videoId: string, deviceId: string): Promise<boolean> {
  if (!videoId) return true;
  
  // 1. Check local fast storage cache first
  try {
    const localUserClaims = JSON.parse(localStorage.getItem(`ruhul_midia_claims_${userId}`) || '[]');
    const localDeviceClaims = JSON.parse(localStorage.getItem('ruhul_midia_claims_device') || '[]');
    if (localUserClaims.includes(videoId) || localDeviceClaims.includes(videoId)) {
      return true;
    }
  } catch {}

  // 2. Check Cloud Firestore reward_claims documents for permanent cross-device verification
  try {
    // Check by user UID
    if (userId) {
      const userClaimSnap = await getDoc(doc(db, 'reward_claims', `user_${userId}_video_${videoId}`));
      if (userClaimSnap.exists()) {
        return true;
      }
    }

    // Check by device ID
    if (deviceId) {
      const deviceClaimSnap = await getDoc(doc(db, 'reward_claims', `device_${deviceId}_video_${videoId}`));
      if (deviceClaimSnap.exists()) {
        return true;
      }
    }
  } catch (err) {
    console.warn('Firestore reward claim check notice:', err);
  }

  return false;
}

// 3. Mark video as rewarded for this User UID and Device ID in Cloud Firestore
export async function recordVideoRewardClaim(userId: string, videoId: string, deviceId: string, points: number): Promise<void> {
  if (!videoId) return;

  const now = new Date().toISOString();

  // 1. Save to local cache
  try {
    const localUserClaims = JSON.parse(localStorage.getItem(`ruhul_midia_claims_${userId}`) || '[]');
    if (!localUserClaims.includes(videoId)) {
      localUserClaims.push(videoId);
      localStorage.setItem(`ruhul_midia_claims_${userId}`, JSON.stringify(localUserClaims));
    }

    const localDeviceClaims = JSON.parse(localStorage.getItem('ruhul_midia_claims_device') || '[]');
    if (!localDeviceClaims.includes(videoId)) {
      localDeviceClaims.push(videoId);
      localStorage.setItem('ruhul_midia_claims_device', JSON.stringify(localDeviceClaims));
    }
  } catch {}

  // 2. Persist to Cloud Firestore for cross-session and cross-account device locking
  try {
    if (userId) {
      await setDoc(doc(db, 'reward_claims', `user_${userId}_video_${videoId}`), {
        userId,
        videoId,
        deviceId,
        claimedAt: now,
        points
      }, { merge: true });
    }

    if (deviceId) {
      await setDoc(doc(db, 'reward_claims', `device_${deviceId}_video_${videoId}`), {
        userId,
        videoId,
        deviceId,
        claimedAt: now,
        points
      }, { merge: true });
    }
  } catch (err) {
    console.warn('Firestore record claim error:', err);
  }
}
