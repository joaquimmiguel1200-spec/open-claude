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
 const card={background:'linear-gradient(145deg,#15162c,#101322)',border:'1px solid #2b2d56',borderRadius:18,padding:22,color:'#f4f3ff',textDecoration:'none' as const}
 const small={color:'#a9add0',fontSize:13,lineHeight:1.6}
 return <main style={{minHeight:'100vh',background:'radial-gradient(ellipse at 70% -10%,#25206a 0,transparent 36%),#090b18',color:'#f5f4ff',fontFamily:'Inter,system-ui,sans-serif',display:'grid',gridTemplateColumns:'236px minmax(0,1fr)'}}>
  <aside style={{borderRight:'1px solid #24264a',padding:'22px 16px',display:'flex',flexDirection:'column',gap:10,background:'#0e1020'}}>
   <Link href="/dashboard" style={{display:'flex',alignItems:'center',gap:10,textDecoration:'none',color:'white',fontSize:19,fontWeight:750,margin:'0 6px 24px'}}><img src="/icon.svg" width="44" height="44" alt=""/><span>Open Claude<small style={{display:'block',fontSize:11,color:'#9da2c9',fontWeight:400}}>Seu AI workspace completo</small></span></Link>
   {[['⌂','Início','/dashboard'],['▣','Projetos','/chat?view=projects'],['◌','Chat','/chat?mode=chat'],['⌘','Code','/chat?mode=code'],['♧','Cowork','/chat?mode=cowork'],['✧','Agentes','/agents'],['✣','Skills','/settings/skills'],['⊕','APIs','/settings/apis'],['⚙','Configurações','/settings'],['☼','Personalização','/settings/personalization']].map(([icon,label,url])=><Link key={label} href={url} style={{display:'flex',alignItems:'center',gap:13,padding:'11px 13px',borderRadius:10,textDecoration:'none',color:label==='Início'?'white':'#b7bbdb',background:label==='Início'?'linear-gradient(100deg,#7c3aed,#4338ca)':'transparent',fontSize:14}}><span style={{fontSize:18}}>{icon}</span>{label}</Link>)}
   <div style={{marginTop:'auto',padding:14,border:'1px solid #34345f',borderRadius:14,background:'#151735'}}><b>Workspace Pro</b><p style={small}>Acesse os recursos conectados da plataforma.</p><Link href="/settings" style={{color:'#b9a6ff',fontSize:12}}>Gerenciar conta →</Link></div>
  </aside>
  <section style={{minWidth:0,padding:'20px clamp(16px,3vw,38px) 36px',maxWidth:1600,width:'100%',margin:'0 auto'}}>
   <header style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,borderBottom:'1px solid #252747',paddingBottom:16}}><div style={{color:'#a9add0',fontSize:13}}>Seu espaço de trabalho / Início</div><div style={{display:'flex',gap:12,alignItems:'center'}}><Link href="/settings" style={{color:'#c8c8e8',textDecoration:'none'}}>⚙</Link><span style={{background:'#4338ca',borderRadius:30,padding:'9px 12px',fontWeight:700}}>{name.slice(0,2).toUpperCase()}</span></div></header>
   <section style={{marginTop:24,borderRadius:22,padding:'30px clamp(20px,4vw,48px)',background:'radial-gradient(ellipse at 80% 50%,#4338ca 0,transparent 45%),linear-gradient(110deg,#15133d,#102d6d 65%,#075985)',border:'1px solid #3f49ad',display:'flex',alignItems:'center',justifyContent:'space-between',gap:24,flexWrap:'wrap'}}>
    <div style={{display:'flex',alignItems:'center',gap:24}}><img src="/icon.svg" width="94" height="94" alt="Open Claude"/><div><p style={{color:'#c4b5fd',letterSpacing:2,fontSize:11,fontWeight:700}}>INTELIGÊNCIA ARTIFICIAL · SEM LIMITES</p><h1 style={{fontSize:'clamp(30px,4vw,48px)',margin:'4px 0',letterSpacing:-1.5}}>Bem-vindo, {name}</h1><p style={{color:'#d7ddff',margin:0}}>Converse · Desenvolva · Colabore · Crie</p></div></div>
    <Link href="/chat" style={{padding:'16px 20px',borderRadius:14,background:'#251b79',border:'1px solid #7665ff',color:'white',textDecoration:'none',fontWeight:700}}>Pronto para começar? →</Link>
   </section>
   <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:16,marginTop:22}}>
    <Link href="/chat?mode=chat" style={{...card,background:'linear-gradient(135deg,#35106f,#25165c 65%,#182d8a)',borderColor:'#6845ce'}}><div style={{fontSize:28}}>◌</div><h2 style={{margin:'12px 0 6px'}}>Chat</h2><p style={small}>Converse com IA, pesquise, escreva e use seus agentes selecionados.</p><b style={{color:'#d8c5ff'}}>Iniciar Chat →</b></Link>
    <Link href="/chat?mode=code" style={{...card,background:'linear-gradient(135deg,#102f77,#123d89 65%,#075985)',borderColor:'#2563eb'}}><div style={{fontSize:28}}>⌘</div><h2 style={{margin:'12px 0 6px'}}>Code</h2><p style={small}>Desenvolva, analise repositórios, execute testes e use o terminal.</p><b style={{color:'#bfdbfe'}}>Abrir Code →</b></Link>
    <Link href="/chat?mode=cowork" style={{...card,background:'linear-gradient(135deg,#064e4b,#075985)',borderColor:'#0d9488'}}><div style={{fontSize:28}}>♧</div><h2 style={{margin:'12px 0 6px'}}>Cowork</h2><p style={small}>Coordene tarefas complexas e especialistas internos no workspace.</p><b style={{color:'#99f6e4'}}>Iniciar Cowork →</b></Link>
   </div>
   <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:14,marginTop:18}}>
    <div style={card}><span style={{color:'#a5b4fc'}}>◈ Agentes disponíveis</span><h2 style={{fontSize:32,margin:'10px 0 0'}}>{agentCount}</h2><p style={small}>Catálogo público selecionável para Chat</p></div>
    <div style={card}><span style={{color:'#67e8f9'}}>✣ Skills ativas</span><h2 style={{fontSize:32,margin:'10px 0 0'}}>{activeSkillCount}</h2><p style={small}>{skillCount} cadastradas no total</p></div>
    <div style={card}><span style={{color:'#c4b5fd'}}>▣ Projetos</span><h2 style={{fontSize:32,margin:'10px 0 0'}}>{projects.length}</h2><p style={small}>Projetos no seu workspace</p></div>
   </div>
   <section style={{display:'grid',gridTemplateColumns:'minmax(0,1.5fr) minmax(260px,1fr)',gap:16,marginTop:18}}>
    <div style={card}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><h3 style={{margin:0}}>Projetos recentes</h3><Link href="/chat?view=projects" style={{color:'#a5b4fc',textDecoration:'none',fontSize:13}}>Ver todos →</Link></div>{loading?<p style={small}>Carregando…</p>:projects.length?projects.slice(0,5).map(p=><div key={p.id} style={{display:'flex',justifyContent:'space-between',padding:'13px 0',borderBottom:'1px solid #2b2d50'}}><div><b>{p.name}</b><p style={{...small,margin:'3px 0 0'}}>{p.description||'Projeto Open Claude'}</p></div><Link href={'/projects/'+p.id+'/settings'} style={{color:'#a5b4fc',textDecoration:'none'}}>Abrir →</Link></div>):<div style={{textAlign:'center',padding:24}}><p style={small}>Você ainda não tem projetos.</p><Link href="/chat" style={{color:'#c4b5fd'}}>Criar primeiro projeto →</Link></div>}</div>
    <div style={{...card,background:'linear-gradient(145deg,#1d1650,#111a3a)'}}><div style={{fontSize:24}}>✦</div><h3>Personalize sua experiência</h3><p style={small}>Configure idioma, personalidade e instruções para as respostas.</p><Link href="/settings/personalization" style={{display:'inline-block',padding:'12px 15px',borderRadius:10,background:'#5b21b6',color:'white',textDecoration:'none'}}>Acessar personalização →</Link></div>
   </section>
   <footer style={{borderTop:'1px solid #252747',marginTop:28,paddingTop:16,color:'#8e93b6',fontSize:12}}>Open Claude · Seu AI workspace completo</footer>
  </section>
 </main>
}
