export type VideoPlatform = 
  | 'youtube' 
  | 'tiktok' 
  | 'facebook' 
  | 'instagram' 
  | 'vimeo' 
  | 'dailymotion' 
  | 'twitter' 
  | 'direct' 
  | 'image' 
  | 'external';

export interface ParsedMedia {
  type: VideoPlatform;
  playerType: 'iframe' | 'direct' | 'social_card' | 'image';
  embedUrl: string;
  originalUrl: string;
  platformName: string;
  platformBadge: string;
  thumbnailUrl: string;
  canEmbedDirectly: boolean;
  requiresExternalLink: boolean;
  ctaText: string;
}

// 1. YouTube ID Extractor
export const getYoutubeId = (url: string): string => {
  try {
    const trimmed = url.trim();
    if (trimmed.includes('youtu.be/')) {
      return trimmed.split('youtu.be/')[1]?.split('?')[0]?.split('&')[0] || '';
    } else if (trimmed.includes('youtube.com/watch')) {
      const urlObj = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
      return urlObj.searchParams.get('v') || '';
    } else if (trimmed.includes('youtube.com/shorts/')) {
      return trimmed.split('youtube.com/shorts/')[1]?.split('?')[0]?.split('&')[0] || '';
    } else if (trimmed.includes('youtube.com/embed/')) {
      return trimmed.split('youtube.com/embed/')[1]?.split('?')[0]?.split('&')[0] || '';
    } else if (trimmed.includes('youtube.com/v/')) {
      return trimmed.split('youtube.com/v/')[1]?.split('?')[0]?.split('&')[0] || '';
    }
  } catch (e) {
    console.warn('YouTube ID parse error:', e);
  }
  return '';
};

/**
 * Converts ISO 8601 duration (e.g. PT4M13S, PT1H2M10S, PT45S) into total seconds.
 */
export function parseIso8601Duration(duration: string): number {
  if (!duration || typeof duration !== 'string') return 0;
  const match = duration.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i);
  if (!match) return 0;
  const days = parseInt(match[1] || '0', 10);
  const hours = parseInt(match[2] || '0', 10);
  const minutes = parseInt(match[3] || '0', 10);
  const seconds = parseInt(match[4] || '0', 10);
  return days * 86400 + hours * 3600 + minutes * 60 + seconds;
}

/**
 * Formats duration in seconds to standard MM:SS or HH:MM:SS format.
 */
export function formatDurationSeconds(seconds: number): string {
  if (!seconds || seconds <= 0 || isNaN(seconds)) return '00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Returns High Quality YouTube Thumbnail with fallback
 */
export function getYoutubeThumbnail(videoId: string, quality: 'maxres' | 'hq' = 'maxres'): string {
  if (!videoId) return '';
  return quality === 'maxres' 
    ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
    : `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

/**
 * Detects whether a video is a YouTube Short, TikTok, Instagram Reel, or short-form video.
 */
export function isShortVideo(item: { url?: string; type?: string; durationSeconds?: number; isShort?: boolean; title?: string }): boolean {
  if (!item) return false;
  if (item.isShort) return true;
  const url = (item.url || '').toLowerCase();
  const title = (item.title || '').toLowerCase();
  if (url.includes('/shorts/') || url.includes('/reel/') || url.includes('/reels/')) return true;
  if (url.includes('tiktok.com') || item.type === 'tiktok') return true;
  if (title.includes('#shorts') || title.includes('#short') || title.includes('#reels') || title.includes('shorts') || title.includes('রিলস')) return true;
  if (item.durationSeconds && item.durationSeconds > 0 && item.durationSeconds <= 60) return true;
  return false;
}


// 2. TikTok ID Extractor
export const getTikTokId = (url: string): string => {
  try {
    const match = url.match(/\/video\/(\d+)/);
    if (match && match[1]) return match[1];

    const matchEmbed = url.match(/\/embed\/v2\/(\d+)/);
    if (matchEmbed && matchEmbed[1]) return matchEmbed[1];

    const matchV = url.match(/\/v\/(\d+)/);
    if (matchV && matchV[1]) return matchV[1];
  } catch (e) {
    console.warn('TikTok ID parse error:', e);
  }
  return '';
};

// 3. Vimeo ID Extractor
export const getVimeoId = (url: string): string => {
  try {
    const match = url.match(/(?:vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+))/);
    if (match && match[1]) return match[1];
  } catch (e) {
    console.warn('Vimeo ID parse error:', e);
  }
  return '';
};

// 4. Dailymotion ID Extractor
export const getDailymotionId = (url: string): string => {
  try {
    const match = url.match(/(?:dailymotion\.com\/(?:embed\/video\/|video\/)|dai\.ly\/)([a-zA-Z0-9]+)/);
    if (match && match[1]) return match[1];
  } catch (e) {
    console.warn('Dailymotion ID parse error:', e);
  }
  return '';
};

// 5. Instagram ID Extractor
export const getInstagramId = (url: string): string => {
  try {
    const match = url.match(/instagram\.com\/(?:p|reel|tv)\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) return match[1];
  } catch (e) {
    console.warn('Instagram ID parse error:', e);
  }
  return '';
};

/**
 * Universal Parser that detects and normalizes ANY video or image URL.
 */
export function parseUniversalMediaUrl(
  rawUrl: string, 
  mediaCategoryOverride?: 'video' | 'image'
): ParsedMedia | null {
  if (!rawUrl || !rawUrl.trim()) return null;

  let url = rawUrl.trim();
  if (url.startsWith('//')) {
    url = 'https:' + url;
  } else if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  const lowerUrl = url.toLowerCase();

  // A. IMAGE CHECK
  if (
    mediaCategoryOverride === 'image' ||
    lowerUrl.endsWith('.jpg') ||
    lowerUrl.endsWith('.jpeg') ||
    lowerUrl.endsWith('.png') ||
    lowerUrl.endsWith('.webp') ||
    lowerUrl.endsWith('.gif') ||
    lowerUrl.endsWith('.svg') ||
    lowerUrl.endsWith('.avif') ||
    lowerUrl.includes('images.unsplash.com') ||
    lowerUrl.includes('imgur.com') ||
    lowerUrl.includes('photos.google.com') ||
    lowerUrl.includes('res.cloudinary.com') ||
    (lowerUrl.includes('drive.google.com/file/d/') && lowerUrl.includes('view'))
  ) {
    return {
      type: 'image',
      playerType: 'image',
      embedUrl: url,
      originalUrl: url,
      platformName: 'ফটো / Photo',
      platformBadge: 'Photo',
      thumbnailUrl: url,
      canEmbedDirectly: true,
      requiresExternalLink: false,
      ctaText: 'বড় করে দেখুন (Full View)'
    };
  }

  // B. YOUTUBE
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
    const videoId = getYoutubeId(url);
    if (videoId) {
      return {
        type: 'youtube',
        playerType: 'iframe',
        embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=0&rel=0&enablejsapi=1`,
        originalUrl: url,
        platformName: 'YouTube',
        platformBadge: 'YouTube',
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        canEmbedDirectly: true,
        requiresExternalLink: false,
        ctaText: 'ইউটিউবে দেখুন / Watch on YouTube'
      };
    }
  }

  // C. TIKTOK
  if (lowerUrl.includes('tiktok.com')) {
    const tiktokId = getTikTokId(url);
    const embedUrl = tiktokId 
      ? `https://www.tiktok.com/embed/v2/${tiktokId}` 
      : url;

    return {
      type: 'tiktok',
      playerType: 'iframe',
      embedUrl,
      originalUrl: url,
      platformName: 'TikTok',
      platformBadge: 'TikTok',
      thumbnailUrl: 'https://images.unsplash.com/photo-1611162618071-b39a2ec055fb?w=640&h=360&fit=crop',
      canEmbedDirectly: !!tiktokId,
      requiresExternalLink: !tiktokId,
      ctaText: 'টিকটকে দেখুন / Watch on TikTok'
    };
  }

  // D. VIMEO
  if (lowerUrl.includes('vimeo.com')) {
    const vimeoId = getVimeoId(url);
    if (vimeoId) {
      return {
        type: 'vimeo',
        playerType: 'iframe',
        embedUrl: `https://player.vimeo.com/video/${vimeoId}?autoplay=0&title=0&byline=0`,
        originalUrl: url,
        platformName: 'Vimeo',
        platformBadge: 'Vimeo',
        thumbnailUrl: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=640&h=360&fit=crop',
        canEmbedDirectly: true,
        requiresExternalLink: false,
        ctaText: 'ভিমেইওতে দেখুন / Watch on Vimeo'
      };
    }
  }

  // E. DAILYMOTION
  if (lowerUrl.includes('dailymotion.com') || lowerUrl.includes('dai.ly')) {
    const dmId = getDailymotionId(url);
    if (dmId) {
      return {
        type: 'dailymotion',
        playerType: 'iframe',
        embedUrl: `https://www.dailymotion.com/embed/video/${dmId}?autoplay=0`,
        originalUrl: url,
        platformName: 'Dailymotion',
        platformBadge: 'Dailymotion',
        thumbnailUrl: `https://www.dailymotion.com/thumbnail/video/${dmId}`,
        canEmbedDirectly: true,
        requiresExternalLink: false,
        ctaText: 'ডেইলি মোশনে দেখুন / Watch on Dailymotion'
      };
    }
  }

  // F. FACEBOOK (Restricted third-party iframe embed)
  if (lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.watch') || lowerUrl.includes('fb.com')) {
    // Official Facebook Video Embed plugin URL
    const fbEmbedUrl = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=0&width=560`;
    return {
      type: 'facebook',
      playerType: 'social_card',
      embedUrl: fbEmbedUrl,
      originalUrl: url,
      platformName: 'Facebook Video',
      platformBadge: 'Facebook',
      thumbnailUrl: 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=640&h=360&fit=crop',
      canEmbedDirectly: false, // Social media links that restrict 3rd party iframe embedding
      requiresExternalLink: true,
      ctaText: 'ফেসবুকে ভিডিওটি দেখুন / Watch on Facebook'
    };
  }

  // G. INSTAGRAM (Restricted third-party iframe embed)
  if (lowerUrl.includes('instagram.com') || lowerUrl.includes('instagr.am')) {
    const igId = getInstagramId(url);
    const igEmbed = igId ? `https://www.instagram.com/reel/${igId}/embed` : url;
    return {
      type: 'instagram',
      playerType: 'social_card',
      embedUrl: igEmbed,
      originalUrl: url,
      platformName: 'Instagram Reel/Video',
      platformBadge: 'Instagram',
      thumbnailUrl: 'https://images.unsplash.com/photo-1611262588024-d12430b98920?w=640&h=360&fit=crop',
      canEmbedDirectly: false,
      requiresExternalLink: true,
      ctaText: 'ইনস্টাগ্রামে দেখুন / Watch on Instagram'
    };
  }

  // H. TWITTER / X (Restricted third-party iframe embed)
  if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) {
    return {
      type: 'twitter',
      playerType: 'social_card',
      embedUrl: url,
      originalUrl: url,
      platformName: 'X / Twitter Video',
      platformBadge: 'X (Twitter)',
      thumbnailUrl: 'https://images.unsplash.com/photo-1611605698335-8b1569810432?w=640&h=360&fit=crop',
      canEmbedDirectly: false,
      requiresExternalLink: true,
      ctaText: 'টুইটারে (X) দেখুন / Watch on X'
    };
  }

  // I. DIRECT HTML5 VIDEO FILES (.mp4, .webm, .ogg, .mov, etc.)
  if (
    lowerUrl.endsWith('.mp4') ||
    lowerUrl.endsWith('.webm') ||
    lowerUrl.endsWith('.ogg') ||
    lowerUrl.endsWith('.ogv') ||
    lowerUrl.endsWith('.mov') ||
    lowerUrl.endsWith('.m4v') ||
    lowerUrl.endsWith('.mp3') ||
    lowerUrl.endsWith('.wav') ||
    lowerUrl.endsWith('.m4a') ||
    lowerUrl.endsWith('.m3u8') ||
    lowerUrl.includes('stream') ||
    lowerUrl.includes('.mp4?') ||
    lowerUrl.includes('.webm?')
  ) {
    return {
      type: 'direct',
      playerType: 'direct',
      embedUrl: url,
      originalUrl: url,
      platformName: 'Direct Video',
      platformBadge: 'HTML5 Video',
      thumbnailUrl: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=640&h=360&fit=crop',
      canEmbedDirectly: true,
      requiresExternalLink: false,
      ctaText: 'ভিডিও সরাসরি প্লে করুন'
    };
  }

  // J. UNIVERSAL WEB VIDEO FALLBACK
  return {
    type: 'external',
    playerType: 'social_card',
    embedUrl: url,
    originalUrl: url,
    platformName: 'ওয়েব ভিডিও / Web Video',
    platformBadge: 'Web Video',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518173946687-a4c8a383392e?w=640&h=360&fit=crop',
    canEmbedDirectly: false,
    requiresExternalLink: true,
    ctaText: 'ভিডিওটি দেখুন / Watch Video'
  };
}
