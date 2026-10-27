-- CreateTable
CREATE TABLE "parametros_iptu" (
    "id" UUID NOT NULL,
    "exercicio" SMALLINT NOT NULL,
    "aliquota_residencial" DECIMAL(5,2) NOT NULL,
    "aliquota_comercial" DECIMAL(5,2) NOT NULL,
    "aliquota_industrial" DECIMAL(5,2) NOT NULL,
    "aliquota_terreno" DECIMAL(5,2) NOT NULL,
    "valor_m2_residencial" DECIMAL(12,2) NOT NULL,
    "valor_m2_comercial" DECIMAL(12,2) NOT NULL,
    "valor_m2_industrial" DECIMAL(12,2) NOT NULL,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "parametros_iptu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "valores_m2_terreno" (
    "id" UUID NOT NULL,
    "parametro_id" UUID NOT NULL,
    "setor" CHAR(2) NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "valores_m2_terreno_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "parametros_iptu_exercicio_key" ON "parametros_iptu"("exercicio");

-- CreateIndex
CREATE UNIQUE INDEX "valores_m2_terreno_parametro_id_setor_key" ON "valores_m2_terreno"("parametro_id", "setor");

-- AddForeignKey
ALTER TABLE "valores_m2_terreno" ADD CONSTRAINT "valores_m2_terreno_parametro_id_fkey" FOREIGN KEY ("parametro_id") REFERENCES "parametros_iptu"("id") ON DELETE CASCADE ON UPDATE CASCADE;
