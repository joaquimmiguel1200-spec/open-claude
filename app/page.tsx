import Link from 'next/link'

const capabilities = [
 {n:'01',title:'Contexto que acompanha o trabalho',body:'Projetos, arquivos, memória e histórico formam uma base contextual organizada. O sistema seleciona o que é relevante e reserva espaço para a resposta.'},
 {n:'02',title:'Modelos e provedores à sua escolha',body:'Conecte provedores por API, compare modelos e escolha estratégias por custo, velocidade ou qualidade. As chaves são armazenadas criptografadas no servidor.'},
 {n:'03',title:'Agentes especializados',body:'Importe agentes no formato OpenCode, atribua modelos próprios e combine especialistas em fluxos de Chat, Code e Cowork.'},
 {n:'04',title:'Trabalho com ferramentas e permissões',body:'Conecte GitHub, MCP e ferramentas do workspace. Ações sensíveis respeitam permissões, escopo e confirmação.'},
]
export default function HomePage() {
 return <main className="landing shell">
  <nav className="nav landing-nav">
   <Link className="brand landing-brand" href="/"><img src="/open-claude-logo.svg" alt="Open Claude" width="196" height="54"/></Link>
   <div className="nav-links"><Link href="#platform">Plataforma</Link><Link href="#models">Modelos</Link><Link href="#agents">Agentes</Link><Link href="/agents">Catálogo</Link><Link href="/privacy">Privacidade</Link><Link className="button secondary compact" href="/login">Entrar</Link><Link className="button glow compact" href="/signup">Solicitar acesso</Link></div>
  </nav>
  <section className="hero landing-hero"><div className="hero-orbit" aria-hidden="true"/>
   <div className="hero-content"><p className="kicker">AI WORKSPACE · MODELOS · AGENTES · FERRAMENTAS · EXECUÇÃO</p><h1>Uma plataforma.<br/><span>Todo o trabalho conectado.</span></h1>
    <p className="hero-copy">Um workspace de IA para pensar, criar e executar. Conecte modelos, agentes especializados, skills, projetos e ferramentas em um só lugar — com fluxos separados para Chat, Code e Cowork, controle de acesso e contexto compartilhado.</p>
    <div className="actions"><Link className="button glow" href="/signup">Solicitar acesso ↗</Link><Link className="button secondary" href="#platform">Conhecer a plataforma</Link></div>
   </div>
   <div className="hero-window" aria-label="Prévia da plataforma"><div className="window-bar"><span/><span/><span/><small>Open Claude · AI Workspace</small></div><div className="window-body">
    <aside><b>OPEN CLAUDE</b><em>+ Novo trabalho</em><label>WORKSPACE</label><i>Chat</i><i>Code</i><i>Cowork</i><i>Projetos</i><i>Agentes</i></aside>
    <div className="window-chat"><small>ORQUESTRAÇÃO DE MODELOS</small><h2>Qual é o próximo desafio?</h2><p>Um modelo principal, agentes especialistas e contexto compartilhado.</p><div className="window-composer">Descreva o trabalho… <span>＋</span></div></div>
    <div className="window-canvas"><small>AGENT TEAM</small><h3>Equipe ativa</h3><p>Pesquisa · Engenharia · Revisão</p><div className="mini-card">Modelo principal</div><div className="mini-card">Agentes especializados</div></div>
   </div></div>
  </section>
  <section id="platform" className="feature-grid">{capabilities.map(x=><article className="feature" key={x.n}><span className="feature-index">{x.n}</span><h3>{x.title}</h3><p>{x.body}</p></article>)}</section>
  <section id="models" className="feature-grid">
   <article className="feature"><span className="feature-index">MODEL LAYER</span><h3>Escolha a inteligência</h3><p>Use modelos hospedados por provedores externos ou serviços compatíveis. Cada conexão precisa de credencial, modelo e teste válidos.</p><Link href="/settings/apis">Configurar provedores ↗</Link></article>
   <article className="feature"><span className="feature-index">ROUTING</span><h3>Eficiência de contexto</h3><p>Estimativa de tokens, deduplicação de contexto, prioridades para memória e documentos, reserva de saída e seleção de modelos por estratégia. O uso real é confirmado pelo provedor.</p></article>
   <article className="feature"><span className="feature-index">OBSERVABILIDADE</span><h3>Transparência operacional</h3><p>Uso, latência, provedor e modelo devem ser registrados por execução. O roteamento não esconde falhas nem promete economia sem medição.</p></article>
  </section>
  <section id="agents" className="feature-grid">
   <article className="feature"><span className="feature-index">CHAT</span><h3>Pensar e pesquisar</h3><p>Converse com seu modelo principal e acione agentes especialistas como apoio de pesquisa, planejamento e síntese.</p><Link href="/chat">Abrir Chat ↗</Link></article>
   <article className="feature"><span className="feature-index">CODE</span><h3>Construir com controle</h3><p>Agentes de engenharia analisam e propõem alterações; execução e operações em repositórios ficam limitadas às ferramentas e permissões concedidas.</p><Link href="/settings/github">Conectar GitHub ↗</Link></article>
   <article className="feature"><span className="feature-index">COWORK</span><h3>Coordenar trabalhos</h3><p>Divida objetivos em tarefas e combine agentes. O runtime, os dados e as integrações disponíveis definem o que pode realmente ser executado.</p><Link href="/chat">Abrir workspace ↗</Link></article>
  </section>
  <section className="feature-grid">
   <article className="feature"><span className="feature-index">SEGURANÇA</span><h3>Acesso sob aprovação</h3><p>Novos cadastros aguardam aprovação administrativa. O acesso depende de sessão válida e autorização por usuário.</p><Link href="/security">Política de segurança ↗</Link></article>
   <article className="feature"><span className="feature-index">PRIVACIDADE</span><h3>Dados e credenciais protegidos</h3><p>Isolamento de dados, RLS e criptografia de credenciais são requisitos da plataforma. Integrações recebem apenas o contexto necessário.</p><Link href="/privacy">Privacidade ↗</Link></article>
   <article className="feature"><span className="feature-index">ECOSSISTEMA</span><h3>Um workspace extensível</h3><p>Modelos, agentes, skills, MCP e ferramentas podem ser conectados com limites claros e rastreabilidade.</p><Link href="/agents">Explorar agentes ↗</Link></article>
  </section>
  <section className="product-pillars"><div><span>01 / CHAT</span><h3>Conhecimento em contexto</h3><p>Converse, pesquise e escreva com modelos e skills ativos, usando projetos, arquivos e memória.</p></div><div><span>02 / CODE</span><h3>Engenharia com guardrails</h3><p>Conecte repositórios, agentes de programação e um terminal isolado para analisar, testar e revisar alterações.</p></div><div><span>03 / COWORK</span><h3>Execução coordenada</h3><p>Transforme objetivos em tarefas, distribua trabalho entre especialistas e acompanhe resultados.</p></div><div><span>04 / CONTROL</span><h3>Permissões e governança</h3><p>Gerencie contas, modelos, skills e conectores com escopos definidos e credenciais mantidas no servidor.</p></div></section>\n  <footer className="footer">Open Claude · Modelos, agentes e ferramentas sob seu controle. · <Link href="/privacy">Privacidade</Link> · <Link href="/terms">Termos</Link> · <Link href="/security">Segurança</Link> · <Link href="/cookies">Cookies</Link> · <Link href="/ai-policy">Política de IA</Link></footer>
 </main>
}
