-- Add thumbnail and extracted text columns to tiktok_intelligence
alter table tiktok_intelligence add column if not exists thumbnail_url text;
alter table tiktok_intelligence add column if not exists texto_miniatura text;
