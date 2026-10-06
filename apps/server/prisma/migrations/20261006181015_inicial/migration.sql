-- CreateEnum
CREATE TYPE "Perfil" AS ENUM ('ADMIN', 'ANALISTA', 'LEITURA');

-- CreateEnum
CREATE TYPE "StatusAssessment" AS ENUM ('PENDENTE', 'EXECUTANDO', 'CONCLUIDO', 'ERRO');

-- CreateEnum
CREATE TYPE "Decisao" AS ENUM ('GO', 'CONDICIONAL', 'NO_GO');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "perfil" "Perfil" NOT NULL DEFAULT 'LEITURA',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ambientes" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "cliente" TEXT,
    "descricao" TEXT,
    "alvos" JSONB NOT NULL,
    "opcoes" JSONB NOT NULL DEFAULT '{}',
    "criado_por_id" UUID NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "arquivado_em" TIMESTAMP(3),

    CONSTRAINT "ambientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessments" (
    "id" UUID NOT NULL,
    "ambiente_id" UUID NOT NULL,
    "executado_por_id" UUID NOT NULL,
    "status" "StatusAssessment" NOT NULL DEFAULT 'PENDENTE',
    "modulos" TEXT[],
    "score" DOUBLE PRECISION,
    "nota" TEXT,
    "recomendacao" "Decisao",
    "resultado" JSONB,
    "comite" JSONB,
    "log" TEXT[],
    "erro" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "iniciado_em" TIMESTAMP(3),
    "concluido_em" TIMESTAMP(3),

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decisoes_comite" (
    "id" UUID NOT NULL,
    "assessment_id" UUID NOT NULL,
    "decisao" "Decisao" NOT NULL,
    "recomendacao" "Decisao" NOT NULL,
    "observacao" TEXT NOT NULL,
    "decidido_por_id" UUID NOT NULL,
    "decidido_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "decisoes_comite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "ambientes_nome_idx" ON "ambientes"("nome");

-- CreateIndex
CREATE INDEX "assessments_ambiente_id_criado_em_idx" ON "assessments"("ambiente_id", "criado_em");

-- CreateIndex
CREATE INDEX "assessments_status_idx" ON "assessments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "decisoes_comite_assessment_id_key" ON "decisoes_comite"("assessment_id");

-- AddForeignKey
ALTER TABLE "ambientes" ADD CONSTRAINT "ambientes_criado_por_id_fkey" FOREIGN KEY ("criado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_ambiente_id_fkey" FOREIGN KEY ("ambiente_id") REFERENCES "ambientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_executado_por_id_fkey" FOREIGN KEY ("executado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decisoes_comite" ADD CONSTRAINT "decisoes_comite_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decisoes_comite" ADD CONSTRAINT "decisoes_comite_decidido_por_id_fkey" FOREIGN KEY ("decidido_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
