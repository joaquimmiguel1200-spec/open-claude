'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

type AccessRequest = { user_id: string; email: string; status: 'pending'|'approved'|'rejected'; requested_at: string; reviewed_at: string|null; review_note: string|null }
export default function AdminUsersPage() {
  const [items,setItems] = useState<AccessRequest[]>([])
  const [loading,setLoading] = useState(true)
  const [error,setError] = useState('')
  const [busy,setBusy] = useState('')
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const response = await fetch('/api/admin/access',{cache:'no-store'})
      const body = await response.json().catch(()=>({}))
      if (response.status === 401) { window.location.href='/login'; return }
      if (!response.ok) throw new Error(response.status===403?'Acesso restrito ao administrador.':body.error||'Falha ao carregar cadastros.')
      setItems(body.requests ?? [])
    } catch(e) { setError(e instanceof Error?e.message:'Falha ao carregar cadastros.') }
    finally { setLoading(false) }
  },[])
  useEffect(()=>{load()},[load])
  async function review(item:AccessRequest,status:'approved'|'rejected') {
    setBusy(item.user_id);setError('')
    try {
      const response=await fetch('/api/admin/access',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({userId:item.user_id,status})})
      const body=await response.json().catch(()=>({}))
      if(!response.ok)throw new Error(body.error||'Não foi possível revisar o cadastro.')
      await load()
    } catch(e) {setError(e instanceof Error?e.message:'Falha na revisão.')}
    finally {setBusy('')}
  }
  const pending=items.filter(x=>x.status==='pending')
  return <main className="shell" style={{maxWidth:1100,padding:'32px 20px'}}>
    <nav style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:28}}>
      <Link href="/chat" className="app-nav-logo"><img src="/open-claude-logo.svg" alt="Open Claude" /></Link>
      <Link href="/chat">Voltar ao workspace</Link>
    </nav>
    <p className="kicker">ADMINISTRAÇÃO · CONTROLE DE ACESSO</p>
    <h1>Cadastros e aprovações</h1>
    <p className="muted">A conta administradora controla quem pode entrar no workspace. Aprovar libera o acesso; rejeitar mantém o bloqueio.</p>
    <div className="feature-grid" style={{margin:'24px 0'}}>
      <article className="feature"><span className="feature-index">PENDENTES</span><h3>{pending.length}</h3><p>Aguardando revisão</p></article>
      <article className="feature"><span className="feature-index">APROVADOS</span><h3>{items.filter(x=>x.status==='approved').length}</h3><p>Com acesso liberado</p></article>
      <article className="feature"><span className="feature-index">REJEITADOS</span><h3>{items.filter(x=>x.status==='rejected').length}</h3><p>Sem acesso ao workspace</p></article>
    </div>
    {error&&<p role="alert">{error}</p>}
    {loading?<p>Carregando solicitações…</p>:items.length===0?<p>Nenhum cadastro encontrado.</p>:<div style={{display:'grid',gap:12}}>
      {items.map(item=><article key={item.user_id} className="feature" style={{display:'flex',justifyContent:'space-between',gap:18,alignItems:'center',flexWrap:'wrap'}}>
        <div><b>{item.email}</b><p className="muted" style={{margin:'6px 0'}}>Solicitado em {new Date(item.requested_at).toLocaleString('pt-BR')} · {item.status}</p><small className="muted">{item.user_id}</small></div>
        <div style={{display:'flex',gap:8}}>
          {item.status!=='approved'&&<button className="button glow compact" disabled={!!busy} onClick={()=>review(item,'approved')}>{busy===item.user_id?'Salvando…':'Aprovar'}</button>}
          {item.status!=='rejected'&&<button className="button secondary compact" disabled={!!busy} onClick={()=>review(item,'rejected')}>Rejeitar</button>}
        </div>
      </article>)}
    </div>}
  </main>
}
