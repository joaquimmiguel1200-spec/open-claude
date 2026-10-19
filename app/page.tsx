import Link from 'next/link'

const features = [
  ['Contexto contínuo', 'Memória, projetos e arquivos trabalham juntos para a conversa não começar do zero.'],
  ['Canvas vivo', 'Transforme respostas em documentos, código, fluxos e artefatos editáveis.'],
  ['Ferramentas conectadas', 'Configure provedores de IA, Skills e integrações autorizadas no mesmo workspace. Algumas funções exigem credenciais próprias.'],
]

export default function HomePage() {
  return (
    <main className="landing shell">
      <nav className="nav landing-nav">
        <Link className="brand landing-brand" href="/"><img src="/icon.svg" alt="" width="34" height="34" /> <span>Open Claude</span></Link>
        <div className="nav-links">
          <Link href="#features">Recursos</Link>
          <Link href="/agents">535 agentes</Link>
          <Link href="#workspace-modes">Chat · Code · Cowork</Link>
          <Link href="/privacy">Privacidade</Link>
          <Link className="button secondary compact" href="/login">Entrar</Link>
          <Link className="button glow compact" href="/signup">Criar conta gratuita</Link>
        </div>
      </nav>

      <section className="hero landing-hero">
        <div className="hero-orbit" aria-hidden="true" />
        <div className="hero-content">
          <p className="kicker">UM ESPAÇO PARA PENSAR, CRIAR E CONSTRUIR</p>
          <h1>De uma ideia<br /><span>ao trabalho real.</span></h1>
          <p className="hero-copy">Converse, planeje código e organize tarefas em um workspace. Conecte seu provedor de IA para habilitar geração real; Code e Cowork também dependem das integrações e permissões necessárias.</p>
          <div className="actions">
            <Link className="button glow" href="/signup">Criar conta gratuita ↗</Link>
            <Link className="button secondary" href="/login">Entrar no workspace</Link>
          </div>
        </div>
        <div className="hero-window" id="canvas" aria-label="Prévia do workspace">
          <div className="window-bar"><span /><span /><span /><small>Open Claude · Workspace</small></div>
          <div className="window-body">
            <aside><b>OPEN CLAUDE</b><em>+ Novo chat</em><label>WORKSPACE</label><i>Chats</i><i>Projects</i><i>Files</i><i>Canvas</i><i>Skills</i></aside>
            <div className="window-chat"><small>NEW CONVERSATION</small><h2>O que vamos construir hoje?</h2><p>Pense com clareza. Crie com intenção. Construa com contexto.</p><div className="window-composer">O que vamos construir hoje? <span>＋</span></div></div>
            <div className="window-canvas"><small>CANVAS · LIVE</small><h3>Product brief</h3><p>Um artefato editável conectado à conversa.</p><div className="mini-card">Contexto contínuo</div><div className="mini-card">Estrutura e ações</div></div>
          </div>
        </div>
      </section>

      <section className="feature-grid" id="features">
        {features.map(([title, description]) => <article className="feature" key={title}><span className="feature-index">0{features.findIndex(x => x[0] === title) + 1}</span><h3>{title}</h3><p>{description}</p></article>)}
      </section>

      <section id="workspace-modes" className="feature-grid" aria-label="Modos do workspace">
        <article className="feature"><span className="feature-index">01</span><h3>Chat</h3><p>Conversas com streaming e histórico. A geração depende de um provedor de IA configurado e válido.</p><Link href="/chat">Abrir Chat ↗</Link></article>
        <article className="feature"><span className="feature-index">02</span><h3>Code</h3><p>Analisa arquivos autorizados, propõe alterações e exige comando de teste antes de aplicar mudanças no GitHub. Requer conexão GitHub e provedor de IA.</p><Link href="/settings/github">Conectar GitHub ↗</Link></article>
        <article className="feature"><span className="feature-index">03</span><h3>Cowork</h3><p>Divide tarefas em etapas e executa-as pelo runtime disponível. Requer provedor de IA; ações externas dependem das integrações e permissões conectadas.</p><Link href="/chat">Abrir workspace ↗</Link></article>
      </section>

      <footer className="footer">Open Claude · Segurança, privacidade e controle por padrão. · <Link href="/privacy">Privacidade</Link> · <Link href="/terms">Termos</Link> · <Link href="/security">Segurança</Link> · <Link href="/cookies">Cookies</Link> · <Link href="/refunds">Reembolso</Link> · <Link href="/ai-policy">IA</Link></footer>
    </main>
  )
}
