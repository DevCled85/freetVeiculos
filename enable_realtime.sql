-- Ativando o modo Tempo-Real (Realtime) do Supabase para as tabelas principais.
-- Resolvendo o erro de sintaxe do "IF EXISTS" rodando em um bloco seguro.

DO $$
BEGIN
  -- Tentar adicionar 'checklists' se já não estiver na publicação
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'checklists'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE checklists;
  END IF;

  -- Tentar adicionar 'vehicles' se já não estiver na publicação
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'vehicles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE vehicles;
  END IF;

  -- Tentar adicionar 'notifications' se já não estiver na publicação
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END;
$$;
