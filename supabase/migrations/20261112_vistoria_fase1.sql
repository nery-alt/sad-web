-- 12/11/2026: Vistoria — Fase 1 (app Sentinela DC alinhado ao Relatório Técnico de Vistoria)
-- Novos dados que o app passa a mandar. Tudo opcional: vistorias antigas continuam iguais.

alter table public.ocorrencias
  add column if not exists origem_tipo text,            -- 'pessoa' | 'orgao'
  add column if not exists solicitante_nome text,
  add column if not exists orgao_demandante text,       -- ex.: Procuradoria-Geral do Município – PGM
  add column if not exists documento_origem text,       -- ex.: Ofício nº 722/2026 – PGM; Notícia de Fato nº ...
  add column if not exists escopo_pedido text,          -- o que o órgão pediu para avaliar
  add column if not exists relatado text,               -- o que moradores contaram (separado do constatado)
  add column if not exists risco_iminente boolean,
  add column if not exists medidas jsonb not null default '[]'::jsonb,  -- ["Interdição total", ...]
  add column if not exists desabrigados int,
  add column if not exists desalojados int;

-- Política do app antigo para reenvio (aplicada em produção em 11/11/2026; registrada aqui)
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'ocorrencias' and policyname = 'ocorrencias_update_anon_sentinela') then
    create policy ocorrencias_update_anon_sentinela on public.ocorrencias for update to anon
      using (origem = 'sentinela_v2' and created_at > now() - interval '2 minutes')
      with check (origem = 'sentinela_v2');
  end if;
  if not exists (select 1 from pg_policies where tablename = 'ocorrencias' and policyname = 'ocorrencias_select_anon_recente') then
    create policy ocorrencias_select_anon_recente on public.ocorrencias for select to anon
      using (origem = 'sentinela_v2' and created_at > now() - interval '2 minutes');
  end if;
end $$;
