import React, { useState, useEffect, useCallback } from 'react'
import { Users, Plus, Trash2, Eye, Pencil, ShieldCheck, Shield, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'

type Papel = 'admin' | 'administrador' | 'completo' | 'leitura'
type PapelEscolha = Exclude<Papel, 'admin'>

interface Perfil { email: string; papel: Papel }
interface Setor { id: number; nome: string }
interface Membro { email: string; setor_id: number; principal: boolean }

const ROTULO: Record<PapelEscolha, string> = {
  leitura: 'Somente leitura', completo: 'Acesso completo', administrador: 'Administrador',
}

export const Usuarios: React.FC = () => {
  const [perfis, setPerfis] = useState<Perfil[]>([])
  const [setores, setSetores] = useState<Setor[]>([])
  const [membros, setMembros] = useState<Membro[]>([])
  const [loading, setLoading] = useState(true)
  const [novoEmail, setNovoEmail] = useState('')
  const [novoPapel, setNovoPapel] = useState<PapelEscolha>('leitura')
  const [novoSetor, setNovoSetor] = useState('')
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [salvando, setSalvando] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    const [p, s, m] = await Promise.all([
      supabase.from('perfis').select('email, papel').order('papel').order('email'),
      supabase.from('setores').select('id, nome').eq('ativo', true).order('nome'),
      supabase.from('membros_setor').select('email, setor_id, principal'),
    ])
    if (!p.error && p.data) setPerfis(p.data as Perfil[])
    if (!s.error && s.data) setSetores(s.data as Setor[])
    if (!m.error && m.data) setMembros(m.data as Membro[])
    setLoading(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const setorDe = (email: string) => membros.find(m => m.email === email.toLowerCase() && m.principal)?.setor_id

  // Administrador (não geral) vê todos os setores; os outros níveis zeram esse poder.
  const dadosDoPapel = (papel: PapelEscolha) => ({ papel, poder_ver_tudo: papel === 'administrador' })

  const salvarSetor = async (email: string, setorId: string) => {
    const e = email.toLowerCase()
    const atual = membros.find(m => m.email === e && m.principal)
    if (!setorId) {
      return supabase.from('membros_setor').delete().eq('email', e)
    }
    if (atual) return supabase.from('membros_setor').update({ setor_id: Number(setorId) }).eq('email', e).eq('principal', true)
    return supabase.from('membros_setor').insert({ email: e, setor_id: Number(setorId), principal: true })
  }

  const adicionar = async () => {
    const email = novoEmail.trim().toLowerCase()
    setErro(''); setAviso('')
    if (!email || !email.includes('@')) { setErro('Informe um e-mail válido.'); return }
    if (perfis.some(p => p.email.toLowerCase() === email && p.papel === 'admin')) {
      setErro('Este é um Administrador Geral: o acesso dele não se altera por aqui.'); return
    }
    setSalvando(true)
    const { error } = await supabase.from('perfis').upsert(
      { email, ...dadosDoPapel(novoPapel) },
      { onConflict: 'email' }
    )
    if (error) { setSalvando(false); setErro('Não foi possível salvar: ' + error.message); return }
    if (novoSetor) {
      const r = await salvarSetor(email, novoSetor)
      if (r.error) setErro('Acesso salvo, mas o setor não: ' + r.error.message)
    }
    setSalvando(false)
    setNovoEmail(''); setNovoPapel('leitura'); setNovoSetor('')
    carregar()
  }

  const mudarPapel = async (p: Perfil, papel: PapelEscolha) => {
    if (p.papel === papel) return
    setErro(''); setAviso('')
    if (papel === 'administrador' &&
      !window.confirm(`Tornar ${p.email} Administrador?\n\nEle passará a ver todos os setores. Só você poderá tirar esse acesso depois.`)) return
    const { error } = await supabase.from('perfis').update(dadosDoPapel(papel)).eq('email', p.email)
    if (error) { setErro('Não foi possível alterar: ' + error.message); return }
    setAviso(`${p.email}: agora ${ROTULO[papel].toLowerCase()}. A pessoa vê a mudança ao entrar de novo ou atualizar a página.`)
    carregar()
  }

  const mudarSetor = async (email: string, setorId: string) => {
    setErro(''); setAviso('')
    const r = await salvarSetor(email, setorId)
    if (r.error) { setErro('Não foi possível trocar o setor: ' + r.error.message); return }
    setAviso(`${email}: setor atualizado. Os registros já feitos continuam no setor onde foram criados. A pessoa vê a mudança ao entrar de novo.`)
    carregar()
  }

  const remover = async (email: string) => {
    if (!window.confirm(`Remover ${email} da lista de acessos?`)) return
    setErro(''); setAviso('')
    const { error } = await supabase.from('perfis').delete().eq('email', email)
    if (error) { setErro('Não foi possível remover: ' + error.message); return }
    await supabase.from('membros_setor').delete().eq('email', email.toLowerCase())
    carregar()
  }

  const badge = (papel: string) => {
    if (papel === 'admin')
      return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary-btn/10 text-primary-btn">ADMINISTRADOR GERAL</span>
    if (papel === 'administrador')
      return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary-btn/10 text-primary-btn">ADMINISTRADOR</span>
    if (papel === 'completo')
      return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-success/10 text-success">ACESSO COMPLETO</span>
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-600">SOMENTE LEITURA</span>
  }

  const seletorSetor = (email: string) => (
    <select
      aria-label={`Setor de ${email}`}
      className="p-1 border border-gray-200 rounded text-xs outline-none focus:ring-2 focus:ring-primary-btn/20 bg-white"
      value={setorDe(email) ?? ''}
      onChange={e => mudarSetor(email, e.target.value)}
    >
      <option value="">Sem setor</option>
      {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
    </select>
  )

  const botaoPapel = (p: Perfil, papel: PapelEscolha, icone: React.ReactNode, texto: string, ativoCls: string) => (
    <button
      onClick={() => mudarPapel(p, papel)}
      className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${p.papel === papel ? ativoCls : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
    >
      {icone} {texto}
    </button>
  )

  return (
    <div className="p-4 flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-center mb-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users size={24} /> Usuários</h1>
          <p className="text-text-secondary text-sm">Controle quem acessa, o nível e o setor de cada um.</p>
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
          Depois informe o mesmo e-mail aqui e escolha o nível de acesso e o setor.
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
            onChange={e => setNovoPapel(e.target.value as PapelEscolha)}
          >
            <option value="leitura">Somente leitura</option>
            <option value="completo">Acesso completo</option>
            <option value="administrador">Administrador</option>
          </select>
          <select
            className="p-2 border border-gray-200 rounded text-sm outline-none focus:ring-2 focus:ring-primary-btn/20"
            value={novoSetor}
            onChange={e => setNovoSetor(e.target.value)}
          >
            <option value="">Sem setor</option>
            {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
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
        {aviso && <p className="text-success text-xs mt-2">{aviso}</p>}
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
              <div key={p.email} className="flex items-center justify-between gap-3 p-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 flex-wrap">
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate">{p.email}</p>
                  <div className="mt-1 flex items-center gap-2 flex-wrap">{badge(p.papel)} {seletorSetor(p.email)}</div>
                </div>
                {p.papel === 'admin' ? (
                  <span className="text-xs text-text-secondary flex items-center gap-1 shrink-0">
                    <ShieldCheck size={14} /> protegido
                  </span>
                ) : (
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {botaoPapel(p, 'leitura', <Eye size={13} />, 'Leitura', 'bg-gray-200 text-gray-700')}
                    {botaoPapel(p, 'completo', <Pencil size={13} />, 'Completo', 'bg-success text-white')}
                    {botaoPapel(p, 'administrador', <Shield size={13} />, 'Administrador', 'bg-primary-btn text-white')}
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
