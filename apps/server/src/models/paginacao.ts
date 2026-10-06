/** Parâmetros de paginação que os models recebem e o resultado (itens + total) que devolvem. */
export interface Paginacao {
  pagina: number;
  porPagina: number;
}

export interface Pagina<T> {
  itens: T[];
  total: number;
}

export const skipTake = (p: Paginacao) => ({ skip: (p.pagina - 1) * p.porPagina, take: p.porPagina });
