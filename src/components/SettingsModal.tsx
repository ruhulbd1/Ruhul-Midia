import React from 'react';
import { 
  X, 
  Settings, 
  Plus, 
  ImageIcon, 
  Coins, 
  ShieldAlert, 
  Tv, 
  Maximize2, 
  Minimize2, 
  Globe, 
  LogOut, 
  User as UserIcon, 
  CheckCircle,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { type User } from 'firebase/auth';
import { type UserWallet } from '../types/earning';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  wallet: UserWallet;
  isAdmin: boolean;
  adminToken: string | null;
  activeView: 'user' | 'wallet' | 'admin-login' | 'admin-dashboard';
  isBrowserFullscreen: boolean;
  toggleFullscreen: () => void;
  onOpenUpload: (type: 'video' | 'image') => void;
  onOpenWallet: () => void;
  onOpenAdmin: () => void;
  onGoogleLogin: () => void;
  onLogout: () => void;
  onNavigateToProfile: () => void;
  isSubmittingLogin?: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  wallet,
  isAdmin,
  adminToken,
  activeView,
  isBrowserFullscreen,
  toggleFullscreen,
  onOpenUpload,
  onOpenWallet,
  onOpenAdmin,
  onGoogleLogin,
  onLogout,
  onNavigateToProfile,
  isSubmittingLogin = false
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl relative text-left transition-all p-5 sm:p-6 space-y-5 animate-in slide-in-from-bottom sm:slide-in-from-bottom-4 duration-200"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 24px)' }}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">সেটিংস ও অপশন</h3>
              <p className="text-[11px] text-slate-400">RUHUL MIDIA প্ল্যাটফর্ম মেনু</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition cursor-pointer"
            aria-label="বন্ধ করুন"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Account / Profile Card */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">অ্যাকাউন্ট তথ্য</span>
            {currentUser && (
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                সক্রিয় সেশন
              </span>
            )}
          </div>

          {currentUser ? (
            <div className="flex items-center justify-between gap-3">
              <div 
                className="flex items-center gap-3 cursor-pointer group flex-1 min-w-0"
                onClick={() => {
                  onNavigateToProfile();
                  onClose();
                }}
              >
                {currentUser.photoURL ? (
                  <img 
                    src={currentUser.photoURL} 
                    alt={currentUser.displayName || 'Profile'} 
                    className="w-11 h-11 rounded-full object-cover border-2 border-indigo-500/50 shrink-0 group-hover:border-indigo-400 transition" 
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-indigo-600/30 border-2 border-indigo-500/50 text-indigo-300 font-bold flex items-center justify-center shrink-0">
                    {currentUser.displayName ? currentUser.displayName.slice(0, 1).toUpperCase() : <UserIcon className="w-5 h-5" />}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-white truncate group-hover:text-indigo-300 transition">
                    {currentUser.displayName || 'ইউজার'}
                  </h4>
                  <p className="text-xs text-slate-400 truncate">{currentUser.email || 'গুগল অ্যাকাউন্ট'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onNavigateToProfile();
                  onClose();
                }}
                className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer shrink-0"
              >
                প্রোফাইল
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center">
                  <UserIcon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-300">লগইন করা নেই</h4>
                  <p className="text-xs text-slate-500">Google অ্যাকাউন্ট লিংক করুন</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onGoogleLogin();
                  onClose();
                }}
                disabled={isSubmittingLogin}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-md cursor-pointer shrink-0"
              >
                <Globe className="w-3.5 h-3.5 text-indigo-200" />
                <span>Google লিংক</span>
              </button>
            </div>
          )}
        </div>

        {/* Wallet & Coins Card */}
        <div className="bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-900 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
              <Coins className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] text-amber-400/90 uppercase tracking-wider font-bold">ওয়ালেট ব্যালেন্স</span>
              <h4 className="text-lg font-black text-white font-mono leading-tight">
                {(wallet.points || 0).toLocaleString()} <span className="text-xs font-sans text-amber-300 font-semibold">কয়েন</span>
              </h4>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onOpenWallet();
              onClose();
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md ${
              activeView === 'wallet'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
            }`}
          >
            ওয়ালেটে যান
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Upload Actions */}
        <div className="space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">মিডিয়া আপলোড</span>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => {
                onOpenUpload('video');
                onClose();
              }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-2xl text-xs font-semibold transition flex flex-col items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95 cursor-pointer border border-indigo-400/30"
            >
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                <Plus className="w-4 h-4 text-white" />
              </div>
              <span>+ ভিডিও যোগ</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onOpenUpload('image');
                onClose();
              }}
              className="bg-amber-600 hover:bg-amber-500 text-white p-3 rounded-2xl text-xs font-semibold transition flex flex-col items-center justify-center gap-2 shadow-lg shadow-amber-600/20 active:scale-95 cursor-pointer border border-amber-400/30"
            >
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                <ImageIcon className="w-4 h-4 text-white" />
              </div>
              <span>+ ফটো যোগ</span>
            </button>
          </div>
        </div>

        {/* Admin Panel Access */}
        <div className="space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">ম্যানেজমেন্ট</span>
          <button
            type="button"
            onClick={() => {
              onOpenAdmin();
              onClose();
            }}
            className={`w-full p-3.5 rounded-2xl text-xs font-semibold transition flex items-center justify-between border cursor-pointer ${
              isAdmin && adminToken
                ? 'bg-purple-950/40 hover:bg-purple-900/40 text-purple-300 border-purple-500/40'
                : 'bg-slate-950/70 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                isAdmin && adminToken ? 'bg-purple-600/20 text-purple-400' : 'bg-slate-800 text-indigo-400'
              }`}>
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="font-bold text-white text-xs">
                  {isAdmin && adminToken ? 'এডমিন ড্যাশবোর্ড' : 'এডমিন প্যানেল লগইন'}
                </p>
                <p className="text-[11px] text-slate-400">বিজ্ঞাপন, ভিডিও অনুমোদন ও সেটিংস</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Display / Fullscreen Settings */}
        <div className="pt-1 flex items-center justify-between border-t border-slate-800/80">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleFullscreen}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-2 rounded-xl text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
            >
              {isBrowserFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span>{isBrowserFullscreen ? 'স্বাভাবিক স্ক্রিন' : 'ফুলস্ক্রিন মোড'}</span>
            </button>
          </div>

          {currentUser && (
            <button
              type="button"
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>লগআউট</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
