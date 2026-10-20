// Funções puras do importador de comunidades (sem React), para poder testar isoladamente.

export interface ComunidadeExistente {
  id: number
  nome: string
  gps_lat: number | null
  gps_lng: number | null
  qtd_familias?: number | null
  qtd_pessoas?: number | null
  presidente_nome?: string | null
  presidente_telefone?: string | null
  observacoes?: string | null
}

export type Situacao = 'nova' | 'duplicada' | 'verificar' | 'erro'

export interface LinhaImport {
  linha: number            // número da linha no arquivo (para o usuário achar)
  nome: string
  gps_lat: number | null
  gps_lng: number | null
  qtd_familias: number | null
  qtd_pessoas: number | null
  presidente_nome: string | null
  presidente_telefone: string | null
  observacoes: string | null
  situacao: Situacao
  avisos: string[]
  duplicadaDe?: ComunidadeExistente   // comunidade já cadastrada que parece ser a mesma
  acao: 'inserir' | 'completar' | 'ignorar'
}

// Limites aproximados do município de Tefé (com folga) para pegar coordenada trocada ou errada
export const LIMITES_TEFE = { latMin: -6.0, latMax: -2.6, lngMin: -67.2, lngMax: -63.6 }

const BOM = new RegExp('^' + String.fromCharCode(0xFEFF))
const STOP = new Set(['comunidade', 'com', 'area', 'rural', 'de', 'do', 'da', 'dos', 'das', 'e'])
const ABREV: Record<string, string> = { sra: 'senhora', sr: 'senhor', n: 'nossa', sto: 'santo', sta: 'santa', s: 'sao', sao: 'sao' }

export function normalizarNome(s: string): string {
  return (s || '')
    .normalize('NFD').replace(/\p{M}/gu, '')
    .toLowerCase().replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/).filter(Boolean)
    .map(t => ABREV[t] ?? t)
    .filter(t => !STOP.has(t))
    .join(' ')
}

export function distanciaKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const r = 6371, rad = Math.PI / 180
  const dLat = (lat2 - lat1) * rad, dLng = (lng2 - lng1) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2
  return 2 * r * Math.asin(Math.sqrt(h))
}

// ---------------- Leitura do texto (CSV, ponto e vírgula ou colado do Excel) ----------------

function detectarSeparador(primeira: string): string {
  const cont = (c: string) => primeira.split(c).length - 1
  const tab = cont('\t'), pv = cont(';'), vg = cont(',')
  if (tab >= pv && tab >= vg && tab > 0) return '\t'
  if (pv >= vg && pv > 0) return ';'
  return ','
}

export function lerTabela(texto: string): string[][] {
  const limpo = texto.replace(BOM, '').replace(/\r\n?/g, '\n')
  const primeira = limpo.split('\n').find(l => l.trim()) || ''
  const sep = detectarSeparador(primeira)
  const linhas: string[][] = []
  let campo = '', linha: string[] = [], aspas = false
  for (let i = 0; i < limpo.length; i++) {
    const ch = limpo[i]
    if (aspas) {
      if (ch === '"') {
        if (limpo[i + 1] === '"') { campo += '"'; i++ } else aspas = false
      } else campo += ch
    } else if (ch === '"' && campo === '') aspas = true
    else if (ch === sep) { linha.push(campo); campo = '' }
    else if (ch === '\n') { linha.push(campo); linhas.push(linha); linha = []; campo = '' }
    else campo += ch
  }
  if (campo !== '' || linha.length) { linha.push(campo); linhas.push(linha) }
  return linhas.filter(l => l.some(c => c.trim() !== ''))
}

// ---------------- Coordenadas ----------------

function numeroBR(s: string): number | null {
  const t = s.trim().replace(/\s/g, '')
  if (!t) return null
  // "-3,3548" (vírgula decimal) -> "-3.3548"
  const v = Number(/^-?\d+,\d+$/.test(t) ? t.replace(',', '.') : t)
  return Number.isFinite(v) ? v : null
}

// Aceita graus/minutos/segundos: 3°21'12.5"S  |  3 21 12 S  |  S 3°21'
function grausParaDecimal(s: string): number | null {
  const m = s.trim().toUpperCase().match(/^([NSWEOL])?\s*(\d+(?:[.,]\d+)?)\s*[°º]?\s*(?:(\d+(?:[.,]\d+)?)\s*['’′]?\s*)?(?:(\d+(?:[.,]\d+)?)\s*(?:["”″]|'')?\s*)?([NSWEOL])?$/)
  if (!m) return null
  const g = Number(m[2].replace(',', '.')), mi = Number((m[3] || '0').replace(',', '.')), se = Number((m[4] || '0').replace(',', '.'))
  if (mi >= 60 || se >= 60) return null
  let v = g + mi / 60 + se / 3600
  const hem = m[1] || m[5]
  if (hem === 'S' || hem === 'W' || hem === 'O') v = -v
  return v
}

/** Extrai "lat, lng" de texto livre: decimal, vírgula decimal, graus/minutos ou link do Google Maps / WhatsApp. */
export function extrairCoordenada(txt: string): { lat: number, lng: number } | null {
  if (!txt) return null
  const s = txt.trim()
  // Links: ...@-3.35,-64.71,15z  |  ?q=-3.35,-64.71  |  !3d-3.35!4d-64.71  |  ll=-3.35,-64.71
  const link = s.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) ||
    s.match(/[@=](-?\d+\.\d+),\s*(-?\d+\.\d+)/) ||
    s.match(/(?:q|query|ll|destination)=(-?\d+\.\d+)(?:,|%2C)\s*(-?\d+\.\d+)/i)
  if (link) return { lat: Number(link[1]), lng: Number(link[2]) }
  // Graus/minutos com hemisfério: separa no meio pela letra
  const dms = s.toUpperCase().match(/^(.+?[NS])\s*[,;]?\s*(.+?[WEOL])$/)
  if (dms && /[°º'"]/.test(s)) {
    const a = grausParaDecimal(dms[1]), b = grausParaDecimal(dms[2])
    if (a != null && b != null) return { lat: a, lng: b }
  }
  // Decimal: "-3.35, -64.71" | "-3.35 -64.71" | "-3,35; -64,71"
  const virgulaDecimal = s.match(/^(-?\d+,\d+)\s*[,;\s]\s*(-?\d+,\d+)$/)
  if (virgulaDecimal) return { lat: numeroBR(virgulaDecimal[1])!, lng: numeroBR(virgulaDecimal[2])! }
  const ponto = s.match(/^(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)$/)
  if (ponto) return { lat: Number(ponto[1]), lng: Number(ponto[2]) }
  return null
}

/** Confere se a coordenada cai em Tefé; tenta corrigir sinal esquecido ou lat/lng trocados. */
export function validarCoordenada(lat: number, lng: number): { lat: number, lng: number, aviso?: string, erro?: string } {
  const dentro = (a: number, b: number) =>
    a >= LIMITES_TEFE.latMin && a <= LIMITES_TEFE.latMax && b >= LIMITES_TEFE.lngMin && b <= LIMITES_TEFE.lngMax
  if (dentro(lat, lng)) return { lat, lng }
  const tentativas: [number, number, string][] = [
    [-Math.abs(lat), -Math.abs(lng), 'sinal negativo corrigido (sul/oeste)'],
    [lng, lat, 'latitude e longitude estavam trocadas'],
    [-Math.abs(lng), -Math.abs(lat), 'lat/lng trocadas e sinal corrigido'],
  ]
  for (const [a, b, msg] of tentativas) if (dentro(a, b)) return { lat: a, lng: b, aviso: `Coordenada ajustada: ${msg}` }
  return { lat, lng, erro: 'Coordenada fora do município de Tefé' }
}

// ---------------- Colunas ----------------

const ALIAS: Record<string, string[]> = {
  nome: ['nome', 'comunidade', 'nome_comunidade', 'nome da comunidade', 'localidade'],
  gps_lat: ['gps_lat', 'lat', 'latitude', 'y'],
  gps_lng: ['gps_lng', 'lng', 'lon', 'long', 'longitude', 'x'],
  coord: ['coordenada', 'coordenadas', 'localizacao', 'localização', 'gps', 'link', 'local', 'lat, lng', 'lat,lng'],
  qtd_familias: ['qtd_familias', 'familias', 'famílias', 'n familias', 'nº famílias', 'quantidade de familias', 'quantidade de famílias'],
  qtd_pessoas: ['qtd_pessoas', 'pessoas', 'habitantes', 'populacao', 'população', 'quantidade de pessoas', 'moradores'],
  presidente_nome: ['presidente_nome', 'presidente', 'lider', 'líder', 'liderança', 'lideranca', 'responsavel', 'responsável'],
  presidente_telefone: ['presidente_telefone', 'telefone', 'fone', 'celular', 'whatsapp', 'contato'],
  observacoes: ['observacoes', 'observações', 'obs', 'observacao', 'observação'],
}

const chave = (s: string) => s.trim().toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')

export function mapearColunas(cabecalho: string[]): Record<string, number> {
  const mapa: Record<string, number> = {}
  cabecalho.forEach((h, i) => {
    const k = chave(h)
    for (const [campo, nomes] of Object.entries(ALIAS)) {
      if (mapa[campo] === undefined && nomes.some(n => chave(n) === k)) { mapa[campo] = i; break }
    }
  })
  return mapa
}

const inteiro = (s: string | undefined) => {
  const v = parseInt((s || '').replace(/\D/g, ''), 10)
  return Number.isFinite(v) ? v : null
}
const texto = (s: string | undefined) => (s || '').trim() || null

// ---------------- Montagem e conferência ----------------

export function prepararImportacao(textoArquivo: string, existentes: ComunidadeExistente[]):
  { linhas: LinhaImport[], erroGeral?: string } {
  const tabela = lerTabela(textoArquivo)
  if (tabela.length < 2) return { linhas: [], erroGeral: 'O arquivo não tem linhas de dados (precisa do cabeçalho + pelo menos 1 linha).' }
  const mapa = mapearColunas(tabela[0])
  if (mapa.nome === undefined) return { linhas: [], erroGeral: 'Não encontrei a coluna com o nome da comunidade (use o cabeçalho "nome" ou "comunidade").' }

  const linhas: LinhaImport[] = []
  tabela.slice(1).forEach((cel, idx) => {
    const avisos: string[] = []
    const nome = (cel[mapa.nome] || '').trim().replace(/\s+/g, ' ')
    let lat: number | null = null, lng: number | null = null
    if (mapa.gps_lat !== undefined && mapa.gps_lng !== undefined && (cel[mapa.gps_lat] || '').trim()) {
      const a = cel[mapa.gps_lat], b = cel[mapa.gps_lng]
      lat = numeroBR(a) ?? grausParaDecimal(a); lng = numeroBR(b) ?? grausParaDecimal(b)
      if (lat == null || lng == null) { avisos.push('Latitude/longitude ilegível'); lat = lng = null }
    } else if (mapa.coord !== undefined && (cel[mapa.coord] || '').trim()) {
      const c = extrairCoordenada(cel[mapa.coord])
      if (c) { lat = c.lat; lng = c.lng } else avisos.push('Coordenada ilegível: "' + cel[mapa.coord].slice(0, 40) + '"')
    }
    let situacao: Situacao = 'nova'
    if (!nome) { situacao = 'erro'; avisos.push('Sem nome') }
    if (lat != null && lng != null) {
      const v = validarCoordenada(lat, lng)
      lat = v.lat; lng = v.lng
      if (v.aviso) avisos.push(v.aviso)
      if (v.erro) { situacao = 'erro'; avisos.push(v.erro) }
    } else if (situacao !== 'erro') avisos.push('Sem coordenada')

    linhas.push({
      linha: idx + 2, nome,
      gps_lat: lat != null ? Math.round(lat * 1e6) / 1e6 : null,
      gps_lng: lng != null ? Math.round(lng * 1e6) / 1e6 : null,
      qtd_familias: inteiro(cel[mapa.qtd_familias]),
      qtd_pessoas: inteiro(cel[mapa.qtd_pessoas]),
      presidente_nome: texto(cel[mapa.presidente_nome]),
      presidente_telefone: texto(cel[mapa.presidente_telefone]),
      observacoes: texto(cel[mapa.observacoes]),
      situacao, avisos, acao: situacao === 'erro' ? 'ignorar' : 'inserir',
    })
  })

  // Confere contra o que já está no SAD e contra as próprias linhas do arquivo
  const jaVistas: LinhaImport[] = []
  for (const l of linhas) {
    if (l.situacao === 'erro') continue
    const n = normalizarNome(l.nome)
    const temCoord = l.gps_lat != null && l.gps_lng != null
    const perto = (a: { gps_lat: number | null, gps_lng: number | null }, km: number) =>
      temCoord && a.gps_lat != null && a.gps_lng != null && distanciaKm(l.gps_lat!, l.gps_lng!, a.gps_lat, a.gps_lng) < km

    // 1) mesma comunidade já cadastrada: mesmo nome e (perto, ou alguma das duas sem coordenada)
    const dup = existentes.find(e => normalizarNome(e.nome) === n &&
      (perto(e, 3) || e.gps_lat == null || !temCoord))
    if (dup) {
      l.situacao = 'duplicada'; l.duplicadaDe = dup
      const faltaNoSad = (dup.gps_lat == null && temCoord) || (dup.qtd_familias == null && l.qtd_familias != null) ||
        (!dup.presidente_nome && l.presidente_nome) || (!dup.presidente_telefone && l.presidente_telefone)
      l.acao = faltaNoSad ? 'completar' : 'ignorar'
      l.avisos.unshift(faltaNoSad ? `Já cadastrada (“${dup.nome}”) — pode completar o que falta` : `Já cadastrada (“${dup.nome}”)`)
      continue
    }
    // 2) repetida dentro do próprio arquivo
    const rep = jaVistas.find(o => normalizarNome(o.nome) === n && (perto(o, 3) || o.gps_lat == null || !temCoord))
    if (rep) { l.situacao = 'duplicada'; l.acao = 'ignorar'; l.avisos.unshift(`Repetida no arquivo (linha ${rep.linha})`); continue }
    // 3) nome diferente mas ponto muito próximo de outra: pode ser a mesma com outro nome
    const vizinha = existentes.find(e => perto(e, 0.8)) || jaVistas.find(o => perto(o, 0.8))
    if (vizinha) { l.situacao = 'verificar'; l.avisos.unshift(`A menos de 800 m de “${vizinha.nome}” — confira se é a mesma`) }
    jaVistas.push(l)
  }
  return { linhas }
}

/** Monta o que vai para o banco numa linha "completar": só preenche campos vazios da existente. */
export function camposParaCompletar(l: LinhaImport): Record<string, unknown> {
  const e = l.duplicadaDe!
  const upd: Record<string, unknown> = {}
  if (e.gps_lat == null && l.gps_lat != null) { upd.gps_lat = l.gps_lat; upd.gps_lng = l.gps_lng }
  if (e.qtd_familias == null && l.qtd_familias != null) upd.qtd_familias = l.qtd_familias
  if (e.qtd_pessoas == null && l.qtd_pessoas != null) upd.qtd_pessoas = l.qtd_pessoas
  if (!e.presidente_nome && l.presidente_nome) upd.presidente_nome = l.presidente_nome
  if (!e.presidente_telefone && l.presidente_telefone) upd.presidente_telefone = l.presidente_telefone
  if (!e.observacoes && l.observacoes) upd.observacoes = l.observacoes
  return upd
}

export const MODELO_CSV =
  'nome;coordenada;qtd_familias;qtd_pessoas;presidente_nome;presidente_telefone;observacoes\n' +
  'Exemplo São José;-3.4012, -64.5521;35;140;Fulano de Tal;(97) 99999-0000;Margem esquerda do Solimões\n'
