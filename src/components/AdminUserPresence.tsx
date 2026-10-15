import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Activity, 
  Search, 
  RefreshCw, 
  Clock, 
  Smartphone, 
  Monitor, 
  Coins, 
  Tv, 
  CheckCircle2, 
  UserCheck, 
  ShieldCheck, 
  Sparkles,
  Mail,
  Copy,
  Check
} from 'lucide-react';
import { UserPresence } from '../types/userPresence';

interface AdminUserPresenceProps {
  users: UserPresence[];
  onRefresh?: () => void;
  isLoading?: boolean;
}

export default function AdminUserPresence({
  users,
  onRefresh,
  isLoading = false
}: AdminUserPresenceProps) {
  const [filter, setFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Compute strictly live online users (active within last 90 seconds AND online flag true)
  const now = Date.now();
  const ONLINE_WINDOW_MS = 90 * 1000;

  const processedUsers = useMemo(() => {
    return users.map(u => {
      const isOnline = Boolean(u.online) && (now - (u.lastActive || 0) < ONLINE_WINDOW_MS);
      return {
        ...u,
        isOnline
      };
    });
  }, [users, now]);

  const totalRegisteredCount = processedUsers.length;
  const onlineCount = processedUsers.filter(u => u.isOnline).length;
  const offlineCount = totalRegisteredCount - onlineCount;

  const filteredUsers = useMemo(() => {
    return processedUsers.filter(u => {
      const matchStatus = 
        filter === 'all' || 
        (filter === 'online' && u.isOnline) || 
        (filter === 'offline' && !u.isOnline);

      const q = searchQuery.toLowerCase().trim();
      const matchSearch = 
        !q ||
        u.userName.toLowerCase().includes(q) ||
        (u.userEmail && u.userEmail.toLowerCase().includes(q)) ||
        u.userId.toLowerCase().includes(q);

      return matchStatus && matchSearch;
    });
  }, [processedUsers, filter, searchQuery]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatLastActive = (timestamp: number, isoDate: string) => {
    if (!timestamp && !isoDate) return 'অজানা';
    const timeMs = timestamp || new Date(isoDate).getTime();
    const diffSec = Math.floor((now - timeMs) / 1000);

    if (diffSec < 20) return 'এইমাত্র (Just now)';
    if (diffSec < 60) return `${diffSec} সেকেন্ড আগে`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} মিনিট আগে`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr} ঘণ্টা আগে`;
    const diffDays = Math.floor(diffHr / 24);
    return `${diffDays} দিন আগে`;
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* 1. Header Banner & Counter Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Counter Card 1: Total Registered Users */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              মোট নিবন্ধিত ইউজার
            </span>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-black text-white font-mono tracking-tight">
              {totalRegisteredCount.toLocaleString()}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>ক্লাউড ডাটাবেজে সংরক্ষিত সর্বমোট ব্যবহারকারী</span>
            </p>
          </div>
        </div>

        {/* Counter Card 2: Currently Online Users (Dynamic Live Counter) */}
        <div className="bg-gradient-to-br from-slate-900 to-emerald-950/40 border border-emerald-500/30 rounded-3xl p-5 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between relative z-10">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              বর্তমানে লাইভ অনলাইন
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
          </div>
          <div className="mt-4 relative z-10">
            <h3 className="text-3xl font-black text-emerald-400 font-mono tracking-tight flex items-center gap-2">
              {onlineCount.toLocaleString()}
              <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-sans font-bold">
                সরাসরি সক্রিয়
              </span>
            </h3>
            <p className="text-[11px] text-slate-300 mt-1">
              রিয়েল-টাইমে অ্যাপ ব্যবহাররত সক্রিয় ব্যবহারকারী
            </p>
          </div>
        </div>

        {/* Counter Card 3: Offline Users */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              অফলাইন ইউজার
            </span>
            <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-black text-slate-300 font-mono tracking-tight">
              {offlineCount.toLocaleString()}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              বর্তমানে ডিসকানেক্টেড বা সাইটের বাইরে
            </p>
          </div>
        </div>

        {/* Counter Card 4: Presence Sync Status */}
        <div className="bg-slate-900 border border-indigo-500/20 rounded-3xl p-5 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">
              ট্র্যাকিং মেকানিজম
            </span>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xs font-bold text-white bg-indigo-500/20 border border-indigo-500/30 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Firebase Firestore Live Presence
            </span>
            <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
              হার্টবিট ও ডিসকানেক্ট ডিটেকশনের মাধ্যমে স্বয়ংক্রিয়ভাবে অনলাইন/অফলাইন নির্ধারিত হয়।
            </p>
          </div>
        </div>

      </div>

      {/* 2. Search, Status Filter & Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        
        {/* Status Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
              filter === 'all'
                ? 'bg-indigo-600 text-white shadow'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            সব ব্যবহারকারী ({totalRegisteredCount})
          </button>

          <button
            type="button"
            onClick={() => setFilter('online')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              filter === 'online'
                ? 'bg-emerald-600 text-white shadow'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>অনলাইন ({onlineCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilter('offline')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
              filter === 'offline'
                ? 'bg-slate-700 text-white shadow'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            অফলাইন ({offlineCount})
          </button>
        </div>

        {/* Search Bar & Refresh */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="নাম, ইমেইল বা আইডি দিয়ে খুঁজুন..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition placeholder-slate-500"
            />
          </div>

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              title="রিফ্রেশ করুন"
              className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white p-2 rounded-xl transition cursor-pointer shrink-0"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
          )}
        </div>

      </div>

      {/* 3. Live Users Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" />
            <h3 className="font-bold text-sm text-white">
              লাইভ ইউজার তালিকা (Live Online & Registered Users)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            প্রদর্শিত হচ্ছে: {filteredUsers.length} জন
          </span>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="p-16 text-center text-slate-500 space-y-3">
            <Users className="w-12 h-12 text-slate-600 mx-auto opacity-50" />
            <p className="text-sm font-semibold text-slate-300">কোনো ব্যবহারকারী পাওয়া যায়নি!</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery ? 'আপনার সার্চ করা কিওয়ার্ডের সাথে কোনো ব্যবহারকারী মিলছে না।' : 'এই ক্যাটাগরিতে এখনও কোনো ইউজার নেই।'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[11px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-4 font-semibold">ব্যবহারকারী (User Info)</th>
                  <th className="p-4 font-semibold">অনলাইন স্ট্যাটাস (Status)</th>
                  <th className="p-4 font-semibold">সর্বশেষ সক্রিয় (Last Active)</th>
                  <th className="p-4 font-semibold">পয়েন্ট / কয়েন</th>
                  <th className="p-4 font-semibold">ডিভাইস / মাধ্যম</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-sans">
                {filteredUsers.map((user) => {
                  const initial = (user.userName || 'U')[0].toUpperCase();

                  return (
                    <tr key={user.userId} className="hover:bg-slate-950/40 transition duration-150">
                      
                      {/* User Column */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-white shrink-0 shadow ${
                            user.isOnline 
                              ? 'bg-gradient-to-tr from-emerald-600 to-teal-500' 
                              : 'bg-slate-800 border border-slate-700 text-slate-400'
                          }`}>
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-sm text-white truncate max-w-[200px]">
                              {user.userName || 'ইউজার'}
                            </p>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                              {user.userEmail ? (
                                <span className="flex items-center gap-1 text-slate-400 truncate max-w-[180px]" title={user.userEmail}>
                                  <Mail className="w-3 h-3 text-indigo-400 shrink-0" />
                                  <span className="truncate">{user.userEmail}</span>
                                </span>
                              ) : (
                                <span className="font-mono text-slate-500">ID: {user.userId.slice(-8)}</span>
                              )}
                              <button
                                type="button"
                                onClick={() => handleCopy(user.userId, user.userId)}
                                className="text-slate-500 hover:text-white transition ml-1"
                                title="ইউজার আইডি কপি করুন"
                              >
                                {copiedId === user.userId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Status Column */}
                      <td className="p-4">
                        {user.isOnline ? (
                          <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span>অনলাইন (Online)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 bg-slate-800 text-slate-400 border border-slate-700/80 px-2.5 py-1 rounded-full text-xs font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                            <span>অফলাইন (Offline)</span>
                          </span>
                        )}
                      </td>

                      {/* Last Active */}
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-xs text-slate-200">
                            {formatLastActive(user.lastActive, user.lastSeen)}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono mt-0.5">
                            {user.lastSeen ? new Date(user.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                      </td>

                      {/* Points / Videos Watched */}
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded-md text-xs font-mono font-bold">
                            <Coins className="w-3 h-3 text-amber-400" />
                            {(user.points || 0).toLocaleString()}
                          </span>
                          {typeof user.videosWatchedCount === 'number' && user.videosWatchedCount > 0 && (
                            <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                              <Tv className="w-3 h-3 text-indigo-400" />
                              {user.videosWatchedCount}টি
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Device Column */}
                      <td className="p-4 text-xs text-slate-400">
                        <span className="bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-slate-300 inline-flex items-center gap-1.5">
                          {user.device?.toLowerCase().includes('mobile') || user.device?.toLowerCase().includes('android') || user.device?.toLowerCase().includes('ios') ? (
                            <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                          ) : (
                            <Monitor className="w-3.5 h-3.5 text-indigo-400" />
                          )}
                          <span className="truncate max-w-[120px]">{user.device || 'Web Browser'}</span>
                        </span>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
