'use client'
import { useEffect, useState } from 'react'

export function PrivacyBanner(){const [visible,setVisible]=useState(false);useEffect(()=>setVisible(localStorage.getItem('open-claude-analytics-consent')===null),[]);if(!visible)return null;return <div style={{position:'fixed',bottom:16,left:16,right:16,zIndex:50}}><div className="card"><strong>Privacidade</strong><p className="muted">Usamos cookies essenciais para login. Analytics só é ativado se você aceitar.</p><button className="button" onClick={()=>{localStorage.setItem('open-claude-analytics-consent','accepted');setVisible(false)}}>Aceitar analytics</button></div></div>}

export function Analytics(){return null}
