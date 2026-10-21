import React, { useState, useMemo } from 'react';
import { 
  User as UserIcon, 
  Tv, 
  Coins, 
  Clock, 
  History, 
  UserPlus, 
  UserCheck, 
  ArrowLeft, 
  Sparkles, 
  Share2, 
  ShieldCheck, 
  UploadCloud, 
  Play, 
  CheckCircle, 
  XCircle, 
  Wallet as WalletIcon,
  CreditCard,
  Send,
  Loader2,
  Calendar,
  Eye,
  ExternalLink,
  Gift,
  Users,
  ShieldAlert,
  Settings,
  Lock,
  LogOut,
  Bot,
  Smartphone
} from 'lucide-react';
import { UserWallet, WithdrawalRequest, PaymentMethod, RewardSettings, DEFAULT_REWARD_SETTINGS, pointsToBdt, bdtToPoints, POINTS_PER_BDT, MIN_WITHDRAW_BDT } from '../types/earning';
import { UserPresence } from '../types/userPresence';
import { UserActivity } from '../types/social';
import { AdSettings } from './AdRenderer';

interface Video {
  id: string;
  title: string;
  url: string;
  type: string;
  date: string;
  uploader?: string;
  uploaderId?: string;
  createdAt?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  durationFormatted?: string;
}

interface UserProfileViewProps {
  targetUserId: string;
  currentUserUid: string;
  targetUserPresence?: UserPresence;
  currentWallet: UserWallet;
  withdrawals: WithdrawalRequest[];
  activities: UserActivity[];
  allVideos: Video[];
  isLoggedIn: boolean;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  rewardSettings?: RewardSettings;
  adSettings: AdSettings;
  onFollowToggle: () => void;
  onBackToFeed: () => void;
  onOpenUploadModal: () => void;
  onPlayVideo: (video: Video) => void;
  onGoogleLogin?: () => void;
  onRequestWithdrawal: (data: { method: PaymentMethod; accountNumber: string; amountBdt: number }) => Promise<boolean>;
  onClaimAdReward?: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onOpenAdminGate?: () => void;
  onLogout?: () => void;
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({
  targetUserId,
  currentUserUid,
  targetUserPresence,
  currentWallet,
  withdrawals,
  activities,
  allVideos,
  isLoggedIn,
  followersCount,
  followingCount,
  isFollowing,
  rewardSettings = DEFAULT_REWARD_SETTINGS,
  adSettings,
  onFollowToggle,
  onBackToFeed,
  onOpenUploadModal,
  onPlayVideo,
  onGoogleLogin,
  onRequestWithdrawal,
  onClaimAdReward,
  showToast,
  onOpenAdminGate,
  onLogout
}) => {
  const isOwnProfile = currentUserUid === targetUserId || currentWallet.userId === targetUserId;

  const [activeTab, setActiveTab] = useState<'videos' | 'wallet' | 'history'>('videos');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'watch' | 'withdraw' | 'bonus'>('all');

  // Withdrawal form states (for own profile)
  const currentRate = rewardSettings.pointsPerBdt && rewardSettings.pointsPerBdt > 0 
    ? rewardSettings.pointsPerBdt 
    : POINTS_PER_BDT;
  const currentMinWithdraw = rewardSettings.minWithdrawBdt && rewardSettings.minWithdrawBdt > 0 
    ? rewardSettings.minWithdrawBdt 
    : MIN_WITHDRAW_BDT;

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('bkash');
  const [accountNumber, setAccountNumber] = useState('');
  const [amountBdt, setAmountBdt] = useState<number>(currentMinWithdraw);
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');
  const [withdrawSuccess, setWithdrawSuccess] = useState('');

  const bdtBalance = pointsToBdt(currentWallet.points, currentRate);
  const requiredPoints = bdtToPoints(amountBdt, currentRate);
  const canWithdraw = currentWallet.points >= requiredPoints && amountBdt >= currentMinWithdraw;

  // Filter videos submitted by this user
  const userVideos = useMemo(() => {
    return allVideos.filter(v => {
      const matchId = v.uploaderId && v.uploaderId === targetUserId;
      const matchName = targetUserPresence?.userName && v.uploader && v.uploader.toLowerCase() === targetUserPresence.userName.toLowerCase();
      const matchOwn = isOwnProfile && currentWallet.userName && v.uploader && v.uploader.toLowerCase() === currentWallet.userName.toLowerCase();
      return matchId || matchName || matchOwn;
    });
  }, [allVideos, targetUserId, targetUserPresence, isOwnProfile, currentWallet.userName]);

  // Filter activities for this user
  const userActivities = useMemo(() => {
    return activities
      .filter(a => a.userId === targetUserId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [activities, targetUserId]);

  const filteredActivities = useMemo(() => {
    if (historyFilter === 'all') return userActivities;
    if (historyFilter === 'watch') return userActivities.filter(a => a.type === 'watch_earn');
    if (historyFilter === 'withdraw') return userActivities.filter(a => a.type === 'withdrawal');
    if (historyFilter === 'bonus') return userActivities.filter(a => a.type === 'upload_bonus' || a.type === 'ad_reward');
    return userActivities;
  }, [userActivities, historyFilter]);

  const profileName = isOwnProfile 
    ? (currentWallet.userName || targetUserPresence?.userName || 'ইউজার')
    : (targetUserPresence?.userName || 'ইউজার প্রোফাইল');

  const profileEmail = isOwnProfile
    ? (currentWallet.userEmail || targetUserPresence?.userEmail)
    : targetUserPresence?.userEmail;

  const profilePoints = isOwnProfile
    ? currentWallet.points
    : (targetUserPresence?.points || 0);

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError('');
    setWithdrawSuccess('');

    if (!accountNumber || accountNumber.trim().length < 11) {
      setWithdrawError('অনুগ্রহ করে সঠিক ১১ ডিজিটের মোবাইল একাউন্ট নম্বর লিখুন (যেমন: 017xxxxxxxx)');
      return;
    }

    if (amountBdt < currentMinWithdraw) {
      setWithdrawError(`সর্বনিম্ন উত্তোলনের পরিমাণ ৳${currentMinWithdraw} টাকা!`);
      return;
    }

    if (currentWallet.points < requiredPoints) {
      setWithdrawError(`আপনার পর্যাপ্ত ব্যালেন্স নেই! ৳${amountBdt} টাকার জন্য ${requiredPoints.toLocaleString()} কয়েন প্রয়োজন।`);
      return;
    }

    try {
      setIsSubmittingWithdraw(true);
      const success = await onRequestWithdrawal({
        method: selectedMethod,
        accountNumber: accountNumber.trim(),
        amountBdt: Number(amountBdt)
      });

      if (success) {
        setWithdrawSuccess(`অভিনন্দন! ৳${amountBdt} টাকা উত্তোলনের রিকোয়েস্ট সফলভাবে জমা হয়েছে।`);
        setAccountNumber('');
        setAmountBdt(currentMinWithdraw);
      }
    } catch (err: any) {
      setWithdrawError(err?.message || 'রিকোয়েস্ট পাঠাতে সমস্যা হয়েছে, আবার চেষ্টা করুন');
    } finally {
      setIsSubmittingWithdraw(false);
    }
  };

  const handleShareProfile = () => {
    if (navigator.share) {
      navigator.share({
        title: `${profileName} - RUHUL MIDIA প্রোফাইল`,
        text: `${profileName} এর আপলোডকৃত ভিডিও এবং আর্নিং প্রোফাইল দেখুন।`,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.href);
      showToast('প্রোফাইল লিংক কপি করা হয়েছে!', 'success');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12 max-w-5xl mx-auto">
      
      {/* 1. TOP NAV / BACK BUTTON */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToFeed}
          className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-md"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>ফিডে ফিরে যান (Back)</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleShareProfile}
            className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-md"
            title="প্রোফাইল শেয়ার করুন"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">শেয়ার</span>
          </button>
        </div>
      </div>

      {/* 2. PROFILE HERO CARD */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative">
        {/* Decorative Cover Gradient */}
        <div className="h-28 sm:h-36 bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-950 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:16px_16px]" />
          <div className="absolute top-3 right-4 bg-slate-950/70 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full text-[11px] text-slate-300 font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>RUHUL MIDIA কমিউনিটি প্রোফাইল</span>
          </div>
        </div>

        {/* Profile Info Row */}
        <div className="px-6 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 -mt-12 sm:-mt-14 mb-4">
            
            {/* Avatar & Main Info */}
            <div className="flex items-end gap-4">
              <div className="relative">
                <div className="w-22 h-22 sm:w-24 sm:h-24 rounded-3xl bg-slate-900 p-1 border-2 border-indigo-500 shadow-2xl shadow-indigo-600/30">
                  <div className="w-full h-full rounded-[20px] bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center font-black text-3xl text-white shadow-inner">
                    {profileName ? profileName.slice(0, 1).toUpperCase() : 'U'}
                  </div>
                </div>
                {targetUserPresence?.online && (
                  <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-900 shadow" title="অনলাইন" />
                )}
              </div>

              <div className="space-y-1 mb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                    {profileName}
                  </h1>
                  <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-indigo-400" />
                    <span>ভেরিফাইড মেম্বার</span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <p className="text-xs text-slate-400 font-mono">
                    {profileEmail || `ID: ${targetUserId.slice(-10)}`}
                  </p>
                  {targetUserId.startsWith('tg_') && (
                    <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Bot className="w-2.5 h-2.5 text-cyan-400" />
                      <span>Telegram Bot সিঙ্ক</span>
                    </span>
                  )}
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Smartphone className="w-2.5 h-2.5 text-emerald-400" />
                    <span>Android APK / WebView</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Profile Action Buttons */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto self-stretch sm:self-auto justify-end flex-wrap">
              {isOwnProfile ? (
                <>
                  <button
                    type="button"
                    onClick={onOpenUploadModal}
                    className="flex-1 sm:flex-initial bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/30 cursor-pointer active:scale-95 border border-indigo-400/30"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>ভিডিও যোগ করুন</span>
                  </button>

                  {!isLoggedIn && onGoogleLogin && (
                    <button
                      type="button"
                      onClick={onGoogleLogin}
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-3.5 py-2.5 rounded-xl transition cursor-pointer shadow-md"
                    >
                      Google লিঙ্ক
                    </button>
                  )}

                  {onOpenAdminGate && (
                    <button
                      type="button"
                      onClick={onOpenAdminGate}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs px-3.5 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow border border-slate-700"
                      title="এডমিন ও সিস্টেম সেটিংস"
                    >
                      <ShieldAlert className="w-4 h-4 text-indigo-400" />
                      <span>সেটিংস ও এডমিন</span>
                    </button>
                  )}

                  {isLoggedIn && onLogout && (
                    <button
                      type="button"
                      onClick={onLogout}
                      className="bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 font-semibold text-xs px-3.5 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow border border-slate-700/80 hover:border-rose-500/30"
                      title="অ্যাকাউন্ট থেকে লগআউট করুন"
                    >
                      <LogOut className="w-4 h-4 text-rose-400" />
                      <span>লগআউট</span>
                    </button>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={onFollowToggle}
                  className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95 ${
                    isFollowing
                      ? 'bg-slate-800 hover:bg-rose-600/20 text-indigo-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/30'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                  }`}
                >
                  {isFollowing ? (
                    <>
                      <UserCheck className="w-4 h-4" />
                      <span>ফলো করছেন (Following)</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>ফলো করুন (Follow)</span>
                    </>
                  )}
                </button>
              )}
            </div>

          </div>

          {/* Bio / Description */}
          <p className="text-xs text-slate-300 mt-2 max-w-2xl leading-relaxed">
            {isOwnProfile 
              ? 'RUHUL MIDIA এ সক্রিয় কনটেন্ট শেয়ারিং এবং ওয়াচ অ্যান্ড আর্ন কমিউনিটি সদস্য। ভিডিও দেখুন এবং বন্ধুদের সাথে শেয়ার করুন।'
              : `${profileName} এর পাবলিক প্রোফাইল। নিয়মিত নতুন ভিডিও লিংক আপডেট পেতে ফলো বাটনে ক্লিক করে রাখুন।`}
          </p>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-800/80">
            
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">আপলোডকৃত মিডিয়া</span>
              <div className="flex items-center justify-center gap-1.5">
                <Tv className="w-4 h-4 text-indigo-400" />
                <span className="text-lg font-black text-white font-mono">{userVideos.length}</span>
              </div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">ফলোয়ার্স</span>
              <div className="flex items-center justify-center gap-1.5">
                <Users className="w-4 h-4 text-indigo-400" />
                <span className="text-lg font-black text-white font-mono">{followersCount}</span>
              </div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">ফলোয়িং</span>
              <div className="flex items-center justify-center gap-1.5">
                <UserCheck className="w-4 h-4 text-indigo-400" />
                <span className="text-lg font-black text-white font-mono">{followingCount}</span>
              </div>
            </div>

            <div className="bg-slate-950/70 border border-amber-500/30 rounded-2xl p-3.5 text-center">
              <span className="text-[10px] text-amber-400 uppercase font-bold block mb-1">মোট অর্জিত কয়েন</span>
              <div className="flex items-center justify-center gap-1.5">
                <Coins className="w-4 h-4 text-amber-400" />
                <span className="text-lg font-black text-amber-300 font-mono">{profilePoints.toLocaleString()}</span>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* 3. PROFILE TABS NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-1 overflow-x-auto scrollbar-none">
        
        <button
          type="button"
          onClick={() => setActiveTab('videos')}
          className={`py-3 px-5 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'videos'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Tv className="w-4 h-4" />
          <span>আপলোডকৃত ভিডিও ({userVideos.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('wallet')}
          className={`py-3 px-5 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'wallet'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <WalletIcon className="w-4 h-4 text-amber-400" />
          <span>{isOwnProfile ? 'আয় ও ওয়ালেট' : 'আর্নিং স্ট্যাটস'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`py-3 px-5 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'history'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <History className="w-4 h-4 text-emerald-400" />
          <span>অ্যাক্টিভিটি হিস্ট্রি ({userActivities.length})</span>
        </button>

      </div>

      {/* 4. TAB CONTENT: VIDEOS */}
      {activeTab === 'videos' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Tv className="w-4 h-4 text-indigo-400" />
              <span>{profileName} এর শেয়ারকৃত মিডিয়া ও ভিডিওসমূহ</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">মোট {userVideos.length}টি ভিডিও</span>
          </div>

          {userVideos.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/60 border border-slate-800 rounded-3xl p-8 space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                <Tv className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-white">এখনো কোনো ভিডিও আপলোড করা হয়নি</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {isOwnProfile
                  ? 'আপনার পছন্দের যেকোনো ভিডিও বা ছবির লিংক যুক্ত করুন এবং তাৎক্ষণিক কয়েন বোনাস লাভ করুন।'
                  : 'এই মেম্বার এখনো কোনো মিডিয়া সাবমিট করেননি।'}
              </p>
              {isOwnProfile && (
                <button
                  type="button"
                  onClick={onOpenUploadModal}
                  className="mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-lg shadow-indigo-600/30 cursor-pointer"
                >
                  প্রথম ভিডিও আপলোড করুন
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {userVideos.map((video) => (
                <div 
                  key={video.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-indigo-500/50 transition group flex flex-col justify-between shadow-xl"
                >
                  {/* Thumbnail & Play button */}
                  <div className="relative aspect-video bg-black overflow-hidden">
                    <img 
                      src={video.thumbnailUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80'} 
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-80"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
                    <span className="absolute top-2.5 left-2.5 text-[10px] font-bold uppercase tracking-wider bg-indigo-600/90 text-white px-2 py-0.5 rounded shadow">
                      {video.type}
                    </span>
                    {video.durationFormatted && (
                      <span className="absolute bottom-2.5 right-2.5 text-[10px] font-mono bg-black/80 text-white px-1.5 py-0.5 rounded border border-white/10">
                        {video.durationFormatted}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => onPlayVideo(video)}
                      className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 cursor-pointer"
                      title="ভিডিও প্লে করুন"
                    >
                      <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/50 transform scale-90 group-hover:scale-100 transition">
                        <Play className="w-5 h-5 fill-white ml-0.5" />
                      </div>
                    </button>
                  </div>

                  {/* Info */}
                  <div className="p-4 flex flex-col justify-between flex-1 space-y-3">
                    <h4 
                      onClick={() => onPlayVideo(video)}
                      className="text-xs sm:text-sm font-bold text-white line-clamp-2 leading-snug hover:text-indigo-400 transition cursor-pointer"
                    >
                      {video.title}
                    </h4>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2.5">
                      <span className="text-indigo-400 font-medium truncate max-w-[120px]">
                        {video.uploader || profileName}
                      </span>
                      <span className="font-mono text-slate-500">{video.date}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. TAB CONTENT: WALLET & EARNINGS */}
      {activeTab === 'wallet' && (
        <div className="space-y-6">
          
          {/* Key Metric cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-5 shadow-lg">
              <span className="text-xs font-semibold text-slate-400 uppercase block mb-2">বর্তমান কয়েন ব্যালেন্স</span>
              <h3 className="text-3xl font-black text-amber-400 font-mono">
                {currentWallet.points.toLocaleString()}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">ওয়াচ অ্যান্ড আর্ন অর্জিত কয়েন</p>
            </div>

            <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-5 shadow-lg">
              <span className="text-xs font-semibold text-slate-400 uppercase block mb-2">টাকায় সমমূল্য ব্যালেন্স</span>
              <h3 className="text-3xl font-black text-emerald-400 font-mono">
                ৳ {bdtBalance.toFixed(2)}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">বিকাশ/নগদে উত্তোলনযোগ্য</p>
            </div>

            <div className="bg-slate-900/90 border border-indigo-500/30 rounded-2xl p-5 shadow-lg">
              <span className="text-xs font-semibold text-slate-400 uppercase block mb-2">সর্বমোট আয় (Total Earned)</span>
              <h3 className="text-3xl font-black text-indigo-400 font-mono">
                {currentWallet.totalEarned.toLocaleString()}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">ভিডিও, আপলোড ও টাস্ক থেকে</p>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <span className="text-xs font-semibold text-slate-400 uppercase block mb-2">উত্তোলিত মোট অর্থ</span>
              <h3 className="text-3xl font-black text-slate-200 font-mono">
                ৳ {(currentWallet.totalWithdrawn || 0).toLocaleString()}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">সফলভাবে ক্যাশআউট সম্পন্ন</p>
            </div>

          </div>

          {/* If own profile: Withdrawal Form & History */}
          {isOwnProfile && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Form (7 cols) */}
              <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
                <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-indigo-400" />
                    <h3 className="font-bold text-base text-white">টাকা উত্তোলন ফরম (Cashout)</h3>
                  </div>
                  <span className="text-xs bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                    মিনিমাম ৳{currentMinWithdraw}
                  </span>
                </div>

                {withdrawSuccess && (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-3.5 rounded-2xl text-xs flex items-center gap-2 font-medium">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{withdrawSuccess}</span>
                  </div>
                )}

                {withdrawError && (
                  <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3.5 rounded-2xl text-xs flex items-center gap-2 font-medium">
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{withdrawError}</span>
                  </div>
                )}

                <form onSubmit={handleWithdrawSubmit} className="space-y-4">
                  {/* Payment Method Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">পেমেন্ট মেথড নির্বাচন করুন</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(['bkash', 'nagad', 'rocket', 'recharge'] as PaymentMethod[]).map((method) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setSelectedMethod(method)}
                          className={`py-2 px-3 rounded-xl border text-xs font-bold uppercase transition flex items-center justify-center gap-1.5 cursor-pointer ${
                            selectedMethod === method
                              ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                              : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <span>{method}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Account Number */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      {selectedMethod.toUpperCase()} পার্সোনাল নম্বর (১১ ডিজিট)
                    </label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="017xxxxxxxx"
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>

                  {/* Amount BDT */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs font-semibold text-slate-300">উত্তোলনের পরিমাণ (টাকা)</label>
                      <span className="text-[11px] text-amber-400 font-mono font-medium">
                        প্রয়োজনীয় কয়েন: {requiredPoints.toLocaleString()}
                      </span>
                    </div>
                    <input
                      type="number"
                      min={currentMinWithdraw}
                      step={5}
                      value={amountBdt}
                      onChange={(e) => setAmountBdt(Math.max(currentMinWithdraw, parseInt(e.target.value) || currentMinWithdraw))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingWithdraw || !canWithdraw}
                    className={`w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
                      canWithdraw
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/30'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    }`}
                  >
                    {isSubmittingWithdraw ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>প্রক্রিয়াধীন রয়েছে...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>
                          {currentWallet.points < requiredPoints
                            ? `আরও ${(requiredPoints - currentWallet.points).toLocaleString()} কয়েন প্রয়োজন`
                            : `৳${amountBdt} টাকা উত্তোলনের জন্য আবেদন করুন`}
                        </span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Withdraw History (5 cols) */}
              <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-400" />
                    <h3 className="font-bold text-sm text-white">উত্তোলনের রেকর্ড ({withdrawals.length})</h3>
                  </div>
                </div>

                {withdrawals.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 space-y-2">
                    <CreditCard className="w-8 h-8 mx-auto text-slate-600" />
                    <p className="text-xs">এখনো কোনো উত্তোলন রেকর্ড নেই।</p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                    {withdrawals.map((w) => (
                      <div key={w.id} className="bg-slate-950 border border-slate-800/90 rounded-2xl p-3 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white font-mono">৳{w.amountBdt}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            w.status === 'approved' ? 'bg-emerald-500/20 text-emerald-300' :
                            w.status === 'rejected' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                          }`}>
                            {w.status === 'approved' ? 'পেইড' : w.status === 'rejected' ? 'বাতিল' : 'অপেক্ষমাণ'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                          <span>{w.method} - {w.accountNumber}</span>
                          <span>{w.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      )}

      {/* 6. TAB CONTENT: ACTIVITY & EARNINGS HISTORY (Task 4) */}
      {activeTab === 'history' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-400" />
                <span>অ্যাক্টিভিটি ও কয়েন আর্নিং হিস্ট্রি</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                ভিডিও দেখা, রিওয়ার্ড অর্জন, উত্তোলন এবং সোশ্যাল কার্যক্রমের বিস্তারিত টাইমলাইন
              </p>
            </div>

            {/* Filter Badges */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <button
                type="button"
                onClick={() => setHistoryFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  historyFilter === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                }`}
              >
                সব কার্যক্রম
              </button>
              <button
                type="button"
                onClick={() => setHistoryFilter('watch')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  historyFilter === 'watch'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                }`}
              >
                ভিডিও দেখা
              </button>
              <button
                type="button"
                onClick={() => setHistoryFilter('withdraw')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  historyFilter === 'withdraw'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                }`}
              >
                উত্তোলন
              </button>
              <button
                type="button"
                onClick={() => setHistoryFilter('bonus')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  historyFilter === 'bonus'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                }`}
              >
                বোনাস ও টাস্ক
              </button>
            </div>
          </div>

          {filteredActivities.length === 0 ? (
            <div className="text-center py-16 text-slate-500 space-y-2">
              <Clock className="w-10 h-10 mx-auto text-slate-600" />
              <h4 className="text-sm font-bold text-white">এখনো কোনো অ্যাক্টিভিটি নেই</h4>
              <p className="text-xs text-slate-400">
                ভিডিও দেখুন এবং কয়েন জমিয়ে আপনার প্রথম অ্যাক্টিভিটি রেকর্ড তৈরি করুন।
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredActivities.map((act) => (
                <div
                  key={act.id}
                  className="bg-slate-950 border border-slate-800/90 hover:border-slate-700 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition shadow"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
                      act.type === 'watch_earn' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      act.type === 'upload_bonus' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' :
                      act.type === 'withdrawal' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                      act.type === 'follow' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                      'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}>
                      {act.type === 'watch_earn' && <Coins className="w-5 h-5" />}
                      {act.type === 'upload_bonus' && <UploadCloud className="w-5 h-5" />}
                      {act.type === 'withdrawal' && <CreditCard className="w-5 h-5" />}
                      {act.type === 'follow' && <UserPlus className="w-5 h-5" />}
                      {act.type === 'ad_reward' && <Gift className="w-5 h-5" />}
                      {act.type === 'register' && <ShieldCheck className="w-5 h-5" />}
                    </div>

                    <div className="space-y-0.5">
                      <h4 className="font-bold text-xs sm:text-sm text-white">
                        {act.title}
                      </h4>
                      {act.details && (
                        <p className="text-xs text-slate-400 line-clamp-1">
                          {act.details}
                        </p>
                      )}
                      <span className="text-[10px] text-slate-500 font-mono block">
                        {new Date(act.timestamp).toLocaleString('bn-BD')}
                      </span>
                    </div>
                  </div>

                  {/* Points / Amount Badge */}
                  <div className="self-end sm:self-center shrink-0">
                    {typeof act.points === 'number' && act.points > 0 && (
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-bold text-xs px-3 py-1 rounded-xl flex items-center gap-1 shadow-sm">
                        +{act.points} কয়েন
                      </span>
                    )}
                    {typeof act.points === 'number' && act.points < 0 && (
                      <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono font-bold text-xs px-3 py-1 rounded-xl flex items-center gap-1 shadow-sm">
                        {act.points} কয়েন
                      </span>
                    )}
                    {typeof act.amountBdt === 'number' && (
                      <span className="bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono font-bold text-xs px-3 py-1 rounded-xl flex items-center gap-1 shadow-sm">
                        ৳{act.amountBdt} টাকা
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}

    </div>
  );
};

export default UserProfileView;
