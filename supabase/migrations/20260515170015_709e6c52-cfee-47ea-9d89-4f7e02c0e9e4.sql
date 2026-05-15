-- Public buckets serve files via public URL without RLS; remove broad SELECT to block listing
DROP POLICY IF EXISTS "Menu images public read" ON storage.objects;