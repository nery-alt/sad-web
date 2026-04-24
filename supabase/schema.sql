-- SAD — Solução Administrativa Digital
-- Schema para Supabase (PostgreSQL)

-- ============================================================
-- PESSOAS
-- ============================================================
CREATE TABLE IF NOT EXISTS pessoas (
  id          BIGSERIAL PRIMARY KEY,
  nome        TEXT NOT NULL,
  cpf         TEXT DEFAULT '',
  telefone    TEXT DEFAULT '',
  endereco    TEXT DEFAULT '',
  email       TEXT DEFAULT '',
  orgao       TEXT DEFAULT '',
  observacoes TEXT DEFAULT '',
  status_ocorrencia TEXT CHECK (status_ocorrencia IN ('em_aberto','em_andamento','concluido','arquivado')) DEFAULT 'em_aberto',
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PROTOCOLOS
-- ============================================================
CREATE TABLE IF NOT EXISTS protocolos (
  id           BIGSERIAL PRIMARY KEY,
  pessoa_id    BIGINT REFERENCES pessoas(id) ON DELETE CASCADE,
  numero       TEXT NOT NULL,
  assunto      TEXT NOT NULL,
  descricao    TEXT DEFAULT '',
  data_entrada DATE,
  prazo        DATE,
  status       TEXT CHECK (status IN ('aberto','em_andamento','concluido')) DEFAULT 'aberto',
  historico    JSONB DEFAULT '[]'::JSONB,
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- DOCUMENTOS RECEBIDOS
-- ============================================================
CREATE TABLE IF NOT EXISTS documentos_recebidos (
  id               BIGSERIAL PRIMARY KEY,
  pessoa_id        BIGINT REFERENCES pessoas(id) ON DELETE CASCADE,
  protocolo_id     BIGINT REFERENCES protocolos(id) ON DELETE SET NULL,
  nome             TEXT NOT NULL,
  tipo             TEXT DEFAULT '',
  caminho          TEXT DEFAULT '',
  descricao        TEXT DEFAULT '',
  data_recebimento DATE,
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- DOCUMENTOS GERADOS
-- ============================================================
CREATE TABLE IF NOT EXISTS documentos_gerados (
  id           BIGSERIAL PRIMARY KEY,
  pessoa_id    BIGINT REFERENCES pessoas(id) ON DELETE CASCADE,
  protocolo_id BIGINT REFERENCES protocolos(id) ON DELETE SET NULL,
  tipo         TEXT DEFAULT 'Ofício',
  titulo       TEXT NOT NULL,
  conteudo     TEXT DEFAULT '',
  caminho      TEXT,
  data_geracao TIMESTAMPTZ DEFAULT NOW(),
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TAREFAS
-- ============================================================
CREATE TABLE IF NOT EXISTS tarefas (
  id           BIGSERIAL PRIMARY KEY,
  titulo       TEXT NOT NULL,
  descricao    TEXT DEFAULT '',
  prioridade   TEXT CHECK (prioridade IN ('baixa','media','alta')) DEFAULT 'media',
  prazo        DATE,
  status       TEXT CHECK (status IN ('pendente','em_andamento','concluida','arquivada')) DEFAULT 'pendente',
  pessoa_id    BIGINT REFERENCES pessoas(id) ON DELETE SET NULL,
  protocolo_id BIGINT REFERENCES protocolos(id) ON DELETE SET NULL,
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AGENDA
-- ============================================================
CREATE TABLE IF NOT EXISTS agenda (
  id           BIGSERIAL PRIMARY KEY,
  titulo       TEXT NOT NULL,
  descricao    TEXT DEFAULT '',
  data         DATE NOT NULL,
  horario      TEXT DEFAULT '',
  pessoa_id    BIGINT REFERENCES pessoas(id) ON DELETE SET NULL,
  protocolo_id BIGINT REFERENCES protocolos(id) ON DELETE SET NULL,
  realizado    SMALLINT DEFAULT 0,
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CONFIGURACOES
-- ============================================================
CREATE TABLE IF NOT EXISTS configuracoes (
  id     BIGSERIAL PRIMARY KEY,
  chave  TEXT UNIQUE NOT NULL,
  valor  TEXT DEFAULT ''
);

-- Valores padrão das configurações
INSERT INTO configuracoes (chave, valor) VALUES
  ('nomeUsuario',      '') ON CONFLICT (chave) DO NOTHING;
INSERT INTO configuracoes (chave, valor) VALUES
  ('nomeSetor',        '') ON CONFLICT (chave) DO NOTHING;
INSERT INTO configuracoes (chave, valor) VALUES
  ('cargo',            '') ON CONFLICT (chave) DO NOTHING;
INSERT INTO configuracoes (chave, valor) VALUES
  ('logomarca',        '') ON CONFLICT (chave) DO NOTHING;
INSERT INTO configuracoes (chave, valor) VALUES
  ('assinaturaPadrao', '') ON CONFLICT (chave) DO NOTHING;
INSERT INTO configuracoes (chave, valor) VALUES
  ('cidade',           '') ON CONFLICT (chave) DO NOTHING;
INSERT INTO configuracoes (chave, valor) VALUES
  ('uf',               '') ON CONFLICT (chave) DO NOTHING;

-- ============================================================
-- RLS — Habilitar Row Level Security (ajuste as policies conforme autenticação)
-- ============================================================
ALTER TABLE pessoas             ENABLE ROW LEVEL SECURITY;
ALTER TABLE protocolos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos_recebidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos_gerados  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefas             ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda              ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes       ENABLE ROW LEVEL SECURITY;

-- Policies temporárias (permissão total para anon — remover ao ativar autenticação)
CREATE POLICY "allow_all_pessoas"              ON pessoas             FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_protocolos"           ON protocolos          FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_documentos_recebidos" ON documentos_recebidos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_documentos_gerados"   ON documentos_gerados  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_tarefas"              ON tarefas             FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_agenda"               ON agenda              FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_configuracoes"        ON configuracoes       FOR ALL USING (true) WITH CHECK (true);
