import type { Metadata, Viewport } from 'next';
import './globals.css';
import PwaSupport from '@/components/PwaSupport';

export const metadata: Metadata = {
  title: 'Belevdere - Short-Term Rentals',
  description: 'Find and book the perfect rental with supplies, meals, and equipment',
  applicationName: 'Belevdere',
  appleWebApp: { capable: true, title: 'Belevdere', statusBarStyle: 'default' },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#4f46e5',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="overflow-x-hidden antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-white focus:text-indigo-700 focus:px-4 focus:py-2 focus:rounded-lg focus:shadow"
        >
          Skip to main content
        </a>
        {children}
        <PwaSupport />
      </body>
    </html>
  );
}
