import { naoEncontrado, regraDeNegocio } from "../lib/erros.js";
import type {
  Ambiente, AmbienteModel, DadosAmbiente, FiltroAmbientes,
} from "../models/ambiente.model.js";
import type { Paginacao } from "../models/paginacao.js";

export class AmbienteService {
  constructor(private readonly ambientes: AmbienteModel) {}

  listar(filtro: FiltroAmbientes, p: Paginacao) {
    return this.ambientes.listar(filtro, p);
  }

  async obter(id: string): Promise<Ambiente> {
    const a = await this.ambientes.buscarPorId(id);
    if (!a) throw naoEncontrado("Ambiente");
    return a;
  }

  criar(dados: DadosAmbiente, criadoPorId: string) {
    return this.ambientes.criar(dados, criadoPorId);
  }

  async atualizar(id: string, dados: Partial<DadosAmbiente>) {
    const atual = await this.obter(id);
    if (atual.arquivadoEm) throw regraDeNegocio("Ambiente arquivado não pode ser alterado.");
    return this.ambientes.atualizar(id, dados);
  }

  /** Soft delete: o histórico de assessments e decisões continua consultável. */
  async arquivar(id: string): Promise<void> {
    const atual = await this.obter(id);
    if (!atual.arquivadoEm) await this.ambientes.arquivar(id);
  }
}
