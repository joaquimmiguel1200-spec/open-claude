import Link from 'next/link'

export default function NotFound(){return <main className="shell"><section className="hero"><div><p className="muted">404</p><h1>Página não encontrada.</h1><p>O endereço não existe ou foi movido.</p><div className="actions"><Link className="button" href="/">Voltar ao início</Link></div></div></section></main>}
