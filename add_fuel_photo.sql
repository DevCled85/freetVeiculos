-- Add photo_url column to fuel_logs
ALTER TABLE fuel_logs
ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Create storage bucket for fuel receipts if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('fuel-receipts', 'fuel-receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for the new bucket
CREATE POLICY "Public fuel receipts are viewable by everyone" ON storage.objects
  FOR SELECT USING (bucket_id = 'fuel-receipts');

CREATE POLICY "Authenticated users can upload fuel receipts" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'fuel-receipts' AND auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can update fuel receipts" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'fuel-receipts' AND auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can delete fuel receipts" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'fuel-receipts' AND auth.role() = 'authenticated'
  );
