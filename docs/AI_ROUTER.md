# AI Router

Open Claude now has a server-side AI runtime with provider abstraction, model abstraction, retries, fallback, timeout, streaming, normalized errors, usage, cost calculation, logs and cancellation.

## Runtime

```text
Chat / Agent
    ↓
AI Router
    ↓
Provider Adapter
    ↓
OmniRoute / OpenAI-compatible provider
    ↓
stream or complete
```

## Environment

```env
OMNIROUTE_ENABLED=true
OMNIROUTE_BASE_URL=http://localhost:20128/v1
OMNIROUTE_API_KEY=
AI_MODEL=auto
AI_ROUTING_STRATEGY=auto
AI_TIMEOUT_MS=120000
AI_MAX_RETRIES=2
```

`OMNIROUTE_API_KEY` and every upstream provider credential are server-only. Never prefix them with `NEXT_PUBLIC_` and never send them to the browser.

## Behavior

- `provider-adapter.ts` defines the transport abstraction.
- `provider-registry.ts` defines models and routing order.
- `router.ts` handles model selection, retries, fallback, logging and cancellation.
- `openai-compatible.ts` handles JSON and SSE transport.
- `errors.ts` normalizes upstream failures.
- `cost.ts` calculates USD cost when model pricing metadata is available.
- `index.ts` is the server-side entry point for the application.

Retries use bounded exponential backoff with jitter. A stream is only retried/fallbacked before output has started; once text has been emitted, the router does not silently switch providers and risk duplicating or corrupting the response.

## OmniRoute

Open Claude treats OmniRoute as a gateway, not as the application's agent runtime. Its OpenAI-compatible `/v1` surface makes it a replaceable provider transport. OmniRoute itself documents an OpenAI-compatible endpoint and routing/fallback capabilities. The Open Claude router keeps its own provider abstraction so the application is not coupled to OmniRoute.

## Current limitation

The repository connection can implement and review the runtime, but a real end-to-end model call requires a running OmniRoute endpoint and valid provider credentials in the deployment environment. The code is therefore **runtime-ready**, while live-provider validation remains an environment-dependent integration test.
