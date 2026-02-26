import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Belevdere - Short-Term Rentals',
  description: 'Find and book the perfect rental with supplies, meals, and equipment',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
