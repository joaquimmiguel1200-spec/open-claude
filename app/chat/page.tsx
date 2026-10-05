'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'

type Mode = 'chat' | 'code' | 'cowork'
type Project = { id: string; name: string; description?: string | null }
type Chat = { id: string; project_id?: string | null; title?: string | null; model?: string | null; created_at: string; updated_at: string }

type MenuItem = { id: string; label: string; icon: string }
const menu: MenuItem[] = [
  { id: 'chats', label: 'Chats', icon: '◌' },
  { id: 'projects', label: 'Projetos', icon: '◇' },
  { id: 'artifacts', label: 'Artifacts', icon: '✦' },
  { id: 'code', label: 'Code', icon: '</>' },
  { id: 'cowork', label: 'Cowork', icon: '⌁' },
  { id: 'files', label: 'Arquivos', icon: '□' },
  { id: 'skills', label: 'Skills', icon: '✣' },
  { id: 'github', label: 'GitHub', icon: '⌘' },
  { id: 'mcp', label: 'MCP & Conexões', icon: '⊕' },
]

const modeCopy: Record<Mode, { label: string; hint: string; icon: string }> = {
  chat: { label: 'Chat', hint: 'Conversa, pesquisa e criação', icon: '◌' },
  code: { label: 'Code', hint: 'Construção, revisão e debugging', icon: '</>' },
  cowork: { label: 'Cowork', hint: 'Delegue trabalho em etapas', icon: '⌁' },
}

export default function ChatPage() {
  const [message, setMessage] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [canvasOpen, setCanvasOpen] = useState(true)
  const [canvasTab, setCanvasTab] = useState<'preview' | 'code' | 'notes'>('preview')
  const [mode, setMode] = useState<Mode>('chat')
  const [modeOpen, setModeOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState('chats')
  const [chatId, setChatId] = useState<string | null>(null)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [chats, setChats] = useState<Chat[]>([])
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [customizeOpen, setCustomizeOpen] = useState(false)
  const [customInstructions, setCustomInstructions] = useState('')
  const [profileName, setProfileName] = useState('')
  const [newProjectOpen, setNewProjectOpen] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDescription, setNewProjectDescription] = useState('')
  const [loadingWorkspace, setLoadingWorkspace] = useState(true)

  async function loadWorkspace() {
    setLoadingWorkspace(true)
    try {
      const res = await fetch('/api/workspace', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      setProjects(data.projects ?? [])
      setChats(data.chats ?? [])
      setProfileName(data.profile?.display_name ?? '')
      setCustomInstructions(data.profile?.preferences?.customInstructions ?? '')
    } finally {
      setLoadingWorkspace(false)
    }
  }

  useEffect(() => { loadWorkspace() }, [])

  const visibleChats = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return chats.slice(0, 30)
    return chats.filter(chat => (chat.title ?? 'Nova conversa').toLowerCase().includes(query)).slice(0, 30)
  }, [chats, search])

  async function createChat(nextProjectId = projectId, nextMode: Mode = mode) {
    const res = await fetch('/api/workspace', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'chat', projectId: nextProjectId, mode: nextMode, title: nextMode === 'code' ? 'Nova sessão Code' : nextMode === 'cowork' ? 'Novo trabalho Cowork' : 'Nova conversa' }),
    })
    if (!res.ok) return null
    const data = await res.json()
    setChatId(data.chat.id)
    setAnswer('')
    setMessage('')
    setChats(current => [data.chat, ...current.filter(item => item.id !== data.chat.id)])
    return data.chat.id as string
  }

  async function newChat() { await createChat(projectId, mode) }

  async function selectChat(chat: Chat) {
    setChatId(chat.id)
    setProjectId(chat.project_id ?? null)
    setAnswer('')
    setMessage('')
    setMenuOpen('chats')
    setCanvasOpen(true)
  }

  async function createProject() {
    if (!newProjectName.trim()) return
    const res = await fetch('/api/workspace', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'project', name: newProjectName, description: newProjectDescription }),
    })
    if (!res.ok) return
    const data = await res.json()
    setProjects(current => [data.project, ...current])
    setProjectId(data.project.id)
    setNewProjectName('')
    setNewProjectDescription('')
    setNewProjectOpen(false)
    setMenuOpen('projects')
  }

  async function saveCustomization() {
    await fetch('/api/workspace', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'preferences', preferences: { customInstructions } }),
    })
    setCustomizeOpen(false)
  }

  async function send(e?: FormEvent) {
    e?.preventDefault()
    if (!message.trim() || loading) return
    setLoading(true)
    setAnswer('')
    try {
      const activeChatId = chatId ?? await createChat(projectId, mode)
      if (!activeChatId) { setAnswer('Não foi possível criar a conversa.'); return }
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
        body: JSON.stringify({ message, chatId: activeChatId, projectId: projectId || undefined, mode, customInstructions, honeypot: '', stream: true }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setAnswer(data.error || 'Não foi possível processar a solicitação.')
        return
      }
      if (!res.body) { setAnswer('Sem resposta do servidor.'); return }
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
      setMessage('')
      loadWorkspace()
    } catch { setAnswer('Erro de conexão.') } finally { setLoading(false) }
  }

  function chooseMode(next: Mode) {
    setMode(next)
    setModeOpen(false)
    if (next !== 'chat') setCanvasOpen(true)
  }

  return (
    <main className="claude-workspace">
      <aside className="claude-sidebar">
        <div className="claude-sidebar-top">
          <div className="claude-brand-row"><a href="/" className="claude-brand">OPEN CLAUDE</a><span className="claude-status" /></div>
          <button className="new-chat-button" onClick={newChat}><span>＋</span> Novo chat <kbd>⌘K</kbd></button>
          <button className="search-button" onClick={() => setSearchOpen(value => !value)}>⌕ <span>Pesquisar chats</span><kbd>⌘K</kbd></button>
          {searchOpen && <div className="chat-search"><input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar no histórico…" /></div>}
          <div className="sidebar-section-label">WORKSPACE</div>
          <nav className="claude-nav">
            {menu.map(item => <button key={item.id} className={menuOpen === item.id ? 'active' : ''} onClick={() => { setMenuOpen(item.id); if (item.id === 'code') chooseMode('code'); if (item.id === 'cowork') chooseMode('cowork'); if (item.id === 'artifacts') setCanvasOpen(true) }}><span className="menu-icon">{item.icon}</span><span>{item.label}</span></button>)}
          </nav>
        </div>
        <div className="sidebar-projects">
          <div className="sidebar-project-head"><span>PROJETOS RECENTES</span><button onClick={() => setNewProjectOpen(true)}>＋</button></div>
          {projects.slice(0, 4).map(project => <button key={project.id} className={projectId === project.id ? 'project-link active' : 'project-link'} onClick={() => { setProjectId(project.id); setMenuOpen('projects') }}><span className="project-dot" />{project.name}</button>)}
          {!projects.length && !loadingWorkspace && <p className="empty-sidebar">Crie um projeto para guardar contexto e chats.</p>}
        </div>
        <div className="claude-account">
          <button onClick={() => setCustomizeOpen(true)}><span className="account-avatar">{(profileName || 'O').slice(0, 1).toUpperCase()}</span><span><b>{profileName || 'Open Claude'}</b><small>Personalizar</small></span><span className="account-more">•••</span></button>
        </div>
      </aside>

      <section className="claude-main">
        <header className="claude-main-header">
          <div className="main-title"><span className="header-eyebrow">{projectId ? projects.find(p => p.id === projectId)?.name ?? 'Projeto' : modeCopy[mode].label}</span><strong>{chatId ? (chats.find(c => c.id === chatId)?.title ?? 'Conversa') : 'Nova conversa'}</strong></div>
          <div className="header-actions"><button onClick={() => setCustomizeOpen(true)}>⚙</button><button>↗</button><button>•••</button></div>
        </header>

        <div className="main-scroll">
          {menuOpen === 'projects' && <div className="workspace-hub"><div className="hub-head"><div><span className="header-eyebrow">WORKSPACE</span><h1>Projetos</h1><p>Contexto, arquivos e conversas organizados em um só lugar.</p></div><button className="hub-primary" onClick={() => setNewProjectOpen(true)}>＋ Novo projeto</button></div><div className="project-grid">{projects.map(project => <button className="project-card" key={project.id} onClick={() => { setProjectId(project.id); setMenuOpen('chats') }}><span className="project-card-icon">◇</span><b>{project.name}</b><p>{project.description || 'Sem descrição. Adicione contexto e comece a trabalhar.'}</p></button>)}{!projects.length && <div className="empty-state">Nenhum projeto ainda.</div>}</div></div>}
          {menuOpen !== 'projects' && <div className="conversation-area">
            <div className="welcome-area"><span className="header-eyebrow accent">PERSONAL AI WORKSPACE</span><h1>{mode === 'code' ? 'O que vamos construir?' : mode === 'cowork' ? 'O que vamos colocar em andamento?' : 'Como posso ajudar?'}</h1><p>{modeCopy[mode].hint}. Seu contexto, projetos, arquivos e histórico ficam no mesmo espaço.</p></div>
            <div className="quick-prompts"><button onClick={() => setMessage('Analise este projeto e proponha os próximos passos.')}>✦ Planejar</button><button onClick={() => { chooseMode('code'); setMessage('Revise este código, encontre problemas e proponha uma implementação melhor.') }}>&lt;/&gt; Revisar código</button><button onClick={() => { chooseMode('cowork'); setMessage('Organize este trabalho em etapas e me diga o que deve ser executado primeiro.') }}>⌁ Delegar trabalho</button><button onClick={() => setCanvasOpen(true)}>▧ Abrir Canvas</button></div>
            {answer && <article className="answer-card"><div className="answer-meta"><span className="answer-avatar">O</span><b>Open Claude</b><span>{modeCopy[mode].label}</span></div><div className="answer-body">{answer}</div></article>}
            {menuOpen === 'chats' && <div className="history-panel"><div className="history-title"><span>Histórico recente</span><span>{visibleChats.length} conversas</span></div>{visibleChats.map(chat => <button key={chat.id} className="history-row" onClick={() => selectChat(chat)}><span className="history-icon">◌</span><span><b>{chat.title || 'Nova conversa'}</b><small>{new Date(chat.updated_at).toLocaleDateString('pt-BR')}</small></span><span>›</span></button>)}{!visibleChats.length && <p className="history-empty">Suas conversas aparecerão aqui.</p>}</div>}
          </div>}
        </div>

        <form className="claude-composer" onSubmit={send}>
          <div className="composer-context-row">
            {projectId && <button type="button" className="context-chip" onClick={() => setProjectId(null)}>◇ {projects.find(p => p.id === projectId)?.name} ×</button>}
            {mode !== 'chat' && <button type="button" className="context-chip mode-chip" onClick={() => setModeOpen(v => !v)}>{modeCopy[mode].icon} {modeCopy[mode].label} ×</button>}
          </div>
          <textarea aria-label="Mensagem" maxLength={12000} value={message} onChange={e => setMessage(e.target.value)} placeholder={mode === 'code' ? 'Descreva o código que vamos construir…' : mode === 'cowork' ? 'Dê uma tarefa para o Cowork organizar…' : 'Pergunte qualquer coisa…'} rows={2} />
          <div className="composer-toolbar"><div className="composer-left"><button type="button" className="tool-circle">＋</button><button type="button" onClick={() => setCanvasOpen(true)}>Artifacts</button><button type="button">Anexar</button><button type="button">Ferramentas</button><div className="mode-picker"><button type="button" className="mode-trigger" onClick={() => setModeOpen(v => !v)}>{modeCopy[mode].icon} {modeCopy[mode].label}⌄</button>{modeOpen && <div className="mode-menu">{(Object.keys(modeCopy) as Mode[]).map(key => <button type="button" key={key} onClick={() => chooseMode(key)}><span>{modeCopy[key].icon}</span><span><b>{modeCopy[key].label}</b><small>{modeCopy[key].hint}</small></span>{mode === key && <i>✓</i>}</button>)}</div>}</div></div><button className="send-button-v3" disabled={loading || !message.trim()} aria-label="Enviar">{loading ? '…' : '↑'}</button></div>
        </form>
        <p className="composer-disclaimer">Open Claude pode cometer erros. Verifique informações importantes.</p>
      </section>

      {canvasOpen && <aside className="claude-canvas"><header><div><span className="header-eyebrow accent">ARTIFACT</span><strong>Canvas</strong></div><div><button>↗</button><button onClick={() => setCanvasOpen(false)}>×</button></div></header><div className="canvas-tabs">{(['preview', 'code', 'notes'] as const).map(tab => <button key={tab} className={canvasTab === tab ? 'active' : ''} onClick={() => setCanvasTab(tab)}>{tab === 'preview' ? 'Preview' : tab === 'code' ? 'Code' : 'Notes'}</button>)}</div><div className="canvas-content">{canvasTab === 'preview' && <div className="artifact-doc"><span className="artifact-tag">OPEN CLAUDE / CANVAS</span><h2>Product brief</h2><p>Um espaço paralelo à conversa para editar, revisar e transformar respostas em trabalho.</p><div className="artifact-block"><b>Contexto</b><span>Projeto, memória e conversa conectados.</span></div><div className="artifact-block"><b>Estrutura</b><span>Documentos, código, planos e outros artefatos.</span></div><div className="artifact-block"><b>Próximo passo</b><span>Continue a conversa e refine o artefato.</span></div></div>}{canvasTab === 'code' && <pre className="artifact-code">{`// Open Claude Canvas\nexport function WorkspaceArtifact() {\n  return {\n    editable: true,\n    connectedToChat: true,\n    mode: '${mode}',\n  }\n}`}</pre>}{canvasTab === 'notes' && <div className="artifact-notes"><h3>Notas</h3><p>Registre decisões, referências e coisas para lembrar durante o trabalho.</p><div className="note-rule"/><div className="note-rule short"/></div>}</div><footer><span>● Salvo</span><button>Compartilhar</button></footer></aside>}

      {customizeOpen && <div className="modal-backdrop" onMouseDown={() => setCustomizeOpen(false)}><section className="modal-card" onMouseDown={e => e.stopPropagation()}><header><div><span className="header-eyebrow">PERSONALIZAÇÃO</span><h2>Como você quer que o Open Claude responda?</h2></div><button onClick={() => setCustomizeOpen(false)}>×</button></header><label>Nome de exibição<input value={profileName} onChange={e => setProfileName(e.target.value)} placeholder="Seu nome" /></label><label>Instruções personalizadas<textarea value={customInstructions} onChange={e => setCustomInstructions(e.target.value)} placeholder="Ex.: responda em português, seja direto, use listas quando ajudar…" rows={6} /></label><div className="modal-actions"><button className="modal-secondary" onClick={() => setCustomizeOpen(false)}>Cancelar</button><button className="modal-primary" onClick={saveCustomization}>Salvar personalização</button></div></section></div>}

      {newProjectOpen && <div className="modal-backdrop" onMouseDown={() => setNewProjectOpen(false)}><section className="modal-card compact-modal" onMouseDown={e => e.stopPropagation()}><header><div><span className="header-eyebrow">NOVO PROJETO</span><h2>Crie um espaço de trabalho</h2></div><button onClick={() => setNewProjectOpen(false)}>×</button></header><label>Nome<input autoFocus value={newProjectName} onChange={e => setNewProjectName(e.target.value)} placeholder="Ex.: Open Claude" /></label><label>Descrição<textarea value={newProjectDescription} onChange={e => setNewProjectDescription(e.target.value)} placeholder="Para que este projeto serve?" rows={3} /></label><div className="modal-actions"><button className="modal-secondary" onClick={() => setNewProjectOpen(false)}>Cancelar</button><button className="modal-primary" onClick={createProject} disabled={!newProjectName.trim()}>Criar projeto</button></div></section></div>}
    </main>
  )
}
