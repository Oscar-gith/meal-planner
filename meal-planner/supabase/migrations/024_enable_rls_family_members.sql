-- Migration: Habilitar RLS en family_members
-- Problema: La migración 013 deshabilitó RLS en family_members para resolver
-- recursión infinita, pero esto dejó la tabla completamente expuesta.
-- Cualquier usuario autenticado puede ver/modificar todos los miembros de todas las familias.
--
-- Solución: Habilitar RLS con políticas que usen la función helper get_current_user_family_id()
-- que es SECURITY DEFINER y bypasea RLS, evitando recursión.

BEGIN;

-- ============================================
-- 1. HABILITAR RLS EN family_members
-- ============================================

ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. CREAR POLÍTICAS RLS SEGURAS
-- ============================================

-- SELECT: Los usuarios solo pueden ver miembros de SU familia
-- Usa get_current_user_family_id() que es SECURITY DEFINER (no causa recursión)
CREATE POLICY "Users can view their family members" ON family_members
  FOR SELECT
  USING (family_id = get_current_user_family_id());

-- INSERT: Solo via RPC functions (create_family, join_family)
-- Bloqueamos inserts directos desde el cliente
CREATE POLICY "Only RPC functions can insert members" ON family_members
  FOR INSERT
  WITH CHECK (false);

-- UPDATE: Solo via RPC functions (transfer_admin_role)
-- Bloqueamos updates directos desde el cliente
CREATE POLICY "Only RPC functions can update members" ON family_members
  FOR UPDATE
  USING (false);

-- DELETE: Solo via RPC functions (leave_family, remove_family_member)
-- Bloqueamos deletes directos desde el cliente
CREATE POLICY "Only RPC functions can delete members" ON family_members
  FOR DELETE
  USING (false);

COMMIT;
