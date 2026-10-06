/**
 * Configuração da API, validada na subida. Falta de variável obrigatória = erro claro
 * antes de abrir a porta (fail fast). Lê apps/server/.env se existir.
 */
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { z } from "zod";

config({ path: fileURLToPath(new URL("../../.env", import.meta.url)), quiet: true });

const esquema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().default("127.0.0.1"),
  PORT: z.coerce.number().int().positive().default(8090),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  DATABASE_URL: z.string().regex(/^postgres(ql)?:\/\//, "deve ser uma URL postgresql://"),
  JWT_SECRET: z.string().min(32, "use pelo menos 32 caracteres aleatórios"),
  JWT_EXPIRES_IN: z.string().default("8h"),
  CORS_ORIGINS: z
    .string()
    .default("")
    .transform((s) => s.split(",").map((o) => o.trim()).filter(Boolean)),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
});

export type Env = z.infer<typeof esquema>;

export function carregarEnv(fonte: NodeJS.ProcessEnv = process.env): Env {
  const r = esquema.safeParse(fonte);
  if (!r.success) {
    throw new Error(`Configuração inválida (apps/server/.env):\n${z.prettifyError(r.error)}`);
  }
  return r.data;
}
