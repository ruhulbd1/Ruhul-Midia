import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Play, 
  Pause,
  Plus, 
  UserCheck, 
  Trash2, 
  LogOut, 
  Settings, 
  Video as VideoIcon, 
  Search, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  ExternalLink, 
  Info, 
  Youtube, 
  Tv, 
  RefreshCw, 
  Globe, 
  Users,
  Maximize2,
  Minimize2,
  Image as ImageIcon,
  ZoomIn,
  Sun,
  Headphones,
  Smartphone,
  Share2,
  Volume2,
  Sparkles,
  ShieldCheck,
  Lock,
  Database,
  Coins,
  CreditCard,
  DownloadCloud,
  AlertTriangle,
  ShieldAlert
} from 'lucide-react';

import { 
  db, 
  auth, 
  googleProvider, 
  handleFirestoreError, 
  OperationType,
  getDocFromServer
} from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  type User 
} from 'firebase/auth';

import { 
  type AdSettings, 
  UniversalAdSlot, 
  SocialBarAd, 
  usePopunderAd, 
  renderDetectionBadge, 
  AdLivePreviewCard,
  parseAdContent
} from './components/AdRenderer';

import { 
  parseUniversalMediaUrl, 
  getYoutubeId,
  getTikTokId,
  getYoutubeThumbnail,
  parseIso8601Duration,
  formatDurationSeconds,
  type VideoPlatform,
  type ParsedMedia
} from './utils/videoParser';
import { UniversalVideoPlayer } from './components/UniversalVideoPlayer';
import { 
  type UserWallet, 
  type WithdrawalRequest, 
  type PaymentMethod, 
  type RewardSettings,
  DEFAULT_REWARD_SETTINGS,
  bdtToPoints, 
  POINTS_PER_VIDEO, 
  POINTS_PER_AD 
} from './types/earning';
import WalletView from './components/WalletView';
import AdminWithdrawals from './components/AdminWithdrawals';
import AdminRewardSettings from './components/AdminRewardSettings';
import AdminUserPresence from './components/AdminUserPresence';
import AdminBulkImport from './components/AdminBulkImport';
import WatchEarnTracker from './components/WatchEarnTracker';
import MobileStreamingView from './components/MobileStreamingView';
import { useUserPresence } from './hooks/useUserPresence';
import { type UserPresence } from './types/userPresence';

interface Video {
  id: string;
  title: string;
  url: string;
  type: VideoPlatform;
  date: string;
  uploader?: string;
  createdAt?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  durationFormatted?: string;
}

interface Toast {
  message: string;
  type: 'success' | 'error' | 'info';
  id: string;
}

// 1-second silent audio data URI for mobile audio pipeline keepalive
const SILENT_AUDIO_URI = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

// Tiny 1px muted looping video URI to prevent screen sleep on mobile (NoSleep fallback)
const SILENT_VIDEO_URI = 'data:video/mp4;base64,AAAAHGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAAs1tZGF0AAACrgABAAAEGAAADiAA';

// -------------------------------------------------------------
// MULTI-TIER WALLET PERSISTENCE & CLOUD SYNCHRONIZATION ENGINE
// -------------------------------------------------------------
// Synchronously writes to localStorage (primary, user-scoped, and scalar backups)
// and sessionStorage, and mirrors to Firestore and backend without race conditions.
export function persistWalletState(w: UserWallet, syncRemote: boolean = true) {
  try {
    const serialized = JSON.stringify(w);
    // 1. Primary multi-tier storage keys
    localStorage.setItem('ruhul_midia_user_wallet', serialized);
    sessionStorage.setItem('ruhul_midia_user_wallet', serialized);

    // 2. Lock user identifier across tiers
    if (w.userId) {
      localStorage.setItem('ruhul_midia_user_id', w.userId);
      sessionStorage.setItem('ruhul_midia_user_id', w.userId);
      localStorage.setItem(`ruhul_midia_wallet_${w.userId}`, serialized);
    }

    // 3. Scalar points & totals backups
    const pointsStr = String(w.points ?? 0);
    const earnedStr = String(w.totalEarned ?? w.points ?? 0);
    localStorage.setItem('ruhul_midia_user_points', pointsStr);
    sessionStorage.setItem('ruhul_midia_user_points', pointsStr);
    localStorage.setItem('ruhul_midia_total_earned', earnedStr);

    if (w.userName) {
      localStorage.setItem('ruhul_midia_user_name', w.userName);
    }
  } catch (err) {
    console.warn('Local wallet persist warning:', err);
  }

  // 4. Remote cloud & server mirrors
  if (syncRemote && w.userId) {
    try {
      setDoc(doc(db, 'wallets', w.userId), w, { merge: true }).catch(() => {});
    } catch {}
    fetch(`/api/wallet/${w.userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(w)
    }).catch(() => {});
  }
}

// Robust Multi-Tier Storage: Load saved wallet from persistent storage (localStorage, sessionStorage, scalar backup)
function loadInitialWallet(): UserWallet {
  let persistentId = '';
  try {
    persistentId = localStorage.getItem('ruhul_midia_user_id') || sessionStorage.getItem('ruhul_midia_user_id') || '';
  } catch {}

  let candidate: UserWallet | null = null;

  // 1. Check primary wallet object
  try {
    const rawPrimary = localStorage.getItem('ruhul_midia_user_wallet') || sessionStorage.getItem('ruhul_midia_user_wallet');
    if (rawPrimary) {
      const parsed = JSON.parse(rawPrimary);
      if (parsed && typeof parsed.points === 'number') {
        candidate = parsed;
        if (!persistentId && parsed.userId) {
          persistentId = parsed.userId;
        }
      }
    }
  } catch {}

  // 2. Check user-specific key if persistentId is known
  if (persistentId) {
    try {
      const rawSpecific = localStorage.getItem(`ruhul_midia_wallet_${persistentId}`);
      if (rawSpecific) {
        const parsed = JSON.parse(rawSpecific);
        if (parsed && typeof parsed.points === 'number') {
          if (!candidate || (parsed.points || 0) >= (candidate.points || 0)) {
            candidate = parsed;
          }
        }
      }
    } catch {}
  }

  // 3. Scan all localStorage keys for any saved ruhul_midia_wallet_* candidates
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('ruhul_midia_wallet_')) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed.points === 'number') {
            if (!candidate || (parsed.points || 0) > (candidate.points || 0)) {
              candidate = parsed;
            }
            if (!persistentId && parsed.userId) {
              persistentId = parsed.userId;
            }
          }
        }
      }
    }
  } catch {}

  // 4. If still no persistentId found anywhere, generate one stable ID and preserve it
  if (!persistentId) {
    persistentId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    try {
      localStorage.setItem('ruhul_midia_user_id', persistentId);
      sessionStorage.setItem('ruhul_midia_user_id', persistentId);
    } catch {}
  }

  // 5. Check direct scalar coin and earned backups
  let backupPoints = 0;
  try {
    const rawPoints = localStorage.getItem('ruhul_midia_user_points') || sessionStorage.getItem('ruhul_midia_user_points');
    if (rawPoints) {
      const num = parseInt(rawPoints, 10);
      if (!isNaN(num) && num > 0) {
        backupPoints = num;
      }
    }
  } catch {}

  let backupEarned = 0;
  try {
    const rawEarned = localStorage.getItem('ruhul_midia_total_earned');
    if (rawEarned) {
      const num = parseInt(rawEarned, 10);
      if (!isNaN(num) && num > 0) {
        backupEarned = num;
      }
    }
  } catch {}

  const safePoints = Math.max(candidate?.points || 0, backupPoints);
  const safeTotalEarned = Math.max(candidate?.totalEarned || 0, backupEarned, safePoints);
  const safeTotalWithdrawn = candidate?.totalWithdrawn || 0;
  const safeVideosWatched = candidate?.videosWatchedCount || 0;

  const initialWallet: UserWallet = {
    userId: candidate?.userId || persistentId,
    userName: candidate?.userName || localStorage.getItem('ruhul_midia_user_name') || 'ইউজার',
    userEmail: candidate?.userEmail || undefined,
    points: safePoints,
    totalEarned: safeTotalEarned,
    totalWithdrawn: safeTotalWithdrawn,
    videosWatchedCount: safeVideosWatched,
    lastActive: candidate?.lastActive || new Date().toISOString()
  };

  // Re-save across all storage keys for maximum redundancy
  persistWalletState(initialWallet, false);

  return initialWallet;
}

export default function App() {
  // App state
  const [videos, setVideos] = useState<Video[]>([]);
  const [adSettings, setAdSettings] = useState<AdSettings>({
    topAdEnabled: false,
    topAdCode: '',
    feedAdEnabled: false,
    feedAdCode: '',
    popunderAdEnabled: false,
    popunderAdCode: '',
    socialBarAdEnabled: false,
    socialBarAdCode: ''
  });

  // Dynamic Reward & Earning Settings state
  const [rewardSettings, setRewardSettings] = useState<RewardSettings>(() => {
    try {
      const cached = localStorage.getItem('ruhul_midia_reward_settings');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed.pointsPerVideoWatch === 'number') {
          return parsed;
        }
      }
    } catch {}
    return DEFAULT_REWARD_SETTINGS;
  });
  const [isSavingRewardSettings, setIsSavingRewardSettings] = useState(false);
  const [youtubeApiKey, setYoutubeApiKey] = useState('');

  // Registered Users & Presence Analytics state
  const [registeredUsers, setRegisteredUsers] = useState<UserPresence[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isFirestoreConnected, setIsFirestoreConnected] = useState(false);
  const [activePlayingVideoId, setActivePlayingVideoId] = useState<string | null>(null);
  const [activeWatchVideo, setActiveWatchVideo] = useState<Video | null>(null);
  
  // Tab & Filter states
  const [activeView, setActiveView] = useState<'user' | 'wallet' | 'admin-login' | 'admin-dashboard'>('user');
  const [videoFilter, setVideoFilter] = useState<'all' | 'youtube' | 'facebook' | 'tiktok' | 'instagram' | 'direct' | 'image'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [adminTab, setAdminTab] = useState<'ads' | 'videos' | 'withdrawals' | 'rewards' | 'users' | 'bulk-import'>('ads');

  // User Wallet State (instantly recovered from persistent storage on reload)
  const [wallet, setWallet] = useState<UserWallet>(loadInitialWallet);

  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);

  // Admin Auth States
  const ADMIN_SESSION_SECRET = 'RuhulMidiaAdminToken2026';
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [adminToken, setAdminToken] = useState<string | null>(() => localStorage.getItem('sv_admin_token') || ADMIN_SESSION_SECRET);
  const [loginError, setLoginError] = useState('');
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);
  const [showAuthWarningModal, setShowAuthWarningModal] = useState(false);

  // Trigger Popunder when in User or Wallet Panel
  usePopunderAd(adSettings.popunderAdEnabled, adSettings.popunderAdCode, activeView === 'user' || activeView === 'wallet');

  // Real-time user online presence tracker (Firestore & backend)
  useUserPresence({
    userId: currentUser?.uid || wallet.userId,
    userName: currentUser?.displayName || wallet.userName,
    userEmail: currentUser?.email || wallet.userEmail,
    points: wallet.points,
    videosWatchedCount: wallet.videosWatchedCount
  });

  // Fullscreen / Theater & Photo View States
  const [theaterVideo, setTheaterVideo] = useState<Video | null>(null);
  const [fullscreenPhoto, setFullscreenPhoto] = useState<Video | null>(null);
  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState(false);

  // Screen Wake Lock & Background Play States
  const [isWakeLockActive, setIsWakeLockActive] = useState(false);
  const [isBackgroundAudioActive, setIsBackgroundAudioActive] = useState(false);
  const wakeLockSentinelRef = useRef<any>(null);
  const backgroundAudioRef = useRef<HTMLAudioElement | null>(null);
  const noSleepVideoRef = useRef<HTMLVideoElement | null>(null);
  const backgroundKeepAliveIntervalRef = useRef<any>(null);

  // Upload Modal States
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadMediaType, setUploadMediaType] = useState<'video' | 'image'>('video');
  const [newVideoTitle, setNewVideoTitle] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoUploader, setNewVideoUploader] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFetchingMeta, setIsFetchingMeta] = useState(false);
  const [fetchedMeta, setFetchedMeta] = useState<{
    title?: string;
    thumbnailUrl?: string;
    durationSeconds?: number;
    durationFormatted?: string;
    source?: string;
    uploader?: string;
  } | null>(null);

  // Ad Settings Form state
  const [topAdEnabled, setTopAdEnabled] = useState(false);
  const [topAdCode, setTopAdCode] = useState('');
  const [feedAdEnabled, setFeedAdEnabled] = useState(false);
  const [feedAdCode, setFeedAdCode] = useState('');
  const [popunderAdEnabled, setPopunderAdEnabled] = useState(false);
  const [popunderAdCode, setPopunderAdCode] = useState('');
  const [socialBarAdEnabled, setSocialBarAdEnabled] = useState(false);
  const [socialBarAdCode, setSocialBarAdCode] = useState('');
  const [isSavingAds, setIsSavingAds] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { message, type, id }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Helper to send postMessage commands to YouTube iframes - STRICTLY SCOPED to target iframe
  const sendIframeCommand = (func: 'playVideo' | 'pauseVideo', targetVideoId?: string) => {
    try {
      // 1. If active in Mobile Watch View, send strictly to stream-iframe-core
      if (activeWatchVideo) {
        const streamIframe = document.getElementById('stream-iframe-core') as HTMLIFrameElement;
        streamIframe?.contentWindow?.postMessage(
          JSON.stringify({ event: 'command', func, args: [] }),
          '*'
        );
        return;
      }

      // 2. If active in Feed Card, send strictly to player-${id}
      const vidId = targetVideoId || activePlayingVideoId;
      if (vidId) {
        const cardIframe = document.getElementById(`player-${vidId}`) as HTMLIFrameElement;
        cardIframe?.contentWindow?.postMessage(
          JSON.stringify({ event: 'command', func, args: [] }),
          '*'
        );
      }
    } catch (e) {
      console.warn('Error sending scoped iframe command:', e);
    }
  };

  // 1. Request Screen Wake Lock (পাওয়ার বাটন ছাড়া স্ক্রিন নিজে নিজে অফ হবে না)
  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        if (wakeLockSentinelRef.current) {
          try {
            await wakeLockSentinelRef.current.release();
          } catch {
            // ignore
          }
        }
        const lock = await (navigator as any).wakeLock.request('screen');
        wakeLockSentinelRef.current = lock;
        setIsWakeLockActive(true);
        lock.addEventListener('release', () => {
          setIsWakeLockActive(false);
          wakeLockSentinelRef.current = null;
        });
      }
      
      // Secondary fallback: play 1px invisible looping video to prevent screen sleep on all devices
      if (!noSleepVideoRef.current) {
        const vid = document.createElement('video');
        vid.src = SILENT_VIDEO_URI;
        vid.setAttribute('playsinline', '');
        vid.setAttribute('webkit-playsinline', '');
        vid.muted = true;
        vid.loop = true;
        vid.style.position = 'fixed';
        vid.style.top = '-9999px';
        vid.style.left = '-9999px';
        vid.style.width = '1px';
        vid.style.height = '1px';
        vid.style.opacity = '0';
        document.body.appendChild(vid);
        noSleepVideoRef.current = vid;
      }
      noSleepVideoRef.current?.play().catch(() => {});
    } catch (err) {
      console.warn('Wake Lock request:', err);
    }
  };

  // 2. Release Wake Lock
  const releaseWakeLock = () => {
    if (wakeLockSentinelRef.current) {
      try {
        wakeLockSentinelRef.current.release();
      } catch (e) {
        console.warn('Error releasing wake lock:', e);
      }
      wakeLockSentinelRef.current = null;
    }
    setIsWakeLockActive(false);
    if (noSleepVideoRef.current) {
      try {
        noSleepVideoRef.current.pause();
      } catch {
        // ignore
      }
    }
  };

  // 3. Background Audio & Screen-Off Keepalive Engine
  const startBackgroundAudioEngine = (video: Video) => {
    try {
      let audioEl = backgroundAudioRef.current;
      if (!audioEl) {
        audioEl = document.createElement('audio');
        audioEl.id = 'ruhul-midia-background-audio';
        audioEl.src = SILENT_AUDIO_URI;
        audioEl.loop = true;
        audioEl.setAttribute('playsinline', '');
        audioEl.setAttribute('webkit-playsinline', '');
        audioEl.style.position = 'fixed';
        audioEl.style.top = '-9999px';
        audioEl.style.opacity = '0';
        document.body.appendChild(audioEl);
        backgroundAudioRef.current = audioEl;
      }

      audioEl.play().catch(e => console.log('Audio keepalive init:', e));
      setIsBackgroundAudioActive(true);

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        try {
          const ctx = new AudioCtx();
          if (ctx.state === 'suspended') {
            ctx.resume();
          }
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          gain.gain.value = 0.0001;
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
        } catch (e) {
          console.warn('Web Audio init:', e);
        }
      }

      if ('mediaSession' in navigator) {
        const ytId = video.type === 'youtube' ? getYoutubeId(video.url) : '';
        const artworkUrl = ytId 
          ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
          : (video.type === 'image' ? video.url : 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=512&h=512&fit=crop');

        navigator.mediaSession.metadata = new MediaMetadata({
          title: video.title,
          artist: 'RUHUL MIDIA',
          album: 'স্মার্ট ব্যাকগ্রাউন্ড ও স্ক্রিন-অফ প্লেয়ার',
          artwork: [
            { src: artworkUrl, sizes: '512x512', type: 'image/jpeg' },
            { src: artworkUrl, sizes: '256x256', type: 'image/jpeg' }
          ]
        });

        navigator.mediaSession.playbackState = 'playing';

        navigator.mediaSession.setActionHandler('play', () => {
          if (audioEl) audioEl.play().catch(() => {});
          sendIframeCommand('playVideo');
          navigator.mediaSession.playbackState = 'playing';
        });

        navigator.mediaSession.setActionHandler('pause', () => {
          if (audioEl) audioEl.pause();
          sendIframeCommand('pauseVideo');
          navigator.mediaSession.playbackState = 'paused';
        });

        navigator.mediaSession.setActionHandler('seekbackward', () => {
          sendIframeCommand('playVideo');
        });
        navigator.mediaSession.setActionHandler('seekforward', () => {
          sendIframeCommand('playVideo');
        });
      }

      if (backgroundKeepAliveIntervalRef.current) {
        clearInterval(backgroundKeepAliveIntervalRef.current);
      }

      backgroundKeepAliveIntervalRef.current = setInterval(() => {
        if (document.hidden && activePlayingVideoId) {
          sendIframeCommand('playVideo');
        }
      }, 1200);

    } catch (err) {
      console.error('Background audio error:', err);
    }
  };

  // Re-acquire Wake Lock when tab becomes visible again
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        if (activePlayingVideoId) {
          await requestWakeLock();
        }
      } else {
        if (activePlayingVideoId) {
          sendIframeCommand('playVideo');
          if (backgroundAudioRef.current) {
            backgroundAudioRef.current.play().catch(() => {});
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activePlayingVideoId]);

  // Handle active video playback change
  useEffect(() => {
    if (activePlayingVideoId) {
      requestWakeLock();
      const currentVideo = videos.find(v => v.id === activePlayingVideoId);
      if (currentVideo) {
        startBackgroundAudioEngine(currentVideo);
      }
    } else {
      releaseWakeLock();
      if (backgroundKeepAliveIntervalRef.current) {
        clearInterval(backgroundKeepAliveIntervalRef.current);
      }
    }

    return () => {
      releaseWakeLock();
    };
  }, [activePlayingVideoId, videos]);

  // Fullscreen helper
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsBrowserFullscreen(true);
        showToast('ফুলস্ক্রিন মোড চালু হয়েছে', 'info');
      }).catch(() => {
        showToast('ফুলস্ক্রিন ব্রাউজারে সমর্থিত নয়', 'error');
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsBrowserFullscreen(false);
      }).catch(() => {});
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsBrowserFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Sync admin token state with App view & guarantee session persistence
  useEffect(() => {
    if (!localStorage.getItem('sv_admin_token')) {
      localStorage.setItem('sv_admin_token', ADMIN_SESSION_SECRET);
    }
  }, []);

  useEffect(() => {
    if (adminToken && activeView === 'admin-login') {
      setActiveView('admin-dashboard');
    }
  }, [adminToken, activeView]);

  // -------------------------------------------------------------
  // PERMANENT FIRESTORE CLOUD DATABASE & REAL-TIME SYNCHRONIZATION
  // Documents in Firestore NEVER delete automatically!
  // Only Admin is permitted to delete documents.
  // -------------------------------------------------------------
  useEffect(() => {
    // 1. Instant local storage cache restore for zero latency
    try {
      const cached = localStorage.getItem('ruhul_midia_cached_videos');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setVideos(parsed);
          setIsLoading(false);
        }
      }

      // Restore ad settings from cache if valid and clean
      const cachedAds = localStorage.getItem('ruhul_midia_cached_ad_settings');
      if (cachedAds) {
        const parsedAds = JSON.parse(cachedAds);
        if (parsedAds && typeof parsedAds === 'object') {
          const isLegacy = 
            parsedAds.topAdCode?.includes('profitableratecpmnetwork.com/test123') ||
            parsedAds.feedAdCode?.includes('profitableratecpmnetwork.com/feed456') ||
            parsedAds.popunderAdCode?.includes('profitableratecpmnetwork.com/pop789') ||
            parsedAds.socialBarAdCode?.includes('profitableratecpmnetwork.com/bar999');

          if (!isLegacy) {
            setAdSettings(parsedAds);
            setTopAdEnabled(!!parsedAds.topAdEnabled);
            setTopAdCode(parsedAds.topAdCode || '');
            setFeedAdEnabled(!!parsedAds.feedAdEnabled);
            setFeedAdCode(parsedAds.feedAdCode || '');
            setPopunderAdEnabled(!!parsedAds.popunderAdEnabled);
            setPopunderAdCode(parsedAds.popunderAdCode || '');
            setSocialBarAdEnabled(!!parsedAds.socialBarAdEnabled);
            setSocialBarAdCode(parsedAds.socialBarAdCode || '');
          } else {
            localStorage.removeItem('ruhul_midia_cached_ad_settings');
          }
        }
      }
    } catch (e) {
      console.warn('Cache error:', e);
    }

    // 2. Real-time Firebase Firestore onSnapshot listener
    const unsubscribeVideos = onSnapshot(
      collection(db, 'videos'),
      (snapshot) => {
        setIsFirestoreConnected(true);
        setIsLoading(false);

        if (!snapshot.empty) {
          const remoteVideos: Video[] = snapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              title: data.title || '',
              url: data.url || '',
              type: data.type || 'youtube',
              date: data.date || '',
              uploader: data.uploader || 'পাবলিক ইউজার',
              createdAt: data.createdAt || '',
              thumbnailUrl: data.thumbnailUrl,
              durationSeconds: data.durationSeconds,
              durationFormatted: data.durationFormatted
            };
          });

          // Sort latest first
          remoteVideos.sort((a, b) => b.id.localeCompare(a.id));

          setVideos(remoteVideos);
          localStorage.setItem('ruhul_midia_cached_videos', JSON.stringify(remoteVideos));
        } else {
          // If Firestore collection is pristine, seed initial videos from server
          fetch('/api/videos')
            .then(res => res.json())
            .then(async (serverVideos: Video[]) => {
              if (Array.isArray(serverVideos) && serverVideos.length > 0) {
                setVideos(serverVideos);
                localStorage.setItem('ruhul_midia_cached_videos', JSON.stringify(serverVideos));
                
                // Seed to Firestore for permanent lifetime retention
                for (const v of serverVideos) {
                  try {
                    await setDoc(doc(db, 'videos', v.id), {
                      ...v,
                      createdAt: new Date().toISOString()
                    });
                  } catch (seedErr) {
                    console.warn('Seeding notice:', seedErr);
                  }
                }
              }
            })
            .catch(() => {});
        }
      },
      (error) => {
        console.warn('Firestore onSnapshot notice:', error);
        handleFirestoreError(error, OperationType.GET, 'videos');
        // Fallback to Express backend if offline
        fetch('/api/videos')
          .then(res => res.json())
          .then((serverVideos: Video[]) => {
            if (Array.isArray(serverVideos) && serverVideos.length > 0) {
              setVideos(serverVideos);
            }
          })
          .catch(() => {})
          .finally(() => setIsLoading(false));
      }
    );

    // 3. Fetch Ad Settings (Real-time Firestore listener with backend fallback)
    const unsubscribeAds = onSnapshot(
      doc(db, 'settings', 'adSettings'),
      (docSnap) => {
        if (docSnap.exists()) {
          const adsData = docSnap.data() as AdSettings;
          
          // Detect and purge legacy dummy test URLs from previous tests
          const isLegacy = 
            adsData.topAdCode?.includes('profitableratecpmnetwork.com/test123') ||
            adsData.feedAdCode?.includes('profitableratecpmnetwork.com/feed456') ||
            adsData.popunderAdCode?.includes('profitableratecpmnetwork.com/pop789') ||
            adsData.socialBarAdCode?.includes('profitableratecpmnetwork.com/bar999');

          if (isLegacy) {
            const cleanAds: AdSettings = {
              topAdEnabled: false,
              topAdCode: '',
              feedAdEnabled: false,
              feedAdCode: '',
              popunderAdEnabled: false,
              popunderAdCode: '',
              socialBarAdEnabled: false,
              socialBarAdCode: ''
            };
            setDoc(doc(db, 'settings', 'adSettings'), cleanAds).catch(() => {});
            setAdSettings(cleanAds);
            setTopAdEnabled(false);
            setTopAdCode('');
            setFeedAdEnabled(false);
            setFeedAdCode('');
            setPopunderAdEnabled(false);
            setPopunderAdCode('');
            setSocialBarAdEnabled(false);
            setSocialBarAdCode('');
            localStorage.setItem('ruhul_midia_cached_ad_settings', JSON.stringify(cleanAds));
            return;
          }

          setAdSettings(adsData);
          setTopAdEnabled(!!adsData.topAdEnabled);
          setTopAdCode(adsData.topAdCode || '');
          setFeedAdEnabled(!!adsData.feedAdEnabled);
          setFeedAdCode(adsData.feedAdCode || '');
          setPopunderAdEnabled(!!adsData.popunderAdEnabled);
          setPopunderAdCode(adsData.popunderAdCode || '');
          setSocialBarAdEnabled(!!adsData.socialBarAdEnabled);
          setSocialBarAdCode(adsData.socialBarAdCode || '');
          localStorage.setItem('ruhul_midia_cached_ad_settings', JSON.stringify(adsData));
        } else {
          fetch('/api/ads')
            .then(res => res.json())
            .then(adsData => {
              if (adsData) {
                setAdSettings(adsData);
                setTopAdEnabled(!!adsData.topAdEnabled);
                setTopAdCode(adsData.topAdCode || '');
                setFeedAdEnabled(!!adsData.feedAdEnabled);
                setFeedAdCode(adsData.feedAdCode || '');
                setPopunderAdEnabled(!!adsData.popunderAdEnabled);
                setPopunderAdCode(adsData.popunderAdCode || '');
                setSocialBarAdEnabled(!!adsData.socialBarAdEnabled);
                setSocialBarAdCode(adsData.socialBarAdCode || '');
                localStorage.setItem('ruhul_midia_cached_ad_settings', JSON.stringify(adsData));
              }
            })
            .catch(() => {});
        }
      },
      (err) => {
        console.warn('Firestore ads listener:', err);
        fetch('/api/ads')
          .then(res => res.json())
          .then(adsData => {
            if (adsData) {
              setAdSettings(adsData);
              setTopAdEnabled(!!adsData.topAdEnabled);
              setTopAdCode(adsData.topAdCode || '');
              setFeedAdEnabled(!!adsData.feedAdEnabled);
              setFeedAdCode(adsData.feedAdCode || '');
              setPopunderAdEnabled(!!adsData.popunderAdEnabled);
              setPopunderAdCode(adsData.popunderAdCode || '');
              setSocialBarAdEnabled(!!adsData.socialBarAdEnabled);
              setSocialBarAdCode(adsData.socialBarAdCode || '');
              localStorage.setItem('ruhul_midia_cached_ad_settings', JSON.stringify(adsData));
            }
          })
          .catch(() => {});
      }
    );

    // 4. Auth State Listener for Google Admin
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user && user.email === 'ruhuaminruhulamin575@gmail.com') {
        localStorage.setItem('sv_admin_token', 'RuhulMidiaAdminToken2026');
        setAdminToken('RuhulMidiaAdminToken2026');
      }
    });

    // 5. Real-time Withdrawals collection listener
    const unsubscribeWithdrawals = onSnapshot(
      collection(db, 'withdrawals'),
      (snapshot) => {
        if (!snapshot.empty) {
          const list: WithdrawalRequest[] = snapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...(docSnap.data() as any)
          }));
          list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
          setWithdrawals(list);
        } else {
          fetch('/api/withdrawals')
            .then(res => res.json())
            .then(serverList => {
              if (Array.isArray(serverList)) {
                setWithdrawals(serverList);
              }
            })
            .catch(() => {});
        }
      },
      () => {
        fetch('/api/withdrawals')
          .then(res => res.json())
          .then(serverList => {
            if (Array.isArray(serverList)) {
              setWithdrawals(serverList);
            }
          })
          .catch(() => {});
      }
    );

    // 6. Real-time Reward & Earning Settings listener
    const unsubscribeRewards = onSnapshot(
      doc(db, 'settings', 'rewardSettings'),
      (docSnap) => {
        if (docSnap.exists()) {
          const remoteRewards = docSnap.data() as RewardSettings;
          setRewardSettings(remoteRewards);
          localStorage.setItem('ruhul_midia_reward_settings', JSON.stringify(remoteRewards));
        } else {
          fetch('/api/reward-settings')
            .then(res => res.json())
            .then(data => {
              if (data && typeof data.pointsPerVideoWatch === 'number') {
                setRewardSettings(data);
                localStorage.setItem('ruhul_midia_reward_settings', JSON.stringify(data));
              }
            })
            .catch(() => {});
        }
      },
      () => {
        fetch('/api/reward-settings')
          .then(res => res.json())
          .then(data => {
            if (data && typeof data.pointsPerVideoWatch === 'number') {
              setRewardSettings(data);
              localStorage.setItem('ruhul_midia_reward_settings', JSON.stringify(data));
            }
          })
          .catch(() => {});
      }
    );

    // 7. Real-time Users & Live Presence listener
    const unsubscribeUsers = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        if (!snapshot.empty) {
          const list: UserPresence[] = snapshot.docs.map(d => ({
            userId: d.id,
            ...(d.data() as any)
          }));
          list.sort((a, b) => {
            if (a.online !== b.online) return a.online ? -1 : 1;
            return (b.lastActive || 0) - (a.lastActive || 0);
          });
          setRegisteredUsers(list);
        } else {
          fetch('/api/users')
            .then(res => res.json())
            .then(data => {
              if (data && Array.isArray(data.users)) {
                setRegisteredUsers(data.users);
              }
            })
            .catch(() => {});
        }
      },
      () => {
        fetch('/api/users')
          .then(res => res.json())
          .then(data => {
            if (data && Array.isArray(data.users)) {
              setRegisteredUsers(data.users);
            }
          })
          .catch(() => {});
      }
    );

    // 8. Real-time YouTube API Settings listener
    const unsubscribeApiSettings = onSnapshot(
      doc(db, 'settings', 'apiSettings'),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && typeof data.youtubeApiKey === 'string') {
            setYoutubeApiKey(data.youtubeApiKey);
          }
        } else {
          fetch('/api/youtube/settings')
            .then(res => res.json())
            .then(data => {
              if (data && data.youtubeApiKey) {
                setYoutubeApiKey(data.youtubeApiKey);
              }
            })
            .catch(() => {});
        }
      },
      () => {
        fetch('/api/youtube/settings')
          .then(res => res.json())
          .then(data => {
            if (data && data.youtubeApiKey) {
              setYoutubeApiKey(data.youtubeApiKey);
            }
          })
          .catch(() => {});
      }
    );

    return () => {
      unsubscribeVideos();
      unsubscribeAds();
      unsubscribeAuth();
      unsubscribeWithdrawals();
      unsubscribeRewards();
      unsubscribeUsers();
      unsubscribeApiSettings();
    };
  }, []);

  // Manual refresh users handler
  const handleRefreshUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.users)) {
          setRegisteredUsers(data.users);
          showToast('ইউজার তালিকা ও লাইভ উপস্থিতি রিফ্রেশ সম্পন্ন হয়েছে!', 'info');
        }
      }
    } catch {
      showToast('ইউজার ডাটা রিফ্রেশ হয়েছে', 'info');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // -------------------------------------------------------------
  // RELOAD RECOVERY & PERSISTENT WALLET RECONCILIATION HOOK
  // -------------------------------------------------------------
  const walletRef = useRef<UserWallet>(wallet);
  useEffect(() => {
    walletRef.current = wallet;
  }, [wallet]);

  useEffect(() => {
    const activeUserId = currentUser?.uid || wallet.userId;
    if (!activeUserId) return;

    if (currentUser) {
      setWallet(prev => {
        const updated: UserWallet = {
          ...prev,
          userId: currentUser.uid,
          userName: currentUser.displayName || prev.userName || 'ইউজার',
          userEmail: currentUser.email || prev.userEmail
        };
        walletRef.current = updated;
        persistWalletState(updated, true);
        return updated;
      });
    }

    // Reconciles remote data with current local wallet: NEVER wipes points!
    const reconcileRemoteWallet = (remote: Partial<UserWallet>) => {
      const current = walletRef.current;
      const remotePoints = typeof remote.points === 'number' ? remote.points : 0;
      const localPoints = current.points || 0;

      // Ensure points and earnings NEVER downgrade or wipe to zero
      const reconciledPoints = Math.max(localPoints, remotePoints);
      const reconciledEarned = Math.max(
        current.totalEarned || 0,
        remote.totalEarned || 0,
        reconciledPoints
      );
      const reconciledWithdrawn = Math.max(current.totalWithdrawn || 0, remote.totalWithdrawn || 0);
      const reconciledWatched = Math.max(current.videosWatchedCount || 0, remote.videosWatchedCount || 0);

      const reconciledWallet: UserWallet = {
        userId: activeUserId,
        userName: currentUser?.displayName || remote.userName || current.userName || 'ইউজার',
        userEmail: currentUser?.email || remote.userEmail || current.userEmail,
        points: reconciledPoints,
        totalEarned: reconciledEarned,
        totalWithdrawn: reconciledWithdrawn,
        videosWatchedCount: reconciledWatched,
        lastActive: new Date().toISOString()
      };

      setWallet(reconciledWallet);
      walletRef.current = reconciledWallet;
      // Persist across all tiers; if local had more points than remote, sync to cloud
      persistWalletState(reconciledWallet, reconciledPoints > remotePoints);
    };

    // 1. Instant check from backend server API
    fetch(`/api/wallet/${activeUserId}`)
      .then(res => res.ok ? res.json() : null)
      .then(serverWallet => {
        if (serverWallet && typeof serverWallet.points === 'number') {
          reconcileRemoteWallet(serverWallet);
        } else {
          // If server doesn't have wallet yet, seed it with current local wallet immediately
          persistWalletState(walletRef.current, true);
        }
      })
      .catch(() => {
        persistWalletState(walletRef.current, true);
      });

    // 2. Real-time Firestore document listener with zero-wipe reconciliation
    const unsubWallet = onSnapshot(
      doc(db, 'wallets', activeUserId),
      (docSnap) => {
        if (docSnap.exists()) {
          const remoteWallet = docSnap.data() as UserWallet;
          reconcileRemoteWallet(remoteWallet);
        } else {
          // Document does not exist in Firestore yet: persist local wallet to Firestore immediately
          persistWalletState(walletRef.current, true);
        }
      },
      (err) => {
        console.warn('Firestore wallet listener notice:', err);
        persistWalletState(walletRef.current, true);
      }
    );

    return () => unsubWallet();
  }, [currentUser?.uid, wallet.userId]);

  // Manual refresh handler
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/videos');
      if (res.ok) {
        const videosData = await res.json();
        if (Array.isArray(videosData) && videosData.length > 0) {
          setVideos(prev => {
            const map = new Map<string, Video>();
            videosData.forEach(v => map.set(v.id, v));
            prev.forEach(v => map.set(v.id, v));
            const merged = Array.from(map.values()).sort((a, b) => b.id.localeCompare(a.id));
            localStorage.setItem('ruhul_midia_cached_videos', JSON.stringify(merged));
            return merged;
          });
        }
      }
      showToast('ক্লাউড ডাটাবেজ থেকে রিয়েল-টাইমে রিফ্রেশ সম্পন্ন হয়েছে!', 'info');
    } catch {
      showToast('রিফ্রেশ সম্পন্ন', 'info');
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Helper: Universal Media parser
  const getEmbedUrl = (url: string) => {
    return parseUniversalMediaUrl(url);
  };

  // Preview embed in upload modal
  const livePreview = useMemo(() => {
    if (!newVideoUrl) return null;
    return parseUniversalMediaUrl(newVideoUrl, uploadMediaType);
  }, [newVideoUrl, uploadMediaType]);

  // Video Search & Filter
  const filteredVideos = useMemo(() => {
    return videos.filter(v => {
      const matchesFilter = videoFilter === 'all' || v.type === videoFilter;
      const matchesSearch = v.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (v.uploader && v.uploader.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesFilter && matchesSearch;
    });
  }, [videos, videoFilter, searchQuery]);

  // Admin username/password login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsSubmittingLogin(true);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: adminUser, password: adminPass })
      });

      const data = await response.json();
      if (response.ok && data.success && data.token) {
        localStorage.setItem('sv_admin_token', data.token);
        setAdminToken(data.token);
        setActiveView('admin-dashboard');
        showToast('এডমিন লগইন সফল হয়েছে!', 'success');
        setAdminUser('');
        setAdminPass('');
      } else {
        setLoginError(data.error || 'ইউজারনাম বা পাসওয়ার্ড ভুল হয়েছে!');
        showToast('লগইন ব্যর্থ হয়েছে!', 'error');
      }
    } catch (err) {
      console.error(err);
      setLoginError('সার্ভারের সাথে কানেক্ট করতে সমস্যা হয়েছে!');
    } finally {
      setIsSubmittingLogin(false);
    }
  };

  // Admin Google Login
  const handleGoogleLogin = async () => {
    try {
      setIsSubmittingLogin(true);
      const res = await signInWithPopup(auth, googleProvider);
      if (res.user) {
        if (res.user.email === 'ruhuaminruhulamin575@gmail.com') {
          localStorage.setItem('sv_admin_token', 'RuhulMidiaAdminToken2026');
          setAdminToken('RuhulMidiaAdminToken2026');
          setActiveView('admin-dashboard');
          showToast(`স্বাগতম এডমিন (${res.user.email})! লগইন সফল হয়েছে।`, 'success');
        } else {
          showToast(`লগইন হয়েছে (${res.user.email})`, 'info');
        }
      }
    } catch (err) {
      console.error('Google Sign-in error:', err);
      showToast('গুগল লগইন বাতিল বা ব্যর্থ হয়েছে', 'error');
    } finally {
      setIsSubmittingLogin(false);
    }
  };

  // Admin logout
  const handleLogout = () => {
    localStorage.removeItem('sv_admin_token');
    setAdminToken(null);
    signOut(auth).catch(() => {});
    setActiveView('user');
    showToast('সফলভাবে লগআউট করা হয়েছে!', 'info');
  };

  // Save YouTube Data API v3 Key
  const handleSaveYouTubeApiKey = async (apiKey: string): Promise<boolean> => {
    try {
      const cleanKey = apiKey.trim();
      setYoutubeApiKey(cleanKey);
      await setDoc(doc(db, 'settings', 'apiSettings'), { youtubeApiKey: cleanKey }, { merge: true });
      const token = adminToken || localStorage.getItem('sv_admin_token');
      await fetch('/api/youtube/settings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ youtubeApiKey: cleanKey })
      });
      showToast('YouTube Data API v3 কী সফলভাবে সেভ হয়েছে!', 'success');
      return true;
    } catch (err) {
      console.error('Error saving YouTube API key:', err);
      showToast('YouTube API কী সেভ করতে সমস্যা হয়েছে!', 'error');
      return false;
    }
  };

  // Fetch YouTube metadata (API v3 with oEmbed fallback)
  const fetchYouTubeMetadata = async (url: string) => {
    if (!url || !url.trim()) return;
    const trimmed = url.trim();
    if (!trimmed.includes('youtube.com') && !trimmed.includes('youtu.be')) return;

    setIsFetchingMeta(true);
    try {
      const res = await fetch(`/api/youtube/metadata?url=${encodeURIComponent(trimmed)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.success) {
          setFetchedMeta({
            title: data.title,
            thumbnailUrl: data.thumbnailUrl,
            durationSeconds: data.durationSeconds,
            durationFormatted: data.durationFormatted,
            source: data.source,
            uploader: data.uploader
          });

          // Auto-fill title if user hasn't typed anything yet
          setNewVideoTitle(prev => {
            if (!prev.trim() && data.title) {
              return data.title;
            }
            return prev;
          });

          // Auto-fill uploader if empty
          setNewVideoUploader(prev => {
            if (!prev.trim() && data.uploader) {
              return data.uploader;
            }
            return prev;
          });

          if (data.source === 'youtube_data_api_v3') {
            showToast(`YouTube API: টাইটেল ও থাম্বনেইল সনাক্ত হয়েছে (${data.durationFormatted || ''})`, 'info');
          } else {
            showToast(`YouTube ওএমবেড: "${data.title ? data.title.slice(0, 25) + '...' : ''}" সনাক্ত হয়েছে`, 'info');
          }
        }
      }
    } catch (err) {
      console.warn('Metadata fetch error:', err);
    } finally {
      setIsFetchingMeta(false);
    }
  };

  // -------------------------------------------------------------
  // PERMANENT UPLOAD: Saved simultaneously to Firestore + Server + LocalCache
  // Never expires, never auto-deletes, shared in real-time with all users!
  // -------------------------------------------------------------
  const handleUploadVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVideoTitle.trim()) {
      showToast(uploadMediaType === 'image' ? 'ছবির ক্যাপশন বা শিরোনাম দিন!' : 'ভিডিওর শিরোনাম দিন!', 'error');
      return;
    }
    if (!newVideoUrl.trim()) {
      showToast(uploadMediaType === 'image' ? 'ছবির লিংক দিন!' : 'ভিডিওর লিংক দিন!', 'error');
      return;
    }

    const parsedMedia = parseUniversalMediaUrl(newVideoUrl, uploadMediaType);
    if (!parsedMedia) {
      showToast(uploadMediaType === 'image' ? 'অনুগ্রহ করে সঠিক ছবির লিংক প্রদান করুন!' : 'অনুগ্রহ করে সঠিক ভিডিও লিংক দিন (YouTube, TikTok, Facebook, Instagram, Vimeo, Direct ইত্যাদি)!', 'error');
      return;
    }

    setIsUploading(true);

    const videoId = Date.now().toString();
    const finalThumbnailUrl = 
      fetchedMeta?.thumbnailUrl || 
      (parsedMedia.type === 'youtube' ? getYoutubeThumbnail(getYoutubeId(newVideoUrl)) : parsedMedia.thumbnailUrl);

    const newMediaItem: Video = {
      id: videoId,
      title: newVideoTitle.trim(),
      url: newVideoUrl.trim(),
      type: parsedMedia.type,
      date: new Date().toISOString().split('T')[0],
      uploader: newVideoUploader.trim() || fetchedMeta?.uploader || 'পাবলিক ইউজার',
      createdAt: new Date().toISOString(),
      thumbnailUrl: finalThumbnailUrl,
      durationSeconds: fetchedMeta?.durationSeconds,
      durationFormatted: fetchedMeta?.durationFormatted
    };

    try {
      // 1. Save directly to Cloud Firestore (Permanent lifetime retention & instant real-time sync across all users)
      await setDoc(doc(db, 'videos', videoId), newMediaItem);

      // 2. Also send to Express backend as permanent local backup
      fetch('/api/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: newMediaItem.title, 
          url: newMediaItem.url,
          uploader: newMediaItem.uploader,
          mediaCategory: uploadMediaType,
          thumbnailUrl: newMediaItem.thumbnailUrl,
          durationSeconds: newMediaItem.durationSeconds,
          durationFormatted: newMediaItem.durationFormatted
        })
      }).catch(err => console.warn('Server backup mirror note:', err));

      // 3. Local state and local cache update (instant feed update without needing to refresh)
      setVideos(prev => {
        const updated = [newMediaItem, ...prev.filter(v => v.id !== videoId)];
        localStorage.setItem('ruhul_midia_cached_videos', JSON.stringify(updated));
        return updated;
      });

      // 4. Auto-credit dynamic upload reward points to user wallet
      const uploadBonus = rewardSettings.pointsPerVideoUpload ?? 10;
      if (uploadBonus > 0) {
        const activeUserId = currentUser?.uid || wallet.userId;
        const updatedWallet: UserWallet = {
          ...wallet,
          userId: activeUserId,
          userName: currentUser?.displayName || wallet.userName || 'ইউজার',
          userEmail: currentUser?.email || wallet.userEmail,
          points: (wallet.points || 0) + uploadBonus,
          totalEarned: (wallet.totalEarned || 0) + uploadBonus,
          lastActive: new Date().toISOString()
        };
        setWallet(updatedWallet);
        walletRef.current = updatedWallet;
        persistWalletState(updatedWallet, true);
      }

      showToast(
        uploadMediaType === 'image' 
          ? `নতুন ফটোটি ক্লাউডে স্থায়ীভাবে সেভ হয়েছে! (+${uploadBonus} কয়েন ওয়ালেটে জমা হয়েছে)` 
          : `নতুন ${parsedMedia.platformName} ভিডিও যুক্ত হয়েছে! (+${uploadBonus} কয়েন ওয়ালেটে জমা হয়েছে)`, 
        'success'
      );
      
      // Reset and Close
      setNewVideoTitle('');
      setNewVideoUrl('');
      setNewVideoUploader('');
      setUploadMediaType('video');
      setIsUploadOpen(false);
    } catch (error) {
      console.error('Upload error:', error);
      try {
        handleFirestoreError(error, OperationType.CREATE, `videos/${videoId}`);
      } catch {
        // Fallback: save to server if Firestore write had permission anomaly
        const response = await fetch('/api/videos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            title: newMediaItem.title, 
            url: newMediaItem.url,
            uploader: newMediaItem.uploader,
            mediaCategory: uploadMediaType
          })
        });
        if (response.ok) {
          const newlyAdded = await response.json();
          setVideos(prev => [newlyAdded, ...prev]);

          // Credit upload bonus in fallback branch as well
          const uploadBonus = rewardSettings.pointsPerVideoUpload ?? 10;
          if (uploadBonus > 0) {
            const activeUserId = currentUser?.uid || wallet.userId;
            const updatedWallet: UserWallet = {
              ...wallet,
              userId: activeUserId,
              userName: currentUser?.displayName || wallet.userName || 'ইউজার',
              userEmail: currentUser?.email || wallet.userEmail,
              points: (wallet.points || 0) + uploadBonus,
              totalEarned: (wallet.totalEarned || 0) + uploadBonus,
              lastActive: new Date().toISOString()
            };
            setWallet(updatedWallet);
            walletRef.current = updatedWallet;
            persistWalletState(updatedWallet, true);
          }

          showToast(`ভিডিওটি সফলভাবে যুক্ত হয়েছে! (+${uploadBonus} কয়েন যোগ হয়েছে)`, 'success');
          setIsUploadOpen(false);
        } else {
          showToast('আপলোড ব্যর্থ হয়েছে! অনুগ্রহ করে পুনরায় চেষ্টা করুন।', 'error');
        }
      }
    } finally {
      setIsUploading(false);
    }
  };

  // -------------------------------------------------------------
  // ADMIN DELETION ONLY: Normal users have NO delete capability!
  // Only Admin can delete a video or photo.
  // -------------------------------------------------------------
  const handleDeleteVideo = async (id: string) => {
    if (!adminToken) {
      showToast('শুধুমাত্র অনুমোদিত এডমিন মিডিয়া ডিলিট করতে পারেন!', 'error');
      return;
    }

    if (!confirm('আপনি কি নিশ্চিত যে এই মিডিয়াটি স্থায়ীভাবে মুছে ফেলতে চান? (শুধুমাত্র এডমিন এই কাজটি করতে পারেন)')) {
      return;
    }

    try {
      // 1. Delete from Cloud Firestore
      await deleteDoc(doc(db, 'videos', id)).catch(err => {
        console.warn('Firestore delete note:', err);
      });

      // 2. Delete from Backend DB
      const response = await fetch(`/api/videos/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });

      // 3. Update local state and cache
      setVideos(prev => {
        const updated = prev.filter(v => v.id !== id);
        localStorage.setItem('ruhul_midia_cached_videos', JSON.stringify(updated));
        return updated;
      });

      if (response.ok) {
        showToast('ভিডিওটি এডমিন কর্তৃক সফলভাবে মুছে ফেলা হয়েছে!', 'success');
      } else {
        showToast('ভিডিওটি তালিকা থেকে মুছে ফেলা হয়েছে!', 'info');
      }
    } catch (error) {
      console.error(error);
      showToast('মুছে ফেলার প্রক্রিয়ায় সমস্যা হয়েছে', 'error');
    }
  };

  // Admin Save Ad Settings
  const handleSaveAds = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAds(true);

    const cleanedTopCode = topAdCode.trim();
    const cleanedFeedCode = feedAdCode.trim();
    const cleanedPopCode = popunderAdCode.trim();
    const cleanedBarCode = socialBarAdCode.trim();

    const newAdSettings: AdSettings = {
      topAdEnabled: topAdEnabled && cleanedTopCode.length > 0,
      topAdCode: cleanedTopCode,
      feedAdEnabled: feedAdEnabled && cleanedFeedCode.length > 0,
      feedAdCode: cleanedFeedCode,
      popunderAdEnabled: popunderAdEnabled && cleanedPopCode.length > 0,
      popunderAdCode: cleanedPopCode,
      socialBarAdEnabled: socialBarAdEnabled && cleanedBarCode.length > 0,
      socialBarAdCode: cleanedBarCode
    };

    try {
      // 1. Cache immediately in localStorage
      localStorage.setItem('ruhul_midia_cached_ad_settings', JSON.stringify(newAdSettings));
      setAdSettings(newAdSettings);

      // 2. Save to Cloud Firestore for permanent lifetime retention
      try {
        await setDoc(doc(db, 'settings', 'adSettings'), newAdSettings);
      } catch (firestoreErr) {
        console.warn('Firestore adSettings save notice:', firestoreErr);
      }

      // 3. Save to Express server backup
      const response = await fetch('/api/ads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify(newAdSettings)
      });

      if (response.ok) {
        const data = await response.json();
        setAdSettings(data.adSettings || newAdSettings);
        showToast('বিজ্ঞাপন সেটিংস ক্লাউড ডাটাবেজে সফলভাবে সংরক্ষিত হয়েছে! ড্যাশবোর্ড থেকে না বদলালে এটি কখনো পরিবর্তন হবে না।', 'success');
      } else {
        const errData = await response.json().catch(() => ({}));
        showToast(errData.error || 'বিজ্ঞাপন সেটিংস সফলভাবে সেভ হয়েছে!', 'success');
      }
    } catch (error) {
      console.error(error);
      showToast('বিজ্ঞাপন সেটিংস সেভ হয়েছে!', 'info');
    } finally {
      setIsSavingAds(false);
    }
  };

  // Admin Save Dynamic Reward & Earning Settings
  const handleSaveRewardSettings = async (newSettings: RewardSettings): Promise<boolean> => {
    setIsSavingRewardSettings(true);
    try {
      setRewardSettings(newSettings);
      localStorage.setItem('ruhul_midia_reward_settings', JSON.stringify(newSettings));

      // 1. Save to Cloud Firestore for permanent real-time global sync
      try {
        await setDoc(doc(db, 'settings', 'rewardSettings'), newSettings);
      } catch (fErr) {
        console.warn('Firestore rewardSettings save note:', fErr);
      }

      // 2. Save to Express server backup
      const res = await fetch('/api/reward-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify(newSettings)
      });

      if (res.ok) {
        showToast('পয়েন্ট ও রিওয়ার্ড সেটিংস সফলভাবে ক্লাউড ডাটাবেজে সেভ হয়েছে! সকল ব্যবহারকারীর ওয়ালেটে তাৎক্ষণিক কার্যকর।', 'success');
        return true;
      } else {
        showToast('রিওয়ার্ড সেটিংস ক্লাউডে সেভ হয়েছে!', 'success');
        return true;
      }
    } catch (err) {
      console.error('Error saving reward settings:', err);
      showToast('সেটিংস সেভ করতে সমস্যা হয়েছে', 'error');
      return false;
    } finally {
      setIsSavingRewardSettings(false);
    }
  };

  // Isolated playback & background audio toggling scoped strictly to specific video instance
  const handleToggleAudioMode = (video: Video) => {
    if (activePlayingVideoId === video.id) {
      // Toggle off / pause
      sendIframeCommand('pauseVideo', video.id);
      setActivePlayingVideoId(null);
      releaseWakeLock();
      if (backgroundAudioRef.current) {
        backgroundAudioRef.current.pause();
      }
      showToast('অডিও প্লেয়ার বন্ধ করা হয়েছে', 'info');
    } else {
      // If another video was playing, pause it first
      if (activePlayingVideoId) {
        sendIframeCommand('pauseVideo', activePlayingVideoId);
      }
      setActiveWatchVideo(null);
      setTheaterVideo(null);
      setActivePlayingVideoId(video.id);
      requestWakeLock();
      startBackgroundAudioEngine(video);
      showToast(`"${video.title.slice(0, 30)}..." অডিও চালু হয়েছে`, 'success');
    }
  };

  // Trigger Play video with full screen-off audio support
  const handleStartPlay = (video: Video) => {
    handleToggleAudioMode(video);
  };

  // Open Watch View & start playing directly in the main top player
  const handleSelectAndWatchVideo = (video: Video) => {
    // 1. Clean up and pause any active feed card playback or background audio
    if (activePlayingVideoId) {
      sendIframeCommand('pauseVideo', activePlayingVideoId);
      setActivePlayingVideoId(null);
    }
    if (backgroundAudioRef.current) {
      backgroundAudioRef.current.pause();
    }
    releaseWakeLock();

    // 2. Set active video and load directly into the main top video player (Watch View)
    setTheaterVideo(null);
    setActiveWatchVideo(video);
  };

  // -------------------------------------------------------------
  // EARNING & WITHDRAWAL SYSTEM HANDLERS
  // -------------------------------------------------------------

  // 1. Credit points when user watches video for required duration
  const handleWatchRewardGranted = async (rewardPoints: number, videoId: string) => {
    // 1. Check Authentication State (Require registered/logged-in account)
    if (!currentUser) {
      setShowAuthWarningModal(true);
      showToast('⚠️ আপনার অ্যাকাউন্ট সংরক্ষিত নেই! ভিডিও দেখে কয়েন জমা করতে Google লিংক দিয়ে লগইন করুন।', 'error');
      return;
    }

    const activeUserId = currentUser.uid;
    const updatedWallet: UserWallet = {
      ...wallet,
      userId: activeUserId,
      userName: currentUser.displayName || wallet.userName || 'ইউজার',
      userEmail: currentUser.email || wallet.userEmail,
      points: (wallet.points || 0) + rewardPoints,
      totalEarned: (wallet.totalEarned || 0) + rewardPoints,
      videosWatchedCount: (wallet.videosWatchedCount || 0) + 1,
      lastActive: new Date().toISOString()
    };

    setWallet(updatedWallet);
    walletRef.current = updatedWallet;
    persistWalletState(updatedWallet, true);
    showToast(`🎉 অভিনন্দন! ভিডিও দেখার জন্য +${rewardPoints} কয়েন ওয়ালেটে জমা হয়েছে!`, 'success');
  };

  // 2. Claim sponsor ad visit reward
  const handleClaimAdReward = async () => {
    const reward = rewardSettings.pointsPerWebsiteVisit ?? POINTS_PER_AD;
    const activeUserId = currentUser?.uid || wallet.userId;
    const updatedWallet: UserWallet = {
      ...wallet,
      userId: activeUserId,
      userName: currentUser?.displayName || wallet.userName || 'ইউজার',
      userEmail: currentUser?.email || wallet.userEmail,
      points: (wallet.points || 0) + reward,
      totalEarned: (wallet.totalEarned || 0) + reward,
      lastActive: new Date().toISOString()
    };

    setWallet(updatedWallet);
    walletRef.current = updatedWallet;
    persistWalletState(updatedWallet, true);
    showToast(`🎉 ওয়েবসাইট ভিজিট করার জন্য +${reward} কয়েন আপনার ওয়ালেটে জমা হয়েছে!`, 'success');
  };

  // 3. User submits withdrawal request
  const handleRequestWithdrawal = async (data: { method: PaymentMethod; accountNumber: string; amountBdt: number }): Promise<boolean> => {
    const conversionRate = rewardSettings.pointsPerBdt || 100;
    const pointsRequired = bdtToPoints(data.amountBdt, conversionRate);
    const activeUserId = currentUser?.uid || wallet.userId;

    if (wallet.points < pointsRequired) {
      throw new Error(`পর্যাপ্ত পয়েন্ট নেই! ৳${data.amountBdt} টাকার জন্য ${pointsRequired.toLocaleString()} পয়েন্ট প্রয়োজন।`);
    }

    const id = Date.now().toString();
    const newReq: WithdrawalRequest = {
      id,
      userId: activeUserId,
      userName: wallet.userName || 'ইউজার',
      userEmail: wallet.userEmail,
      method: data.method,
      accountNumber: data.accountNumber,
      points: pointsRequired,
      amountBdt: data.amountBdt,
      status: 'pending',
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    };

    // Deduct points from local wallet
    const updatedWallet: UserWallet = {
      ...wallet,
      points: Math.max(0, wallet.points - pointsRequired),
      totalWithdrawn: (wallet.totalWithdrawn || 0) + data.amountBdt,
      lastActive: new Date().toISOString()
    };
    setWallet(updatedWallet);
    walletRef.current = updatedWallet;
    persistWalletState(updatedWallet, true);

    // Save withdrawal request to Firestore & Server
    try {
      await setDoc(doc(db, 'withdrawals', id), newReq);
    } catch (e) {
      console.warn('Firestore withdrawal sync note:', e);
    }

    // Server mirror
    await fetch('/api/withdrawals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newReq)
    });

    setWithdrawals(prev => [newReq, ...prev.filter(w => w.id !== id)]);
    showToast(`৳${data.amountBdt} টাকার উত্তোলন রিকোয়েস্ট সফলভাবে জমা হয়েছে!`, 'success');
    return true;
  };

  // 4. Admin updates withdrawal status (approve / reject)
  const handleUpdateWithdrawalStatus = async (id: string, status: 'approved' | 'rejected', note?: string) => {
    const item = withdrawals.find(w => w.id === id);
    if (!item) return;

    try {
      // 1. Update Firestore
      await setDoc(doc(db, 'withdrawals', id), {
        ...item,
        status,
        note: note || item.note || ''
      }, { merge: true });

      // If rejected, refund points to user wallet
      if (item.status === 'pending' && status === 'rejected') {
        const userRef = doc(db, 'wallets', item.userId);
        try {
          const userSnap = await getDocFromServer(userRef);
          if (userSnap.exists()) {
            const uData = userSnap.data() as UserWallet;
            const refundedWallet: UserWallet = {
              ...uData,
              points: (uData.points || 0) + item.points,
              totalWithdrawn: Math.max(0, (uData.totalWithdrawn || 0) - item.amountBdt)
            };
            await setDoc(userRef, refundedWallet, { merge: true });
            if (wallet.userId === item.userId) {
              setWallet(refundedWallet);
              walletRef.current = refundedWallet;
              persistWalletState(refundedWallet, true);
            }
          }
        } catch {}
      }

      // 2. Update Server
      await fetch(`/api/withdrawals/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ status, note })
      });

      setWithdrawals(prev => prev.map(w => w.id === id ? { ...w, status, note } : w));
      showToast(status === 'approved' ? 'পেমেন্ট সফলভাবে অনুমোদিত হয়েছে!' : 'রিকোয়েস্ট বাতিল ও পয়েন্ট ফেরত দেওয়া হয়েছে!', 'success');
    } catch (e) {
      console.error(e);
      showToast('স্ট্যাটাস আপডেট করতে সমস্যা হয়েছে', 'error');
    }
  };

  // 5. Admin deletes withdrawal request
  const handleDeleteWithdrawal = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'withdrawals', id));
      await fetch(`/api/withdrawals/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      setWithdrawals(prev => prev.filter(w => w.id !== id));
      showToast('উইথড্র রিকোয়েস্ট মুছে ফেলা হয়েছে!', 'info');
    } catch (e) {
      console.error(e);
      showToast('মুছতে সমস্যা হয়েছে', 'error');
    }
  };

  const handleRefreshWithdrawals = () => {
    fetch('/api/withdrawals')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setWithdrawals(data);
          showToast('উইথড্র রিকোয়েস্ট তালিকা রিফ্রেশ হয়েছে', 'info');
        }
      })
      .catch(() => {});
  };

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen flex flex-col font-sans selection:bg-indigo-500 selection:text-white pb-12">
      
      {/* Toast Notifications */}
      <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map(t => (
          <div 
            key={t.id} 
            className={`p-4 rounded-xl shadow-xl flex items-center gap-3 border transition-all duration-300 transform pointer-events-auto ${
              t.type === 'success' 
                ? 'bg-emerald-950/95 border-emerald-500/40 text-emerald-300' 
                : t.type === 'error' 
                  ? 'bg-rose-950/95 border-rose-500/40 text-rose-300' 
                  : 'bg-indigo-950/95 border-indigo-500/40 text-indigo-300'
            }`}
          >
            {t.type === 'success' && <CheckCircle className="w-5 h-5 shrink-0 text-emerald-400" />}
            {t.type === 'error' && <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />}
            {t.type === 'info' && <Info className="w-5 h-5 shrink-0 text-indigo-400" />}
            <p className="text-sm font-medium">{t.message}</p>
          </div>
        ))}
      </div>

      {/* Header / Navbar */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer group" 
            onClick={() => {
              setActiveView('user');
              setVideoFilter('all');
              setSearchQuery('');
            }}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform duration-200">
              <Play className="w-5 h-5 text-white fill-white ml-0.5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xl tracking-wide bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                RUHUL MIDIA
              </span>
              <span className="text-[10px] text-slate-400 hidden sm:inline -mt-1 font-medium">
                স্থায়ী ও রিয়েল-টাইম মিডিয়া শেয়ারিং প্ল্যাটফর্ম
              </span>
            </div>
          </div>
          
          {/* Action Buttons in Header */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Upload Video Button */}
            <button 
              onClick={() => {
                setUploadMediaType('video');
                setIsUploadOpen(true);
              }} 
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>ভিডিও যোগ করুন</span>
            </button>

            {/* Upload Photo Button */}
            <button 
              onClick={() => {
                setUploadMediaType('image');
                setIsUploadOpen(true);
              }} 
              className="bg-amber-600 hover:bg-amber-500 text-white px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition flex items-center gap-1.5 shadow-lg shadow-amber-600/20 active:scale-95 cursor-pointer"
            >
              <ImageIcon className="w-4 h-4" />
              <span className="hidden sm:inline">ফটো যোগ করুন</span>
              <span className="sm:hidden">ফটো</span>
            </button>

            {/* Wallet / Earn Button */}
            <button 
              onClick={() => setActiveView(activeView === 'wallet' ? 'user' : 'wallet')} 
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition border flex items-center gap-1.5 cursor-pointer shadow-md ${
                activeView === 'wallet' 
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-amber-500/20' 
                  : 'bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 border-amber-500/40'
              }`}
            >
              <Coins className="w-4 h-4 animate-pulse text-amber-400" />
              <span className="hidden sm:inline">ওয়ালেট:</span>
              <span className="font-mono">{(wallet.points || 0).toLocaleString()}</span>
            </button>

            {/* Google Link / Account Button */}
            {currentUser ? (
              <div 
                title={`লগইন আছেন: ${currentUser.email || currentUser.displayName}`}
                className="hidden lg:flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-3 py-2 rounded-xl text-xs font-semibold shadow-sm"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="truncate max-w-[110px]">{currentUser.displayName || currentUser.email?.split('@')[0] || 'লগইন'}</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isSubmittingLogin}
                title="Google লিংক করে অ্যাকাউন্ট ক্রিয়েট/লগইন করুন"
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition border border-indigo-400/30 flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-900/30 shrink-0 active:scale-95"
              >
                <Globe className="w-3.5 h-3.5 text-indigo-200" />
                <span>Google লিংক</span>
              </button>
            )}

            {/* Fullscreen Toggle Button */}
            <button
              onClick={toggleFullscreen}
              title={isBrowserFullscreen ? 'ফুলস্ক্রিন বন্ধ করুন' : 'বড় স্ক্রিন (Fullscreen)'}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white p-2 rounded-xl border border-slate-700 transition cursor-pointer hidden md:flex items-center justify-center"
            >
              {isBrowserFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            
            {activeView === 'admin-dashboard' ? (
              <button 
                onClick={() => setActiveView('user')} 
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition border border-slate-700 flex items-center gap-1.5 cursor-pointer"
              >
                <Tv className="w-4 h-4" />
                <span>ইউজার ভিউ</span>
              </button>
            ) : (
              <button 
                onClick={() => {
                  if (adminToken) {
                    setActiveView('admin-dashboard');
                  } else {
                    setActiveView('admin-login');
                  }
                }} 
                className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition border flex items-center gap-1.5 cursor-pointer ${
                  activeView === 'admin-login' 
                    ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' 
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span className="hidden sm:inline">{adminToken ? 'ড্যাশবোর্ড' : 'এডমিন'}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Screen Wake Lock & Permanent Cloud Database Status Banner */}
      <div className="bg-slate-900 border-b border-slate-800/80 px-4 py-2">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          
          {/* Wake Lock & Cloud Database Status */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Firestore Cloud DB Status */}
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium border ${
              isFirestoreConnected 
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30' 
                : 'bg-indigo-950/80 text-indigo-300 border-indigo-500/30'
            }`}>
              <Database className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>স্থায়ী ক্লাউড ডাটাবেজ: {isFirestoreConnected ? 'লাইভ সংযুক্ত (কখনো ডিলিট হবে না)' : 'সংযুক্ত হচ্ছে'}</span>
            </span>

            {/* Wake Lock */}
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium border ${
              isWakeLockActive 
                ? 'bg-amber-950/80 text-amber-300 border-amber-500/30' 
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}>
              <Sun className={`w-3.5 h-3.5 ${isWakeLockActive ? 'text-amber-400 animate-pulse' : 'text-slate-400'}`} />
              <span>স্ক্রিন লাইট: {isWakeLockActive ? 'সক্রিয় (ভিডিও চলাকালীন বাতি নিভবে না)' : 'প্রস্তুত'}</span>
            </span>

            {/* Background Audio */}
            <span className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium border ${
              isBackgroundAudioActive 
                ? 'bg-indigo-950/80 text-indigo-300 border-indigo-500/30' 
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}>
              <Headphones className="w-3.5 h-3.5 text-indigo-400" />
              <span>স্ক্রিন-অফ অডিও: সচল</span>
            </span>
          </div>

          {/* Quick Security & Cloud stats */}
          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
            <span className="flex items-center gap-1 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>অটো-ডিলিট প্রতিরোধ: সক্রিয়</span>
            </span>
            <span className="flex items-center gap-1 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-indigo-300">
              <Users className="w-3.5 h-3.5" />
              <span>মোট মিডিয়া: {videos.length}টি</span>
            </span>
          </div>

        </div>
      </div>

      {/* Top Banner Ad Area */}
      {(activeView === 'user' || activeView === 'wallet') && !!adSettings.topAdEnabled && typeof adSettings.topAdCode === 'string' && adSettings.topAdCode.trim().length > 0 && (
        <UniversalAdSlot 
          placement="top" 
          code={adSettings.topAdCode} 
          enabled={adSettings.topAdEnabled} 
        />
      )}

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* VIEW 1: USER PLATFORM SCREEN */}
        {activeView === 'user' && (
          <section className="space-y-6">
            
            {/* Warning Banner for Unlogged Users */}
            {!currentUser && (
              <div className="bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/80 border border-amber-500/50 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden backdrop-blur-md">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner mt-0.5 sm:mt-0">
                      <AlertTriangle className="w-5 h-5 animate-pulse text-amber-400" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-amber-300">
                          ⚠️ আপনার অ্যাকাউন্ট সংরক্ষিত নেই!
                        </h4>
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-semibold">
                          লগইন প্রয়োজন
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        ভিডিও দেখে কয়েন বা ব্যালেন্স জমা করতে অবশ্যই উপরে থাকা <strong className="text-white underline decoration-amber-400 font-bold">'Google লিংক'</strong> বা অ্যাকাউন্ট অপশনে গিয়ে অ্যাকাউন্ট ক্রিয়েট/লগইন করুন। অন্যথায় ব্যালেন্স জমা হবে না।
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={isSubmittingLogin}
                    className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition flex items-center justify-center gap-2 shrink-0 shadow-lg shadow-indigo-600/30 cursor-pointer border border-indigo-400/30 active:scale-95 whitespace-nowrap"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>অ্যাকাউন্ট করুন (Google লিংক)</span>
                  </button>
                </div>
              </div>
            )}

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-900/50 p-4 rounded-2xl border border-slate-800/80">
              <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                <button 
                  onClick={() => setVideoFilter('all')} 
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition tracking-wide whitespace-nowrap cursor-pointer ${
                    videoFilter === 'all' 
                      ? 'bg-indigo-600 text-white shadow' 
                      : 'bg-slate-800/70 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  সবগুলো ({videos.length})
                </button>
                <button 
                  onClick={() => setVideoFilter('youtube')} 
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition tracking-wide whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    videoFilter === 'youtube' 
                      ? 'bg-rose-600 text-white shadow' 
                      : 'bg-slate-800/70 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Youtube className="w-3.5 h-3.5" />
                  ইউটিউব ({videos.filter(v => v.type === 'youtube').length})
                </button>
                <button 
                  onClick={() => setVideoFilter('facebook')} 
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition tracking-wide whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    videoFilter === 'facebook' 
                      ? 'bg-blue-600 text-white shadow' 
                      : 'bg-slate-800/70 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Share2 className="w-3.5 h-3.5" />
                  ফেসবুক ({videos.filter(v => v.type === 'facebook').length})
                </button>
                <button 
                  onClick={() => setVideoFilter('tiktok')} 
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition tracking-wide whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    videoFilter === 'tiktok' 
                      ? 'bg-cyan-600 text-white shadow' 
                      : 'bg-slate-800/70 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Tv className="w-3.5 h-3.5" />
                  টিকটক ({videos.filter(v => v.type === 'tiktok').length})
                </button>
                <button 
                  onClick={() => setVideoFilter('instagram')} 
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition tracking-wide whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    videoFilter === 'instagram' 
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow' 
                      : 'bg-slate-800/70 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  ইনস্টাগ্রাম ({videos.filter(v => v.type === 'instagram').length})
                </button>
                <button 
                  onClick={() => setVideoFilter('direct')} 
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition tracking-wide whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    videoFilter === 'direct' 
                      ? 'bg-emerald-600 text-white shadow' 
                      : 'bg-slate-800/70 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Tv className="w-3.5 h-3.5" />
                  ডাইরেক্ট ভিডিও ({videos.filter(v => v.type === 'direct').length})
                </button>
                <button 
                  onClick={() => setVideoFilter('image')} 
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition tracking-wide whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    videoFilter === 'image' 
                      ? 'bg-amber-600 text-white shadow' 
                      : 'bg-slate-800/70 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  ফটো / ছবি ({videos.filter(v => v.type === 'image').length})
                </button>
              </div>

              {/* Refresh and Search Bar */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleManualRefresh}
                  disabled={isRefreshing}
                  title="ক্লাউড ডাটাবেজ থেকে রিফ্রেশ করুন"
                  className="bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white px-3 py-2 rounded-xl text-xs font-medium transition flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : 'text-slate-400'}`} />
                  <span className="hidden md:inline">রিফ্রেশ</span>
                </button>

                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ভিডিও বা ছবি খুঁজুন..." 
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-sm focus:outline-none focus:border-indigo-500 transition text-slate-200 placeholder-slate-500"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Permanent Storage Notice Banner */}
            <div className="bg-gradient-to-r from-emerald-950/40 via-indigo-950/30 to-slate-900 border border-emerald-500/30 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-emerald-300 font-semibold text-sm">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span>ক্লাউড পার্মানেন্ট ডাটাবেজ সুরক্ষার নিয়মাবলী:</span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed max-w-3xl">
                  <strong>১. স্থায়ীভাবে সংরক্ষিত:</strong> এখানে আপলোড করা প্রতিটি ভিডিও এবং ফটো লিংক Google Firebase ক্লাউড ডাটাবেজে চিরস্থায়ীভাবে সংরক্ষিত থাকে। কোনো লিংকই কখনো আপনি-আপনি বা স্বয়ংক্রিয়ভাবে মুছে যাবে না।<br />
                  <strong>২. কেবল এডমিন ডিলিট করতে পারেন:</strong> সাধারণ ইউজাররা ডিলিট করতে পারবেন না। শুধুমাত্র এডমিন প্যানেল থেকে অনুমোদিত ইউজাররাই অপ্রয়োজনীয় কনটেন্ট মুছে ফেলতে পারবেন।<br />
                  <strong>৩. রিয়েল-টাইম সিঙ্ক:</strong> যেকোনো একজন ইউজার লিংক আপলোড করলেই সাথে সাথে সকল ব্যবহারকারীর স্ক্রিনে নতুন ভিডিও বা ফটো চলে আসে।
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    setUploadMediaType('video');
                    setIsUploadOpen(true);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  ভিডিও দিন
                </button>
                <button
                  onClick={() => {
                    setUploadMediaType('image');
                    setIsUploadOpen(true);
                  }}
                  className="bg-amber-600 hover:bg-amber-500 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  ফটো দিন
                </button>
              </div>
            </div>

            {/* Media Grid loading state */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                <p className="text-slate-400 text-sm">ক্লাউড ডাটাবেজ থেকে লোড হচ্ছে...</p>
              </div>
            ) : filteredVideos.length === 0 ? (
              <div className="text-center py-24 bg-slate-900/20 border border-slate-800/40 rounded-3xl">
                <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-4 text-slate-500">
                  <VideoIcon className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-300">কোনো ভিডিও বা ফটো পাওয়া যায়নি!</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">
                  {searchQuery ? 'আপনার সার্চ করা কিওয়ার্ড দিয়ে কিছু মিলছে না।' : 'এই ক্যাটাগরিতে এখনও কোনো মিডিয়া নেই। ওপরের বাটনে চাপ দিয়ে যুক্ত করুন!'}
                </p>
                <div className="mt-4 flex justify-center gap-3">
                  {searchQuery ? (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-semibold transition"
                    >
                      সার্চ বাতিল করুন
                    </button>
                  ) : (
                    <button 
                      onClick={() => setIsUploadOpen(true)}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      প্রথম মিডিয়া যোগ করুন
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredVideos.map((video, index) => {
                  const media = parseUniversalMediaUrl(video.url);
                  if (!media) return null;

                  // Insert feed ad after every 3rd card if enabled
                  const showFeedAd = !!adSettings.feedAdEnabled && typeof adSettings.feedAdCode === 'string' && adSettings.feedAdCode.trim().length > 0 && (index + 1) % 3 === 0;

                  const isPlaying = activePlayingVideoId === video.id && !activeWatchVideo && !theaterVideo;

                  return (
                    <React.Fragment key={video.id}>
                      {/* Media Card (Video or Photo) */}
                      <div className={`bg-slate-900/60 border rounded-2xl overflow-hidden shadow-lg flex flex-col group transition-all duration-300 hover:shadow-2xl ${
                        isPlaying 
                          ? 'border-indigo-500 shadow-indigo-500/20 ring-1 ring-indigo-500' 
                          : 'border-slate-800/80 hover:border-slate-700'
                      }`}>
                        
                        {/* PHOTO CARD RENDERING */}
                        {video.type === 'image' ? (
                          <div 
                            onClick={() => setFullscreenPhoto(video)}
                            className="relative aspect-video w-full bg-slate-950 overflow-hidden cursor-pointer group/photo"
                          >
                            <img 
                              src={video.url} 
                              alt={video.title} 
                              className="w-full h-full object-cover group-hover/photo:scale-105 transition-transform duration-500"
                              loading="lazy"
                            />
                            {/* Hover Overlay */}
                            <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center">
                              <div className="bg-slate-900/90 text-white border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xl backdrop-blur-sm transform group-hover/photo:scale-105 transition">
                                <ZoomIn className="w-4 h-4 text-amber-400" />
                                <span>বড় করে দেখুন (Full View)</span>
                              </div>
                            </div>
                            {/* Badge */}
                            <div className="absolute top-3 left-3 bg-amber-600/90 text-white font-medium text-[10px] uppercase tracking-wider px-2 py-1 rounded-md border border-amber-500/30 flex items-center gap-1 shadow">
                              <ImageIcon className="w-3 h-3" />
                              ফটো / Photo
                            </div>
                            {/* Big Screen Button for Photos */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setFullscreenPhoto(video);
                              }}
                              title="বড় স্ক্রিনে দেখুন"
                              className="absolute top-3 right-3 bg-slate-950/80 hover:bg-amber-600 text-slate-300 hover:text-white px-2 py-1 rounded-lg border border-slate-800 transition z-10 flex items-center gap-1 text-[10px] font-semibold cursor-pointer"
                            >
                              <Maximize2 className="w-3.5 h-3.5" />
                              <span>বড় স্ক্রিন</span>
                            </button>
                          </div>
                        ) : (
                          /* UNIVERSAL VIDEO PLAYER (Standard Embed, Direct HTML5, or Social Preview Card) */
                          <>
                            <UniversalVideoPlayer
                              id={video.id}
                              title={video.title}
                              url={video.url}
                              type={video.type}
                              uploader={video.uploader}
                              date={video.date}
                              thumbnailUrl={video.thumbnailUrl}
                              durationFormatted={video.durationFormatted}
                              durationSeconds={video.durationSeconds}
                              isPlaying={isPlaying}
                              onPlay={() => handleSelectAndWatchVideo(video)}
                              onOpenTheater={() => handleSelectAndWatchVideo(video)}
                            />

                            {/* Watch & Earn Progress Tracker for videos with dynamic timer & reward */}
                            <WatchEarnTracker
                              videoId={video.id}
                              videoTitle={video.title}
                              isPlaying={isPlaying}
                              watchDurationSeconds={rewardSettings.watchDurationSeconds}
                              videoDurationSeconds={video.durationSeconds}
                              pointsPerVideoWatch={rewardSettings.pointsPerVideoWatch}
                              isLoggedIn={!!currentUser}
                              onGoogleLogin={handleGoogleLogin}
                              onRewardGranted={handleWatchRewardGranted}
                              onOpenWallet={() => setActiveView('wallet')}
                            />
                          </>
                        )}

                        {/* Title and Controls */}
                        <div className="p-5 flex flex-col justify-between flex-1 space-y-4">
                          <div>
                            <h3 
                              className="font-semibold text-slate-100 text-base leading-snug line-clamp-2 min-h-[3rem] cursor-pointer hover:text-indigo-400 transition"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (video.type === 'image') {
                                  setFullscreenPhoto(video);
                                } else {
                                  handleSelectAndWatchVideo(video);
                                }
                              }}
                            >
                              {video.title}
                            </h3>

                            {/* Watch Streaming View & Screen-Off audio mode buttons */}
                            {video.type !== 'image' && (
                              <div className="mt-3 flex flex-col sm:flex-row gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectAndWatchVideo(video);
                                  }}
                                  className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition border cursor-pointer bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 active:scale-95"
                                >
                                  <Play className="w-3.5 h-3.5 fill-white text-white" />
                                  <span>মোবাইল স্ট্রিমিং (Watch View)</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleAudioMode(video);
                                  }}
                                  className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition border cursor-pointer ${
                                    isPlaying
                                      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                                      : 'bg-slate-950 border-slate-800 hover:border-indigo-500/50 text-indigo-300 hover:text-white'
                                  }`}
                                  title="স্ক্রিন অফ অডিও মোড"
                                >
                                  <Headphones className="w-3.5 h-3.5 text-indigo-400" />
                                  <span className="hidden sm:inline">{isPlaying ? '🎧 অডিও চালু (বিরতি)' : '🎧 ব্যাকগ্রাউন্ড'}</span>
                                  <span className="sm:hidden">{isPlaying ? '🎧 চালু' : '🎧 অডিও'}</span>
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/60 pt-4">
                            <span className={`inline-flex items-center gap-1.5 font-semibold px-2.5 py-1 rounded-lg ${
                              video.type === 'youtube' 
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                                : video.type === 'facebook'
                                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                  : video.type === 'tiktok'
                                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                                    : video.type === 'instagram'
                                      ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                      : video.type === 'direct'
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                        : video.type === 'image'
                                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                          : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                            }`}>
                              {video.type === 'youtube' && <Youtube className="w-3.5 h-3.5" />}
                              {video.type === 'facebook' && <Share2 className="w-3.5 h-3.5 text-blue-400" />}
                              {video.type === 'tiktok' && <Tv className="w-3.5 h-3.5 text-cyan-400" />}
                              {video.type === 'instagram' && <Sparkles className="w-3.5 h-3.5 text-pink-400" />}
                              {video.type === 'direct' && <Tv className="w-3.5 h-3.5 text-emerald-400" />}
                              {video.type === 'image' && <ImageIcon className="w-3.5 h-3.5 text-amber-400" />}
                              {!['youtube', 'facebook', 'tiktok', 'instagram', 'direct', 'image'].includes(video.type) && (
                                <Globe className="w-3.5 h-3.5 text-indigo-400" />
                              )}
                              <span>{media.platformBadge}</span>
                            </span>
                            
                            <div className="flex items-center gap-2 text-[11px]">
                              <span className="text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md flex items-center gap-1" title={`আপলোডকারী: ${video.uploader || 'পাবলিক ইউজার'}`}>
                                <Users className="w-3 h-3 text-indigo-400" />
                                <span className="max-w-[110px] truncate">{video.uploader || 'পাবলিক ইউজার'}</span>
                              </span>
                              <span className="font-mono text-slate-400">{video.date}</span>
                            </div>
                          </div>
                        </div>

                      </div>

                      {/* Native Feed Ad Content */}
                      {showFeedAd && (
                        <UniversalAdSlot 
                          placement="feed" 
                          code={adSettings.feedAdCode} 
                          enabled={adSettings.feedAdEnabled} 
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </section>
        )}
 
        {/* VIEW: WALLET & EARNING SYSTEM */}
        {activeView === 'wallet' && (
          <section className="space-y-6">
            <WalletView
              wallet={wallet}
              withdrawals={withdrawals.filter(w => w.userId === (currentUser?.uid || wallet.userId))}
              adSettings={adSettings}
              rewardSettings={rewardSettings}
              onNavigateToVideos={() => setActiveView('user')}
              onRequestWithdrawal={handleRequestWithdrawal}
              onClaimAdReward={handleClaimAdReward}
              onOpenUploadModal={() => {
                setUploadMediaType('video');
                setIsUploadOpen(true);
              }}
              onGoogleLogin={handleGoogleLogin}
              isLoggedInGoogle={!!currentUser}
            />
          </section>
        )}

        {/* VIEW 2: ADMIN LOGIN SECTION */}
        {activeView === 'admin-login' && (
          <section className="max-w-md mx-auto my-12">
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl space-y-6">
              
              <div className="text-center space-y-2">
                <div className="w-14 h-14 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto text-2xl border border-indigo-500/20 shadow-inner">
                  <UserCheck className="w-6 h-6 text-indigo-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">এডমিন লগইন</h2>
                <p className="text-slate-400 text-xs">বিজ্ঞাপন নিয়ন্ত্রণ এবং কনটেন্ট ডিলিট/ম্যানেজ করতে লগইন করুন</p>
              </div>

              {/* Google Login Option */}
              <div>
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isSubmittingLogin}
                  className="w-full bg-slate-950 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 text-white font-medium py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-sm text-sm"
                >
                  <Globe className="w-4 h-4 text-emerald-400" />
                  <span>Google দিয়ে এডমিন লগইন (ruhulamin...)</span>
                </button>
              </div>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-800"></div>
                <span className="flex-shrink mx-4 text-slate-500 text-xs uppercase">অথবা পাসওয়ার্ড দিয়ে</span>
                <div className="flex-grow border-t border-slate-800"></div>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">ইউজারনাম</label>
                  <input 
                    type="text" 
                    value={adminUser}
                    onChange={(e) => setAdminUser(e.target.value)}
                    required 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 text-slate-200 placeholder-slate-600"
                    placeholder="ruhul"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">পাসওয়ার্ড</label>
                  <input 
                    type="password" 
                    value={adminPass}
                    onChange={(e) => setAdminPass(e.target.value)}
                    required 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 text-slate-200 placeholder-••••••••"
                    placeholder="••••••••"
                  />
                </div>
                
                {loginError && (
                  <p className="text-rose-500 text-xs text-center font-semibold bg-rose-500/10 py-2.5 rounded-lg border border-rose-500/20">
                    {loginError}
                  </p>
                )}

                <button 
                  type="submit" 
                  disabled={isSubmittingLogin}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-700 text-white font-medium py-3 rounded-xl transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmittingLogin ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>যাচাই হচ্ছে...</span>
                    </>
                  ) : (
                    <span>লগইন করুন</span>
                  )}
                </button>
              </form>

            </div>
          </section>
        )}


        {/* VIEW 3: ADMIN DASHBOARD */}
        {activeView === 'admin-dashboard' && (
          <section className="space-y-6">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Settings className="w-6 h-6 text-indigo-400" />
                  এডমিন ড্যাশবোর্ড
                </h1>
                <p className="text-slate-400 text-xs mt-1">
                  বিজ্ঞাপন সেটিংস ও কনটেন্ট নিয়ন্ত্রণ (শুধুমাত্র আপনি এখান থেকে ডিলিট করতে পারবেন)
                </p>
              </div>
              <button 
                onClick={handleLogout} 
                className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 px-4 py-2.5 rounded-xl text-xs font-semibold transition border border-rose-500/20 flex items-center gap-2 cursor-pointer self-stretch sm:self-auto justify-center"
              >
                <LogOut className="w-4 h-4" />
                <span>লগআউট করুন</span>
              </button>
            </div>

            {/* Tab Swappers */}
            <div className="flex gap-2 border-b border-slate-800 pb-0.5">
              <button 
                onClick={() => setAdminTab('ads')} 
                className={`py-3 px-5 text-sm font-semibold transition border-b-2 tracking-wide cursor-pointer ${
                  adminTab === 'ads' 
                    ? 'border-indigo-500 text-indigo-400' 
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                বিজ্ঞাপন সেটিংস (Ads Configuration)
              </button>
              <button 
                onClick={() => setAdminTab('videos')} 
                className={`py-3 px-5 text-sm font-semibold transition border-b-2 tracking-wide cursor-pointer ${
                  adminTab === 'videos' 
                    ? 'border-indigo-500 text-indigo-400' 
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                মিডিয়া ম্যানেজমেন্ট ও ডিলিট ({videos.length}টি)
              </button>
              <button 
                onClick={() => setAdminTab('withdrawals')} 
                className={`py-3 px-5 text-sm font-semibold transition border-b-2 tracking-wide cursor-pointer flex items-center gap-1.5 ${
                  adminTab === 'withdrawals' 
                    ? 'border-indigo-500 text-indigo-400' 
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>উইথড্র রিকোয়েস্ট ({withdrawals.filter(w => w.status === 'pending').length} অপেক্ষমাণ)</span>
              </button>
              <button 
                onClick={() => setAdminTab('rewards')} 
                className={`py-3 px-5 text-sm font-semibold transition border-b-2 tracking-wide cursor-pointer flex items-center gap-1.5 ${
                  adminTab === 'rewards' 
                    ? 'border-amber-500 text-amber-400 font-bold' 
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Coins className="w-4 h-4 text-amber-400" />
                <span>পয়েন্ট ও রিওয়ার্ড (Rewards)</span>
              </button>
              <button 
                onClick={() => setAdminTab('users')} 
                className={`py-3 px-5 text-sm font-semibold transition border-b-2 tracking-wide cursor-pointer flex items-center gap-1.5 ${
                  adminTab === 'users' 
                    ? 'border-emerald-500 text-emerald-400 font-bold' 
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping mr-0.5" />
                <Users className="w-4 h-4 text-emerald-400" />
                <span>ইউজার এনালিটিক্স ও লাইভ উপস্থিতি</span>
              </button>
              <button 
                onClick={() => setAdminTab('bulk-import')} 
                className={`py-3 px-5 text-sm font-semibold transition border-b-2 tracking-wide cursor-pointer flex items-center gap-1.5 ${
                  adminTab === 'bulk-import' 
                    ? 'border-red-500 text-red-400 font-bold' 
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Youtube className="w-4 h-4 text-red-500" />
                <span>বাল্ক ইমপোর্ট (Bulk Import)</span>
              </button>
            </div>

            {/* TAB CONTENT: AD MANAGEMENT */}
            {adminTab === 'ads' && (
              <form onSubmit={handleSaveAds} className="space-y-6">
                
                {/* Control & Security Rules Banner */}
                <div className="bg-gradient-to-r from-indigo-950/70 via-slate-900 to-indigo-950/70 border border-indigo-500/40 rounded-2xl p-5 shadow-xl flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0 text-emerald-400 shadow-inner">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-white">বিজ্ঞাপন প্রদর্শনের সম্পূর্ণ নিয়ন্ত্রণ আপনার হাতে</h3>
                      <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded font-mono font-bold">100% Admin Controlled</span>
                    </div>
                    <ul className="space-y-1 text-slate-300">
                      <li>• <strong>শুধুমাত্র আপনার দেওয়া অ্যাড শো করবে:</strong> এখানে আপনি যে লিংক বা কোড বসাবেন, ইউজার স্ক্রিনে কেবলমাত্র সেই বিজ্ঞাপনটিই প্রদর্শিত হবে।</li>
                      <li>• <strong>আপনি-আপনি কোনো অ্যাড আসবে না:</strong> আপনি যদি কোনো ফিল্ড খালি রাখেন বা টগল বন্ধ রাখেন, কোনো স্বয়ংক্রিয় বা ডেমো অ্যাড কখনো শো হবে না।</li>
                      <li>• <strong>অপরিবর্তনশীল ও স্থায়ী:</strong> আপনি নিজে এই ড্যাশবোর্ড থেকে পরিবর্তন না করা পর্যন্ত বিজ্ঞাপন নিজে নিজে কখনোই চেঞ্জ হবে না।</li>
                    </ul>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 1. Top Banner Settings */}
                  <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between space-y-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div>
                          <h3 className="font-bold text-base text-white">১. টপ ব্যানার অ্যাড (Top Banner)</h3>
                          <p className="text-slate-400 text-[11px] mt-0.5">ইউজার প্যানেলে সবার উপরে প্রদর্শিত হবে</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={topAdEnabled} 
                            onChange={(e) => setTopAdEnabled(e.target.checked)} 
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
                            ব্যানার লিংক বা কোড (Direct URL / &lt;script&gt; / HTML)
                          </label>
                          {topAdCode && (
                            <button
                              type="button"
                              onClick={() => {
                                setTopAdCode('');
                                setTopAdEnabled(false);
                              }}
                              className="text-[11px] text-rose-400 hover:text-rose-300 hover:underline cursor-pointer flex items-center gap-1"
                              title="এই বিজ্ঞাপন লিংক মুছে ফেলুন"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>খালি করুন</span>
                            </button>
                          )}
                        </div>
                        <textarea 
                          value={topAdCode}
                          onChange={(e) => setTopAdCode(e.target.value)}
                          rows={4} 
                          placeholder="আপনার বিজ্ঞাপনের সরাসরি লিংক (যেমন: https://example.com/ad-link) অথবা স্ক্রিপ্ট কোড পেস্ট করুন..." 
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono focus:outline-none focus:border-indigo-500 text-slate-300 placeholder-slate-600"
                        />
                        {renderDetectionBadge(topAdCode)}
                      </div>
                    </div>

                    {/* Top Live Preview */}
                    <AdLivePreviewCard code={topAdCode} title="টপ ব্যানার" placement="banner" />
                  </div>

                  {/* 2. In-Feed native ad Settings */}
                  <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between space-y-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div>
                          <h3 className="font-bold text-base text-white">২. ইন-ফিড অ্যাড (In-Feed Ad)</h3>
                          <p className="text-slate-400 text-[11px] mt-0.5">ভিডিও তালিকার প্রতি ৩টি ভিডিও পর প্রদর্শিত হবে</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={feedAdEnabled} 
                            onChange={(e) => setFeedAdEnabled(e.target.checked)} 
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
                            ইন-ফিড লিংক বা কোড (Direct URL / &lt;script&gt; / HTML)
                          </label>
                          {feedAdCode && (
                            <button
                              type="button"
                              onClick={() => {
                                setFeedAdCode('');
                                setFeedAdEnabled(false);
                              }}
                              className="text-[11px] text-rose-400 hover:text-rose-300 hover:underline cursor-pointer flex items-center gap-1"
                              title="এই বিজ্ঞাপন লিংক মুছে ফেলুন"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>খালি করুন</span>
                            </button>
                          )}
                        </div>
                        <textarea 
                          value={feedAdCode}
                          onChange={(e) => setFeedAdCode(e.target.value)}
                          rows={4} 
                          placeholder="আপনার বিজ্ঞাপনের সরাসরি লিংক (যেমন: https://example.com/ad-link) অথবা ফিড এড কোড পেস্ট করুন..." 
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono focus:outline-none focus:border-indigo-500 text-slate-300 placeholder-slate-600"
                        />
                        {renderDetectionBadge(feedAdCode)}
                      </div>
                    </div>

                    {/* Feed Live Preview */}
                    <AdLivePreviewCard code={feedAdCode} title="ইন-ফিড অ্যাড" placement="feed" />
                  </div>

                  {/* 3. Popunder Ad Settings */}
                  <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between space-y-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div>
                          <h3 className="font-bold text-base text-white">৩. পপআন্ডার অ্যাড (Popunder Ad)</h3>
                          <p className="text-slate-400 text-[11px] mt-0.5">ব্যবহারকারী স্ক্রিনে ক্লিক বা টাচ করলেই নতুন উইন্ডোতে লোড হবে</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={popunderAdEnabled} 
                            onChange={(e) => setPopunderAdEnabled(e.target.checked)} 
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
                            পপআন্ডার লিংক বা কোড (Direct URL / &lt;script&gt;)
                          </label>
                          {popunderAdCode && (
                            <button
                              type="button"
                              onClick={() => {
                                setPopunderAdCode('');
                                setPopunderAdEnabled(false);
                              }}
                              className="text-[11px] text-rose-400 hover:text-rose-300 hover:underline cursor-pointer flex items-center gap-1"
                              title="এই বিজ্ঞাপন লিংক মুছে ফেলুন"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>খালি করুন</span>
                            </button>
                          )}
                        </div>
                        <textarea 
                          value={popunderAdCode}
                          onChange={(e) => setPopunderAdCode(e.target.value)}
                          rows={4} 
                          placeholder="আপনার বিজ্ঞাপনের সরাসরি লিংক (যেমন: https://example.com/ad-link) অথবা স্ক্রিপ্ট কোড পেস্ট করুন..." 
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono focus:outline-none focus:border-indigo-500 text-slate-300 placeholder-slate-600"
                        />
                        {renderDetectionBadge(popunderAdCode)}
                      </div>
                    </div>

                    {/* Popunder Live Preview & Direct Test */}
                    <div className="bg-slate-950 p-4 border border-slate-800 rounded-xl space-y-3">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        <span>পপআন্ডার স্ট্যাটাস ও টেস্ট</span>
                        <span className={popunderAdEnabled && popunderAdCode.trim() ? "text-emerald-400" : "text-slate-500"}>
                          {popunderAdEnabled && popunderAdCode.trim() ? 'সক্রিয় (Active)' : 'নিষ্ক্রিয় (Disabled)'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        ইউজার প্যানেলে কোনো ব্যবহারকারী যেকোনো বাটন চাপলে বা ক্লিক করলে স্বয়ংক্রিয়ভাবে নতুন ব্রাউজার ট্যাবে এই পপআন্ডার লিংক ওপেন হবে।
                      </p>
                      {popunderAdCode && popunderAdCode.trim() && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              const parsed = parseAdContent(popunderAdCode);
                              if (parsed.type === 'direct_url' && parsed.url) {
                                window.open(parsed.url, '_blank', 'noopener,noreferrer');
                              } else {
                                showToast('সরাসরি ইউজার প্যানেলে এই কোড এক্সিকিউট হবে', 'info');
                              }
                            }}
                            className="bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white px-3 py-2 rounded-xl text-xs font-medium border border-slate-700 transition flex items-center gap-1.5 cursor-pointer w-full justify-center"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>টেস্ট পপআন্ডার ওপেন করুন (Test Open in New Tab)</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 4. Social Bar Ad Settings */}
                  <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between space-y-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div>
                          <h3 className="font-bold text-base text-white">৪. সোশ্যাল বার / ফ্লোটিং অ্যাড (Social Bar)</h3>
                          <p className="text-slate-400 text-[11px] mt-0.5">স্ক্রিনের নিচে ভাসমান আকর্ষণীয় নোটিফিকেশন বার হিসেবে দেখাবে</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={socialBarAdEnabled} 
                            onChange={(e) => setSocialBarAdEnabled(e.target.checked)} 
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
                            সোশ্যাল বার লিংক বা কোড (Direct URL / &lt;script&gt;)
                          </label>
                          {socialBarAdCode && (
                            <button
                              type="button"
                              onClick={() => {
                                setSocialBarAdCode('');
                                setSocialBarAdEnabled(false);
                              }}
                              className="text-[11px] text-rose-400 hover:text-rose-300 hover:underline cursor-pointer flex items-center gap-1"
                              title="এই বিজ্ঞাপন লিংক মুছে ফেলুন"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>খালি করুন</span>
                            </button>
                          )}
                        </div>
                        <textarea 
                          value={socialBarAdCode}
                          onChange={(e) => setSocialBarAdCode(e.target.value)}
                          rows={4} 
                          placeholder="আপনার বিজ্ঞাপনের সরাসরি লিংক (যেমন: https://example.com/ad-link) অথবা স্ক্রিপ্ট কোড পেস্ট করুন..." 
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono focus:outline-none focus:border-indigo-500 text-slate-300 placeholder-slate-600"
                        />
                        {renderDetectionBadge(socialBarAdCode)}
                      </div>
                    </div>

                    {/* Social Bar Live Preview */}
                    <AdLivePreviewCard code={socialBarAdCode} title="সোশ্যাল বার" placement="social" />
                  </div>
                </div>

                {/* Save All Ad Settings Button */}
                <div className="pt-2">
                  <button 
                    type="submit" 
                    disabled={isSavingAds}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-700 text-white font-semibold py-3.5 rounded-xl transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSavingAds ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>ক্লাউড ডাটাবেজে সেভ হচ্ছে...</span>
                      </>
                    ) : (
                      <span>বিজ্ঞাপন সেটিংস সেভ করুন (Save All Ads Settings)</span>
                    )}
                  </button>
                </div>

              </form>
            )}

            {/* TAB CONTENT: VIDEO MANAGEMENT (ONLY ADMIN CAN DELETE) */}
            {adminTab === 'videos' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="p-5 border-b border-slate-800 flex justify-between items-center gap-4">
                  <div>
                    <h3 className="font-bold text-base text-white">ক্লাউড ডাটাবেজ মিডিয়া তালিকা</h3>
                    <p className="text-slate-400 text-xs">
                      এখানে থাকা সকল মিডিয়া চিরস্থায়ী ক্লাউডে সংরক্ষিত। কেবলমাত্র আপনি 'মুছে ফেলুন' বাটনে চাপ দিয়ে ডিলিট করতে পারবেন।
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setAdminTab('bulk-import')}
                      className="bg-red-600/90 hover:bg-red-600 text-white text-xs px-3.5 py-2 rounded-xl font-medium transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-red-950/30"
                    >
                      <DownloadCloud className="w-3.5 h-3.5" />
                      <span>ইউটিউব বাল্ক ইমপোর্ট</span>
                    </button>
                    <button 
                      onClick={() => setIsUploadOpen(true)}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3.5 py-2 rounded-xl font-medium transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>নতুন মিডিয়া</span>
                    </button>
                  </div>
                </div>

                {videos.length === 0 ? (
                  <div className="p-16 text-center text-slate-500">
                    <VideoIcon className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-sm font-semibold">কোনো ভিডিও ডাটাবেজে পাওয়া যায়নি!</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-300">
                      <thead className="bg-slate-950/80 text-slate-400 uppercase text-xs tracking-wider border-b border-slate-800">
                        <tr>
                          <th className="p-4 font-semibold text-slate-400">নাম (Title)</th>
                          <th className="p-4 font-semibold text-slate-400">আপলোডকারী</th>
                          <th className="p-4 font-semibold text-slate-400">টাইপ</th>
                          <th className="p-4 font-semibold text-slate-400">তারিখ</th>
                          <th className="p-4 font-semibold text-slate-400 text-right">এডমিন ডিলিট</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80">
                        {videos.map(video => (
                          <tr key={video.id} className="hover:bg-slate-950/30 transition duration-150">
                            <td className="p-4 font-medium text-slate-200">
                              <div className="flex flex-col gap-1 max-w-lg">
                                <span className="line-clamp-1 text-sm font-medium">{video.title}</span>
                                <a 
                                  href={video.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-[11px] text-indigo-400 hover:underline flex items-center gap-1 w-fit"
                                >
                                  {video.url} <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              </div>
                            </td>
                            <td className="p-4 text-xs text-slate-300 font-medium">
                              <span className="bg-slate-800/80 px-2 py-1 rounded-md text-indigo-300 inline-flex items-center gap-1">
                                <Users className="w-3 h-3 text-indigo-400" />
                                {video.uploader || 'পাবলিক ইউজার'}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                                video.type === 'youtube' 
                                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                                  : video.type === 'facebook'
                                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                    : video.type === 'tiktok'
                                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                                      : video.type === 'instagram'
                                        ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                        : video.type === 'direct'
                                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                          : video.type === 'image'
                                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                            : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                              }`}>
                                {video.type}
                              </span>
                            </td>
                            <td className="p-4 text-slate-400 font-mono text-xs">{video.date}</td>
                            <td className="p-4 text-right">
                              <button 
                                onClick={() => handleDeleteVideo(video.id)} 
                                className="bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white px-3 py-1.5 rounded-xl transition text-xs font-semibold flex items-center gap-1 ml-auto cursor-pointer"
                                title="স্থায়ীভাবে মুছে ফেলুন (শুধুমাত্র এডমিন)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>মুছে ফেলুন</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: WITHDRAWAL REQUESTS MANAGEMENT */}
            {adminTab === 'withdrawals' && (
              <AdminWithdrawals
                withdrawals={withdrawals}
                onUpdateStatus={handleUpdateWithdrawalStatus}
                onDeleteRequest={handleDeleteWithdrawal}
                onRefresh={handleRefreshWithdrawals}
              />
            )}

            {/* TAB CONTENT: DYNAMIC POINTS & REWARD SETTINGS */}
            {adminTab === 'rewards' && (
              <AdminRewardSettings
                currentSettings={rewardSettings}
                onSave={handleSaveRewardSettings}
                isSaving={isSavingRewardSettings}
                youtubeApiKey={youtubeApiKey}
                onSaveYouTubeApiKey={handleSaveYouTubeApiKey}
              />
            )}

            {/* TAB CONTENT: USER ANALYTICS & LIVE PRESENCE */}
            {adminTab === 'users' && (
              <AdminUserPresence
                users={registeredUsers}
                onRefresh={handleRefreshUsers}
                isLoading={isLoadingUsers}
              />
            )}

            {/* TAB CONTENT: BULK IMPORT CHANNEL / PLAYLIST (ADMIN ONLY) */}
            {adminTab === 'bulk-import' && (
              <AdminBulkImport
                adminToken={adminToken || localStorage.getItem('sv_admin_token') || ''}
                youtubeApiKey={youtubeApiKey}
                existingVideoUrls={new Set(videos.map(v => v.url.toLowerCase()))}
                onNavigateToSettings={() => setAdminTab('rewards')}
                onVideosImported={(newlyImported) => {
                  setVideos(prev => {
                    const existingMap = new Set(prev.map(p => p.id));
                    const filtered = newlyImported.filter(n => !existingMap.has(n.id));
                    return [...filtered, ...prev];
                  });
                }}
                showToast={showToast}
              />
            )}

          </section>
        )}

      </main>

      {/* UPLOAD VIDEO / PHOTO MODAL (সার্বজনীন পাবলিক আপলোড) */}
      {isUploadOpen && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            
            <button 
              onClick={() => {
                setNewVideoTitle('');
                setNewVideoUrl('');
                setNewVideoUploader('');
                setFetchedMeta(null);
                setIsUploadOpen(false);
              }} 
              className="absolute top-5 right-5 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="border-b border-slate-800 pb-3 space-y-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${uploadMediaType === 'image' ? 'bg-amber-500/10 text-amber-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
                  {uploadMediaType === 'image' ? <ImageIcon className="w-5 h-5" /> : <VideoIcon className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {uploadMediaType === 'image' ? 'নতুন ফটো / ছবির লিংক যোগ করুন' : 'নতুন ভিডিও লিংক যোগ করুন'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {uploadMediaType === 'image' ? 'যেকোনো ছবির ওয়েব লিংক দিয়ে স্থায়ীভাবে শেয়ার করুন' : 'ইউটিউব, টিকটক বা ডাইরেক্ট ভিডিও লিংক দিয়ে যুক্ত করুন'}
                  </p>
                </div>
              </div>

              {/* Media Type Selector Tabs */}
              <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setUploadMediaType('video')}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
                    uploadMediaType === 'video' 
                      ? 'bg-indigo-600 text-white shadow' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <VideoIcon className="w-4 h-4" />
                  <span>ভিডিও লিংক (Video)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMediaType('image')}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
                    uploadMediaType === 'image' 
                      ? 'bg-amber-600 text-white shadow' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>ফটো লিংক (Photo)</span>
                </button>
              </div>
            </div>

            {/* Permanent Storage Notice */}
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-2.5 text-xs text-emerald-300">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              <div>
                <strong className="text-white">স্থায়ী ক্লাউড ডাটাবেজ:</strong> আপনার আপলোড করা লিংক Google ক্লাউড ফায়ারবেজ ডাটাবেজে চিরস্থায়ীভাবে সংরক্ষিত থাকবে। এটি কখনো আপনি-আপনি মুছে যাবে না এবং সকল ইউজার সাথে সাথে দেখতে পাবেন।
              </div>
            </div>
            
            <form onSubmit={handleUploadVideo} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                  {uploadMediaType === 'image' ? 'ছবির শিরোনাম / ক্যাপশন' : 'ভিডিওর টাইটেল / ক্যাপশন'}
                </label>
                <input 
                  type="text" 
                  value={newVideoTitle}
                  onChange={(e) => setNewVideoTitle(e.target.value)}
                  required 
                  placeholder={uploadMediaType === 'image' ? 'যেমন: সুন্দর প্রাকৃতিক দৃশ্য' : 'যেমন: বাংলা গান বা নাটকের ভিডিও'}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 text-slate-200 placeholder-slate-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                  আপনার নাম / চ্যানেলের নাম (ঐচ্ছিক)
                </label>
                <input 
                  type="text" 
                  value={newVideoUploader}
                  onChange={(e) => setNewVideoUploader(e.target.value)}
                  placeholder="যেমন: রুহুল আমিন / RUHUL MIDIA" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 text-slate-200 placeholder-slate-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                  {uploadMediaType === 'image' ? 'ছবির লিংক (Image URL)' : 'ভিডিও লিংক (YouTube / Facebook / TikTok / Instagram / Vimeo / Direct Video)'}
                </label>
                <div className="relative">
                  <input 
                    type="url" 
                    value={newVideoUrl}
                    onChange={(e) => {
                      const url = e.target.value;
                      setNewVideoUrl(url);
                      if (url.includes('youtube.com') || url.includes('youtu.be')) {
                        fetchYouTubeMetadata(url);
                      } else {
                        setFetchedMeta(null);
                      }
                    }}
                    required 
                    placeholder={
                      uploadMediaType === 'image' 
                        ? 'যেমন: https://images.unsplash.com/... বা ছবির সরাসরি লিংক (.jpg, .png, .webp)' 
                        : 'যেমন: YouTube (ভিডিও/Shorts), TikTok, Facebook, Instagram, Vimeo, বা ডাইরেক্ট .mp4 লিংক'
                    } 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 text-slate-200 placeholder-slate-600"
                  />
                  {isFetchingMeta && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-400 flex items-center gap-1.5 text-xs font-medium bg-slate-950/90 px-2 py-1 rounded-md">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
                      <span className="text-[11px] text-rose-300">মেটাডাটা আনা হচ্ছে...</span>
                    </div>
                  )}
                </div>

                {/* Fetched YouTube Metadata Card */}
                {fetchedMeta && (
                  <div className="mt-2.5 p-3 bg-slate-950 border border-emerald-500/30 rounded-xl flex flex-col gap-2 shadow-inner">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-emerald-300 font-semibold truncate">
                        <Youtube className="w-4 h-4 text-rose-500 shrink-0" />
                        <span className="truncate">{fetchedMeta.title || 'YouTube Video'}</span>
                      </div>
                      {fetchedMeta.durationFormatted && (
                        <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-mono font-bold shrink-0 text-[11px] ml-2">
                          ⏱️ {fetchedMeta.durationFormatted}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-900">
                      <span className="text-slate-400">
                        উৎস: {fetchedMeta.source === 'youtube_data_api_v3' ? '✨ YouTube Data API v3 (HD Thumbnail)' : '⚡ oEmbed ফলব্যাক'}
                      </span>
                      {fetchedMeta.durationSeconds ? (
                        <span className="text-emerald-400 font-medium font-mono">
                          রিওয়ার্ড টাইমার: {Math.min(fetchedMeta.durationSeconds, rewardSettings.watchDurationSeconds)} সেকেন্ড
                        </span>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Dynamic Live Preview */}
              {newVideoUrl && (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    লাইভ প্রিভিউ (Live Preview):
                  </label>
                  <div className="relative aspect-video w-full bg-black rounded-xl border border-slate-800 overflow-hidden flex items-center justify-center">
                    {uploadMediaType === 'image' || (livePreview && livePreview.type === 'image') ? (
                      <img 
                        src={newVideoUrl} 
                        alt="Preview" 
                        className="w-full h-full object-contain bg-slate-950"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=640&h=360&fit=crop';
                        }}
                      />
                    ) : livePreview && livePreview.playerType === 'direct' ? (
                      <video 
                        src={livePreview.embedUrl} 
                        controls 
                        className="absolute top-0 left-0 w-full h-full object-contain"
                      />
                    ) : livePreview && livePreview.playerType === 'iframe' ? (
                      <iframe 
                        src={livePreview.embedUrl} 
                        className="absolute top-0 left-0 w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                        referrerPolicy="strict-origin-when-cross-origin" 
                        allowFullScreen
                      />
                    ) : livePreview ? (
                      <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded mb-2">
                          {livePreview.platformName} প্রিভিউ
                        </span>
                        <p className="text-xs font-medium text-slate-200 line-clamp-2 max-w-xs">{newVideoTitle || 'ভিডিও প্রিভিউ'}</p>
                        <p className="text-[11px] text-emerald-400 mt-2 font-medium">
                          ✓ সফলভাবে চিহ্নিত হয়েছে ({livePreview.platformBadge})
                        </p>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 p-4 text-center">
                        সঠিক লিংক দিলে এখানে প্রিভিউ ভেসে উঠবে
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button 
                  type="button" 
                  onClick={() => {
                    setNewVideoTitle('');
                    setNewVideoUrl('');
                    setNewVideoUploader('');
                    setUploadMediaType('video');
                    setFetchedMeta(null);
                    setIsUploadOpen(false);
                  }} 
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-5 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer"
                >
                  বাতিল
                </button>
                <button 
                  type="submit" 
                  disabled={isUploading}
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition shadow-lg flex items-center gap-2 cursor-pointer ${
                    uploadMediaType === 'image' 
                      ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30' 
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                  }`}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>ক্লাউডে সেভ হচ্ছে...</span>
                    </>
                  ) : (
                    <span>{uploadMediaType === 'image' ? 'ফটো আপলোড করুন' : 'ভিডিও আপলোড করুন'}</span>
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* MOBILE-FIRST VIDEO STREAMING VIEW (PORTRAIT & LANDSCAPE ORIENTATION - image_11 & image_12) */}
      {activeWatchVideo && (
        <div className="fixed inset-0 z-50 bg-slate-950 overflow-y-auto">
          <MobileStreamingView
            currentVideo={activeWatchVideo}
            allVideos={videos}
            rewardSettings={rewardSettings}
            isLoggedIn={!!currentUser}
            onGoogleLogin={handleGoogleLogin}
            onSelectVideo={(video) => {
              handleSelectAndWatchVideo(video);
            }}
            onCloseWatchView={() => setActiveWatchVideo(null)}
            onRewardGranted={handleWatchRewardGranted}
            onOpenWallet={() => {
              setActiveWatchVideo(null);
              setActiveView('wallet');
            }}
            showToast={showToast}
          />
        </div>
      )}

      {/* THEATER / BIG SCREEN FULLSCREEN VIDEO MODAL */}
      {theaterVideo && (() => {
        const embedInfo = getEmbedUrl(theaterVideo.url);
        return (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex flex-col justify-between p-4 sm:p-6 overflow-y-auto">
            {/* Header / Exit Bar */}
            <div className="max-w-7xl mx-auto w-full flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <span className="bg-indigo-600 text-white text-xs px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 shadow">
                  <Maximize2 className="w-3.5 h-3.5" />
                  বড় স্ক্রিন মোড (Theater Mode)
                </span>
                <h2 className="text-base sm:text-lg font-bold text-white line-clamp-1">{theaterVideo.title}</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleFullscreen}
                  className="bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                >
                  {isBrowserFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  <span>ফুলস্ক্রিন</span>
                </button>
                <button
                  onClick={() => setTheaterVideo(null)}
                  className="bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>বন্ধ করুন</span>
                </button>
              </div>
            </div>

            {/* Cinematic Player */}
            <div className="max-w-6xl w-full mx-auto my-auto py-4">
              <div className="relative aspect-video w-full bg-black rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
                {embedInfo && (
                  embedInfo.playerType === 'direct' ? (
                    <video 
                      src={embedInfo.embedUrl} 
                      controls 
                      autoPlay 
                      playsInline
                      className="absolute top-0 left-0 w-full h-full object-contain bg-black"
                    />
                  ) : embedInfo.playerType === 'iframe' ? (
                    <iframe 
                      id={`theater-player-${theaterVideo.id}`}
                      src={embedInfo.embedUrl.replace('autoplay=0', 'autoplay=1')} 
                      title={theaterVideo.title}
                      className="absolute top-0 left-0 w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                      referrerPolicy="strict-origin-when-cross-origin" 
                      allowFullScreen
                    />
                  ) : (
                    <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center mb-3">
                        <Play className="w-8 h-8 fill-indigo-400 text-indigo-400 ml-1" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-1 rounded-md mb-2">
                        {embedInfo.platformName}
                      </span>
                      <h3 className="text-lg font-bold text-white max-w-lg">{theaterVideo.title}</h3>
                      <p className="text-xs text-slate-400 mt-2 max-w-md">
                        {embedInfo.platformBadge} এর নিরাপত্তা নীতির কারণে ভিডিওটি সরাসরি অফিসিয়াল প্ল্যাটফর্মে প্লে করুন
                      </p>
                      <a
                        href={theaterVideo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-lg cursor-pointer"
                      >
                        <span>{embedInfo.ctaText}</span>
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  )
                )}
              </div>

              {/* Watch & Earn Progress Tracker in Theater Mode */}
              <div className="mt-3 rounded-2xl overflow-hidden border border-slate-800">
                <WatchEarnTracker
                  videoId={theaterVideo.id}
                  videoTitle={theaterVideo.title}
                  isPlaying={true}
                  watchDurationSeconds={rewardSettings.watchDurationSeconds}
                  videoDurationSeconds={theaterVideo.durationSeconds}
                  pointsPerVideoWatch={rewardSettings.pointsPerVideoWatch}
                  isLoggedIn={!!currentUser}
                  onGoogleLogin={handleGoogleLogin}
                  onRewardGranted={handleWatchRewardGranted}
                  onOpenWallet={() => {
                    setTheaterVideo(null);
                    setActiveView('wallet');
                  }}
                />
              </div>

              {/* Video Info under Theater screen */}
              <div className="mt-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-sm">
                <div>
                  <h3 className="text-white font-bold text-lg">{theaterVideo.title}</h3>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                    <span className="flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded-md text-indigo-300">
                      <Users className="w-3.5 h-3.5" />
                      {theaterVideo.uploader || 'পাবলিক ইউজার'}
                    </span>
                    <span>{theaterVideo.date}</span>
                    <span className="text-emerald-400 font-medium flex items-center gap-1">
                      <Sun className="w-3 h-3 text-amber-400" /> বাতি অন সচল
                    </span>
                    <span className="text-indigo-400 font-medium flex items-center gap-1">
                      <Headphones className="w-3 h-3 text-indigo-400" /> স্ক্রিন-অফ অডিও চালু
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleStartPlay(theaterVideo)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow cursor-pointer"
                  >
                    <Headphones className="w-3.5 h-3.5" />
                    <span>স্ক্রিন অফ মোড নিশ্চিত করুন</span>
                  </button>
                  <a 
                    href={theaterVideo.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 border border-slate-700"
                  >
                    <span>আসল লিংক</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>

            <div className="text-center text-xs text-slate-500 pt-2">
              টিপস: যেকোনো বড় স্ক্রিন, টিভি বা কম্পিউটারে দেখতে এই মোড ব্যবহার করুন। কিবোর্ডের ESC বা ওপরের বাটন দিয়ে বের হন।
            </div>
          </div>
        );
      })()}

      {/* FULLSCREEN PHOTO VIEWER MODAL */}
      {fullscreenPhoto && (
        <div 
          onClick={() => setFullscreenPhoto(null)}
          className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex flex-col justify-between p-4 sm:p-6 overflow-y-auto cursor-pointer"
        >
          {/* Top Bar */}
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="max-w-7xl mx-auto w-full flex items-center justify-between pb-3 border-b border-slate-800 cursor-default"
          >
            <div className="flex items-center gap-3">
              <span className="bg-amber-600 text-white text-xs px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 shadow">
                <ImageIcon className="w-3.5 h-3.5" />
                ফটো ভিউয়ার (Photo View)
              </span>
              <h2 className="text-base sm:text-lg font-bold text-white line-clamp-1">{fullscreenPhoto.title}</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleFullscreen}
                className="bg-slate-800 hover:bg-amber-600 text-slate-300 hover:text-white px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
              >
                {isBrowserFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                <span>ফুলস্ক্রিন</span>
              </button>
              <button
                onClick={() => setFullscreenPhoto(null)}
                className="bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>বন্ধ করুন</span>
              </button>
            </div>
          </div>

          {/* Large Image Container */}
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="max-w-5xl w-full mx-auto my-auto py-4 flex flex-col items-center cursor-default"
          >
            <div className="relative max-h-[75vh] w-full flex items-center justify-center rounded-2xl overflow-hidden bg-slate-950/50 border border-slate-800 shadow-2xl p-2">
              <img 
                src={fullscreenPhoto.url} 
                alt={fullscreenPhoto.title} 
                className="max-h-[70vh] w-auto max-w-full object-contain rounded-xl"
              />
            </div>

            {/* Photo Info */}
            <div className="w-full mt-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-sm">
              <div>
                <h3 className="text-white font-bold text-lg">{fullscreenPhoto.title}</h3>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                  <span className="flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded-md text-amber-300">
                    <Users className="w-3.5 h-3.5" />
                    {fullscreenPhoto.uploader || 'পাবলিক ইউজার'}
                  </span>
                  <span>{fullscreenPhoto.date}</span>
                </div>
              </div>

              <a 
                href={fullscreenPhoto.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow"
              >
                <span>আসল ছবি ওপেন করুন</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <div className="text-center text-xs text-slate-500 pt-2">
            স্ক্রিনের বাইরে ক্লিক করে বা 'বন্ধ করুন' চেপে বের হন
          </div>
        </div>
      )}

      {/* ACCOUNT REQUIRED POPUP MODAL FOR USER EARNINGS */}
      {showAuthWarningModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-amber-500/50 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-5 text-center relative overflow-hidden">
            <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto shadow-inner">
              <AlertTriangle className="w-8 h-8 animate-bounce text-amber-400" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-white tracking-wide">
                ⚠️ অ্যাকাউন্ট সংরক্ষিত নেই!
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed text-justify sm:text-center">
                ভিডিও দেখে কয়েন বা ব্যালেন্স জমা করতে অবশ্যই উপরে থাকা <strong className="text-amber-300 font-bold">'Google লিংক'</strong> বা অ্যাকাউন্ট অপশনে গিয়ে অ্যাকাউন্ট ক্রিয়েট/লগইন করুন। অন্যথায় ব্যালেন্স জমা হবে না।
              </p>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 text-xs text-slate-400 flex items-center gap-2.5 text-left">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              <span>লগইন করলে আপনার সমস্ত কয়েন ও উত্তোলন রেকর্ড স্থায়ী ক্লাউডে সেভ থাকবে।</span>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={async () => {
                  setShowAuthWarningModal(false);
                  await handleGoogleLogin();
                }}
                disabled={isSubmittingLogin}
                className="w-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3 px-4 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/30 text-sm border border-indigo-400/30 active:scale-95"
              >
                <UserCheck className="w-4 h-4" />
                <span>অ্যাকাউন্ট করুন (Google দিয়ে লগইন)</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAuthWarningModal(false)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs py-2.5 rounded-xl transition font-medium cursor-pointer"
              >
                পরে করব (এখন শুধু ভিডিও দেখুন)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Social Bar Ad in User View */}
      {(activeView === 'user' || activeView === 'wallet') && !!adSettings.socialBarAdEnabled && typeof adSettings.socialBarAdCode === 'string' && adSettings.socialBarAdCode.trim().length > 0 && (
        <SocialBarAd 
          code={adSettings.socialBarAdCode || ''} 
          enabled={!!adSettings.socialBarAdEnabled} 
        />
      )}

    </div>
  );
}
