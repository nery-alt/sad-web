import React, { useMemo, useRef, useState } from 'react'
import { Upload, X, Download, CheckCircle2, AlertTriangle, Copy, XCircle, ClipboardPaste } from 'lucide-react'
import { supabase } from '../lib/supabase'
import {
  prepararImportacao, camposParaCompletar, MODELO_CSV,
  type ComunidadeExistente, type LinhaImport, type Situacao,
} from '../lib/importComunidades'

interface Props {
  existentes: ComunidadeExistente[]
  onClose: () => void
  onConcluido: () => void
}

const ROTULO: Record<Situacao, { txt: string, cls: string, icon: React.ReactNode }> = {
  nova: { txt: 'Nova', cls: 'bg-success/10 text-success border-success/30', icon: <CheckCircle2 size={12} /> },
  verificar: { txt: 'Conferir', cls: 'bg-amber-50 text-amber-700 border-amber-300', icon: <AlertTriangle size={12} /> },
  duplicada: { txt: 'Já existe', cls: 'bg-blue-50 text-blue-700 border-blue-300', icon: <Copy size={12} /> },
  erro: { txt: 'Erro', cls: 'bg-error-expired/10 text-error-expired border-error-expired/30', icon: <XCircle size={12} /> },
}

// Lê o arquivo como UTF-8; se vier com caracteres quebrados (Excel salvando em ANSI), relê como Latin-1
async function lerArquivo(file: File): Promise<string> {
  const buf = await file.arrayBuffer()
  const utf8 = new TextDecoder('utf-8').decode(buf)
  return utf8.includes(String.fromCharCode(0xFFFD)) ? new TextDecoder('windows-1252').decode(buf) : utf8
}

export const ImportarComunidades: React.FC<Props> = ({ existentes, onClose, onConcluido }) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [linhas, setLinhas] = useState<LinhaImport[]>([])
  const [arquivo, setArquivo] = useState('')
  const [erroGeral, setErroGeral] = useState('')
  const [colar, setColar] = useState(false)
  const [textoColado, setTextoColado] = useState('')
  const [filtro, setFiltro] = useState<'todas' | Situacao>('todas')
  const [gravando, setGravando] = useState(false)
  const [progresso, setProgresso] = useState('')
  const [resultado, setResultado] = useState<{ inseridas: number, completadas: number, falhas: string[] } | null>(null)

  const processar = (texto: string, nomeOrigem: string) => {
    const r = prepararImportacao(texto, existentes)
    setErroGeral(r.erroGeral || '')
    setLinhas(r.linhas)
    setArquivo(nomeOrigem)
    setResultado(null)
    setFiltro('todas')
  }

  const onArquivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (/\.xlsx?$/i.test(f.name)) {
      setErroGeral('Arquivo do Excel (.xlsx): abra no Excel e use "Salvar como → CSV (separado por vírgulas ou ponto e vírgula)", ou copie as células e use "Colar do Excel".')
      setLinhas([])
      return
    }
    processar(await lerArquivo(f), f.name)
  }

  const baixarModelo = () => {
    const blob = new Blob([String.fromCharCode(0xFEFF) + MODELO_CSV], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'modelo_importacao_comunidades.csv'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const contagem = useMemo(() => {
    const c = { nova: 0, verificar: 0, duplicada: 0, erro: 0, inserir: 0, completar: 0 }
    linhas.forEach(l => { c[l.situacao]++; if (l.acao === 'inserir') c.inserir++; if (l.acao === 'completar') c.completar++ })
    return c
  }, [linhas])

  const visiveis = filtro === 'todas' ? linhas : linhas.filter(l => l.situacao === filtro)

  const mudarAcao = (linha: number, acao: LinhaImport['acao']) =>
    setLinhas(ls => ls.map(l => l.linha === linha ? { ...l, acao } : l))

  const gravar = async () => {
    setGravando(true)
    const falhas: string[] = []
    let inseridas = 0, completadas = 0
    try {
      const novas = linhas.filter(l => l.acao === 'inserir').map(l => ({
        nome: l.nome, gps_lat: l.gps_lat, gps_lng: l.gps_lng,
        qtd_familias: l.qtd_familias, qtd_pessoas: l.qtd_pessoas,
        presidente_nome: l.presidente_nome, presidente_telefone: l.presidente_telefone,
        observacoes: l.observacoes,
      }))
      // em lotes de 100 para não estourar o limite da requisição
      for (let i = 0; i < novas.length; i += 100) {
        setProgresso(`Gravando novas: ${Math.min(i + 100, novas.length)} de ${novas.length}…`)
        const lote = novas.slice(i, i + 100)
        const { error } = await supabase.from('comunidades').insert(lote)
        if (error) falhas.push(`Lote ${i / 100 + 1} (${lote[0].nome} … ${lote[lote.length - 1].nome}): ${error.message}`)
        else inseridas += lote.length
      }
      const comp = linhas.filter(l => l.acao === 'completar' && l.duplicadaDe)
      for (const [i, l] of comp.entries()) {
        setProgresso(`Completando existentes: ${i + 1} de ${comp.length}…`)
        const upd = camposParaCompletar(l)
        if (!Object.keys(upd).length) continue
        const { error } = await supabase.from('comunidades').update(upd).eq('id', l.duplicadaDe!.id)
        if (error) falhas.push(`${l.nome}: ${error.message}`)
        else completadas++
      }
    } catch (e) {
      falhas.push(e instanceof Error ? e.message : String(e))
    } finally {
      setResultado({ inseridas, completadas, falhas })
      setProgresso('')
      setGravando(false)
      if (inseridas || completadas) onConcluido()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[94vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-bold flex items-center gap-2"><Upload size={20} /> Importar Comunidades</h2>
          <button onClick={onClose} disabled={gravando} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
        </div>

        <div className="p-4 border-b space-y-3 text-sm">
          <p className="text-text-secondary">
            Envie uma planilha <b>CSV</b> (do Excel, Google Planilhas, KoboToolbox, Epicollect…) ou cole as células direto do Excel.
            Colunas reconhecidas: <b>nome</b> (obrigatória), <b>latitude</b> e <b>longitude</b> — ou uma coluna <b>coordenada</b> com
            “lat, lng”, graus/minutos ou link do Google Maps —, <b>famílias</b>, <b>pessoas</b>, <b>presidente</b>, <b>telefone</b>, <b>observações</b>.
            Nada é gravado antes de você conferir e clicar em <b>Gravar</b>.
          </p>
          <input ref={inputRef} type="file" accept=".csv,.txt,.tsv,.xlsx,.xls" className="hidden" onChange={onArquivo} />
          <div className="flex flex-wrap gap-2">
            <button onClick={() => inputRef.current?.click()} disabled={gravando}
              className="flex items-center gap-2 bg-primary-btn text-white px-3 py-2 rounded-lg font-bold hover:opacity-90">
              <Upload size={16} /> Escolher arquivo CSV
            </button>
            <button onClick={() => setColar(v => !v)} disabled={gravando}
              className="flex items-center gap-2 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50">
              <ClipboardPaste size={16} /> Colar do Excel
            </button>
            <button onClick={baixarModelo} className="flex items-center gap-2 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50">
              <Download size={16} /> Baixar modelo
            </button>
          </div>
          {colar && (
            <div className="space-y-2">
              <textarea rows={5} value={textoColado} onChange={e => setTextoColado(e.target.value)}
                placeholder="Copie as células no Excel (incluindo a linha de cabeçalho) e cole aqui"
                className="w-full p-2 border border-gray-200 rounded text-xs font-mono outline-none focus:ring-2 focus:ring-primary-btn/20" />
              <button onClick={() => processar(textoColado, 'texto colado')} disabled={!textoColado.trim()}
                className="px-3 py-1.5 bg-primary-btn text-white rounded-lg font-bold text-xs disabled:opacity-50">Conferir dados colados</button>
            </div>
          )}
          {erroGeral && <p className="text-error-expired font-medium">{erroGeral}</p>}
        </div>

        {linhas.length > 0 && (
          <>
            <div className="px-4 pt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-text-secondary mr-1">{arquivo}: {linhas.length} linhas</span>
              {(['todas', 'nova', 'verificar', 'duplicada', 'erro'] as const).map(f => (
                <button key={f} onClick={() => setFiltro(f)}
                  className={`px-2 py-1 rounded border ${filtro === f ? 'bg-gray-800 text-white border-gray-800' : f === 'todas' ? 'border-gray-200' : ROTULO[f].cls}`}>
                  {f === 'todas' ? `Todas (${linhas.length})` : `${ROTULO[f].txt} (${contagem[f]})`}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-auto p-4">
              <table className="w-full text-xs">
                <thead className="text-left text-text-secondary uppercase sticky top-0 bg-white">
                  <tr>
                    <th className="py-1 pr-2">Linha</th><th className="py-1 pr-2">Situação</th><th className="py-1 pr-2">Comunidade</th>
                    <th className="py-1 pr-2">Coordenada</th><th className="py-1 pr-2">Avisos</th><th className="py-1">O que fazer</th>
                  </tr>
                </thead>
                <tbody>
                  {visiveis.map(l => (
                    <tr key={l.linha} className="border-t border-gray-100 align-top">
                      <td className="py-1.5 pr-2 text-text-secondary">{l.linha}</td>
                      <td className="py-1.5 pr-2">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border ${ROTULO[l.situacao].cls}`}>
                          {ROTULO[l.situacao].icon}{ROTULO[l.situacao].txt}
                        </span>
                      </td>
                      <td className="py-1.5 pr-2 font-medium">{l.nome || '—'}</td>
                      <td className="py-1.5 pr-2 whitespace-nowrap">
                        {l.gps_lat != null && l.gps_lng != null ? (
                          <a className="text-primary-btn hover:underline" target="_blank" rel="noopener noreferrer"
                            href={`https://www.google.com/maps?q=${l.gps_lat},${l.gps_lng}`}>{l.gps_lat}, {l.gps_lng}</a>
                        ) : '—'}
                      </td>
                      <td className="py-1.5 pr-2 text-text-secondary">{l.avisos.join(' · ')}</td>
                      <td className="py-1.5">
                        {l.situacao === 'erro' ? <span className="text-error-expired">Não importar</span> : (
                          <select value={l.acao} onChange={e => mudarAcao(l.linha, e.target.value as LinhaImport['acao'])}
                            className="border border-gray-200 rounded px-1 py-0.5">
                            <option value="inserir">Cadastrar nova</option>
                            {l.duplicadaDe && <option value="completar">Completar a existente</option>}
                            <option value="ignorar">Não importar</option>
                          </select>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="p-4 border-t flex flex-wrap justify-between items-center gap-2 text-sm">
          <div className="text-text-secondary">
            {progresso || (resultado
              ? <span className={resultado.falhas.length ? 'text-error-expired' : 'text-success font-medium'}>
                  {resultado.inseridas} cadastradas, {resultado.completadas} completadas
                  {resultado.falhas.length ? ` — ${resultado.falhas.length} falha(s): ${resultado.falhas.join(' | ')}` : ' — concluído.'}
                </span>
              : linhas.length ? `Vai cadastrar ${contagem.inserir} e completar ${contagem.completar}.` : '')}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} disabled={gravando} className="px-4 py-2 border rounded-lg">{resultado ? 'Fechar' : 'Cancelar'}</button>
            <button onClick={gravar} disabled={gravando || !!resultado || (contagem.inserir + contagem.completar) === 0}
              className="px-4 py-2 bg-primary-btn text-white rounded-lg font-bold disabled:opacity-50">
              {gravando ? 'Gravando…' : `Gravar (${contagem.inserir + contagem.completar})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
