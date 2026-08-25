-- El calendario recibe el estado del render por WebSocket en lugar de
-- consultar la fila cada pocos segundos.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'contenido_generado'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.contenido_generado;
  END IF;
END
$$;
