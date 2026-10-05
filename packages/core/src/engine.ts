/** Motor: registra módulos, roda os aplicáveis a um ambiente e agrega os resultados. */
import {
  AchadoCompleto, Ambiente, CasoReal, Check, Finding, Modulo,
} from "./types.js";
import { Resumo, resumir } from "./scoring.js";
import { resolverSegredos } from "./segredos.js";

/** Fonte da base de conhecimento (casos reais) para enriquecer os achados. */
export interface BaseConhecimento {
  casos: Record<string, CasoReal>;
  normas: Record<string, string>;
}

export class Registro {
  private modulos = new Map<string, Modulo>();

  registrar(m: Modulo): void {
    if (this.modulos.has(m.id)) throw new Error(`Módulo duplicado: ${m.id}`);
    this.modulos.set(m.id, m);
  }

  todos(): Modulo[] {
    return [...this.modulos.values()];
  }

  aplicaveis(ambiente: Ambiente): Modulo[] {
    return this.todos().filter((m) => m.aplicavel(ambiente));
  }

  catalogoCompleto(): Check[] {
    return this.todos().flatMap((m) => m.catalogo());
  }
}

export interface ResultadoAssessment {
  ambiente: string;
  geradoEm: string;
  executadoPor?: string;
  achados: AchadoCompleto[];
  resumo: Resumo;
  modulos: { id: string; nome: string; plataforma: string; tipo: string }[];
}

/** Enriquece um Finding cru com o catálogo e os casos reais. */
function enriquecer(f: Finding, catalogo: Map<string, Check>, kb: BaseConhecimento): AchadoCompleto {
  const check = catalogo.get(f.checkId);
  if (!check) {
    throw new Error(`Finding referencia check desconhecido: ${f.checkId}`);
  }
  const casos = (check.ameaca?.casos ?? [])
    .map((id) => kb.casos[id])
    .filter((c): c is CasoReal => Boolean(c));
  return { ...f, check, casos };
}

export interface OpcoesRun {
  executadoPor?: string;
  /** limita a estes módulos (ids); vazio = todos os aplicáveis. */
  modulos?: string[];
  log?: (msg: string) => void;
}

/** Executa um assessment completo de um ambiente. */
export async function rodarAssessment(
  registro: Registro,
  ambiente: Ambiente,
  kb: BaseConhecimento,
  opts: OpcoesRun = {},
): Promise<ResultadoAssessment> {
  const log = opts.log ?? (() => undefined);
  ambiente = resolverSegredos(ambiente);
  const catalogo = new Map(registro.catalogoCompleto().map((c) => [c.id, c]));
  let modulos = registro.aplicaveis(ambiente);
  if (opts.modulos?.length) modulos = modulos.filter((m) => opts.modulos!.includes(m.id));

  const achados: AchadoCompleto[] = [];
  const usados: ResultadoAssessment["modulos"] = [];
  for (const m of modulos) {
    log(`▶ ${m.nome} (${m.tipo})`);
    usados.push({ id: m.id, nome: m.nome, plataforma: m.plataforma, tipo: m.tipo });
    try {
      const brutos = await m.auditar({ ambiente, opcoes: ambiente.opcoes ?? {}, log });
      for (const f of brutos) {
        try {
          achados.push(enriquecer(f, catalogo, kb));
        } catch (e) {
          log(`  ! ${(e as Error).message}`);
        }
      }
    } catch (e) {
      log(`  ✗ ${m.nome}: ${(e as Error).message}`);
    }
  }

  return {
    ambiente: ambiente.nome,
    geradoEm: new Date().toISOString(),
    executadoPor: opts.executadoPor,
    achados,
    resumo: resumir(achados, Object.keys(kb.normas)),
    modulos: usados,
  };
}
