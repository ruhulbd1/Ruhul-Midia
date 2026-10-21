import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  UserPlus, 
  UserCheck, 
  Tv, 
  Coins, 
  Sparkles, 
  ChevronRight,
  ShieldCheck,
  Flame,
  Radio,
  ExternalLink,
  Heart
} from 'lucide-react';
import { UserPresence } from '../types/userPresence';
import { FollowRelation } from '../types/social';

interface SocialCommunityViewProps {
  users: UserPresence[];
  currentUserUid?: string;
  isLoggedIn?: boolean;
  followingSet: Set<string>; // set of userIds current user is following
  followerCountMap: Record<string, number>; // map of userId -> follower count
  userVideoCounts: Record<string, number>; // map of userId/uploaderName -> count of uploaded videos
  onFollowToggle: (targetUser: UserPresence) => void;
  onViewProfile: (userId: string) => void;
  onOpenLoginModal: () => void;
}

export const SocialCommunityView: React.FC<SocialCommunityViewProps> = ({
  users,
  currentUserUid,
  isLoggedIn = false,
  followingSet,
  followerCountMap,
  userVideoCounts,
  onFollowToggle,
  onViewProfile,
  onOpenLoginModal
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'online' | 'following' | 'creators'>('all');

  const now = Date.now();
  const ONLINE_WINDOW_MS = 90 * 1000;

  // Enhance users with live online check & video counts
  const processedUsers = useMemo(() => {
    return users.map(u => {
      const isOnline = Boolean(u.online) && (now - (u.lastActive || 0) < ONLINE_WINDOW_MS);
      const videoCount = (userVideoCounts[u.userId] || 0) + (userVideoCounts[u.userName] || 0);
      const followers = followerCountMap[u.userId] || 0;
      const isFollowing = followingSet.has(u.userId);

      return {
        ...u,
        isOnline,
        videoCount,
        followers,
        isFollowing,
        isSelf: currentUserUid ? u.userId === currentUserUid : false
      };
    });
  }, [users, now, userVideoCounts, followerCountMap, followingSet, currentUserUid]);

  const totalMembers = processedUsers.length;
  const onlineCount = processedUsers.filter(u => u.isOnline).length;
  const followingCount = processedUsers.filter(u => u.isFollowing).length;

  const filteredUsers = useMemo(() => {
    return processedUsers.filter(u => {
      // 1. Filter tabs
      if (activeFilter === 'online' && !u.isOnline) return false;
      if (activeFilter === 'following' && !u.isFollowing) return false;
      if (activeFilter === 'creators' && u.videoCount <= 0) return false;

      // 2. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = u.userName.toLowerCase().includes(q);
        const matchEmail = u.userEmail ? u.userEmail.toLowerCase().includes(q) : false;
        const matchId = u.userId.toLowerCase().includes(q);
        return matchName || matchEmail || matchId;
      }

      return true;
    });
  }, [processedUsers, activeFilter, searchQuery]);

  return (
    <div className="space-y-6 animate-fadeIn pb-8">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shadow-inner">
                <Users className="w-5 h-5 text-indigo-400" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                সোশ্যাল কমিউনিটি ও মেম্বারস
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              রুহুল মিডিয়ার অন্যান্য মেম্বার ও ক্রিয়েটরদের খুঁজুন, তাদের প্রোফাইল দেখুন এবং নতুন ভিডিওর আপডেট পেতে ফলো করুন।
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3">
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl px-4 py-3 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">মোট মেম্বার</span>
              <span className="text-xl font-black text-white font-mono">{totalMembers}</span>
            </div>
            <div className="bg-slate-950/80 border border-emerald-500/30 rounded-2xl px-4 py-3 text-center">
              <span className="text-[10px] uppercase font-bold text-emerald-400 flex items-center justify-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                লাইভ
              </span>
              <span className="text-xl font-black text-emerald-300 font-mono">{onlineCount}</span>
            </div>
            <div className="bg-slate-950/80 border border-indigo-500/30 rounded-2xl px-4 py-3 text-center">
              <span className="text-[10px] uppercase font-bold text-indigo-400 block">ফলো করছেন</span>
              <span className="text-xl font-black text-indigo-300 font-mono">{followingCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ইউজার বা ক্রিয়েটর খুঁজুন (নাম, ইমেইল বা আইডি)..."
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
            >
              মুছুন
            </button>
          )}
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            সব ({processedUsers.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('online')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
              activeFilter === 'online'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-slate-800'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>অনলাইন ({onlineCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('following')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
              activeFilter === 'following'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-900 hover:bg-slate-800 text-indigo-300 border border-slate-800'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>ফলো করছেন ({followingCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('creators')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
              activeFilter === 'creators'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-800'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>ভিডিও আপলোডার</span>
          </button>
        </div>

      </div>

      {/* Users Grid */}
      {filteredUsers.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/60 border border-slate-800 rounded-3xl p-8 space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-white">কোনো মেম্বার পাওয়া যায়নি</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            আপনার অনুসন্ধানের সাথে মিল রেখে কোনো ইউজার পাওয়া যায়নি। অন্য নাম বা আইডি দিয়ে পুনরায় খুঁজুন।
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((user) => (
            <div 
              key={user.userId}
              className="bg-slate-900 border border-slate-800/90 hover:border-indigo-500/50 rounded-3xl p-5 transition-all duration-300 shadow-xl flex flex-col justify-between group space-y-4"
            >
              
              {/* User Header */}
              <div className="flex items-start justify-between gap-3">
                <div 
                  onClick={() => onViewProfile(user.userId)}
                  className="flex items-center gap-3 cursor-pointer group/user flex-1 min-w-0"
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 p-0.5 shadow-lg shadow-indigo-600/20">
                      <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center font-black text-lg text-white">
                        {user.userName ? user.userName.slice(0, 1).toUpperCase() : 'U'}
                      </div>
                    </div>
                    {user.isOnline ? (
                      <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900 shadow" title="অনলাইন" />
                    ) : (
                      <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-slate-600 border-2 border-slate-900 shadow" title="অফলাইন" />
                    )}
                  </div>

                  {/* Name and ID */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-sm text-white group-hover/user:text-indigo-400 transition truncate">
                        {user.userName || 'ইউজার'}
                      </h3>
                      {user.userEmail && (
                        <span title="ভেরিফাইড ইউজার" className="inline-flex shrink-0">
                          <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono truncate">
                      ID: {user.userId.slice(-8)}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {user.isOnline ? (
                        <span className="text-emerald-400 font-medium">● এইমাত্র সক্রিয়</span>
                      ) : (
                        <span>শেষ সক্রিয়: {user.lastActive ? new Date(user.lastActive).toLocaleDateString('bn-BD') : 'আজ'}</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Follow Button */}
                {user.isSelf ? (
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2.5 py-1 rounded-xl font-medium shrink-0">
                    আপনি
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isLoggedIn) {
                        onOpenLoginModal();
                        return;
                      }
                      onFollowToggle(user);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow active:scale-95 ${
                      user.isFollowing
                        ? 'bg-slate-800 hover:bg-rose-500/20 text-indigo-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/30'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                    }`}
                  >
                    {user.isFollowing ? (
                      <>
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>ফলো করছেন</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>ফলো</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-2 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-2.5 text-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">ভিডিও</span>
                  <span className="font-bold text-slate-200 font-mono">{user.videoCount}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">ফলোয়ার</span>
                  <span className="font-bold text-slate-200 font-mono">{user.followers}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">কয়েন</span>
                  <span className="font-bold text-amber-400 font-mono">{(user.points || 0).toLocaleString()}</span>
                </div>
              </div>

              {/* Footer action */}
              <button
                type="button"
                onClick={() => onViewProfile(user.userId)}
                className="w-full bg-slate-950 hover:bg-slate-800 border border-slate-800/90 hover:border-slate-700 text-slate-300 hover:text-white py-2 px-3 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>সম্পূর্ণ প্রোফাইল দেখুন</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

            </div>
          ))}
        </div>
      )}

    </div>
  );
};

export default SocialCommunityView;
