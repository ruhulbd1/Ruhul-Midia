import React, { useState } from 'react';
import { 
  Play, 
  ExternalLink, 
  Maximize2, 
  Headphones, 
  Tv, 
  Youtube, 
  Share2, 
  Sparkles,
  Eye,
  EyeOff
} from 'lucide-react';
import { parseUniversalMediaUrl, type ParsedMedia } from '../utils/videoParser';

interface UniversalVideoPlayerProps {
  id: string;
  title: string;
  url: string;
  type: string;
  uploader?: string;
  date?: string;
  isPlaying: boolean;
  thumbnailUrl?: string;
  durationFormatted?: string;
  durationSeconds?: number;
  onPlay: () => void;
  onOpenTheater: () => void;
  className?: string;
}

export const UniversalVideoPlayer: React.FC<UniversalVideoPlayerProps> = ({
  id,
  title,
  url,
  isPlaying,
  thumbnailUrl,
  durationFormatted,
  durationSeconds,
  onPlay,
  onOpenTheater,
  className = ''
}) => {
  const [tryEmbedAnyway, setTryEmbedAnyway] = useState(false);
  const media = parseUniversalMediaUrl(url);

  if (!media) {
    return (
      <div className="relative aspect-video w-full bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <p className="text-xs text-rose-400 font-medium">মিডিয়া লিংক লোড করা যায়নি</p>
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="mt-2 text-[11px] text-indigo-400 underline flex items-center gap-1"
        >
          <span>আসল লিংক খুলুন</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    );
  }

  // 1. DIRECT HTML5 VIDEO PLAYER (.mp4, .webm, etc.)
  if (media.playerType === 'direct') {
    if (isPlaying) {
      return (
        <div className={`relative aspect-video w-full bg-black overflow-hidden ${className}`}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenTheater();
            }}
            title="বড় স্ক্রিনে দেখুন"
            className="absolute top-3 right-3 bg-slate-950/80 hover:bg-indigo-600 text-slate-300 hover:text-white px-2.5 py-1 rounded-lg border border-slate-800 transition z-20 flex items-center gap-1 text-[10px] font-semibold shadow-lg backdrop-blur-sm cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5 text-indigo-400 group-hover:text-white" />
            <span>বড় স্ক্রিন</span>
          </button>

          <video 
            src={media.embedUrl} 
            controls 
            autoPlay 
            playsInline
            className="w-full h-full object-contain bg-black"
          />
        </div>
      );
    }

    // Direct Video inactive cover
    return (
      <div className={`relative aspect-video w-full bg-black overflow-hidden group/cover ${className}`}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenTheater();
          }}
          title="বড় স্ক্রিনে দেখুন"
          className="absolute top-3 right-3 bg-slate-950/80 hover:bg-indigo-600 text-slate-300 hover:text-white px-2.5 py-1 rounded-lg border border-slate-800 transition z-20 flex items-center gap-1 text-[10px] font-semibold shadow-lg backdrop-blur-sm cursor-pointer"
        >
          <Maximize2 className="w-3.5 h-3.5 text-indigo-400 group-hover:text-white" />
          <span>বড় স্ক্রিন</span>
        </button>

        <div 
          onClick={onPlay}
          className="absolute inset-0 cursor-pointer"
        >
          <img 
            src={media.thumbnailUrl} 
            alt={title} 
            className="w-full h-full object-cover group-hover/cover:scale-105 transition-transform duration-500 opacity-70"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
          
          <div className="absolute top-3 left-3 bg-emerald-600/90 text-white font-medium text-[10px] uppercase tracking-wider px-2 py-1 rounded-md border border-emerald-500/30 flex items-center gap-1 shadow">
            <Tv className="w-3 h-3 text-emerald-200" />
            ডাইরেক্ট ভিডিও (Direct Video)
          </div>

          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-emerald-600 group-hover/cover:bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-600/40 transform group-hover/cover:scale-110 transition duration-300 relative">
              <span className="absolute inset-0 rounded-full bg-emerald-600 opacity-20 animate-ping"></span>
              <Play className="w-6 h-6 fill-white text-white ml-1" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. STANDARD IFRAME EMBED PLAYER (YouTube, TikTok, Vimeo, Dailymotion)
  if (media.playerType === 'iframe') {
    if (isPlaying) {
      const activeUrl = media.embedUrl.includes('autoplay=0')
        ? media.embedUrl.replace('autoplay=0', 'autoplay=1')
        : media.embedUrl;

      return (
        <div className={`relative aspect-video w-full bg-black overflow-hidden ${className}`}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenTheater();
            }}
            title="বড় স্ক্রিনে দেখুন"
            className="absolute top-3 right-3 bg-slate-950/80 hover:bg-indigo-600 text-slate-300 hover:text-white px-2.5 py-1 rounded-lg border border-slate-800 transition z-20 flex items-center gap-1 text-[10px] font-semibold shadow-lg backdrop-blur-sm cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5 text-indigo-400 group-hover:text-white" />
            <span>বড় স্ক্রিন</span>
          </button>

          <iframe 
            id={`player-${id}`}
            src={activeUrl} 
            title={title}
            className="w-full h-full border-0 absolute top-0 left-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
            referrerPolicy="strict-origin-when-cross-origin" 
            allowFullScreen
          />
        </div>
      );
    }

    // Inactive cover for Iframe
    return (
      <div className={`relative aspect-video w-full bg-black overflow-hidden group/cover ${className}`}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenTheater();
          }}
          title="বড় স্ক্রিনে দেখুন"
          className="absolute top-3 right-3 bg-slate-950/80 hover:bg-indigo-600 text-slate-300 hover:text-white px-2.5 py-1 rounded-lg border border-slate-800 transition z-20 flex items-center gap-1 text-[10px] font-semibold shadow-lg backdrop-blur-sm cursor-pointer"
        >
          <Maximize2 className="w-3.5 h-3.5 text-indigo-400 group-hover:text-white" />
          <span>বড় স্ক্রিন</span>
        </button>

        <div 
          onClick={onPlay}
          className="absolute inset-0 cursor-pointer"
        >
          <img 
            src={thumbnailUrl || media.thumbnailUrl} 
            alt={title} 
            className="w-full h-full object-cover group-hover/cover:scale-105 transition-transform duration-500 opacity-75 group-hover/cover:opacity-85"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

          <div className="absolute top-3 left-3 bg-indigo-600/90 text-white font-medium text-[10px] uppercase tracking-wider px-2 py-1 rounded-md border border-indigo-500/30 flex items-center gap-1 shadow">
            <Headphones className="w-3 h-3 text-emerald-300" />
            <span>{media.platformBadge} • স্ক্রিন অফ সচল</span>
          </div>

          {durationFormatted && (
            <div className="absolute bottom-3 right-3 bg-black/85 text-white font-mono text-[11px] font-bold px-2 py-0.5 rounded-md shadow border border-white/10 z-10 flex items-center gap-1">
              <span>{durationFormatted}</span>
            </div>
          )}

          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-indigo-600 group-hover/cover:bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-600/40 transform group-hover/cover:scale-110 transition duration-300 relative">
              <span className="absolute inset-0 rounded-full bg-indigo-600 opacity-20 animate-ping"></span>
              <Play className="w-6 h-6 fill-white text-white ml-1" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. SOCIAL MEDIA VIDEO PREVIEW CARD (Facebook, Instagram, Twitter/X, External)
  // For platforms that restrict third-party iframe embedding!
  const getPlatformColors = (platform: string) => {
    switch (platform) {
      case 'facebook':
        return {
          bg: 'from-blue-950/80 via-slate-900 to-slate-950',
          border: 'border-blue-600/40',
          badge: 'bg-blue-600 text-white',
          btn: 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
        };
      case 'instagram':
        return {
          bg: 'from-purple-950/80 via-rose-950/50 to-slate-950',
          border: 'border-rose-500/40',
          badge: 'bg-gradient-to-r from-purple-600 to-pink-600 text-white',
          btn: 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-pink-600/30'
        };
      case 'twitter':
        return {
          bg: 'from-slate-900 via-zinc-900 to-slate-950',
          border: 'border-slate-700/60',
          badge: 'bg-slate-800 text-white border border-slate-700',
          btn: 'bg-slate-100 hover:bg-white text-slate-950 font-bold shadow-slate-200/20'
        };
      default:
        return {
          bg: 'from-indigo-950/80 via-slate-900 to-slate-950',
          border: 'border-indigo-500/40',
          badge: 'bg-indigo-600 text-white',
          btn: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
        };
    }
  };

  const style = getPlatformColors(media.type);

  if (tryEmbedAnyway && media.embedUrl) {
    return (
      <div className={`relative aspect-video w-full bg-black overflow-hidden ${className}`}>
        <button
          onClick={() => setTryEmbedAnyway(false)}
          className="absolute top-3 left-3 bg-slate-950/90 text-slate-300 hover:text-white px-2 py-1 rounded-lg text-[10px] font-semibold border border-slate-800 z-20 flex items-center gap-1 cursor-pointer"
        >
          <EyeOff className="w-3 h-3 text-rose-400" />
          <span>কার্ডে ফিরুন</span>
        </button>
        <iframe 
          src={media.embedUrl} 
          title={title}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
          referrerPolicy="strict-origin-when-cross-origin" 
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div className={`relative aspect-video w-full bg-gradient-to-br ${style.bg} border ${style.border} overflow-hidden p-4 flex flex-col justify-between group ${className}`}>
      {/* Background Graphic / Dimmed Image */}
      <img 
        src={media.thumbnailUrl} 
        alt={title} 
        className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none group-hover:scale-105 transition-transform duration-700"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/40 pointer-events-none" />

      {/* Top Header */}
      <div className="relative z-10 flex items-center justify-between gap-2">
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md shadow-sm ${style.badge}`}>
          {media.platformName}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenTheater();
          }}
          title="বড় স্ক্রিনে দেখুন"
          className="bg-slate-950/80 hover:bg-indigo-600 text-slate-300 hover:text-white px-2 py-1 rounded-lg border border-slate-800 transition flex items-center gap-1 text-[10px] font-semibold cursor-pointer shadow backdrop-blur-sm"
        >
          <Maximize2 className="w-3 h-3 text-indigo-400" />
          <span>বড় স্ক্রিন</span>
        </button>
      </div>

      {/* Center Preview Info */}
      <div 
        onClick={onPlay}
        className="relative z-10 my-auto text-center py-2 px-3 cursor-pointer group/center"
      >
        <div className="w-12 h-12 rounded-2xl bg-indigo-600/90 border border-indigo-400/50 flex items-center justify-center mx-auto mb-2 text-white shadow-xl shadow-indigo-600/30 group-hover/center:scale-110 group-hover/center:bg-indigo-500 transition-all duration-300">
          <Play className="w-6 h-6 fill-white text-white ml-0.5" />
        </div>
        <p className="text-xs font-semibold text-slate-100 line-clamp-2 max-w-sm mx-auto leading-relaxed group-hover/center:text-indigo-300 transition">
          {title}
        </p>
        <p className="text-[10px] text-slate-400 mt-1">
          {media.platformBadge} • প্লেয়ারে দেখতে ক্লিক করুন
        </p>
      </div>

      {/* Bottom Direct CTA Watch Button */}
      <div className="relative z-10 flex items-center gap-2 pt-2 border-t border-slate-800/80">
        <a 
          href={media.originalUrl} 
          target="_blank" 
          rel="noopener noreferrer" 
          className={`flex-1 ${style.btn} py-2 px-3 rounded-xl text-xs font-bold transition shadow-lg flex items-center justify-center gap-1.5 cursor-pointer`}
        >
          <span>{media.ctaText}</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>

        {/* Optional Embed Test Toggle */}
        <button
          type="button"
          onClick={() => setTryEmbedAnyway(true)}
          title="অ্যাপের ভেতরে এম্বেড চেষ্টা করুন"
          className="bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white p-2 rounded-xl text-[10px] border border-slate-800 transition cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5 text-indigo-400" />
        </button>
      </div>
    </div>
  );
};
