export interface Pessoa {
  id?: number;
  nome: string;
  cpf: string;
  telefone: string;
  endereco: string;
  email: string;
  orgao: string;
  observacoes: string;
  status_ocorrencia?: 'em_aberto' | 'em_andamento' | 'concluido' | 'arquivado';
  criado_em: string;
  atualizado_em: string;
}

export interface Movimentacao {
  data: string;
  texto: string;
}

export interface Protocolo {
  id?: number;
  pessoa_id: number;
  numero: string;
  assunto: string;
  descricao: string;
  data_entrada: string;
  prazo: string;
  status: 'aberto' | 'em_andamento' | 'concluido';
  historico: string; // JSON string
  criado_em: string;
  atualizado_em: string;
  pessoa_nome?: string;
  pessoa_endereco?: string;
  pessoa_telefone?: string;
  pessoa_cpf?: string;
}

export interface DocumentoRecebido {
  id?: number;
  pessoa_id: number;
  protocolo_id?: number;
  nome: string;
  tipo: string;
  caminho: string;
  descricao: string;
  data_recebimento: string;
  criado_em: string;
  pessoa_nome?: string;
  protocolo_numero?: string;
}

export interface DocumentoGerado {
  id?: number;
  pessoa_id: number;
  protocolo_id?: number;
  tipo: string;
  titulo: string;
  conteudo: string;
  caminho?: string;
  data_geracao: string;
  criado_em: string;
  pessoa_nome?: string;
  protocolo_numero?: string;
}

export interface Tarefa {
  id?: number;
  titulo: string;
  descricao: string;
  prioridade: 'baixa' | 'media' | 'alta';
  prazo: string;
  status: 'pendente' | 'em_andamento' | 'concluida' | 'arquivada';
  pessoa_id?: number;
  protocolo_id?: number;
  criado_em: string;
  atualizado_em: string;
  pessoa_nome?: string;
  protocolo_numero?: string;
}

export interface AgendaItem {
  id?: number;
  titulo: string;
  descricao: string;
  data: string;
  horario: string;
  pessoa_id?: number;
  protocolo_id?: number;
  realizado: number;
  criado_em: string;
  pessoa_nome?: string;
  protocolo_numero?: string;
}

export interface Config {
  nomeUsuario: string;
  nomeSetor: string;
  cargo: string;
  logomarca: string;
  assinaturaPadrao: string;
  cidade: string;
  uf: string;
}

