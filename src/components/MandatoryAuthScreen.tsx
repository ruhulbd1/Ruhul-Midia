import React, { useState } from 'react';
import { 
  UserCheck, 
  Mail, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  Sparkles, 
  ShieldCheck, 
  Coins, 
  ArrowRight, 
  Tv, 
  AlertCircle,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  setPersistence,
  browserLocalPersistence
} from '../firebase';
import { User as FirebaseUser } from 'firebase/auth';

interface MandatoryAuthScreenProps {
  onAuthSuccess: (user: FirebaseUser) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  isAndroidWebView?: boolean;
  isTelegram?: boolean;
  telegramUser?: { id: number; first_name: string; last_name?: string; username?: string; photo_url?: string } | null;
}

export const MandatoryAuthScreen: React.FC<MandatoryAuthScreenProps> = ({
  onAuthSuccess,
  showToast,
  isAndroidWebView = false,
  isTelegram = false,
  telegramUser = null
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // 1. Google 1-Click Sign-In
  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      try {
        await setPersistence(auth, browserLocalPersistence);
      } catch {}

      const res = await signInWithPopup(auth, googleProvider);
      if (res && res.user) {
        showToast(`স্বাগতম ${res.user.displayName || 'ইউজার'}! সফলভাবে লগইন হয়েছে।`, 'success');
        onAuthSuccess(res.user);
      }
    } catch (err: any) {
      console.warn('Google sign-in notice:', err);
      if (err?.code === 'auth/popup-closed-by-user') {
        setErrorMessage('লগইন পপআপ বন্ধ করা হয়েছে। পুনরায় চেষ্টা করুন।');
      } else if (err?.code === 'auth/disallowed-useragent' || isAndroidWebView) {
        // Fallback for Android WebView if Google restricts embedded popup
        handleApkDirectLogin();
      } else {
        setErrorMessage('গুগল লগইন সম্পন্ন করতে সমস্যা হয়েছে। ইমেইল ও পাসওয়ার্ড দিয়ে চেষ্টা করুন।');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Email & Password Sign-In / Register
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanEmail = email.trim();
    const cleanPass = password.trim();

    if (!cleanEmail || !cleanPass) {
      setErrorMessage('অনুগ্রহ করে ইমেইল এবং পাসওয়ার্ড পূরণ করুন।');
      return;
    }

    if (cleanPass.length < 6) {
      setErrorMessage('পাসওয়ার্ড ন্যূনতম ৬ অক্ষরের হতে হবে।');
      return;
    }

    try {
      setIsLoading(true);
      try {
        await setPersistence(auth, browserLocalPersistence);
      } catch {}

      if (authMode === 'register') {
        const cleanName = name.trim() || 'ইউজার';
        const cred = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPass);
        if (cred.user) {
          try {
            await updateProfile(cred.user, { displayName: cleanName });
          } catch {}
          showToast(`অভিনন্দন ${cleanName}! অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে।`, 'success');
          onAuthSuccess({ ...cred.user, displayName: cleanName });
        }
      } else {
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
        if (cred.user) {
          showToast(`স্বাগতম ${cred.user.displayName || 'ইউজার'}! সফলভাবে লগইন হয়েছে।`, 'success');
          onAuthSuccess(cred.user);
        }
      }
    } catch (err: any) {
      console.error('Email auth error:', err);
      const code = err?.code;
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setErrorMessage('ভুল ইমেইল বা পাসওয়ার্ড! অনুগ্রহ করে সঠিক তথ্য দিন।');
      } else if (code === 'auth/email-already-in-use') {
        setErrorMessage('এই ইমেইলে ইতিমধ্যেই অ্যাকাউন্ট আছে। "লগইন" অপশন ব্যবহার করুন।');
      } else if (code === 'auth/invalid-email') {
        setErrorMessage('সঠিক ইমেইল ঠিকানা দিন (যেমন: name@gmail.com)।');
      } else if (code === 'auth/weak-password') {
        setErrorMessage('পাসওয়ার্ডটি দুর্বল। কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড দিন।');
      } else {
        setErrorMessage('লগইন ব্যর্থ হয়েছে। পুনরায় চেষ্টা করুন বা গুগল লগইন ব্যবহার করুন।');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Fallback for Android WebView & Telegram
  const handleApkDirectLogin = () => {
    const promptName = window.prompt('আপনার নাম বা মোবাইল নাম্বার দিন:', name || 'ইউজার');
    if (promptName && promptName.trim()) {
      const clean = promptName.trim();
      const fakeUser = {
        uid: `apk_user_${Date.now()}`,
        displayName: clean,
        email: clean.includes('@') ? clean : `${clean}@ruhulmidia.local`,
        photoURL: null
      } as unknown as FirebaseUser;
      showToast(`স্বাগতম ${clean}! APK সেশন সফলভাবে যুক্ত হয়েছে।`, 'success');
      onAuthSuccess(fakeUser);
    }
  };

  const handleTelegramDirectLogin = () => {
    if (telegramUser) {
      const tgName = telegramUser.first_name + (telegramUser.last_name ? ' ' + telegramUser.last_name : '');
      const fakeUser = {
        uid: `tg_${telegramUser.id}`,
        displayName: tgName,
        email: telegramUser.username ? `${telegramUser.username}@telegram.org` : null,
        photoURL: telegramUser.photo_url || null
      } as unknown as FirebaseUser;
      showToast(`স্বাগতম ${tgName}! টেলিগ্রাম অ্যাকাউন্টে প্রবেশ সম্পন্ন।`, 'success');
      onAuthSuccess(fakeUser);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center p-4 overflow-y-auto font-sans select-none">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative z-10 space-y-6 animate-slideUp">
        
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white mx-auto shadow-xl shadow-indigo-600/30">
            <Tv className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            RUHUL MIDIA
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            ভিডিও শেয়ারিং এবং অ্যাড ম্যানেজমেন্ট প্ল্যাটফর্ম
          </p>
          <div className="inline-flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs px-3 py-1 rounded-full font-medium mt-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>লগইন করে +৫০ কয়েন বোনাস নিন</span>
          </div>
        </div>

        {/* 1. Fast Google Sign-In Button */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full bg-white hover:bg-slate-100 text-slate-900 font-bold py-3.5 px-4 rounded-2xl transition duration-200 flex items-center justify-center gap-3 shadow-lg cursor-pointer active:scale-98 disabled:opacity-50 text-sm"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Google দিয়ে সরাসরি প্রবেশ করুন</span>
          </button>

          {/* Telegram Login Option (when in Telegram or available) */}
          {telegramUser && (
            <button
              type="button"
              onClick={handleTelegramDirectLogin}
              className="w-full bg-[#2AABEE] hover:bg-[#229ED9] text-white font-bold py-3 px-4 rounded-2xl transition flex items-center justify-center gap-2.5 shadow-md cursor-pointer text-sm"
            >
              <UserCheck className="w-4 h-4" />
              <span>টেলিগ্রাম অ্যাকাউন্ট দিয়ে প্রবেশ করুন (@{telegramUser.username || telegramUser.first_name})</span>
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-slate-800 w-full" />
          <span className="bg-slate-900 px-3 text-xs text-slate-500 font-medium uppercase tracking-wider">
            অথবা Gmail / পাসওয়ার্ড দিয়ে
          </span>
          <div className="border-t border-slate-800 w-full" />
        </div>

        {/* Error Notice */}
        {errorMessage && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 2. Email & Password Form */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          
          {authMode === 'register' && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-400" />
                <span>আপনার পুরো নাম:</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="যেমন: রুহুল আমিন"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-indigo-400" />
              <span>ইমেইল বা Gmail ঠিকানা:</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="example@gmail.com"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-indigo-400" />
              <span>পাসওয়ার্ড:</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="কমপক্ষে ৬ অক্ষর"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3 px-4 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer active:scale-98 disabled:opacity-50 text-sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>যাচাই করা হচ্ছে...</span>
              </>
            ) : (
              <>
                <span>{authMode === 'login' ? 'লগইন করুন' : 'অ্যাকাউন্ট তৈরি করুন'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Toggle Login vs Register */}
        <div className="text-center pt-1 border-t border-slate-800/80">
          {authMode === 'login' ? (
            <p className="text-xs text-slate-400">
              নতুন ইউজার?{' '}
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setErrorMessage('');
                }}
                className="text-indigo-400 hover:text-indigo-300 font-bold underline cursor-pointer"
              >
                এখানে অ্যাকাউন্ট তৈরি করুন
              </button>
            </p>
          ) : (
            <p className="text-xs text-slate-400">
              ইতিমধ্যেই অ্যাকাউন্ট আছে?{' '}
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setErrorMessage('');
                }}
                className="text-indigo-400 hover:text-indigo-300 font-bold underline cursor-pointer"
              >
                সরাসরি লগইন করুন
              </button>
            </p>
          )}
        </div>

        {/* Security & Benefits Badges */}
        <div className="grid grid-cols-3 gap-2 pt-2 text-[11px] text-slate-400">
          <div className="flex flex-col items-center text-center p-2 rounded-xl bg-slate-950/60 border border-slate-800/60">
            <Coins className="w-4 h-4 text-amber-400 mb-1" />
            <span>কয়েন উপার্জন</span>
          </div>
          <div className="flex flex-col items-center text-center p-2 rounded-xl bg-slate-950/60 border border-slate-800/60">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 mb-1" />
            <span>বিকাশ/নগদ ক্যাশআউট</span>
          </div>
          <div className="flex flex-col items-center text-center p-2 rounded-xl bg-slate-950/60 border border-slate-800/60">
            <ShieldCheck className="w-4 h-4 text-indigo-400 mb-1" />
            <span>ক্লাউড ব্যালেন্স সুরক্ষা</span>
          </div>
        </div>

      </div>
    </div>
  );
};
export default MandatoryAuthScreen;
