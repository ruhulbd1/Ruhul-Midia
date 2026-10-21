import React, { useState } from 'react';
import { 
  Bell, 
  Sparkles, 
  Gift, 
  Coins, 
  UserCheck, 
  CreditCard, 
  ShieldCheck, 
  Trash2, 
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Info
} from 'lucide-react';
import { AppNotification } from '../types/social';

interface NotificationsViewProps {
  notifications: AppNotification[];
  onClearAll: () => void;
  onMarkAsRead?: (id: string) => void;
  onBackToFeed: () => void;
  onGoogleLogin?: () => void;
  isLoggedIn?: boolean;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  notifications,
  onClearAll,
  onMarkAsRead,
  onBackToFeed,
  onGoogleLogin,
  isLoggedIn = false
}) => {
  const [filter, setFilter] = useState<'all' | 'reward' | 'system' | 'follow'>('all');

  const filtered = notifications.filter(n => {
    if (filter === 'all') return true;
    return n.type === filter;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'reward':
        return <Coins className="w-5 h-5 text-amber-400" />;
      case 'follow':
        return <UserCheck className="w-5 h-5 text-indigo-400" />;
      case 'withdrawal':
        return <CreditCard className="w-5 h-5 text-emerald-400" />;
      case 'system':
      default:
        return <Sparkles className="w-5 h-5 text-purple-400" />;
    }
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'reward':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'follow':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
      case 'withdrawal':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'system':
      default:
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      {/* Top Header Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={onBackToFeed}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              title="ফিডে ফিরে যান"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Bell className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                বিজ্ঞপ্তি ও নোটিফিকেশন
                {notifications.length > 0 && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                    {notifications.length}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                রিওয়ার্ড, ফলোয়ার্স এবং প্ল্যাটফর্ম আপডেটসমূহ
              </p>
            </div>
          </div>

          {notifications.length > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 text-xs font-semibold transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">সকল পরিষ্কার করুন</span>
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 mt-6 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
              filter === 'all'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-700/60'
            }`}
          >
            সকল ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('reward')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
              filter === 'reward'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-700/60'
            }`}
          >
            রিওয়ার্ড ও আয়
          </button>
          <button
            type="button"
            onClick={() => setFilter('follow')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
              filter === 'follow'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-700/60'
            }`}
          >
            সোশ্যাল / ফলো
          </button>
          <button
            type="button"
            onClick={() => setFilter('system')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
              filter === 'system'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-700/60'
            }`}
          >
            সিস্টেম নোটিশ
          </button>
        </div>
      </div>

      {/* Guest Warning if not logged in */}
      {!isLoggedIn && (
        <div className="bg-amber-950/40 border border-amber-500/40 rounded-2xl p-4 flex items-center justify-between gap-3 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <Info className="w-5 h-5 text-amber-400 shrink-0" />
            <p className="text-xs text-amber-200">
              আপনার বিজ্ঞপ্তি এবং প্রোফাইল হিস্ট্রি সুরক্ষিত রাখতে Google লিংক করুন।
            </p>
          </div>
          {onGoogleLogin && (
            <button
              type="button"
              onClick={onGoogleLogin}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition cursor-pointer shrink-0 shadow-md"
            >
              Google লিংক
            </button>
          )}
        </div>
      )}

      {/* Notifications List */}
      {filtered.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-white">কোনো নতুন বিজ্ঞপ্তি নেই</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            ভিডিও দেখলে কয়েন অর্জন ও ফলোয়ার সংক্রান্ত সকল আপডেট এখানে দেখতে পাবেন।
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => onMarkAsRead?.(item.id)}
              className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 flex items-start gap-3.5 cursor-pointer hover:border-slate-700 ${
                item.read 
                  ? 'bg-slate-900/40 border-slate-800/80 opacity-80' 
                  : 'bg-slate-900/90 border-slate-700 shadow-lg'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                {getIcon(item.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-white truncate">{item.title}</h4>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${getBadgeColor(item.type)}`}>
                      {item.type}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono shrink-0">
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{item.message}</p>
              </div>

              {!item.read && (
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0 self-center animate-pulse" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsView;
