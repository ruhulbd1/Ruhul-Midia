import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Play, 
  Pause, 
  Maximize2, 
  Minimize2, 
  ChevronDown, 
  ChevronLeft, 
  ThumbsUp, 
  ThumbsDown, 
  Share2, 
  Download, 
  Bookmark, 
  MessageSquare, 
  Check, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Settings, 
  Subtitles, 
  ListVideo, 
  X, 
  Clock, 
  Eye, 
  Send, 
  ArrowRight,
  RotateCcw,
  RotateCw,
  Tv,
  CheckCircle,
  Bell,
  ExternalLink,
  Coins,
  AlertTriangle,
  UserCheck
} from 'lucide-react';
import { VideoPlatform, parseUniversalMediaUrl, formatDurationSeconds } from '../utils/videoParser';
import WatchEarnTracker from './WatchEarnTracker';
import { RewardSettings } from '../types/earning';

interface Video {
  id: string;
  title: string;
  url: string;
  type: VideoPlatform;
  date: string;
  uploader?: string;
  uploaderId?: string;
  createdAt?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  durationFormatted?: string;
}

interface Comment {
  id: string;
  author: string;
  avatarText: string;
  content: string;
  timestamp: string;
  likes: number;
}

interface MobileStreamingViewProps {
  currentVideo: Video;
  allVideos: Video[];
  rewardSettings: RewardSettings;
  isLoggedIn?: boolean;
  onGoogleLogin?: () => void;
  onSelectVideo: (video: Video) => void;
  onCloseWatchView: () => void;
  onRewardGranted: (rewardPoints: number, videoId: string) => void;
  onOpenWallet: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function MobileStreamingView({
  currentVideo,
  allVideos,
  rewardSettings,
  isLoggedIn = true,
  onGoogleLogin,
  onSelectVideo,
  onCloseWatchView,
  onRewardGranted,
  onOpenWallet,
  showToast
}: MobileStreamingViewProps) {
  // 1. Playback & Fullscreen Orientation States
  const [isPlaying, setIsPlaying] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isZoomFill, setIsZoomFill] = useState(false); // Aspect ratio Zoom vs Fit
  const [showControls, setShowControls] = useState(true);
  const [showInPlayerMoreVideos, setShowInPlayerMoreVideos] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showCommentsDrawer, setShowCommentsDrawer] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isSubtitlesOn, setIsSubtitlesOn] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // 2. Interactive Video Action States
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(2450);
  const [isDisliked, setIsDisliked] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  // 3. Comments State
  const [comments, setComments] = useState<Comment[]>([
    {
      id: 'c1',
      author: 'আরিফুল ইসলাম',
      avatarText: 'আ',
      content: 'অসাধারণ কোয়ালিটির ভিডিও! মোবাইল ফুলস্ক্রিনে দেখতে খুবই দারুণ লাগছে।',
      timestamp: '২ ঘণ্টা আগে',
      likes: 42
    },
    {
      id: 'c2',
      author: 'তানভীর আহমেদ',
      avatarText: 'তা',
      content: 'ওয়াচ অ্যান্ড আর্ন পয়েন্ট সাথে সাথে ওয়ালেটে যুক্ত হচ্ছে। ধন্যবাদ রুহুল মিডিয়া!',
      timestamp: '৫ ঘণ্টা আগে',
      likes: 19
    },
    {
      id: 'c3',
      author: 'মাহবুবুর রহমান',
      avatarText: 'মা',
      content: 'সাউন্ড এবং ভিডিও পিকচার কোয়ালিটি অনেক ক্লিয়ার। পরবর্তী ভিডিওর অপেক্ষায় রইলাম।',
      timestamp: '১ দিন আগে',
      likes: 11
    }
  ]);
  const [newCommentText, setNewCommentText] = useState('');

  // 4. Progress Scrubber State
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const totalDurationSec = currentVideo.durationSeconds && currentVideo.durationSeconds > 0 
    ? currentVideo.durationSeconds 
    : 320; // 5m 20s fallback

  // Refs for Touch Gestures and Auto-Hide Timer
  const touchStartYRef = useRef<number | null>(null);
  const pointerStartYRef = useRef<number | null>(null);
  const controlsTimeoutRef = useRef<any>(null);
  const progressIntervalRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const media = useMemo(() => {
    return parseUniversalMediaUrl(currentVideo.url);
  }, [currentVideo.url]);

  // Recommended Videos (excluding current video)
  const recommendedVideos = useMemo(() => {
    return allVideos.filter(v => v.id !== currentVideo.id);
  }, [allVideos, currentVideo.id]);

  const isFullScreenRef = useRef(isFullScreen);
  useEffect(() => {
    isFullScreenRef.current = isFullScreen;
  }, [isFullScreen]);

  // -------------------------------------------------------------
  // WEB SCREEN WAKE LOCK API: Keep screen on while video is playing
  // Re-enables sleep when paused or unmounted
  // -------------------------------------------------------------
  const wakeLockRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;

    const requestScreenWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && isPlaying && document.visibilityState === 'visible') {
          if (wakeLockRef.current) {
            try {
              await wakeLockRef.current.release();
            } catch {}
          }
          const lock = await (navigator as any).wakeLock.request('screen');
          if (isMounted) {
            wakeLockRef.current = lock;
            lock.addEventListener('release', () => {
              wakeLockRef.current = null;
            });
          }
        }
      } catch (err) {
        console.warn('Screen WakeLock notice:', err);
      }
    };

    const releaseScreenWakeLock = async () => {
      if (wakeLockRef.current) {
        try {
          await wakeLockRef.current.release();
        } catch {}
        wakeLockRef.current = null;
      }
    };

    if (isPlaying) {
      requestScreenWakeLock();
    } else {
      releaseScreenWakeLock();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isPlaying) {
        requestScreenWakeLock();
      } else {
        releaseScreenWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseScreenWakeLock();
    };
  }, [isPlaying]);

  // -------------------------------------------------------------
  // AUTOMATIC SCREEN ORIENTATION & FULLSCREEN DETECTION
  // -------------------------------------------------------------
  useEffect(() => {
    const handleOrientationChange = () => {
      let isLandscape = false;
      if (window.screen?.orientation) {
        isLandscape = window.screen.orientation.type.includes('landscape');
      } else {
        isLandscape = window.matchMedia('(orientation: landscape)').matches || 
          (window.innerWidth > window.innerHeight && (window.innerWidth <= 1024 || 'ontouchstart' in window));
      }

      // If mobile/tablet or touch device rotated to landscape, switch to full-screen
      const isMobileDevice = window.innerWidth <= 1024 || ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
      if (isLandscape && isMobileDevice) {
        setIsFullScreen(true);
      } else if (!isLandscape && isMobileDevice) {
        setIsFullScreen(false);
        setShowInPlayerMoreVideos(false);
      }
    };

    // Listen to screen orientation changes
    if (window.screen?.orientation) {
      window.screen.orientation.addEventListener('change', handleOrientationChange);
    }
    window.addEventListener('orientationchange', handleOrientationChange);

    const mql = window.matchMedia('(orientation: landscape)');
    mql.addEventListener('change', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);

    // Fullscreen change listener
    const handleFullscreenChange = () => {
      const isDocFull = !!document.fullscreenElement;
      if (!isDocFull && isFullScreenRef.current) {
        // Exited full-screen
        setIsFullScreen(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    // Initial check on mount
    handleOrientationChange();

    return () => {
      if (window.screen?.orientation) {
        window.screen.orientation.removeEventListener('change', handleOrientationChange);
      }
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleOrientationChange);
      mql.removeEventListener('change', handleOrientationChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Dispatch commands to YouTube iframe (via postMessage) or HTML5 video
  const sendPlayerCommand = (command: string, args: any[] = []) => {
    try {
      const iframe = document.getElementById('stream-iframe-core') as HTMLIFrameElement;
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage(
          JSON.stringify({
            event: 'command',
            func: command,
            args: args
          }),
          '*'
        );
      }
    } catch {}
  };

  // Handle Fullscreen Toggle
  const toggleFullScreen = async () => {
    if (!isFullScreen) {
      setIsFullScreen(true);
      setShowControls(true);
      resetControlsTimeout();
      try {
        if (containerRef.current && containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        } else if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
        // Try orientation lock if supported on mobile
        if ((screen.orientation as any)?.lock) {
          await (screen.orientation as any).lock('landscape').catch(() => {});
        }
      } catch (err) {
        // Soft fallback
      }
    } else {
      exitFullScreen();
    }
  };

  const exitFullScreen = async () => {
    setIsFullScreen(false);
    setShowInPlayerMoreVideos(false);
    setShowSettingsMenu(false);
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      }
      if ((screen.orientation as any)?.unlock) {
        (screen.orientation as any).unlock();
      }
    } catch {}
  };

  // Playback Control Handlers
  const handleTogglePlay = () => {
    const nextPlay = !isPlaying;
    setIsPlaying(nextPlay);
    resetControlsTimeout();
    sendPlayerCommand(nextPlay ? 'playVideo' : 'pauseVideo');
    const videoEl = document.getElementById('stream-video-core') as HTMLVideoElement;
    if (videoEl) {
      if (nextPlay) videoEl.play().catch(() => {});
      else videoEl.pause();
    }
  };

  const handleSeekRelative = (seconds: number) => {
    const target = Math.max(0, Math.min(totalDurationSec, currentTimeSec + seconds));
    setCurrentTimeSec(target);
    resetControlsTimeout();
    sendPlayerCommand('seekTo', [target, true]);
    const videoEl = document.getElementById('stream-video-core') as HTMLVideoElement;
    if (videoEl) {
      videoEl.currentTime = target;
    }
    showToast(seconds > 0 ? `+${seconds} সেকেন্ড এগিয়ে নেওয়া হয়েছে` : `${seconds} সেকেন্ড পেছানো হয়েছে`, 'info');
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    sendPlayerCommand(nextMuted ? 'mute' : 'unMute');
    const videoEl = document.getElementById('stream-video-core') as HTMLVideoElement;
    if (videoEl) {
      videoEl.muted = nextMuted;
    }
    showToast(nextMuted ? 'শব্দ মিউট করা হয়েছে' : 'শব্দ চালু করা হয়েছে', 'info');
  };

  const handleSetSpeed = (spd: number) => {
    setPlaybackSpeed(spd);
    setShowSettingsMenu(false);
    sendPlayerCommand('setPlaybackRate', [spd]);
    const videoEl = document.getElementById('stream-video-core') as HTMLVideoElement;
    if (videoEl) {
      videoEl.playbackRate = spd;
    }
    showToast(`স্পিড: ${spd}x`, 'info');
  };

  // -------------------------------------------------------------
  // CONTROLS AUTO-HIDE & INTERACTIVITY TIMEOUT
  // -------------------------------------------------------------
  const resetControlsTimeout = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
        setShowSettingsMenu(false);
      }, 3500);
    }
  };

  const handlePlayerAreaClick = () => {
    setShowControls(prev => !prev);
    if (!showControls) {
      resetControlsTimeout();
    }
  };

  // Simulated progress timer for custom landscape overlay
  useEffect(() => {
    if (isPlaying) {
      progressIntervalRef.current = setInterval(() => {
        setCurrentTimeSec(prev => {
          if (prev >= totalDurationSec) {
            return totalDurationSec;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    }
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isPlaying, totalDurationSec]);

  // Reset and smoothly switch when video changes
  useEffect(() => {
    setCurrentTimeSec(0);
    setIsPlaying(true);
    setIsLiked(false);
    setIsDisliked(false);
    setIsDownloaded(false);
    setShowInPlayerMoreVideos(false);
    resetControlsTimeout();
    // Scroll container and window to top so main top player is immediately in focus
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    const parentContainer = containerRef.current?.parentElement;
    if (parentContainer) {
      parentContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentVideo.id]);

  // Touch & Pointer Gesture: Swipe Down / Drag Down to Exit Full-Screen or Minimize
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartYRef.current === null) return;
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchEndY - touchStartYRef.current;
    if (isFullScreen && diff > 80) {
      exitFullScreen();
      showToast('ফুলস্ক্রিন থেকে প্রস্থান করা হয়েছে', 'info');
    }
    touchStartYRef.current = null;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    pointerStartYRef.current = e.clientY;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (pointerStartYRef.current === null) return;
    const diff = e.clientY - pointerStartYRef.current;
    if (isFullScreen && diff > 80) {
      exitFullScreen();
      showToast('ফুলস্ক্রিন থেকে প্রস্থান করা হয়েছে', 'info');
    }
    pointerStartYRef.current = null;
  };

  // Actions
  const handleLike = () => {
    if (isLiked) {
      setIsLiked(false);
      setLikeCount(prev => prev - 1);
    } else {
      setIsLiked(true);
      setLikeCount(prev => prev + 1);
      setIsDisliked(false);
      showToast('ভিডিওতে লাইক দেওয়া হয়েছে!', 'success');
    }
  };

  const handleDislike = () => {
    if (isDisliked) {
      setIsDisliked(false);
    } else {
      setIsDisliked(true);
      if (isLiked) {
        setIsLiked(false);
        setLikeCount(prev => prev - 1);
      }
      showToast('ডিসলাইক করা হয়েছে', 'info');
    }
  };

  const handleSubscribe = () => {
    if (isSubscribed) {
      setIsSubscribed(false);
      showToast('সাবস্ক্রিপশন বাতিল করা হয়েছে', 'info');
    } else {
      setIsSubscribed(true);
      showToast('🎉 চ্যানেল সাবস্ক্রাইব করা হয়েছে! নতুন ভিডিওর নোটিফিকেশন পাবেন।', 'success');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: currentVideo.title,
          url: currentVideo.url
        });
      } catch {}
    } else {
      navigator.clipboard?.writeText(currentVideo.url);
      showToast('ভিডিও লিংক কপি করা হয়েছে!', 'success');
    }
  };

  const handleDownload = () => {
    if (isDownloaded) {
      showToast('ভিডিওটি ইতিমধ্যে অফলাইনে ডাউনলোড করা আছে', 'info');
      return;
    }
    showToast('অফলাইন ডাউনলোড শুরু হয়েছে...', 'info');
    setDownloadProgress(20);
    const t1 = setTimeout(() => setDownloadProgress(65), 600);
    const t2 = setTimeout(() => {
      setDownloadProgress(100);
      setIsDownloaded(true);
      showToast('✓ ভিডিও সফলভাবে অফলাইন মেমরিতে ডাউনলোড হয়েছে!', 'success');
    }, 1400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    const newC: Comment = {
      id: Date.now().toString(),
      author: 'আপনি (ইউজার)',
      avatarText: 'আ',
      content: newCommentText.trim(),
      timestamp: 'এইমাত্র',
      likes: 0
    };
    setComments([newC, ...comments]);
    setNewCommentText('');
    showToast('আপনার মন্তব্য যুক্ত হয়েছে!', 'success');
  };

  const seekRelative = (seconds: number) => {
    setCurrentTimeSec(prev => Math.max(0, Math.min(totalDurationSec, prev + seconds)));
    resetControlsTimeout();
    showToast(seconds > 0 ? `+${seconds} সেকেন্ড এগিয়ে নেওয়া হয়েছে` : `${seconds} সেকেন্ড পেছানো হয়েছে`, 'info');
  };

  return (
    <div 
      ref={containerRef}
      className={`bg-slate-950 text-slate-100 min-h-screen flex flex-col font-sans transition-all duration-300 ${
        isFullScreen ? 'fixed inset-0 z-50 overflow-hidden w-screen h-screen' : 'relative w-full'
      }`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      
      {/* ============================================================== */}
      {/* 1. TOP VIDEO PLAYER / MINI-PLAYER VIDEO (Fixed 16:9, Edge-to-Edge in Landscape, or Mini Box) */}
      {/* ============================================================== */}

      <div 
        className={`relative bg-black transition-all duration-300 select-none overflow-hidden ${
          isFullScreen 
            ? 'w-full h-full flex items-center justify-center' 
            : 'w-full aspect-video shadow-2xl border-b border-slate-800'
        }`}
        onMouseMove={resetControlsTimeout}
        onClick={handlePlayerAreaClick}
      >
        
        {/* Core Media Player (Maintains same iframe/video for continuous playback) */}
        {media ? (
          media.playerType === 'direct' ? (
            <video 
              key={`stream-video-${currentVideo.id}`}
              id="stream-video-core"
              src={media.embedUrl} 
              autoPlay 
              controls={!isFullScreen}
              muted={isMuted}
              className={`w-full h-full transition-all duration-300 ${
                isFullScreen && isZoomFill ? 'object-cover' : 'object-contain'
              }`}
            />
          ) : media.playerType === 'iframe' ? (
            <iframe 
              key={`stream-iframe-${currentVideo.id}`}
              id="stream-iframe-core"
              src={media.embedUrl.replace('autoplay=0', 'autoplay=1') + (media.type === 'youtube' && !media.embedUrl.includes('playsinline') ? '&playsinline=1&enablejsapi=1' : '')} 
              title={currentVideo.title}
              className={`w-full h-full border-0 transition-all duration-300 ${
                isFullScreen && isZoomFill ? 'scale-110 object-cover' : 'scale-100 object-contain'
              }`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen" 
              referrerPolicy="strict-origin-when-cross-origin" 
              allowFullScreen
            />
          ) : (
            <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
              <Tv className="w-10 h-10 text-indigo-400 mb-2" />
              <h3 className="text-sm font-bold text-white max-w-sm">{currentVideo.title}</h3>
              <a 
                href={currentVideo.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="mt-3 bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
              >
                <span>{media.ctaText}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-rose-400">
            ভিডিও লোড করা যায়নি
          </div>
        )}

        {/* Invisible Tap Catcher when controls are auto-hidden in Fullscreen Mode */}
        {isFullScreen && !showControls && (
          <div 
            className="absolute inset-0 z-20 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setShowControls(true);
              resetControlsTimeout();
            }}
          />
        )}

        {/* ---------------------------------------------------------- */}
        {/* LANDSCAPE / FULL-SCREEN SPECIALIZED OVERLAYS (image_12.png) */}
        {/* ---------------------------------------------------------- */}
        {isFullScreen && (
          <div 
            className={`absolute inset-0 z-30 flex flex-col justify-between p-4 sm:p-6 bg-gradient-to-t from-black/80 via-black/30 to-black/80 transition-opacity duration-300 pointer-events-auto ${
              showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              resetControlsTimeout();
            }}
          >
            {/* Landscape Top Bar (Minimizer, Title, CC, Settings, Zoom) */}
            <div className="flex items-center justify-between text-white drop-shadow-md">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={exitFullScreen}
                  className="w-10 h-10 rounded-full bg-black/50 hover:bg-white/20 flex items-center justify-center transition cursor-pointer backdrop-blur-sm"
                  title="ফুলস্ক্রিন থেকে বের হন (Exit Full-Screen)"
                >
                  <ChevronDown className="w-6 h-6 text-white" />
                </button>
                <div className="min-w-0">
                  <h2 className="text-sm sm:text-base font-bold text-white truncate max-w-md">
                    {currentVideo.title}
                  </h2>
                  <p className="text-[11px] text-slate-300 truncate font-medium">
                    {currentVideo.uploader || 'রুহুল মিডিয়া'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Aspect Ratio Zoom/Fill Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    setIsZoomFill(!isZoomFill);
                    showToast(!isZoomFill ? 'স্ক্রিন ফিল মোড (Zoom to Fill)' : 'ফিট মোড (Fit: 16:9)', 'info');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 backdrop-blur-sm cursor-pointer ${
                    isZoomFill 
                      ? 'bg-amber-500 text-slate-950 font-bold' 
                      : 'bg-black/50 hover:bg-white/20 text-white'
                  }`}
                  title="অ্যাসপেক্ট রেশিও অ্যাডজাস্ট"
                >
                  <span>{isZoomFill ? 'জুম ফিল্ড' : 'ফিট ১৬:৯'}</span>
                </button>

                {/* Subtitles / CC Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    setIsSubtitlesOn(!isSubtitlesOn);
                    showToast(isSubtitlesOn ? 'সাবটাইটেল বন্ধ' : 'সাবটাইটেল চালু', 'info');
                  }}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition backdrop-blur-sm cursor-pointer ${
                    isSubtitlesOn ? 'bg-indigo-600 text-white' : 'bg-black/50 hover:bg-white/20 text-white'
                  }`}
                  title="সাবটাইটেল"
                >
                  <Subtitles className="w-4 h-4" />
                </button>

                {/* Mute Toggle */}
                <button
                  type="button"
                  onClick={handleToggleMute}
                  className="w-9 h-9 rounded-full bg-black/50 hover:bg-white/20 flex items-center justify-center transition backdrop-blur-sm cursor-pointer text-white"
                  title="শব্দ নিয়ন্ত্রণ"
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
                </button>

                {/* Settings Gear */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                    className="w-9 h-9 rounded-full bg-black/50 hover:bg-white/20 flex items-center justify-center transition backdrop-blur-sm cursor-pointer text-white"
                    title="সেটিংস"
                  >
                    <Settings className="w-4 h-4" />
                  </button>

                  {/* Settings dropdown */}
                  {showSettingsMenu && (
                    <div className="absolute right-0 top-11 bg-slate-900/95 border border-slate-800 rounded-2xl p-3 shadow-2xl backdrop-blur-md w-48 space-y-2 text-xs z-50 animate-fadeIn">
                      <span className="font-bold text-slate-400 block px-1 pb-1 border-b border-slate-800">
                        প্লেব্যাক স্পিড
                      </span>
                      {[0.75, 1, 1.25, 1.5, 2].map((spd) => (
                        <button
                          key={spd}
                          type="button"
                          onClick={() => handleSetSpeed(spd)}
                          className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between cursor-pointer ${
                            playbackSpeed === spd ? 'bg-indigo-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <span>{spd === 1 ? 'স্বাভাবিক (Normal)' : `${spd}x`}</span>
                          {playbackSpeed === spd && <Check className="w-3.5 h-3.5" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Landscape Center Transport Controls (Rewind 10s, Play/Pause, Fast-Forward 10s) */}
            <div className="flex items-center justify-center gap-8 text-white drop-shadow-2xl">
              <button
                type="button"
                onClick={() => handleSeekRelative(-10)}
                className="w-12 h-12 rounded-full bg-black/40 hover:bg-white/20 flex flex-col items-center justify-center transition cursor-pointer backdrop-blur-sm active:scale-95"
                title="১০ সেকেন্ড পেছনে"
              >
                <RotateCcw className="w-5 h-5 text-white" />
                <span className="text-[9px] font-bold mt-0.5">10s</span>
              </button>

              <button
                type="button"
                onClick={handleTogglePlay}
                className="w-18 h-18 rounded-full bg-white text-slate-950 hover:scale-105 active:scale-95 flex items-center justify-center transition shadow-2xl cursor-pointer"
                title={isPlaying ? "বিরতি" : "চালান"}
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8 fill-slate-950 text-slate-950" />
                ) : (
                  <Play className="w-8 h-8 fill-slate-950 text-slate-950 ml-1" />
                )}
              </button>

              <button
                type="button"
                onClick={() => handleSeekRelative(10)}
                className="w-12 h-12 rounded-full bg-black/40 hover:bg-white/20 flex flex-col items-center justify-center transition cursor-pointer backdrop-blur-sm active:scale-95"
                title="১০ সেকেন্ড সামনে"
              >
                <RotateCw className="w-5 h-5 text-white" />
                <span className="text-[9px] font-bold mt-0.5">10s</span>
              </button>
            </div>

            {/* Landscape Bottom Bar (Progress Bar, Timestamps, In-player More Videos, Exit Fullscreen) */}
            <div className="space-y-2">
              {/* Progress Bar Scrubber */}
              <div className="relative group cursor-pointer w-full flex items-center">
                <input 
                  type="range"
                  min="0"
                  max={totalDurationSec}
                  value={currentTimeSec}
                  onChange={(e) => setCurrentTimeSec(parseInt(e.target.value) || 0)}
                  className="w-full h-1.5 bg-white/30 rounded-full appearance-none cursor-pointer accent-indigo-500 hover:h-2.5 transition-all"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-white">
                <div className="flex items-center gap-2 font-mono font-medium">
                  <span>{formatDurationSeconds(currentTimeSec)}</span>
                  <span className="text-slate-400">/</span>
                  <span className="text-slate-300">{formatDurationSeconds(totalDurationSec)}</span>
                </div>

                <div className="flex items-center gap-3">
                  {/* "More videos" in-player drawer toggle */}
                  <button
                    type="button"
                    onClick={() => setShowInPlayerMoreVideos(!showInPlayerMoreVideos)}
                    className="bg-black/60 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl border border-white/20 transition flex items-center gap-1.5 text-xs font-semibold backdrop-blur-sm cursor-pointer"
                  >
                    <ListVideo className="w-4 h-4 text-amber-400" />
                    <span>অন্যান্য ভিডিও ({recommendedVideos.length})</span>
                  </button>

                  {/* Exit Full-Screen Button */}
                  <button
                    type="button"
                    onClick={exitFullScreen}
                    className="w-9 h-9 rounded-full bg-black/60 hover:bg-white/20 flex items-center justify-center transition cursor-pointer text-white"
                    title="পোর্ট্রেট মোডে ফিরুন"
                  >
                    <Minimize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* In-player "More Videos" horizontal thumbnail drawer (without leaving full-screen!) */}
            {showInPlayerMoreVideos && (
              <div className="absolute inset-x-0 bottom-0 bg-slate-950/95 border-t border-slate-800 p-4 backdrop-blur-xl z-40 transition animate-slideUp">
                <div className="flex items-center justify-between pb-3">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    পরবর্তী ভিডিও তালিকা (Next Videos)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowInPlayerMoreVideos(false)}
                    className="text-slate-400 hover:text-white p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
                  {recommendedVideos.slice(0, 10).map((v) => (
                    <div
                      key={v.id}
                      onClick={() => {
                        onSelectVideo(v);
                        setShowInPlayerMoreVideos(false);
                      }}
                      className="w-44 shrink-0 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden cursor-pointer group hover:border-indigo-500 transition"
                    >
                      <div className="relative aspect-video bg-black">
                        <img 
                          src={v.thumbnailUrl || (v.url.includes('youtu') ? `https://img.youtube.com/vi/${v.url.split('v=')[1] || 'default'}/hqdefault.jpg` : 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=320&h=180&fit=crop')} 
                          alt={v.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300" 
                        />
                        {v.durationFormatted && (
                          <span className="absolute bottom-1 right-1 bg-black/80 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded">
                            {v.durationFormatted}
                          </span>
                        )}
                      </div>
                      <div className="p-2">
                        <h4 className="text-[11px] font-semibold text-white line-clamp-1 group-hover:text-indigo-400">
                          {v.title}
                        </h4>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                          {v.uploader || 'রুহুল মিডিয়া'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        {/* Portrait Mode Full-Screen Button at Bottom Right of Player */}
        {!isFullScreen && (
          <button
            type="button"
            onClick={toggleFullScreen}
            className="absolute bottom-3 right-3 bg-slate-950/80 hover:bg-indigo-600 text-white p-2 rounded-xl backdrop-blur-md border border-slate-700/80 transition shadow-xl z-20 flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
            title="ফুলস্ক্রিন বা ল্যান্ডস্কেপ মোড চালু করুন"
          >
            <Maximize2 className="w-4 h-4 text-indigo-300 group-hover:text-white" />
            <span className="hidden sm:inline">ফুলস্ক্রিন</span>
          </button>
        )}

      </div>

      {/* ============================================================== */}
      {/* 2. PORTRAIT MODE BODY CONTENT (image_11.png) */}
      {/* ============================================================== */}
      {!isFullScreen && (
        <div className="flex-1 max-w-4xl w-full mx-auto px-4 py-4 space-y-5 animate-fadeIn">
          
          {/* A. Top Navigation & Close Watch Page */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onCloseWatchView}
                className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>মূল ফিডে যান (Back)</span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleFullScreen}
                className="text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 px-2.5 py-1 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                title="ফুলস্ক্রিন বা ল্যান্ডস্কেপ মোড চালু করুন"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>ফুলস্ক্রিন / Landscape</span>
              </button>
              <span className="text-[11px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full font-bold uppercase">
                {currentVideo.type} স্ট্রিম
              </span>
            </div>
          </div>

          {/* Unauthenticated / Anonymous User Warning Banner */}
          {!isLoggedIn && (
            <div className="bg-gradient-to-r from-amber-950/90 via-slate-900 to-amber-950/90 border-2 border-amber-500/70 rounded-2xl p-4 sm:p-4.5 shadow-2xl shadow-amber-950/40 flex flex-col sm:flex-row items-center justify-between gap-3.5 animate-pulse">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shrink-0 mt-0.5 shadow-inner">
                  <AlertTriangle className="w-5 h-5 text-amber-400 animate-bounce" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs sm:text-sm font-bold text-amber-200 leading-snug">
                    ⚠️ আপনার অ্যাকাউন্ট সংরক্ষিত নেই! ভিডিও দেখে কয়েন বা ব্যালেন্স জমা করতে অবশ্যই উপরে থাকা 'Google লিংক' বা অ্যাকাউন্ট অপশনে গিয়ে অ্যাকাউন্ট ক্রিয়েট/লগইন করুন। অন্যথায় ব্যালেন্স জমা হবে না।
                  </p>
                  <p className="text-[11px] text-slate-300">
                    লগইন করলে আপনার সমস্ত কয়েন ও উত্তোলন রেকর্ড স্থায়ী ক্লাউডে সেভ থাকবে।
                  </p>
                </div>
              </div>
              {onGoogleLogin && (
                <button
                  type="button"
                  onClick={onGoogleLogin}
                  className="w-full sm:w-auto shrink-0 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/30 active:scale-95 border border-amber-300/40"
                >
                  <UserCheck className="w-4 h-4 text-slate-950" />
                  <span>অ্যাকাউন্ট করুন</span>
                </button>
              )}
            </div>
          )}

          {/* B. Video Title & Metadata */}
          <div className="space-y-1.5">
            <h1 className="text-lg sm:text-xl font-bold text-white leading-snug">
              {currentVideo.title}
            </h1>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span>{likeCount.toLocaleString()} ভিউজ</span>
              <span>•</span>
              <span>{currentVideo.date || 'আজকে'}</span>
              <span>•</span>
              <span className="text-indigo-400 font-medium">#রুহুল_মিডিয়া</span>
            </div>
          </div>

          {/* C. Channel & Uploader Info Row with "Subscribe" Button */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center font-bold text-base text-white shrink-0 shadow-lg">
                {(currentVideo.uploader || 'R')[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm text-white truncate">
                    {currentVideo.uploader || 'RUHUL MIDIA OFFICIAL'}
                  </h3>
                  <CheckCircle className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  ৪৫০K সাবস্ক্রাইবার
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSubscribe}
              className={`px-4 py-2 rounded-full text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-lg ${
                isSubscribed 
                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' 
                  : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
              }`}
            >
              {isSubscribed ? (
                <>
                  <Bell className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span>সাবস্ক্রাইবড</span>
                </>
              ) : (
                <span>সাবস্ক্রাইব</span>
              )}
            </button>
          </div>

          {/* D. Scrollable Action Buttons Bar (Like, Dislike, Share, Download, Save) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {/* Like/Dislike Pill */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-full shrink-0 overflow-hidden shadow">
              <button
                type="button"
                onClick={handleLike}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold transition cursor-pointer hover:bg-slate-800 ${
                  isLiked ? 'text-indigo-400 font-bold' : 'text-slate-300'
                }`}
              >
                <ThumbsUp className={`w-3.5 h-3.5 ${isLiked ? 'fill-indigo-400' : ''}`} />
                <span>{likeCount.toLocaleString()}</span>
              </button>
              <div className="w-[1px] h-4 bg-slate-800" />
              <button
                type="button"
                onClick={handleDislike}
                className={`px-3 py-2 text-xs font-semibold transition cursor-pointer hover:bg-slate-800 ${
                  isDisliked ? 'text-rose-400' : 'text-slate-400'
                }`}
                title="পছন্দ নয়"
              >
                <ThumbsDown className={`w-3.5 h-3.5 ${isDisliked ? 'fill-rose-400' : ''}`} />
              </button>
            </div>

            {/* Share */}
            <button
              type="button"
              onClick={handleShare}
              className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 px-3.5 py-2 rounded-full text-xs font-semibold transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow"
            >
              <Share2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>শেয়ার</span>
            </button>

            {/* Download */}
            <button
              type="button"
              onClick={handleDownload}
              className={`border border-slate-800 px-3.5 py-2 rounded-full text-xs font-semibold transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow ${
                isDownloaded 
                  ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-400' 
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300'
              }`}
            >
              <Download className={`w-3.5 h-3.5 ${isDownloaded ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span>{isDownloaded ? 'ডাউনলোডেড' : 'ডাউনলোড'}</span>
            </button>

            {/* Save to Playlist */}
            <button
              type="button"
              onClick={() => {
                setIsSaved(!isSaved);
                showToast(isSaved ? 'প্লেলিস্ট থেকে সরানো হয়েছে' : 'সংরক্ষিত তালিকায় যোগ হয়েছে', 'info');
              }}
              className={`border border-slate-800 px-3.5 py-2 rounded-full text-xs font-semibold transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow ${
                isSaved ? 'bg-indigo-900/60 text-indigo-300 border-indigo-500/30' : 'bg-slate-900 hover:bg-slate-800 text-slate-300'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-indigo-300 text-indigo-300' : ''}`} />
              <span>সংরক্ষণ</span>
            </button>
          </div>

          {/* E. Watch & Earn Reward Progress Tracker */}
          <div className="rounded-2xl overflow-hidden border border-slate-800 shadow-xl">
            <WatchEarnTracker
              videoId={currentVideo.id}
              videoTitle={currentVideo.title}
              isPlaying={isPlaying}
              watchDurationSeconds={rewardSettings.watchDurationSeconds}
              videoDurationSeconds={currentVideo.durationSeconds}
              pointsPerVideoWatch={rewardSettings.pointsPerVideoWatch}
              isLoggedIn={isLoggedIn}
              onGoogleLogin={onGoogleLogin}
              onRewardGranted={onRewardGranted}
              onOpenWallet={onOpenWallet}
            />
          </div>

          {/* F. Comments Section Preview Box (image_11.png) */}
          <div 
            onClick={() => setShowCommentsDrawer(true)}
            className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 cursor-pointer transition shadow-lg group"
          >
            <div className="flex items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-400" />
                <h3 className="font-bold text-xs text-white uppercase tracking-wider">
                  মন্তব্য (Comments) • {comments.length}টি
                </h3>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-white transition" />
            </div>

            {/* Top comment preview */}
            {comments.length > 0 && (
              <div className="flex items-start gap-2.5 pt-2 border-t border-slate-800/80">
                <div className="w-6 h-6 rounded-full bg-indigo-600 text-[10px] font-bold text-white flex items-center justify-center shrink-0">
                  {comments[0].avatarText}
                </div>
                <div className="text-xs text-slate-300 min-w-0">
                  <span className="font-semibold text-white mr-2">{comments[0].author}</span>
                  <span className="text-slate-300 line-clamp-1">{comments[0].content}</span>
                </div>
              </div>
            )}
          </div>

          {/* G. Recommended Videos List (Up Next / image_11.png) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wide flex items-center gap-2">
                <span>পরবর্তী ভিডিও (Up Next)</span>
                <span className="text-xs font-mono text-indigo-400">({recommendedVideos.length})</span>
              </h3>
            </div>

            <div className="space-y-3">
              {recommendedVideos.map((video) => (
                <div
                  key={video.id}
                  onClick={() => onSelectVideo(video)}
                  className="bg-slate-900/50 hover:bg-slate-900 border border-slate-800/80 hover:border-indigo-500/40 rounded-2xl p-2.5 flex gap-3 transition cursor-pointer group shadow"
                >
                  {/* Thumbnail with duration */}
                  <div className="relative aspect-video w-36 sm:w-44 bg-black rounded-xl overflow-hidden shrink-0">
                    <img 
                      src={video.thumbnailUrl || (video.url.includes('youtu') ? `https://img.youtube.com/vi/${video.url.split('v=')[1] || 'default'}/hqdefault.jpg` : 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=320&h=180&fit=crop')} 
                      alt={video.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      loading="lazy"
                    />
                    {video.durationFormatted && (
                      <span className="absolute bottom-1 right-1 bg-black/85 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded">
                        {video.durationFormatted}
                      </span>
                    )}
                  </div>

                  {/* Meta Details */}
                  <div className="flex flex-col justify-between flex-1 min-w-0 py-0.5">
                    <div>
                      <h4 className="font-semibold text-xs text-white line-clamp-2 leading-snug group-hover:text-indigo-400 transition">
                        {video.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1 truncate">
                        {video.uploader || 'রুহুল মিডিয়া'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                      <span>{video.date}</span>
                      <span>•</span>
                      <span className="text-amber-400 font-bold flex items-center gap-0.5">
                        <Coins className="w-3 h-3 text-amber-400" /> +{rewardSettings.pointsPerVideoWatch}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ============================================================== */}
      {/* 3. COMMENTS BOTTOM SHEET DRAWER */}
      {/* ============================================================== */}
      {showCommentsDrawer && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex flex-col justify-end">
          <div className="bg-slate-900 border-t border-slate-800 rounded-t-3xl max-h-[80vh] flex flex-col shadow-2xl animate-slideUp">
            
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-400" />
                <h3 className="font-bold text-sm text-white">মন্তব্যসমূহ ({comments.length})</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCommentsDrawer(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 divide-y divide-slate-800/60">
              {comments.map((c) => (
                <div key={c.id} className="pt-3 first:pt-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-indigo-600 text-[10px] font-bold text-white flex items-center justify-center">
                      {c.avatarText}
                    </div>
                    <span className="text-xs font-bold text-white">{c.author}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{c.timestamp}</span>
                  </div>
                  <p className="text-xs text-slate-300 pl-8 leading-relaxed">{c.content}</p>
                </div>
              ))}
            </div>

            {/* Post Comment Input */}
            <form onSubmit={handleAddComment} className="p-4 border-t border-slate-800 bg-slate-950 flex gap-2">
              <input
                type="text"
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="একটি মন্তব্য লিখুন..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={!newCommentText.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl transition cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
