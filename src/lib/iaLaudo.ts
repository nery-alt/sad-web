// IA do laudo: usa a mesma IA do aplicativo Sentinela DC (Edge Function "gerar-texto" no Supabase do Sentinela).
// A chave abaixo é a chave PÚBLICA (anon) do Sentinela — a chave da Anthropic fica só no servidor.
const SENTINELA_URL = 'https://rvouhrzqcuejpbyjirrg.supabase.co'
const SENTINELA_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2b3VocnpxY3VlanBieWppcnJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMTg4MzMsImV4cCI6MjA5Mjc5NDgzM30.-_Pg5x2ppzRT4z_ZtiW4f8_LhsBbjLtXmsK6hFSp-IU'

export type TipoIA = 'laudo_caracterizacao' | 'laudo_condicoes' | 'laudo_conclusao' | 'laudo_legendas'
  | 'vistoria_objeto' | 'vistoria_situacao' | 'vistoria_recomendacoes' | 'vistoria_conclusao'

export interface RespostaIA { texto: string; conflitos: string[] }

export async function iaLaudo(tipo: TipoIA, base: string, anotacoes = ''): Promise<RespostaIA> {
  const resp = await fetch(`${SENTINELA_URL}/functions/v1/gerar-texto`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SENTINELA_ANON_KEY}`,
      apikey: SENTINELA_ANON_KEY,
    },
    body: JSON.stringify({ tipo, base, anotacoes }),
  })
  const dados = await resp.json().catch(() => ({}))
  if (!resp.ok || dados.error) throw new Error(dados.error || `A IA não respondeu (${resp.status}).`)
  const texto = String(dados.texto || '').trim()
  if (!texto) throw new Error('A IA devolveu um texto vazio.')
  const conflitos = Array.isArray(dados.conflitos) ? dados.conflitos.map(String).filter(Boolean) : []
  return { texto, conflitos }
}
