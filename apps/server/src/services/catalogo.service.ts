import type { Check, Registro } from "@flowbix/core";

export interface FiltroChecks {
  plataforma?: string;
  tipo?: string;
  severidade?: string;
}

/** O que a plataforma sabe avaliar: módulos registrados e suas verificações. */
export class CatalogoService {
  constructor(private readonly registro: Registro) {}

  listarModulos() {
    return this.registro.todos();
  }

  listarChecks({ plataforma, tipo, severidade }: FiltroChecks): Check[] {
    return this.registro.catalogoCompleto().filter((c) =>
      (!plataforma || c.plataforma === plataforma) &&
      (!tipo || c.tipo === tipo) &&
      (!severidade || c.severidade === severidade));
  }
}
