// Gera o Relatório Técnico de Vistoria em Word a partir do modelo oficial em /relatorio-vistoria.docx
// (mesmo cabeçalho, rodapé, marca d'água, VISTO e assinaturas do laudo de alvará; anexo com 1 a 8 fotos).
import JSZip from 'jszip'
import type { Servidor } from './requerimentoAlvara'
import { type Visto, type FotoLaudo, run, quebra, runsMarcados, trocarParagrafo, tabelaAssinaturas, esc, linhasRotuladas } from './laudoAlvara'

export interface DadosRelatorio {
  numero: string                                         // "120/2026"
  solicitante: string                                    // vai no quadro do topo
  ocorrencia: string                                     // vai no quadro do topo
  identificacao: [string, string | null | undefined][]   // CPF, Telefone, Endereço...
  objeto: string[]                                       // parágrafos
  situacao: string[]
  recomendacoes: string[]                                // itens, sem o número
  conclusao: string[]
  assinantes: Servidor[]
  visto: Visto
  dataEmissao: string                                    // AAAA-MM-DD
  fotos: FotoLaudo[]                                     // 1 a 8, na ordem
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho',
  'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

const fim = (xml: string, i: number) => xml.indexOf('</w:p>', i) + '</w:p>'.length
const inicioP = (xml: string, i: number) => xml.lastIndexOf('<w:p>', i)

// Linhas do quadro do topo (PROTOCOLO / SOLICITANTE / OCORRÊNCIA) correm ao lado do quadro do VISTO:
// passando de ~50 caracteres, o texto entra por baixo dele. Quebra em linhas, preferindo " / " e " – ".
const LARGURA_TOPO = 50
export function quebrarTopo(rotulo: string, valor: string): string[] {
  const linhas: string[] = []
  let resto = valor.trim().replace(/\s+/g, ' ')
  let cabe = LARGURA_TOPO - rotulo.length
  while (resto.length > cabe) {
    const trecho = resto.slice(0, cabe + 1)
    const sep = Math.max(trecho.lastIndexOf(' / '), trecho.lastIndexOf(' – '), trecho.lastIndexOf(' - '))
    let corte = sep > cabe * 0.4 ? sep : trecho.lastIndexOf(' ')
    if (corte <= 0) corte = cabe
    linhas.push(resto.slice(0, corte).trim())
    resto = resto.slice(corte).trim().replace(/^[/–-]\s*/, '')
    cabe = LARGURA_TOPO
  }
  linhas.push(resto)
  return linhas
}

// Numa página do anexo (uma tabela de 2x2 quadros), deixa só as `n` primeiras fotos
function ajustarPagina(trecho: string, n: number): string {
  const ini = trecho.indexOf('<w:tbl>'), fimT = trecho.lastIndexOf('</w:tbl>') + '</w:tbl>'.length
  if (ini < 0) return trecho
  let tbl = trecho.slice(ini, fimT)
  // quadros sem foto: tira a imagem do modelo
  let k = 0
  tbl = tbl.replace(/<w:drawing>[\s\S]*?<\/w:drawing>/g, d => (d.includes('r:embed=') && ++k > n) ? '' : d)
  // até 2 fotos: tira a segunda linha de quadros (linhas 3 e 4 da tabela)
  if (n <= 2) {
    const linhas = [...tbl.matchAll(/<w:tr[ >]/g)].map(m => m.index!)
    if (linhas.length === 4) tbl = tbl.slice(0, linhas[2]) + tbl.slice(tbl.lastIndexOf('</w:tr>') + '</w:tr>'.length)
  }
  return trecho.slice(0, ini) + tbl + trecho.slice(fimT)
}

export async function gerarRelatorioVistoria(d: DadosRelatorio): Promise<Blob> {
  const resp = await fetch('/relatorio-vistoria.docx')
  if (!resp.ok) throw new Error('Modelo do relatório não encontrado no servidor.')
  const zip = await JSZip.loadAsync(await resp.arrayBuffer())
  const caminho = 'word/document.xml'
  let xml = await zip.file(caminho)!.async('string')

  const fotos = d.fotos.slice(0, 8)
  const [ano, mes, dia] = d.dataEmissao.split('-')
  // solicitante e ocorrência podem ocupar mais de uma linha no quadro do topo
  const emLinhas = (rotulo: string, v: string) =>
    quebrarTopo(rotulo, v).map(esc).join('</w:t><w:br/><w:t xml:space="preserve">')
  xml = xml.replace('{solicitante}', () => emLinhas('SOLICITANTE: ', d.solicitante)).replace('{ocorrencia}', () => emLinhas('OCORRÊNCIA: ', d.ocorrencia))
  const valores: Record<string, string> = {
    numero: d.numero,
    visto_nome: d.visto.nome,
    visto_cargo: d.visto.cargo,
    visto_decreto: d.visto.decreto,
    data_extenso: `${dia} de ${MESES[Number(mes) - 1]} de ${ano}`,
  }
  for (let k = 1; k <= 8; k++) {
    const f = fotos[k - 1]
    valores[`leg${k}`] = f ? `Foto ${String(k).padStart(2, '0')} – ${f.legenda.trim()}` : ''
  }
  xml = xml.replace(/\{(\w+)\}/g, (tag, chave: string) => chave in valores ? esc(valores[chave]) : tag)

  xml = trocarParagrafo(xml, '{{IDENT}}', [linhasRotuladas(d.identificacao)])
  xml = trocarParagrafo(xml, '{{OBJETO}}', d.objeto.map(runsMarcados))
  xml = trocarParagrafo(xml, '{{SITUACAO}}', d.situacao.map(runsMarcados))
  xml = trocarParagrafo(xml, '{{RECOMENDACOES}}', [
    run('Recomenda-se:'),
    ...d.recomendacoes.map((t, i) => run(`${i + 1}. `) + runsMarcados(t)),
  ])
  xml = trocarParagrafo(xml, '{{CONCLUSAO}}', d.conclusao.map(runsMarcados))
  const titulo = d.assinantes.length > 1 ? 'Responsáveis pela Vistoria:' : 'Responsável pela Vistoria:'
  xml = trocarParagrafo(xml, '{{RESPONSAVEIS}}', [
    run(titulo, true) + quebra + d.assinantes.map(s => run(`${s.nome} – ${s.cargoAssinatura1} / ${s.cargoAssinatura2}`)).join(quebra),
  ])
  {
    const i = xml.indexOf('<w:t>{{ASSINATURAS}}</w:t>')
    xml = xml.slice(0, inicioP(xml, i)) + tabelaAssinaturas(d.assinantes) + xml.slice(fim(xml, i))
  }

  // ---------- Anexo de fotos ----------
  const iIni = xml.indexOf('<w:t>{{ANEXO_INI}}</w:t>')
  const iFim = xml.indexOf('<w:t>{{ANEXO_FIM}}</w:t>')
  if (fotos.length === 0) {
    xml = xml.slice(0, inicioP(xml, iIni)) + xml.slice(fim(xml, iFim))
  } else {
    // imagens dos quadros, na ordem do documento (página 1: fotos 1-4; página 2: fotos 5-8)
    const ids = [...xml.slice(iIni, iFim).matchAll(/r:embed="(rId\d+)"/g)].map(m => m[1])
    const rels = await zip.file('word/_rels/document.xml.rels')!.async('string')
    fotos.forEach((f, k) => {
      const alvo = rels.match(new RegExp(`Id="${ids[k]}"[^>]*Target="([^"]+)"`))?.[1]
      if (alvo) zip.file(`word/${alvo}`, f.bytes)
    })
    // página 1 = do marcador ANEXO_INI até o ANEXO2_INI; página 2 = do ANEXO2_INI até o ANEXO_FIM
    const pa = inicioP(xml, xml.indexOf('<w:t>{{ANEXO_INI}}</w:t>'))
    const pb = inicioP(xml, xml.indexOf('<w:t>{{ANEXO2_INI}}</w:t>'))
    const pc = inicioP(xml, xml.indexOf('<w:t>{{ANEXO_FIM}}</w:t>'))
    // legendas à esquerda e fotos sem o corte herdado do modelo (evita imagem esticada)
    const limpar = (s: string) => s.replace(/<w:jc w:val="(both|distribute)"\/>/g, '<w:jc w:val="left"/>').replace(/<a:srcRect [^>]*\/>/g, '<a:srcRect/>')
    const pag1 = limpar(ajustarPagina(xml.slice(pa, pb), Math.min(fotos.length, 4)))
    const pag2 = fotos.length > 4 ? limpar(ajustarPagina(xml.slice(pb, pc), fotos.length - 4)) : ''
    xml = xml.slice(0, pa) + pag1 + pag2 + xml.slice(pc)
    if (pag2) xml = trocarParagrafo(xml, '{{ANEXO2_INI}}', [`<w:r><w:br w:type="page"/></w:r>`])
    xml = trocarParagrafo(xml, '{{ANEXO_INI}}', [`<w:r><w:br w:type="page"/></w:r>`])
    xml = trocarParagrafo(xml, '{{ANEXO_FIM}}', [''])
  }

  if (xml.includes('{{')) throw new Error('Ficou campo sem preencher no relatório.')
  zip.file(caminho, xml)
  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })
}

// 2026-11-10_ 120_RELATORIO_muro Aldenir.docx (mesmo jeito dos arquivos da pasta)
export function nomeArquivoRelatorio(dataEmissao: string, numero: string, resumo: string) {
  const num = numero.split('/')[0] || 'SN'
  const r = resumo.trim().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 50)
  return `${dataEmissao}_${num}_RELATORIO_${r || 'vistoria'}.docx`
}
