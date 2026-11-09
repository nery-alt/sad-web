// jszip já vem instalado junto com a biblioteca 'docx' (dependência dela)
import JSZip from 'jszip'

// Servidores que fazem/assinam o requerimento. Para corrigir um nome ou cargo, altere aqui.
export interface Servidor {
  id: string
  nome: string
  cargoTecnico: string     // vai no item 2 (Cargo)
  cargoAssinatura1: string // 1ª linha abaixo da assinatura
  cargoAssinatura2: string // 2ª linha abaixo da assinatura
}

export const SERVIDORES: Servidor[] = [
  {
    id: 'reumano',
    nome: 'Rêumano Nery da Silva',
    cargoTecnico: 'Coordenador de Defesa Civil / Chefe do Setor de Vistoria',
    cargoAssinatura1: 'Coordenador de Defesa Civil',
    cargoAssinatura2: 'Chefe do Setor de Vistoria',
  },
  {
    id: 'elienay',
    nome: 'Elienay de Olieira Costa',
    cargoTecnico: 'Agente de Defesa Civil / Setor de Vistoria',
    cargoAssinatura1: 'Agente de Defesa Civil',
    cargoAssinatura2: 'Setor de Vistoria',
  },
]

export type Porte = 'Pequeno' | 'Médio' | 'Grande'

export interface DadosRequerimento {
  numero: string | null
  nome_estabelecimento: string
  nome_responsavel: string | null
  endereco: string | null
  bairro: string | null
  municipio: string | null
  cnpj: string | null
  cpf_responsavel: string | null
  tipo_estabelecimento: string | null
  porte: Porte
  mesVistoria: string   // 'AAAA-MM'
  dataEmissao: string   // 'AAAA-MM-DD'
  tecnico: Servidor
  assinante: Servidor
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho',
  'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

const limpa = (s: string | null | undefined) => (s || '').trim()

// 'AL-094/2026' -> 'AL 094/2026'
export const formatarProtocolo = (n: string | null) => limpa(n).replace(/^AL-/i, 'AL ')

// 'Rua X nº 1' + 'Centro' + 'Tefé/AM' -> 'Rua X nº 1 – Bairro: Centro – Tefé/AM'
export const montarEndereco = (end: string | null, bairro: string | null, mun: string | null) =>
  [limpa(end), limpa(bairro) && `Bairro: ${limpa(bairro)}`, limpa(mun)].filter(Boolean).join(' – ')

// 'AAAA-MM' -> 'MM/AAAA' ; soma anos para a validade
const mesAno = (ym: string, somaAnos = 0) => {
  const [a, m] = ym.split('-')
  return `${m}/${Number(a) + somaAnos}`
}

export async function gerarRequerimentoAlvara(d: DadosRequerimento): Promise<Blob> {
  const resp = await fetch('/requerimento-alvara.docx')
  if (!resp.ok) throw new Error('Modelo do requerimento não encontrado no servidor.')
  const zip = await JSZip.loadAsync(await resp.arrayBuffer())

  const [ano, mes, dia] = d.dataEmissao.split('-')
  const marca = (p: Porte) => (d.porte === p ? 'X' : '  ')

  const valores: Record<string, string> = {
    numero: formatarProtocolo(d.numero),
    nome: limpa(d.nome_estabelecimento).toUpperCase(),
    proprietario: limpa(d.nome_responsavel),
    endereco: montarEndereco(d.endereco, d.bairro, d.municipio),
    documento: limpa(d.cnpj) || limpa(d.cpf_responsavel),
    atividade: limpa(d.tipo_estabelecimento).toUpperCase(),
    tecnico: d.tecnico.nome,
    tecnico_cargo: d.tecnico.cargoTecnico,
    data_vistoria: mesAno(d.mesVistoria),
    validade: mesAno(d.mesVistoria, 1),
    xP: marca('Pequeno'),
    xM: marca('Médio'),
    xG: marca('Grande'),
    dia,
    mes: MESES[Number(mes) - 1],
    ano,
    assinante: d.assinante.nome,
    assinante_cargo1: d.assinante.cargoAssinatura1,
    assinante_cargo2: d.assinante.cargoAssinatura2,
  }

  const escapar = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const caminho = 'word/document.xml'
  let xml = await zip.file(caminho)!.async('string')
  xml = xml.replace(/\{(\w+)\}/g, (tag, chave: string) => chave in valores ? escapar(valores[chave]) : tag)
  zip.file(caminho, xml)

  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })
}

// Mesmo padrão do nome que você já usa: 2026-11-06_Protocolo_AL_094_Requerimento_Boteco_SK.docx
export function nomeArquivoRequerimento(dataEmissao: string, numero: string | null, nome: string) {
  const num = limpa(numero).replace(/^AL-?/i, '').split('/')[0] || 'SN'
  const est = limpa(nome)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, ' ').trim()
    .split(' ').map(w => (w.length <= 3 && w === w.toUpperCase()) ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('_')
  return `${dataEmissao}_Protocolo_AL_${num}_Requerimento_${est}.docx`
}
