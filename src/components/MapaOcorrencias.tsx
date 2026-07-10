import React, { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet.markercluster'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import { supabase } from '../lib/supabase'

type Ocorrencia = {
  id: string
  pessoa_id: number | null
  documento_url: string | null
  protocolo: string | null
  latitude: number | null
  longitude: number | null
  endereco: string | null
  bairro: string | null
  data_vistoria: string | null
  tipificacao: string | null
  tipificacao_outro: string | null
  nivel_risco: string | null
  pessoas_afetadas: number | null
  familias_afetadas: number | null
  descricao_situacao: string | null
  situacao_imovel: string | null
}

type Foco = {
  lat: number
  lon: number
  data_hora: string
  satelite: string
  municipio: string
  estado: string
  dias_sem_chuva: number | null
  precipitacao: number | null
  risco_fogo: number | null
  frp: number | null
  bioma: string
}

type Comunidade = {
  id: number
  nome: string
  gps_lat: number | null
  gps_lng: number | null
  distancia: string | null
  duracao_viagem: string | null
  qtd_pessoas: number | null
  qtd_familias: number | null
  presidente_nome: string | null
  presidente_telefone: string | null
}

// Centro de Tefé — usado como fallback quando não há pontos
const TEFE: [number, number] = [-3.3548, -64.7110]

const RISK_COLORS: Record<string, string> = {
  'Muito Alto': '#dc2626',
  'Alto': '#ea580c',
  'Médio': '#d97706',
  'Medio': '#d97706',
  'Baixo': '#16a34a',
}
const RISK_RANK: Record<string, number> = {
  'Muito Alto': 4, 'Alto': 3, 'Médio': 2, 'Medio': 2, 'Baixo': 1,
}
const corDoRisco = (nivel: string | null) => (nivel && RISK_COLORS[nivel]) || '#6b7280'

// Cor do foco de calor pelo risco de fogo (0..1) do INPE
const corDoFoco = (risco: number | null): string => {
  if (risco == null) return '#ef4444'
  if (risco >= 0.7) return '#b91c1c'
  if (risco >= 0.4) return '#ea580c'
  return '#f59e0b'
}

const esc = (s: any) =>
  String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const fmtData = (s: string | null) => {
  if (!s) return 's/ data'
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s
}

const labelTipo = (o: Ocorrencia) =>
  o.tipificacao === 'Outros' && o.tipificacao_outro
    ? o.tipificacao_outro
    : (o.tipificacao || '—')

export const MapaOcorrencias: React.FC = () => {
  const mapDivRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const clusterRef = useRef<any>(null)
  const focosLayerRef = useRef<any>(null)

  const [focos, setFocos] = useState<Foco[]>([])
  const [mostrarFocos, setMostrarFocos] = useState(false)
  const [focosLoading, setFocosLoading] = useState(false)
  const [focosInfo, setFocosInfo] = useState<{ total: number; atualizado_em: string } | null>(null)
  const [focosErro, setFocosErro] = useState<string | null>(null)
  const comunidadesLayerRef = useRef<any>(null)
  const [comunidades, setComunidades] = useState<Comunidade[]>([])
  const [mostrarComunidades, setMostrarComunidades] = useState(false)

  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [filtroTipo, setFiltroTipo] = useState<string>('Todas')

  // 1) Carrega as ocorrências do Supabase
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('ocorrencias')
        .select('id, pessoa_id, documento_url, protocolo, latitude, longitude, endereco, bairro, data_vistoria, tipificacao, tipificacao_outro, nivel_risco, pessoas_afetadas, familias_afetadas, descricao_situacao, situacao_imovel')
        .order('data_vistoria', { ascending: false })
      if (error) { setErro(error.message); setLoading(false); return }
      setOcorrencias((data as Ocorrencia[]) || [])
      setLoading(false)
    })()
  }, [])

  // Carrega as comunidades (para a camada do mapa)
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('comunidades')
        .select('id, nome, gps_lat, gps_lng, distancia, duracao_viagem, qtd_pessoas, qtd_familias, presidente_nome, presidente_telefone')
      setComunidades((data as Comunidade[]) || [])
    })()
  }, [])

  // 2) Inicializa o mapa uma única vez
  useEffect(() => {
    if (mapRef.current || !mapDivRef.current) return
    const map = L.map(mapDivRef.current, { center: TEFE, zoom: 13 })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map)
    const cluster = (L as any).markerClusterGroup({ maxClusterRadius: 50 })
    map.addLayer(cluster)
    mapRef.current = map
    clusterRef.current = cluster
    setTimeout(() => map.invalidateSize(), 100)
    return () => {
      map.remove()
      mapRef.current = null
      clusterRef.current = null
    }
  }, [])

  // 3) (Re)desenha os marcadores quando dados/filtro mudam
  useEffect(() => {
    const map = mapRef.current
    const cluster = clusterRef.current
    if (!map || !cluster) return
    cluster.clearLayers()

    const comCoord = ocorrencias.filter(o =>
      o.latitude != null && o.longitude != null &&
      (filtroTipo === 'Todas' || o.tipificacao === filtroTipo)
    )

    // Agrupa por local: pessoa_id quando houver; senão coordenada
    // arredondada (~11m) — assim a derivazinha do GPS não cria pinos
    // repetidos quando você volta na mesma casa.
    const grupos = new Map<string, Ocorrencia[]>()
    for (const o of comCoord) {
      const chave = o.pessoa_id != null
        ? `p${o.pessoa_id}`
        : `c${o.latitude!.toFixed(4)},${o.longitude!.toFixed(4)}`
      const arr = grupos.get(chave) || []
      arr.push(o)
      grupos.set(chave, arr)
    }

    const bounds: [number, number][] = []

    grupos.forEach((lista) => {
      // mais recente primeiro; usa a posição dela como base do pino
      lista.sort((a, b) => (b.data_vistoria || '').localeCompare(a.data_vistoria || ''))
      const base = lista[0]
      const lat = base.latitude!, lng = base.longitude!
      bounds.push([lat, lng])

      const piorRank = lista.reduce(
        (max, o) => Math.max(max, RISK_RANK[o.nivel_risco || ''] || 0), 0)
      const nivelLabel = Object.keys(RISK_RANK).find(k => RISK_RANK[k] === piorRank) || null
      const cor = corDoRisco(nivelLabel)
      const n = lista.length

      const icon = L.divIcon({
        className: '',
        html: `<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${cor};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);color:#fff;font-size:11px;font-weight:700;font-family:sans-serif;">${n > 1 ? n : ''}</span></div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 26],
        popupAnchor: [0, -26],
      })

      const itens = lista.map(o => {
        const afet = [
          o.pessoas_afetadas ? `${o.pessoas_afetadas} pess.` : '',
          o.familias_afetadas ? `${o.familias_afetadas} fam.` : '',
        ].filter(Boolean).join(' · ')
        const pdf = o.documento_url
          ? ` · <a href="${esc(o.documento_url)}" target="_blank" rel="noopener" style="color:#2563eb;text-decoration:underline;">PDF</a>`
          : ''
        const risco = o.nivel_risco
          ? `<span style="color:${corDoRisco(o.nivel_risco)};font-weight:600;">${esc(o.nivel_risco)}</span>`
          : ''
        return `<div style="padding:4px 0;border-top:1px solid #eee;"><div style="font-weight:600;">${esc(fmtData(o.data_vistoria))} — ${esc(labelTipo(o))}</div><div style="font-size:12px;color:#555;">${risco}${risco && afet ? ' · ' : ''}${esc(afet)}${pdf}</div></div>`
      }).join('')

      const titulo = esc(base.endereco || base.bairro || 'Local')
      const html = `<div style="min-width:220px;max-width:280px;font-family:sans-serif;"><div style="font-weight:700;font-size:13px;margin-bottom:2px;">${titulo}</div><div style="font-size:11px;color:#888;margin-bottom:4px;">${esc(base.bairro || '')}${n > 1 ? ` · ${n} ocorrências` : ''}</div>${itens}</div>`

      const marker = L.marker([lat, lng], { icon })
      marker.bindPopup(html)
      cluster.addLayer(marker)
    })

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 })
    }
  }, [ocorrencias, filtroTipo])

  // Busca os focos de calor do INPE (via Edge Function) ao ligar a camada
  async function carregarFocos() {
    setFocosLoading(true)
    setFocosErro(null)
    try {
      const { data, error } = await supabase.functions.invoke('focos-inpe')
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      const lista = (data?.focos as Foco[]) || []
      setFocos(lista)
      setFocosInfo({ total: data?.total ?? 0, atualizado_em: data?.atualizado_em ?? '' })
      // Grava no histórico (ignora duplicados pela chave) para os gráficos
      if (lista.length > 0) {
        const rows = lista.map(f => ({
          chave: `${f.lat.toFixed(5)},${f.lon.toFixed(5)},${f.data_hora}`,
          lat: f.lat, lon: f.lon, data_hora: f.data_hora,
          data_foco: (f.data_hora || '').slice(0, 10) || null,
          satelite: f.satelite, municipio: f.municipio, estado: f.estado,
          risco_fogo: f.risco_fogo, frp: f.frp, bioma: f.bioma,
        }))
        supabase.from('focos_historico').upsert(rows, { onConflict: 'chave', ignoreDuplicates: true }).then(() => {})
      }
    } catch (e: any) {
      setFocosErro(e?.message || 'Falha ao buscar focos do INPE')
      setFocos([])
    } finally {
      setFocosLoading(false)
    }
  }

  // Liga/desliga a camada de focos
  useEffect(() => {
    if (mostrarFocos && focos.length === 0 && !focosLoading && !focosInfo) {
      carregarFocos()
    }
  }, [mostrarFocos])

  // (Re)desenha os focos no mapa
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (focosLayerRef.current) {
      map.removeLayer(focosLayerRef.current)
      focosLayerRef.current = null
    }
    if (!mostrarFocos || focos.length === 0) return

    const grupo = L.layerGroup()
    for (const f of focos) {
      const cor = corDoFoco(f.risco_fogo)
      const circ = L.circleMarker([f.lat, f.lon], {
        radius: 9, color: cor, weight: 1, fillColor: cor, fillOpacity: 0.4,
      })
      const linha = (rot: string, val: any) =>
        (val === null || val === undefined || val === '') ? '' :
        `<div style="font-size:12px;"><b>${rot}:</b> ${esc(val)}</div>`
      const dh = f.data_hora ? esc(f.data_hora.replace('T', ' ').slice(0, 16)) + ' GMT' : '—'
      const html = `<div style="min-width:200px;font-family:sans-serif;">
        <div style="font-weight:700;color:${cor};margin-bottom:3px;">🔥 Foco de calor — INPE</div>
        <div style="font-size:12px;"><b>Local:</b> ${esc(f.municipio || '—')}${f.estado ? '/' + esc(f.estado) : ''}</div>
        <div style="font-size:12px;"><b>Detecção:</b> ${dh}</div>
        ${linha('Satélite', f.satelite)}
        ${linha('Risco de fogo', f.risco_fogo != null ? (f.risco_fogo * 100).toFixed(0) + '%' : '')}
        ${linha('FRP (potência)', f.frp != null ? f.frp + ' MW' : '')}
        ${linha('Dias sem chuva', f.dias_sem_chuva)}
        ${linha('Precipitação', f.precipitacao != null ? f.precipitacao + ' mm' : '')}
        ${linha('Bioma', f.bioma)}
        <div style="font-size:10px;color:#999;margin-top:4px;">Coord: ${f.lat.toFixed(4)}, ${f.lon.toFixed(4)}</div>
      </div>`
      circ.bindPopup(html)
      grupo.addLayer(circ)
    }
    grupo.addTo(map)
    focosLayerRef.current = grupo
  }, [mostrarFocos, focos])

  // (Re)desenha as comunidades (pinos azuis com casinha)
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (comunidadesLayerRef.current) {
      map.removeLayer(comunidadesLayerRef.current)
      comunidadesLayerRef.current = null
    }
    if (!mostrarComunidades) return

    const comCoord = comunidades.filter(c => c.gps_lat != null && c.gps_lng != null)
    if (comCoord.length === 0) return

    const grupo = L.layerGroup()
    for (const c of comCoord) {
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#2563eb;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);color:#fff;font-size:14px;">🏠</span></div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30],
      })
      const linha = (rot: string, val: any) =>
        (val === null || val === undefined || val === '') ? '' :
        `<div style="font-size:12px;"><b>${rot}:</b> ${esc(val)}</div>`
      const pessoas = [
        c.qtd_pessoas != null ? `${c.qtd_pessoas} pessoas` : '',
        c.qtd_familias != null ? `${c.qtd_familias} famílias` : '',
      ].filter(Boolean).join(' · ')
      const html = `<div style="min-width:210px;font-family:sans-serif;">
        <div style="font-weight:700;color:#2563eb;margin-bottom:3px;">🏠 ${esc(c.nome)}</div>
        ${linha('Presidente', c.presidente_nome)}
        ${linha('Telefone', c.presidente_telefone)}
        ${pessoas ? `<div style="font-size:12px;"><b>População:</b> ${esc(pessoas)}</div>` : ''}
        ${linha('Distância', c.distancia)}
        ${linha('Duração da viagem', c.duracao_viagem)}
        <div style="font-size:10px;color:#999;margin-top:4px;">Coord: ${c.gps_lat!.toFixed(4)}, ${c.gps_lng!.toFixed(4)}</div>
      </div>`
      const marker = L.marker([c.gps_lat!, c.gps_lng!], { icon })
      marker.bindPopup(html)
      grupo.addLayer(marker)
    }
    grupo.addTo(map)
    comunidadesLayerRef.current = grupo
  }, [mostrarComunidades, comunidades])

  const tipos = Array.from(
    new Set(ocorrencias.map(o => o.tipificacao).filter(Boolean))
  ) as string[]
  const totalPlot = ocorrencias.filter(o => o.latitude != null && o.longitude != null).length
  const semCoord = ocorrencias.length - totalPlot

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-wrap items-center gap-3 px-5 py-3 bg-surface-card border-b border-gray-100 text-sm">
        <span className="font-bold text-text-main">{totalPlot} ocorrências no mapa</span>
        {semCoord > 0 && (
          <span className="text-text-secondary">({semCoord} sem coordenada)</span>
        )}
        <div className="flex items-center gap-2 ml-auto">
          <label className="text-xs text-text-secondary uppercase font-bold">Tipo</label>
          <select
            value={filtroTipo}
            onChange={e => setFiltroTipo(e.target.value)}
            className="p-1.5 bg-white border border-gray-200 rounded text-sm outline-none"
          >
            <option value="Todas">Todas</option>
            {tipos.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <button
          onClick={() => setMostrarFocos(v => !v)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm font-bold border ${mostrarFocos ? 'bg-error-expired text-white border-error-expired' : 'bg-white text-error-expired border-error-expired/40'}`}
          title="Focos de calor detectados por satélite (INPE)"
        >
          🔥 Focos INPE{focosInfo ? ` (${focosInfo.total})` : ''}
        </button>
        {mostrarFocos && (
          <button onClick={carregarFocos} disabled={focosLoading}
            className="text-xs text-text-secondary underline disabled:opacity-50">
            {focosLoading ? 'atualizando…' : 'atualizar'}
          </button>
        )}
        <button
          onClick={() => setMostrarComunidades(v => !v)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm font-bold border ${mostrarComunidades ? 'text-white border-blue-600' : 'bg-white border-blue-600/40'}`}
          style={mostrarComunidades ? { backgroundColor: '#2563eb' } : { color: '#2563eb' }}
          title="Comunidades cadastradas"
        >
          🏠 Comunidades{comunidades.filter(c => c.gps_lat != null && c.gps_lng != null).length > 0 ? ` (${comunidades.filter(c => c.gps_lat != null && c.gps_lng != null).length})` : ''}
        </button>
        <div className="flex items-center gap-3 w-full text-xs text-text-secondary">
          <Legenda cor="#dc2626" label="Muito Alto" />
          <Legenda cor="#ea580c" label="Alto" />
          <Legenda cor="#d97706" label="Médio" />
          <Legenda cor="#16a34a" label="Baixo" />
          <Legenda cor="#6b7280" label="N/D" />
        </div>
        {mostrarFocos && (
          <div className="w-full text-xs text-text-secondary">
            {focosLoading && <span>Buscando focos do INPE…</span>}
            {focosErro && <span className="text-error-expired">Focos INPE: {focosErro}</span>}
            {!focosLoading && !focosErro && focosInfo && (
              <span>🔥 {focosInfo.total} foco(s) de calor na região (satélite INPE, últimas ~48h)</span>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center text-text-secondary z-[1000] bg-white/60">
            Carregando ocorrências…
          </div>
        )}
        {erro && (
          <div className="absolute inset-0 flex items-center justify-center text-error-expired z-[1000] bg-white/80 p-4 text-center">
            Erro ao carregar: {erro}
          </div>
        )}
        <div ref={mapDivRef} className="absolute inset-0" />
      </div>
    </div>
  )
}

const Legenda: React.FC<{ cor: string; label: string }> = ({ cor, label }) => (
  <span className="inline-flex items-center gap-1">
    <span style={{ background: cor }} className="inline-block w-3 h-3 rounded-full border border-white shadow" />
    {label}
  </span>
)