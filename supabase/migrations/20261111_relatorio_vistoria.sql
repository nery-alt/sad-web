-- 11/11/2026: Relatório Técnico de Vistoria (gerado na tela de Protocolos)
-- Textos do relatório (um por protocolo) e fotos do anexo (1 a 8).

create table if not exists public.relatorios_vistoria (
  id bigserial primary key,
  protocolo_id bigint not null unique references public.protocolos(id) on delete cascade,
  ocorrencia text,
  pessoas_afetadas text,
  endereco text,
  bairro text,
  coordenadas text,
  objeto text,
  situacao text,
  orgaos jsonb not null default '[]'::jsonb,   -- [{"sigla":"SEMIO"}, {"sigla":"OUTRO","nome":"..."}]
  outras_medidas text,
  recomendacoes text,
  conclusao text,
  anotacoes text,
  relatorio_url text,
  atualizado_em timestamptz not null default now()
);

create table if not exists public.vistoria_fotos (
  id bigserial primary key,
  protocolo_id bigint not null references public.protocolos(id) on delete cascade,
  ordem int not null check (ordem between 1 and 8),
  url text not null,
  legenda text,
  criado_em timestamptz not null default now(),
  unique (protocolo_id, ordem)
);

alter table public.relatorios_vistoria enable row level security;
alter table public.vistoria_fotos enable row level security;

create policy relatorios_vistoria_select on public.relatorios_vistoria for select to authenticated using (true);
create policy relatorios_vistoria_insert on public.relatorios_vistoria for insert to authenticated with check (pode_escrever());
create policy relatorios_vistoria_update on public.relatorios_vistoria for update to authenticated using (pode_escrever()) with check (pode_escrever());
create policy relatorios_vistoria_delete on public.relatorios_vistoria for delete to authenticated using (pode_escrever());

create policy vistoria_fotos_select on public.vistoria_fotos for select to authenticated using (true);
create policy vistoria_fotos_insert on public.vistoria_fotos for insert to authenticated with check (pode_escrever());
create policy vistoria_fotos_update on public.vistoria_fotos for update to authenticated using (pode_escrever()) with check (pode_escrever());
create policy vistoria_fotos_delete on public.vistoria_fotos for delete to authenticated using (pode_escrever());

grant select, insert, update, delete on public.relatorios_vistoria, public.vistoria_fotos to authenticated;
-- a futura porta de entrada do Sentinela (Edge Function) grava fotos com o service_role
grant select, insert, update, delete on public.relatorios_vistoria, public.vistoria_fotos to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;
