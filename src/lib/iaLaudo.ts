// IA do laudo: usa a mesma IA do aplicativo Sentinela DC (Edge Function "gerar-texto" no Supabase do Sentinela).
// A chave abaixo é a chave PÚBLICA (anon) do Sentinela — a chave da Anthropic fica só no servidor.
const SENTINELA_URL = 'https://rvouhrzqcuejpbyjirrg.supabase.co'
const SENTINELA_ANON_KEY = 'COLE_AQUI_A_CHAVE_ANON_DO_SENTINELA'

export type TipoIA = 'laudo_caracterizacao' | 'laudo_condicoes' | 'laudo_conclusao' | 'laudo_legendas'

export async function iaLaudo(tipo: TipoIA, base: string, anotacoes = ''): Promise<string> {
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
  return texto
}
