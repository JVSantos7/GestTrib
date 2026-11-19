-- Extensão do Postgres que quebra textos em trigramas ("joa", "oao"...), base dos índices abaixo.
-- Escrita à mão: o Prisma não cria extensões sozinho. O Neon já traz a pg_trgm disponível.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateIndex
CREATE INDEX "contribuintes_nome_trgm_idx" ON "contribuintes" USING GIN ("nome" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "contribuintes_documento_trgm_idx" ON "contribuintes" USING GIN ("documento" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "imoveis_logradouro_trgm_idx" ON "imoveis" USING GIN ("logradouro" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "imoveis_bairro_trgm_idx" ON "imoveis" USING GIN ("bairro" gin_trgm_ops);
