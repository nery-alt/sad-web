import React, { useState, useEffect, useCallback } from 'react'
import { Flame, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'

type Registro = { data_foco: string | null; municipio: string | null }
type Periodo = 'dia' | 'semana' | 'mes'

// Semana ISO (segunda a domingo) -> rótulo "AAAA-Sxx"
function chaveSemana(d: Date): string {
  const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dia = (dt.getUTCDay() + 6) % 7 // 0 = segunda
  dt.setUTCDate(dt.getUTCDate() - dia + 3) // quinta da semana
  const primeiraQuinta = new Date(Date.UTC(dt.getUTCFullYear(), 0, 4))
  const semana = 1 + Math.round(
    ((dt.getTime() - primeiraQuinta.getTime()) / 86400000 - 3 + ((primeiraQuinta.getUTCDay() + 6) % 7)) / 7
  )
  return `${dt.getUTCFullYear()}-S${String(semana).padStart(2, '0')}`
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export const GraficoFocos: React.FC = () => {
  const [registros, setRegistros] = useState<Registro[]>([])
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState<Periodo>('dia')

  const carregar = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('focos_historico')
      .select('data_foco, municipio')
      .order('data_foco', { ascending: true })
    setRegistros((data as Registro[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const validos = registros.filter(r => r.data_foco)
  const total = validos.length

  // Agrupa conforme o período escolhido
  const grupos = new Map<string, number>()
  for (const r of validos) {
    const d = new Date(r.data_foco + 'T12:00:00')
    let chave = ''
    let ordem = ''
    if (periodo === 'dia') {
      chave = `${String(d.getDate()).padStart(2, '0')}/${MESES[d.getMonth()]}`
      ordem = r.data_foco!
    } else if (periodo === 'semana') {
      chave = chaveSemana(d)
      ordem = chave
    } else {
      chave = `${MESES[d.getMonth()]}/${d.getFullYear()}`
      ordem = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    }
    grupos.set(ordem + '|' + chave, (grupos.get(ordem + '|' + chave) || 0) + 1)
  }

  // Ordena por data e pega os últimos (mais recentes) conforme o período
  const limite = periodo === 'dia' ? 30 : periodo === 'semana' ? 16 : 12
  const linhas = Array.from(grupos.entries())
    .map(([k, v]) => ({ ordem: k.split('|')[0], label: k.split('|')[1], valor: v }))
    .sort((a, b) => a.ordem.localeCompare(b.ordem))
    .slice(-limite)

  const maxVal = Math.max(1, ...linhas.map(l => l.valor))

  const periodoLabel = { dia: 'por dia (últimos 30)', semana: 'por semana (últimas 16)', mes: 'por mês (últimos 12)' }[periodo]

  return (
    <div className="p-4 flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-center mb-1 shrink-0 flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Flame size={24} className="text-error-expired" /> Focos de Calor — Histórico</h1>
          <p className="text-text-secondary text-sm">Contagem de focos detectados pelo INPE na região, ao longo do tempo.</p>
        </div>
        <button onClick={carregar} className="flex items-center gap-2 border border-gray-300 text-text-secondary px-3 py-2 rounded-lg text-sm hover:bg-gray-50">
          <RefreshCw size={15} /> Atualizar
        </button>
      </div>

      {/* Resumo + seletor de período */}
      <div className="flex items-center justify-between flex-wrap gap-3 my-3 shrink-0">
        <div className="flex gap-4">
          <div className="bg-white border border-gray-200 rounded-lg px-4 py-2">
            <div className="text-2xl font-bold text-error-expired">{total}</div>
            <div className="text-xs text-text-secondary uppercase">focos registrados</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg px-4 py-2">
            <div className="text-2xl font-bold">{linhas.length}</div>
            <div className="text-xs text-text-secondary uppercase">{periodo === 'dia' ? 'dias' : periodo === 'semana' ? 'semanas' : 'meses'} com foco</div>
          </div>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(['dia', 'semana', 'mes'] as Periodo[]).map(p => (
            <button key={p} onClick={() => setPeriodo(p)}
              className={`px-3 py-1.5 rounded text-sm font-bold ${periodo === p ? 'bg-white shadow text-text-main' : 'text-text-secondary'}`}>
              {p === 'dia' ? 'Dia' : p === 'semana' ? 'Semana' : 'Mês'}
            </button>
          ))}
        </div>
      </div>

      {/* Gráfico de barras */}
      <div className="flex-1 overflow-y-auto bg-white border border-gray-200 rounded-lg p-4">
        <p className="text-xs text-text-secondary uppercase font-bold mb-3">Focos {periodoLabel}</p>
        {loading ? (
          <p className="text-text-secondary text-sm italic">Carregando…</p>
        ) : linhas.length === 0 ? (
          <p className="text-text-secondary text-sm italic">
            Ainda não há focos gravados. Abra o Mapa de Ocorrências e ligue "🔥 Focos INPE" — a partir daí o histórico começa a ser registrado.
          </p>
        ) : (
          <div className="space-y-1.5">
            {linhas.map(l => (
              <div key={l.ordem} className="flex items-center gap-2">
                <div className="w-20 text-xs text-text-secondary text-right shrink-0">{l.label}</div>
                <div className="flex-1 bg-gray-100 rounded h-6 relative overflow-hidden">
                  <div className="h-full rounded bg-error-expired/80 flex items-center justify-end pr-2"
                    style={{ width: `${Math.max(6, (l.valor / maxVal) * 100)}%` }}>
                    <span className="text-xs font-bold text-white">{l.valor}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-text-secondary mt-2 shrink-0">
        O histórico é gravado quando você abre o mapa e liga os focos. Dados de detecção por satélite (INPE) — podem ser subestimados em dias nublados.
      </p>
    </div>
  )
}
