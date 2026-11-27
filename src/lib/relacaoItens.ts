// Relação de itens da Assistência Social: o que foi pedido, o que já foi entregue e o que ainda está pendente.
// Item sem data de entrega = pendente; item com data = entregue. Somado por item, com os nomes das famílias.
import { norm } from './texto'
import { ajeitarTexto } from './relatorioSocial'

export type TipoRelacao = 'pendentes' | 'entregues' | 'ambos'

export interface FichaRel {
  id: number; protocolo: string | null; resp_nome: string; resp_cpf: string | null; resp_telefone: string | null
  endereco: string | null; bairro_comunidade: string | null; evento: string
}
export interface ItemRel {
  atendimento_id?: number; item: string; quantidade: number; data_entrega: string | null; entregador: string | null; recibo_assinado: boolean
}

export const entregue = (e: Pick<ItemRel, 'data_entrega'>) => !!e.data_entrega

const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const num = (n: number) => Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 2 })
const dataBR = (d: string | null) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : ''

interface LinhaRel { ficha: FichaRel; item: ItemRel }
interface GrupoItem { nome: string; pend: LinhaRel[]; ent: LinhaRel[] }

const soma = (ls: LinhaRel[]) => ls.reduce((n, l) => n + (Number(l.item.quantidade) || 0), 0)
const familias = (ls: LinhaRel[]) => new Set(ls.map(l => l.ficha.id)).size

// Agrupa por item (sem diferenciar maiúsculas, acento ou espaços a mais)
export function agruparItens(fichas: FichaRel[], itens: ItemRel[], so?: string): GrupoItem[] {
  const porFicha = new Map(fichas.map(f => [f.id, f]))
  const grupos = new Map<string, GrupoItem>()
  for (const item of itens) {
    const ficha = porFicha.get(item.atendimento_id as number)
    if (!ficha) continue
    const k = norm(item.item).replace(/\s+/g, ' ')
    if (!k || (so && k !== norm(so).replace(/\s+/g, ' '))) continue
    const g = grupos.get(k) || { nome: ajeitarTexto(item.item.trim()), pend: [], ent: [] }
    ;(entregue(item) ? g.ent : g.pend).push({ ficha, item })
    grupos.set(k, g)
  }
  const ordenaPessoas = (a: LinhaRel, b: LinhaRel) => norm(a.ficha.resp_nome).localeCompare(norm(b.ficha.resp_nome))
  for (const g of grupos.values()) { g.pend.sort(ordenaPessoas); g.ent.sort(ordenaPessoas) }
  return [...grupos.values()].sort((a, b) => norm(a.nome).localeCompare(norm(b.nome)))
}

export function itensDistintos(itens: ItemRel[]): string[] {
  const m = new Map<string, string>()
  for (const i of itens) { const k = norm(i.item).replace(/\s+/g, ' '); if (k && !m.has(k)) m.set(k, ajeitarTexto(i.item.trim())) }
  return [...m.values()].sort((a, b) => norm(a).localeCompare(norm(b)))
}

const TITULO: Record<TipoRelacao, string> = {
  pendentes: 'RELAÇÃO DE ITENS PENDENTES DE ENTREGA',
  entregues: 'RELAÇÃO DE ITENS JÁ ENTREGUES',
  ambos: 'RELAÇÃO DE ITENS PEDIDOS, ENTREGUES E PENDENTES',
}

function linhasPessoas(ls: LinhaRel[], comEntrega: boolean): string {
  return ls.map((l, i) => {
    const f = l.ficha
    return `<tr><td class="c">${i + 1}</td><td>${esc(f.protocolo || '—')}</td><td><b>${esc(f.resp_nome)}</b><br>${esc(f.resp_cpf || '')}</td>` +
      `<td>${esc(f.endereco || '')}${f.bairro_comunidade ? '<br>' + esc(f.bairro_comunidade) : ''}</td><td>${esc(f.resp_telefone || '')}</td><td>${esc(f.evento || '')}</td>` +
      `<td class="c"><b>${num(l.item.quantidade)}</b></td>` +
      (comEntrega ? `<td>${esc(dataBR(l.item.data_entrega))}</td><td>${esc(l.item.entregador || '')}</td><td class="c">${l.item.recibo_assinado ? 'Sim' : 'Não'}</td>` : '') + '</tr>'
  }).join('')
}

function blocoDetalhe(grupos: GrupoItem[], quais: 'pend' | 'ent'): string {
  const comEntrega = quais === 'ent'
  return grupos.filter(g => g[quais].length > 0).map(g => {
    const ls = g[quais]
    return `<h3>${esc(g.nome)} — ${num(soma(ls))} (${familias(ls)} família${familias(ls) === 1 ? '' : 's'})</h3>` +
      `<table><tr><th class="c">Nº</th><th>Processo</th><th>Responsável / CPF</th><th>Endereço</th><th>Contato</th><th>Evento</th><th class="c">Qtd.</th>` +
      (comEntrega ? '<th>Entregue em</th><th>Entregue por</th><th class="c">Recibo</th>' : '') + `</tr>${linhasPessoas(ls, comEntrega)}</table>`
  }).join('') || '<p><i>Nenhum item nesta situação.</i></p>'
}

export function montarRelacaoItens(o: { tipo: TipoRelacao; fichas: FichaRel[]; itens: ItemRel[]; item?: string; filtros: string; emitidoEm: string }): string {
  const grupos = agruparItens(o.fichas, o.itens, o.item)
  const pendTodos = grupos.flatMap(g => g.pend), entTodos = grupos.flatMap(g => g.ent)
  const resumo = (() => {
    const lin = (cols: string) => `<tr>${cols}</tr>`
    if (o.tipo === 'pendentes') {
      const gs = grupos.filter(g => g.pend.length)
      return `<table class="resumo"><tr><th>Item</th><th class="c">Famílias</th><th class="c">Quantidade pendente</th></tr>` +
        gs.map(g => lin(`<td>${esc(g.nome)}</td><td class="c">${familias(g.pend)}</td><td class="c"><b>${num(soma(g.pend))}</b></td>`)).join('') + '</table>'
    }
    if (o.tipo === 'entregues') {
      const gs = grupos.filter(g => g.ent.length)
      return `<table class="resumo"><tr><th>Item</th><th class="c">Famílias</th><th class="c">Quantidade entregue</th></tr>` +
        gs.map(g => lin(`<td>${esc(g.nome)}</td><td class="c">${familias(g.ent)}</td><td class="c"><b>${num(soma(g.ent))}</b></td>`)).join('') + '</table>'
    }
    return `<table class="resumo"><tr><th>Item</th><th class="c">Pedido</th><th class="c">Entregue</th><th class="c">Pendente</th><th class="c">Famílias</th></tr>` +
      grupos.map(g => lin(`<td>${esc(g.nome)}</td><td class="c">${num(soma([...g.pend, ...g.ent]))}</td><td class="c">${num(soma(g.ent))}</td><td class="c"><b>${num(soma(g.pend))}</b></td><td class="c">${familias([...g.pend, ...g.ent])}</td>`)).join('') + '</table>'
  })()
  const corpo = o.tipo === 'pendentes' ? blocoDetalhe(grupos, 'pend')
    : o.tipo === 'entregues' ? blocoDetalhe(grupos, 'ent')
      : `<h2>PENDENTES DE ENTREGA</h2>${blocoDetalhe(grupos, 'pend')}<h2 class="nova">JÁ ENTREGUES</h2>${blocoDetalhe(grupos, 'ent')}`
  const total = o.tipo === 'pendentes' ? `${familias(pendTodos)} família(s) com item pendente`
    : o.tipo === 'entregues' ? `${familias(entTodos)} família(s) atendida(s) com entrega`
      : `${familias([...pendTodos, ...entTodos])} família(s)`
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${esc(TITULO[o.tipo])}</title>
    <style>@page{size:A4 landscape;margin:12mm}body{font-family:Arial,sans-serif;font-size:11px;color:#111}
    h1{font-size:16px;margin:0}h2{font-size:14px;margin:18px 0 0;border-bottom:2px solid #333}h2.nova{page-break-before:always}h3{font-size:12px;margin:14px 0 2px}
    p{margin:2px 0;color:#444}table{width:100%;border-collapse:collapse;margin-top:6px}tr{page-break-inside:avoid}
    table.resumo{width:auto;min-width:50%}th{background:#eee;text-align:left;font-size:10px;text-transform:uppercase}
    th,td{border:1px solid #bbb;padding:4px 5px;vertical-align:top}.c{text-align:center}</style></head><body>
    <h1>${esc(TITULO[o.tipo])} — ASSISTÊNCIA SOCIAL</h1>
    <p>Secretaria Municipal de Defesa Civil e Patrimonial — SEMDCEP · Tefé/AM</p>
    <p>${esc(o.filtros)}${o.item ? ' · Item: ' + esc(ajeitarTexto(o.item)) : ''} · ${esc(total)} · Emitido em ${esc(o.emitidoEm)}</p>
    <h2>RESUMO POR ITEM</h2>${resumo}${corpo}</body></html>`
}
