-- 10/11/2026: a Edge Function receber-alvara (porta de entrada do Sentinela) grava fotos com o service_role
grant select, insert, update, delete on public.alvara_fotos to service_role;
grant usage, select on all sequences in schema public to service_role;
