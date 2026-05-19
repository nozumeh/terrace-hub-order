create or replace function public.can_manage_menu_image(_object_name text)
returns boolean
language sql
stable
security definer
set search_path = public, storage
as $$
  select exists (
    select 1
    from public.restaurants r
    where r.id::text = (storage.foldername(_object_name))[1]
      and r.owner_id = auth.uid()
  );
$$;

drop policy if exists "Menu images public read" on storage.objects;
drop policy if exists "Menu images owner insert" on storage.objects;
drop policy if exists "Menu images owner update" on storage.objects;
drop policy if exists "Menu images owner delete" on storage.objects;

create policy "Menu images public read"
on storage.objects
for select
to public
using (bucket_id = 'menu-images');

create policy "Menu images owner insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'menu-images'
  and public.can_manage_menu_image(name)
);

create policy "Menu images owner update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'menu-images'
  and public.can_manage_menu_image(name)
)
with check (
  bucket_id = 'menu-images'
  and public.can_manage_menu_image(name)
);

create policy "Menu images owner delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'menu-images'
  and public.can_manage_menu_image(name)
);