-- Delete any existing update/delete policies for supervisors just in case
DROP POLICY IF EXISTS "Supervisors can update fuel logs" ON fuel_logs;
DROP POLICY IF EXISTS "Supervisors can delete fuel logs" ON fuel_logs;

-- Create policy to allow supervisors to update fuel logs
CREATE POLICY "Supervisors can update fuel logs" 
ON fuel_logs 
FOR UPDATE 
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'supervisor')
);

-- Create policy to allow supervisors to delete fuel logs
CREATE POLICY "Supervisors can delete fuel logs" 
ON fuel_logs 
FOR DELETE 
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'supervisor')
);
