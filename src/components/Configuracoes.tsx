import React, { useState } from 'react'
import { Settings, Save, Upload } from 'lucide-react'
import { Config } from '../types'

interface ConfiguracoesProps {
  config: Config
  onSaveConfig: (config: Config) => void
}

export const Configuracoes: React.FC<ConfiguracoesProps> = ({ config, onSaveConfig }) => {
  const [formData, setFormData] = useState<Config>(config)

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    onSaveConfig(formData)
  }

  return (
    <div className="p-8 h-full overflow-y-auto">
      <div className="mb-8"><h1 className="text-2xl font-bold flex items-center gap-2"><Settings className="text-primary-btn" size={28} /> Configurações</h1><p className="text-text-secondary">Personalize os dados da sua instituição.</p></div>
      <form onSubmit={handleSave} className="max-w-2xl space-y-8">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 space-y-6">
          <h3 className="font-bold text-lg">Dados Pessoais</h3>
          <div className="grid grid-cols-2 gap-6">
            <div><label className="block text-xs font-bold text-text-secondary uppercase mb-2">Nome do Usuário</label><input className="w-full p-3 bg-surface-card border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-btn/20 outline-none" value={formData.nomeUsuario} onChange={e => setFormData({...formData, nomeUsuario: e.target.value})} /></div>
            <div><label className="block text-xs font-bold text-text-secondary uppercase mb-2">Cargo</label><input className="w-full p-3 bg-surface-card border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-btn/20 outline-none" value={formData.cargo} onChange={e => setFormData({...formData, cargo: e.target.value})} /></div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 space-y-6">
          <h3 className="font-bold text-lg">Dados Institucionais</h3>
          <div className="space-y-6">
            <div><label className="block text-xs font-bold text-text-secondary uppercase mb-2">Nome do Setor / Órgão</label><input className="w-full p-3 bg-surface-card border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-btn/20 outline-none" value={formData.nomeSetor} onChange={e => setFormData({...formData, nomeSetor: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-6">
              <div><label className="block text-xs font-bold text-text-secondary uppercase mb-2">Cidade</label><input className="w-full p-3 bg-surface-card border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-btn/20 outline-none" value={formData.cidade} onChange={e => setFormData({...formData, cidade: e.target.value})} /></div>
              <div><label className="block text-xs font-bold text-text-secondary uppercase mb-2">UF</label><input maxLength={2} className="w-full p-3 bg-surface-card border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-btn/20 outline-none uppercase" value={formData.uf} onChange={e => setFormData({...formData, uf: e.target.value})} /></div>
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 space-y-6">
          <h3 className="font-bold text-lg">Documentos</h3>
          <div className="space-y-6">
            <div><label className="block text-xs font-bold text-text-secondary uppercase mb-2">Logomarca (Caminho Local)</label><input className="w-full p-3 bg-surface-card border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-btn/20 outline-none" placeholder="/caminho/para/logo.png" value={formData.logomarca} onChange={e => setFormData({...formData, logomarca: e.target.value})} /></div>
            <div><label className="block text-xs font-bold text-text-secondary uppercase mb-2">Assinatura Padrão</label><textarea rows={4} className="w-full p-3 bg-surface-card border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-btn/20 outline-none resize-none" placeholder="Texto que aparecerá nos documentos gerados..." value={formData.assinaturaPadrao} onChange={e => setFormData({...formData, assinaturaPadrao: e.target.value})} /></div>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <button type="submit" className="flex items-center gap-2 bg-primary-btn text-white px-8 py-3 rounded-lg font-bold hover:opacity-90 shadow-lg"><Save size={20} /> Salvar Configurações</button>
        </div>
      </form>
    </div>
  )
}
