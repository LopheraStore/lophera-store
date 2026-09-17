-- LOPHERA STORE — V4
-- Execute uma única vez no SQL Editor do Supabase.
begin;

-- Permissões de tabela: RLS continua sendo a camada que decide quem pode fazer o quê.
grant usage on schema public to anon, authenticated;
grant select on public.categories, public.products, public.product_images, public.product_variants to anon, authenticated;
grant insert, update, delete on public.categories, public.products, public.product_images, public.product_variants to authenticated;
grant select, insert, update, delete on public.store_settings to authenticated;
grant select on public.store_settings to anon;
grant usage, select on all sequences in schema public to authenticated;
grant execute on function public.is_admin() to authenticated;

-- Dados físicos e organização do catálogo.
alter table public.products add column if not exists weight_kg numeric(10,3);
alter table public.products add column if not exists width_cm numeric(10,2);
alter table public.products add column if not exists height_cm numeric(10,2);
alter table public.products add column if not exists length_cm numeric(10,2);
alter table public.products add column if not exists production_days integer;
alter table public.products add column if not exists size_guide_key text;

alter table public.categories add column if not exists position integer not null default 0;
alter table public.categories add column if not exists active boolean not null default true;
alter table public.categories add column if not exists image_url text;
alter table public.categories add column if not exists size_guide_key text;

-- Configurações flexíveis para frete e identidade visual.
alter table public.store_settings add column if not exists shipping_settings jsonb not null default '{}'::jsonb;

-- Garante políticas administrativas caso uma instalação anterior não as tenha criado.
do $$ begin
 if not exists (select 1 from pg_policies where schemaname='public' and tablename='products' and policyname='Admin gerencia produtos') then
   create policy "Admin gerencia produtos" on public.products for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
 end if;
 if not exists (select 1 from pg_policies where schemaname='public' and tablename='categories' and policyname='Admin gerencia categorias') then
   create policy "Admin gerencia categorias" on public.categories for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
 end if;
end $$;

commit;

-- Conferência: deve mostrar 46 produtos e 4 categorias no banco atual.
select
 (select count(*) from public.products) as produtos,
 (select count(*) from public.categories) as categorias,
 (select count(*) from public.product_images) as imagens,
 (select count(*) from public.product_variants) as variacoes;
