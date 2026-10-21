import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  X, 
  ThumbsUp, 
  MessageSquare, 
  Share2, 
  UserCheck, 
  UserPlus, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  ChevronUp, 
  ChevronDown, 
  Send, 
  Coins, 
  Flame, 
  Sparkles,
  Music,
  CheckCircle,
  Copy,
  Check
} from 'lucide-react';
import { parseUniversalMediaUrl, VideoPlatform } from '../utils/videoParser';
import { db } from '../firebase';
import { doc, getDoc, setDoc, collection, onSnapshot } from 'firebase/firestore';
import { RewardSettings } from '../types/earning';

export interface ShortVideoItem {
  id: string;
  title: string;
  url: string;
  type: VideoPlatform;
  date?: string;
  uploader?: string;
  uploaderId?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  durationFormatted?: string;
  isShort?: boolean;
}

interface ShortsComment {
  id: string;
  author: string;
  content: string;
  timestamp: string;
  userId?: string;
}

interface ShortsPlayerViewProps {
  currentShort: ShortVideoItem;
  allShorts: ShortVideoItem[];
  onClose: () => void;
  onSelectShort: (short: ShortVideoItem) => void;
  rewardSettings: RewardSettings;
  currentUserId: string;
  currentUserName: string;
  isLoggedIn: boolean;
  onRewardGranted: (points: number, videoId: string) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  triggerHaptic?: (type?: any) => void;
}

export const ShortsPlayerView: React.FC<ShortsPlayerViewProps> = ({
  currentShort,
  allShorts,
  onClose,
  onSelectShort,
  rewardSettings,
  currentUserId,
  currentUserName,
  isLoggedIn,
  onRewardGranted,
  showToast,
  triggerHaptic
}) => {
  // Navigation index
  const currentIndex = useMemo(() => {
    const idx = allShorts.findIndex(s => s.id === currentShort.id);
    return idx >= 0 ? idx : 0;
  }, [allShorts, currentShort.id]);

  // Video playback & mute states
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [showCenterPlayIcon, setShowCenterPlayIcon] = useState(false);

  // Social states (Likes, Comments, Follow)
  const [likeCount, setLikeCount] = useState<number>(() => Math.floor(Math.random() * 25) + 8);
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [showCommentDrawer, setShowCommentDrawer] = useState<boolean>(false);
  const [comments, setComments] = useState<ShortsComment[]>([
    { id: 'c1', author: 'রুহুল আমিন', content: 'চমৎকার শর্টস ভিডিও! দারুণ লাগলো।', timestamp: '১০ মিনিট আগে' },
    { id: 'c2', author: 'প্রবাসী ভাই', content: 'ভিডিও দেখে কয়েন পাওয়ার সিস্টেমটি অসাধারণ।', timestamp: '২৫ মিনিট আগে' }
  ]);
  const [newComment, setNewComment] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Watch & Earn timer state
  const [secondsWatched, setSecondsWatched] = useState(0);
  const [hasClaimedReward, setHasClaimedReward] = useState(false);
  const targetSeconds = rewardSettings.watchDurationSeconds || 15;
  const rewardPoints = rewardSettings.pointsPerVideoWatch || 50;

  // Touch gesture tracking for vertical swipe
  const touchStartY = useRef<number | null>(null);
  const touchCurrentY = useRef<number | null>(null);

  // Parse media stream info
  const parsedMedia = useMemo(() => {
    return parseUniversalMediaUrl(currentShort.url);
  }, [currentShort.url]);

  // Real-time Like state listener
  useEffect(() => {
    if (!currentShort.id) return;
    const likeDocId = `like_${currentUserId}_${currentShort.id}`;
    const unsubLike = onSnapshot(doc(db, 'video_likes', likeDocId), (docSnap) => {
      if (docSnap.exists()) {
        setIsLiked(true);
      } else {
        setIsLiked(false);
      }
    }, () => {});

    // Listen to comments
    const unsubComments = onSnapshot(collection(db, 'video_comments'), (snap) => {
      if (!snap.empty) {
        const list = snap.docs
          .map(d => ({ id: d.id, ...(d.data() as any) }))
          .filter(c => c.videoId === currentShort.id);
        if (list.length > 0) {
          setComments(list);
        }
      }
    }, () => {});

    // Follow status check
    const followId = `follow_${currentUserId}_${currentShort.uploaderId || currentShort.uploader || 'creator'}`;
    const unsubFollow = onSnapshot(doc(db, 'follows', followId), (d) => {
      setIsFollowing(d.exists());
    }, () => {});

    return () => {
      unsubLike();
      unsubComments();
      unsubFollow();
    };
  }, [currentShort.id, currentUserId, currentShort.uploaderId, currentShort.uploader]);

  // Reset timer on video change
  useEffect(() => {
    setSecondsWatched(0);
    setHasClaimedReward(false);
    setIsPlaying(true);
  }, [currentShort.id]);

  // Watch progress ticker
  useEffect(() => {
    if (!isPlaying || hasClaimedReward) return;

    const timer = setInterval(() => {
      setSecondsWatched(prev => {
        const next = prev + 1;
        if (next >= targetSeconds && !hasClaimedReward) {
          setHasClaimedReward(true);
          onRewardGranted(rewardPoints, currentShort.id);
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPlaying, hasClaimedReward, targetSeconds, rewardPoints, currentShort.id, onRewardGranted]);

  // Vertical Navigation Handlers
  const handleNextShort = useCallback(() => {
    if (currentIndex < allShorts.length - 1) {
      triggerHaptic?.('light');
      onSelectShort(allShorts[currentIndex + 1]);
    } else if (allShorts.length > 0) {
      // Loop to beginning
      triggerHaptic?.('light');
      onSelectShort(allShorts[0]);
    }
  }, [currentIndex, allShorts, onSelectShort, triggerHaptic]);

  const handlePrevShort = useCallback(() => {
    if (currentIndex > 0) {
      triggerHaptic?.('light');
      onSelectShort(allShorts[currentIndex - 1]);
    } else if (allShorts.length > 0) {
      // Loop to end
      triggerHaptic?.('light');
      onSelectShort(allShorts[allShorts.length - 1]);
    }
  }, [currentIndex, allShorts, onSelectShort, triggerHaptic]);

  // Touch Swipe Handlers (Vertical Swipe Up / Down)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchCurrentY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = () => {
    if (touchStartY.current !== null && touchCurrentY.current !== null) {
      const deltaY = touchStartY.current - touchCurrentY.current;
      // Threshold 60px
      if (deltaY > 60) {
        // Swiped UP -> Next Short
        handleNextShort();
      } else if (deltaY < -60) {
        // Swiped DOWN -> Previous Short
        handlePrevShort();
      }
    }
    touchStartY.current = null;
    touchCurrentY.current = null;
  };

  // Keyboard navigation (ArrowUp, ArrowDown, Space to toggle play)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleNextShort();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        handlePrevShort();
      } else if (e.key === ' ' && !showCommentDrawer) {
        e.preventDefault();
        setIsPlaying(p => !p);
      } else if (e.key === 'Escape') {
        if (showCommentDrawer) {
          setShowCommentDrawer(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNextShort, handlePrevShort, showCommentDrawer, onClose]);

  // Center tap toggle play/pause
  const togglePlay = () => {
    setIsPlaying(prev => !prev);
    setShowCenterPlayIcon(true);
    triggerHaptic?.('light');
    setTimeout(() => setShowCenterPlayIcon(false), 700);
  };

  // Toggle Like
  const handleToggleLike = async () => {
    triggerHaptic?.('medium');
    const newLiked = !isLiked;
    setIsLiked(newLiked);
    setLikeCount(prev => newLiked ? prev + 1 : Math.max(0, prev - 1));

    try {
      const likeDocId = `like_${currentUserId}_${currentShort.id}`;
      if (newLiked) {
        await setDoc(doc(db, 'video_likes', likeDocId), {
          userId: currentUserId,
          videoId: currentShort.id,
          createdAt: new Date().toISOString()
        });
        showToast('ভিডিওতে লাইক দেওয়া হয়েছে! ❤️', 'success');
      } else {
        await setDoc(doc(db, 'video_likes', likeDocId), {
          deleted: true
        });
      }
    } catch {}
  };

  // Toggle Follow
  const handleToggleFollow = async () => {
    triggerHaptic?.('medium');
    const targetId = currentShort.uploaderId || currentShort.uploader || 'creator';
    const newFollowing = !isFollowing;
    setIsFollowing(newFollowing);

    try {
      const followId = `follow_${currentUserId}_${targetId}`;
      if (newFollowing) {
        await setDoc(doc(db, 'follows', followId), {
          followerId: currentUserId,
          followingId: targetId,
          uploaderName: currentShort.uploader || 'ক্রিয়েটর',
          createdAt: new Date().toISOString()
        });
        showToast(`আপনি ${currentShort.uploader || 'ক্রিয়েটর'}-কে ফলো করছেন!`, 'success');
      }
    } catch {}
  };

  // Share Handler
  const handleShare = async () => {
    triggerHaptic?.('light');
    const shareUrl = currentShort.url;
    if (navigator.share) {
      try {
        await navigator.share({
          title: currentShort.title,
          text: `RUHUL MIDIA তে শর্টস ভিডিওটি দেখুন: ${currentShort.title}`,
          url: shareUrl
        });
        return;
      } catch {}
    }
    // Fallback: Clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      showToast('ভিডিও লিংক কপি করা হয়েছে!', 'success');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      showToast('লিংক কপি করতে ব্যর্থ হয়েছে', 'error');
    }
  };

  // Add Comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    triggerHaptic?.('light');

    const commentItem: ShortsComment = {
      id: `comm_${Date.now()}`,
      author: currentUserName || 'ইউজার',
      content: newComment.trim(),
      timestamp: 'এইমাত্র',
      userId: currentUserId
    };

    setComments(prev => [commentItem, ...prev]);
    setNewComment('');

    try {
      await setDoc(doc(db, 'video_comments', commentItem.id), {
        ...commentItem,
        videoId: currentShort.id,
        createdAt: new Date().toISOString()
      });
      showToast('মন্তব্য যুক্ত হয়েছে!', 'success');
    } catch {}
  };

  // Video embed parameters with autoplay & loops
  const embedSrc = useMemo(() => {
    if (!parsedMedia) return '';
    let url = parsedMedia.embedUrl;
    if (parsedMedia.playerType === 'iframe') {
      const glue = url.includes('?') ? '&' : '?';
      url += `${glue}autoplay=1&mute=${isMuted ? 1 : 0}&playsinline=1&controls=0&loop=1&enablejsapi=1&rel=0`;
    }
    return url;
  }, [parsedMedia, isMuted]);

  return (
    <div 
      className="fixed inset-0 z-50 bg-black flex items-center justify-center select-none overflow-hidden touch-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 9:16 Aspect Ratio Center Stage Container */}
      <div className="relative w-full h-full max-w-md mx-auto bg-slate-950 flex flex-col justify-between overflow-hidden shadow-2xl">
        
        {/* ========================================================== */}
        {/* VIDEO DISPLAY CORE */}
        {/* ========================================================== */}
        <div 
          className="absolute inset-0 z-0 cursor-pointer flex items-center justify-center bg-black"
          onClick={togglePlay}
        >
          {parsedMedia?.playerType === 'direct' ? (
            <video
              src={parsedMedia.embedUrl}
              autoPlay
              playsInline
              loop
              muted={isMuted}
              className="w-full h-full object-cover"
            />
          ) : parsedMedia?.playerType === 'iframe' ? (
            <iframe
              src={embedSrc}
              title={currentShort.title}
              className="w-full h-full border-0 pointer-events-auto"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <img
              src={currentShort.thumbnailUrl || 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=640&h=1140&fit=crop'}
              alt={currentShort.title}
              className="w-full h-full object-cover"
            />
          )}

          {/* Quick Play/Pause Center Animation Badge */}
          {showCenterPlayIcon && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
              <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center animate-ping">
                {isPlaying ? <Play className="w-8 h-8 fill-white ml-1" /> : <Pause className="w-8 h-8 fill-white" />}
              </div>
            </div>
          )}

          {/* Vignette Gradients for Text Legibility */}
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/80 via-black/30 to-transparent pointer-events-none z-10" />
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none z-10" />
        </div>

        {/* ========================================================== */}
        {/* TOP HEADER CONTROLS (Z-30) */}
        {/* ========================================================== */}
        <div 
          className="relative z-30 flex items-center justify-between px-4 pt-4 sm:pt-6 pointer-events-auto"
          style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 16px)' }}
        >
          {/* Back/Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition active:scale-90 cursor-pointer shadow-lg"
            title="শর্টস বন্ধ করুন (Close)"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Reward Progress Status Badge */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md border border-amber-500/40 text-amber-300 text-xs px-3 py-1.5 rounded-full font-mono shadow-md">
              <Coins className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              <span>
                {hasClaimedReward ? (
                  <span className="text-emerald-400 font-bold">+{rewardPoints} কয়েন অর্জিত!</span>
                ) : (
                  <span>{secondsWatched}/{targetSeconds}s (+{rewardPoints} pts)</span>
                )}
              </span>
            </div>

            {/* Mute/Unmute Toggle */}
            <button
              type="button"
              onClick={() => setIsMuted(m => !m)}
              className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition active:scale-90 cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* ========================================================== */}
        {/* RIGHT ACTION CONTROLS OVERLAY (Pinned Vertically) */}
        {/* ========================================================== */}
        <div className="absolute right-3 bottom-24 z-30 flex flex-col items-center gap-4 pointer-events-auto">
          
          {/* 1. Like Button */}
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={handleToggleLike}
              className={`w-12 h-12 rounded-full backdrop-blur-md border transition-all duration-200 flex items-center justify-center active:scale-75 cursor-pointer shadow-xl ${
                isLiked 
                  ? 'bg-rose-600 border-rose-400 text-white scale-110' 
                  : 'bg-black/50 hover:bg-black/70 border-white/20 text-white'
              }`}
            >
              <ThumbsUp className={`w-5 h-5 ${isLiked ? 'fill-current text-white' : ''}`} />
            </button>
            <span className="text-[11px] font-bold text-white shadow-sm font-mono drop-shadow">
              {likeCount}
            </span>
          </div>

          {/* 2. Comment Button */}
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={() => setShowCommentDrawer(true)}
              className="w-12 h-12 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition active:scale-75 cursor-pointer shadow-xl"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
            <span className="text-[11px] font-bold text-white font-mono drop-shadow">
              {comments.length}
            </span>
          </div>

          {/* 3. Share Button */}
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={handleShare}
              className="w-12 h-12 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition active:scale-75 cursor-pointer shadow-xl"
            >
              {copiedLink ? <Check className="w-5 h-5 text-emerald-400" /> : <Share2 className="w-5 h-5" />}
            </button>
            <span className="text-[11px] font-bold text-white drop-shadow">
              শেয়ার
            </span>
          </div>

          {/* 4. Next Short Button (Desktop & Touch Hint) */}
          <button
            type="button"
            onClick={handleNextShort}
            className="w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md border border-white/10 text-slate-300 hover:text-white flex items-center justify-center transition active:scale-75 cursor-pointer mt-1"
            title="পরবর্তী শর্টস (Next Short)"
          >
            <ChevronDown className="w-5 h-5 animate-bounce" />
          </button>
        </div>

        {/* ========================================================== */}
        {/* BOTTOM LEFT OVERLAY: UPLOADER INFO, TITLE & FOLLOW */}
        {/* ========================================================== */}
        <div 
          className="relative z-30 px-4 pb-6 space-y-2.5 max-w-[calc(100%-4rem)] pointer-events-auto"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 24px)' }}
        >
          {/* Uploader Row & Follow Button */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 border-2 border-white flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-md">
              {currentShort.uploader?.charAt(0) || 'R'}
            </div>
            
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-sm font-bold text-white drop-shadow truncate">
                @{currentShort.uploader || 'RUHUL MIDIA'}
              </span>
              <CheckCircle className="w-3.5 h-3.5 text-blue-400 shrink-0 fill-blue-400/20" />
            </div>

            {/* Follow / Following Button */}
            <button
              type="button"
              onClick={handleToggleFollow}
              className={`text-xs font-bold px-3 py-1 rounded-full transition duration-200 cursor-pointer shadow-md shrink-0 active:scale-95 ${
                isFollowing 
                  ? 'bg-slate-800/90 text-slate-300 border border-slate-700' 
                  : 'bg-white hover:bg-slate-200 text-slate-900'
              }`}
            >
              {isFollowing ? 'ফলোড' : 'ফলো'}
            </button>
          </div>

          {/* Video Title / Caption */}
          <h2 className="text-sm sm:text-base font-medium text-white line-clamp-2 drop-shadow leading-snug">
            {currentShort.title} <span className="text-red-400 font-bold">#shorts #ruhulmidia</span>
          </h2>

          {/* Music / Audio Track indicator */}
          <div className="flex items-center gap-2 text-xs text-slate-300 drop-shadow">
            <Music className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            <span className="truncate">মূল অডিও - {currentShort.uploader || 'RUHUL MIDIA'}</span>
          </div>

          {/* Watch duration progress bar */}
          <div className="w-full bg-white/20 h-1 rounded-full overflow-hidden mt-1">
            <div 
              className="bg-red-500 h-full transition-all duration-300"
              style={{ width: `${Math.min(100, (secondsWatched / targetSeconds) * 100)}%` }}
            />
          </div>
        </div>

        {/* ========================================================== */}
        {/* BOTTOM DRAWER FOR COMMENTS */}
        {/* ========================================================== */}
        {showCommentDrawer && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end animate-fadeIn">
            <div className="bg-slate-900 border-t border-slate-800 rounded-t-3xl max-h-[65vh] flex flex-col shadow-2xl animate-slideUp">
              
              {/* Drawer Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">মন্তব্যসমূহ ({comments.length})</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCommentDrawer(false)}
                  className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Comments List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                {comments.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500">
                    এখনও কোনো মন্তব্য নেই। প্রথম মন্তব্যটি করুন!
                  </div>
                ) : (
                  comments.map(c => (
                    <div key={c.id} className="flex gap-2.5 text-xs">
                      <div className="w-7 h-7 rounded-full bg-indigo-600/30 text-indigo-300 flex items-center justify-center font-bold text-[11px] shrink-0">
                        {c.author.charAt(0)}
                      </div>
                      <div className="flex-1 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-300">{c.author}</span>
                          <span className="text-[10px] text-slate-500">{c.timestamp}</span>
                        </div>
                        <p className="text-slate-200 leading-relaxed">{c.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Comment Input */}
              <form onSubmit={handleAddComment} className="p-3 border-t border-slate-800 flex items-center gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="একটি সুন্দর মন্তব্য লিখুন..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={!newComment.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white p-2 rounded-xl transition cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};
export default ShortsPlayerView;
