-- Remover políticas de DELETE antigas se necessário
DROP POLICY IF EXISTS "Drivers can delete their own checklists" ON checklists;
DROP POLICY IF EXISTS "Drivers can delete their own checklist_items" ON checklist_items;
DROP POLICY IF EXISTS "Supervisors can delete any checklist" ON checklists;
DROP POLICY IF EXISTS "Supervisors can delete any checklist_items" ON checklist_items;

-- 1. Permitir que motoristas deletem seus próprios checklists
CREATE POLICY "Drivers can delete their own checklists" 
ON checklists FOR DELETE 
USING (auth.uid() = driver_id);

-- 2. Permitir que motoristas deletem os itens dos seus próprios checklists
CREATE POLICY "Drivers can delete their own checklist_items" 
ON checklist_items FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM checklists 
    WHERE id = checklist_items.checklist_id 
    AND driver_id = auth.uid()
  )
);

-- 3. Permitir que supervisores deletem QUALQUER checklist
CREATE POLICY "Supervisors can delete any checklist" 
ON checklists FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'supervisor'
  )
);

-- 4. Permitir que supervisores deletem QUALQUER item de checklist
CREATE POLICY "Supervisors can delete any checklist_items" 
ON checklist_items FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'supervisor'
  )
);
