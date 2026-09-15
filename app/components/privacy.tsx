'use client'
import Script from 'next/script'
import { useEffect, useState } from 'react'

export function PrivacyBanner(){const [visible,setVisible]=useState(false);useEffect(()=>setVisible(localStorage.getItem('open-claude-analytics-consent')===null),[]);if(!visible)return null;return <div style={{position:'fixed',bottom:16,left:16,right:16,zIndex:50}}><div className="card"><strong>Privacidade</strong><p className="muted">Usamos cookies essenciais para login. Analytics só é ativado se você aceitar.</p><button className="button" onClick={()=>{localStorage.setItem('open-claude-analytics-consent','accepted');setVisible(false)}}>Aceitar analytics</button></div></div>}

export function Analytics(){const [accepted,setAccepted]=useState(false);useEffect(()=>setAccepted(localStorage.getItem('open-claude-analytics-consent')==='accepted'),[]);const id=process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;if(!accepted||!id)return null;return <><Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive"/><Script id="google-analytics" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)};gtag('js',new Date());gtag('config','${id}',{anonymize_ip:true});`}</Script></>}
