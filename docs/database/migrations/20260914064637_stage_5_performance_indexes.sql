-- Open Claude — Stage 5 verification cleanup
-- Covers the two foreign keys flagged by the Supabase performance advisor.

create index if not exists conversation_summaries_user_id_idx
  on public.conversation_summaries(user_id);

create index if not exists conversation_summaries_covered_message_idx
  on public.conversation_summaries(covered_through_message_id);
