'use client'
import {useEffect,useState} from 'react'
import Link from 'next/link'
import {createSupabaseBrowserClient} from '@/lib/supabase/browser'
export default function AccountPage(){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[confirm,setConfirm]=useState(''),[requests,setRequests]=useState<any[]>([])
 async function loadRequests(){const r=await fetch('/api/security/center');if(r.ok)setRequests((await r.json()).requests??[])}
 useEffect(()=>{loadRequests()},[])
 async function exportData(){setBusy(true);setError('');try{const r=await fetch('/api/account');if(!r.ok)throw new Error((await r.json()).error||'Falha na exportação.');const blob=await r.blob();const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='open-claude-data.json';a.click();URL.revokeObjectURL(url)}catch(e){setError(e instanceof Error?e.message:'Falha na exportação.')}finally{setBusy(false)}}
 async function request(type:string){setError('');const r=await fetch('/api/security/center',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'request',type})});const x=await r.json();if(!r.ok)setError(x.error||'Falha na solicitação.');else loadRequests()}
 async function deleteAccount(){if(!confirm)return;setBusy(true);setError('');try{const r=await fetch('/api/account',{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify({confirm})});const x=await r.json();if(!r.ok)throw new Error(x.error||'Falha ao excluir.');await createSupabaseBrowserClient().auth.signOut({scope:'global'});location.href='/'}catch(e){setError(e instanceof Error?e.message:'Falha ao excluir a conta.');setBusy(false)}}
 return <main className="shell"><nav className="nav"><Link className="brand" href="/chat">OPEN CLAUDE</Link><Link className="muted" href="/settings">Configurações</Link></nav><section className="chat">
 <div className="card"><h1>Privacidade e conta</h1><p className="muted">Você controla seus dados. Segredos de API e tokens privados nunca são devolvidos pela exportação.</p><button className="button" onClick={exportData} disabled={busy}>Exportar meus dados</button><div className="actions" style={{marginTop:10}}><button className="button secondary" onClick={()=>request('portability')}>Solicitar portabilidade</button><button className="button secondary" onClick={()=>request('subprocessor')}>Solicitar exclusão em subprocessadores</button></div></div>
 <div className="card" style={{marginTop:16}}><h2>Excluir conta</h2><p className="muted">A exclusão remove a conta e os dados associados em cascata. Arquivos privados do Storage também são removidos.</p><label>Digite seu e-mail para confirmar<input type="email" value={confirm} onChange={e=>setConfirm(e.target.value)} autoComplete="email"/></label><button className="button secondary" onClick={deleteAccount} disabled={busy||!confirm}>Excluir permanentemente</button>{error&&<p role="alert">{error}</p>}</div>
 <div className="card" style={{marginTop:16}}><h2>Solicitações de dados</h2>{requests.length?requests.map(r=><p className="muted" key={r.id}>{r.request_type} · {r.status} · {new Date(r.created_at).toLocaleString('pt-BR')}</p>):<p className="muted">Nenhuma solicitação aberta.</p>}</div>
 </section></main>
}
