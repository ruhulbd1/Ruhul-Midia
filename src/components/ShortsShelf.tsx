import React from 'react';
import { Play, Flame, ChevronRight, Coins, Film, Plus } from 'lucide-react';
import { Video } from './ShortsFeedView';
import { isShortVideo, parseUniversalMediaUrl, getYoutubeThumbnail } from '../utils/videoParser';
import { RewardSettings } from '../types/earning';

interface ShortsShelfProps {
  videos: Video[];
  onSelectVideo: (video: Video) => void;
  onViewAllShorts: () => void;
  rewardSettings?: RewardSettings;
}

export const ShortsShelf: React.FC<ShortsShelfProps> = React.memo(({
  videos,
  onSelectVideo,
  onViewAllShorts,
  rewardSettings
}) => {
  const shorts = videos.filter(v => isShortVideo(v) || v.type === 'tiktok').slice(0, 8);
  if (shorts.length === 0) return null;

  const pointsPerWatch = rewardSettings?.pointsPerVideoWatch || 50;

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-4 sm:p-5 space-y-3.5 my-4 shadow-xl relative z-10 hw-accelerate">
      {/* Shelf Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-red-600/20 text-red-500 border border-red-500/30 flex items-center justify-center">
            <Flame className="w-4 h-4 fill-red-500" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <span>YouTube Shorts</span>
              <span className="text-[10px] bg-red-600/20 text-red-400 font-bold px-2 py-0.5 rounded-full border border-red-500/30 uppercase tracking-wider">
                শর্টস
              </span>
            </h2>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              দ্রুত বিনোদন ও প্রতিটি শর্টসে +{pointsPerWatch} কয়েন
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onViewAllShorts}
          className="text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1 transition cursor-pointer hover:underline pointer-events-auto"
        >
          <span>সবগুলো দেখুন</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Horizontal Scroll Shelf of 9:16 Vertical Cards */}
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 snap-x snap-mandatory smooth-scroll hw-accelerate">
        {shorts.map((short) => {
          const media = parseUniversalMediaUrl(short.url);
          const thumbUrl = short.thumbnailUrl || media?.thumbnailUrl || (media?.type === 'youtube' ? getYoutubeThumbnail(short.url) : '');

          return (
            <div
              key={short.id}
              onClick={() => onSelectVideo(short)}
              className="w-36 sm:w-44 shrink-0 snap-start aspect-[9/16] rounded-2xl overflow-hidden relative z-10 group cursor-pointer bg-slate-950 border border-slate-800 hover:border-red-500/60 shadow-lg transition-all duration-300 hover:scale-[1.03] flex flex-col justify-between pointer-events-auto hw-accelerate"
            >
              {/* Thumbnail */}
              <div className="absolute inset-0">
                {thumbUrl ? (
                  <img
                    src={thumbUrl}
                    alt={short.title}
                    className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                    <Film className="w-8 h-8 text-slate-700" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/50" />
              </div>

              {/* Top Tag */}
              <div className="relative z-10 p-2 flex items-center justify-between">
                <span className="bg-red-600/90 text-white font-bold text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded shadow flex items-center gap-0.5">
                  <Flame className="w-2.5 h-2.5 fill-white" />
                  <span>SHORTS</span>
                </span>
                <span className="bg-slate-950/70 text-amber-400 font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border border-amber-500/30">
                  +{pointsPerWatch}
                </span>
              </div>

              {/* Hover Center Play */}
              <div className="relative z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center shadow-xl transform scale-90 group-hover:scale-100 transition-transform">
                  <Play className="w-5 h-5 fill-white ml-0.5" />
                </div>
              </div>

              {/* Bottom Info */}
              <div className="relative z-10 p-2.5 bg-gradient-to-t from-black via-black/80 to-transparent space-y-1">
                <h3 className="text-xs font-bold text-white line-clamp-2 leading-tight drop-shadow">
                  {short.title}
                </h3>
                <p className="text-[10px] text-slate-300 truncate">
                  {short.uploader || 'RUHUL MIDIA'}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default ShortsShelf;
