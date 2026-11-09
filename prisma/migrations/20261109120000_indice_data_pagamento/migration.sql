-- O relatório de arrecadação filtra os pagamentos pelo período (data_pagamento).
CREATE INDEX "pagamentos_data_pagamento_idx" ON "pagamentos"("data_pagamento");
