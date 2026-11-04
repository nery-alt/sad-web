import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Variáveis de ambiente do Supabase não configuradas.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ─────────────────────────────────────────────────────────────────────────────
// Rede de segurança contra "erro engolido".
// O Supabase NÃO lança exceção quando o banco recusa uma gravação: ele devolve
// { error }. Se o código chamador não olhar esse campo, a tela age como se
// tivesse salvado e o usuário não fica sabendo de nada.
// Aqui, toda gravação (insert/update/upsert/delete) cujo resultado.error não for
// lido por quem chamou dispara um alerta com o motivo, em português.
// Quem já trata o erro (lê result.error) não recebe alerta duplicado.
// Tabelas de gravação "silenciosa" por natureza ficam de fora.
// ─────────────────────────────────────────────────────────────────────────────
const TABELAS_SILENCIOSAS = new Set(['focos_historico', 'perfis'])
const ESCRITAS = ['insert', 'update', 'upsert', 'delete'] as const

type ErroBanco = { message: string; code?: string }

function mensagemAmigavel(e: ErroBanco): string {
  switch (e.code) {
    case '42501': return 'Seu usuário não tem permissão para esta ação (perfil somente leitura ou sessão expirada).'
    case '22007':
    case '22008': return 'Há uma data inválida ou vazia no formulário.'
    case '22P02': return 'Há um valor em formato inválido no formulário.'
    case '23502': return 'Falta preencher um campo obrigatório.'
    case '23503': return 'Este registro está vinculado a outro e não pode ser alterado ou excluído.'
    case '23505': return 'Já existe um registro igual a este.'
    default: return e.message
  }
}

type Resultado = { error?: ErroBanco | null }
type Construtor = { then: (ok?: (r: Resultado) => unknown, err?: (e: unknown) => unknown) => unknown }

function vigiar(construtor: Construtor, tabela: string): Construtor {
  const entregar = construtor.then.bind(construtor)
  construtor.then = (ok, err) =>
    entregar((resultado: Resultado) => {
      if (!resultado || !resultado.error) return ok ? ok(resultado) : resultado
      let lido = false
      const visto = new Proxy(resultado, {
        get(alvo, prop, receptor) {
          if (prop === 'error') lido = true
          return Reflect.get(alvo, prop, receptor)
        },
      })
      const erro = resultado.error
      // Depois que quem chamou teve a chance de ler o erro, avisa se ninguém leu.
      setTimeout(() => {
        if (lido) return
        console.error(`Erro ao gravar em "${tabela}":`, erro)
        alert(`Não foi possível salvar (${tabela}): ${mensagemAmigavel(erro)}`)
      }, 0)
      return ok ? ok(visto) : visto
    }, err)
  return construtor
}

const fromOriginal = supabase.from.bind(supabase)
;(supabase as unknown as { from: unknown }).from = (tabela: string) => {
  const consulta = fromOriginal(tabela) as unknown as Record<string, (...args: unknown[]) => Construtor>
  if (TABELAS_SILENCIOSAS.has(tabela)) return consulta
  for (const metodo of ESCRITAS) {
    const original = consulta[metodo].bind(consulta)
    consulta[metodo] = (...args: unknown[]) => vigiar(original(...args), tabela)
  }
  return consulta
}
