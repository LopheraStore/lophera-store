-- LOPHERA STORE — MIGRAÇÃO V4
-- Pode ser executada uma vez no SQL Editor do Supabase.
-- Não apaga produtos, imagens, categorias ou configurações existentes.

begin;

-- Garante os privilégios de tabela. As políticas RLS continuam sendo a camada que decide quem pode fazer cada ação.
grant usage on schema public to anon, authenticated;
grant select on public.categories, public.products, public.product_images, public.product_variants, public.store_settings to anon, authenticated;
grant insert, update, delete on public.categories, public.products, public.product_images, public.product_variants, public.store_settings to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on function public.is_admin() to authenticated;

-- Dados físicos do produto para cálculo de frete.
alter table public.products add column if not exists weight_kg numeric(10,3);
alter table public.products add column if not exists width_cm numeric(10,2);
alter table public.products add column if not exists height_cm numeric(10,2);
alter table public.products add column if not exists length_cm numeric(10,2);
alter table public.products add column if not exists production_days integer;
alter table public.products add column if not exists size_guide_key text;

-- Organização visual das categorias.
alter table public.categories add column if not exists position integer not null default 0;
alter table public.categories add column if not exists active boolean not null default true;
alter table public.categories add column if not exists image_url text;
alter table public.categories add column if not exists size_guide_key text;

-- Configurações flexíveis de frete/identidade ficam dentro de content JSONB.
update public.store_settings
set content = jsonb_set(
  coalesce(content,'{}'::jsonb),
  '{shipping}',
  coalesce(content->'shipping', '{"free_shipping_from":199,"production_days":3,"local_delivery":false,"local_fee":0,"pickup":false,"origin_zip":"","default_weight":0.3,"default_width":20,"default_height":5,"default_length":30,"notes":""}'::jsonb),
  true
)
where id='main';

commit;

-- Conferência (somente leitura):
select
 (select count(*) from public.products) as products,
 (select count(*) from public.categories) as categories,
 (select count(*) from public.product_images) as product_images,
 (select count(*) from public.product_variants) as product_variants;