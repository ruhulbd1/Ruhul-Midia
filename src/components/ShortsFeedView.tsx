import React, { useState, useMemo } from 'react';
import { 
  Play, 
  Flame, 
  Plus, 
  Coins, 
  Volume2, 
  Share2, 
  Sparkles, 
  User as UserIcon, 
  CheckCircle, 
  Clock, 
  Film,
  Eye,
  ExternalLink
} from 'lucide-react';
import { isShortVideo, parseUniversalMediaUrl, getYoutubeThumbnail } from '../utils/videoParser';
import { VideoPlatform } from '../utils/videoParser';
import { RewardSettings } from '../types/earning';

export interface Video {
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
  isShort?: boolean;
}

interface ShortsFeedViewProps {
  videos: Video[];
  onSelectVideo: (video: Video) => void;
  onOpenUploadModal: () => void;
  onViewProfile?: (userId: string) => void;
  rewardSettings?: RewardSettings;
}

export const ShortsFeedView: React.FC<ShortsFeedViewProps> = React.memo(({
  videos,
  onSelectVideo,
  onOpenUploadModal,
  onViewProfile,
  rewardSettings
}) => {
  const [filterType, setFilterType] = useState<'all' | 'youtube' | 'tiktok' | 'reels'>('all');

  // Filter for videos that are short-form / vertical
  const shortsList = useMemo(() => {
    const list = videos.filter(v => isShortVideo(v) || v.type === 'tiktok');
    
    // If very few explicit shorts are uploaded, also include short duration videos or fallback items
    if (list.length === 0) {
      // Fallback: take any video with duration under 180s or first few videos
      return videos.filter(v => v.type !== 'image');
    }
    
    if (filterType === 'youtube') {
      return list.filter(v => v.type === 'youtube');
    } else if (filterType === 'tiktok') {
      return list.filter(v => v.type === 'tiktok');
    }
    return list;
  }, [videos, filterType]);

  const pointsPerWatch = rewardSettings?.pointsPerVideoWatch || 50;

  return (
    <div className="space-y-6 animate-fadeIn pb-12 w-full max-w-7xl mx-auto relative z-10 hw-accelerate">
      
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-red-950/80 via-slate-900 to-indigo-950/80 border border-red-500/30 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/20 border border-red-500/40 text-red-400 text-xs font-bold shadow-sm">
              <Flame className="w-3.5 h-3.5 fill-red-400" />
              <span>YOUTUBE SHORTS & REELS</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wide flex items-center gap-2.5">
              <span>শর্টস ও রিলস ফিড</span>
              <span className="text-xs bg-slate-800 border border-slate-700 text-slate-300 font-mono px-2.5 py-0.5 rounded-full">
                {shortsList.length} টি ভিডিও
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
              YouTube Shorts এবং সংক্ষিপ্ত ভাইরাল ভিডিও উপভোগ করুন। প্রতি শর্ট ভিডিও দেখে তাৎক্ষণিক <strong className="text-amber-400">+{pointsPerWatch} কয়েন</strong> অর্জন করুন!
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenUploadModal}
            className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs sm:text-sm px-5 py-3 rounded-2xl transition flex items-center gap-2 cursor-pointer shadow-lg shadow-red-600/30 border border-red-400/30 active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>শর্টস যোগ করুন</span>
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800/80 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 ${
              filterType === 'all'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            সব শর্টস ({videos.filter(v => isShortVideo(v) || v.type === 'tiktok').length || videos.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('youtube')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
              filterType === 'youtube'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <span>YouTube Shorts</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterType('tiktok')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
              filterType === 'tiktok'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <span>TikTok ক্লিপস</span>
          </button>
        </div>
      </div>

      {/* 2. YouTube Shorts Grid (2-column on mobile, multi-column on desktop) */}
      {shortsList.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/30 border border-slate-800 rounded-3xl p-6">
          <div className="w-16 h-16 rounded-2xl bg-red-600/10 text-red-400 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <Film className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white">এখনও কোনো শর্টস পাওয়া যায়নি</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            আপনার পছন্দের যেকোনো YouTube Shorts বা TikTok ভিডিওর লিংক যুক্ত করে প্রথম শর্টস শেয়ার করুন!
          </p>
          <button
            type="button"
            onClick={onOpenUploadModal}
            className="mt-4 bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition inline-flex items-center gap-1.5 cursor-pointer shadow-lg shadow-red-600/30"
          >
            <Plus className="w-4 h-4" />
            <span>শর্টস আপলোড করুন</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4.5">
          {shortsList.map((short) => {
            const media = parseUniversalMediaUrl(short.url);
            const thumbUrl = short.thumbnailUrl || media?.thumbnailUrl || (media?.type === 'youtube' ? getYoutubeThumbnail(short.url) : '');

            return (
              <div
                key={short.id}
                onClick={() => onSelectVideo(short)}
                className="group relative z-10 aspect-[9/16] rounded-2xl sm:rounded-3xl overflow-hidden bg-slate-900 border border-slate-800/90 hover:border-red-500/60 shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer flex flex-col justify-between pointer-events-auto hw-accelerate"
              >
                {/* Background Image / Thumbnail */}
                <div className="absolute inset-0 bg-slate-950 overflow-hidden">
                  {thumbUrl ? (
                    <img
                      src={thumbUrl}
                      alt={short.title}
                      className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center">
                      <Film className="w-10 h-10 text-slate-700" />
                    </div>
                  )}
                  {/* Subtle noise/dark gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/60 pointer-events-none" />
                </div>

                {/* Top Badges Bar */}
                <div className="relative z-10 p-2.5 sm:p-3 flex items-center justify-between w-full">
                  <div className="inline-flex items-center gap-1 bg-red-600/90 backdrop-blur-md text-white font-black text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full shadow-md border border-red-400/30 tracking-wider">
                    <Flame className="w-3 h-3 fill-white" />
                    <span>SHORTS</span>
                  </div>

                  <span className="bg-slate-950/70 backdrop-blur-md text-amber-400 font-mono text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                    <Coins className="w-3 h-3 text-amber-400" />
                    <span>+{pointsPerWatch}</span>
                  </span>
                </div>

                {/* Center Hover Play Icon */}
                <div className="relative z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-12 h-12 rounded-full bg-red-600/95 text-white flex items-center justify-center shadow-2xl shadow-red-600/50 transform scale-90 group-hover:scale-105 transition-transform duration-300 border border-white/20">
                    <Play className="w-6 h-6 fill-white ml-0.5" />
                  </div>
                </div>

                {/* Bottom Content Info */}
                <div className="relative z-10 p-2.5 sm:p-3.5 space-y-1.5 bg-gradient-to-t from-black via-black/80 to-transparent">
                  <h3 className="text-xs sm:text-sm font-bold text-white line-clamp-2 leading-snug drop-shadow-md group-hover:text-red-300 transition-colors">
                    {short.title}
                  </h3>

                  <div className="flex items-center justify-between gap-1 text-[10px] sm:text-[11px] text-slate-300 pt-0.5">
                    <div 
                      className="flex items-center gap-1.5 truncate cursor-pointer hover:text-white"
                      onClick={(e) => {
                        if (short.uploaderId && onViewProfile) {
                          e.stopPropagation();
                          onViewProfile(short.uploaderId);
                        }
                      }}
                    >
                      <div className="w-4 h-4 rounded-full bg-red-600/40 text-red-300 flex items-center justify-center text-[9px] font-bold shrink-0">
                        {short.uploader ? short.uploader.slice(0, 1).toUpperCase() : <UserIcon className="w-2.5 h-2.5" />}
                      </div>
                      <span className="truncate">{short.uploader || 'RUHUL MIDIA'}</span>
                    </div>

                    <span className="text-[9px] text-slate-400 shrink-0 font-mono">
                      {short.durationFormatted || 'Short'}
                    </span>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
});

export default ShortsFeedView;
