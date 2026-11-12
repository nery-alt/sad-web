// Gera o Laudo (Relatório de Vistoria contra Incêndio e Estabilidade Estrutural) em Word
// a partir do modelo oficial em /laudo-alvara.docx (cabeçalho, rodapé, marca d'água, VISTO e anexo de fotos).
import JSZip from 'jszip'
import { formatarProtocolo, type Servidor } from './requerimentoAlvara'

export interface Visto { id: string; nome: string; cargo: string; decreto: string }

export const VISTOS: Visto[] = [
  { id: 'edivilson', nome: 'EDIVILSON BRAGA DA SILVA', cargo: 'Secretário Municipal de Defesa Civil e Patrimonial – SEMDCEP – TEFÉ.', decreto: 'DECRETO 116/2025' },
  { id: 'welliton', nome: 'WELLITON BRAGA DE FREITAS', cargo: 'Secretário Adjunto Municipal de Defesa Civil e Patrimonial – SEMDCEP – TEFÉ.', decreto: 'DECRETO 117/2025' },
]

// Proporção (largura/altura) dos quadros de foto do anexo — as fotos são recortadas nela
export const FOTO_ASPECTO = 2545080 / 2798445

export interface FotoLaudo { bytes: Uint8Array; legenda: string }

export interface DadosLaudo {
  numero: string | null
  nome: string
  risco: string
  identificacao: [string, string | null | undefined][]   // Nome Comercial, CNPJ, Responsável...
  identificacao2: [string, string | null | undefined][]  // Tipo, Área, Capacidade, Porte
  caracterizacao: string
  condicoes: string[]
  conclusao: string
  parecer: string[]
  assinantes: Servidor[]        // 1 ou 2
  visto: Visto
  dataEmissao: string           // AAAA-MM-DD
  fotos: FotoLaudo[]            // até 4, na ordem
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho',
  'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const rPr = (negrito: boolean) =>
  '<w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman" w:cs="Times New Roman"/>' +
  (negrito ? '<w:b/><w:bCs/>' : '') + '<w:color w:val="000000"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr>'

const run = (texto: string, negrito = false) =>
  `<w:r>${rPr(negrito)}<w:t xml:space="preserve">${esc(texto)}</w:t></w:r>`
const quebra = `<w:r>${rPr(false)}<w:br/></w:r>`

// "texto **negrito** texto" -> runs
function runsMarcados(texto: string): string {
  return texto.split(/(\*\*[^*]+\*\*)/).filter(Boolean)
    .map(p => p.startsWith('**') && p.endsWith('**') ? run(p.slice(2, -2), true) : run(p)).join('')
}

// Troca o parágrafo-marcador por N parágrafos com a mesma formatação
function trocarParagrafo(xml: string, marcador: string, conteudos: string[]): string {
  const i = xml.indexOf(`<w:t>${marcador}</w:t>`)
  if (i < 0) throw new Error(`Modelo do laudo sem o marcador ${marcador}`)
  const ini = xml.lastIndexOf('<w:p>', i)
  const fim = xml.indexOf('</w:p>', i) + '</w:p>'.length
  const trecho = xml.slice(ini, fim)
  const pPr = (trecho.match(/<w:pPr>[\s\S]*?<\/w:pPr>/) || [''])[0]
  const novos = conteudos.map(c => `<w:p>${pPr}${c}</w:p>`).join('')
  return xml.slice(0, ini) + novos + xml.slice(fim)
}

const linhasRotuladas = (linhas: [string, string | null | undefined][]) =>
  linhas.filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== '')
    .map(([r, v]) => run(`${r}:`, true) + run(` ${String(v).trim()}`)).join(quebra)

// Tabela de assinaturas (sem bordas). Com uma pessoa só, a assinatura fica centralizada na página.
function tabelaAssinaturas(pessoas: Servidor[]): string {
  const sem = '<w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/>'
  const pr = (texto: string, negrito: boolean, depois = 0) =>
    `<w:p><w:pPr><w:keepNext/><w:spacing w:before="0" w:after="${depois}" w:line="276" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr>` +
    `<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>${negrito ? '<w:b/><w:bCs/>' : ''}<w:i/><w:iCs/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr>` +
    `<w:t xml:space="preserve">${esc(texto)}</w:t></w:r></w:p>`
  const celula = (s: Servidor) =>
    `<w:tc><w:tcPr><w:tcW w:w="4252" w:type="dxa"/></w:tcPr>` +
    pr('______________________________', false) + pr(s.nome, true, 60) + pr(s.cargoAssinatura1, false, 60) + pr(s.cargoAssinatura2, false) +
    '</w:tc>'
  const abre = (largura: number, colunas: number) =>
    `<w:tbl><w:tblPr><w:tblW w:w="${largura}" w:type="dxa"/><w:jc w:val="center"/><w:tblBorders>${sem}</w:tblBorders>` +
    `<w:tblLayout w:type="fixed"/><w:tblLook w:val="0000"/></w:tblPr><w:tblGrid>${'<w:gridCol w:w="4252"/>'.repeat(colunas)}</w:tblGrid>` +
    `<w:tr><w:trPr><w:cantSplit/></w:trPr>`
  if (pessoas.length > 1) return abre(8504, 2) + celula(pessoas[1]) + celula(pessoas[0]) + '</w:tr></w:tbl>'
  return abre(4252, 1) + celula(pessoas[0]) + '</w:tr></w:tbl>'
}

export async function gerarLaudoAlvara(d: DadosLaudo): Promise<Blob> {
  const resp = await fetch('/laudo-alvara.docx')
  if (!resp.ok) throw new Error('Modelo do laudo não encontrado no servidor.')
  const zip = await JSZip.loadAsync(await resp.arrayBuffer())
  const caminho = 'word/document.xml'
  let xml = await zip.file(caminho)!.async('string')

  const fotos = d.fotos.slice(0, 4)
  const [ano, mes, dia] = d.dataEmissao.split('-')
  const valores: Record<string, string> = {
    numero: formatarProtocolo(d.numero),
    nome: d.nome.trim().toUpperCase(),
    risco: d.risco || '—',
    visto_nome: d.visto.nome,
    visto_cargo: d.visto.cargo,
    visto_decreto: d.visto.decreto,
    data_extenso: `${dia} de ${MESES[Number(mes) - 1]} de ${ano}`,
  }
  for (let k = 1; k <= 4; k++) {
    const f = fotos[k - 1]
    valores[`leg${k}`] = f ? `Fig.${k}. – ${f.legenda.trim()}` : ''
  }
  // campos simples primeiro (antes de entrar texto digitado)
  xml = xml.replace(/\{(\w+)\}/g, (tag, chave: string) => chave in valores ? esc(valores[chave]) : tag)

  // Blocos de parágrafos
  xml = trocarParagrafo(xml, '{{IDENT}}', [linhasRotuladas(d.identificacao)])
  xml = trocarParagrafo(xml, '{{IDENT2}}', [linhasRotuladas(d.identificacao2)])
  xml = trocarParagrafo(xml, '{{CARACT}}', [runsMarcados(d.caracterizacao)])
  xml = trocarParagrafo(xml, '{{CONDICOES}}', d.condicoes.map(runsMarcados))
  xml = trocarParagrafo(xml, '{{CONCLUSAO}}', [runsMarcados(d.conclusao)])
  xml = trocarParagrafo(xml, '{{PARECER}}', d.parecer.map(runsMarcados))
  const titulo = d.assinantes.length > 1 ? 'Responsáveis pela Vistoria:' : 'Responsável pela Vistoria:'
  xml = trocarParagrafo(xml, '{{RESPONSAVEIS}}', [
    run(titulo, true) + quebra + d.assinantes.map(s => run(`${s.nome} – ${s.cargoAssinatura1} / ${s.cargoAssinatura2}`)).join(quebra),
  ])

  // Assinaturas: tabela mantida junto com a data (keepNext no modelo)
  {
    const i = xml.indexOf('<w:t>{{ASSINATURAS}}</w:t>')
    const ini = xml.lastIndexOf('<w:p>', i)
    const fim = xml.indexOf('</w:p>', i) + 6
    xml = xml.slice(0, ini) + tabelaAssinaturas(d.assinantes) + xml.slice(fim)
  }

  // Anexo de fotos
  if (fotos.length === 0) {
    const i = xml.indexOf('<w:t>{{ANEXO_INI}}</w:t>')
    const j = xml.indexOf('<w:t>{{ANEXO_FIM}}</w:t>')
    const ini = xml.lastIndexOf('<w:p>', i)
    const fim = xml.indexOf('</w:p>', j) + 6
    xml = xml.slice(0, ini) + xml.slice(fim)
  } else {
    // descobre qual arquivo de imagem está em cada quadro (ordem do documento)
    const a = xml.indexOf('{{ANEXO_INI}}'), b = xml.indexOf('{{ANEXO_FIM}}')
    const ids = [...xml.slice(a, b).matchAll(/r:embed="(rId\d+)"/g)].map(m => m[1])
    const rels = await zip.file('word/_rels/document.xml.rels')!.async('string')
    fotos.forEach((f, k) => {
      const alvo = rels.match(new RegExp(`Id="${ids[k]}"[^>]*Target="([^"]+)"`))?.[1]
      if (alvo) zip.file(`word/${alvo}`, f.bytes)
    })
    // com 1 ou 2 fotos, tira a segunda linha de quadros (fotos 3 e 4)
    if (fotos.length <= 2) {
      const ini = xml.indexOf('{{ANEXO_INI}}'), fimA = xml.indexOf('{{ANEXO_FIM}}')
      let trecho = xml.slice(ini, fimA)
      const linhas = [...trecho.matchAll(/<w:tr[ >]/g)].map(m => m.index!)
      if (linhas.length === 4) {
        trecho = trecho.slice(0, linhas[2]) + trecho.slice(trecho.lastIndexOf('</w:tr>') + '</w:tr>'.length)
        xml = xml.slice(0, ini) + trecho + xml.slice(fimA)
      }
    }
    // legendas alinhadas à esquerda (no modelo algumas estavam justificadas e ficavam "esticadas")
    // e fotos sem o corte herdado do modelo: a foto já vem recortada na proporção do quadro,
    // e um corte a mais no Word deixava a imagem esticada para cima.
    {
      const ini = xml.indexOf('{{ANEXO_INI}}'), fimA = xml.indexOf('{{ANEXO_FIM}}')
      xml = xml.slice(0, ini) + xml.slice(ini, fimA)
        .replace(/<w:jc w:val="(both|distribute)"\/>/g, '<w:jc w:val="left"/>')
        .replace(/<a:srcRect [^>]*\/>/g, '<a:srcRect/>') + xml.slice(fimA)
    }
    xml = trocarParagrafo(xml, '{{ANEXO_INI}}', [`<w:r><w:br w:type="page"/></w:r>`])
    xml = trocarParagrafo(xml, '{{ANEXO_FIM}}', [''])
  }

  if (xml.includes('<w:t>{{')) throw new Error('Ficou campo sem preencher no laudo.')
  zip.file(caminho, xml)

  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })
}

export function nomeArquivoLaudo(dataEmissao: string, numero: string | null, nome: string) {
  const num = (numero || '').trim().replace(/^AL-?/i, '').split('/')[0] || 'SN'
  const est = nome.trim().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '').toUpperCase()
  return `${dataEmissao}_Laudo_AL_${num}_${est}.docx`
}

// ---------- Fotos (navegador) ----------
// Recorta a imagem no formato do quadro do laudo (preenchendo, sem esticar)
export async function recortarFoto(origem: Blob, aspecto = FOTO_ASPECTO, largura = 1000): Promise<Uint8Array> {
  const bmp = await createImageBitmap(origem)
  const altura = Math.round(largura / aspecto)
  let sw = bmp.width, sh = Math.round(bmp.width / aspecto)
  if (sh > bmp.height) { sh = bmp.height; sw = Math.round(bmp.height * aspecto) }
  const sx = Math.round((bmp.width - sw) / 2), sy = Math.round((bmp.height - sh) / 2)
  const canvas = document.createElement('canvas')
  canvas.width = largura; canvas.height = altura
  canvas.getContext('2d')!.drawImage(bmp, sx, sy, sw, sh, 0, 0, largura, altura)
  const blob = await new Promise<Blob>((ok, erro) => canvas.toBlob(b => b ? ok(b) : erro(new Error('Falha ao processar a foto')), 'image/jpeg', 0.85))
  return new Uint8Array(await blob.arrayBuffer())
}

// Reduz a foto antes de enviar (máx. 1600 px no maior lado)
export async function reduzirFoto(arquivo: File, max = 1600): Promise<Blob> {
  const bmp = await createImageBitmap(arquivo)
  const f = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * f); canvas.height = Math.round(bmp.height * f)
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
  return new Promise<Blob>((ok, erro) => canvas.toBlob(b => b ? ok(b) : erro(new Error('Falha ao processar a foto')), 'image/jpeg', 0.85))
}
