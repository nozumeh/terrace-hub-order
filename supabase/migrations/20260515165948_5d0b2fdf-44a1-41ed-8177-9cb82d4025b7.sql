-- Bucket público para imágenes de menú
INSERT INTO storage.buckets (id, name, public)
VALUES ('menu-images', 'menu-images', true)
ON CONFLICT (id) DO NOTHING;

-- Lectura pública
DROP POLICY IF EXISTS "Menu images public read" ON storage.objects;
CREATE POLICY "Menu images public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'menu-images');

-- Solo el dueño del restaurante puede subir/actualizar/eliminar dentro de su carpeta {restaurant_id}/...
DROP POLICY IF EXISTS "Menu images owner insert" ON storage.objects;
CREATE POLICY "Menu images owner insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'menu-images'
  AND EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id::text = (storage.foldername(name))[1]
      AND r.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Menu images owner update" ON storage.objects;
CREATE POLICY "Menu images owner update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'menu-images'
  AND EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id::text = (storage.foldername(name))[1]
      AND r.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Menu images owner delete" ON storage.objects;
CREATE POLICY "Menu images owner delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'menu-images'
  AND EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id::text = (storage.foldername(name))[1]
      AND r.owner_id = auth.uid()
  )
);