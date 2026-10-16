-- CreateEnum
CREATE TYPE "UsoImovel" AS ENUM ('RESIDENCIAL', 'COMERCIAL', 'INDUSTRIAL', 'TERRENO');

-- CreateTable
CREATE TABLE "imoveis" (
    "id" UUID NOT NULL,
    "inscricao" CHAR(12) NOT NULL,
    "uso" "UsoImovel" NOT NULL,
    "area_terreno" DECIMAL(12,2) NOT NULL,
    "area_construida" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cep" CHAR(8) NOT NULL,
    "logradouro" VARCHAR(150) NOT NULL,
    "numero" VARCHAR(10) NOT NULL,
    "complemento" VARCHAR(60),
    "bairro" VARCHAR(80) NOT NULL,
    "contribuinte_id" UUID NOT NULL,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(3) NOT NULL,
    "excluido_em" TIMESTAMPTZ(3),

    CONSTRAINT "imoveis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "imoveis_inscricao_key" ON "imoveis"("inscricao");

-- CreateIndex
CREATE INDEX "imoveis_contribuinte_id_idx" ON "imoveis"("contribuinte_id");

-- CreateIndex
CREATE INDEX "imoveis_logradouro_idx" ON "imoveis"("logradouro");

-- AddForeignKey
ALTER TABLE "imoveis" ADD CONSTRAINT "imoveis_contribuinte_id_fkey" FOREIGN KEY ("contribuinte_id") REFERENCES "contribuintes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
