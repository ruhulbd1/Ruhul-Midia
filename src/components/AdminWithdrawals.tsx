import React, { useState } from 'react';
import { 
  CreditCard, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Trash2, 
  Search, 
  Copy, 
  Check, 
  ExternalLink, 
  AlertCircle,
  Filter,
  RefreshCw,
  Coins,
  Send,
  Loader2
} from 'lucide-react';
import { WithdrawalRequest, pointsToBdt } from '../types/earning';

interface AdminWithdrawalsProps {
  withdrawals: WithdrawalRequest[];
  onUpdateStatus: (id: string, status: 'approved' | 'rejected', note?: string) => Promise<void>;
  onDeleteRequest: (id: string) => Promise<void>;
  onRefresh?: () => void;
}

export default function AdminWithdrawals({
  withdrawals,
  onUpdateStatus,
  onDeleteRequest,
  onRefresh
}: AdminWithdrawalsProps) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  // Summary counts
  const totalCount = withdrawals.length;
  const pendingCount = withdrawals.filter(w => w.status === 'pending').length;
  const approvedCount = withdrawals.filter(w => w.status === 'approved').length;
  const totalPaidBdt = withdrawals
    .filter(w => w.status === 'approved')
    .reduce((sum, w) => sum + (w.amountBdt || 0), 0);

  const filtered = withdrawals.filter(item => {
    const matchFilter = filter === 'all' || item.status === filter;
    const matchQuery = 
      item.accountNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.userEmail && item.userEmail.toLowerCase().includes(searchQuery.toLowerCase())) ||
      item.method.toLowerCase().includes(searchQuery.toLowerCase());
    return matchFilter && matchQuery;
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAction = async (id: string, status: 'approved' | 'rejected') => {
    setActionInProgressId(id);
    try {
      const note = adminNotes[id] || '';
      await onUpdateStatus(id, status, note);
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('আপনি কি নিশ্চিত যে এই উত্তোলন রিকোয়েস্টটি সম্পূর্ণ মুছে ফেলতে চান?')) {
      return;
    }
    setActionInProgressId(id);
    try {
      await onDeleteRequest(id);
    } finally {
      setActionInProgressId(null);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header & Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase">মোট রিকোয়েস্ট</p>
            <h3 className="text-2xl font-black text-white mt-1 font-mono">{totalCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-amber-400 font-semibold uppercase">অপেক্ষমাণ (Pending)</p>
            <h3 className="text-2xl font-black text-amber-400 mt-1 font-mono">{pendingCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Clock className="w-5 h-5 animate-pulse" />
          </div>
        </div>

        <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-emerald-400 font-semibold uppercase">মোট পরিশোধিত টাকা</p>
            <h3 className="text-2xl font-black text-emerald-400 mt-1 font-mono">৳ {totalPaidBdt.toLocaleString()}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase">অনুমোদিত রিকোয়েস্ট</p>
            <h3 className="text-2xl font-black text-slate-200 mt-1 font-mono">{approvedCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center">
            <Coins className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* 2. Filters & Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        
        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'all', label: `সবগুলো (${totalCount})` },
            { id: 'pending', label: `অপেক্ষমাণ (${pendingCount})`, badgeColor: 'text-amber-400' },
            { id: 'approved', label: `অনুমোদিত (${approvedCount})`, badgeColor: 'text-emerald-400' },
            { id: 'rejected', label: 'বাতিল' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                filter === tab.id
                  ? 'bg-indigo-600 text-white shadow'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 p-2.5 rounded-xl transition cursor-pointer"
              title="রিফ্রেশ করুন"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="নম্বর বা নাম খুঁজুন..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

      </div>

      {/* 3. Requests Table / Cards */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-500 space-y-2">
            <CreditCard className="w-10 h-10 mx-auto text-slate-600" />
            <p className="text-sm">কোনো উত্তোলন রিকোয়েস্ট পাওয়া যায়নি!</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {filtered.map((item) => {
              const isPending = item.status === 'pending';
              const isApproved = item.status === 'approved';
              const isRejected = item.status === 'rejected';
              const isLoading = actionInProgressId === item.id;

              return (
                <div key={item.id} className="p-5 hover:bg-slate-800/30 transition flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  
                  {/* Left: User & Method Info */}
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-bold text-base text-white">{item.userName || 'ইউজার'}</span>
                      <span className="text-[11px] font-mono text-slate-400">
                        ({item.userEmail || item.userId.slice(-8)})
                      </span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                        item.method === 'bkash' 
                          ? 'bg-pink-950/40 text-pink-300 border-pink-500/30' 
                          : item.method === 'nagad'
                            ? 'bg-orange-950/40 text-orange-300 border-orange-500/30'
                            : item.method === 'rocket'
                              ? 'bg-purple-950/40 text-purple-300 border-purple-500/30'
                              : 'bg-cyan-950/40 text-cyan-300 border-cyan-500/30'
                      }`}>
                        {item.method.toUpperCase()}
                      </span>

                      {/* Status */}
                      {isPending && (
                        <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Clock className="w-3 h-3" /> অপেক্ষমাণ
                        </span>
                      )}
                      {isApproved && (
                        <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> পরিশোধিত
                        </span>
                      )}
                      {isRejected && (
                        <span className="text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <XCircle className="w-3 h-3" /> বাতিল
                        </span>
                      )}
                    </div>

                    {/* Account Number with Copy Button */}
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-400">একাউন্ট/মোবাইল:</span>
                      <span className="font-mono font-bold text-amber-300 bg-slate-950 px-2.5 py-0.5 rounded-lg border border-slate-800">
                        {item.accountNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(item.accountNumber, item.id)}
                        className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition cursor-pointer"
                        title="নম্বর কপি করুন"
                      >
                        {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-500 font-mono text-[11px]">{item.date}</span>
                    </div>

                    {item.note && (
                      <p className="text-xs text-slate-400 italic bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800 inline-block">
                        নোট: {item.note}
                      </p>
                    )}
                  </div>

                  {/* Center: Amount & Points */}
                  <div className="text-left lg:text-right shrink-0">
                    <div className="text-xl font-black text-emerald-400 font-mono">
                      ৳ {item.amountBdt} BDT
                    </div>
                    <div className="text-xs text-amber-400 font-mono">
                      {item.points.toLocaleString()} কয়েন
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto shrink-0">
                    
                    {/* Optional Note input for Transaction ID */}
                    {isPending && (
                      <input
                        type="text"
                        placeholder="TrxID বা নোট (ঐচ্ছিক)"
                        value={adminNotes[item.id] || ''}
                        onChange={(e) => setAdminNotes(prev => ({ ...prev, [item.id]: e.target.value }))}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 w-36"
                      />
                    )}

                    {isPending && (
                      <>
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => handleAction(item.id, 'approved')}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow cursor-pointer"
                        >
                          {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                          <span>পেমেন্ট অনুমোদন (Approve)</span>
                        </button>

                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => handleAction(item.id, 'rejected')}
                          className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>বাতিল ও রিফান্ড</span>
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleDelete(item.id)}
                      className="text-slate-500 hover:text-rose-400 p-2 rounded-xl hover:bg-slate-800 transition cursor-pointer"
                      title="মুছে ফেলুন"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
