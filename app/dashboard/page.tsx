'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

type Project={id:string;name:string;description?:string|null;updated_at?:string}
export default function DashboardPage(){
 const [projects,setProjects]=useState<Project[]>([])
 const [agentCount,setAgentCount]=useState(0)
 const [skillCount,setSkillCount]=useState(0)
 const [activeSkillCount,setActiveSkillCount]=useState(0)
 const [name,setName]=useState('Olá')
 const [loading,setLoading]=useState(true)
 useEffect(()=>{let live=true;(async()=>{try{const [w,a,s]=await Promise.all([fetch('/api/workspace',{cache:'no-store'}),fetch('/api/agents/catalog',{cache:'no-store'}),fetch('/api/settings/skills',{cache:'no-store'})]);if(w.status===401){location.href='/login';return}const [wd,ad,sd]=await Promise.all([w.json(),a.json(),s.json()]);if(!live)return;setProjects(wd.projects??[]);setName(wd.profile?.display_name||wd.account?.email?.split('@')[0]||'Olá');setAgentCount(Number(ad.total??ad.agents?.length??0));const skills=sd.skills??[];setSkillCount(skills.length);setActiveSkillCount(skills.filter((x:any)=>x.userEnabled!==false).length)}catch{}finally{if(live)setLoading(false)}})();return()=>{live=false}},[])
 const nav=[['⌂','Início','/dashboard'],['▣','Projetos','/chat?view=projects'],['◌','Chat','/chat?mode=chat'],['⌘','Code','/chat?mode=code'],['♧','Cowork','/chat?mode=cowork'],['✧','Agentes','/agents'],['✣','Skills','/settings/skills'],['⊕','APIs','/settings/apis'],['⚙','Configurações','/settings'],['☼','Personalização','/settings/personalization']]
 return <main className="oc-dashboard">
  <aside className="oc-dash-sidebar">
   <Link href="/dashboard" className="oc-dash-brand"><img src="/open-claude-logo.svg" alt="Open Claude"/></Link>
   <nav aria-label="Navegação principal">{nav.map(([icon,label,url])=><Link key={label} href={url} className={label==='Início'?'active':''}><span aria-hidden="true">{icon}</span>{label}</Link>)}</nav>
   <div className="oc-dash-plan"><span>✦ WORKSPACE</span><b>Seu espaço de IA</b><p>Modelos, agentes e ferramentas conectados.</p><Link href="/settings">Gerenciar conta →</Link></div>
   <Link href="/account" className="oc-dash-account"><span className="oc-avatar">{name.slice(0,2).toUpperCase()}</span><span><b>{name}</b><small>Conta e perfil</small></span></Link>
  </aside>
  <section className="oc-dash-main">
   <header className="oc-dash-topbar"><div><span className="oc-eyebrow">WORKSPACE / VISÃO GERAL</span><h1>Início</h1></div><div className="oc-top-actions"><Link href="/settings/personalization" aria-label="Personalização">☼</Link><Link href="/account" aria-label="Conta"><span className="oc-avatar small">{name.slice(0,2).toUpperCase()}</span></Link></div></header>
   <section className="oc-dash-hero">
    <div className="oc-hero-copy"><span className="oc-eyebrow">OPEN CLAUDE · AI WORKSPACE</span><h2>Olá, {name}.<br/><span>O que vamos criar hoje?</span></h2><p>Converse, desenvolva, colabore e transforme ideias em entregas com seus modelos, agentes e ferramentas.</p><Link href="/chat" className="oc-primary-link">Começar a trabalhar <span>→</span></Link></div>
    <div className="oc-hero-logo"><img src="/open-claude-mark.svg" alt="" /></div>
   </section>
   <section className="oc-mode-grid" aria-label="Modos de trabalho">
    <Link href="/chat?mode=chat" className="oc-mode-card chat"><span className="oc-mode-icon">◌</span><div><h3>Chat</h3><p>Converse, pesquise, escreva e use seus agentes selecionados.</p><b>Iniciar Chat →</b></div><span className="oc-card-orbit" aria-hidden="true"/></Link>
    <Link href="/chat?mode=code" className="oc-mode-card code"><span className="oc-mode-icon">&lt;/&gt;</span><div><h3>Code</h3><p>Desenvolva, analise repositórios, execute testes e use o terminal.</p><b>Abrir Code →</b></div><span className="oc-card-orbit" aria-hidden="true"/></Link>
    <Link href="/chat?mode=cowork" className="oc-mode-card cowork"><span className="oc-mode-icon">♧</span><div><h3>Cowork</h3><p>Coordene tarefas complexas com especialistas internos.</p><b>Iniciar Cowork →</b></div><span className="oc-card-orbit" aria-hidden="true"/></Link>
   </section>
   <section className="oc-stats-grid" aria-label="Resumo do workspace">
    <article className="oc-stat"><span>Agentes disponíveis</span><strong>{agentCount}</strong><small>Catálogo público para Chat</small></article>
    <article className="oc-stat"><span>Skills ativas</span><strong>{activeSkillCount}</strong><small>{skillCount} cadastradas no total</small></article>
    <article className="oc-stat"><span>Projetos</span><strong>{projects.length}</strong><small>Espaços no seu workspace</small></article>
   </section>
   <section className="oc-dash-bottom">
    <article className="oc-panel"><header><div><span className="oc-eyebrow">SEU TRABALHO</span><h3>Projetos recentes</h3></div><Link href="/chat?view=projects">Ver todos →</Link></header>
     {loading?<p className="oc-empty">Carregando projetos…</p>:projects.length?projects.slice(0,5).map(p=><div className="oc-project-row" key={p.id}><span className="oc-project-glyph">▣</span><div><b>{p.name}</b><small>{p.description||'Projeto Open Claude'}</small></div><Link href={'/projects/'+p.id+'/settings'}>Abrir →</Link></div>):<div className="oc-empty"><span>▣</span><b>Você ainda não tem projetos</b><p>Crie seu primeiro projeto para organizar contexto e conversas.</p><Link href="/chat?view=projects">Criar projeto →</Link></div>}
    </article>
    <article className="oc-personalize"><span className="oc-eyebrow">CONFIGURE SEU WORKSPACE</span><h3>Personalize sua experiência</h3><p>Defina idioma, personalidade e instruções para respostas mais alinhadas ao seu trabalho.</p><Link href="/settings/personalization">Acessar personalização →</Link></article>
   </section>
   <footer className="oc-dash-footer">Open Claude · Seu AI workspace completo <span>Modelos · Agentes · Ferramentas</span></footer>
  </section>
 </main>
}
