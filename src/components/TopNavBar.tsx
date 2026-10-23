import React from 'react';
import { 
  Home, 
  Film, 
  Users, 
  Bell, 
  User as UserIcon,
  Play,
  Plus,
  ImageIcon,
  Coins,
  Settings,
  ShieldAlert,
  Tv,
  Globe,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { type User } from 'firebase/auth';

export type NavTabType = 'home' | 'reels' | 'social' | 'notifications' | 'profile';

interface TopNavBarProps {
  activeTab: NavTabType;
  onChangeTab: (tab: NavTabType) => void;
  unreadNotificationsCount?: number;
  userAvatarUrl?: string;
  userName?: string;
  isLoggedIn?: boolean;
  walletPoints: number;
  currentUser: User | null;
  isAdmin: boolean;
  adminToken: string | null;
  activeView: 'user' | 'wallet' | 'admin-login' | 'admin-dashboard';
  isBrowserFullscreen: boolean;
  toggleFullscreen: () => void;
  onOpenUpload: (type: 'video' | 'image') => void;
  onOpenWallet: () => void;
  onOpenAdmin: () => void;
  onOpenSettings: () => void;
  onGoogleLogin: () => void;
  onLogoClick: () => void;
  isSubmittingLogin?: boolean;
}

export const TopNavBar: React.FC<TopNavBarProps> = React.memo(({
  activeTab,
  onChangeTab,
  unreadNotificationsCount = 0,
  userAvatarUrl,
  userName,
  isLoggedIn = false,
  walletPoints,
  currentUser,
  isAdmin,
  adminToken,
  activeView,
  isBrowserFullscreen,
  toggleFullscreen,
  onOpenUpload,
  onOpenWallet,
  onOpenAdmin,
  onOpenSettings,
  onGoogleLogin,
  onLogoClick,
  isSubmittingLogin = false
}) => {
  return (
    <header className="bg-slate-900/98 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-40 w-full shadow-xl select-none">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-4 lg:px-8">
        
        {/* ROW 1: Brand & Top Action Control Bar */}
        <div className="py-2.5 flex items-center justify-between gap-2 border-b border-slate-800/60">
          
          {/* Logo / Brand */}
          <div 
            className="flex items-center gap-2 sm:gap-2.5 cursor-pointer group shrink-0 active:scale-95 transition-transform" 
            onClick={onLogoClick}
            title="মূল ফিডে ফিরে যান"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform duration-200">
              <Play className="w-4 h-4 text-white fill-white ml-0.5" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-base sm:text-lg tracking-wider bg-gradient-to-r from-indigo-400 via-purple-300 to-indigo-300 bg-clip-text text-transparent leading-none">
                RUHUL MIDIA
              </span>
              <span className="text-[9px] text-slate-400 hidden xs:inline mt-0.5 font-medium">
                মিডিয়া ও স্ট্রিমিং হাব
              </span>
            </div>
          </div>

          {/* Action Buttons Group */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            
            {/* + Video Button */}
            <button
              type="button"
              onClick={() => onOpenUpload('video')}
              aria-label="ভিডিও দিন"
              title="নতুন ভিডিও যোগ করুন"
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20 active:scale-95 cursor-pointer shrink-0 border border-indigo-400/30"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">ভিডিও দিন</span>
            </button>

            {/* + Photo Button */}
            <button
              type="button"
              onClick={() => onOpenUpload('image')}
              aria-label="ফটো দিন"
              title="নতুন ফটো আপলোড করুন"
              className="bg-amber-600 hover:bg-amber-500 text-white px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-md shadow-amber-600/20 active:scale-95 cursor-pointer shrink-0 border border-amber-400/30"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ফটো দিন</span>
            </button>

            {/* Coins / Wallet Badge */}
            <button
              type="button"
              onClick={onOpenWallet}
              aria-label="ওয়ালেট ব্যালেন্স"
              title="ওয়ালেটে প্রবেশ করুন ও কয়েন দেখুন"
              className={`px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-bold transition border flex items-center gap-1.5 cursor-pointer shadow-sm shrink-0 active:scale-95 ${
                activeView === 'wallet'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-amber-500/20'
                  : 'bg-slate-800/90 hover:bg-slate-800 text-amber-400 border-amber-500/30'
              }`}
            >
              <Coins className="w-3.5 h-3.5 animate-pulse text-amber-400" />
              <span className="font-mono">{walletPoints.toLocaleString()}</span>
              <span className="text-[10px] hidden sm:inline text-amber-300 font-sans">কয়েন</span>
            </button>

            {/* Google Login / Account Status */}
            {currentUser ? (
              <div 
                onClick={() => onChangeTab('profile')}
                title={`লগইন: ${currentUser.displayName || currentUser.email}`}
                className="flex items-center gap-1.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-200 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-semibold shadow-sm shrink-0 cursor-pointer transition active:scale-95"
              >
                {userAvatarUrl ? (
                  <img 
                    src={userAvatarUrl} 
                    alt={userName || 'User'} 
                    className="w-4 h-4 rounded-full object-cover border border-emerald-400 shrink-0" 
                  />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                )}
                <span className="truncate max-w-[60px] sm:max-w-[90px] hidden xs:inline">
                  {userName ? userName.split(' ')[0] : 'ইউজার'}
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={onGoogleLogin}
                disabled={isSubmittingLogin}
                title="Google অ্যাকাউন্ট লিংক করুন"
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-semibold transition border border-slate-700 flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95"
              >
                <Globe className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
                <span className="hidden sm:inline">লগইন</span>
              </button>
            )}

            {/* Admin Dashboard / Gate Button */}
            {activeView === 'admin-dashboard' ? (
              <button 
                type="button"
                onClick={onLogoClick} 
                className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1 cursor-pointer shrink-0"
                title="ইউজার ভিউতে ফিরে যান"
              >
                <Tv className="w-3.5 h-3.5" />
                <span className="hidden md:inline">ইউজার ভিউ</span>
              </button>
            ) : (
              <button 
                type="button"
                onClick={onOpenAdmin}
                className={`px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-medium transition border flex items-center gap-1 cursor-pointer shrink-0 active:scale-95 ${
                  isAdmin && adminToken
                    ? 'bg-purple-950/80 text-purple-300 border-purple-500/40 hover:bg-purple-900/60'
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700'
                }`}
                title={isAdmin ? 'এডমিন ড্যাশবোর্ড' : 'এডমিন লগইন গেট'}
              >
                <ShieldAlert className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">{isAdmin ? 'ড্যাশবোর্ড' : 'এডমিন'}</span>
              </button>
            )}

            {/* Fullscreen Toggle (Desktop / Tablet) */}
            <button
              type="button"
              onClick={toggleFullscreen}
              title={isBrowserFullscreen ? 'ফুলস্ক্রিন বন্ধ করুন' : 'ফুলস্ক্রিন মোড'}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white p-1.5 sm:p-2 rounded-xl border border-slate-700 transition cursor-pointer hidden md:flex items-center justify-center shrink-0 active:scale-95"
            >
              {isBrowserFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            {/* Settings Icon (⚙️) Button */}
            <button
              type="button"
              onClick={onOpenSettings}
              aria-label="সেটিংস ও অপশন"
              title="সেটিংস ও অ্যাকশন মেনু"
              className="p-1.5 sm:p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 transition flex items-center justify-center cursor-pointer shadow-sm active:scale-95 group shrink-0"
            >
              <Settings className="w-4 h-4 text-indigo-400 transition-transform group-hover:rotate-45" />
            </button>

          </div>
        </div>

        {/* ROW 2: Sleek Horizontal Top Navigation Bar (Replacing Bottom Bar) */}
        <nav 
          aria-label="Top Category Navigation"
          className="flex items-center justify-between sm:justify-start gap-1 sm:gap-2 py-2 overflow-x-auto no-scrollbar scroll-smooth"
        >
          {/* 1. Feed / Home */}
          <button
            type="button"
            onClick={() => onChangeTab('home')}
            className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 shrink-0 cursor-pointer active:scale-95 ${
              activeTab === 'home' && activeView === 'user'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-400/30 font-bold'
                : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <Home className={`w-4 h-4 ${activeTab === 'home' && activeView === 'user' ? 'text-white' : 'text-slate-400'}`} />
            <span>ফিড</span>
          </button>

          {/* 2. Reels / Videos */}
          <button
            type="button"
            onClick={() => onChangeTab('reels')}
            className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 shrink-0 cursor-pointer active:scale-95 ${
              activeTab === 'reels' && activeView === 'user'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-600/30 border border-purple-400/30 font-bold'
                : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <Film className={`w-4 h-4 ${activeTab === 'reels' && activeView === 'user' ? 'text-white' : 'text-purple-400'}`} />
            <span>রিলস</span>
          </button>

          {/* 3. Community / Social */}
          <button
            type="button"
            onClick={() => onChangeTab('social')}
            className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 shrink-0 cursor-pointer active:scale-95 ${
              activeTab === 'social' && activeView === 'user'
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-400/30 font-bold'
                : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <Users className={`w-4 h-4 ${activeTab === 'social' && activeView === 'user' ? 'text-white' : 'text-blue-400'}`} />
            <span>কমিউনিটি</span>
          </button>

          {/* 4. Notifications */}
          <button
            type="button"
            onClick={() => onChangeTab('notifications')}
            className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 shrink-0 cursor-pointer active:scale-95 relative ${
              activeTab === 'notifications' && activeView === 'user'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-400/30 font-bold'
                : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <div className="relative flex items-center justify-center">
              <Bell className={`w-4 h-4 ${activeTab === 'notifications' && activeView === 'user' ? 'text-white' : 'text-slate-400'}`} />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[15px] h-3.5 px-1 rounded-full bg-rose-500 text-white font-mono text-[9px] font-bold flex items-center justify-center ring-1 ring-slate-900 animate-pulse">
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </span>
              )}
            </div>
            <span>বিজ্ঞপ্তি</span>
          </button>

          {/* 5. User Profile */}
          <button
            type="button"
            onClick={() => onChangeTab('profile')}
            className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 shrink-0 cursor-pointer active:scale-95 ${
              activeTab === 'profile' && activeView === 'user'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-400/30 font-bold'
                : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            {userAvatarUrl ? (
              <img 
                src={userAvatarUrl} 
                alt={userName || 'Profile'} 
                className={`w-4 h-4 rounded-full object-cover border ${activeTab === 'profile' && activeView === 'user' ? 'border-white' : 'border-slate-500'}`}
              />
            ) : (
              <UserIcon className={`w-4 h-4 ${activeTab === 'profile' && activeView === 'user' ? 'text-white' : 'text-slate-400'}`} />
            )}
            <span>প্রোফাইল</span>
          </button>

        </nav>

      </div>
    </header>
  );
});

export default TopNavBar;
