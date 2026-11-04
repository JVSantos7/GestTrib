-- CreateTable
CREATE TABLE "pagamentos" (
    "id" UUID NOT NULL,
    "guia_id" UUID NOT NULL,
    "vigente" BOOLEAN DEFAULT true,
    "data_pagamento" DATE NOT NULL,
    "valor_pago" DECIMAL(14,2) NOT NULL,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estornado_em" TIMESTAMPTZ(3),
    "motivo_estorno" VARCHAR(300),

    CONSTRAINT "pagamentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pagamentos_guia_id_vigente_key" ON "pagamentos"("guia_id", "vigente");

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_guia_id_fkey" FOREIGN KEY ("guia_id") REFERENCES "guias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
