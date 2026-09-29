'use client';

const DEFAULT_HINT = 'Set NEXT_PUBLIC_PAYPAL_ME_URL to enable tips';

export default function Footer() {
  const paypalMeUrl = (process.env.NEXT_PUBLIC_PAYPAL_ME_URL || '').trim();
  const hasLink =
    !!paypalMeUrl &&
    !paypalMeUrl.toLowerCase().includes('your_') &&
    !paypalMeUrl.toLowerCase().includes('placeholder') &&
    /^https?:\/\//i.test(paypalMeUrl);

  return (
    <footer className="mt-8 border-t border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex flex-col items-stretch sm:items-center gap-4 sm:gap-3 text-center">
          <p className="text-sm text-gray-500 leading-relaxed">
            © {new Date().getFullYear()} Belevdere — short-term rentals, supplies & meals
          </p>

          {hasLink ? (
            <a
              href={paypalMeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full sm:w-auto
                min-h-[48px] px-5 py-3 rounded-xl
                bg-[#0070ba] text-white font-semibold text-sm sm:text-base
                hover:bg-[#005ea6] active:bg-[#004c87]
                transition-colors touch-manipulation shadow-sm"
            >
              <span aria-hidden>💙</span>
              <span>Support us on PayPal</span>
            </a>
          ) : (
            <div
              className="w-full sm:w-auto min-h-[44px] px-4 py-3 rounded-xl border border-dashed
                border-gray-300 bg-gray-50 text-gray-400 text-xs sm:text-sm
                flex items-center justify-center gap-2"
              title={DEFAULT_HINT}
            >
              <span aria-hidden>🅿️</span>
              <span>PayPal tips — configure NEXT_PUBLIC_PAYPAL_ME_URL</span>
            </div>
          )}

          <p className="text-[11px] sm:text-xs text-gray-400 max-w-md mx-auto leading-snug px-1">
            Checkout supports Stripe and PayPal. Without live keys, payments run in demo mode.
          </p>
        </div>
      </div>
    </footer>
  );
}
