import React, { useState, useEffect, useCallback } from 'react'
import { Waves, LayoutDashboard, Radio, ListPlus, LineChart, Printer } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Estacao, RegistroNivel, RegistroChuva, RegistroUmidade } from './types'
import { Painel } from './Painel'
import { Estacoes } from './Estacoes'
import { Registros } from './Registros'
import { Historico } from './Historico'
import { Boletim } from './Boletim'

type Aba = 'painel' | 'estacoes' | 'registros' | 'historico' | 'boletim'

export const NivelDosRios: React.FC = () => {
  const [aba, setAba] = useState<Aba>('painel')
  const [estacoes, setEstacoes] = useState<Estacao[]>([])
  const [registrosNivel, setRegistrosNivel] = useState<RegistroNivel[]>([])
  const [registrosChuva, setRegistrosChuva] = useState<RegistroChuva[]>([])
  const [registrosUmidade, setRegistrosUmidade] = useState<RegistroUmidade[]>([])
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
    const [est, niv, chuva, umid] = await Promise.all([
      supabase.from('estacoes_monitoramento').select('*').order('nome', { ascending: true }).then(r => r.data as Estacao[] | null),
      carregarPaginado<RegistroNivel>('v_registros_nivel_situacao'),
      carregarPaginado<RegistroChuva>('registros_chuva'),
      carregarPaginado<RegistroUmidade>('registros_umidade'),
    ])
    if (est) setEstacoes(est)
    setRegistrosNivel(niv)
    setRegistrosChuva(chuva)
    setRegistrosUmidade(umid)
    setLoading(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const abas: { id: Aba; label: string; icon: React.ReactNode }[] = [
    { id: 'painel', label: 'Painel', icon: <LayoutDashboard size={15} /> },
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
          <Painel estacoes={estacoes} registrosNivel={registrosNivel} registrosChuva={registrosChuva} registrosUmidade={registrosUmidade} irPara={setAba} />
        ) : aba === 'estacoes' ? (
          <Estacoes estacoes={estacoes} recarregar={carregar} />
        ) : aba === 'registros' ? (
          <Registros estacoes={estacoes} registrosNivel={registrosNivel} registrosChuva={registrosChuva} registrosUmidade={registrosUmidade} recarregar={carregar} />
        ) : aba === 'historico' ? (
          <Historico estacoes={estacoes} registrosNivel={registrosNivel} registrosChuva={registrosChuva} registrosUmidade={registrosUmidade} />
        ) : (
          <Boletim estacoes={estacoes} registrosNivel={registrosNivel} registrosChuva={registrosChuva} registrosUmidade={registrosUmidade} />
        )}
      </div>
    </div>
  )
}

export default NivelDosRios
