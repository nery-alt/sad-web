import React from 'react'
import { TrendingUp, TrendingDown, Minus, Clock, Info } from 'lucide-react'
import type { Estacao, RegistroNivel } from './types'

interface Props {
  estacoes: Estacao[]
  registrosNivel: RegistroNivel[]
}

const CODIGO_TEFE = '12900001'

function distKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const R = 6371, rad = (d: number) => d * Math.PI / 180
  const dLat = rad(bLat - aLat), dLon = rad(bLon - aLon)
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

function serieDiaria(registros: RegistroNivel[], id: string): Map<string, number> {
  const m = new Map<string, number>()
  for (const r of registros) if (r.estacao_id === id) m.set(r.data, r.cota_cm)
  return m
}

function pearson(x: number[], y: number[]): number {
  const n = x.length
  if (n < 3) return 0
  const mx = x.reduce((a, b) => a + b, 0) / n, my = y.reduce((a, b) => a + b, 0) / n
  let num = 0, dx = 0, dy = 0
  for (let i = 0; i < n; i++) { const a = x[i] - mx, b = y[i] - my; num += a * b; dx += a * a; dy += b * b }
  const den = Math.sqrt(dx * dy)
  return den === 0 ? 0 : num / den
}

// Estima o atraso (dias) com que a variação de 'montante' aparece em Tefé.
// Trabalha sobre as VARIAÇÕES diárias (remove a tendência), em datas comuns.
function estimarLag(mont: Map<string, number>, tefe: Map<string, number>) {
  const datas = [...tefe.keys()].filter(d => mont.has(d)).sort()
  if (datas.length < 12) return { lag: null as number | null, corr: 0, n: datas.length }
  const dMont: number[] = [], dTefe: number[] = []
  for (let i = 1; i < datas.length; i++) {
    dMont.push(mont.get(datas[i])! - mont.get(datas[i - 1])!)
    dTefe.push(tefe.get(datas[i])! - tefe.get(datas[i - 1])!)
  }
  let melhor = { lag: 0, corr: -2 }
  const maxLag = Math.min(14, Math.floor(dMont.length / 2))
  for (let L = 0; L <= maxLag; L++) {
    const a = dMont.slice(0, dMont.length - L)      // montante em t-L
    const b = dTefe.slice(L)                          // Tefé em t
    const c = pearson(a, b)
    if (c > melhor.corr) melhor = { lag: L, corr: c }
  }
  return { lag: melhor.lag, corr: melhor.corr, n: datas.length }
}

// Tendência recente: cm/dia nos últimos dias disponíveis.
function tendencia(m: Map<string, number>) {
  const datas = [...m.keys()].sort()
  if (datas.length < 2) return { cmDia: 0, dir: 'estavel' as 'subindo' | 'baixando' | 'estavel' }
  const jan = datas.slice(-4)
  const ini = m.get(jan[0])!, fim = m.get(jan[jan.length - 1])!
  const dias = jan.length - 1
  const cmDia = Math.round((fim - ini) / dias)
  return { cmDia, dir: cmDia > 1 ? 'subindo' : cmDia < -1 ? 'baixando' : 'estavel' as any }
}

export const Previsao: React.FC<Props> = ({ estacoes, registrosNivel }) => {
  const tefe = estacoes.find(e => e.codigo_ana === CODIGO_TEFE) || estacoes.find(e => /tef[eé]/i.test(e.nome) && e.ativa)
  if (!tefe) return <p className="text-text-secondary text-sm italic">Estação de Tefé não encontrada.</p>

  const serieTefe = serieDiaria(registrosNivel, tefe.id)
  // Estações a montante de Tefé (oeste = longitude menor), ativas, com dado.
  const montante = estacoes
    .filter(e => e.ativa && e.lng != null && (e.lng as number) < (tefe.lng as number) && e.id !== tefe.id)
    .map(e => {
      const s = serieDiaria(registrosNivel, e.id)
      const { lag, corr, n } = estimarLag(s, serieTefe)
      const t = tendencia(s)
      const km = (e.lat != null && e.lng != null && tefe.lat != null && tefe.lng != null)
        ? Math.round(distKm(e.lat, e.lng, tefe.lat, tefe.lng)) : null
      const confiavel = lag != null && lag >= 1 && corr >= 0.5 && n >= 16
      return { est: e, lag, corr, n, km, tend: t, confiavel }
    })
    .sort((a, b) => (a.km ?? 1e9) - (b.km ?? 1e9))

  const nome = (n: string) => n.replace(' (ANA telemétrica)', '').replace(' (ANA)', '')

  // Manchete: estação confiável mais próxima que esteja com tendência clara.
  const gatilho = montante.find(m => m.confiavel && m.tend.dir !== 'estavel')

  return (
    <div className="space-y-3">
      <div className="bg-primary-btn/5 border border-primary-btn/20 rounded-lg p-3">
        <p className="font-bold text-text-main flex items-center gap-1.5"><Clock size={16} /> Previsão para Tefé</p>
        {gatilho ? (
          <p className="text-sm text-text-secondary mt-1">
            <b>{nome(gatilho.est.nome)}</b>, a montante ({gatilho.km} km), está{' '}
            <b className={gatilho.tend.dir === 'subindo' ? 'text-primary-btn' : 'text-deadline-alert'}>
              {gatilho.tend.dir === 'subindo' ? 'subindo' : 'baixando'} {Math.abs(gatilho.tend.cmDia)} cm/dia
            </b>. Pelo histórico, esse movimento costuma refletir em Tefé em <b>~{gatilho.lag} dia(s)</b>.
          </p>
        ) : (
          <p className="text-sm text-text-secondary mt-1">
            Ainda coletando histórico para uma estimativa confiável. A previsão de dias fica mais precisa nas próximas
            semanas, conforme os robôs acumulam leituras diárias.
          </p>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase text-text-secondary bg-gray-50">
              <th className="text-left p-2">Estação (montante)</th>
              <th className="text-right p-2">Distância</th>
              <th className="text-center p-2">Tendência</th>
              <th className="text-right p-2">Chega em Tefé</th>
            </tr>
          </thead>
          <tbody>
            {montante.map(m => (
              <tr key={m.est.id} className="border-t border-gray-100">
                <td className="p-2 font-medium">{nome(m.est.nome)}</td>
                <td className="p-2 text-right text-text-secondary">{m.km != null ? `${m.km} km` : '—'}</td>
                <td className="p-2 text-center">
                  <span className={`inline-flex items-center gap-1 font-bold ${m.tend.dir === 'subindo' ? 'text-primary-btn' : m.tend.dir === 'baixando' ? 'text-deadline-alert' : 'text-text-secondary'}`}>
                    {m.tend.dir === 'subindo' ? <TrendingUp size={14} /> : m.tend.dir === 'baixando' ? <TrendingDown size={14} /> : <Minus size={14} />}
                    {Math.abs(m.tend.cmDia)} cm/d
                  </span>
                </td>
                <td className="p-2 text-right font-bold">
                  {m.confiavel ? `~${m.lag} dia(s)` : <span className="text-text-secondary font-normal text-xs">coletando…</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-text-secondary flex items-start gap-1">
        <Info size={13} className="shrink-0 mt-0.5" />
        Estimativa baseada na correlação das variações diárias entre as estações — é um indicador de apoio, não uma
        previsão oficial. Fica mais precisa conforme o histórico cresce. "coletando…" = ainda sem dados suficientes para
        aquela estação.
      </p>
    </div>
  )
}
