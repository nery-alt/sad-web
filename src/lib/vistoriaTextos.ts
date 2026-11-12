// Textos-base do Relatório Técnico de Vistoria (4 seções), no padrão dos relatórios 120, 125, 129 e 140/2026.
// A IA (botão ✨) depois reescreve no estilo dos laudos; estes textos garantem um ponto de partida sem inventar nada.

export interface Orgao {
  sigla: string        // 'OUTRO' para órgão digitado
  nome: string         // nome completo, como sai no relatório
  finalidade: string   // "para ..." padrão da recomendação
}

export const ORGAOS: Orgao[] = [
  { sigla: 'SEMIO', nome: 'Secretaria Municipal de Infraestrutura e Obras – SEMIO',
    finalidade: 'para avaliação técnica e adoção das providências cabíveis' },
  { sigla: 'SEMASC', nome: 'Secretaria Municipal de Assistência Social e da Cidadania – SEMASC',
    finalidade: 'para avaliação socioassistencial da família e verificação dos benefícios e auxílios eventualmente disponíveis' },
  { sigla: 'GABINETE', nome: 'Gabinete do Prefeito',
    finalidade: 'para conhecimento da ocorrência e avaliação das medidas de apoio institucional cabíveis' },
  { sigla: 'SEMMALP', nome: 'Secretaria Municipal de Meio Ambiente e Limpeza Pública – SEMMALP',
    finalidade: 'para avaliação e adoção das providências de sua competência' },
  { sigla: 'SAAE', nome: 'Serviço Autônomo de Água e Esgoto – SAAE',
    finalidade: 'para avaliação e correção das condições de abastecimento de água e esgotamento' },
  { sigla: 'AMAZONAS ENERGIA', nome: 'Amazonas Energia',
    finalidade: 'para avaliação da rede elétrica e adoção das medidas de segurança cabíveis' },
  { sigla: 'SEMED', nome: 'Secretaria Municipal de Educação – SEMED',
    finalidade: 'para conhecimento e adoção das providências de sua competência' },
  { sigla: 'CBMAM', nome: 'Corpo de Bombeiros Militar do Amazonas – CBMAM',
    finalidade: 'para conhecimento e adoção das providências de sua competência' },
  { sigla: 'DEFENSORIA', nome: 'Defensoria Pública do Estado do Amazonas',
    finalidade: 'para conhecimento e adoção das providências de sua competência' },
]

export interface OrgaoEscolhido { sigla: string; nome?: string }

export const FINALIDADE_OUTRO = 'para conhecimento e adoção das providências de sua competência'

export function nomeOrgao(o: OrgaoEscolhido): string {
  if (o.sigla === 'OUTRO') return (o.nome || '').trim()
  return ORGAOS.find(x => x.sigla === o.sigla)?.nome || o.sigla
}

// "Secretaria ... – SEMIO" -> "SEMIO"; "Gabinete do Prefeito" -> "Gabinete do Prefeito"
export function nomeCurto(o: OrgaoEscolhido): string {
  const n = nomeOrgao(o)
  const m = n.match(/–\s*([A-ZÀ-Ú]{3,})$/)
  return m ? m[1] : n
}

const artigo = (nome: string) => /^(Secretaria|Defensoria|Amazonas Energia)/i.test(nome) ? 'à' : 'ao'

export function listaNatural(itens: string[]): string {
  if (itens.length <= 1) return itens[0] || ''
  return itens.slice(0, -1).join(', ') + ' e ' + itens[itens.length - 1]
}

export interface DadosVistoria {
  ocorrencia: string
  endereco: string
  bairro: string
  municipio: string
}

const local = (d: DadosVistoria) =>
  [d.endereco.trim(), d.bairro.trim() && `bairro ${d.bairro.trim()}`, d.municipio.trim()].filter(Boolean).join(', ')

export function textoObjeto(d: DadosVistoria): string {
  const oc = d.ocorrencia.trim().toLowerCase()
  return `O presente Relatório Técnico de Vistoria tem por finalidade registrar e avaliar a ocorrência de ${oc || '[descreva a ocorrência]'}, ` +
    `no imóvel localizado em ${local(d) || '[endereço]'}, bem como subsidiar os encaminhamentos necessários.`
}

// Cada órgão vira um item numerado; as outras medidas (uma por linha) entram depois.
export function itensRecomendacao(orgaos: OrgaoEscolhido[], outrasMedidas: string): string[] {
  const itens = orgaos.filter(o => nomeOrgao(o)).map(o => {
    const nome = nomeOrgao(o)
    const fin = o.sigla === 'OUTRO' ? FINALIDADE_OUTRO : (ORGAOS.find(x => x.sigla === o.sigla)?.finalidade || FINALIDADE_OUTRO)
    return `Encaminhamento ${artigo(nome)} ${nome}, ${fin}.`
  })
  for (const l of outrasMedidas.split('\n')) {
    const s = l.trim().replace(/^\d+[.)-]\s*/, '').replace(/[.;]+$/, '')
    if (s) itens.push(s.charAt(0).toUpperCase() + s.slice(1) + '.')
  }
  return itens
}

export function textoRecomendacoes(orgaos: OrgaoEscolhido[], outrasMedidas: string): string {
  return itensRecomendacao(orgaos, outrasMedidas).map((t, i) => `${i + 1}. ${t}`).join('\n')
}

// Último parágrafo da Conclusão: para quem o relatório é encaminhado
export function paragrafoEncaminhamento(orgaos: OrgaoEscolhido[]): string {
  const destinos = orgaos.filter(o => nomeOrgao(o)).map(o => `${artigo(nomeOrgao(o))} ${nomeCurto(o)}`)
  return destinos.length
    ? `Dessa forma, recomenda-se o encaminhamento do presente relatório ${listaNatural(destinos)}, para conhecimento, avaliação e providências de ${destinos.length > 1 ? 'suas respectivas competências' : 'sua competência'}.`
    : 'Dessa forma, o presente relatório é emitido para fins de registro e adoção das providências cabíveis.'
}

export function textoConclusao(d: DadosVistoria, orgaos: OrgaoEscolhido[]): string {
  const oc = d.ocorrencia.trim().toLowerCase()
  const p1 = `A vistoria registrou a ocorrência de ${oc || '[ocorrência]'} no imóvel localizado em ${local(d) || '[endereço]'}, conforme descrito neste relatório.`
  return `${p1}\n\n${paragrafoEncaminhamento(orgaos)}`
}

// Órgãos marcados que a Conclusão não cita (pela sigla ou pelo nome curto)
export function orgaosForaDaConclusao(conclusao: string, orgaos: OrgaoEscolhido[]): string[] {
  const t = conclusao.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  return orgaos.filter(o => nomeOrgao(o)).map(o => nomeCurto(o))
    .filter(n => !t.includes(n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()))
}

// "120/2026" ou "120" -> "120/2026"
export function numeroRelatorio(numero: string, ano = new Date().getFullYear()): string {
  const m = (numero || '').trim().match(/^0*(\d{1,4})(?:\s*\/\s*(\d{4}))?$/)
  return m ? `${m[1].padStart(3, '0')}/${m[2] || ano}` : (numero || 'S/N').trim()
}

export const paragrafos = (t: string) => t.split(/\n\s*\n/).map(s => s.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean)
