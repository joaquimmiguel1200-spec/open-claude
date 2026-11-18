-- Per-project behavior, instructions and model defaults.
alter table public.projects
  add column if not exists settings jsonb not null default '{}'::jsonb;

alter table public.api_credentials
  drop constraint if exists api_credentials_provider_check;
alter table public.api_credentials
  add constraint api_credentials_provider_check
  check (provider = any (array['openai','openrouter','anthropic','custom','huggingface','ollama']::text[]));
