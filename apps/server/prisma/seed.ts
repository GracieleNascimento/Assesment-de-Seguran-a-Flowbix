/**
 * Cria o primeiro ADMIN (ADMIN_NOME / ADMIN_EMAIL / ADMIN_SENHA do .env).
 * Idempotente: se o e-mail já existe, não altera nada.   npm run db:seed
 */
import "dotenv/config";
import { criarPrisma } from "../src/models/prisma.js";
import { gerarHash } from "../src/lib/senha.js";

const { DATABASE_URL, ADMIN_NOME = "Administrador", ADMIN_EMAIL, ADMIN_SENHA } = process.env;

if (!DATABASE_URL || !ADMIN_EMAIL || !ADMIN_SENHA) {
  console.error("Defina DATABASE_URL, ADMIN_EMAIL e ADMIN_SENHA no apps/server/.env");
  process.exit(1);
}
if (ADMIN_SENHA.length < 10) {
  console.error("ADMIN_SENHA deve ter pelo menos 10 caracteres.");
  process.exit(1);
}

const prisma = criarPrisma(DATABASE_URL);
const email = ADMIN_EMAIL.toLowerCase();

try {
  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (existente) {
    console.log(`Admin ${email} já existe — nada a fazer.`);
  } else {
    await prisma.usuario.create({
      data: { nome: ADMIN_NOME, email, perfil: "ADMIN", senhaHash: await gerarHash(ADMIN_SENHA) },
    });
    console.log(`Admin ${email} criado.`);
  }
} finally {
  await prisma.$disconnect();
}
