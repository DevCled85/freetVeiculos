-- Corrigindo a restrição de status (CHECK constraint) na tabela de checklists
-- Antes a tabela só aceitava 'pending' ou 'reviewed', agora precisa aceitar 'resolved' também.

ALTER TABLE checklists DROP CONSTRAINT IF EXISTS checklists_status_check;
ALTER TABLE checklists ADD CONSTRAINT checklists_status_check CHECK (status IN ('pending', 'reviewed', 'resolved'));
