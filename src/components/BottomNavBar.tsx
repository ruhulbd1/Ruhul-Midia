import React from 'react';
import { 
  Home, 
  Users, 
  Bell, 
  User as UserIcon,
  Film
} from 'lucide-react';

export type NavTabType = 'home' | 'reels' | 'social' | 'notifications' | 'profile';

interface BottomNavBarProps {
  activeTab: NavTabType;
  onChangeTab: (tab: NavTabType) => void;
  unreadNotificationsCount?: number;
  userAvatarUrl?: string;
  userName?: string;
  isLoggedIn?: boolean;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = React.memo(({
  activeTab,
  onChangeTab,
  unreadNotificationsCount = 0,
  userAvatarUrl,
  userName,
  isLoggedIn = false
}) => {
  return (
    <nav 
      aria-label="Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-[999] bg-slate-900/98 backdrop-blur-2xl border-t border-slate-800 shadow-[0_-8px_30px_rgba(0,0,0,0.7)] transition-all duration-300 hw-accelerate pointer-events-auto select-none"
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)',
        isolation: 'isolate'
      }}
    >
      <div className="max-w-md sm:max-w-lg md:max-w-2xl mx-auto px-2 sm:px-4">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-1">
          
          {/* 1. Feed / Home */}
          <button
            type="button"
            onClick={() => onChangeTab('home')}
            aria-label="ফিড"
            className={`flex-1 flex flex-col items-center justify-center py-1.5 transition-all duration-200 relative group cursor-pointer rounded-2xl active:scale-95 ${
              activeTab === 'home'
                ? 'text-indigo-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative flex items-center justify-center">
              <div className={`p-1 rounded-xl transition-colors ${activeTab === 'home' ? 'bg-indigo-500/15' : 'group-hover:bg-slate-800/60'}`}>
                <Home className={`w-5 h-5 sm:w-5.5 sm:h-5.5 transition-transform ${activeTab === 'home' ? 'stroke-[2.5px] scale-110' : ''}`} />
              </div>
            </div>
            <span className={`text-[10px] sm:text-[11px] mt-0.5 tracking-tight font-medium ${activeTab === 'home' ? 'text-indigo-300 font-bold' : ''}`}>
              ফিড
            </span>
            {activeTab === 'home' && (
              <span className="w-4 h-0.5 bg-indigo-500 rounded-full mt-0.5 animate-in fade-in zoom-in duration-150" />
            )}
          </button>

          {/* 2. Reels / Videos */}
          <button
            type="button"
            onClick={() => onChangeTab('reels')}
            aria-label="রিলস"
            className={`flex-1 flex flex-col items-center justify-center py-1.5 transition-all duration-200 relative group cursor-pointer rounded-2xl active:scale-95 ${
              activeTab === 'reels'
                ? 'text-indigo-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative flex items-center justify-center">
              <div className={`p-1 rounded-xl transition-colors ${activeTab === 'reels' ? 'bg-indigo-500/15' : 'group-hover:bg-slate-800/60'}`}>
                <Film className={`w-5 h-5 sm:w-5.5 sm:h-5.5 transition-transform ${activeTab === 'reels' ? 'stroke-[2.5px] text-indigo-400 scale-110' : ''}`} />
              </div>
            </div>
            <span className={`text-[10px] sm:text-[11px] mt-0.5 tracking-tight font-medium ${activeTab === 'reels' ? 'text-indigo-300 font-bold' : ''}`}>
              রিলস
            </span>
            {activeTab === 'reels' && (
              <span className="w-4 h-0.5 bg-indigo-500 rounded-full mt-0.5 animate-in fade-in zoom-in duration-150" />
            )}
          </button>

          {/* 3. Community / Social */}
          <button
            type="button"
            onClick={() => onChangeTab('social')}
            aria-label="কমিউনিটি"
            className={`flex-1 flex flex-col items-center justify-center py-1.5 transition-all duration-200 relative group cursor-pointer rounded-2xl active:scale-95 ${
              activeTab === 'social'
                ? 'text-indigo-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative flex items-center justify-center">
              <div className={`p-1 rounded-xl transition-colors ${activeTab === 'social' ? 'bg-indigo-500/15' : 'group-hover:bg-slate-800/60'}`}>
                <Users className={`w-5 h-5 sm:w-5.5 sm:h-5.5 transition-transform ${activeTab === 'social' ? 'stroke-[2.5px] scale-110' : ''}`} />
              </div>
            </div>
            <span className={`text-[10px] sm:text-[11px] mt-0.5 tracking-tight font-medium ${activeTab === 'social' ? 'text-indigo-300 font-bold' : ''}`}>
              কমিউনিটি
            </span>
            {activeTab === 'social' && (
              <span className="w-4 h-0.5 bg-indigo-500 rounded-full mt-0.5 animate-in fade-in zoom-in duration-150" />
            )}
          </button>

          {/* 4. Notifications */}
          <button
            type="button"
            onClick={() => onChangeTab('notifications')}
            aria-label="বিজ্ঞপ্তি"
            className={`flex-1 flex flex-col items-center justify-center py-1.5 transition-all duration-200 relative group cursor-pointer rounded-2xl active:scale-95 ${
              activeTab === 'notifications'
                ? 'text-indigo-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative flex items-center justify-center">
              <div className={`p-1 rounded-xl transition-colors ${activeTab === 'notifications' ? 'bg-indigo-500/15' : 'group-hover:bg-slate-800/60'}`}>
                <Bell className={`w-5 h-5 sm:w-5.5 sm:h-5.5 transition-transform ${activeTab === 'notifications' ? 'stroke-[2.5px] scale-110' : ''}`} />
              </div>
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white font-mono text-[9px] font-bold flex items-center justify-center ring-2 ring-slate-900 animate-pulse">
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </span>
              )}
            </div>
            <span className={`text-[10px] sm:text-[11px] mt-0.5 tracking-tight font-medium ${activeTab === 'notifications' ? 'text-indigo-300 font-bold' : ''}`}>
              বিজ্ঞপ্তি
            </span>
            {activeTab === 'notifications' && (
              <span className="w-4 h-0.5 bg-indigo-500 rounded-full mt-0.5 animate-in fade-in zoom-in duration-150" />
            )}
          </button>

          {/* 5. User Profile */}
          <button
            type="button"
            onClick={() => onChangeTab('profile')}
            aria-label="প্রোফাইল"
            className={`flex-1 flex flex-col items-center justify-center py-1.5 transition-all duration-200 relative group cursor-pointer rounded-2xl active:scale-95 ${
              activeTab === 'profile'
                ? 'text-indigo-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative flex items-center justify-center">
              <div className="p-0.5 rounded-full transition-transform">
                {userAvatarUrl ? (
                  <img 
                    src={userAvatarUrl} 
                    alt={userName || 'Profile'} 
                    className={`w-6 h-6 rounded-full object-cover border ${activeTab === 'profile' ? 'border-indigo-400 ring-2 ring-indigo-500/50 scale-110' : 'border-slate-700'}`}
                  />
                ) : (
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${activeTab === 'profile' ? 'bg-indigo-600 text-white border-indigo-400 ring-2 ring-indigo-500/50 scale-110' : 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                    {userName ? userName.slice(0, 1).toUpperCase() : <UserIcon className="w-3.5 h-3.5" />}
                  </div>
                )}
                {isLoggedIn && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-slate-900" />
                )}
              </div>
            </div>
            <span className={`text-[10px] sm:text-[11px] mt-0.5 tracking-tight font-medium ${activeTab === 'profile' ? 'text-indigo-300 font-bold' : ''}`}>
              প্রোফাইল
            </span>
            {activeTab === 'profile' && (
              <span className="w-4 h-0.5 bg-indigo-500 rounded-full mt-0.5 animate-in fade-in zoom-in duration-150" />
            )}
          </button>

        </div>
      </div>
    </nav>
  );
});

export default BottomNavBar;
