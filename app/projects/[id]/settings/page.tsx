'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

type Settings = { instructions: string; defaultMode: 'chat'|'code'|'cowork'; model: string }
const empty: Settings = { instructions: '', defaultMode: 'chat', model: '' }

export default function ProjectSettingsPage() {
  const params = useParams<{id:string}>()
  const id = params.id
  const [name,setName]=useState('')
  const [settings,setSettings]=useState<Settings>(empty)
  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState(false)
  const [notice,setNotice]=useState('')
  const [error,setError]=useState('')
  useEffect(()=>{let active=true;(async()=>{try{const r=await fetch('/api/projects/'+id,{cache:'no-store'});const d=await r.json();if(r.status===401){location.href='/login';return}if(!r.ok)throw new Error(d.error||'Não foi possível carregar o projeto.');if(active){setName(d.project.name);setSettings({...empty,...(d.project.settings||{})})}}catch(e){if(active)setError(e instanceof Error?e.message:'Falha ao carregar projeto.')}finally{if(active)setLoading(false)}})();return()=>{active=false}},[id])
  async function save(){setSaving(true);setError('');setNotice('');try{const r=await fetch('/api/projects/'+id,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({settings})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Falha ao salvar.');setNotice('Configurações salvas. Elas serão aplicadas às novas conversas deste projeto.')}catch(e){setError(e instanceof Error?e.message:'Falha ao salvar.')}finally{setSaving(false)}}
  return <main className="shell" style={{maxWidth:1000,padding:'28px 20px 60px'}}>
    <nav className="nav"><Link href="/chat" className="app-nav-logo"><img src="/icon.svg" alt="" width="40" height="40"/><strong>Open Claude</strong></Link><Link href="/chat">Voltar ao workspace</Link></nav>
    <header style={{padding:'34px 0 22px'}}><p className="eyebrow">CONFIGURAÇÕES DO PROJETO</p><h1 style={{fontSize:'clamp(2rem,5vw,3rem)',letterSpacing:'-.05em',margin:'8px 0'}}>{name||'Projeto'}</h1><p className="muted">Defina as instruções, o modo e o modelo padrão usados como contexto nas conversas deste projeto.</p></header>
    {loading?<p className="muted">Carregando configurações…</p>:<section className="card" style={{display:'grid',gap:18}}>
      <label style={{display:'grid',gap:8}}>Instruções do projeto<textarea rows={8} maxLength={8000} value={settings.instructions} onChange={e=>setSettings(s=>({...s,instructions:e.target.value}))} placeholder="Descreva o objetivo, contexto, regras, padrões técnicos e decisões que o Open Claude deve respeitar neste projeto." style={{width:'100%',padding:12,borderRadius:9,background:'var(--surface-2)',color:'var(--text)',border:'1px solid var(--line)'}}/><small className="muted">Até 8.000 caracteres. Estas instruções são adicionadas ao contexto das novas tarefas do projeto.</small></label>
      <label style={{display:'grid',gap:8}}>Modo padrão<select value={settings.defaultMode} onChange={e=>setSettings(s=>({...s,defaultMode:e.target.value as Settings['defaultMode']}))}><option value="chat">Chat</option><option value="code">Code</option><option value="cowork">Cowork</option></select></label>
      <label style={{display:'grid',gap:8}}>Modelo padrão<input value={settings.model} onChange={e=>setSettings(s=>({...s,model:e.target.value}))} placeholder="Deixe vazio para usar o modelo global"/></label>

      {error&&<p role="alert" style={{color:'#ef8888'}}>{error}</p>}{notice&&<p role="status" style={{color:'#38b99b'}}>{notice}</p>}
      <div style={{display:'flex',justifyContent:'flex-end'}}><button className="button glow" disabled={saving} onClick={save}>{saving?'Salvando…':'Salvar configurações'}</button></div>
    </section>}
  </main>
}
