'use client'
import {useEffect,useState} from 'react'
import Link from 'next/link'

const languages=[['pt-BR','Português (Brasil)'],['en','English'],['es','Español'],['fr','Français'],['de','Deutsch'],['it','Italiano'],['ja','日本語']]
const personalities=[['balanced','Equilibrado','Natural, claro e adaptável à tarefa.'],['professional','Profissional','Tom formal, preciso e organizado.'],['friendly','Amigável','Tom acolhedor, simples e próximo.'],['concise','Objetivo','Respostas curtas, diretas e sem rodeios.'],['teacher','Didático','Explica passo a passo, com exemplos.'],['analytical','Analítico','Aprofunda argumentos, premissas e limitações.'],['creative','Criativo','Explora alternativas e ideias originais.']]
export default function PersonalizationPage(){
 const [instructions,setInstructions]=useState(''),[language,setLanguage]=useState('pt-BR'),[personality,setPersonality]=useState('balanced')
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false)
 useEffect(()=>{fetch('/api/workspace',{cache:'no-store'}).then(async r=>{if(r.status===401){location.href='/login';return}const d=await r.json();if(!r.ok)throw new Error(d.error||'Não foi possível carregar suas preferências.');const p=d.profile?.preferences??{};setInstructions(p.customInstructions??'');setLanguage(p.language??'pt-BR');setPersonality(p.personality??'balanced')}).catch(e=>setError(e instanceof Error?e.message:'Falha ao carregar preferências.')).finally(()=>setLoading(false))},[])
 async function save(){setSaving(true);setError('');setSaved(false);try{const r=await fetch('/api/workspace',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'preferences',preferences:{customInstructions,language,personality}})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Não foi possível salvar.');setSaved(true)}catch(e){setError(e instanceof Error?e.message:'Falha ao salvar.')}finally{setSaving(false)}}
 return <main className="shell" style={{maxWidth:920,paddingTop:28,paddingBottom:60}}>
  <nav className="nav"><Link href="/settings" className="muted">← Todas as configurações</Link><Link href="/chat" className="button secondary compact">Workspace</Link></nav>
  <section className="card" style={{marginTop:28}}>
   <p className="eyebrow">PREFERÊNCIAS</p><h1>Personalização</h1><p className="muted" style={{lineHeight:1.7}}>Defina o idioma, a personalidade e as instruções que orientam as respostas nos modos Chat, Code e Cowork.</p>
   {loading?<p className="muted">Carregando…</p>:<>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(230px,1fr))',gap:16,marginTop:22}}>
     <label style={{display:'grid',gap:8}}>Idioma das respostas<select value={language} onChange={e=>{setLanguage(e.target.value);setSaved(false)}} style={{padding:12,borderRadius:9,background:'#121217',color:'#f5f0e8',border:'1px solid #38333a'}}>{languages.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select><small className="muted">O modelo deve responder neste idioma, salvo quando você pedir outro.</small></label>
     <label style={{display:'grid',gap:8}}>Personalidade<select value={personality} onChange={e=>{setPersonality(e.target.value);setSaved(false)}} style={{padding:12,borderRadius:9,background:'#121217',color:'#f5f0e8',border:'1px solid #38333a'}}>{personalities.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select><small className="muted">{personalities.find(x=>x[0]===personality)?.[2]}</small></label>
    </div>
    <label style={{display:'grid',gap:8,marginTop:22}}>Instruções personalizadas<textarea value={instructions} onChange={e=>{setInstructions(e.target.value);setSaved(false)}} rows={10} maxLength={5000} placeholder="Ex.: responda em português do Brasil; comece pela resposta; explique termos técnicos; use exemplos; quando pesquisar, priorize fontes oficiais e inclua os links; não diga que executou algo sem realmente executar…" style={{width:'100%',background:'#121217',border:'1px solid #38333a',borderRadius:10,color:'#f5f0e8',padding:14,resize:'vertical'}}/></label>
    <p className="muted" style={{fontSize:11}}>{instructions.length}/5000 caracteres. Estas instruções são aplicadas como preferências de resposta e não substituem as regras de segurança.</p>
    <button className="button" onClick={save} disabled={saving}>{saving?'Salvando…':'Salvar personalização'}</button>
   </>}
   {saved&&<p role="status">Preferências salvas e prontas para as próximas conversas.</p>}{error&&<p role="alert" style={{color:'#ff9b9b'}}>{error}</p>}
  </section>
 </main>
}