'use client'

import { FormEvent, useState } from 'react'

const navItems = ['Chats', 'Projects', 'Files', 'Canvas', 'Skills', 'GitHub', 'MCP']

export default function ChatPage() {
  const [message, setMessage] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [canvasOpen, setCanvasOpen] = useState(true)
  const [canvasTab, setCanvasTab] = useState<'preview' | 'code' | 'notes'>('preview')

  async function send(e: FormEvent) {
    e.preventDefault()
    if (!message.trim() || loading) return
    setLoading(true)
    setAnswer('')
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
        body: JSON.stringify({ message, honeypot: '', stream: true }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setAnswer(data.error || 'Não foi possível processar a solicitação.')
        return
      }
      if (!res.body) {
        setAnswer('Sem resposta do servidor.')
        return
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const frames = buffer.split('\n\n')
        buffer = frames.pop() || ''
        for (const frame of frames) {
          const line = frame.split('\n').find(item => item.startsWith('data: '))
          if (!line) continue
          try {
            const event = JSON.parse(line.slice(6))
            if (event.type === 'delta') setAnswer(current => current + (event.delta || ''))
            if (event.type === 'error') setAnswer(current => current || event.error?.message || 'Erro no modelo.')
          } catch {}
        }
      }
    } catch {
      setAnswer('Erro de conexão.')
    } finally {
      setLoading(false)
    }
  }

  function newChat() {
    setMessage('')
    setAnswer('')
  }

  return (
    <main className="workspace-page">
      <aside className="workspace-sidebar">
        <div className="sidebar-brand"><a className="brand" href="/">OPEN CLAUDE</a><span className="status-dot" /></div>
        <button className="sidebar-new" onClick={newChat}>＋ <span>Novo chat</span><kbd>⌘ K</kbd></button>
        <p className="sidebar-label">WORKSPACE</p>
        <nav className="workspace-nav">
          {navItems.map((item, index) => <button key={item} className={item === 'Chats' ? 'active' : ''} onClick={() => item === 'Canvas' && setCanvasOpen(true)}><span className="nav-glyph">{['◌', '◇', '□', '✦', '✣', '⌘', '⊕'][index]}</span>{item}</button>)}
        </nav>
        <div className="sidebar-bottom"><a href="/settings">Settings</a><a href="/">← Site</a></div>
      </aside>

      <section className="conversation-pane">
        <header className="conversation-header"><div><span className="eyebrow">WORKSPACE</span><strong>New conversation</strong></div><div className="header-actions"><button aria-label="Compartilhar">↗</button><button aria-label="Mais opções">•••</button>{!canvasOpen && <button className="canvas-toggle" onClick={() => setCanvasOpen(true)}>Canvas</button>}</div></header>
        <div className="conversation-scroll">
          <div className="conversation-content">
            <div className="welcome-block"><span className="eyebrow accent">OPEN CLAUDE · READY</span><h1>O que vamos construir hoje?</h1><p>Seu espaço para pensar, criar, codificar e transformar respostas em trabalho.</p></div>
            <div className="suggestions"><button onClick={() => setMessage('Crie um plano para este projeto')}>✦ Planejar um projeto</button><button onClick={() => setMessage('Analise este problema e proponha uma solução')}>⌁ Analisar um problema</button><button onClick={() => setCanvasOpen(true)}>▧ Abrir Canvas</button></div>
            {answer && <article className="assistant-message"><div className="message-label"><span className="avatar">O</span><b>Open Claude</b><span>agora</span></div><p>{answer}</p></article>}
          </div>
        </div>
        <form className="composer-v2" onSubmit={send}>
          <textarea aria-label="Mensagem" maxLength={12000} value={message} onChange={e => setMessage(e.target.value)} placeholder="Pergunte qualquer coisa…" rows={2} />
          <div className="composer-bottom"><div className="composer-tools"><button type="button" aria-label="Anexar">＋</button><button type="button">Anexar</button><button type="button" onClick={() => setCanvasOpen(true)}>Canvas</button><button type="button">Ferramentas</button></div><button className="send-button" disabled={loading || !message.trim()} aria-label="Enviar">{loading ? '…' : '↑'}</button></div>
        </form>
        <p className="composer-note">Open Claude pode cometer erros. Verifique informações importantes.</p>
      </section>

      {canvasOpen && <aside className="canvas-pane">
        <header className="canvas-header"><div><span className="eyebrow accent">CANVAS</span><strong>Live workspace</strong></div><button onClick={() => setCanvasOpen(false)} aria-label="Fechar Canvas">×</button></header>
        <div className="canvas-tabs">{(['preview', 'code', 'notes'] as const).map(tab => <button key={tab} className={canvasTab === tab ? 'active' : ''} onClick={() => setCanvasTab(tab)}>{tab === 'preview' ? 'Preview' : tab === 'code' ? 'Code' : 'Notes'}</button>)}</div>
        <div className="canvas-surface">
          {canvasTab === 'preview' && <div className="artifact"><span className="artifact-kicker">PROJECT CANVAS</span><h2>Product brief</h2><p className="artifact-intro">Um artefato editável conectado à conversa. Organize ideias, estrutura e próximas ações sem sair do workspace.</p><section><b>Contexto</b><p>Conversa, arquivos e memória permanecem ligados ao artefato.</p></section><section><b>Estrutura</b><p>Use blocos, frames e seções para dar forma ao trabalho.</p></section><section><b>Próximas ações</b><p>Edite, revise, compartilhe e continue trabalhando.</p></section></div>}
          {canvasTab === 'code' && <pre className="code-preview">{`export function ProductBrief() {\n  return {\n    context: 'continuous',\n    artifact: 'editable',\n    next: ['edit', 'review', 'share'],\n  }\n}`}</pre>}
          {canvasTab === 'notes' && <div className="notes-preview"><h3>Notas do Canvas</h3><p>Use este espaço para registrar decisões, referências e ideias que devem permanecer próximas do artefato.</p><div className="note-line" /><div className="note-line short" /></div>}
        </div>
        <footer className="canvas-footer"><span>● Saved</span><button>Share</button></footer>
      </aside>}
    </main>
  )
}
