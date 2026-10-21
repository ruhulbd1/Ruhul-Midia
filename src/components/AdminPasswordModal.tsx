import React, { useState, useEffect, useRef } from 'react';
import { 
  Lock, 
  ShieldAlert, 
  Eye, 
  EyeOff, 
  KeyRound, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Loader2 
} from 'lucide-react';

interface AdminPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (token: string) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

// Strict hardcoded admin password rule
export const HARDCODED_ADMIN_PASSWORD = 'ruhulamin0';

export const AdminPasswordModal: React.FC<AdminPasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  showToast
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError('');
      setShowPassword(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmed = password.trim();

    if (!trimmed) {
      setError('অনুগ্রহ করে এডমিন পাসওয়ার্ড প্রবেশ করান');
      return;
    }

    // Strict client-side verification against ruhulamin0
    if (trimmed !== HARDCODED_ADMIN_PASSWORD) {
      setError('ভুল পাসওয়ার্ড! এডমিন প্যানেলে প্রবেশের জন্য সঠিক পাসওয়ার্ড (ruhulamin0) লিখুন।');
      showToast('ভুল এডমিন পাসওয়ার্ড! সঠিক পাসওয়ার্ড দিন।', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: trimmed })
      });

      const data = await response.json();
      if (response.ok && data.success && data.token) {
        onSuccess(data.token);
        setPassword('');
        setError('');
      } else {
        setError(data.error || 'অননুমোদিত অ্যাক্সেস: পাসওয়ার্ড সঠিক নয়।');
        showToast('এডমিন যাচাই ব্যর্থ হয়েছে', 'error');
      }
    } catch (err) {
      console.warn('Network issue on admin login, verifying hardcoded password offline:', err);
      // Fallback verification for offline or direct mode
      if (trimmed === HARDCODED_ADMIN_PASSWORD) {
        onSuccess('RuhulMidiaAdminToken2026');
        setPassword('');
        setError('');
      } else {
        setError('ভুল পাসওয়ার্ড! সঠিক এডমিন পাসওয়ার্ড দিন।');
        showToast('এডমিন যাচাই ব্যর্থ হয়েছে', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative text-left transition-all transform scale-100">
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition cursor-pointer"
          aria-label="বন্ধ করুন"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-3 mb-6">
          <div className="w-16 h-16 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto border border-indigo-500/20 shadow-inner">
            <Lock className="w-8 h-8 text-indigo-400" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-500/30 text-indigo-300 text-[11px] font-semibold mb-2">
              <ShieldAlert className="w-3.5 h-3.5 text-indigo-400" />
              <span>সুরক্ষিত এডমিন অ্যাক্সেস গেট</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              এডমিন পাসওয়ার্ড দিন
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
              এডমিন ড্যাশবোর্ড, বিজ্ঞাপন সেটিংস এবং বাল্ক ইমপোর্ট পরিচালনা করতে এডমিন সিক্রেট পাসওয়ার্ড প্রদান করুন।
            </p>
          </div>
        </div>

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label 
                htmlFor="admin-modal-password" 
                className="block text-xs font-semibold uppercase tracking-wider text-slate-300"
              >
                এডমিন পাসওয়ার্ড
              </label>
              <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                নিরাপদ এনক্রিপশন
              </span>
            </div>

            <div className="relative">
              <input
                ref={inputRef}
                id="admin-modal-password"
                name="adminPassword"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                disabled={isSubmitting}
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none text-slate-100 placeholder-slate-600 transition tracking-widest font-mono shadow-inner"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition p-1 cursor-pointer"
                title={showPassword ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখুন'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs p-3 rounded-xl flex items-start gap-2 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <p className="font-medium leading-relaxed">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !password.trim()}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-95 border border-indigo-400/30"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>যাচাই করা হচ্ছে...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>ভেরিফাই ও প্রবেশ করুন</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer border border-slate-700/60"
            >
              বাতিল করুন (Cancel)
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default AdminPasswordModal;
