'use client'

import { useEffect, useState } from 'react'

type Result = { name: string; path: string; status?: number; ok: boolean; ms: number; detail: string }
const groups: Array<{name:string; calls:Array<{method:'GET'|'POST';path:string;body?:unknown}>}> = [
  {name:'01 · Health',calls:[{method:'GET',path:'/api/health'}]},
  {name:'02 · Workspace autenticado',calls:[{method:'GET',path:'/api/workspace'}]},
  {name:'03 · Catálogo de modelos',calls:[{method:'GET',path:'/api/models'}]},
  {name:'04 · Provedores',calls:[{method:'GET',path:'/api/settings/providers'}]},
  {name:'05 · Skills e agentes',calls:[{method:'GET',path:'/api/settings/skills'},{method:'GET',path:'/api/agents/profiles'}]},
  {name:'06 · MCP por modo',calls:[{method:'GET',path:'/api/mcp?mode=chat'},{method:'GET',path:'/api/mcp?mode=code'},{method:'GET',path:'/api/mcp?mode=cowork'}]},
  {name:'07 · Conexão GitHub',calls:[{method:'GET',path:'/api/github/connection'}]},
  {name:'08 · Chat com inferência real',calls:[{method:'POST',path:'/api/chat',body:{message:'Explique em três pontos como estruturar um onboarding seguro para um SaaS.',mode:'chat',stream:false}}]},
  {name:'09 · Code sem aplicar alterações',calls:[{method:'POST',path:'/api/code',body:{goal:'Leia o README e proponha uma melhoria pequena. Não aplique alterações.',repository:'joaquimmiguel1200-spec/open-claude',branch:'main',paths:['README.md'],apply:false}}]},
  {name:'10 · Cowork com tarefa segura',calls:[{method:'POST',path:'/api/cowork',body:{goal:'Monte um plano semanal de organização administrativa, com prioridades e critérios de conclusão. Não envie mensagens nem altere sistemas externos.',maxTasks:3,concurrency:1}}]},
]

export default function AdminDiagnosticsPage(){
  useEffect(()=>{fetch('/api/workspace',{cache:'no-store'}).then(async r=>{const d=await r.json();const admin=d.account?.role==='admin'||d.account?.email?.toLowerCase()==='joaquimmiguel1200@gmail.com';if(!r.ok||!admin)window.location.replace('/chat')}).catch(()=>window.location.replace('/chat'))},[])
  const [running,setRunning]=useState(false)
  const [results,setResults]=useState<Result[]>([])
  const [finishedAt,setFinishedAt]=useState<string|null>(null)
  const [error,setError]=useState('')
  async function run(){
    setRunning(true);setResults([]);setError('');setFinishedAt(null)
    const all:Result[]=[]
    for(const group of groups){
      for(const call of group.calls){
        const start=Date.now()
        try{
          const response=await fetch(call.path,{method:call.method,credentials:'include',headers:call.body?{'content-type':'application/json'}:undefined,body:call.body?JSON.stringify(call.body):undefined,cache:'no-store'})
          const raw=await response.text()
          let detail=raw
          try{detail=JSON.stringify(JSON.parse(raw))}catch{}
          all.push({name:group.name,path:call.path,status:response.status,ok:response.ok,ms:Date.now()-start,detail:detail.slice(0,900)})
        }catch(e){all.push({name:group.name,path:call.path,ok:false,ms:Date.now()-start,detail:e instanceof Error?e.message:String(e)})}
        setResults([...all])
      }
    }
    setFinishedAt(new Date().toLocaleString('pt-BR'));setRunning(false)
  }
  const passed=results.filter(x=>x.ok).length
  const failed=results.length-passed
  return <main style={{minHeight:'100vh',background:'#101012',color:'#f5f2ee',padding:'36px clamp(18px,4vw,56px)',fontFamily:'Arial,sans-serif'}}>
    <a href="/admin" style={{color:'#e9a080',textDecoration:'none',fontSize:13}}>← Painel administrativo</a>
    <div style={{maxWidth:1080,margin:'24px auto'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,flexWrap:'wrap'}}>
        <div><p style={{color:'#d99575',fontSize:11,letterSpacing:2}}>OPEN CLAUDE · ADMIN</p><h1 style={{fontSize:32,margin:'8px 0'}}>Diagnóstico e testes de APIs</h1><p style={{color:'#aaa',maxWidth:720,lineHeight:1.6}}>Executa 10 grupos de testes diretamente nesta sessão autenticada, incluindo Chat, Code, Cowork, catálogo de skills/agentes e escopos MCP. Os três modos finais usam o provedor real configurado na conta.</p></div>
        <button onClick={run} disabled={running} style={{background:running?'#444':'#e99a78',color:'#16120f',border:0,borderRadius:10,padding:'13px 18px',fontWeight:700,cursor:running?'wait':'pointer'}}>{running?'Executando…':'Executar 10 testes'}</button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:12,margin:'26px 0'}}>
        {[['Executados',results.length],['Aprovados',passed],['Falharam',failed]].map(([label,value])=><div key={label} style={{background:'#1a1a1e',border:'1px solid #303036',borderRadius:12,padding:16}}><div style={{color:'#999',fontSize:12}}>{label}</div><div style={{fontSize:28,fontWeight:700,marginTop:6}}>{value}</div></div>)}
      </div>
      {error&&<p style={{color:'#ff9b9b'}}>{error}</p>}
      <div style={{display:'grid',gap:10}}>
        {groups.map((g,i)=>{const rows=results.filter(r=>r.name===g.name);const done=rows.length===g.calls.length;const ok=done&&rows.every(r=>r.ok);return <section key={g.name} style={{background:'#18181c',border:'1px solid #303036',borderRadius:12,padding:16}}>
          <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center'}}><strong>{g.name}</strong><span style={{fontSize:11,color:!done?'#999':ok?'#8ed6a5':'#ff9999'}}>{!done?'Aguardando':ok?'APROVADO':'FALHOU'}</span></div>
          {rows.map((r,j)=><div key={r.path+j} style={{marginTop:12,paddingTop:10,borderTop:'1px solid #303036',fontSize:12}}>
            <div style={{display:'flex',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}><code>{r.path}</code><span style={{color:r.ok?'#8ed6a5':'#ff9999'}}>{r.status??'ERRO'} · {r.ms} ms</span></div>
            <pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',color:'#aaa',fontSize:11,maxHeight:130,overflow:'auto',marginTop:8}}>{r.detail}</pre>
          </div>)}
        </section>})}
      </div>
      {finishedAt&&<p style={{color:'#888',fontSize:12,marginTop:18}}>Finalizado em {finishedAt}. Total: {results.length} chamadas individuais.</p>}
      <p style={{color:'#777',fontSize:11,lineHeight:1.6,marginTop:22}}>Observação: Code roda em modo de prévia (não aplica alterações). Cowork recebe uma tarefa administrativa não destrutiva. Os testes Chat/Code/Cowork só passam se houver provedor/modelo válido e integrações necessárias conectadas. A tela não exibe chaves ou cookies.</p>
    </div>
  </main>
}
