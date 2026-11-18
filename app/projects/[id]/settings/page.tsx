'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

type Settings = { instructions: string; defaultMode: 'chat'|'code'|'cowork'; model: string; selectedAgentIds: string[]; selectedSkillIds: string[] }
type Choice = { id:string; name:string; description?:string; category?:string; enabled?:boolean; userEnabled?:boolean }
const empty: Settings = { instructions: '', defaultMode: 'chat', model: '', selectedAgentIds: [], selectedSkillIds: [] }

export default function ProjectSettingsPage() {
  const params = useParams<{id:string}>()
  const id = params.id
  const [name,setName]=useState('')
  const [settings,setSettings]=useState<Settings>(empty)
  const [agents,setAgents]=useState<Choice[]>([])
  const [skills,setSkills]=useState<Choice[]>([])
  const [agentQuery,setAgentQuery]=useState('')
  const [skillQuery,setSkillQuery]=useState('')
  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState(false)
  const [deleting,setDeleting]=useState(false)
  const [notice,setNotice]=useState('')
  const [error,setError]=useState('')
  useEffect(()=>{let active=true;(async()=>{
    try{
      const [projectResponse,agentResponse,skillResponse]=await Promise.all([
        fetch('/api/projects/'+id,{cache:'no-store'}),
        fetch('/api/agents/catalog',{cache:'no-store'}),
        fetch('/api/settings/skills',{cache:'no-store'})
      ])
      const projectData=await projectResponse.json()
      if(projectResponse.status===401){location.href='/login';return}
      if(!projectResponse.ok)throw new Error(projectData.error||'Não foi possível carregar o projeto.')
      const agentData=agentResponse.ok?await agentResponse.json():{}
      const skillData=skillResponse.ok?await skillResponse.json():{}
      if(active){
        setName(projectData.project.name)
        setSettings({...empty,...(projectData.project.settings||{}),selectedAgentIds:projectData.project.settings?.selectedAgentIds??[],selectedSkillIds:projectData.project.settings?.selectedSkillIds??[]})
        setAgents(Array.isArray(agentData.agents)?agentData.agents:[])
        setSkills(Array.isArray(skillData.skills)?skillData.skills:[])
      }
    }catch(e){if(active)setError(e instanceof Error?e.message:'Falha ao carregar projeto.')}
    finally{if(active)setLoading(false)}
  })();return()=>{active=false}},[id])
  async function save(){setSaving(true);setError('');setNotice('');try{const r=await fetch('/api/projects/'+id,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({settings})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Falha ao salvar.');setNotice('Configurações salvas. Agentes e Skills selecionados serão usados nas novas conversas do Chat deste projeto.')}catch(e){setError(e instanceof Error?e.message:'Falha ao salvar.')}finally{setSaving(false)}}
  async function removeProject(){if(!confirm('Excluir este projeto? As conversas serão mantidas e ficarão sem projeto. Esta ação não pode ser desfeita.'))return;setDeleting(true);setError('');try{const r=await fetch('/api/projects/'+id,{method:'DELETE'});const d=await r.json();if(!r.ok)throw new Error(d.error||'Falha ao excluir projeto.');location.href='/chat?view=projects'}catch(e){setError(e instanceof Error?e.message:'Falha ao excluir projeto.')}finally{setDeleting(false)}}
  const filteredAgents=useMemo(()=>agents.filter(a=>(a.name+' '+(a.category??'')+' '+(a.description??'')).toLowerCase().includes(agentQuery.toLowerCase())).slice(0,160),[agents,agentQuery])
  const filteredSkills=useMemo(()=>skills.filter(s=>(s.name+' '+(s.description??'')).toLowerCase().includes(skillQuery.toLowerCase())),[skills,skillQuery])
  function toggle(id:string,key:'selectedAgentIds'|'selectedSkillIds'){setSettings(s=>({...s,[key]:s[key].includes(id)?s[key].filter(x=>x!==id):[...s[key],id]}))}
  return <main className="shell" style={{maxWidth:1000,padding:'28px 20px 60px'}}>
    <nav className="nav"><Link href="/chat" className="app-nav-logo"><img src="/icon.svg" alt="" width="40" height="40"/><strong>Open Claude</strong></Link><Link href="/chat">Voltar ao workspace</Link></nav>
    <header style={{padding:'34px 0 22px'}}><p className="eyebrow">CONFIGURAÇÕES DO PROJETO</p><h1 style={{fontSize:'clamp(2rem,5vw,3rem)',letterSpacing:'-.05em',margin:'8px 0'}}>{name||'Projeto'}</h1><p className="muted">Defina o contexto, modo, modelo e quais agentes e Skills estarão ativos no Chat deste projeto.</p></header>
    {loading?<p className="muted">Carregando configurações…</p>:<section className="card" style={{display:'grid',gap:20}}>
      <label style={{display:'grid',gap:8}}>Instruções do projeto<textarea rows={7} maxLength={8000} value={settings.instructions} onChange={e=>setSettings(s=>({...s,instructions:e.target.value}))} placeholder="Descreva objetivo, contexto, regras e decisões do projeto." style={{width:'100%',padding:12,borderRadius:9,background:'var(--surface-2)',color:'var(--text)',border:'1px solid var(--line)'}}/><small className="muted">Até 8.000 caracteres. Aplicadas às novas tarefas.</small></label>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:14}}>
        <label style={{display:'grid',gap:8}}>Modo padrão<select value={settings.defaultMode} onChange={e=>setSettings(s=>({...s,defaultMode:e.target.value as Settings['defaultMode']}))}><option value="chat">Chat</option><option value="code">Code</option><option value="cowork">Cowork</option></select></label>
        <label style={{display:'grid',gap:8}}>Modelo padrão<input value={settings.model} onChange={e=>setSettings(s=>({...s,model:e.target.value}))} placeholder="Modelo global"/></label>
      </div>
      <details open style={{border:'1px solid var(--line)',borderRadius:12,padding:14}}>
        <summary style={{cursor:'pointer',fontWeight:700}}>Agentes do catálogo para o Chat ({settings.selectedAgentIds.length} selecionados)</summary>
        <p className="muted" style={{fontSize:12}}>Somente agentes selecionados serão considerados pelo Chat neste projeto. Os agentes internos de Code e Cowork não aparecem aqui.</p>
        <input value={agentQuery} onChange={e=>setAgentQuery(e.target.value)} placeholder="Buscar agente…" style={{width:'100%',padding:10,margin:'8px 0',background:'var(--surface-2)',color:'var(--text)',border:'1px solid var(--line)',borderRadius:8}}/>
        <div style={{maxHeight:260,overflow:'auto',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(230px,1fr))',gap:6}}>
          {filteredAgents.map(agent=><label key={agent.id} style={{display:'flex',gap:8,alignItems:'flex-start',padding:8,background:'var(--surface-2)',borderRadius:8,fontSize:12}}><input type="checkbox" checked={settings.selectedAgentIds.includes(agent.id)} onChange={()=>toggle(agent.id,'selectedAgentIds')}/><span><b>{agent.name}</b><small className="muted" style={{display:'block'}}>{agent.category||agent.description||''}</small></span></label>)}
        </div>
        {agents.length>160&&<small className="muted">Mostrando até 160 resultados filtrados; use a busca para localizar os demais.</small>}
      </details>
      <details open style={{border:'1px solid var(--line)',borderRadius:12,padding:14}}>
        <summary style={{cursor:'pointer',fontWeight:700}}>Skills disponíveis ({settings.selectedSkillIds.length} selecionadas)</summary>
        <p className="muted" style={{fontSize:12}}>Selecione as Skills que poderão ser ativadas pelo Chat neste projeto.</p>
        <input value={skillQuery} onChange={e=>setSkillQuery(e.target.value)} placeholder="Buscar Skill…" style={{width:'100%',padding:10,margin:'8px 0',background:'var(--surface-2)',color:'var(--text)',border:'1px solid var(--line)',borderRadius:8}}/>
        <div style={{maxHeight:220,overflow:'auto',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(230px,1fr))',gap:6}}>
          {filteredSkills.map(skill=><label key={skill.id} style={{display:'flex',gap:8,alignItems:'center',padding:8,background:'var(--surface-2)',borderRadius:8,fontSize:12}}><input type="checkbox" checked={settings.selectedSkillIds.includes(skill.id)} onChange={()=>toggle(skill.id,'selectedSkillIds')}/><span>{skill.name}</span></label>)}
        </div>
      </details>
      {error&&<p role="alert" style={{color:'#ef8888'}}>{error}</p>}{notice&&<p role="status" style={{color:'#38b99b'}}>{notice}</p>}
      <div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}><button className="button secondary" disabled={deleting} onClick={removeProject}>{deleting?'Excluindo…':'Excluir projeto'}</button><button className="button glow" disabled={saving} onClick={save}>{saving?'Salvando…':'Salvar configurações'}</button></div>
    </section>}
  </main>
}
