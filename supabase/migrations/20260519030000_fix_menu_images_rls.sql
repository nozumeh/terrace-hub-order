-- Fix: policies referenced r.name (restaurant name) instead of storage.objects.name
drop policy if exists "Menu images owner insert" on storage.objects;
drop policy if exists "Menu images owner update" on storage.objects;
drop policy if exists "Menu images owner delete" on storage.objects;

create policy "Menu images owner insert" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'menu-images'
  and exists (
    select 1 from restaurants r
    where r.id::text = (storage.foldername(storage.objects.name))[1]
      and r.owner_id = auth.uid()
  )
);

create policy "Menu images owner update" on storage.objects
for update to authenticated
using (
  bucket_id = 'menu-images'
  and exists (
    select 1 from restaurants r
    where r.id::text = (storage.foldername(storage.objects.name))[1]
      and r.owner_id = auth.uid()
  )
);

create policy "Menu images owner delete" on storage.objects
for delete to authenticated
using (
  bucket_id = 'menu-images'
  and exists (
    select 1 from restaurants r
    where r.id::text = (storage.foldername(storage.objects.name))[1]
      and r.owner_id = auth.uid()
  )
);
