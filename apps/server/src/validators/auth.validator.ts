import { z } from "zod";
import { emailSchema, senhaSchema } from "./usuario.validator.js";

export const authValidator = {
  login: {
    body: z.object({ email: emailSchema, senha: z.string().min(1).max(128) }),
  },
  trocarSenha: {
    body: z.object({ senhaAtual: z.string().min(1).max(128), novaSenha: senhaSchema }),
  },
};
