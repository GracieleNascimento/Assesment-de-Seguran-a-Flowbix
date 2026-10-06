import bcrypt from "bcryptjs";

const CUSTO = 12;

export const gerarHash = (senha: string) => bcrypt.hash(senha, CUSTO);

export const conferirSenha = (senha: string, hash: string) => bcrypt.compare(senha, hash);

/**
 * Hash descartável usado quando o e-mail não existe no login, para que a resposta leve
 * o mesmo tempo e não revele quais e-mails estão cadastrados.
 */
export const HASH_FICTICIO = bcrypt.hashSync("senha-ficticia-para-tempo-constante", CUSTO);
