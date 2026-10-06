import type { Registro } from "@flowbix/core";
import type { Models } from "../models/index.js";

export class SaudeService {
  constructor(
    private readonly models: Models,
    private readonly registro: Registro,
  ) {}

  async prontidao() {
    return { bancoOk: await this.models.bancoDisponivel(), modulos: this.registro.todos().length };
  }
}
