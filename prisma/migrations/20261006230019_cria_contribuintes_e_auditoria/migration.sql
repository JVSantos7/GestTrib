-- CreateEnum
CREATE TYPE "TipoPessoa" AS ENUM ('FISICA', 'JURIDICA');

-- CreateEnum
CREATE TYPE "AcaoAuditoria" AS ENUM ('CRIACAO', 'ALTERACAO', 'EXCLUSAO');

-- CreateTable
CREATE TABLE "contribuintes" (
    "id" UUID NOT NULL,
    "tipo_pessoa" "TipoPessoa" NOT NULL,
    "documento" VARCHAR(14) NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "email" VARCHAR(150),
    "telefone" VARCHAR(11),
    "cep" CHAR(8) NOT NULL,
    "logradouro" VARCHAR(150) NOT NULL,
    "numero" VARCHAR(10) NOT NULL,
    "complemento" VARCHAR(60),
    "bairro" VARCHAR(80) NOT NULL,
    "cidade" VARCHAR(80) NOT NULL,
    "uf" CHAR(2) NOT NULL,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(3) NOT NULL,
    "excluido_em" TIMESTAMPTZ(3),

    CONSTRAINT "contribuintes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registros_auditoria" (
    "id" UUID NOT NULL,
    "entidade" VARCHAR(50) NOT NULL,
    "entidade_id" UUID NOT NULL,
    "acao" "AcaoAuditoria" NOT NULL,
    "dados" JSONB NOT NULL,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registros_auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contribuintes_documento_key" ON "contribuintes"("documento");

-- CreateIndex
CREATE INDEX "contribuintes_nome_idx" ON "contribuintes"("nome");

-- CreateIndex
CREATE INDEX "registros_auditoria_entidade_entidade_id_idx" ON "registros_auditoria"("entidade", "entidade_id");
