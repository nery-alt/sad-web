import React, { useState, useEffect, useCallback } from 'react'
import { Users, Plus, Trash2, Eye, Pencil, ShieldCheck, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Perfil {
  email: string
  papel: 'admin' | 'completo' | 'leitura'
}

export const Usuarios: React.FC = () => {
  const [perfis, setPerfis] = useState<Perfil[]>([])
  const [loading, setLoading] = useState(true)
  const [novoEmail, setNovoEmail] = useState('')
  const [novoPapel, setNovoPapel] = useState<'leitura' | 'completo'>('leitura')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('perfis')
      .select('email, papel')
      .order('papel')
      .order('email')
    if (!error && data) setPerfis(data as Perfil[])
    setLoading(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const adicionar = async () => {
    const email = novoEmail.trim().toLowerCase()
    setErro('')
    if (!email || !email.includes('@')) { setErro('Informe um e-mail válido.'); return }
    setSalvando(true)
    const { error } = await supabase.from('perfis').upsert(
      { email, papel: novoPapel },
      { onConflict: 'email' }
    )
    setSalvando(false)
    if (error) { setErro('Não foi possível salvar: ' + error.message); return }
    setNovoEmail(''); setNovoPapel('leitura')
    carregar()
  }

  const mudarPapel = async (email: string, papel: 'leitura' | 'completo') => {
    const { error } = await supabase.from('perfis').update({ papel }).eq('email', email)
    if (!error) carregar()
  }

  const remover = async (email: string) => {
    if (!window.confirm(`Remover ${email} da lista de acessos?`)) return
    const { error } = await supabase.from('perfis').delete().eq('email', email)
    if (!error) carregar()
  }

  const badge = (papel: string) => {
    if (papel === 'admin')
      return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary-btn/10 text-primary-btn">ADMINISTRADOR</span>
    if (papel === 'completo')
      return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-success/10 text-success">ACESSO COMPLETO</span>
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-600">SOMENTE LEITURA</span>
  }

  return (
    <div className="p-4 flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-center mb-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users size={24} /> Usuários</h1>
          <p className="text-text-secondary text-sm">Controle quem acessa e o nível de cada um.</p>
        </div>
        <button onClick={carregar} className="flex items-center gap-2 text-text-secondary hover:text-text-main text-sm">
          <RefreshCw size={16} /> Atualizar
        </button>
      </div>

      {/* Adicionar / definir acesso */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-4 shrink-0">
        <h3 className="font-bold text-sm mb-2 flex items-center gap-2"><Plus size={16} /> Adicionar / definir acesso</h3>
        <p className="text-xs text-text-secondary mb-3">
          Primeiro crie o login da pessoa no Supabase (e-mail e senha) e entregue a ela.
          Depois informe o mesmo e-mail aqui e escolha o nível de acesso.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            placeholder="email@exemplo.com"
            className="flex-1 p-2 border border-gray-200 rounded text-sm outline-none focus:ring-2 focus:ring-primary-btn/20"
            value={novoEmail}
            onChange={e => setNovoEmail(e.target.value)}
          />
          <select
            className="p-2 border border-gray-200 rounded text-sm outline-none focus:ring-2 focus:ring-primary-btn/20"
            value={novoPapel}
            onChange={e => setNovoPapel(e.target.value as 'leitura' | 'completo')}
          >
            <option value="leitura">Somente leitura</option>
            <option value="completo">Acesso completo</option>
          </select>
          <button
            onClick={adicionar}
            disabled={salvando}
            className="px-4 py-2 bg-primary-btn text-white rounded font-bold hover:opacity-90 text-sm disabled:opacity-50"
          >
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
        {erro && <p className="text-error-expired text-xs mt-2">{erro}</p>}
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="text-text-secondary text-sm italic">Carregando...</p>
        ) : perfis.length === 0 ? (
          <p className="text-text-secondary text-sm italic">Nenhum usuário cadastrado ainda.</p>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            {perfis.map(p => (
              <div key={p.email} className="flex items-center justify-between gap-3 p-3 border-b border-gray-100 last:border-0 hover:bg-gray-50">
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate">{p.email}</p>
                  <div className="mt-1">{badge(p.papel)}</div>
                </div>
                {p.papel === 'admin' ? (
                  <span className="text-xs text-text-secondary flex items-center gap-1 shrink-0">
                    <ShieldCheck size={14} /> protegido
                  </span>
                ) : (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => mudarPapel(p.email, 'leitura')}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${p.papel === 'leitura' ? 'bg-gray-200 text-gray-700' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                    >
                      <Eye size={13} /> Leitura
                    </button>
                    <button
                      onClick={() => mudarPapel(p.email, 'completo')}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${p.papel === 'completo' ? 'bg-success text-white' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                    >
                      <Pencil size={13} /> Completo
                    </button>
                    <button
                      onClick={() => remover(p.email)}
                      className="p-1 text-error-expired hover:bg-error-expired/10 rounded"
                      title="Remover"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
