import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const model = new Supabase.ai.Session('gte-small')
const MAX_INPUTS = 20
const MAX_CHARS_PER_INPUT = 12000

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders })

  try {
    const body = await req.json()
    const inputs = Array.isArray(body?.inputs) ? body.inputs : [body?.input]

    if (!inputs.length || inputs.length > MAX_INPUTS || inputs.some((v: unknown) => typeof v !== 'string' || !v.trim())) {
      return Response.json({ error: `Provide 1-${MAX_INPUTS} non-empty text inputs.` }, { status: 400, headers: corsHeaders })
    }
    if (inputs.some((v: string) => v.length > MAX_CHARS_PER_INPUT)) {
      return Response.json({ error: `Each input must be <= ${MAX_CHARS_PER_INPUT} characters.` }, { status: 400, headers: corsHeaders })
    }

    const embeddings: number[][] = []
    for (const input of inputs as string[]) {
      const embedding = await model.run(input, { mean_pool: true, normalize: true })
      embeddings.push(Array.from(embedding))
    }

    return Response.json(
      { model: 'Supabase/gte-small', dimensions: 384, embeddings },
      { headers: { ...corsHeaders, 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    console.error('rag-embed error', error)
    return Response.json({ error: 'Embedding generation failed.' }, { status: 500, headers: corsHeaders })
  }
})
