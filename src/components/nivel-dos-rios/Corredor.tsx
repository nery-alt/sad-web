import React from 'react'
import { ArrowDown, ArrowUp, Minus, Radio } from 'lucide-react'
import type { Estacao, RegistroNivel } from './types'
import { dataBR } from './types'

interface Props {
  estacoes: Estacao[]
  registrosNivel: RegistroNivel[]
}

// Mini gráfico dos últimos dias (normalizado por estação, pois cada régua tem escala própria).
function Sparkline({ valores }: { valores: number[] }) {
  if (valores.length < 2) return null
  const w = 110, h = 28, pad = 2
  const min = Math.min(...valores), max = Math.max(...valores)
  const rng = max - min || 1
  const pts = valores.map((v, i) => {
    const x = pad + (i / (valores.length - 1)) * (w - 2 * pad)
    const y = pad + (1 - (v - min) / rng) * (h - 2 * pad)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  const subindo = valores[valores.length - 1] >= valores[0]
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-[110px] h-7 shrink-0">
      <polyline points={pts} fill="none" stroke={subindo ? '#1A56DB' : '#D97706'} strokeWidth={1.6} />
    </svg>
  )
}

export const Corredor: React.FC<Props> = ({ estacoes, registrosNivel }) => {
  // Estações do corredor: ativas, com coordenada, ordenadas de montante (oeste) a jusante (leste).
  const corredor = estacoes
    .filter(e => e.ativa && e.lng != null)
    .sort((a, b) => (a.lng as number) - (b.lng as number))

  const dadosDe = (id: string) => {
    const lista = registrosNivel.filter(r => r.estacao_id === id).sort((a, b) => a.data.localeCompare(b.data))
    const ultimo = lista[lista.length - 1]
    const anterior = lista[lista.length - 2]
    const variacao = ultimo && anterior ? ultimo.cota_cm - anterior.cota_cm : null
    const serie = lista.slice(-12).map(r => r.cota_cm)
    return { ultimo, variacao, serie }
  }

  const comDados = corredor.filter(e => dadosDe(e.id).ultimo)

  return (
    <div className="h-full overflow-y-auto">
      <div className="bg-primary-btn/5 border border-primary-btn/20 rounded-lg p-3 mb-4 text-sm">
        <p className="font-bold text-text-main">Corredor do Solimões — da fronteira até Manaus</p>
        <p className="text-text-secondary text-xs mt-0.5">
          As estações estão em ordem de <b>montante → jusante</b> (rio acima para rio abaixo). A água que sobe lá em cima
          chega às cidades de baixo alguns dias depois. Compare a <b>tendência</b> (seta), não o valor absoluto — cada
          régua tem seu próprio zero, então os metros não são comparáveis entre estações.
        </p>
      </div>

      {comDados.length === 0 ? (
        <p className="text-text-secondary text-sm italic">Sem estações com dado no corredor.</p>
      ) : (
        <div className="relative">
          {comDados.map((e, i) => {
            const { ultimo, variacao, serie } = dadosDe(e.id)
            const subindo = variacao != null && variacao > 0
            const baixando = variacao != null && variacao < 0
            const ehTefe = /tef[eé]/i.test(e.nome)
            return (
              <div key={e.id} className="flex items-stretch gap-3">
                {/* trilho + nó */}
                <div className="flex flex-col items-center w-5 shrink-0">
                  <div className={`w-3 h-3 rounded-full ${ehTefe ? 'bg-active-highlight ring-2 ring-active-highlight/30' : 'bg-primary-btn'} z-10 mt-4`} />
                  {i < comDados.length - 1 && <div className="w-0.5 flex-1 bg-gray-200" />}
                </div>

                {/* card da estação */}
                <div className={`flex-1 mb-2 rounded-lg border p-3 flex items-center gap-3 flex-wrap ${ehTefe ? 'border-active-highlight/40 bg-active-highlight/5' : 'border-gray-200 bg-white'}`}>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm flex items-center gap-1.5">
                      <Radio size={13} className="shrink-0" /> {e.nome.replace(' (ANA telemétrica)', '').replace(' (ANA)', '')}
                      {ehTefe && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-active-highlight text-white">VOCÊ</span>}
                    </p>
                    <p className="text-xs text-text-secondary">{e.localidade}</p>
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-bold leading-tight">{(ultimo.cota_cm / 100).toFixed(2)}<span className="text-xs font-normal text-text-secondary"> m</span></p>
                    <p className="text-[11px] text-text-secondary">{dataBR(ultimo.data)}</p>
                  </div>

                  <div className={`flex items-center gap-1 text-sm font-bold w-20 justify-end ${subindo ? 'text-primary-btn' : baixando ? 'text-deadline-alert' : 'text-text-secondary'}`}>
                    {subindo ? <ArrowUp size={15} /> : baixando ? <ArrowDown size={15} /> : <Minus size={15} />}
                    {variacao != null ? `${Math.abs(variacao)} cm` : '—'}
                  </div>

                  <Sparkline valores={serie} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      <p className="text-[11px] text-text-secondary mt-3">
        Setas: <span className="text-primary-btn font-bold">azul ↑</span> rio subindo (enchente a caminho) ·
        <span className="text-deadline-alert font-bold"> laranja ↓</span> rio baixando (estiagem). Variação = diferença para a leitura anterior.
        Fonte: telemetria ANA, atualizada diariamente.
      </p>
    </div>
  )
}
