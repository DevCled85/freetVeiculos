-- Permitir que motoristas atualizem suas próprias avarias
CREATE POLICY "Drivers can update their own damages" 
ON damages FOR UPDATE 
USING (auth.uid() = reported_by);

-- Permitir que motoristas deletem suas próprias avarias
CREATE POLICY "Drivers can delete their own damages" 
ON damages FOR DELETE 
USING (auth.uid() = reported_by);

-- Permitir que supervisores deletem qualquer avaria
CREATE POLICY "Supervisors can delete any damage"
ON damages FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'supervisor'
  )
);

-- Se precisar remover as antigas antes (caso já tivessem):
-- DROP POLICY IF EXISTS "Drivers can update their own damages" ON damages;
-- DROP POLICY IF EXISTS "Drivers can delete their own damages" ON damages;
-- DROP POLICY IF EXISTS "Supervisors can delete any damage" ON damages;
