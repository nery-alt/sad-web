// Textos do Laudo (Relatório de Vistoria contra Incêndio e Estabilidade Estrutural)
// montados a partir do checklist do alvará. Texto entre **asteriscos** sai em negrito no Word.

export type Parecer = 'Favorável' | 'Favorável com ressalvas' | 'Desfavorável'
export const PARECERES: Parecer[] = ['Favorável', 'Favorável com ressalvas', 'Desfavorável']

export interface ChecklistAlvara {
  tipo_estabelecimento: string | null
  area_total: number | null
  capacidade_pessoas: number | null
  possui_extintor: boolean | null
  qtd_extintores: number | null
  tipo_extintor: string | null
  extintor_validade: boolean | null
  extintor_localizacao_ok: boolean | null
  sinalizacao_emergencia: boolean | null
  iluminacao_emergencia: boolean | null
  saida_desobstruida: boolean | null
  rotas_fuga_ok: boolean | null
  hidrante_reserva: boolean | null
  sistema_fixo_incendio: boolean | null
  qual_sistema_fixo: string | null
  instalacao_irregular: boolean | null
  possui_glp: boolean | null
  glp_armazenamento_ok: boolean | null
  planta_baixa: boolean | null
  estrutura_conservacao: string | null
  estrutura_trincas: string | null
  estrutura_infiltracao: boolean | null
  estrutura_cobertura_ok: boolean | null
  estrutura_obs: string | null
}

const dois = (n: number) => String(n).padStart(2, '0')
const minusc = (s: string | null) => (s || '').trim().toLowerCase()

export function textoCaracterizacao(a: ChecklistAlvara): string {
  const tipo = minusc(a.tipo_estabelecimento) || 'atividade comercial'
  const partes = [`Trata-se de estabelecimento destinado à atividade de ${tipo}, localizado em área urbana`]
  if (a.area_total) partes.push(`com área total de ${a.area_total} m²`)
  if (a.capacidade_pessoas) partes.push(`e capacidade estimada para atendimento de até ${a.capacidade_pessoas} pessoas`)
  return partes.join(', ').replace(', e capacidade', ' e capacidade') +
    ', apresentando estrutura compatível com a atividade exercida.'
}

// Um parágrafo por item observado
export function textoCondicoes(a: ChecklistAlvara): string[] {
  const p: string[] = []

  // Extintores
  if (a.possui_extintor === false) {
    p.push('Durante a inspeção técnica constatou-se que o estabelecimento **não possui extintores de incêndio**.')
  } else if (a.possui_extintor) {
    const q = a.qtd_extintores || 1
    const pl = q > 1
    const tipo = (a.tipo_extintor || 'pó ABC').trim()
    const base = `Durante a inspeção técnica constatou-se que o estabelecimento possui **${dois(q)} ${pl ? 'extintores' : 'extintor'} de incêndio do tipo ${tipo}**`
    const problemas: string[] = []
    if (a.extintor_validade === false) problemas.push(`com prazo de validade **vencido**`)
    if (a.extintor_localizacao_ok === false) problemas.push(`instalado${pl ? 's' : ''} em **local inadequado**`)
    if (problemas.length === 0) {
      p.push(`${base}, devidamente instalado${pl ? 's' : ''}, em ${pl ? 'locais adequados' : 'local adequado'} e dentro do prazo de validade.`)
    } else {
      p.push(`${base}; entretanto, ${pl ? 'os equipamentos encontram-se' : 'o equipamento encontra-se'} ${problemas.join(' e ')}.`)
    }
  }

  // Saídas e rotas de fuga
  if (a.saida_desobstruida !== null || a.rotas_fuga_ok !== null) {
    if (a.saida_desobstruida !== false && a.rotas_fuga_ok !== false) {
      p.push('As rotas de fuga e saídas de emergência encontram-se desobstruídas, com circulação adequada para evacuação em situação de emergência.')
    } else {
      const f: string[] = []
      if (a.saida_desobstruida === false) f.push('**saída de emergência obstruída**')
      if (a.rotas_fuga_ok === false) f.push('**rotas de fuga inadequadas**')
      p.push(`Foi constatada ${f.join(' e ')}, comprometendo a evacuação segura em situação de emergência.`)
    }
  }

  // Sinalização e iluminação de emergência
  const sin = a.sinalizacao_emergencia, ilu = a.iluminacao_emergencia
  if (sin !== null || ilu !== null) {
    if (sin && ilu) {
      p.push('O imóvel possui **sinalização de emergência**, bem como sistema de **iluminação de emergência** em funcionamento, atendendo às condições mínimas de segurança para o porte da atividade.')
    } else if (sin === false && ilu === false) {
      p.push('O imóvel **não possui sinalização de emergência nem iluminação de emergência**.')
    } else {
      if (sin) p.push('O imóvel possui **sinalização de emergência**.')
      if (sin === false) p.push('O imóvel **não possui sinalização de emergência**.')
      if (ilu) p.push('Foi constatada a existência de **iluminação de emergência** em funcionamento.')
      if (ilu === false) p.push('O imóvel **não possui sistema de iluminação de emergência**.')
    }
  }

  // Hidrante / reserva de água / sistema fixo
  if (a.hidrante_reserva) {
    p.push('Foi verificado que o estabelecimento possui **hidrante e/ou reserva de água**, contribuindo para suporte inicial em eventual princípio de incêndio.')
  }
  if (a.sistema_fixo_incendio) {
    const qual = (a.qual_sistema_fixo || '').trim()
    p.push(`O imóvel dispõe de **sistema fixo de combate a incêndio**${qual ? ` (${qual})` : ''}.`)
  }

  // Instalações elétricas + GLP
  const ele = a.instalacao_irregular === true
    ? 'Foram identificadas **irregularidades nas instalações elétricas**, que representam risco de princípio de incêndio'
    : a.instalacao_irregular === false ? 'Não foram identificadas irregularidades aparentes nas instalações elétricas' : ''
  let glp = ''
  if (a.possui_glp === false) glp = 'o estabelecimento não utiliza GLP'
  else if (a.possui_glp && a.glp_armazenamento_ok !== false) glp = 'o estabelecimento utiliza **GLP**, sendo verificado que o armazenamento encontra-se realizado de forma adequada e em conformidade com as recomendações básicas de segurança'
  else if (a.possui_glp) glp = 'o estabelecimento utiliza **GLP com armazenamento inadequado**, em desacordo com as recomendações básicas de segurança'
  if (ele && glp) p.push(`${ele}, e ${glp}.`)
  else if (ele) p.push(`${ele}.`)
  else if (glp) p.push(glp.charAt(0).toUpperCase() + glp.slice(1) + '.')

  // Planta baixa
  if (a.planta_baixa) p.push('A documentação técnica apresentada inclui planta baixa/croqui da edificação.')

  // Estabilidade estrutural
  p.push(textoEstrutura(a))
  return p
}

export function textoEstrutura(a: ChecklistAlvara): string {
  const cons = a.estrutura_conservacao || 'Bom'
  const trinc = a.estrutura_trincas || 'Não'
  const obs = (a.estrutura_obs || '').trim()
  const tudoOk = cons === 'Bom' && trinc === 'Não' && a.estrutura_infiltracao !== true && a.estrutura_cobertura_ok !== false
  let t: string
  if (tudoOk) {
    t = 'Quanto à estabilidade estrutural, verificou-se que o imóvel apresenta boas condições de conservação, sem presença de trincas, fissuras ou qualquer anomalia estrutural aparente no momento da vistoria.'
  } else {
    const estado = cons === 'Ruim' ? '**estado precário de conservação**' : cons === 'Regular' ? '**estado regular de conservação**' : 'boas condições de conservação'
    const itens: string[] = []
    if (trinc === 'Leves') itens.push('presença de **trincas e fissuras leves**')
    if (trinc === 'Graves') itens.push('presença de **trincas, fissuras ou rachaduras significativas**, que demandam avaliação por profissional habilitado')
    if (a.estrutura_infiltracao) itens.push('sinais de **infiltração e umidade**')
    if (a.estrutura_cobertura_ok === false) itens.push('**cobertura/telhado em condições inadequadas**')
    t = `Quanto à estabilidade estrutural, verificou-se que o imóvel apresenta ${estado}${itens.length ? ', com ' + juntar(itens) : ''}.`
  }
  return obs ? `${t} ${obs.endsWith('.') ? obs : obs + '.'}` : t
}

const juntar = (l: string[]) => l.length <= 1 ? (l[0] || '') : l.slice(0, -1).join(', ') + ' e ' + l[l.length - 1]

// Adequações / irregularidades encontradas (vão para o parecer com ressalvas ou desfavorável)
export function pendencias(a: ChecklistAlvara): string[] {
  const l: string[] = []
  if (a.possui_extintor === false) l.push('Instalar extintores de incêndio adequados à área e ao risco da atividade, sinalizados e em local de fácil acesso.')
  if (a.possui_extintor && a.extintor_validade === false) l.push('Realizar a recarga/substituição dos extintores com prazo de validade vencido.')
  if (a.possui_extintor && a.extintor_localizacao_ok === false) l.push('Reposicionar os extintores em local adequado, visível, sinalizado e de fácil acesso.')
  if (a.saida_desobstruida === false) l.push('Desobstruir a saída de emergência.')
  if (a.rotas_fuga_ok === false) l.push('Adequar as rotas de fuga, garantindo circulação livre até a saída.')
  if (a.sinalizacao_emergencia === false) l.push('Instalar sinalização de emergência (rotas de fuga, saídas e equipamentos).')
  if (a.iluminacao_emergencia === false) l.push('Instalar sistema de iluminação de emergência.')
  if (a.instalacao_irregular) l.push('Regularizar as instalações elétricas, com serviço executado por profissional habilitado.')
  if (a.possui_glp && a.glp_armazenamento_ok === false) l.push('Adequar o armazenamento do GLP, em local ventilado, fora de áreas de circulação e afastado de fontes de calor.')
  if (a.estrutura_trincas === 'Leves') l.push('Recuperar as trincas e fissuras identificadas na edificação.')
  if (a.estrutura_trincas === 'Graves') l.push('Apresentar laudo de estabilidade estrutural emitido por profissional habilitado (engenheiro ou arquiteto), com ART/RRT.')
  if (a.estrutura_conservacao === 'Ruim') l.push('Executar a recuperação da edificação, sanando os problemas de conservação identificados.')
  if (a.estrutura_infiltracao) l.push('Sanar os pontos de infiltração e umidade.')
  if (a.estrutura_cobertura_ok === false) l.push('Recuperar a cobertura/telhado.')
  return l
}

export function sugerirParecer(a: ChecklistAlvara): Parecer {
  const l = pendencias(a)
  if (l.length === 0) return 'Favorável'
  const grave = a.estrutura_trincas === 'Graves' || a.estrutura_conservacao === 'Ruim' || a.possui_extintor === false || a.saida_desobstruida === false
  return grave ? 'Desfavorável' : 'Favorável com ressalvas'
}

export function textoConclusao(parecer: Parecer): string {
  const ini = 'Considerando as condições observadas durante a vistoria, os sistemas de prevenção existentes, as condições de estabilidade estrutural verificadas e as características da atividade exercida, conclui-se que o estabelecimento'
  if (parecer === 'Favorável') return `${ini} apresenta **condições satisfatórias de segurança contra incêndio e estabilidade estrutural**, estando apto para funcionamento.`
  if (parecer === 'Favorável com ressalvas') return `${ini} apresenta **condições parcialmente satisfatórias de segurança contra incêndio e estabilidade estrutural**, sendo necessária a execução das adequações relacionadas neste relatório.`
  return `${ini} **não apresenta, no momento, condições satisfatórias de segurança contra incêndio e/ou estabilidade estrutural** para a atividade desenvolvida.`
}

// Parágrafos do Parecer Técnico
export function textoParecer(parecer: Parecer, itens: string[], prazoDias: number, usaGlp: boolean): string[] {
  if (parecer === 'Favorável') {
    return [`Diante do exposto, o parecer técnico é **FAVORÁVEL À EMISSÃO DO ALVARÁ DE FUNCIONAMENTO**, devendo o responsável manter as condições atuais de segurança, realizar inspeções periódicas dos equipamentos de combate a incêndio${usaGlp ? ', manter o correto armazenamento do GLP' : ''} e preservar as condições de conservação da edificação.`]
  }
  const lista = itens.map((t, i) => `${i + 1}. ${t}`)
  if (parecer === 'Favorável com ressalvas') {
    return [
      `Diante do exposto, o parecer técnico é **FAVORÁVEL COM RESSALVAS À EMISSÃO DO ALVARÁ DE FUNCIONAMENTO**, condicionado à execução das seguintes adequações no prazo de **${prazoDias} (${extenso(prazoDias)}) dias**, a contar do recebimento deste relatório:`,
      ...lista,
      'O não cumprimento das adequações no prazo estabelecido poderá ensejar nova vistoria e a revisão deste parecer.',
    ]
  }
  return [
    'Diante do exposto, o parecer técnico é **DESFAVORÁVEL À EMISSÃO DO ALVARÁ DE FUNCIONAMENTO**, em razão das seguintes irregularidades, que deverão ser sanadas:',
    ...lista,
    'Após a regularização dos itens apontados, o responsável poderá solicitar nova vistoria técnica.',
  ]
}

function extenso(n: number): string {
  const m: Record<number, string> = { 5: 'cinco', 10: 'dez', 15: 'quinze', 20: 'vinte', 30: 'trinta', 45: 'quarenta e cinco', 60: 'sessenta', 90: 'noventa', 120: 'cento e vinte' }
  return m[n] || String(n)
}
export const PRAZOS = [15, 30, 45, 60, 90]
