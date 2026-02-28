-- Políticas para permitir que supervisores ATUALIZEM checklists e checklist_items
-- Isso é necessário para marcar problemas como resolvidos (is_ok = true) e adicionar notas.

-- 1. Permitir que supervisores atualizem QUALQUER checklist
DROP POLICY IF EXISTS "Supervisors can update any checklist" ON checklists;
CREATE POLICY "Supervisors can update any checklist" 
ON checklists FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'supervisor'
  )
);

-- 2. Permitir que supervisores atualizem QUALQUER item de checklist
DROP POLICY IF EXISTS "Supervisors can update any checklist_items" ON checklist_items;
CREATE POLICY "Supervisors can update any checklist_items" 
ON checklist_items FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'supervisor'
  )
);
