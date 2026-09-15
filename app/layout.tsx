import type { Metadata } from 'next'
import './globals.css'
import { Analytics, PrivacyBanner } from './components/privacy'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://open-claude.vercel.app'),
  title: { default: 'Open Claude — Seu agente de IA pessoal', template: '%s — Open Claude' },
  description: 'Um agente de IA pessoal para conversar, trabalhar em projetos, usar ferramentas, arquivos, memória, GitHub, MCP e Cowork.',
  applicationName: 'Open Claude',
  openGraph: { title: 'Open Claude', description: 'Seu agente de IA pessoal.', type: 'website', images: ['/og-image.svg'] },
  twitter: { card: 'summary_large_image', title: 'Open Claude', description: 'Seu agente de IA pessoal.', images: ['/og-image.svg'] },
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}<PrivacyBanner /><Analytics /></body></html>
}
