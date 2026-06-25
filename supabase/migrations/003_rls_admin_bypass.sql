-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 003: Admin bypass en todas las políticas RLS
--
-- Estrategia:
--   1. Función helper is_admin() con SECURITY DEFINER para evitar recursión
--      en la tabla profiles (corre como superuser → bypassa RLS en profiles).
--   2. Cada política agrega OR is_admin() para que admin acceda a todo.
--   3. knowledge_base y tiktok_intelligence ya tienen policies correctas
--      — no se tocan.
-- ═══════════════════════════════════════════════════════════════════════════


-- ── Helper is_admin() ───────────────────────────────────────────────────────
-- SECURITY DEFINER: corre como superuser → bypassa RLS en profiles →
-- no hay recursión infinita cuando esta función se llama desde una policy
-- de la propia tabla profiles.
-- SET search_path = public: previene search_path injection.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
$$;


-- ═══════════════════════════════════════════════════════════════════════════
-- PROFILES
-- ═══════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Users can view own profile"   ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- SELECT: cada usuario ve su propio perfil. Admin ve todos.
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (
    auth.uid() = id
    OR is_admin()
  );

-- INSERT: el trigger handle_new_user() es SECURITY DEFINER y no activa RLS,
-- así que crea el perfil sin problema. Esta policy cubre inserts directos.
-- Un usuario solo puede insertar su propio perfil; admin puede crear
-- perfiles de clientes sin estar logueado como ese usuario.
CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT WITH CHECK (
    auth.uid() = id
    OR is_admin()
  );

-- UPDATE: usuario edita su propio perfil. Admin edita cualquiera
-- (para asignar roles, cambiar niche, etc.).
CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE USING (
    auth.uid() = id
    OR is_admin()
  );

-- DELETE: solo admin puede eliminar perfiles.
-- Un cliente no puede borrarse a sí mismo (previene pérdida accidental de datos).
CREATE POLICY "profiles_delete" ON profiles
  FOR DELETE USING (
    is_admin()
  );


-- ═══════════════════════════════════════════════════════════════════════════
-- SALIDAS
-- ═══════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Users can view own salidas"   ON salidas;
DROP POLICY IF EXISTS "Users can create salidas"     ON salidas;
DROP POLICY IF EXISTS "Users can update own salidas" ON salidas;
DROP POLICY IF EXISTS "Users can delete own salidas" ON salidas;

-- SELECT: un cliente solo ve filas donde user_id = su UID.
-- Admin ve todas.
CREATE POLICY "salidas_select" ON salidas
  FOR SELECT USING (
    auth.uid() = user_id
    OR is_admin()
  );

-- INSERT: WITH CHECK valida la fila NUEVA que se intenta escribir.
-- auth.uid() = user_id → el user_id de la fila insertada debe ser el propio.
-- Un cliente no puede insertar salidas con el user_id de otro.
-- Admin puede insertar salidas para cualquier cliente.
CREATE POLICY "salidas_insert" ON salidas
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    OR is_admin()
  );

-- UPDATE: USING filtra qué filas puede modificar. Solo las propias.
-- Admin puede modificar cualquiera.
CREATE POLICY "salidas_update" ON salidas
  FOR UPDATE USING (
    auth.uid() = user_id
    OR is_admin()
  );

-- DELETE: mismo patrón. Cliente borra solo las suyas.
CREATE POLICY "salidas_delete" ON salidas
  FOR DELETE USING (
    auth.uid() = user_id
    OR is_admin()
  );


-- ═══════════════════════════════════════════════════════════════════════════
-- MATERIAL SLOTS
-- (no tiene user_id propio — el ownership se resuelve via JOIN a salidas)
-- ═══════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Users can manage own slots" ON material_slots;

CREATE POLICY "material_slots_all" ON material_slots
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM salidas
      WHERE salidas.id = material_slots.salida_id
        AND salidas.user_id = auth.uid()
    )
    OR is_admin()
  );


-- ═══════════════════════════════════════════════════════════════════════════
-- SLOT FILES
-- (mismo patrón: ownership vía JOIN a salidas)
-- ═══════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Users can manage own slot files" ON slot_files;

CREATE POLICY "slot_files_all" ON slot_files
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM salidas
      WHERE salidas.id = slot_files.salida_id
        AND salidas.user_id = auth.uid()
    )
    OR is_admin()
  );


-- ═══════════════════════════════════════════════════════════════════════════
-- CONTENIDO GENERADO
-- Separado en 4 políticas explícitas (no FOR ALL) para que el WITH CHECK
-- del INSERT sea inequívoco.
-- ═══════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Users can manage own content" ON contenido_generado;

CREATE POLICY "contenido_select" ON contenido_generado
  FOR SELECT USING (
    auth.uid() = user_id
    OR is_admin()
  );

-- WITH CHECK: el user_id de la fila nueva debe ser el del usuario que llama.
-- Un cliente no puede generar contenido "en nombre de" otro cliente.
CREATE POLICY "contenido_insert" ON contenido_generado
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    OR is_admin()
  );

CREATE POLICY "contenido_update" ON contenido_generado
  FOR UPDATE USING (
    auth.uid() = user_id
    OR is_admin()
  );

CREATE POLICY "contenido_delete" ON contenido_generado
  FOR DELETE USING (
    auth.uid() = user_id
    OR is_admin()
  );


-- ═══════════════════════════════════════════════════════════════════════════
-- SIN CAMBIOS:
--   knowledge_base      → ya tiene policy "Admins can manage knowledge base"
--   tiktok_intelligence → ya tiene policy "Admins can manage tiktok intelligence"
--   storage.objects     → Storage tiene sus propias políticas, independientes
-- ═══════════════════════════════════════════════════════════════════════════
