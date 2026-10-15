import React, { useState } from 'react';
import { 
  Coins, 
  Wallet as WalletIcon, 
  ArrowUpRight, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Tv, 
  Sparkles, 
  ExternalLink, 
  Smartphone, 
  CreditCard, 
  RefreshCw, 
  User as UserIcon,
  HelpCircle,
  TrendingUp,
  ShieldCheck,
  Send,
  Loader2,
  UploadCloud
} from 'lucide-react';
import { 
  UserWallet, 
  WithdrawalRequest, 
  PaymentMethod, 
  RewardSettings,
  DEFAULT_REWARD_SETTINGS,
  pointsToBdt, 
  bdtToPoints, 
  POINTS_PER_BDT, 
  MIN_WITHDRAW_BDT, 
  POINTS_PER_VIDEO,
  POINTS_PER_AD
} from '../types/earning';
import { AdSettings } from './AdRenderer';

interface WalletViewProps {
  wallet: UserWallet;
  withdrawals: WithdrawalRequest[];
  adSettings: AdSettings;
  rewardSettings?: RewardSettings;
  onNavigateToVideos: () => void;
  onRequestWithdrawal: (data: { method: PaymentMethod; accountNumber: string; amountBdt: number }) => Promise<boolean>;
  onClaimAdReward?: () => void;
  onOpenUploadModal?: () => void;
  onGoogleLogin?: () => void;
  isLoggedInGoogle?: boolean;
}

export default function WalletView({
  wallet,
  withdrawals,
  adSettings,
  rewardSettings = DEFAULT_REWARD_SETTINGS,
  onNavigateToVideos,
  onRequestWithdrawal,
  onClaimAdReward,
  onOpenUploadModal,
  onGoogleLogin,
  isLoggedInGoogle
}: WalletViewProps) {
  const currentRate = rewardSettings.pointsPerBdt && rewardSettings.pointsPerBdt > 0 
    ? rewardSettings.pointsPerBdt 
    : POINTS_PER_BDT;
  const currentMinWithdraw = rewardSettings.minWithdrawBdt && rewardSettings.minWithdrawBdt > 0 
    ? rewardSettings.minWithdrawBdt 
    : MIN_WITHDRAW_BDT;

  // Form states
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('bkash');
  const [accountNumber, setAccountNumber] = useState('');
  const [amountBdt, setAmountBdt] = useState<number>(currentMinWithdraw);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isAdRewardClaiming, setIsAdRewardClaiming] = useState(false);

  const bdtBalance = pointsToBdt(wallet.points, currentRate);
  const requiredPoints = bdtToPoints(amountBdt, currentRate);
  const canWithdraw = wallet.points >= requiredPoints && amountBdt >= currentMinWithdraw;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!accountNumber || accountNumber.trim().length < 11) {
      setErrorMsg('অনুগ্রহ করে সঠিক ১১ ডিজিটের মোবাইল/একাউন্ট নম্বর লিখুন (যেমন: 017xxxxxxxx)');
      return;
    }

    if (amountBdt < currentMinWithdraw) {
      setErrorMsg(`সর্বনিম্ন উত্তোলনের পরিমাণ ৳${currentMinWithdraw} টাকা!`);
      return;
    }

    if (wallet.points < requiredPoints) {
      setErrorMsg(`আপনার পর্যাপ্ত ব্যালেন্স নেই! ৳${amountBdt} টাকার জন্য ${requiredPoints.toLocaleString()} কয়েন প্রয়োজন।`);
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = await onRequestWithdrawal({
        method: selectedMethod,
        accountNumber: accountNumber.trim(),
        amountBdt
      });

      if (ok) {
        setSuccessMsg(`আপনার ৳${amountBdt} টাকার উত্তোলন রিকোয়েস্ট সফলভাবে জমা হয়েছে! এডমিন যাচাই করে পেমেন্ট পাঠিয়ে দেবেন।`);
        setAccountNumber('');
        setAmountBdt(currentMinWithdraw);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'উইথড্র রিকোয়েস্ট জমা দিতে সমস্যা হয়েছে');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClaimAdClick = () => {
    if (isAdRewardClaiming) return;
    setIsAdRewardClaiming(true);

    // If admin has top ad url or popunder url, open it
    const targetUrl = adSettings.topAdCode || adSettings.socialBarAdCode || 'https://google.com';
    try {
      if (targetUrl.startsWith('http')) {
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
      }
    } catch {}

    setTimeout(() => {
      if (onClaimAdReward) {
        onClaimAdReward();
      }
      setIsAdRewardClaiming(false);
    }, 1500);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn">
      
      {/* 1. Header Banner & Profile Strip */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 p-0.5 shadow-xl shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
                <Coins className="w-8 h-8 text-amber-400 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                  ওয়ালেট ও আয় (Wallet & Earnings)
                </h1>
                <span className="text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  ইনকাম সচল
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                ভিডিও দেখে এবং টাস্ক সম্পন্ন করে কয়েন আয় করুন এবং বিকাশ/নগদে উত্তোলন করুন।
              </p>
            </div>
          </div>

          {/* User ID / Account Status */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 flex items-center gap-3 w-full md:w-auto shrink-0 shadow-inner">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300">
              <UserIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate max-w-[180px]">
                {wallet.userName || 'ইউজার'}
              </p>
              <p className="text-[10px] text-slate-400 font-mono truncate max-w-[180px]">
                {isLoggedInGoogle ? wallet.userEmail : `ID: ${wallet.userId.slice(-8)}`}
              </p>
            </div>

            {!isLoggedInGoogle && onGoogleLogin && (
              <button
                type="button"
                onClick={onGoogleLogin}
                className="ml-auto text-[11px] bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0 shadow"
              >
                Google লিঙ্ক
              </button>
            )}
          </div>
        </div>

        {/* Conversion Rate Notice */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-indigo-400" />
            <span>পয়েন্ট রূপান্তর হার: <strong className="text-amber-300 font-mono">{currentRate} পয়েন্ট = ৳১.০০ টাকা</strong> ({currentRate} Coins = 1 BDT)</span>
          </div>
          <div className="flex items-center gap-2 text-emerald-400 font-medium">
            <ShieldCheck className="w-4 h-4" />
            <span>সর্বনিম্ন উত্তোলন: ৳{currentMinWithdraw} টাকা ({currentMinWithdraw * currentRate} পয়েন্ট)</span>
          </div>
        </div>
      </div>

      {/* 2. Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Coins Balance */}
        <div className="bg-slate-900/80 border border-amber-500/30 hover:border-amber-500/60 transition-all rounded-2xl p-5 shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">বর্তমান পয়েন্ট</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h2 className="text-3xl font-black text-amber-400 font-mono tracking-tight">
              {wallet.points.toLocaleString()}
            </h2>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>রিডিম করার যোগ্য পয়েন্ট</span>
            </p>
          </div>
        </div>

        {/* Card 2: BDT Equivalent Balance */}
        <div className="bg-slate-900/80 border border-emerald-500/30 hover:border-emerald-500/60 transition-all rounded-2xl p-5 shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">টাকায় ব্যালেন্স</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <WalletIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h2 className="text-3xl font-black text-emerald-400 font-mono tracking-tight">
              ৳ {bdtBalance.toFixed(2)}
            </h2>
            <p className="text-[11px] text-slate-400 mt-1">
              উত্তোলনযোগ্য সমমূল্য অর্থ (BDT)
            </p>
          </div>
        </div>

        {/* Card 3: Total Videos Watched */}
        <div className="bg-slate-900/80 border border-slate-800 hover:border-indigo-500/40 transition-all rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">দেখা ভিডিও</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Tv className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h2 className="text-3xl font-black text-white font-mono tracking-tight">
              {wallet.videosWatchedCount || 0}
            </h2>
            <p className="text-[11px] text-slate-400 mt-1">
              ভিডিও দেখে অর্জিত পয়েন্ট
            </p>
          </div>
        </div>

        {/* Card 4: Total Withdrawn */}
        <div className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">মোট উত্তোলিত</span>
            <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h2 className="text-3xl font-black text-slate-200 font-mono tracking-tight">
              ৳ {(wallet.totalWithdrawn || 0).toLocaleString()}
            </h2>
            <p className="text-[11px] text-slate-400 mt-1">
              সফলভাবে উত্তোলন করা টাকা
            </p>
          </div>
        </div>

      </div>

      {/* 3. Earn More Points Tasks Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              পয়েন্ট অর্জনের সুযোগ (Ways to Earn Points)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">সহজ কাজগুলো সম্পন্ন করে দ্রুত ওয়ালেট ব্যালেন্স বাড়ান</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Task 1: Watch Videos */}
          <div className="bg-slate-950/70 border border-slate-800 hover:border-indigo-500/50 p-4 rounded-2xl flex flex-col justify-between gap-4 transition group">
            <div className="flex items-start gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 group-hover:scale-105 transition-transform">
                <Tv className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-sm text-white">ভিডিও দেখুন</h4>
                  <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                    +{rewardSettings.pointsPerVideoWatch} কয়েন
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  ফিডের যেকোনো ভিডিও {rewardSettings.watchDurationSeconds} সেকেন্ড দেখলেই স্বয়ংক্রিয়ভাবে কয়েন পাবেন।
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onNavigateToVideos}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow mt-auto"
            >
              <span>ভিডিও দেখুন</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Task 2: Upload Video/Media Link */}
          <div className="bg-slate-950/70 border border-slate-800 hover:border-emerald-500/50 p-4 rounded-2xl flex flex-col justify-between gap-4 transition group">
            <div className="flex items-start gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-sm text-white">ভিডিও লিংক শেয়ার করুন</h4>
                  <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    +{rewardSettings.pointsPerVideoUpload} কয়েন
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  ইউটিউব, টিকটক বা যেকোনো ভিডিও লিংক শেয়ার করলেই সাথে সাথে বোনাস পাবেন।
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenUploadModal || onNavigateToVideos}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow mt-auto"
            >
              <span>লিংক যোগ করুন</span>
              <UploadCloud className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Task 3: Sponsor Ad / Website Visit Task */}
          <div className="bg-slate-950/70 border border-slate-800 hover:border-amber-500/50 p-4 rounded-2xl flex flex-col justify-between gap-4 transition group">
            <div className="flex items-start gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-sm text-white">স্পন্সর অফার ভিজিট</h4>
                  <span className="text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full">
                    +{rewardSettings.pointsPerWebsiteVisit} কয়েন
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  স্পন্সর বিজ্ঞাপনে ক্লিক করে নতুন ট্যাবে সাইট ভিজিট করলেই রিওয়ার্ড কয়েন পাবেন।
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClaimAdClick}
              disabled={isAdRewardClaiming}
              className="w-full bg-amber-600 hover:bg-amber-500 disabled:bg-amber-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow mt-auto"
            >
              {isAdRewardClaiming ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>যাচাই হচ্ছে...</span>
                </>
              ) : (
                <>
                  <span>ভিজিট ও আর্ন</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

        </div>
      </div>

      {/* 4. Withdrawal Section: Request Form & History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* WITHDRAWAL FORM (Left 7 Cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-lg text-white">টাকা উত্তোলন ফরম (Withdraw Request)</h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              আপনার অর্জিত পয়েন্ট টাকায় কনভার্ট করে বিকাশ, নগদ বা রিচার্জে নিন
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 bg-rose-950/80 border border-rose-500/40 text-rose-300 rounded-xl text-xs flex items-center gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Step 1: Payment Method */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                ১. পেমেন্ট মেথড নির্বাচন করুন
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { id: 'bkash', name: 'বিকাশ (bKash)', icon: '📱', color: 'border-pink-500/50 bg-pink-950/20 text-pink-300' },
                  { id: 'nagad', name: 'নগদ (Nagad)', icon: '🟠', color: 'border-orange-500/50 bg-orange-950/20 text-orange-300' },
                  { id: 'rocket', name: 'রকেট (Rocket)', icon: '🟣', color: 'border-purple-500/50 bg-purple-950/20 text-purple-300' },
                  { id: 'recharge', name: 'মোবাইল রিচার্জ', icon: '📶', color: 'border-cyan-500/50 bg-cyan-950/20 text-cyan-300' }
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedMethod(item.id as PaymentMethod)}
                    className={`py-3 px-3 rounded-2xl text-xs font-bold border transition flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                      selectedMethod === item.id 
                        ? `bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-600/30 scale-102` 
                        : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-[11px] whitespace-nowrap">{item.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Account Number */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                ২. {selectedMethod === 'recharge' ? 'রিচার্জের মোবাইল নম্বর' : `${selectedMethod.toUpperCase()} একাউন্ট নম্বর`}
              </label>
              <div className="relative">
                <Smartphone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="017XXXXXXXX বা 018XXXXXXXX"
                  maxLength={15}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm font-mono focus:outline-none focus:border-indigo-500 text-slate-100 placeholder-slate-600"
                />
              </div>
            </div>

            {/* Step 3: Amount Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  ৩. উত্তোলনের পরিমাণ (টাকা / BDT)
                </label>
                <span className="text-xs font-mono text-amber-400">
                  কাটা হবে: <strong>{requiredPoints.toLocaleString()}</strong> পয়েন্ট
                </span>
              </div>

              {/* Amount Presets */}
              <div className="grid grid-cols-5 gap-2">
                {[20, 50, 100, 200, 500].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAmountBdt(amt)}
                    className={`py-2 px-1 rounded-xl text-xs font-mono font-bold transition border cursor-pointer ${
                      amountBdt === amt
                        ? 'bg-emerald-600 text-white border-emerald-400 shadow'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    ৳{amt}
                  </button>
                ))}
              </div>

              <div className="mt-2">
                <input
                  type="number"
                  min={MIN_WITHDRAW_BDT}
                  step={5}
                  value={amountBdt}
                  onChange={(e) => setAmountBdt(Math.max(1, parseInt(e.target.value) || 0))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm font-mono focus:outline-none focus:border-indigo-500 text-slate-100"
                />
              </div>
            </div>

            {/* Calculation summary pill */}
            <div className="bg-slate-950/90 border border-slate-800/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-slate-400">উত্তোলনের সারাংশ: </span>
                <span className="font-bold text-white">৳{amountBdt} টাকা ({selectedMethod.toUpperCase()})</span>
              </div>
              <div>
                <span className="text-slate-400">প্রয়োজনীয় কয়েন: </span>
                <span className={`font-mono font-bold ${wallet.points >= requiredPoints ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {requiredPoints.toLocaleString()} / {wallet.points.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting || !canWithdraw}
              className={`w-full py-3.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
                canWithdraw
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/30'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>প্রক্রিয়াধীন রয়েছে...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>
                    {wallet.points < requiredPoints 
                      ? `আরও ${(requiredPoints - wallet.points).toLocaleString()} পয়েন্ট প্রয়োজন`
                      : `৳${amountBdt} টাকা উত্তোলনের জন্য আবেদন করুন`}
                  </span>
                </>
              )}
            </button>

            <p className="text-[11px] text-slate-500 text-center">
              * রিকোয়েস্ট যাচাইয়ের পর অ্যাডমিন বিকাশ/নগদ নাম্বারে টাকা পাঠিয়ে দেবেন এবং স্ট্যাটাস অনুমোদিত হবে।
            </p>
          </form>
        </div>

        {/* WITHDRAWAL HISTORY (Right 5 Cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                <h3 className="font-bold text-base text-white">উত্তোলনের ইতিহাস (History)</h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {withdrawals.length}টি রিকোয়েস্ট
              </span>
            </div>

            {withdrawals.length === 0 ? (
              <div className="text-center py-12 text-slate-500 space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center mx-auto text-slate-600">
                  <CreditCard className="w-6 h-6" />
                </div>
                <p className="text-xs">এখনো কোনো উত্তোলন রিকোয়েস্ট করেননি।</p>
                <p className="text-[11px] text-slate-600">পয়েন্ট জমিয়ে বামপাশের ফরম থেকে উইথড্র করুন।</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                {withdrawals.map((item) => (
                  <div
                    key={item.id}
                    className="bg-slate-950 border border-slate-800/90 rounded-2xl p-3.5 space-y-2 hover:border-slate-700 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white font-mono">৳{item.amountBdt}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-800 px-2 py-0.5 rounded text-indigo-300">
                          {item.method}
                        </span>
                      </div>

                      {/* Status badge */}
                      {item.status === 'pending' && (
                        <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          অপেক্ষমাণ
                        </span>
                      )}
                      {item.status === 'approved' && (
                        <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          পেইড / সম্পন্ন
                        </span>
                      )}
                      {item.status === 'rejected' && (
                        <span className="text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          বাতিল
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>নম্বর: {item.accountNumber}</span>
                      <span>{item.date}</span>
                    </div>

                    {item.note && (
                      <p className="text-[10px] text-slate-400 italic bg-slate-900/60 p-1.5 rounded">
                        এডমিন নোট: {item.note}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>পেমেন্ট নিশ্চিতকরণ:</span>
            <span className="text-emerald-400 font-medium">প্রতিদিন রাত ৯টা</span>
          </div>
        </div>

      </div>

    </div>
  );
}
