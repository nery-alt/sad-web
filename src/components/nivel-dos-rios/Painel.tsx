import React from 'react'
import { Radio, TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight, CloudRain, Droplets, AlertTriangle } from 'lucide-react'
import type { Estacao, RegistroNivel, RegistroChuva, RegistroUmidade, Situacao } from './types'
import { SITUACAO_LABEL, SITUACAO_COR, TENDENCIA_LABEL, dataBR } from './types'

interface Props {
  estacoes: Estacao[]
  registrosNivel: RegistroNivel[]
  registrosChuva: RegistroChuva[]
  registrosUmidade: RegistroUmidade[]
  irPara: (aba: 'estacoes' | 'registros' | 'historico' | 'boletim' | 'painel') => void
}

export const Painel: React.FC<Props> = ({ estacoes, registrosNivel, registrosChuva, registrosUmidade, irPara }) => {
  const ativas = estacoes.filter(e => e.ativa)

  const doisMaisRecentes = (estacaoId: string) => {
    const lista = registrosNivel.filter(r => r.estacao_id === estacaoId)
    // registrosNivel vem ordenado por data ascendente
    return [lista[lista.length - 1], lista[lista.length - 2]]
  }

  const chuvaRecente = (estacaoId: string) => {
    const lista = registrosChuva.filter(r => r.estacao_id === estacaoId)
    return lista[lista.length - 1]
  }
  const umidadeRecente = (estacaoId: string) => {
    const lista = registrosUmidade.filter(r => r.estacao_id === estacaoId)
    return lista[lista.length - 1]
  }

  const situacoesCriticas = estacoes.reduce((acc, e) => {
    const [ultimo] = doisMaisRecentes(e.id)
    if (ultimo?.situacao && ultimo.situacao !== 'normal') acc.push({ estacao: e, registro: ultimo })
    return acc
  }, [] as { estacao: Estacao; registro: RegistroNivel }[])

  return (
    <div className="h-full overflow-y-auto space-y-4">
      {situacoesCriticas.length > 0 && (
        <div className="bg-error-expired/5 border border-error-expired/30 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle size={18} className="text-error-expired shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold text-error-expired">Situações fora do normal</p>
            <p className="text-text-secondary">
              {situacoesCriticas.map(s => `${s.estacao.nome} (${SITUACAO_LABEL[s.registro.situacao as Situacao]})`).join(' · ')}
            </p>
          </div>
        </div>
      )}

      {ativas.length === 0 ? (
        <p className="text-text-secondary text-sm italic">
          Nenhuma estação ativa cadastrada. <button onClick={() => irPara('estacoes')} className="text-primary-btn hover:underline font-medium">Cadastre uma estação</button> para começar.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {ativas.map(e => {
            const [ultimo, anterior] = doisMaisRecentes(e.id)
            const chuva = chuvaRecente(e.id)
            const umid = umidadeRecente(e.id)
            const variacao = ultimo && anterior ? ultimo.cota_cm - anterior.cota_cm : null
            const situacao = (ultimo?.situacao || null) as Situacao | null
            const cor = situacao ? SITUACAO_COR[situacao] : null
            const semLimiar = e.cota_atencao_cm == null || e.cota_alerta_cm == null || e.cota_emergencia_cm == null

            return (
              <div key={e.id} className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col gap-2">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-sm flex items-center gap-1.5"><Radio size={14} className="shrink-0" /> {e.nome}</p>
                    <p className="text-xs text-text-secondary truncate">{e.rio} · {e.localidade}</p>
                  </div>
                  {situacao && cor && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${cor.bg} ${cor.text}`}>{SITUACAO_LABEL[situacao].toUpperCase()}</span>
                  )}
                </div>

                {!ultimo ? (
                  <p className="text-text-secondary text-xs italic">Sem leituras registradas ainda.</p>
                ) : (
                  <>
                    <div className="flex items-end gap-3">
                      <div>
                        <p className="text-2xl font-bold">{(ultimo.cota_cm / 100).toFixed(2)}<span className="text-sm font-normal text-text-secondary"> m</span></p>
                        <p className="text-xs text-text-secondary">em {dataBR(ultimo.data)} · fonte {ultimo.fonte}</p>
                      </div>
                      {variacao !== null && (
                        <div className={`flex items-center gap-1 text-xs font-bold pb-1 ${variacao > 0 ? 'text-primary-btn' : variacao < 0 ? 'text-deadline-alert' : 'text-text-secondary'}`}>
                          {variacao > 0 ? <ArrowUpRight size={14} /> : variacao < 0 ? <ArrowDownRight size={14} /> : <Minus size={14} />}
                          {Math.abs(variacao)} cm
                        </div>
                      )}
                    </div>
                    {ultimo.situacao_tendencia && (
                      <p className="text-xs text-text-secondary flex items-center gap-1">
                        {ultimo.situacao_tendencia === 'enchendo' || ultimo.situacao_tendencia === 'cheia'
                          ? <TrendingUp size={13} className="text-primary-btn" />
                          : ultimo.situacao_tendencia === 'vazante' || ultimo.situacao_tendencia === 'estiagem'
                          ? <TrendingDown size={13} className="text-deadline-alert" />
                          : <Minus size={13} />}
                        Tendência: {TENDENCIA_LABEL[ultimo.situacao_tendencia]}
                      </p>
                    )}
                  </>
                )}

                {(chuva || umid) && (
                  <div className="flex gap-3 text-xs text-text-secondary border-t border-gray-100 pt-2 mt-1">
                    {chuva && <span className="flex items-center gap-1"><CloudRain size={13} /> {chuva.chuva_mm} mm ({dataBR(chuva.data)})</span>}
                    {umid && <span className="flex items-center gap-1"><Droplets size={13} /> {umid.umidade_pct}% ({dataBR(umid.data)})</span>}
                  </div>
                )}

                {semLimiar && (
                  <p className="text-[11px] text-deadline-alert italic">Sem limiares de atenção/alerta/emergência configurados.</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
