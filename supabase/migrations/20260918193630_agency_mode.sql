alter table profiles
add column if not exists is_agency boolean default false;
