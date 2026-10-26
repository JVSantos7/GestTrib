-- AlterTable
ALTER TABLE "registros_auditoria" ADD COLUMN     "usuario_id" UUID;

-- CreateIndex
CREATE INDEX "registros_auditoria_usuario_id_idx" ON "registros_auditoria"("usuario_id");

-- AddForeignKey
ALTER TABLE "registros_auditoria" ADD CONSTRAINT "registros_auditoria_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
