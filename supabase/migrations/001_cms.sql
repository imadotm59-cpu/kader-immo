begin;
create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;
revoke all on public.admin_users from anon, authenticated;
grant select on public.admin_users to authenticated;
create policy own_admin_membership on public.admin_users for select to authenticated using (user_id = (select auth.uid()));
create function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.admin_users where user_id = (select auth.uid()));
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique check (length(ref) between 1 and 80),
  title text not null check (length(title) between 1 and 200),
  price numeric(16,2) not null default 0 check (price between 0 and 10000000000000),
  status text not null default 'Draft' check (status in ('Available','Sold','Rented','Draft')),
  published boolean not null default false,
  archived boolean not null default false,
  featured boolean not null default false,
  images jsonb not null default '[]'::jsonb check (jsonb_typeof(images)='array' and jsonb_array_length(images)<=20),
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data)='object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  constraint draft_not_public check (not published or status <> 'Draft')
);
create index published_properties on public.properties (updated_at desc) where published and not archived;
create index property_images on public.properties using gin (images);
create function public.stamp_property() returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  if tg_op='UPDATE' then new.created_at := old.created_at; end if;
  if new.published and (tg_op='INSERT' or not old.published) then new.published_at := now(); end if;
  if new.archived then new.published := false; end if;
  return new;
end; $$;
create trigger stamp_property before insert or update on public.properties for each row execute function public.stamp_property();
alter table public.properties enable row level security;
revoke all on public.properties from anon, authenticated;
grant select on public.properties to anon, authenticated;
grant insert, update, delete on public.properties to authenticated;
create policy public_listings on public.properties for select to anon, authenticated using (published and not archived);
create policy admin_read on public.properties for select to authenticated using ((select public.is_admin()));
create policy admin_insert on public.properties for insert to authenticated with check ((select public.is_admin()));
create policy admin_update on public.properties for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy admin_delete on public.properties for delete to authenticated using ((select public.is_admin()));

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('property-images','property-images',false,2097152,array['image/jpeg','image/png','image/webp']);
create function public.image_is_published(path text) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.properties where published and not archived and images ? path);
$$;
revoke all on function public.image_is_published(text) from public;
grant execute on function public.image_is_published(text) to anon, authenticated;
create policy visible_property_images on storage.objects for select to anon, authenticated
  using (bucket_id='property-images' and (public.is_admin() or public.image_is_published(name)));
create policy admin_upload_images on storage.objects for insert to authenticated
  with check (bucket_id='property-images' and public.is_admin() and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy admin_delete_images on storage.objects for delete to authenticated
  using (bucket_id='property-images' and public.is_admin());
-- Membership can only be granted by the project owner in SQL, never by a browser user.
commit;
