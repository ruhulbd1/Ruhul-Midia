import React, { useState, useEffect } from 'react';
import { 
  Coins, 
  Clock, 
  UploadCloud, 
  Globe, 
  Tv, 
  Save, 
  RotateCcw, 
  CheckCircle, 
  Sparkles, 
  AlertCircle,
  HelpCircle,
  Layers,
  ArrowRight,
  Youtube,
  Key,
  Eye,
  EyeOff,
  Check,
  ExternalLink
} from 'lucide-react';
import { RewardSettings, DEFAULT_REWARD_SETTINGS } from '../types/earning';

interface AdminRewardSettingsProps {
  currentSettings: RewardSettings;
  onSave: (settings: RewardSettings) => Promise<boolean>;
  isSaving?: boolean;
  youtubeApiKey?: string;
  onSaveYouTubeApiKey?: (key: string) => Promise<boolean>;
  adminToken?: string;
}

export default function AdminRewardSettings({
  currentSettings,
  onSave,
  isSaving = false,
  youtubeApiKey = '',
  onSaveYouTubeApiKey,
  adminToken = ''
}: AdminRewardSettingsProps) {
  const [formData, setFormData] = useState<RewardSettings>({
    pointsPerVideoUpload: currentSettings.pointsPerVideoUpload ?? DEFAULT_REWARD_SETTINGS.pointsPerVideoUpload,
    pointsPerWebsiteVisit: currentSettings.pointsPerWebsiteVisit ?? DEFAULT_REWARD_SETTINGS.pointsPerWebsiteVisit,
    watchDurationSeconds: currentSettings.watchDurationSeconds ?? DEFAULT_REWARD_SETTINGS.watchDurationSeconds,
    pointsPerVideoWatch: currentSettings.pointsPerVideoWatch ?? DEFAULT_REWARD_SETTINGS.pointsPerVideoWatch,
    pointsPerBdt: currentSettings.pointsPerBdt ?? DEFAULT_REWARD_SETTINGS.pointsPerBdt,
    minWithdrawBdt: currentSettings.minWithdrawBdt ?? DEFAULT_REWARD_SETTINGS.minWithdrawBdt
  });

  // YouTube API Key state
  const [apiKeyInput, setApiKeyInput] = useState(youtubeApiKey);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (youtubeApiKey) {
      setApiKeyInput(youtubeApiKey);
    } else {
      // Fetch current key from server
      fetch('/api/youtube/settings')
        .then(r => r.json())
        .then(d => {
          if (d && d.youtubeApiKey) {
            setApiKeyInput(d.youtubeApiKey);
          }
        })
        .catch(() => {});
    }
  }, [youtubeApiKey]);

  const [hasChanged, setHasChanged] = useState(false);

  const handleChange = (field: keyof RewardSettings, val: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: val
    }));
    setHasChanged(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await onSave(formData);
    if (success) {
      setHasChanged(false);
    }
  };

  const handleSaveKey = async () => {
    setIsSavingKey(true);
    setTestResult(null);
    try {
      if (onSaveYouTubeApiKey) {
        await onSaveYouTubeApiKey(apiKeyInput);
      } else {
        const token = adminToken;
        await fetch('/api/youtube/settings', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ youtubeApiKey: apiKeyInput.trim() })
        });
      }
      setTestResult({
        success: true,
        message: apiKeyInput.trim() ? '✓ YouTube Data API কী সফলভাবে সেভ হয়েছে!' : '✓ YouTube Data API কী মুছে ফেলা হয়েছে (oEmbed ফলব্যাক মোড সক্রিয়)'
      });
    } catch {
      setTestResult({
        success: false,
        message: 'এপিআই কী সেভ করতে সমস্যা হয়েছে!'
      });
    } finally {
      setIsSavingKey(false);
    }
  };

  const handleTestKey = async () => {
    setIsTestingKey(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/youtube/metadata?videoId=dQw4w9WgXcQ`);
      const data = await res.json();
      if (data && data.success) {
        if (data.source === 'youtube_data_api_v3') {
          setTestResult({
            success: true,
            message: `✓ এপিআই সফলভাবে সংযুক্ত! টাইটেল: "${data.title.slice(0, 30)}...", সময়কাল: ${data.durationFormatted} (${data.durationSeconds}s)`
          });
        } else {
          setTestResult({
            success: true,
            message: `✓ oEmbed ফলব্যাক সচল রয়েছে। টাইটেল: "${data.title.slice(0, 30)}..." (API Key যুক্ত করলে সঠিক সময়কাল পাওয়া যাবে)`
          });
        }
      } else {
        setTestResult({
          success: false,
          message: 'কানেকশন টেস্ট ব্যর্থ হয়েছে।'
        });
      }
    } catch {
      setTestResult({
        success: false,
        message: 'কানেকশন টেস্টে নেটওয়ার্ক ত্রুটি।'
      });
    } finally {
      setIsTestingKey(false);
    }
  };

  const handleResetToDefaults = () => {
    if (confirm('আপনি কি ডিফল্ট রিওয়ার্ড সেটিংস পুনরুদ্ধার করতে চান?')) {
      setFormData(DEFAULT_REWARD_SETTINGS);
      setHasChanged(true);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-amber-950/60 via-slate-900 to-indigo-950/60 border border-amber-500/30 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-lg">
              <Coins className="w-8 h-8 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  পয়েন্ট ও রিওয়ার্ড সেটিংস (Points & Reward Settings)
                </h2>
                <span className="text-[11px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold px-2.5 py-0.5 rounded-full">
                  লাইভ ও ডায়নামিক
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
                এখানে আপনি ভিডিও দেখার প্রয়োজনীয় সময়সীমা (টাইমার), ভিডিও দেখার পয়েন্ট, নতুন ভিডিও লিংক আপলোড করার পয়েন্ট এবং ওয়েবসাইট ভিজিট টাস্কের পয়েন্ট নিজের ইচ্ছামতো পরিবর্তন করতে পারবেন। সেভ করার সাথে সাথে সকল ব্যবহারকারীর ওয়ালেটে এই নিয়ম কার্যকর হবে।
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetToDefaults}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-4 py-2 rounded-xl text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>ডিফল্ট রিস্টোর</span>
          </button>
        </div>
      </div>

      {/* 2. Settings Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Card 1: Video Watch Duration / Timer */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 hover:border-indigo-500/40 transition">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">ভিডিও ওয়াচ টাইমার (Watch Timer Duration)</h3>
                  <p className="text-[11px] text-slate-400">কয়েন পেতে ব্যবহারকারীকে কত সেকেন্ড দেখতে হবে</p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-lg">
                {formData.watchDurationSeconds}s
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                সময়সীমা (সেকেন্ড / Seconds)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="5"
                  max="300"
                  step="1"
                  value={formData.watchDurationSeconds}
                  onChange={(e) => handleChange('watchDurationSeconds', Math.max(5, parseInt(e.target.value) || 5))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-indigo-500 transition"
                  placeholder="যেমন: 15 বা 30"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-500">সেকেন্ড</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
                <HelpCircle className="w-3 h-3 text-slate-400" />
                <span>কমপক্ষে ৫ সেকেন্ড থেকে সর্বোচ্চ ৩০০ সেকেন্ড সেট করা যাবে (যেমন: 15s বা 30s)</span>
              </p>
            </div>
          </div>

          {/* Card 2: Points per Video Watched */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 hover:border-amber-500/40 transition">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Tv className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">প্রতি ভিডিও দেখার পয়েন্ট (Points per Video)</h3>
                  <p className="text-[11px] text-slate-400">টাইমার শেষ হলে স্বয়ংক্রিয়ভাবে প্রদানকৃত কয়েন</p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg">
                +{formData.pointsPerVideoWatch} কয়েন
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                পয়েন্টের পরিমাণ (Points Amount)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="10000"
                  step="1"
                  value={formData.pointsPerVideoWatch}
                  onChange={(e) => handleChange('pointsPerVideoWatch', Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-amber-500 transition"
                  placeholder="যেমন: 50 বা 20"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-500">কয়েন / পয়েন্ট</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
                <HelpCircle className="w-3 h-3 text-slate-400" />
                <span>ভিডিওটি সম্পূর্ণ দেখার পর ব্যবহারকারীর ওয়ালেটে সাথে সাথে যোগ হবে</span>
              </p>
            </div>
          </div>

          {/* Card 3: Points per Video Link Upload */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 hover:border-emerald-500/40 transition">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">ভিডিও লিংক আপলোড পয়েন্ট (Points per Upload)</h3>
                  <p className="text-[11px] text-slate-400">নতুন ভিডিও বা ফটো লিংক যোগ করলে প্রাপ্ত কয়েন</p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">
                +{formData.pointsPerVideoUpload} কয়েন
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                আপলোড রিওয়ার্ড পয়েন্ট (Upload Reward)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="5000"
                  step="1"
                  value={formData.pointsPerVideoUpload}
                  onChange={(e) => handleChange('pointsPerVideoUpload', Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-emerald-500 transition"
                  placeholder="যেমন: 10 বা 25"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-500">কয়েন / পয়েন্ট</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
                <HelpCircle className="w-3 h-3 text-slate-400" />
                <span>ইউজার 'ভিডিও যোগ করুন' থেকে লিংক আপলোড সফল হলে বোনাস পয়েন্ট পাবেন</span>
              </p>
            </div>
          </div>

          {/* Card 4: Points per Website Visit Task */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 hover:border-purple-500/40 transition">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">ওয়েবসাইট ভিজিট টাস্ক (Points per Website Visit)</h3>
                  <p className="text-[11px] text-slate-400">স্পন্সর অফার বা সাইট পরিদর্শনে পয়েন্ট</p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-purple-400 bg-purple-500/10 px-2 py-1 rounded-lg">
                +{formData.pointsPerWebsiteVisit} কয়েন
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                ভিজিট রিওয়ার্ড পয়েন্ট (Visit Reward)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="5000"
                  step="1"
                  value={formData.pointsPerWebsiteVisit}
                  onChange={(e) => handleChange('pointsPerWebsiteVisit', Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-purple-500 transition"
                  placeholder="যেমন: 15 বা 30"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-500">কয়েন / পয়েন্ট</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
                <HelpCircle className="w-3 h-3 text-slate-400" />
                <span>ওয়ালেট পেজে ব্যবহারকারী 'স্পন্সর অফার ভিজিট' সম্পন্ন করলে এই বোনাস পাবেন</span>
              </p>
            </div>
          </div>

          {/* Card 5: Points per 1 BDT conversion */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">পয়েন্ট কনভার্শন রেট (Conversion Rate)</h3>
                  <p className="text-[11px] text-slate-400">কত কয়েন সমান ১ টাকা (BDT)</p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded-lg">
                {formData.pointsPerBdt} কয়েন = ৳১
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                ১ টাকায় পয়েন্ট সংখ্যা (Points per ৳1 BDT)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="100000"
                  step="1"
                  value={formData.pointsPerBdt}
                  onChange={(e) => handleChange('pointsPerBdt', Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-cyan-500 transition"
                  placeholder="যেমন: 100"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-500">কয়েন = ৳১</span>
              </div>
            </div>
          </div>

          {/* Card 6: Minimum Withdrawal BDT */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">সর্বনিম্ন উত্তোলন (Minimum Withdrawal)</h3>
                  <p className="text-[11px] text-slate-400">উইথড্র করার সর্বনিম্ন টাকার পরিমাণ</p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-rose-400 bg-rose-500/10 px-2 py-1 rounded-lg">
                ৳ {formData.minWithdrawBdt} টাকা
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                সর্বনিম্ন পরিমাণ (টাকা / BDT)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="10000"
                  step="1"
                  value={formData.minWithdrawBdt}
                  onChange={(e) => handleChange('minWithdrawBdt', Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-rose-500 transition"
                  placeholder="যেমন: 20"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-500">টাকা (BDT)</span>
              </div>
            </div>
          </div>

        </div>

        {/* 3. Live User Calculation Summary Card */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>ইউজার প্যানেলে সরাসরি লাইভ রূপরেখা (User Earning Summary Preview)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800/80">
              <span className="text-slate-400 block text-[11px]">১. ভিডিও দেখা:</span>
              <strong className="text-white font-mono text-sm block mt-0.5">
                {formData.watchDurationSeconds}s ওয়াচ ➔ +{formData.pointsPerVideoWatch} কয়েন
              </strong>
            </div>

            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800/80">
              <span className="text-slate-400 block text-[11px]">২. লিংক আপলোড:</span>
              <strong className="text-white font-mono text-sm block mt-0.5">
                ১টি আপলোড ➔ +{formData.pointsPerVideoUpload} কয়েন
              </strong>
            </div>

            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800/80">
              <span className="text-slate-400 block text-[11px]">৩. সাইট ভিজিট:</span>
              <strong className="text-white font-mono text-sm block mt-0.5">
                ১টি ভিজিট ➔ +{formData.pointsPerWebsiteVisit} কয়েন
              </strong>
            </div>

            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800/80">
              <span className="text-slate-400 block text-[11px]">৪. রূপান্তর ও উত্তোলন:</span>
              <strong className="text-white font-mono text-sm block mt-0.5">
                {formData.pointsPerBdt} কয়েন = ৳১ | মিনিমাম ৳{formData.minWithdrawBdt}
              </strong>
            </div>
          </div>
        </div>

        {/* 4. Action Save Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="w-full bg-gradient-to-r from-amber-600 via-indigo-600 to-purple-600 hover:from-amber-500 hover:to-purple-500 text-white font-bold py-3.5 px-6 rounded-2xl shadow-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
          >
            {isSaving ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>ক্লাউড ও সার্ভারে সেভ হচ্ছে...</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>পয়েন্ট ও রিওয়ার্ড সেটিংস সেভ করুন (Save Reward Settings)</span>
              </>
            )}
          </button>
        </div>

      </form>

      {/* 5. YouTube Data API v3 Configuration Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30 shrink-0">
              <Youtube className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  ইউটিউব ডাটা এপিআই ৩ কনফিগারেশন (YouTube Data API v3 Settings)
                </h3>
                {apiKeyInput.trim() ? (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                    API কী সক্রিয়
                  </span>
                ) : (
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-medium">
                    oEmbed ফলব্যাক মোড
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                ইউটিউব ভিডিও বা Shorts লিংক জমা দিলে স্বয়ংক্রিয়ভাবে আসল শিরোনাম (Title), হাই-কোয়ালিটি থাম্বনেইল এবং সঠিক সময়সীমা (Duration) সংগ্রহের জন্য।
              </p>
            </div>
          </div>
        </div>

        {/* Input & Action controls */}
        <div className="space-y-4 relative z-10">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-rose-400" />
                <span>YouTube Data API Key (Google Cloud Console):</span>
              </span>
              <a 
                href="https://console.cloud.google.com/apis/credentials" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 underline font-normal"
              >
                <span>ফ্রি এপিআই কী তৈরি করুন</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </label>

            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="যেমন: AIzaSyD..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-mono text-white focus:outline-none focus:border-rose-500 transition pr-24"
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                  title={showApiKey ? "কী লুকান" : "কী প্রদর্শন করুন"}
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Test Status feedback */}
          {testResult && (
            <div className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
              testResult.success 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}>
              {testResult.success ? <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />}
              <span className="leading-relaxed">{testResult.message}</span>
            </div>
          )}

          {/* Fallback & Safety Explanation */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>স্বয়ংক্রিয় ত্রুটি নিয়ন্ত্রণ ও ফলব্যাক মেকানিজম (Smart Fallback):</span>
            </div>
            <p>
              • <strong>কোটা শেষ বা ভুল কী হলে:</strong> কোনো সমস্যা ছাড়াই স্বয়ংক্রিয়ভাবে স্ট্যান্ডার্ড oEmbed পার্সার কার্যকর হবে, ফলে ভিডিও ফিড কখনো বন্ধ হবে না।
            </p>
            <p>
              • <strong>টাইমার সিঙ্ক:</strong> এপিআই কী সক্রিয় থাকলে ভিডিওর সঠিক সেকেন্ড হিসেব করে ওয়াচ অ্যান্ড আর্ন কাউন্টডাউন টাইমার নির্ধারিত হয়।
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleSaveKey}
              disabled={isSavingKey}
              className="w-full sm:w-auto bg-rose-600 hover:bg-rose-500 text-white font-semibold px-6 py-2.5 rounded-xl transition shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 text-xs"
            >
              {isSavingKey ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>সেভ হচ্ছে...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>এপিআই কী সেভ করুন (Save YouTube API Key)</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleTestKey}
              disabled={isTestingKey}
              className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-5 py-2.5 rounded-xl border border-slate-700 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 text-xs"
            >
              {isTestingKey ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-200 border-t-transparent rounded-full animate-spin" />
                  <span>কানেকশন টেস্ট চলছে...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>কানেকশন টেস্ট করুন (Test API Connection)</span>
                </>
              )}
            </button>
          </div>

        </div>
      </div>

    </div>
  );
}
