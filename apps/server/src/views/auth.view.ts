import { z } from "zod";
import type { Usuario } from "../models/usuario.model.js";
import { renderUsuario, usuarioView } from "./usuario.view.js";

export const loginView = z.object({
  token: z.string(),
  tipo: z.literal("Bearer"),
  expiraEm: z.string(),
  usuario: usuarioView,
});

export function renderLogin(token: string, expiraEm: Date, u: Usuario): z.infer<typeof loginView> {
  return { token, tipo: "Bearer", expiraEm: expiraEm.toISOString(), usuario: renderUsuario(u) };
}
