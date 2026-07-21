export type FonteNivel = 'manual' | 'ana' | 'mamiraua'
export type FonteChuva = 'manual' | 'ana' | 'inmet'
export type FonteUmidade = 'manual' | 'inmet'
export type Tendencia = 'estiagem' | 'vazante' | 'estavel' | 'enchendo' | 'cheia'
export type Situacao = 'normal' | 'atencao' | 'alerta' | 'emergencia'
export type SentidoAlerta = 'cheia' | 'seca'

export interface Estacao {
  id: string
  nome: string
  rio: string
  localidade: string
  lat: number | null
  lng: number | null
  codigo_ana: string | null
  cota_atencao_cm: number | null
  cota_alerta_cm: number | null
  cota_emergencia_cm: number | null
  sentido_alerta: SentidoAlerta
  ativa: boolean
  created_at: string
}

export interface RegistroNivel {
  id: string
  estacao_id: string
  data: string
  cota_cm: number
  fonte: FonteNivel
  responsavel: string | null
  observacoes: string | null
  situacao_tendencia: Tendencia | null
  created_at: string
  situacao?: Situacao | null
}

export interface RegistroChuva {
  id: string
  estacao_id: string
  data: string
  chuva_mm: number
  fonte: FonteChuva
  responsavel: string | null
  observacoes: string | null
  created_at: string
}

export interface RegistroUmidade {
  id: string
  estacao_id: string
  data: string
  umidade_pct: number
  fonte: FonteUmidade
  responsavel: string | null
  observacoes: string | null
  created_at: string
}

export const TENDENCIA_LABEL: Record<Tendencia, string> = {
  estiagem: 'Estiagem',
  vazante: 'Vazante',
  estavel: 'Estável',
  enchendo: 'Enchendo',
  cheia: 'Cheia',
}

export const SITUACAO_LABEL: Record<Situacao, string> = {
  normal: 'Normal',
  atencao: 'Atenção',
  alerta: 'Alerta',
  emergencia: 'Emergência',
}

export const SITUACAO_COR: Record<Situacao, { bg: string; text: string; hex: string }> = {
  normal: { bg: 'bg-success/10', text: 'text-success', hex: '#16A34A' },
  atencao: { bg: 'bg-yellow-100', text: 'text-yellow-700', hex: '#CA8A04' },
  alerta: { bg: 'bg-deadline-alert/10', text: 'text-deadline-alert', hex: '#D97706' },
  emergencia: { bg: 'bg-error-expired/10', text: 'text-error-expired', hex: '#DC2626' },
}

export const SENTIDO_LABEL: Record<SentidoAlerta, string> = {
  cheia: 'Cheia (enchente — pior quando SOBE)',
  seca: 'Seca (estiagem — pior quando BAIXA)',
}

// Calcula a situação (normal/atenção/alerta/emergência) a partir dos limiares da estação.
// Mesma regra usada na view v_registros_nivel_situacao — respeita o sentido do alerta:
// 'cheia' agrava quando a cota sobe; 'seca' agrava quando a cota baixa.
export function calcularSituacao(cota_cm: number, estacao: Estacao): Situacao | null {
  const { cota_atencao_cm: a, cota_alerta_cm: al, cota_emergencia_cm: e } = estacao
  if (a == null || al == null || e == null) return null
  if (estacao.sentido_alerta === 'seca') {
    if (cota_cm <= e) return 'emergencia'
    if (cota_cm <= al) return 'alerta'
    if (cota_cm <= a) return 'atencao'
    return 'normal'
  }
  if (cota_cm >= e) return 'emergencia'
  if (cota_cm >= al) return 'alerta'
  if (cota_cm >= a) return 'atencao'
  return 'normal'
}

export const dataBR = (d: string | null | undefined) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—'
export const fmt = (v: any) => (v === null || v === undefined || v === '') ? '—' : String(v)
