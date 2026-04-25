import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Shield, Mail, Lock, User, Eye, EyeOff, ArrowLeft } from 'lucide-react'

type Mode = 'login' | 'cadastro' | 'esqueci'

export const Login: React.FC = () => {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [nome, setNome] = useState('')
  const [showSenha, setShowSenha] = useState(false)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'erro' | 'ok'; texto: string } | null>(null)

  const resetMsg = () => setMsg(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); resetMsg()
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) setMsg({ tipo: 'erro', texto: 'Email ou senha incorretos.' })
    setLoading(false)
  }

  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); resetMsg()
    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { data: { nome_completo: nome } }
    })
    if (error) {
      setMsg({ tipo: 'erro', texto: error.message.includes('already') ? 'Este email já está cadastrado.' : 'Erro ao cadastrar. Verifique os dados.' })
    } else {
      setMsg({ tipo: 'ok', texto: 'Cadastro realizado! Verifique seu email para confirmar a conta.' })
    }
    setLoading(false)
  }

  const handleEsqueci = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); resetMsg()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    if (error) {
      setMsg({ tipo: 'erro', texto: 'Erro ao enviar email. Verifique o endereço.' })
    } else {
      setMsg({ tipo: 'ok', texto: 'Email de redefinição enviado! Verifique sua caixa de entrada.' })
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500 rounded-2xl shadow-lg mb-4">
            <Shield size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">SAD</h1>
          <p className="text-slate-400 text-sm mt-1">Solução Administrativa Digital</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header do card */}
          <div className="bg-slate-50 px-6 py-4 border-b border-gray-100">
            {mode !== 'login' && (
              <button onClick={() => { setMode('login'); resetMsg() }} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-2 transition-colors">
                <ArrowLeft size={14} /> Voltar
              </button>
            )}
            <h2 className="text-lg font-bold text-slate-800">
              {mode === 'login' && 'Entrar no sistema'}
              {mode === 'cadastro' && 'Criar conta'}
              {mode === 'esqueci' && 'Recuperar senha'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {mode === 'login' && 'Acesse com seu email e senha'}
              {mode === 'cadastro' && 'Preencha os dados para criar sua conta'}
              {mode === 'esqueci' && 'Informe seu email para receber o link de redefinição'}
            </p>
          </div>

          <div className="p-6">
            {/* Mensagem de feedback */}
            {msg && (
              <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${msg.tipo === 'erro' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>
                {msg.texto}
              </div>
            )}

            {/* Formulário Login */}
            {mode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Email</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      required type="email" placeholder="seu@email.com"
                      className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400 transition-all"
                      value={email} onChange={e => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Senha</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      required type={showSenha ? 'text' : 'password'} placeholder="••••••••"
                      className="w-full pl-9 pr-10 py-3 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400 transition-all"
                      value={senha} onChange={e => setSenha(e.target.value)}
                    />
                    <button type="button" onClick={() => setShowSenha(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button type="button" onClick={() => { setMode('esqueci'); resetMsg() }} className="text-xs text-orange-500 hover:text-orange-600 font-medium transition-colors">
                    Esqueci minha senha
                  </button>
                </div>
                <button
                  type="submit" disabled={loading}
                  className="w-full py-3 bg-orange-500 text-white rounded-lg font-bold hover:bg-orange-600 transition-colors shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? 'Entrando...' : 'Entrar'}
                </button>
              </form>
            )}

            {/* Formulário Cadastro */}
            {mode === 'cadastro' && (
              <form onSubmit={handleCadastro} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nome completo</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      required type="text" placeholder="Seu nome completo"
                      className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400 transition-all"
                      value={nome} onChange={e => setNome(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Email</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      required type="email" placeholder="seu@email.com"
                      className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400 transition-all"
                      value={email} onChange={e => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Senha</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      required type={showSenha ? 'text' : 'password'} placeholder="Mínimo 6 caracteres"
                      minLength={6}
                      className="w-full pl-9 pr-10 py-3 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400 transition-all"
                      value={senha} onChange={e => setSenha(e.target.value)}
                    />
                    <button type="button" onClick={() => setShowSenha(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit" disabled={loading}
                  className="w-full py-3 bg-orange-500 text-white rounded-lg font-bold hover:bg-orange-600 transition-colors shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? 'Cadastrando...' : 'Criar conta'}
                </button>
              </form>
            )}

            {/* Formulário Esqueci senha */}
            {mode === 'esqueci' && (
              <form onSubmit={handleEsqueci} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Email cadastrado</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      required type="email" placeholder="seu@email.com"
                      className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400 transition-all"
                      value={email} onChange={e => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                <button
                  type="submit" disabled={loading}
                  className="w-full py-3 bg-orange-500 text-white rounded-lg font-bold hover:bg-orange-600 transition-colors shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? 'Enviando...' : 'Enviar link de redefinição'}
                </button>
              </form>
            )}

            {/* Rodapé do card */}
            {mode === 'login' && (
              <div className="mt-6 pt-4 border-t border-gray-100 text-center">
                <p className="text-sm text-slate-500">
                  Não tem conta?{' '}
                  <button onClick={() => { setMode('cadastro'); resetMsg() }} className="text-orange-500 font-bold hover:text-orange-600 transition-colors">
                    Cadastrar
                  </button>
                </p>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          SEMDECP — Secretaria Municipal de Defesa Civil e Patrimonial
        </p>
      </div>
    </div>
  )
}
