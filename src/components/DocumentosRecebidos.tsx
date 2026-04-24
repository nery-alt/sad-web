import React, { useState, useMemo } from 'react'
import { ExternalLink, Trash2, Search } from 'lucide-react'
import type { DocumentoRecebido, Pessoa } from '../types'

interface DocumentosRecebidosProps {
  documentos: DocumentoRecebido[]
  pessoas: Pessoa[]
  onOpenFile: (path: string) => void
  onDeleteDoc: (id: number) => void
  onSelectPessoa: (pessoa: Pessoa) => void
  onNavigate: (tab: string) => void
  formatDate: (dateStr: string) => string
}

export const DocumentosRecebidos: React.FC<DocumentosRecebidosProps> = ({
  documentos,
  onOpenFile,
  onDeleteDoc,
  formatDate,
}) => {
  const [searchDoc, setSearchDoc] = useState('')

  const filteredDocs = useMemo(() => documentos.filter(d =>
    (d.nome || '').toLowerCase().includes(searchDoc.toLowerCase()) ||
    (d.pessoa_nome || '').toLowerCase().includes(searchDoc.toLowerCase()) ||
    (d.protocolo_numero || '').toLowerCase().includes(searchDoc.toLowerCase())
  ), [documentos, searchDoc])

  const getFileIcon = (type: string) => {
    const t = (type || '').toLowerCase()
    if (['jpg', 'jpeg', 'png'].includes(t)) return '🖼️'
    if (t === 'pdf') return '📄'
    if (t === 'docx' || t === 'doc') return '📝'
    return '📋'
  }

  return (
    <div className="p-4 flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-center mb-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold">Documentos Recebidos</h1>
          <p className="text-text-secondary text-sm">Todos os arquivos importados do sistema.</p>
        </div>
      </div>
      <div className="mb-3 relative shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
        <input type="text" placeholder="Buscar por nome, pessoa ou protocolo..." className="w-full pl-9 pr-4 py-2 bg-surface-card border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-btn/20 text-sm" value={searchDoc} onChange={(e) => setSearchDoc(e.target.value)} />
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-100 grid grid-cols-12 gap-0 text-xs uppercase font-bold text-text-secondary border-b border-gray-200 sticky top-0">
            <div className="col-span-4 py-2 px-3 border-r border-gray-200">Arquivo</div>
            <div className="col-span-3 py-2 px-3 border-r border-gray-200">Pessoa</div>
            <div className="col-span-3 py-2 px-3 border-r border-gray-200">Protocolo</div>
            <div className="col-span-2 py-2 px-3">Data</div>
          </div>
          <div className="divide-y divide-gray-100">
            {filteredDocs.length === 0 ? (
              <div className="py-8 text-center text-text-secondary text-sm italic">Nenhum documento encontrado.</div>
            ) : filteredDocs.map(doc => (
              <div key={doc.id} className="grid grid-cols-12 gap-0 hover:bg-primary-btn/5 transition-colors group text-sm">
                <div className="col-span-4 py-2 px-3 border-r border-gray-100 flex items-center gap-2 min-w-0">
                  <span className="text-base shrink-0">{getFileIcon(doc.tipo)}</span>
                  <span className="truncate font-medium text-text-main">{doc.nome}</span>
                </div>
                <div className="col-span-3 py-2 px-3 border-r border-gray-100 text-text-secondary truncate">{doc.pessoa_nome || '—'}</div>
                <div className="col-span-3 py-2 px-3 border-r border-gray-100 text-text-secondary truncate">
                  {doc.protocolo_numero
                    ? <span className="text-primary-btn font-medium">{doc.protocolo_numero}</span>
                    : <span className="text-xs text-gray-400">—</span>
                  }
                </div>
                <div className="col-span-2 py-2 px-3 flex items-center justify-between gap-1">
                  <span className="text-text-secondary text-xs">{formatDate(doc.data_recebimento)}</span>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => onOpenFile(doc.caminho)} className="p-1 text-primary-btn hover:bg-primary-btn/10 rounded" title="Abrir"><ExternalLink size={14} /></button>
                    <button onClick={() => onDeleteDoc(doc.id!)} className="p-1 text-error-expired hover:bg-error-expired/10 rounded" title="Remover"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
