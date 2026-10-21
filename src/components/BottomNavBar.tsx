import React from 'react';
import { 
  Home, 
  Tv, 
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
      className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800/90 shadow-2xl transition-all duration-300 hw-accelerate pointer-events-auto"
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)'
      }}
    >
      <div className="max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-2 sm:px-6">
        <div className="flex items-center justify-around h-15">
          
          {/* 1. Home / Feed */}
          <button
            type="button"
            onClick={() => onChangeTab('home')}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-all duration-200 relative group cursor-pointer ${
              activeTab === 'home'
                ? 'text-indigo-400 font-bold scale-105'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <Home className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform ${activeTab === 'home' ? 'stroke-[2.5px]' : ''}`} />
              {activeTab === 'home' && (
                <span className="absolute -bottom-1.5 left-1/2 transform -translate-x-1/2 w-4 h-0.5 bg-indigo-500 rounded-full" />
              )}
            </div>
            <span className="text-[10px] sm:text-[11px] mt-1 font-medium tracking-tight">ফিড</span>
          </button>

          {/* 2. Reels / Videos */}
          <button
            type="button"
            onClick={() => onChangeTab('reels')}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-all duration-200 relative group cursor-pointer ${
              activeTab === 'reels'
                ? 'text-indigo-400 font-bold scale-105'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <Film className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform ${activeTab === 'reels' ? 'stroke-[2.5px] text-indigo-400' : ''}`} />
              {activeTab === 'reels' && (
                <span className="absolute -bottom-1.5 left-1/2 transform -translate-x-1/2 w-4 h-0.5 bg-indigo-500 rounded-full" />
              )}
            </div>
            <span className="text-[10px] sm:text-[11px] mt-1 font-medium tracking-tight">রিলস</span>
          </button>

          {/* 3. Social / Community */}
          <button
            type="button"
            onClick={() => onChangeTab('social')}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-all duration-200 relative group cursor-pointer ${
              activeTab === 'social'
                ? 'text-indigo-400 font-bold scale-105'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <Users className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform ${activeTab === 'social' ? 'stroke-[2.5px]' : ''}`} />
              {activeTab === 'social' && (
                <span className="absolute -bottom-1.5 left-1/2 transform -translate-x-1/2 w-4 h-0.5 bg-indigo-500 rounded-full" />
              )}
            </div>
            <span className="text-[10px] sm:text-[11px] mt-1 font-medium tracking-tight">কমিউনিটি</span>
          </button>

          {/* 4. Notifications */}
          <button
            type="button"
            onClick={() => onChangeTab('notifications')}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-all duration-200 relative group cursor-pointer ${
              activeTab === 'notifications'
                ? 'text-indigo-400 font-bold scale-105'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <Bell className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform ${activeTab === 'notifications' ? 'stroke-[2.5px]' : ''}`} />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white font-mono text-[9px] font-bold flex items-center justify-center ring-2 ring-slate-900 animate-pulse">
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </span>
              )}
              {activeTab === 'notifications' && (
                <span className="absolute -bottom-1.5 left-1/2 transform -translate-x-1/2 w-4 h-0.5 bg-indigo-500 rounded-full" />
              )}
            </div>
            <span className="text-[10px] sm:text-[11px] mt-1 font-medium tracking-tight">বিজ্ঞপ্তি</span>
          </button>

          {/* 5. User Profile */}
          <button
            type="button"
            onClick={() => onChangeTab('profile')}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-all duration-200 relative group cursor-pointer ${
              activeTab === 'profile'
                ? 'text-indigo-400 font-bold scale-105'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              {userAvatarUrl ? (
                <img 
                  src={userAvatarUrl} 
                  alt={userName || 'Profile'} 
                  className={`w-6 h-6 rounded-full object-cover border ${activeTab === 'profile' ? 'border-indigo-500 ring-2 ring-indigo-500/40' : 'border-slate-700'}`}
                />
              ) : (
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${activeTab === 'profile' ? 'bg-indigo-600 text-white border-indigo-400 ring-2 ring-indigo-500/40' : 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                  {userName ? userName.slice(0, 1).toUpperCase() : <UserIcon className="w-3.5 h-3.5" />}
                </div>
              )}
              {isLoggedIn && (
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-slate-900" />
              )}
              {activeTab === 'profile' && (
                <span className="absolute -bottom-1.5 left-1/2 transform -translate-x-1/2 w-4 h-0.5 bg-indigo-500 rounded-full" />
              )}
            </div>
            <span className="text-[10px] sm:text-[11px] mt-1 font-medium tracking-tight">প্রোফাইল</span>
          </button>

        </div>
      </div>
    </nav>
  );
});

export default BottomNavBar;
