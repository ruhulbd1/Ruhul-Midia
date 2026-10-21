import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ExternalLink, 
  Sparkles, 
  X, 
  CheckCircle, 
  Tv, 
  Tv2, 
  Eye, 
  EyeOff, 
  Layers
} from 'lucide-react';

export interface AdSettings {
  topAdEnabled: boolean;
  topAdCode: string;
  feedAdEnabled: boolean;
  feedAdCode: string;
  popunderAdEnabled?: boolean;
  popunderAdCode?: string;
  socialBarAdEnabled?: boolean;
  socialBarAdCode?: string;
}

export interface ParsedAdResult {
  type: 'direct_url' | 'script' | 'html' | 'empty';
  url?: string;
  code: string;
}

/**
 * Auto-detect whether admin entered a plain Direct URL, an HTML <script> tag, or custom HTML snippet.
 */
export function parseAdContent(raw: string): ParsedAdResult {
  if (!raw || !raw.trim()) {
    return { type: 'empty', code: '' };
  }
  const trimmed = raw.trim();

  // 1. Script tag check (takes priority if <script is inside)
  if (/<script[\s\S]*?>/i.test(trimmed)) {
    return { type: 'script', code: trimmed };
  }

  // 2. Check if wrapped in an <a> tag pointing to an ad link
  const aTagMatch = trimmed.match(/^<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>$/i);
  if (aTagMatch && aTagMatch[1]) {
    let url = aTagMatch[1].trim();
    if (url.startsWith('//')) url = 'https:' + url;
    return { type: 'direct_url', url, code: trimmed };
  }

  // 3. Check if contains HTML tags other than plain text
  const hasHtml = /<[a-z][\s\S]*>/i.test(trimmed);
  if (!hasHtml) {
    let url = trimmed;
    if (url.startsWith('//')) {
      url = 'https:' + url;
    } else if (!url.startsWith('http://') && !url.startsWith('https://')) {
      if (
        url.includes('.') && 
        !url.includes(' ') && 
        (url.includes('/') || /\.(com|net|org|xyz|link|top|online|site|io|me|info|biz|club|vip|co|in|live|store)($|\/)/i.test(url))
      ) {
        url = 'https://' + url;
      }
    }

    if (/^https?:\/\/[^\s]+$/i.test(url)) {
      return { type: 'direct_url', url, code: trimmed };
    }
  }

  // 4. Default to HTML snippet
  return { type: 'html', code: trimmed };
}

/**
 * Executes <script> tags dynamically by injecting real DOM script elements.
 */
export function ScriptAdSlot({ code, className = '' }: { code: string; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !code) return;

    const container = containerRef.current;
    container.innerHTML = '';

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = code;

    const scripts = tempDiv.querySelectorAll('script');

    // Append non-script nodes first
    Array.from(tempDiv.childNodes).forEach(node => {
      if (node.nodeName.toLowerCase() !== 'script') {
        container.appendChild(node.cloneNode(true));
      }
    });

    // Execute scripts
    scripts.forEach(oldScript => {
      const newScript = document.createElement('script');
      Array.from(oldScript.attributes).forEach(attr => {
        newScript.setAttribute(attr.name, attr.value);
      });
      if (oldScript.innerHTML) {
        newScript.text = oldScript.innerHTML;
      }
      container.appendChild(newScript);
    });

    return () => {
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [code]);

  return <div ref={containerRef} className={`w-full overflow-hidden ${className}`} />;
}

/**
 * Universal Ad Slot for Top Banner or In-Feed.
 * Automatically handles Direct URLs (Clickable Card + Responsive Iframe) and Scripts/HTML.
 */
export function UniversalAdSlot({ 
  placement, 
  code, 
  enabled 
}: { 
  placement: 'top' | 'feed'; 
  code: string; 
  enabled: boolean; 
}) {
  const [showIframeEmbed, setShowIframeEmbed] = useState(false);
  const parsed = useMemo(() => parseAdContent(code), [code]);

  if (!enabled || !code || !code.trim() || parsed.type === 'empty') {
    return null;
  }

  // CASE 1: DIRECT URL
  if (parsed.type === 'direct_url' && parsed.url) {
    const url = parsed.url;
    let hostname = 'Sponsor Link';
    try {
      hostname = new URL(url).hostname;
    } catch {
      hostname = 'Direct Sponsor URL';
    }

    if (placement === 'top') {
      return (
        <div className="max-w-7xl mx-auto w-full px-4 pt-4">
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border-2 border-indigo-500/40 hover:border-indigo-400 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-xl transition-all duration-300">
            <div className="absolute -top-10 -right-10 w-28 h-28 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              {/* Clickable Banner Area */}
              <a 
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3.5 flex-1 min-w-0 group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-600/30 group-hover:scale-105 transition-transform">
                  <Sparkles className="w-6 h-6 animate-pulse text-amber-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded-md border border-indigo-400/30">
                      স্পনসর বিজ্ঞাপন / Sponsored Ad
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono truncate max-w-[220px]">
                      {hostname}
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-indigo-300 transition-colors mt-1">
                    স্পন্সর অফার দেখতে এখানে ক্লিক করুন (Click Here to Visit Ad / Sponsor)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                    আমাদের স্পন্সর পার্টনার সাইটে যেতে লিংকে চাপ দিন (নতুন ট্যাবে ওপেন হবে)
                  </p>
                </div>
              </a>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setShowIframeEmbed(prev => !prev)}
                  title="আইফ্রেম প্রিভিউ টগল করুন"
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-2.5 rounded-xl text-xs font-medium border border-slate-700 transition cursor-pointer flex items-center gap-1.5"
                >
                  {showIframeEmbed ? <EyeOff className="w-3.5 h-3.5 text-slate-400" /> : <Eye className="w-3.5 h-3.5 text-indigo-400" />}
                  <span>{showIframeEmbed ? 'আইফ্রেম লুকান' : 'আইফ্রেম ভিউ'}</span>
                </button>

                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-initial bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap group"
                >
                  <span>ভিজিট করুন / Visit</span>
                  <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </a>
              </div>
            </div>

            {/* Responsive Iframe Embed Preview */}
            {showIframeEmbed && (
              <div className="mt-4 pt-4 border-t border-slate-800/80">
                <div className="text-[10px] text-slate-400 mb-1.5 flex items-center justify-between">
                  <span>রেসপনসিভ আইফ্রেম এম্বেড (Responsive Iframe Embed):</span>
                  <span className="text-emerald-400 font-mono text-[10px]">Embedded Frame</span>
                </div>
                <div className="w-full h-32 sm:h-44 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner">
                  <iframe
                    src={url}
                    title="Top Sponsor Frame"
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                    loading="lazy"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    // In-Feed Direct URL card
    return (
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border-2 border-indigo-500/40 hover:border-indigo-400 rounded-2xl overflow-hidden p-6 flex flex-col justify-between text-center relative shadow-xl hover:shadow-2xl transition duration-300 group">
        <span className="absolute top-3 right-3 text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded uppercase tracking-wider font-bold">
          Sponsored
        </span>
        
        <div className="flex flex-col items-center justify-center my-auto py-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mb-3 shadow-inner group-hover:scale-105 transition-transform">
            <Sparkles className="w-7 h-7 text-amber-400 animate-pulse" />
          </div>
          
          <h4 className="font-bold text-base text-white group-hover:text-indigo-300 transition-colors">
            স্পন্সর বিজ্ঞাপন ও বিশেষ অফার
          </h4>
          <p className="text-xs text-slate-400 mt-1 font-mono truncate max-w-xs">
            {hostname}
          </p>
          <p className="text-xs text-slate-300 mt-2 max-w-xs leading-relaxed">
            বিজ্ঞাপন দেখতে এবং স্পন্সর অফার গ্রহণ করতে নিচের বাটনে ক্লিক করুন।
          </p>
        </div>

        <div className="space-y-2 mt-4 pt-3 border-t border-slate-800/80">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Click Here to Visit Ad / Sponsor</span>
            <ExternalLink className="w-4 h-4" />
          </a>

          <button
            type="button"
            onClick={() => setShowIframeEmbed(prev => !prev)}
            className="text-[11px] text-slate-400 hover:text-slate-200 transition underline cursor-pointer flex items-center justify-center gap-1 mx-auto"
          >
            {showIframeEmbed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3 text-indigo-400" />}
            <span>{showIframeEmbed ? 'আইফ্রেম বন্ধ করুন' : 'আইফ্রেম (iframe) প্রিভিউ দেখুন'}</span>
          </button>

          {showIframeEmbed && (
            <div className="w-full h-36 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 mt-2">
              <iframe
                src={url}
                title="Feed Sponsor Frame"
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                loading="lazy"
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // CASE 2: SCRIPT TAG
  if (parsed.type === 'script') {
    if (placement === 'top') {
      return (
        <div className="max-w-7xl mx-auto w-full px-4 pt-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 relative overflow-hidden shadow-inner">
            <span className="absolute top-1 right-2 text-[9px] text-slate-500 uppercase tracking-widest font-bold">Sponsored Script</span>
            <ScriptAdSlot code={code} className="min-h-[60px] flex items-center justify-center" />
          </div>
        </div>
      );
    }
    return (
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden p-6 flex flex-col justify-center items-center text-center relative shadow-inner hover:border-slate-700 transition duration-300">
        <span className="absolute top-3 right-3 text-[9px] text-slate-500 uppercase tracking-widest font-bold">Sponsored Script</span>
        <ScriptAdSlot code={code} className="min-h-[200px] flex items-center justify-center w-full" />
      </div>
    );
  }

  // CASE 3: CUSTOM HTML
  if (placement === 'top') {
    return (
      <div className="max-w-7xl mx-auto w-full px-4 pt-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 relative overflow-hidden shadow-inner">
          <span className="absolute top-1 right-2 text-[9px] text-slate-500 uppercase tracking-widest font-bold">Sponsored</span>
          <div 
            className="w-full flex items-center justify-center min-h-[60px]"
            dangerouslySetInnerHTML={{ __html: code }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden p-6 flex flex-col justify-center items-center text-center relative shadow-inner hover:border-slate-700 transition duration-300">
      <span className="absolute top-3 right-3 text-[9px] text-slate-500 uppercase tracking-widest font-bold">Sponsored</span>
      <div 
        className="w-full h-full min-h-[220px] flex items-center justify-center"
        dangerouslySetInnerHTML={{ __html: code }}
      />
    </div>
  );
}

/**
 * Floating Social Bar Ad.
 * Displays as an engaging notification bar fixed at the bottom.
 * If Direct URL: Clickable card that opens link in new tab.
 * If Script: Executes dynamic script.
 */
export function SocialBarAd({ 
  code, 
  enabled 
}: { 
  code: string; 
  enabled: boolean; 
}) {
  const [isDismissed, setIsDismissed] = useState(false);
  const parsed = useMemo(() => parseAdContent(code), [code]);

  if (!enabled || !code || !code.trim() || isDismissed || parsed.type === 'empty') {
    return null;
  }

  if (parsed.type === 'direct_url' && parsed.url) {
    let hostname = 'Sponsor';
    try {
      hostname = new URL(parsed.url).hostname;
    } catch {
      hostname = 'Direct Sponsor';
    }

    return (
      <aside 
        aria-label="Sponsor notification"
        className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-40 transition-all duration-300"
      >
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-2 border-indigo-500/60 hover:border-indigo-400 rounded-2xl p-4 shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 text-white group">
          <a
            href={parsed.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center shrink-0 text-amber-400 shadow-md group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30">
                  সোশ্যাল বার / স্পন্সর
                </span>
                <span className="text-[10px] text-slate-400 font-mono truncate">{hostname}</span>
              </div>
              <p className="text-xs font-semibold text-slate-100 truncate mt-0.5 group-hover:text-indigo-300 transition">
                বিশেষ অফার ও স্পন্সর সাইট দেখুন! (Click Here)
              </p>
            </div>
          </a>

          <div className="flex items-center gap-1.5 shrink-0">
            <a
              href={parsed.url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition shadow flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <span>ভিজিট</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <button
              onClick={() => setIsDismissed(true)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              title="বন্ধ করুন"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    );
  }

  // Script or custom HTML Social Bar
  return (
    <aside 
      aria-label="Sponsor widget"
      className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-40"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2.5 relative shadow-2xl">
        <button
          onClick={() => setIsDismissed(true)}
          className="absolute -top-2 -right-2 bg-slate-800 text-slate-400 hover:text-white p-1 rounded-full border border-slate-700 z-10 cursor-pointer shadow"
          title="বন্ধ করুন"
        >
          <X className="w-3.5 h-3.5" />
        </button>
        <ScriptAdSlot code={code} />
      </div>
    </aside>
  );
}

/**
 * Custom Hook for Popunder Ads.
 * If Direct URL: Listens for user click/tap gesture and opens URL in a new tab.
 * If Script: Injects the script tag into document.head.
 */
export function usePopunderAd(
  enabled: boolean | undefined, 
  code: string | undefined, 
  isActiveView: boolean
) {
  useEffect(() => {
    if (!isActiveView || !enabled || !code || !code.trim()) {
      return;
    }

    const parsed = parseAdContent(code);

    if (parsed.type === 'direct_url' && parsed.url) {
      const popunderUrl = parsed.url;
      let hasTriggered = false;

      const triggerPopunder = () => {
        if (hasTriggered) return;
        hasTriggered = true;
        try {
          const win = window.open(popunderUrl, '_blank', 'noopener,noreferrer');
          if (win) {
            win.blur();
            window.focus();
          }
        } catch (e) {
          console.warn('Popunder open error:', e);
        }
        window.removeEventListener('click', triggerPopunder);
        window.removeEventListener('touchend', triggerPopunder);
      };

      window.addEventListener('click', triggerPopunder, { once: true });
      window.addEventListener('touchend', triggerPopunder, { once: true });

      return () => {
        window.removeEventListener('click', triggerPopunder);
        window.removeEventListener('touchend', triggerPopunder);
      };
    } else if (parsed.type === 'script') {
      const scriptEl = document.createElement('script');
      const srcMatch = code.match(/src=["']([^"']+)["']/i);
      if (srcMatch && srcMatch[1]) {
        scriptEl.src = srcMatch[1];
        scriptEl.async = true;
        document.head.appendChild(scriptEl);
        return () => {
          try {
            document.head.removeChild(scriptEl);
          } catch {}
        };
      }
    }
  }, [enabled, code, isActiveView]);
}

/**
 * Helper to display auto-detection badge in the Admin Panel.
 */
export function renderDetectionBadge(code: string) {
  const parsed = parseAdContent(code);
  if (parsed.type === 'empty') return null;

  if (parsed.type === 'direct_url') {
    return (
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
        <CheckCircle className="w-3.5 h-3.5 shrink-0" />
        <span>সরাসরি লিংক সনাক্ত হয়েছে (Direct URL Detected): ক্লিকযোগ্য ব্যানার কার্ড এবং আইফ্রেম তৈরি হবে</span>
      </div>
    );
  }

  if (parsed.type === 'script') {
    return (
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-purple-400 bg-purple-950/60 border border-purple-500/30 px-2.5 py-1 rounded-lg">
        <Sparkles className="w-3.5 h-3.5 shrink-0" />
        <span>জাভাস্ক্রিপ্ট স্ক্রিপ্ট সনাক্ত হয়েছে (&lt;script&gt; Tag): ব্রাউজারে রিয়েল-টাইমে এক্সিকিউট হবে</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-sky-400 bg-sky-950/60 border border-sky-500/30 px-2.5 py-1 rounded-lg">
      <Tv className="w-3.5 h-3.5 shrink-0" />
      <span>কাস্টম HTML কোড সনাক্ত হয়েছে (Custom HTML Snippet)</span>
    </div>
  );
}

/**
 * Interactive preview card for the Admin Panel.
 */
export function AdLivePreviewCard({ 
  code, 
  title, 
  placement = 'banner' 
}: { 
  code: string; 
  title: string; 
  placement?: 'banner' | 'feed' | 'popunder' | 'social'; 
}) {
  const parsed = useMemo(() => parseAdContent(code), [code]);

  if (!code || parsed.type === 'empty') {
    return (
      <div className="bg-slate-950 p-4 border border-slate-800 rounded-xl text-center">
        <span className="text-slate-600 text-xs italic">কোনো প্রিভিউ উপলব্ধ নেই (এড কোড বা লিংক খালি)</span>
      </div>
    );
  }

  if (parsed.type === 'direct_url' && parsed.url) {
    let hostname = 'Sponsor Link';
    try {
      hostname = new URL(parsed.url).hostname;
    } catch {
      hostname = 'Direct Link';
    }

    return (
      <div className="bg-slate-950 p-4 border border-slate-800 rounded-xl space-y-3">
        <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          <span className="flex items-center gap-1">
            <Tv2 className="w-3 h-3 text-indigo-400" /> {title} লাইভ প্রিভিউ
          </span>
          <span className="text-emerald-400">Direct Link</span>
        </div>

        <div className="bg-slate-900 border border-indigo-500/30 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0 w-full sm:w-auto">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center shrink-0 text-amber-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">Click Here to Visit Ad / Sponsor</p>
              <p className="text-[10px] text-slate-400 font-mono truncate">{hostname}</p>
            </div>
          </div>

          <a
            href={parsed.url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition shadow flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
          >
            <span>টেস্ট ওপেন (New Tab)</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-950 p-4 border border-slate-800 rounded-xl space-y-2">
      <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
        <span className="flex items-center gap-1">
          <Layers className="w-3 h-3 text-indigo-400" /> {title} লাইভ প্রিভিউ
        </span>
        <span className="text-purple-400 font-mono">HTML/Script</span>
      </div>
      <div className="text-center overflow-auto max-h-36 text-xs p-2 bg-slate-900/50 rounded-lg">
        {parsed.type === 'script' ? (
          <ScriptAdSlot code={code} />
        ) : (
          <div dangerouslySetInnerHTML={{ __html: code }} />
        )}
      </div>
    </div>
  );
}
