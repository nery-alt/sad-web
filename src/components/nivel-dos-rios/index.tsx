import React, { useState, useEffect, useCallback } from 'react'
import { Waves, LayoutDashboard, Radio, ListPlus, LineChart, Printer, Route } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Estacao, RegistroNivel, RegistroChuva, RegistroUmidade, RegistroClima } from './types'
import { Painel } from './Painel'
import { Corredor } from './Corredor'
import { Previsao } from './Previsao'
import { Estacoes } from './Estacoes'
import { Registros } from './Registros'
import { Historico } from './Historico'
import { Boletim } from './Boletim'

type Aba = 'painel' | 'corredor' | 'estacoes' | 'registros' | 'historico' | 'boletim'

export const NivelDosRios: React.FC = () => {
  const [aba, setAba] = useState<Aba>('painel')
  const [estacoes, setEstacoes] = useState<Estacao[]>([])
  const [registrosNivel, setRegistrosNivel] = useState<RegistroNivel[]>([])
  const [registrosChuva, setRegistrosChuva] = useState<RegistroChuva[]>([])
  const [registrosUmidade, setRegistrosUmidade] = useState<RegistroUmidade[]>([])
  const [registrosClima, setRegistrosClima] = useState<RegistroClima[]>([])
  const [focosPorMun, setFocosPorMun] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  // O PostgREST costuma limitar a 1000 linhas por página — o histórico ANA sozinho tem
  // 7710 linhas, então paginamos com .range() até esgotar, em vez de confiar num único select.
  const carregarPaginado = async <T,>(tabela: string): Promise<T[]> => {
    const pagina = 1000
    let de = 0
    let tudo: T[] = []
    for (;;) {
      const { data, error } = await supabase.from(tabela).select('*').order('data', { ascending: true }).range(de, de + pagina - 1)
      if (error || !data) break
      tudo = tudo.concat(data as T[])
      if (data.length < pagina) break
      de += pagina
    }
    return tudo
  }

  const carregar = useCallback(async () => {
    setLoading(true)
    const d30 = new Date(); d30.setDate(d30.getDate() - 30)
    const d30s = d30.toISOString().slice(0, 10)
    const [est, niv, chuva, umid, clima, focosRows] = await Promise.all([
      supabase.from('estacoes_monitoramento').select('*').order('nome', { ascending: true }).then(r => r.data as Estacao[] | null),
      carregarPaginado<RegistroNivel>('v_registros_nivel_situacao'),
      carregarPaginado<RegistroChuva>('registros_chuva'),
      carregarPaginado<RegistroUmidade>('registros_umidade'),
      carregarPaginado<RegistroClima>('v_clima_situacao'),
      supabase.from('focos_historico').select('municipio').gte('data_foco', d30s).then(r => (r.data as { municipio: string | null }[] | null) ?? []),
    ])
    // Contagem de focos por município (últimos 30 dias) — para o boletim por município.
    const mapaFocos: Record<string, number> = {}
    for (const f of focosRows) { const m = (f.municipio || '').toUpperCase().trim(); if (m) mapaFocos[m] = (mapaFocos[m] || 0) + 1 }
    if (est) setEstacoes(est)
    setRegistrosNivel(niv)
    setRegistrosChuva(chuva)
    setRegistrosUmidade(umid)
    setRegistrosClima(clima)
    setFocosPorMun(mapaFocos)
    setLoading(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const abas: { id: Aba; label: string; icon: React.ReactNode }[] = [
    { id: 'painel', label: 'Painel', icon: <LayoutDashboard size={15} /> },
    { id: 'corredor', label: 'Corredor', icon: <Route size={15} /> },
    { id: 'estacoes', label: 'Estações', icon: <Radio size={15} /> },
    { id: 'registros', label: 'Registros', icon: <ListPlus size={15} /> },
    { id: 'historico', label: 'Histórico', icon: <LineChart size={15} /> },
    { id: 'boletim', label: 'Gerar Boletim', icon: <Printer size={15} /> },
  ]

  return (
    <div className="p-4 flex flex-col h-full overflow-hidden">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center mb-3 shrink-0 flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Waves size={24} /> Nível dos Rios</h1>
          <p className="text-text-secondary text-sm">Monitoramento de cota, chuva e umidade — estações do município.</p>
        </div>
      </div>

      {/* Sub-navegação */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-3 shrink-0 w-fit flex-wrap">
        {abas.map(a => (
          <button key={a.id} onClick={() => setAba(a.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-bold ${aba === a.id ? 'bg-white shadow text-text-main' : 'text-text-secondary'}`}>
            {a.icon} {a.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        {loading ? (
          <p className="text-text-secondary text-sm italic p-4">Carregando...</p>
        ) : aba === 'painel' ? (
          <Painel estacoes={estacoes} registrosNivel={registrosNivel} registrosChuva={registrosChuva} registrosUmidade={registrosUmidade} registrosClima={registrosClima} irPara={setAba} />
        ) : aba === 'corredor' ? (
          <div className="h-full overflow-y-auto space-y-4">
            <Previsao estacoes={estacoes} registrosNivel={registrosNivel} />
            <Corredor estacoes={estacoes} registrosNivel={registrosNivel} />
          </div>
        ) : aba === 'estacoes' ? (
          <Estacoes estacoes={estacoes} recarregar={carregar} />
        ) : aba === 'registros' ? (
          <Registros estacoes={estacoes} registrosNivel={registrosNivel} registrosChuva={registrosChuva} registrosUmidade={registrosUmidade} recarregar={carregar} />
        ) : aba === 'historico' ? (
          <Historico estacoes={estacoes} registrosNivel={registrosNivel} registrosChuva={registrosChuva} registrosUmidade={registrosUmidade} />
        ) : (
          <Boletim estacoes={estacoes} registrosNivel={registrosNivel} registrosChuva={registrosChuva} registrosUmidade={registrosUmidade} registrosClima={registrosClima} focosPorMun={focosPorMun} />
        )}
      </div>
    </div>
  )
}

export default NivelDosRios
