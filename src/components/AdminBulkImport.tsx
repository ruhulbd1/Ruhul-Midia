import React, { useState } from 'react';
import { 
  Youtube, 
  DownloadCloud, 
  ListVideo, 
  Tv, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  ExternalLink, 
  Clock, 
  ShieldCheck, 
  Sparkles, 
  RefreshCw, 
  Key, 
  ArrowRight,
  CheckSquare,
  Square,
  HelpCircle
} from 'lucide-react';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

interface YouTubePreviewItem {
  videoId: string;
  title: string;
  url: string;
  uploader: string;
  thumbnailUrl: string;
  durationSeconds: number;
  durationFormatted: string;
  publishedAt: string;
}

interface Video {
  id: string;
  title: string;
  url: string;
  type: any;
  date: string;
  uploader?: string;
  createdAt?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  durationFormatted?: string;
}

interface AdminBulkImportProps {
  adminToken: string;
  youtubeApiKey?: string;
  existingVideoUrls: Set<string>;
  onNavigateToSettings: () => void;
  onVideosImported: (newVideos: Video[]) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function AdminBulkImport({
  adminToken,
  youtubeApiKey = '',
  existingVideoUrls,
  onNavigateToSettings,
  onVideosImported,
  showToast
}: AdminBulkImportProps) {
  const [urlInput, setUrlInput] = useState('');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [previewData, setPreviewData] = useState<{
    title: string;
    type: string;
    playlistId?: string;
    totalFound: number;
    videos: YouTubePreviewItem[];
  } | null>(null);
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set());
  const [errorMsg, setErrorMsg] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState(youtubeApiKey);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [isSavingKey, setIsSavingKey] = useState(false);

  // Sync API key if updated externally
  React.useEffect(() => {
    if (youtubeApiKey) {
      setApiKeyInput(youtubeApiKey);
    }
  }, [youtubeApiKey]);

  // Handle Quick Save of API Key directly from this screen
  const handleSaveApiKeyInline = async () => {
    const cleanKey = apiKeyInput.trim();
    setIsSavingKey(true);
    try {
      const tokenToUse = (adminToken && adminToken.trim()) ? adminToken.trim() : (localStorage.getItem('sv_admin_token') || 'RuhulMidiaAdminToken2026');
      const res = await fetch('/api/youtube/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenToUse}`,
          'x-admin-role': 'admin'
        },
        body: JSON.stringify({ youtubeApiKey: cleanKey })
      });
      if (res.ok) {
        showToast('YouTube Data API Key সফলভাবে সেভ হয়েছে!', 'success');
        setShowApiKeyInput(false);
      } else {
        showToast('কী সেভ করতে সমস্যা হয়েছে', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'সেভ ব্যর্থ হয়েছে', 'error');
    } finally {
      setIsSavingKey(false);
    }
  };

  // 1. Fetch & Preview Channel/Playlist Videos
  const handleFetchPreview = async (e?: React.FormEvent, customUrl?: string) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    const trimmed = (customUrl || urlInput).trim();
    if (!trimmed) {
      setErrorMsg('অনুগ্রহ করে একটি YouTube প্লেলিস্ট বা চ্যানেল লিংক দিন!');
      return;
    }

    if (customUrl) {
      setUrlInput(customUrl);
    }

    setIsLoadingPreview(true);
    setPreviewData(null);
    setSelectedVideoIds(new Set());

    try {
      const tokenToUse = (adminToken && adminToken.trim()) ? adminToken.trim() : (localStorage.getItem('sv_admin_token') || 'RuhulMidiaAdminToken2026');
      
      // Send bulk preview request
      const res = await fetch('/api/youtube/bulk-preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenToUse}`,
          'x-admin-role': 'admin'
        },
        body: JSON.stringify({ 
          url: trimmed,
          apiKey: (apiKeyInput || youtubeApiKey || '').trim()
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'ভিডিও তালিকা লোড করতে সমস্যা হয়েছে!');
      }

      if (!Array.isArray(data.videos) || data.videos.length === 0) {
        setErrorMsg('কোনো পাবলিক ভিডিও পাওয়া যায়নি। লিংকটি সঠিক কিনা নিশ্চিত করুন।');
        return;
      }

      setPreviewData({
        title: data.title || 'YouTube Channel / Playlist',
        type: data.type || 'playlist',
        playlistId: data.playlistId,
        totalFound: data.videos.length,
        videos: data.videos
      });

      // Select all non-duplicate videos by default
      const defaultSelected = new Set<string>();
      data.videos.forEach((v: YouTubePreviewItem) => {
        if (!existingVideoUrls.has(v.url) && !existingVideoUrls.has(`https://youtu.be/${v.videoId}`)) {
          defaultSelected.add(v.videoId);
        }
      });
      setSelectedVideoIds(defaultSelected);

      showToast(`✓ সফলভাবে ${data.videos.length}টি ভিডিও প্রিভিউ লোড হয়েছে!`, 'success');
    } catch (err: any) {
      console.error('Bulk preview error:', err);
      setErrorMsg(err.message || 'ইউটিউব ডাটা লোড করা যায়নি।');
      showToast(err.message || 'ডাটা লোড ব্যর্থ হয়েছে', 'error');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // 2. Toggle Selection
  const toggleSelectVideo = (videoId: string) => {
    setSelectedVideoIds(prev => {
      const next = new Set(prev);
      if (next.has(videoId)) {
        next.delete(videoId);
      } else {
        next.add(videoId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (!previewData) return;
    const all = new Set(previewData.videos.map(v => v.videoId));
    setSelectedVideoIds(all);
  };

  const handleDeselectAll = () => {
    setSelectedVideoIds(new Set());
  };

  // 3. Execute Bulk Import
  const handleExecuteImport = async () => {
    if (!previewData || selectedVideoIds.size === 0) {
      showToast('ইমপোর্ট করার জন্য অন্তত একটি ভিডিও নির্বাচন করুন!', 'error');
      return;
    }

    const videosToImport = previewData.videos.filter(v => selectedVideoIds.has(v.videoId));
    setIsImporting(true);

    try {
      const tokenToUse = (adminToken && adminToken.trim()) ? adminToken.trim() : (localStorage.getItem('sv_admin_token') || 'RuhulMidiaAdminToken2026');

      // 1. Call server bulk import endpoint
      const res = await fetch('/api/youtube/bulk-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenToUse}`,
          'x-admin-role': 'admin'
        },
        body: JSON.stringify({
          videos: videosToImport
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'সার্ভারে বাল্ক ইমপোর্ট ব্যর্থ হয়েছে!');
      }

      const importedItems: Video[] = (data.importedVideos || []).map((v: any) => ({
        id: v.id || Date.now().toString() + Math.random().toString(36).substring(2, 6),
        title: v.title,
        url: v.url,
        type: 'youtube',
        date: v.date || new Date().toISOString().split('T')[0],
        uploader: v.uploader || 'YouTube Creator',
        createdAt: v.createdAt || new Date().toISOString(),
        thumbnailUrl: v.thumbnailUrl,
        durationSeconds: v.durationSeconds,
        durationFormatted: v.durationFormatted
      }));

      // 2. Synchronize each imported video into Firebase Firestore for permanent real-time global retention
      for (const item of importedItems) {
        try {
          await setDoc(doc(db, 'videos', item.id), item);
        } catch (fErr) {
          console.warn('Firestore bulk sync notice:', fErr);
        }
      }

      // 3. Notify parent app state
      onVideosImported(importedItems);
      showToast(`🎉 চমৎকার! ${importedItems.length}টি ভিডিও সফলভাবে ডাটাবেজে যুক্ত হয়েছে!`, 'success');

      // Clear preview
      setPreviewData(null);
      setUrlInput('');
      setSelectedVideoIds(new Set());
    } catch (err: any) {
      console.error('Bulk import execute error:', err);
      showToast(err.message || 'ইমপোর্টে সমস্যা হয়েছে!', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-red-950/60 via-slate-900 to-indigo-950/50 border border-red-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
          <Youtube className="w-48 h-48 text-red-500" />
        </div>

        <div className="max-w-3xl relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-red-600/90 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md flex items-center gap-1 shadow">
              <ShieldCheck className="w-3.5 h-3.5" />
              শুধুমাত্র এডমিন অধিকার (Admin Only)
            </span>
            <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              YouTube Data API v3 বাল্ক ইমপোর্টার
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
            <DownloadCloud className="w-6 h-6 text-red-400" />
            <span>ইউটিউব চ্যানেল / প্লেলিস্ট বাল্ক ইমপোর্ট (Bulk Video Import)</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
            সাধারণ ব্যবহারকারীরা শুধুমাত্র একটি একটি করে ভিডিও আপলোড করতে পারে। শুধুমাত্র এডমিন প্যানেল থেকে আপনি যেকোনো 
            <strong> YouTube Playlist</strong> বা <strong>YouTube Channel URL (@handle / UC...)</strong> দিয়ে একসাথে সব ভিডিও হাই-কোয়ালিটি থাম্বনেইল, শিরোনাম ও সঠিক সময়সহ ডাটাবেজে স্বয়ংক্রিয়ভাবে ইমপোর্ট করতে পারবেন।
          </p>

          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-red-500/20 text-xs">
            <span className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-md flex items-center gap-1.5 font-medium shadow-sm">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>এডমিন সেশন অনুমোদিত (Admin Access Active)</span>
            </span>
            {apiKeyInput ? (
              <span className="bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 px-2.5 py-1 rounded-md flex items-center gap-1.5 font-medium">
                <Key className="w-3.5 h-3.5 text-indigo-400" />
                <span>YouTube Data API v3 কী সংযুক্ত</span>
              </span>
            ) : (
              <span className="bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-md flex items-center gap-1.5 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>হাই-স্পিড পাবলিক ফিড ও ওএমবেড ফলব্যাক সক্রিয়</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Inline API Key Accordion / Quick Setting */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <Key className="w-4 h-4 text-amber-400" />
            <span className="font-semibold text-slate-200">YouTube Data API v3 কী কনফিগারেশন:</span>
            <span className="text-[11px] text-slate-400">
              {apiKeyInput ? '••••••••' + apiKeyInput.slice(-4) : '(ঐচ্ছিক - ফুল প্লেলিস্ট কোটার জন্য)'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowApiKeyInput(!showApiKeyInput)}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium underline cursor-pointer"
          >
            {showApiKeyInput ? 'লুকান' : (apiKeyInput ? 'কী পরিবর্তন করুন' : 'API Key প্রবেশ করান')}
          </button>
        </div>

        {showApiKeyInput && (
          <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-slate-800">
            <input
              type="text"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="গুগল ক্লাউড YouTube Data API v3 Key (যেমন: AIzaSy...)"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-indigo-500 text-slate-100 font-mono"
            />
            <button
              type="button"
              onClick={handleSaveApiKeyInline}
              disabled={isSavingKey}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer shrink-0 flex items-center justify-center gap-1.5"
            >
              {isSavingKey ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
              <span>সেভ করুন</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Input Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <form onSubmit={(e) => handleFetchPreview(e)} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Youtube className="w-4 h-4 text-red-500" />
                <span>YouTube প্লেলিস্ট লিংক অথবা চ্যানেল লিংক দিন:</span>
              </label>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="যেমন: https://www.youtube.com/playlist?list=... বা https://www.youtube.com/@ChannelName"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500 text-slate-100 placeholder-slate-600 font-mono transition"
                />
                {urlInput && (
                  <button
                    type="button"
                    onClick={() => setUrlInput('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-1 text-xs"
                  >
                    মুছুন
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoadingPreview || !urlInput.trim()}
                className="bg-red-600 hover:bg-red-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold px-6 py-3 rounded-xl transition shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                {isLoadingPreview ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>যাচাই হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>ভিডিও খুঁজুন ও প্রিভিউ দেখুন</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Click-to-Test Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-400">
            <span className="font-semibold text-slate-300 text-[11px] flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              টেস্ট করতে ক্লিক করুন:
            </span>
            <button
              type="button"
              onClick={() => handleFetchPreview(undefined, 'https://www.youtube.com/@GoogleDevelopers')}
              className="bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white px-2.5 py-1 rounded-lg text-[11px] font-medium border border-slate-700/80 transition cursor-pointer"
            >
              📺 @GoogleDevelopers
            </button>
            <button
              type="button"
              onClick={() => handleFetchPreview(undefined, 'https://www.youtube.com/@reactjs')}
              className="bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white px-2.5 py-1 rounded-lg text-[11px] font-medium border border-slate-700/80 transition cursor-pointer"
            >
              📺 @reactjs
            </button>
            <button
              type="button"
              onClick={() => handleFetchPreview(undefined, 'https://www.youtube.com/playlist?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf')}
              className="bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white px-2.5 py-1 rounded-lg text-[11px] font-medium border border-slate-700/80 transition cursor-pointer"
            >
              📋 টেস্ট প্লেলিস্ট (Playlist)
            </button>
          </div>

          {/* Supported Format Hints */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-[11px] text-slate-400 flex flex-wrap gap-x-4 gap-y-1.5 items-center">
            <span className="font-semibold text-slate-300 flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
              সমর্থিত ফরম্যাট:
            </span>
            <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">1. প্লেলিস্ট: youtube.com/playlist?list=PL...</span>
            <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">2. চ্যানেল হ্যান্ডেল: youtube.com/@ChannelName</span>
            <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">3. চ্যানেল আইডি: youtube.com/channel/UC...</span>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-950/50 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </form>
      </div>

      {/* Preview Section */}
      {previewData && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5 animate-fadeIn">
          
          {/* Header Bar with Action Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  {previewData.type === 'channel' ? '📺 ইউটিউব চ্যানেল' : '📋 প্লেলিস্ট'}
                </span>
                <h3 className="text-lg font-bold text-white truncate max-w-md">{previewData.title}</h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                মোট {previewData.totalFound}টি ভিডিও পাওয়া গেছে • 
                <span className="text-emerald-400 font-semibold ml-1">{selectedVideoIds.size}টি নির্বাচিত</span>
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleSelectAll}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
              >
                <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
                <span>সব সিলেক্ট</span>
              </button>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Square className="w-3.5 h-3.5 text-slate-500" />
                <span>আনসিলেক্ট</span>
              </button>
              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={isImporting || selectedVideoIds.size === 0}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold px-5 py-2 rounded-xl text-xs sm:text-sm transition shadow-lg shadow-emerald-600/30 flex items-center gap-2 cursor-pointer ml-2"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>ইমপোর্ট হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <DownloadCloud className="w-4 h-4" />
                    <span>{selectedVideoIds.size}টি ভিডিও ইমপোর্ট করুন</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Videos Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[600px] overflow-y-auto pr-1">
            {previewData.videos.map((v) => {
              const isSelected = selectedVideoIds.has(v.videoId);
              const isAlreadyInDb = existingVideoUrls.has(v.url) || existingVideoUrls.has(`https://youtu.be/${v.videoId}`);

              return (
                <div
                  key={v.videoId}
                  onClick={() => toggleSelectVideo(v.videoId)}
                  className={`bg-slate-950/80 border rounded-xl overflow-hidden cursor-pointer transition p-2.5 flex flex-col justify-between group ${
                    isSelected 
                      ? 'border-indigo-500 ring-1 ring-indigo-500/50 bg-indigo-950/20' 
                      : 'border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div>
                    {/* Thumbnail */}
                    <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                      <img 
                        src={v.thumbnailUrl} 
                        alt={v.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300" 
                        loading="lazy"
                      />
                      {v.durationFormatted && (
                        <span className="absolute bottom-1 right-1 bg-black/85 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded">
                          {v.durationFormatted}
                        </span>
                      )}
                      
                      {/* Checkbox indicator */}
                      <div className="absolute top-2 left-2 bg-slate-950/80 rounded-md p-1 shadow">
                        {isSelected ? (
                          <CheckCircle className="w-4 h-4 text-emerald-400 fill-emerald-400/20" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </div>

                      {isAlreadyInDb && (
                        <div className="absolute top-2 right-2 bg-amber-500/90 text-slate-950 font-bold text-[9px] px-1.5 py-0.5 rounded shadow">
                          ডাটাবেজে আছে
                        </div>
                      )}
                    </div>

                    {/* Meta */}
                    <div className="mt-2 space-y-1">
                      <h4 className="text-xs font-semibold text-white line-clamp-2 leading-snug group-hover:text-indigo-400">
                        {v.title}
                      </h4>
                      <p className="text-[10px] text-slate-400 truncate">
                        {v.uploader}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mt-3 pt-2 border-t border-slate-900">
                    <span>{v.publishedAt}</span>
                    <a
                      href={v.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5"
                    >
                      <span>আসল</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Action Footer */}
          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-slate-400">
              নির্বাচিত ভিডিওগুলো স্বয়ংক্রিয়ভাবে ক্লাউড ফায়ারবেজ ও লোকাল সার্ভারে ব্যাকআপ হিসেবে স্থায়ীভাবে সেভ হবে।
            </span>
            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={isImporting || selectedVideoIds.size === 0}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl transition shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>ইমপোর্ট হচ্ছে...</span>
                </>
              ) : (
                <>
                  <DownloadCloud className="w-4 h-4" />
                  <span>{selectedVideoIds.size}টি ভিডিও ইমপোর্ট করুন</span>
                </>
              )}
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
