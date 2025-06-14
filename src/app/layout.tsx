import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'VideoVault - Download Videos from Any Platform',
  description: 'Fast, free, and secure video downloader supporting YouTube, TikTok, Instagram, Facebook, Twitter, and more. No registration required.',
  keywords: 'video downloader, YouTube downloader, TikTok downloader, Instagram downloader, social media downloader',
  authors: [{ name: 'VideoVault' }],
  creator: 'VideoVault',
  publisher: 'VideoVault',
  robots: 'index, follow',
  openGraph: {
    title: 'VideoVault - Download Videos from Any Platform',
    description: 'Fast, free, and secure video downloader supporting YouTube, TikTok, Instagram, Facebook, Twitter, and more.',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VideoVault - Download Videos from Any Platform',
    description: 'Fast, free, and secure video downloader supporting YouTube, TikTok, Instagram, Facebook, Twitter, and more.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body className="font-sans" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}