import React, { useState, useMemo } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import type { Estacao, RegistroNivel, RegistroChuva, RegistroUmidade } from './types'
import { dataBR } from './types'

interface Props {
  estacoes: Estacao[]
  registrosNivel: RegistroNivel[]
  registrosChuva: RegistroChuva[]
  registrosUmidade: RegistroUmidade[]
}

type Tipo = 'nivel' | 'chuva' | 'umidade'
type Periodo = '90' | '365' | '1825' | 'tudo'

const PERIODOS: { id: Periodo; label: string }[] = [
  { id: '90', label: 'Últimos 90 dias' },
  { id: '365', label: 'Último ano' },
  { id: '1825', label: 'Últimos 5 anos' },
  { id: 'tudo', label: 'Série completa' },
]

// Reduz o nº de pontos plotados mantendo o formato geral da curva (amostragem uniforme).
function decimar<T>(arr: T[], maxPontos: number): T[] {
  if (arr.length <= maxPontos) return arr
  const passo = arr.length / maxPontos
  const out: T[] = []
  for (let i = 0; i < maxPontos; i++) out.push(arr[Math.floor(i * passo)])
  out.push(arr[arr.length - 1])
  return out
}

export const Historico: React.FC<Props> = ({ estacoes, registrosNivel, registrosChuva, registrosUmidade }) => {
  const [estacaoId, setEstacaoId] = useState<string>(estacoes.find(e => e.ativa)?.id || estacoes[0]?.id || '')
  const [tipo, setTipo] = useState<Tipo>('nivel')
  const [periodo, setPeriodo] = useState<Periodo>('365')

  const estacao = estacoes.find(e => e.id === estacaoId)

  const serieCompleta = useMemo(() => {
    const base = tipo === 'nivel' ? registrosNivel : tipo === 'chuva' ? registrosChuva : registrosUmidade
    return base
      .filter(r => r.estacao_id === estacaoId)
      .map(r => ({
        data: r.data,
        valor: tipo === 'nivel' ? (r as RegistroNivel).cota_cm / 100 : tipo === 'chuva' ? (r as RegistroChuva).chuva_mm : (r as RegistroUmidade).umidade_pct,
      }))
      .sort((a, b) => a.data.localeCompare(b.data))
  }, [tipo, estacaoId, registrosNivel, registrosChuva, registrosUmidade])

  const recorde = useMemo(() => {
    if (serieCompleta.length === 0) return null
    let max = serieCompleta[0], min = serieCompleta[0]
    for (const p of serieCompleta) { if (p.valor > max.valor) max = p; if (p.valor < min.valor) min = p }
    return { max, min }
  }, [serieCompleta])

  const serie = useMemo(() => {
    if (periodo === 'tudo') return decimar(serieCompleta, 600)
    const dias = Number(periodo)
    const limite = new Date(); limite.setDate(limite.getDate() - dias)
    const limiteStr = limite.toISOString().split('T')[0]
    return decimar(serieCompleta.filter(p => p.data >= limiteStr), 600)
  }, [serieCompleta, periodo])

  // ---------- Geometria do gráfico (SVG feito à mão, sem biblioteca) ----------
  const W = 900, H = 320, PAD_L = 56, PAD_R = 20, PAD_T = 16, PAD_B = 36
  const inner = { w: W - PAD_L - PAD_R, h: H - PAD_T - PAD_B }

  const limiares = tipo === 'nivel' && estacao
    ? [
        { valor: estacao.cota_atencao_cm != null ? estacao.cota_atencao_cm / 100 : null, cor: '#CA8A04', label: 'Atenção' },
        { valor: estacao.cota_alerta_cm != null ? estacao.cota_alerta_cm / 100 : null, cor: '#D97706', label: 'Alerta' },
        { valor: estacao.cota_emergencia_cm != null ? estacao.cota_emergencia_cm / 100 : null, cor: '#DC2626', label: 'Emergência' },
      ].filter(l => l.valor != null) as { valor: number; cor: string; label: string }[]
    : []

  const valores = serie.map(p => p.valor).concat(limiares.map(l => l.valor))
  const yMin = valores.length ? Math.min(...valores) : 0
  const yMax = valores.length ? Math.max(...valores) : 1
  const yPad = (yMax - yMin) * 0.08 || 1
  const yLo = yMin - yPad, yHi = yMax + yPad

  const datas = serie.map(p => new Date(p.data + 'T12:00:00').getTime())
  const xMin = datas.length ? Math.min(...datas) : 0
  const xMax = datas.length ? Math.max(...datas) : 1

  const xScale = (t: number) => PAD_L + (xMax === xMin ? 0 : ((t - xMin) / (xMax - xMin)) * inner.w)
  const yScale = (v: number) => PAD_T + inner.h - ((v - yLo) / (yHi - yLo || 1)) * inner.h

  const pontos = serie.map(p => ({ x: xScale(new Date(p.data + 'T12:00:00').getTime()), y: yScale(p.valor), ...p }))
  const linha = pontos.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const area = pontos.length ? `${linha} L ${pontos[pontos.length - 1].x.toFixed(1)} ${PAD_T + inner.h} L ${pontos[0].x.toFixed(1)} ${PAD_T + inner.h} Z` : ''

  const unidade = tipo === 'nivel' ? 'm' : tipo === 'chuva' ? 'mm' : '%'
  const corLinha = tipo === 'nivel' ? '#1A56DB' : tipo === 'chuva' ? '#0891B2' : '#16A34A'

  const yTicks = 5
  const ticksY = Array.from({ length: yTicks + 1 }, (_, i) => yLo + ((yHi - yLo) * i) / yTicks)

  const ticksX = pontos.length > 1 ? [pontos[0], pontos[Math.floor(pontos.length / 2)], pontos[pontos.length - 1]] : pontos

  return (
    <div className="h-full overflow-y-auto space-y-3">
      {/* Filtros */}
      <div className="flex gap-2 flex-wrap items-center">
        <select className="p-2 border border-gray-200 rounded-lg text-sm outline-none" value={estacaoId} onChange={e => setEstacaoId(e.target.value)}>
          {estacoes.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
        </select>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(['nivel', 'chuva', 'umidade'] as Tipo[]).map(t => (
            <button key={t} onClick={() => setTipo(t)}
              className={`px-3 py-1.5 rounded text-sm font-bold ${tipo === t ? 'bg-white shadow text-text-main' : 'text-text-secondary'}`}>
              {t === 'nivel' ? 'Nível' : t === 'chuva' ? 'Chuva' : 'Umidade'}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {PERIODOS.map(p => (
            <button key={p.id} onClick={() => setPeriodo(p.id)}
              className={`px-3 py-1.5 rounded text-sm font-bold ${periodo === p.id ? 'bg-white shadow text-text-main' : 'text-text-secondary'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Recordes */}
      {recorde && (
        <div className="flex gap-4 flex-wrap">
          <div className="bg-white border border-gray-200 rounded-lg px-4 py-2 flex items-center gap-2">
            <TrendingUp size={16} className="text-primary-btn" />
            <div>
              <p className="text-xs text-text-secondary uppercase">Máxima da série</p>
              <p className="text-sm font-bold">{recorde.max.valor.toFixed(2)} {unidade} <span className="font-normal text-text-secondary">em {dataBR(recorde.max.data)}</span></p>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg px-4 py-2 flex items-center gap-2">
            <TrendingDown size={16} className="text-deadline-alert" />
            <div>
              <p className="text-xs text-text-secondary uppercase">Mínima da série</p>
              <p className="text-sm font-bold">{recorde.min.valor.toFixed(2)} {unidade} <span className="font-normal text-text-secondary">em {dataBR(recorde.min.data)}</span></p>
            </div>
          </div>
        </div>
      )}

      {/* Gráfico */}
      <div className="bg-white border border-gray-200 rounded-lg p-3">
        {serie.length === 0 ? (
          <p className="text-text-secondary text-sm italic p-6 text-center">Sem dados para essa estação/período.</p>
        ) : (
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ maxHeight: 360 }}>
            {/* grade + eixo Y */}
            {ticksY.map((v, i) => (
              <g key={i}>
                <line x1={PAD_L} x2={W - PAD_R} y1={yScale(v)} y2={yScale(v)} stroke="#F1F5F9" strokeWidth={1} />
                <text x={PAD_L - 8} y={yScale(v) + 3} textAnchor="end" fontSize={10} fill="#6B7280">{v.toFixed(unidade === '%' ? 0 : 2)}</text>
              </g>
            ))}
            {/* limiares (só nível) */}
            {limiares.map(l => (
              <g key={l.label}>
                <line x1={PAD_L} x2={W - PAD_R} y1={yScale(l.valor)} y2={yScale(l.valor)} stroke={l.cor} strokeWidth={1.2} strokeDasharray="5,4" />
                <text x={W - PAD_R} y={yScale(l.valor) - 3} textAnchor="end" fontSize={10} fill={l.cor} fontWeight="bold">{l.label}</text>
              </g>
            ))}
            {/* área + linha */}
            <path d={area} fill={corLinha} opacity={0.08} />
            <path d={linha} fill="none" stroke={corLinha} strokeWidth={1.8} />
            {/* pontos com tooltip nativo */}
            {pontos.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={2.2} fill={corLinha}>
                <title>{`${dataBR(p.data)}: ${p.valor.toFixed(2)} ${unidade}`}</title>
              </circle>
            ))}
            {/* eixo X */}
            <line x1={PAD_L} x2={W - PAD_R} y1={PAD_T + inner.h} y2={PAD_T + inner.h} stroke="#CBD5E1" strokeWidth={1} />
            {ticksX.map((p, i) => (
              <text key={i} x={p.x} y={H - 10} textAnchor={i === 0 ? 'start' : i === ticksX.length - 1 ? 'end' : 'middle'} fontSize={10} fill="#6B7280">{dataBR(p.data)}</text>
            ))}
          </svg>
        )}
      </div>
      <p className="text-[11px] text-text-secondary">
        {tipo === 'nivel' && limiares.length === 0 && 'Nenhum limiar (atenção/alerta/emergência) configurado para esta estação — configure em "Estações" para vê-los no gráfico.'}
      </p>
    </div>
  )
}
