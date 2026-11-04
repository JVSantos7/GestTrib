-- CreateEnum
CREATE TYPE "SituacaoGuia" AS ENUM ('ABERTA', 'PAGA', 'CANCELADA');

-- CreateTable
CREATE TABLE "guias" (
    "id" UUID NOT NULL,
    "numero" SERIAL NOT NULL,
    "lancamento_id" UUID NOT NULL,
    "parcela" SMALLINT NOT NULL,
    "total_parcelas" SMALLINT NOT NULL,
    "valor" DECIMAL(14,2) NOT NULL,
    "vencimento" DATE NOT NULL,
    "situacao" "SituacaoGuia" NOT NULL DEFAULT 'ABERTA',
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelada_em" TIMESTAMPTZ(3),

    CONSTRAINT "guias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "guias_numero_key" ON "guias"("numero");

-- CreateIndex
CREATE INDEX "guias_lancamento_id_idx" ON "guias"("lancamento_id");

-- CreateIndex
CREATE INDEX "guias_situacao_vencimento_idx" ON "guias"("situacao", "vencimento");

-- AddForeignKey
ALTER TABLE "guias" ADD CONSTRAINT "guias_lancamento_id_fkey" FOREIGN KEY ("lancamento_id") REFERENCES "lancamentos_iptu"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
