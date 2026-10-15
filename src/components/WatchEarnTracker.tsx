import React, { useState, useEffect, useRef } from 'react';
import { Coins, CheckCircle, Sparkles, Clock, ArrowRight, AlertTriangle, UserCheck } from 'lucide-react';
import { POINTS_PER_VIDEO, WATCH_TIME_REQUIRED_SECONDS } from '../types/earning';

interface WatchEarnTrackerProps {
  videoId: string;
  videoTitle: string;
  isPlaying: boolean;
  watchDurationSeconds?: number;
  videoDurationSeconds?: number;
  pointsPerVideoWatch?: number;
  isLoggedIn?: boolean;
  onGoogleLogin?: () => void;
  onRewardGranted: (rewardPoints: number, videoId: string) => void;
  onOpenWallet?: () => void;
}

export default function WatchEarnTracker({
  videoId,
  videoTitle,
  isPlaying,
  watchDurationSeconds = WATCH_TIME_REQUIRED_SECONDS,
  videoDurationSeconds,
  pointsPerVideoWatch = POINTS_PER_VIDEO,
  isLoggedIn = true,
  onGoogleLogin,
  onRewardGranted,
  onOpenWallet
}: WatchEarnTrackerProps) {
  const [secondsWatched, setSecondsWatched] = useState(0);
  const [hasRewarded, setHasRewarded] = useState(false);
  const [rewardCelebration, setRewardCelebration] = useState(false);
  const intervalRef = useRef<any>(null);

  // Dynamic Watch Timer: If video duration is known from YouTube API, dynamically adapt
  const baseDuration = watchDurationSeconds > 0 ? watchDurationSeconds : WATCH_TIME_REQUIRED_SECONDS;
  const targetDuration = videoDurationSeconds && videoDurationSeconds > 0
    ? (videoDurationSeconds <= baseDuration ? Math.max(5, videoDurationSeconds) : baseDuration)
    : baseDuration;
  const rewardAmount = pointsPerVideoWatch >= 0 ? pointsPerVideoWatch : POINTS_PER_VIDEO;

  // Reset or initialize state when video changes
  useEffect(() => {
    setSecondsWatched(0);
    setHasRewarded(false);
    setRewardCelebration(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, [videoId]);

  // Tick watch timer while isPlaying
  useEffect(() => {
    if (isPlaying && !hasRewarded) {
      intervalRef.current = setInterval(() => {
        setSecondsWatched((prev) => {
          const next = prev + 1;
          if (next >= targetDuration) {
            clearInterval(intervalRef.current);
            setHasRewarded(true);
            setRewardCelebration(true);
            onRewardGranted(rewardAmount, videoId);
            setTimeout(() => setRewardCelebration(false), 6000);
            return targetDuration;
          }
          return next;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, hasRewarded, videoId, targetDuration, rewardAmount, onRewardGranted]);

  const remaining = Math.max(0, targetDuration - secondsWatched);
  const progressPercent = Math.min(100, Math.round((secondsWatched / targetDuration) * 100));

  if (!isPlaying && secondsWatched === 0) {
    return null;
  }

  return (
    <div className="w-full bg-slate-950/95 border-t border-slate-800 p-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs transition-all duration-300">
      
      {/* Celebration Notification or Auth Required Alert */}
      {rewardCelebration ? (
        !isLoggedIn ? (
          <div className="flex items-center gap-2 text-rose-300 font-bold animate-pulse w-full sm:w-auto">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <span>⚠️ আপনার অ্যাকাউন্ট সংরক্ষিত নেই! ভিডিও দেখে কয়েন বা ব্যালেন্স জমা করতে অবশ্যই উপরে থাকা 'Google লিংক' বা অ্যাকাউন্ট অপশনে গিয়ে অ্যাকাউন্ট ক্রিয়েট/লগইন করুন। অন্যথায় ব্যালেন্স জমা হবে না।</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-emerald-400 font-bold animate-bounce w-full sm:w-auto">
            <Sparkles className="w-5 h-5 text-amber-400 animate-spin" />
            <span>🎉 অভিনন্দন! {targetDuration} সেকেন্ড দেখার জন্য +{rewardAmount} কয়েন যোগ হয়েছে!</span>
          </div>
        )
      ) : hasRewarded ? (
        !isLoggedIn ? (
          <div className="flex items-center gap-2 text-amber-300 font-medium">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>⚠️ আপনার অ্যাকাউন্ট সংরক্ষিত নেই! ভিডিও দেখে কয়েন বা ব্যালেন্স জমা করতে অবশ্যই উপরে থাকা 'Google লিংক' বা অ্যাকাউন্ট অপশনে গিয়ে অ্যাকাউন্ট ক্রিয়েট/লগইন করুন। অন্যথায় ব্যালেন্স জমা হবে না।</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-emerald-400 font-medium">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>এই ভিডিওর জন্য +{rewardAmount} কয়েন ওয়ালেটে জমা হয়েছে!</span>
          </div>
        )
      ) : !isLoggedIn ? (
        <div className="flex items-center gap-2.5 min-w-0 w-full sm:w-auto">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4 animate-pulse text-amber-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-amber-300">অ্যাকাউন্ট সংরক্ষিত নেই</span>
              <span className="text-[10px] text-rose-300 font-bold bg-rose-500/20 px-1.5 py-0.5 rounded border border-rose-500/30">
                কয়েন জমা হবে না
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              ⚠️ ভিডিও দেখে কয়েন বা ব্যালেন্স জমা করতে উপরে থাকা 'Google লিংক' বা অ্যাকাউন্ট অপশনে গিয়ে অ্যাকাউন্ট ক্রিয়েট/লগইন করুন।
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 min-w-0 w-full sm:w-auto">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Coins className="w-4 h-4 animate-pulse" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">ওয়াচ অ্যান্ড আর্ন (Watch & Earn)</span>
              <span className="text-[10px] text-amber-300 font-mono font-bold bg-amber-500/20 px-1.5 py-0.5 rounded">
                +{rewardAmount} কয়েন
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              {remaining > 0 ? `আরও ${remaining} সেকেন্ড দেখলে +${rewardAmount} কয়েন পাবেন (Watch for ${targetDuration}s)` : 'কয়েন প্রদান করা হচ্ছে...'}
            </p>
          </div>
        </div>
      )}

      {/* Progress Bar & Actions */}
      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end shrink-0">
        {!hasRewarded && (
          <div className="flex items-center gap-2 w-32 sm:w-28">
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-amber-500 to-emerald-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-slate-300 whitespace-nowrap">{remaining}s</span>
          </div>
        )}

        {!isLoggedIn && onGoogleLogin && (
          <button
            type="button"
            onClick={onGoogleLogin}
            className="text-[11px] bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-md shadow-indigo-600/30 active:scale-95 border border-indigo-400/30"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>অ্যাকাউন্ট করুন</span>
          </button>
        )}

        {isLoggedIn && onOpenWallet && (
          <button
            type="button"
            onClick={onOpenWallet}
            className="text-[11px] bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white px-3 py-1.5 rounded-xl border border-slate-700 transition flex items-center gap-1 cursor-pointer whitespace-nowrap shadow"
          >
            <span>ওয়ালেট দেখুন</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>

    </div>
  );
}
