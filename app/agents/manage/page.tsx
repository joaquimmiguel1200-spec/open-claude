'use client'
import { useEffect,useState } from 'react'
import Link from 'next/link'
type Agent={id:string;name:string;description:string;source:string;model_id:string|null;enabled:boolean;modes:string[]}
export default function ManageAgentsPage(){
 const [agents,setAgents]=useState<Agent[]>([])
 const [content,setContent]=useState('')
 const [model,setModel]=useState('')
 const [error,setError]=useState('')
 const [busy,setBusy]=useState(false)
 async function load(){const r=await fetch('/api/agents/profiles',{cache:'no-store'});if(r.status===401){location.href='/login';return}const d=await r.json();if(!r.ok)throw new Error(d.error||'Falha ao carregar');setAgents(d.agents||[])}
 useEffect(()=>{load().catch(e=>setError(e.message))},[])
 async function importAgent(){setBusy(true);setError('');try{const r=await fetch('/api/agents/profiles',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({format:'opencode',content})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Falha ao importar');setContent('');await load()}catch(e){setError(e instanceof Error?e.message:'Falha ao importar')}finally{setBusy(false)}}
 async function toggle(a:Agent){const r=await fetch('/api/agents/profiles',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id:a.id,enabled:!a.enabled})});if(!r.ok){setError('Não foi possível atualizar o agente.');return}await load()}
 async function setAgentModel(a:Agent){const r=await fetch('/api/agents/profiles',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id:a.id,modelId:model})});if(!r.ok){setError('Não foi possível salvar o modelo.');return}setModel('');await load()}
 async function remove(a:Agent){if(!confirm('Excluir este agente do seu catálogo?'))return;const r=await fetch('/api/agents/profiles',{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify({id:a.id})});if(!r.ok){setError('Não foi possível excluir o agente.');return}await load()}
 return <main className="shell" style={{maxWidth:1100,padding:'32px 20px'}}>
  <nav style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:28}}><Link href="/chat" className="app-nav-logo"><img src="/open-claude-logo.svg" alt="Open Claude"/></Link><Link href="/chat">Voltar ao workspace</Link></nav>
  <p className="kicker">AGENTES · OPENCODE</p><h1>Seu catálogo de agentes</h1>
  <p className="muted">Importe arquivos Markdown de agentes OpenCode. Cada agente pode usar um modelo próprio, separado do modelo principal do Chat, Code ou Cowork.</p>
  <section className="feature" style={{margin:'24px 0'}}><h2>Importar agente OpenCode</h2><p className="muted">Cole o conteúdo do arquivo de agente. Campos YAML aceitos: name, description e model. O corpo Markdown vira as instruções do agente.</p><textarea value={content} onChange={e=>setContent(e.target.value)} rows={12} placeholder={'---\nname: Research Agent\ndescription: Pesquisa e síntese\nmodel: anthropic/claude-sonnet\n---\n\n# Instructions\n...'} style={{width:'100%',margin:'12px 0'}}/><button className="button glow" disabled={busy||!content.trim()} onClick={importAgent}>{busy?'Importando…':'Importar agente'}</button></section>
  {error&&<p role="alert">{error}</p>}
  <h2>Agentes importados ({agents.length})</h2>
  <div style={{display:'grid',gap:12,marginTop:16}}>{agents.map(a=><article className="feature" key={a.id}><div style={{display:'flex',justifyContent:'space-between',gap:16,flexWrap:'wrap'}}><div><b>{a.name}</b><p className="muted">{a.description}</p><small>{a.source} · {a.modes.join(', ')} · {a.model_id||'Modelo principal'}</small></div><div style={{display:'flex',gap:8,alignItems:'center'}}><button className="button secondary compact" onClick={()=>toggle(a)}>{a.enabled?'Desativar':'Ativar'}</button><button className="button secondary compact" onClick={()=>remove(a)}>Excluir</button></div></div><div style={{display:'flex',gap:8,marginTop:14}}><input aria-label="Modelo próprio do agente" placeholder="ID do modelo (ex.: anthropic/claude-sonnet)" value={model} onChange={e=>setModel(e.target.value)}/><button className="button secondary compact" onClick={()=>setAgentModel(a)}>Salvar modelo</button></div></article>)}</div>
 </main>
}
