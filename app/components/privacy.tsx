'use client'
import Script from 'next/script'
import { useEffect, useState } from 'react'

const CONSENT_KEY = 'open-claude-analytics-consent'

export function PrivacyBanner() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    try { setVisible(localStorage.getItem(CONSENT_KEY) === null) } catch { setVisible(false) }
  }, [])
  function choose(value: 'accepted' | 'rejected') {
    try { localStorage.setItem(CONSENT_KEY, value) } catch {}
    setVisible(false)
  }
  if (!visible) return null
  return <div role="dialog" aria-label="Preferências de privacidade" aria-live="polite" style={{position:'fixed',bottom:16,left:16,right:16,zIndex:50}}>
    <div className="card">
      <strong>Privacidade e cookies</strong>
      <p className="muted">Cookies essenciais mantêm o login e a segurança. Analytics opcional só é ativado se você aceitar; você pode recusar sem perder as funções essenciais.</p>
      <p><a href="/cookies">Leia a política de cookies</a></p>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
        <button className="button" onClick={() => choose('accepted')}>Aceitar analytics</button>
        <button className="button secondary" onClick={() => choose('rejected')}>Recusar analytics</button>
      </div>
    </div>
  </div>
}

export function Analytics() {
  const [accepted, setAccepted] = useState(false)
  useEffect(() => {
    try { setAccepted(localStorage.getItem(CONSENT_KEY) === 'accepted') } catch { setAccepted(false) }
  }, [])
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
  if (!accepted || !id) return null
  return <>
    <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive"/>
    <Script id="google-analytics" strategy="afterInteractive">{ `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)};gtag('js',new Date());gtag('config','${id}',{anonymize_ip:true});` }</Script>
  </>
}
