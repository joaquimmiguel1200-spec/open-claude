'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const policyTypes = ['terms', 'privacy', 'security', 'cookies', 'acceptable_use', 'ai']

export default function AuthCompletePage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function finish() {
      try {
        if (localStorage.getItem('open-claude-policies-pending') === '1') {
          const responses = await Promise.all(policyTypes.map(policyType =>
            fetch('/api/policy-acceptance', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ policyType }),
            })
          ))
          if (responses.some(response => !response.ok)) {
            throw new Error('Não foi possível registrar todos os aceites. Tente novamente.')
          }
          localStorage.removeItem('open-claude-policies-pending')
        }
        if (!cancelled) router.replace('/chat')
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Não foi possível concluir o login.')
          setBusy(false)
        }
      }
    }
    void finish()
    return () => { cancelled = true }
  }, [router])

  async function retry() {
    setBusy(true)
    setError('')
    const responses = await Promise.all(policyTypes.map(policyType =>
      fetch('/api/policy-acceptance', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ policyType }),
      })
    ))
    if (responses.some(response => !response.ok)) {
      setError('Não foi possível registrar todos os aceites. Verifique a conexão e tente novamente.')
      setBusy(false)
      return
    }
    localStorage.removeItem('open-claude-policies-pending')
    router.replace('/chat')
  }

  return <main className="shell"><section className="chat card"><h1>{busy ? 'Concluindo seu acesso…' : 'Quase pronto'}</h1>{error && <p role="alert">{error}</p>}{!busy && <button className="button" onClick={retry}>Tentar novamente</button>}</section></main>
}
