-- Hace persistente la prueba de textos extremos y la vuelve obligatoria
-- para cualquier nueva aprobación del laboratorio creativo.

alter table if exists template_library
  add column if not exists stress_tested_at timestamptz,
  add column if not exists stress_test_passed boolean not null default false,
  add column if not exists stress_test_error text;

alter table if exists template_library
  drop constraint if exists template_library_approved_requires_stress_test;

alter table if exists template_library
  add constraint template_library_approved_requires_stress_test
  check (status <> 'approved' or stress_test_passed is true) not valid;

create index if not exists template_library_stress_review_idx
  on template_library (status, stress_test_passed, stress_tested_at desc);
