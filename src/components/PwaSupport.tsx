'use client';

import { useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const DISMISS_KEY = 'bv_install_dismissed';

/** Registers the service worker (production only) and offers an unobtrusive install hint. */
export default function PwaSupport() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
    }
    let dismissed = false;
    try { dismissed = localStorage.getItem(DISMISS_KEY) === '1'; } catch {}
    const standalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (dismissed || standalone) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    const ua = navigator.userAgent;
    if (/iphone|ipad|ipod/i.test(ua) && /safari/i.test(ua) && !/crios|fxios/i.test(ua)) setShowIosHint(true);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  const dismiss = () => {
    setDeferred(null);
    setShowIosHint(false);
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch {}
  };

  if (!deferred && !showIosHint) return null;

  return (
    <div
      role="region"
      aria-label="Install app"
      className="fixed left-3 right-20 sm:left-auto sm:right-24 sm:max-w-sm bottom-5 sm:bottom-6 z-40 bg-white border border-indigo-200 shadow-lg rounded-xl p-3 text-sm text-gray-800"
      style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
    >
      {deferred ? (
        <p>Install Belevdere on your home screen for quicker access.</p>
      ) : (
        <p>To install: tap the Share button, then <strong>Add to Home Screen</strong>.</p>
      )}
      <div className="mt-2 flex gap-2 justify-end">
        <button type="button" onClick={dismiss} className="min-h-[44px] px-3 rounded-lg border hover:bg-gray-50">
          Not now
        </button>
        {deferred && (
          <button
            type="button"
            onClick={async () => {
              await deferred.prompt();
              await deferred.userChoice.catch(() => undefined);
              dismiss();
            }}
            className="min-h-[44px] px-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
          >
            Install
          </button>
        )}
      </div>
    </div>
  );
}
