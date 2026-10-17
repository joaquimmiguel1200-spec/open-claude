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
        <Link className="brand" href="/">OPEN CLAUDE</Link>
        <div className="nav-links">
          <Link href="#features">Recursos</Link>
          <Link href="#canvas">Canvas</Link>
          <Link href="/privacy">Privacidade</Link>
          <Link className="button secondary compact" href="/login">Entrar</Link>
          <Link className="button glow compact" href="/signup">Criar conta</Link>
        </div>
      </nav>

      <section className="hero landing-hero">
        <div className="hero-orbit" aria-hidden="true" />
        <div className="hero-content">
          <p className="kicker">PERSONAL AI WORKSPACE · OPEN CLAUDE</p>
          <h1>De uma ideia<br /><span>ao trabalho real.</span></h1>
          <p className="hero-copy">Converse, planeje código e organize tarefas em um workspace. Conecte seu provedor de IA para habilitar geração real; Code e Cowork também dependem das integrações e permissões necessárias.</p>
          <div className="actions">
            <Link className="button glow" href="/signup">Criar conta ↗</Link>
            <Link className="button secondary" href="/login">Entrar no workspace</Link>
          </div>
        </div>
        <div className="hero-window" id="canvas" aria-label="Prévia do workspace">
          <div className="window-bar"><span /><span /><span /><small>Open Claude · Workspace</small></div>
          <div className="window-body">
            <aside><b>OPEN CLAUDE</b><em>+ Novo chat</em><label>WORKSPACE</label><i>Chats</i><i>Projects</i><i>Files</i><i>Canvas</i><i>Skills</i></aside>
            <div className="window-chat"><small>NEW CONVERSATION</small><h2>O que vamos construir hoje?</h2><p>Think, create, code, and turn answers into real work.</p><div className="window-composer">Ask anything… <span>＋</span></div></div>
            <div className="window-canvas"><small>CANVAS · LIVE</small><h3>Product brief</h3><p>Um artefato editável conectado à conversa.</p><div className="mini-card">Contexto contínuo</div><div className="mini-card">Estrutura e ações</div></div>
          </div>
        </div>
      </section>

      <section className="feature-grid" id="features">
        {features.map(([title, description]) => <article className="feature" key={title}><span className="feature-index">0{features.findIndex(x => x[0] === title) + 1}</span><h3>{title}</h3><p>{description}</p></article>)}
      </section>

      <footer className="footer">Open Claude · Segurança, privacidade e controle por padrão. · <Link href="/privacy">Privacidade</Link> · <Link href="/terms">Termos</Link> · <Link href="/security">Segurança</Link> · <Link href="/cookies">Cookies</Link> · <Link href="/refunds">Reembolso</Link> · <Link href="/ai-policy">IA</Link></footer>
    </main>
  )
}
