'use client'
import {useEffect,useMemo,useState} from 'react'
import Link from 'next/link'

const examples=[
 {name:'Google Drive',category:'Produtividade',description:'Pesquisar e acessar arquivos e documentos.'},
 {name:'Gmail',category:'Comunicação',description:'Pesquisar mensagens e preparar rascunhos.'},
 {name:'Google Calendar',category:'Produtividade',description:'Consultar e organizar agenda.'},
 {name:'Microsoft 365',category:'Produtividade',description:'SharePoint, OneDrive, Outlook e Teams.'},
 {name:'Canva',category:'Criativo',description:'Pesquisar, criar e exportar designs.'},
 {name:'Slack',category:'Comunicação',description:'Pesquisar canais e trabalhar com mensagens.'},
 {name:'Asana',category:'Gestão',description:'Consultar e organizar tarefas e projetos.'},
 {name:'Atlassian',category:'Desenvolvimento',description:'Jira, Confluence, issues e documentação.'},
 {name:'Cloudflare',category:'Desenvolvimento',description:'Gerenciar e diagnosticar serviços Cloudflare.'},
 {name:'Notion',category:'Produtividade',description:'Consultar e organizar páginas e bases.'},
 {name:'Linear',category:'Desenvolvimento',description:'Gerenciar issues e ciclos de desenvolvimento.'},
]
export default function AdminConnectorsPage(){
 const [authorized,setAuthorized]=useState(false),[checking,setChecking]=useState(true),[error,setError]=useState('')
 const [name,setName]=useState(''),[id,setId]=useState(''),[url,setUrl]=useState(''),[token,setToken]=useState(''),[modes,setModes]=useState(['chat','code','cowork']),[output,setOutput]=useState('')
 const [search,setSearch]=useState('')
 useEffect(()=>{fetch('/api/workspace',{cache:'no-store'}).then(async r=>{const d=await r.json();const ok=r.ok&&(d.account?.role==='admin'||d.account?.email?.toLowerCase()==='joaquimmiguel1200@gmail.com');setAuthorized(ok);if(!ok)setError('Acesso restrito ao administrador.')}).catch(()=>setError('Não foi possível validar sua sessão.')).finally(()=>setChecking(false))},[])
 const filtered=useMemo(()=>examples.filter(x=>(x.name+' '+x.category+' '+x.description).toLowerCase().includes(search.toLowerCase())),[search])
 function toggleMode(mode:string){setModes(current=>current.includes(mode)?current.filter(x=>x!==mode):[...current,mode])}
 function generate(){
  setError('');setOutput('')
  const cleanId=(id||name).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9_-]+/g,'-').replace(/^-|-$/g,'').slice(0,48)
  let parsed:URL
  try{parsed=new URL(url)}catch{setError('Informe uma URL MCP válida.');return}
  if(parsed.protocol!=='https:'){setError('Em produção, o servidor MCP precisa usar HTTPS.');return}
  if(!name.trim()||!cleanId||!modes.length){setError('Informe nome, identificador e pelo menos um modo.');return}
  const envName='MCP_'+cleanId.toUpperCase().replace(/-/g,'_')+'_TOKEN'
  const server={id:cleanId,name:name.trim(),url:parsed.toString(),...(token.trim()?{tokenEnv:envName}:{}),enabled:true,modes}
  const json=JSON.stringify([server],null,2)
  setOutput('MCP_SERVERS_JSON='+json+(token.trim()?'\\n'+envName+'='+token.trim():''))
 }
 async function copy(){if(!output)return;try{await navigator.clipboard.writeText(output);setError('Configuração copiada. Adicione as duas variáveis no Vercel → Settings → Environment Variables e faça novo deploy.')}catch{setError('Não foi possível copiar automaticamente. Selecione o texto e copie manualmente.')}}
 return <main className="shell" style={{maxWidth:1120,paddingTop:32,paddingBottom:60}}>
  <nav className="nav"><Link href="/admin">← Painel administrativo</Link><Link href="/chat">Workspace</Link></nav>
  <p className="eyebrow" style={{marginTop:28}}>ADMINISTRAÇÃO · CONECTORES</p><h1>Catálogo e credenciais MCP</h1>
  <p className="muted" style={{maxWidth:800,lineHeight:1.7}}>Consulte o diretório oficial e prepare a configuração dos servidores remotos usados pelo Open Claude. A lista abaixo é uma seleção inicial de conectores conhecidos — não representa todos os itens do diretório oficial.</p>
  {checking?<p>Validando acesso…</p>:!authorized?<p role="alert">{error}</p>:<>
   <section className="feature" style={{marginTop:22}}>
    <span className="feature-index">DIRETÓRIO OFICIAL ANTHROPIC</span><h2>1.045 conectores publicados</h2><p className="muted">O catálogo oficial é atualizado continuamente. Abra-o para consultar a lista integral, filtros, fornecedores e disponibilidade.</p><a className="button" href="https://claude.com/marketplace/connectors-plugins" target="_blank" rel="noreferrer">Abrir diretório oficial ↗</a>
   </section>
   <section className="feature" style={{marginTop:16}}>
    <span className="feature-index">EXEMPLOS DE CONECTORES</span><h2>Conectores populares</h2><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Filtrar por nome, categoria ou função…" style={{width:'100%',maxWidth:520,padding:11,borderRadius:9,border:'1px solid var(--line)',background:'var(--surface-2)',color:'var(--text)'}}/>
    <div className="feature-grid" style={{marginTop:14}}>{filtered.map(x=><article className="feature" key={x.name}><small className="feature-index">{x.category}</small><h3>{x.name}</h3><p>{x.description}</p></article>)}</div>
   </section>
   <section className="feature" style={{marginTop:16}}>
    <span className="feature-index">2. CONFIGURAR CREDENCIAL</span><h2>Adicionar servidor MCP remoto</h2><p className="muted">Informe a URL pública HTTPS e o token de autenticação. Esta tela não salva nem exibe novamente o segredo: ela gera as variáveis para você cadastrar no ambiente de produção.</p>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(230px,1fr))',gap:12,marginTop:16}}>
     <label>Nome do conector<input value={name} onChange={e=>setName(e.target.value)} placeholder="Ex.: Meu servidor MCP"/></label>
     <label>Identificador (opcional)<input value={id} onChange={e=>setId(e.target.value)} placeholder="meu-servidor"/></label>
     <label style={{gridColumn:'1/-1'}}>URL do servidor MCP<input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://mcp.exemplo.com/mcp"/></label>
     <label style={{gridColumn:'1/-1'}}>Bearer token<input type="password" autoComplete="off" value={token} onChange={e=>setToken(e.target.value)} placeholder="Token do servidor MCP"/></label>
    </div>
    <div style={{display:'flex',gap:14,flexWrap:'wrap',margin:'16px 0'}}>{['chat','code','cowork'].map(m=><label key={m} style={{display:'flex',gap:7,alignItems:'center'}}><input type="checkbox" checked={modes.includes(m)} onChange={()=>toggleMode(m)}/>{m.toUpperCase()}</label>)}</div>
    <button className="button" onClick={generate}>Gerar variáveis seguras</button>
    {error&&<p role="status" className="muted" style={{marginTop:12}}>{error}</p>}
    {output&&<div style={{marginTop:16}}><textarea readOnly value={output} rows={8} style={{width:'100%',fontFamily:'monospace',padding:12,borderRadius:10,background:'var(--surface-2)',color:'var(--text)',border:'1px solid var(--line)'}}/><button className="button secondary" onClick={copy} style={{marginTop:10}}>Copiar configuração</button></div>}
   </section>
   <section className="feature" style={{marginTop:16}}><h3>3. Onde cadastrar</h3><ol className="muted" style={{lineHeight:1.9}}><li>Abra o projeto <b>open-claude</b> na Vercel.</li><li>Entre em Settings → Environment Variables.</li><li>Cadastre <code>MCP_SERVERS_JSON</code> e a variável secreta gerada para o token.</li><li>Selecione Production e Preview conforme necessário e salve.</li><li>Faça um novo deploy. Depois teste em <Link href="/mcp">MCP e conexões</Link>.</li></ol><p className="muted">Não coloque tokens no GitHub, em arquivos públicos, no chat ou em variáveis NEXT_PUBLIC_. Os conectores só executam ferramentas marcadas como somente leitura nesta versão.</p></section>
  </>}
 </main>
}