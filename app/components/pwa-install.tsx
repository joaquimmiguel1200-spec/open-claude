'use client'

import { useEffect, useState } from 'react'

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }> }

export function PwaInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [showIosHelp, setShowIosHelp] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone) {
      setInstalled(true)
    }
    const onPrompt = (event: Event) => {
      event.preventDefault()
      setPromptEvent(event as InstallPromptEvent)
    }
    const onInstalled = () => { setInstalled(true); setPromptEvent(null) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (installed) return null
  if (!promptEvent && !showIosHelp) return <button type="button" className="pwa-install-link" onClick={() => setShowIosHelp(true)} aria-label="Como instalar o Open Claude como aplicativo">Instalar aplicativo</button>

  async function install() {
    if (!promptEvent) { setShowIosHelp(true); return }
    await promptEvent.prompt()
    const choice = await promptEvent.userChoice
    if (choice.outcome === 'accepted') setPromptEvent(null)
  }

  return <div className="pwa-install-banner" role="region" aria-label="Instalar Open Claude">
    <img src="/icon.svg" alt="" width="36" height="36" />
    <div className="pwa-install-copy"><strong>Open Claude como aplicativo</strong><span>Adicione à tela inicial para abrir em uma janela própria.</span>{showIosHelp && <span>No iPhone/iPad: toque em Compartilhar e depois em “Adicionar à Tela de Início”. No Android/desktop, use o menu do navegador se o botão de instalação não aparecer.</span>}</div>
    {promptEvent && <button type="button" className="button compact" onClick={install}>Instalar</button>}
    <button type="button" className="pwa-install-close" onClick={() => { setShowIosHelp(false); setPromptEvent(null) }} aria-label="Fechar">×</button>
  </div>
}
