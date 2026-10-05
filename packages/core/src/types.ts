/**
 * Contrato de módulo e tipos comuns da plataforma de assessment Flowbix.
 *
 * Tudo gira em torno de duas ideias:
 *  - Check (verificação): a definição do que é avaliado (catálogo), igual para módulos
 *    técnicos (health, performance, governança...) e de segurança.
 *  - Finding (achado): o resultado de uma verificação num ambiente real.
 *
 * Qualquer módulo — o "grafana-tecnico" dos colegas ou o "grafana-seguranca" meu —
 * implementa a mesma interface Modulo e devolve Finding[] no mesmo formato. Assim o
 * motor, o relatório e o comitê tratam técnico e segurança de forma unificada.
 */

export type Plataforma = "zabbix" | "grafana" | "elastic" | "graylog" | "geral" | string;

export type TipoModulo = "seguranca" | "tecnico";

/** Severidade (impacto) da verificação — pondera o score. */
export type Severidade = "CRITICO" | "ALTO" | "MEDIO" | "BAIXO" | "INFO";

/** Resultado de uma verificação num ambiente. */
export type Status = "PASS" | "FAIL" | "WARN" | "NA" | "ERRO" | "MANUAL";

export const SEVERIDADES: Severidade[] = ["CRITICO", "ALTO", "MEDIO", "BAIXO", "INFO"];
export const PESOS: Record<Severidade, number> = { CRITICO: 10, ALTO: 6, MEDIO: 3, BAIXO: 1, INFO: 0 };

/** Referência a um controle de norma, com link para a fonte oficial. */
export interface RefControle {
  controle: string;
  url?: string;
}

/** Técnica MITRE ATT&CK relacionada. */
export interface TecnicaMitre {
  id: string;
  nome: string;
  url: string;
}

/** Caso real documentado que ilustra o risco. */
export interface CasoReal {
  id: string;
  titulo: string;
  ano: number;
  resumo: string;
  fontes: { nome: string; url: string }[];
}

/** Contexto de ameaça de uma verificação (por que é risco + casos reais). */
export interface Ameaca {
  por_que: string;
  impacto: string;
  mitre: TecnicaMitre[];
  /** ids de casos reais (resolvidos pela base de conhecimento). */
  casos: string[];
}

/** Definição de uma verificação (catálogo). */
export interface Check {
  id: string;
  plataforma: Plataforma;
  tipo: TipoModulo;
  titulo: string;
  categoria: string;
  severidade: Severidade;
  recomendacao: string;
  /** mapa norma -> controles (ex.: { ISO27001: [{controle:"A.8.2"}] }). */
  refs: Record<string, RefControle[]>;
  ameaca?: Ameaca;
}

/** Resultado de uma verificação num ambiente real. */
export interface Finding {
  checkId: string;
  status: Status;
  evidencia: string;
  alvo: string;
  detalhes?: string[];
}

/** Achado já enriquecido com os metadados do catálogo (para relatório/UI). */
export interface AchadoCompleto extends Finding {
  check: Check;
  casos: CasoReal[];
}

/** Configuração de um alvo de uma plataforma dentro de um ambiente. */
export interface AlvoConfig {
  url?: string;
  usuario?: string;
  senha?: string;
  apiToken?: string;
  verificarTls?: boolean;
  /** opções livres específicas do módulo (ex.: testarSenhaPadrao). */
  [extra: string]: unknown;
}

/** Ambiente de um cliente: um alvo por plataforma + metadados. */
export interface Ambiente {
  nome: string;
  alvos: Partial<Record<Plataforma, AlvoConfig>>;
  opcoes?: Record<string, unknown>;
}

/** Contexto passado ao módulo durante a auditoria. */
export interface ContextoAuditoria {
  ambiente: Ambiente;
  opcoes: Record<string, unknown>;
  /** log de progresso (streaming para a UI). */
  log: (msg: string) => void;
}

/**
 * Interface que todo módulo implementa. Um módulo cobre UMA plataforma e UM tipo
 * (segurança ou técnico). Deve ser SOMENTE LEITURA.
 */
export interface Modulo {
  id: string;
  nome: string;
  plataforma: Plataforma;
  tipo: TipoModulo;
  versao: string;
  /** Catálogo de verificações que este módulo pode produzir. */
  catalogo(): Check[];
  /** Diz se há configuração suficiente no ambiente para rodar este módulo. */
  aplicavel(ambiente: Ambiente): boolean;
  /** Executa as verificações (somente leitura) e devolve os achados. */
  auditar(ctx: ContextoAuditoria): Promise<Finding[]>;
}
