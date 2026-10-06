/**
 * Erros de aplicação. Lance um AppError em qualquer camada; o error handler global
 * converte para a resposta padrão { erro: { codigo, mensagem, detalhes? }, requestId }.
 */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly codigo: string,
    mensagem: string,
    readonly detalhes?: unknown,
  ) {
    super(mensagem);
    this.name = "AppError";
  }
}

export const naoEncontrado = (recurso: string) =>
  new AppError(404, "NAO_ENCONTRADO", `${recurso} não encontrado.`);

export const naoAutenticado = (mensagem = "Autenticação necessária.") =>
  new AppError(401, "NAO_AUTENTICADO", mensagem);

export const proibido = (mensagem = "Seu perfil não tem permissão para esta operação.") =>
  new AppError(403, "PROIBIDO", mensagem);

export const conflito = (mensagem: string) => new AppError(409, "CONFLITO", mensagem);

export const regraDeNegocio = (mensagem: string, detalhes?: unknown) =>
  new AppError(422, "REGRA_DE_NEGOCIO", mensagem, detalhes);
