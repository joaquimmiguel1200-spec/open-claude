import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Analytics, PrivacyBanner } from './components/privacy'
import { PwaInstallPrompt } from './components/pwa-install'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://open-claude.vercel.app'),
  title: { default: 'Open Claude — Seu AI workspace completo', template: '%s — Open Claude' },
  description: 'Seu AI workspace completo para conversar, desenvolver, colaborar e criar com modelos, agentes, skills e ferramentas.',
  applicationName: 'Open Claude',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Open Claude' },
  icons: { icon: [{ url: '/icon.svg?v=20261117', type: 'image/svg+xml' }], apple: [{ url: '/icon.svg?v=20261117', type: 'image/svg+xml' }], shortcut: ['/icon.svg?v=20261117'] },
  openGraph: { title: 'Open Claude', description: 'Seu AI workspace completo.', type: 'website', images: ['/og-image.svg'] },
  twitter: { card: 'summary_large_image', title: 'Open Claude', description: 'Seu AI workspace completo.', images: ['/og-image.svg'] },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = { themeColor: '#080d1b', colorScheme: 'dark' }\n\nexport default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}<PwaInstallPrompt /><PrivacyBanner /><Analytics /></body></html>
}
