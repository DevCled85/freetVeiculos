-- Políticas de Segurança para Notificações (Sininho)

-- 1. Permitir que motoristas insiram notificações
DROP POLICY IF EXISTS "Drivers can insert notifications" ON notifications;
CREATE POLICY "Drivers can insert notifications" 
ON notifications FOR INSERT 
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'driver')
);

-- 2. Permitir que supervisores leiam todas as notificações
DROP POLICY IF EXISTS "Supervisors can view notifications" ON notifications;
CREATE POLICY "Supervisors can view notifications" 
ON notifications FOR SELECT 
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'supervisor')
);

-- 3. Permitir que supervisores marquem notificações como lidas (UPDATE)
DROP POLICY IF EXISTS "Supervisors can update notifications" ON notifications;
CREATE POLICY "Supervisors can update notifications" 
ON notifications FOR UPDATE 
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'supervisor')
);
