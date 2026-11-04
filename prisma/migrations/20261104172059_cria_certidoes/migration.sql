-- CreateEnum
CREATE TYPE "TipoCertidao" AS ENUM ('NEGATIVA', 'POSITIVA_EFEITO_NEGATIVA', 'POSITIVA');

-- CreateTable
CREATE TABLE "certidoes" (
    "id" UUID NOT NULL,
    "numero" SERIAL NOT NULL,
    "ano" SMALLINT NOT NULL,
    "codigo" CHAR(19) NOT NULL,
    "tipo" "TipoCertidao" NOT NULL,
    "contribuinte_id" UUID NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "documento" VARCHAR(14) NOT NULL,
    "debitos" JSONB NOT NULL,
    "emitida_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valida_ate" DATE NOT NULL,

    CONSTRAINT "certidoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "certidoes_numero_key" ON "certidoes"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "certidoes_codigo_key" ON "certidoes"("codigo");

-- CreateIndex
CREATE INDEX "certidoes_contribuinte_id_idx" ON "certidoes"("contribuinte_id");

-- AddForeignKey
ALTER TABLE "certidoes" ADD CONSTRAINT "certidoes_contribuinte_id_fkey" FOREIGN KEY ("contribuinte_id") REFERENCES "contribuintes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
