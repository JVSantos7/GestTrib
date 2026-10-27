-- CreateTable
CREATE TABLE "lancamentos_iptu" (
    "id" UUID NOT NULL,
    "exercicio" SMALLINT NOT NULL,
    "imovel_id" UUID NOT NULL,
    "contribuinte_id" UUID NOT NULL,
    "vigente" BOOLEAN DEFAULT true,
    "uso" "UsoImovel" NOT NULL,
    "inscricao" CHAR(12) NOT NULL,
    "area_terreno" DECIMAL(12,2) NOT NULL,
    "area_construida" DECIMAL(12,2) NOT NULL,
    "unidades_no_lote" SMALLINT NOT NULL,
    "valor_m2_terreno" DECIMAL(12,2) NOT NULL,
    "valor_m2_construcao" DECIMAL(12,2) NOT NULL,
    "aliquota" DECIMAL(5,2) NOT NULL,
    "area_terreno_considerada" DECIMAL(12,2) NOT NULL,
    "valor_venal_terreno" DECIMAL(14,2) NOT NULL,
    "valor_venal_construcao" DECIMAL(14,2) NOT NULL,
    "valor_venal" DECIMAL(14,2) NOT NULL,
    "valor_imposto" DECIMAL(14,2) NOT NULL,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelado_em" TIMESTAMPTZ(3),
    "motivo_cancelamento" VARCHAR(300),

    CONSTRAINT "lancamentos_iptu_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lancamentos_iptu_exercicio_idx" ON "lancamentos_iptu"("exercicio");

-- CreateIndex
CREATE INDEX "lancamentos_iptu_contribuinte_id_idx" ON "lancamentos_iptu"("contribuinte_id");

-- CreateIndex
CREATE UNIQUE INDEX "lancamentos_iptu_imovel_id_exercicio_vigente_key" ON "lancamentos_iptu"("imovel_id", "exercicio", "vigente");

-- AddForeignKey
ALTER TABLE "lancamentos_iptu" ADD CONSTRAINT "lancamentos_iptu_imovel_id_fkey" FOREIGN KEY ("imovel_id") REFERENCES "imoveis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamentos_iptu" ADD CONSTRAINT "lancamentos_iptu_contribuinte_id_fkey" FOREIGN KEY ("contribuinte_id") REFERENCES "contribuintes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
