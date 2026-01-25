


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."create_family"("family_name" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  new_family_id UUID;
  new_invite_code VARCHAR(8);
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Asegurar que el perfil existe
  PERFORM ensure_user_profile();

  -- Verificar que el usuario no esta ya en una familia
  IF EXISTS (SELECT 1 FROM family_members WHERE user_id = current_user_id) THEN
    RAISE EXCEPTION 'User is already in a family';
  END IF;

  -- Generar codigo de invitacion unico
  new_invite_code := generate_invite_code();

  -- Crear la familia
  INSERT INTO families (name, invite_code, created_by)
  VALUES (family_name, new_invite_code, current_user_id)
  RETURNING id INTO new_family_id;

  -- Agregar al creador como admin
  INSERT INTO family_members (family_id, user_id, role)
  VALUES (new_family_id, current_user_id, 'admin');

  -- Actualizar ingredientes existentes del usuario
  UPDATE food_ingredients
  SET family_id = new_family_id
  WHERE user_id = current_user_id AND family_id IS NULL;

  -- Actualizar planes existentes del usuario
  UPDATE weekly_plans
  SET family_id = new_family_id
  WHERE user_id = current_user_id AND family_id IS NULL;

  RETURN jsonb_build_object(
    'family_id', new_family_id,
    'invite_code', new_invite_code
  );
END;
$$;


ALTER FUNCTION "public"."create_family"("family_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_user_profile"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  current_user_id UUID;
  current_email TEXT;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Obtener email del usuario
  SELECT email INTO current_email
  FROM auth.users
  WHERE id = current_user_id;

  -- Insertar o actualizar perfil
  INSERT INTO user_profiles (user_id, email)
  VALUES (current_user_id, current_email)
  ON CONFLICT (user_id)
  DO UPDATE SET email = EXCLUDED.email, updated_at = NOW();
END;
$$;


ALTER FUNCTION "public"."ensure_user_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_invite_code"() RETURNS character varying
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  new_code VARCHAR(8);
BEGIN
  LOOP
    new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM families WHERE invite_code = new_code);
  END LOOP;
  RETURN new_code;
END;
$$;


ALTER FUNCTION "public"."generate_invite_code"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_user_family_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT family_id FROM family_members WHERE user_id = auth.uid() LIMIT 1;
$$;


ALTER FUNCTION "public"."get_current_user_family_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_family_members"() RETURNS TABLE("member_id" "uuid", "user_id" "uuid", "user_email" "text", "role" character varying, "joined_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  current_family_id UUID;
BEGIN
  -- Asegurar que el perfil del usuario actual existe
  PERFORM ensure_user_profile();

  -- Obtener familia del usuario actual
  SELECT family_id INTO current_family_id
  FROM family_members
  WHERE family_members.user_id = auth.uid();

  IF current_family_id IS NULL THEN
    RETURN;
  END IF;

  -- Retornar miembros usando user_profiles
  RETURN QUERY
  SELECT
    fm.id as member_id,
    fm.user_id,
    COALESCE(up.email, 'Sin email') as user_email,
    fm.role,
    fm.joined_at
  FROM family_members fm
  LEFT JOIN user_profiles up ON up.user_id = fm.user_id
  WHERE fm.family_id = current_family_id
  ORDER BY fm.joined_at ASC;
END;
$$;


ALTER FUNCTION "public"."get_family_members"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_family"() RETURNS TABLE("family_id" "uuid", "family_name" character varying, "invite_code" character varying, "user_role" character varying, "member_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id as family_id,
    f.name as family_name,
    f.invite_code,
    fm.role as user_role,
    (SELECT COUNT(*) FROM family_members fm2 WHERE fm2.family_id = f.id) as member_count
  FROM family_members fm
  JOIN families f ON f.id = fm.family_id
  WHERE fm.user_id = auth.uid();
END;
$$;


ALTER FUNCTION "public"."get_user_family"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."join_family"("p_invite_code" character varying) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  target_family_id UUID;
  target_family_name VARCHAR(255);
  member_count INT;
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Asegurar que el perfil existe
  PERFORM ensure_user_profile();

  -- Verificar que el usuario no esta ya en una familia
  IF EXISTS (SELECT 1 FROM family_members WHERE user_id = current_user_id) THEN
    RAISE EXCEPTION 'User is already in a family';
  END IF;

  -- Buscar la familia por codigo
  SELECT id, name INTO target_family_id, target_family_name
  FROM families
  WHERE invite_code = upper(p_invite_code);

  IF target_family_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  -- Verificar limite de 6 miembros
  SELECT COUNT(*) INTO member_count
  FROM family_members
  WHERE family_id = target_family_id;

  IF member_count >= 6 THEN
    RAISE EXCEPTION 'Family has reached maximum members (6)';
  END IF;

  -- Agregar usuario como miembro
  INSERT INTO family_members (family_id, user_id, role)
  VALUES (target_family_id, current_user_id, 'member');

  -- Actualizar ingredientes existentes del usuario
  UPDATE food_ingredients
  SET family_id = target_family_id
  WHERE user_id = current_user_id AND family_id IS NULL;

  -- Actualizar planes existentes del usuario
  UPDATE weekly_plans
  SET family_id = target_family_id
  WHERE user_id = current_user_id AND family_id IS NULL;

  RETURN jsonb_build_object(
    'family_id', target_family_id,
    'family_name', target_family_name
  );
END;
$$;


ALTER FUNCTION "public"."join_family"("p_invite_code" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."leave_family"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  current_family_id UUID;
  is_admin BOOLEAN;
  admin_count INT;
  member_count INT;
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Obtener familia actual del usuario
  SELECT family_id, (role = 'admin') INTO current_family_id, is_admin
  FROM family_members
  WHERE user_id = current_user_id;

  IF current_family_id IS NULL THEN
    RAISE EXCEPTION 'User is not in a family';
  END IF;

  -- Si es admin, verificar que hay otro admin o que no hay otros miembros
  IF is_admin THEN
    SELECT COUNT(*) INTO admin_count
    FROM family_members
    WHERE family_id = current_family_id AND role = 'admin';

    SELECT COUNT(*) INTO member_count
    FROM family_members
    WHERE family_id = current_family_id;

    IF admin_count <= 1 AND member_count > 1 THEN
      RAISE EXCEPTION 'Cannot leave: you are the only admin. Transfer admin role first or remove other members.';
    END IF;

    -- Si es el unico miembro, eliminar la familia
    IF member_count <= 1 THEN
      DELETE FROM families WHERE id = current_family_id;
      RETURN jsonb_build_object('success', true, 'family_deleted', true);
    END IF;
  END IF;

  -- Desasociar ingredientes del usuario de la familia
  UPDATE food_ingredients
  SET family_id = NULL
  WHERE user_id = current_user_id AND family_id = current_family_id;

  -- Desasociar planes del usuario de la familia
  UPDATE weekly_plans
  SET family_id = NULL
  WHERE user_id = current_user_id AND family_id = current_family_id;

  -- Eliminar al usuario de la familia
  DELETE FROM family_members WHERE user_id = current_user_id;

  RETURN jsonb_build_object('success', true, 'family_deleted', false);
END;
$$;


ALTER FUNCTION "public"."leave_family"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."regenerate_invite_code"() RETURNS character varying
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  current_family_id UUID;
  new_invite_code VARCHAR(8);
BEGIN
  -- Verificar que el usuario es admin
  SELECT family_id INTO current_family_id
  FROM family_members
  WHERE user_id = auth.uid() AND role = 'admin';

  IF current_family_id IS NULL THEN
    RAISE EXCEPTION 'Only family admins can regenerate invite code';
  END IF;

  -- Generar nuevo codigo unico
  new_invite_code := generate_invite_code();

  -- Actualizar
  UPDATE families SET invite_code = new_invite_code, updated_at = NOW()
  WHERE id = current_family_id;

  RETURN new_invite_code;
END;
$$;


ALTER FUNCTION "public"."regenerate_invite_code"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."remove_family_member"("target_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  current_family_id UUID;
  target_family_id UUID;
  target_role VARCHAR(20);
BEGIN
  -- Verificar que el usuario actual es admin
  SELECT family_id INTO current_family_id
  FROM family_members
  WHERE user_id = auth.uid() AND role = 'admin';

  IF current_family_id IS NULL THEN
    RAISE EXCEPTION 'Only family admins can remove members';
  END IF;

  -- Verificar que el target pertenece a la misma familia
  SELECT family_id, role INTO target_family_id, target_role
  FROM family_members
  WHERE user_id = target_user_id;

  IF target_family_id IS NULL OR target_family_id != current_family_id THEN
    RAISE EXCEPTION 'User is not a member of your family';
  END IF;

  -- No permitir eliminarse a si mismo (usar leave_family)
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot remove yourself. Use leave_family instead.';
  END IF;

  -- Desasociar ingredientes del usuario de la familia
  UPDATE food_ingredients
  SET family_id = NULL
  WHERE user_id = target_user_id AND family_id = current_family_id;

  -- Desasociar planes del usuario de la familia
  UPDATE weekly_plans
  SET family_id = NULL
  WHERE user_id = target_user_id AND family_id = current_family_id;

  -- Eliminar al usuario de la familia
  DELETE FROM family_members WHERE user_id = target_user_id AND family_id = current_family_id;

  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."remove_family_member"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."transfer_admin_role"("new_admin_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  current_family_id UUID;
  target_family_id UUID;
BEGIN
  -- Verificar que el usuario actual es admin
  SELECT family_id INTO current_family_id
  FROM family_members
  WHERE user_id = auth.uid() AND role = 'admin';

  IF current_family_id IS NULL THEN
    RAISE EXCEPTION 'Only family admins can transfer admin role';
  END IF;

  -- Verificar que el target pertenece a la misma familia
  SELECT family_id INTO target_family_id
  FROM family_members
  WHERE user_id = new_admin_user_id;

  IF target_family_id IS NULL OR target_family_id != current_family_id THEN
    RAISE EXCEPTION 'User is not a member of your family';
  END IF;

  -- No transferir a si mismo
  IF new_admin_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot transfer admin role to yourself';
  END IF;

  -- Cambiar rol del target a admin
  UPDATE family_members
  SET role = 'admin'
  WHERE user_id = new_admin_user_id AND family_id = current_family_id;

  -- Cambiar rol del actual a member
  UPDATE family_members
  SET role = 'member'
  WHERE user_id = auth.uid() AND family_id = current_family_id;

  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."transfer_admin_role"("new_admin_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."families" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "invite_code" character varying(8) NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."families" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."families_count" (
    "count" bigint
);


ALTER TABLE "public"."families_count" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."family_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "family_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" character varying(20) NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "family_members_role_check" CHECK ((("role")::"text" = ANY ((ARRAY['admin'::character varying, 'member'::character varying])::"text"[])))
);


ALTER TABLE "public"."family_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."food_ingredients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "type" character varying(50) NOT NULL,
    "description" "text",
    "tags" "text"[],
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "family_id" "uuid"
);


ALTER TABLE "public"."food_ingredients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."food_ingredients_backup_before_type_update" (
    "id" "uuid",
    "name" character varying(255),
    "type" character varying(50),
    "description" "text",
    "tags" "text"[],
    "user_id" "uuid",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone
);


ALTER TABLE "public"."food_ingredients_backup_before_type_update" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ingredients_count" (
    "count" bigint
);


ALTER TABLE "public"."ingredients_count" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."meal_combinations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "meal_type" character varying(50) NOT NULL,
    "ingredient_ids" "uuid"[] NOT NULL,
    "notes" "text",
    "is_favorite" boolean DEFAULT false,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."meal_combinations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."meal_patterns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "meal_type" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" NOT NULL,
    "required_components" "jsonb" NOT NULL,
    "is_system" boolean DEFAULT false NOT NULL,
    "display_order" integer NOT NULL,
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "meal_patterns_meal_type_check" CHECK (("meal_type" = ANY (ARRAY['Desayuno'::"text", 'Almuerzo'::"text", 'Onces'::"text"])))
);


ALTER TABLE "public"."meal_patterns" OWNER TO "postgres";


COMMENT ON TABLE "public"."meal_patterns" IS 'Meal composition patterns defining how ingredients should be combined';



COMMENT ON COLUMN "public"."meal_patterns"."required_components" IS 'JSON array of required ingredient types: [{"type": "Proteína Almuerzo", "quantity": 1}]';



CREATE TABLE IF NOT EXISTS "public"."plan_collaborators" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "plan_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "invited_by" "uuid",
    "invited_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "plan_collaborators_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'collaborator'::"text"])))
);


ALTER TABLE "public"."plan_collaborators" OWNER TO "postgres";


COMMENT ON TABLE "public"."plan_collaborators" IS 'Manages collaboration access to weekly plans';



COMMENT ON COLUMN "public"."plan_collaborators"."role" IS 'owner: full control, collaborator: can view and edit';



CREATE TABLE IF NOT EXISTS "public"."plans_with_family" (
    "count" bigint
);


ALTER TABLE "public"."plans_with_family" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."total_plans" (
    "count" bigint
);


ALTER TABLE "public"."total_plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "user_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."weekly_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "include_weekends" boolean DEFAULT false,
    "plan_data" "jsonb" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "family_id" "uuid"
);


ALTER TABLE "public"."weekly_plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."weekly_plans_count" (
    "count" bigint
);


ALTER TABLE "public"."weekly_plans_count" OWNER TO "postgres";


ALTER TABLE ONLY "public"."families"
    ADD CONSTRAINT "families_invite_code_key" UNIQUE ("invite_code");



ALTER TABLE ONLY "public"."families"
    ADD CONSTRAINT "families_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."family_members"
    ADD CONSTRAINT "family_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."food_ingredients"
    ADD CONSTRAINT "food_ingredients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."meal_combinations"
    ADD CONSTRAINT "meal_combinations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."meal_patterns"
    ADD CONSTRAINT "meal_patterns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plan_collaborators"
    ADD CONSTRAINT "plan_collaborators_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."meal_patterns"
    ADD CONSTRAINT "unique_pattern_per_meal_type" UNIQUE ("meal_type", "name", "user_id");



ALTER TABLE ONLY "public"."plan_collaborators"
    ADD CONSTRAINT "unique_plan_user" UNIQUE ("plan_id", "user_id");



ALTER TABLE ONLY "public"."family_members"
    ADD CONSTRAINT "unique_user_one_family" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."weekly_plans"
    ADD CONSTRAINT "weekly_plans_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_families_created_by" ON "public"."families" USING "btree" ("created_by");



CREATE UNIQUE INDEX "idx_families_invite_code" ON "public"."families" USING "btree" ("invite_code");



CREATE INDEX "idx_family_members_family" ON "public"."family_members" USING "btree" ("family_id");



CREATE INDEX "idx_family_members_user" ON "public"."family_members" USING "btree" ("user_id");



CREATE INDEX "idx_food_ingredients_family" ON "public"."food_ingredients" USING "btree" ("family_id");



CREATE INDEX "idx_food_ingredients_name" ON "public"."food_ingredients" USING "btree" ("name");



CREATE INDEX "idx_food_ingredients_type" ON "public"."food_ingredients" USING "btree" ("type");



CREATE INDEX "idx_food_ingredients_user" ON "public"."food_ingredients" USING "btree" ("user_id");



CREATE INDEX "idx_meal_combinations_favorite" ON "public"."meal_combinations" USING "btree" ("user_id", "is_favorite");



CREATE INDEX "idx_meal_combinations_meal_type" ON "public"."meal_combinations" USING "btree" ("meal_type");



CREATE INDEX "idx_meal_combinations_user" ON "public"."meal_combinations" USING "btree" ("user_id");



CREATE INDEX "idx_meal_patterns_meal_type" ON "public"."meal_patterns" USING "btree" ("meal_type");



CREATE INDEX "idx_meal_patterns_system" ON "public"."meal_patterns" USING "btree" ("is_system");



CREATE INDEX "idx_meal_patterns_user" ON "public"."meal_patterns" USING "btree" ("user_id");



CREATE INDEX "idx_plan_collaborators_plan" ON "public"."plan_collaborators" USING "btree" ("plan_id");



CREATE INDEX "idx_plan_collaborators_role" ON "public"."plan_collaborators" USING "btree" ("role");



CREATE INDEX "idx_plan_collaborators_user" ON "public"."plan_collaborators" USING "btree" ("user_id");



CREATE INDEX "idx_weekly_plans_dates" ON "public"."weekly_plans" USING "btree" ("start_date", "end_date");



CREATE INDEX "idx_weekly_plans_family" ON "public"."weekly_plans" USING "btree" ("family_id");



CREATE INDEX "idx_weekly_plans_user" ON "public"."weekly_plans" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "update_food_ingredients_updated_at" BEFORE UPDATE ON "public"."food_ingredients" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_meal_combinations_updated_at" BEFORE UPDATE ON "public"."meal_combinations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_weekly_plans_updated_at" BEFORE UPDATE ON "public"."weekly_plans" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."families"
    ADD CONSTRAINT "families_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."family_members"
    ADD CONSTRAINT "family_members_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."family_members"
    ADD CONSTRAINT "family_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."plan_collaborators"
    ADD CONSTRAINT "fk_plan_collaborators_invited_by" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."plan_collaborators"
    ADD CONSTRAINT "fk_plan_collaborators_plan" FOREIGN KEY ("plan_id") REFERENCES "public"."weekly_plans"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."plan_collaborators"
    ADD CONSTRAINT "fk_plan_collaborators_user" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."food_ingredients"
    ADD CONSTRAINT "food_ingredients_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."weekly_plans"
    ADD CONSTRAINT "weekly_plans_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE SET NULL;



CREATE POLICY "Authenticated users can create families" ON "public"."families" FOR INSERT WITH CHECK ((("auth"."uid"() IS NOT NULL) AND ("created_by" = "auth"."uid"())));



COMMENT ON POLICY "Authenticated users can create families" ON "public"."families" IS 'Permite a usuarios autenticados crear familias. Validación de unicidad se hace en RPC.';



CREATE POLICY "Family creator can delete" ON "public"."families" FOR DELETE USING (("created_by" = "auth"."uid"()));



COMMENT ON POLICY "Family creator can delete" ON "public"."families" IS 'Solo el creador puede eliminar la familia.';



CREATE POLICY "Family creator can update" ON "public"."families" FOR UPDATE USING (("created_by" = "auth"."uid"()));



COMMENT ON POLICY "Family creator can update" ON "public"."families" IS 'Solo el creador (created_by) puede actualizar la familia.';



CREATE POLICY "Members can view their families" ON "public"."families" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."family_members"
  WHERE (("family_members"."family_id" = "families"."id") AND ("family_members"."user_id" = "auth"."uid"())))));



COMMENT ON POLICY "Members can view their families" ON "public"."families" IS 'Permite ver familias donde el usuario es miembro. Usa EXISTS con family_members para evitar recursión RLS.';



CREATE POLICY "Plan owners can add collaborators" ON "public"."plan_collaborators" FOR INSERT WITH CHECK (("plan_id" IN ( SELECT "plan_collaborators_1"."plan_id"
   FROM "public"."plan_collaborators" "plan_collaborators_1"
  WHERE (("plan_collaborators_1"."user_id" = "auth"."uid"()) AND ("plan_collaborators_1"."role" = 'owner'::"text")))));



CREATE POLICY "Plan owners can remove collaborators" ON "public"."plan_collaborators" FOR DELETE USING (("plan_id" IN ( SELECT "plan_collaborators_1"."plan_id"
   FROM "public"."plan_collaborators" "plan_collaborators_1"
  WHERE (("plan_collaborators_1"."user_id" = "auth"."uid"()) AND ("plan_collaborators_1"."role" = 'owner'::"text")))));



CREATE POLICY "System patterns are viewable by everyone" ON "public"."meal_patterns" FOR SELECT USING ((("is_system" = true) OR ("user_id" = "auth"."uid"())));



CREATE POLICY "Users can delete own or family ingredients" ON "public"."food_ingredients" FOR DELETE USING ((("user_id" = "auth"."uid"()) OR (("family_id" IS NOT NULL) AND ("family_id" = "public"."get_current_user_family_id"()))));



COMMENT ON POLICY "Users can delete own or family ingredients" ON "public"."food_ingredients" IS 'Permite eliminar ingredientes propios o de la familia.';



CREATE POLICY "Users can delete their own patterns" ON "public"."meal_patterns" FOR DELETE USING ((("user_id" = "auth"."uid"()) AND ("is_system" = false)));



CREATE POLICY "Users can insert ingredients" ON "public"."food_ingredients" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



COMMENT ON POLICY "Users can insert ingredients" ON "public"."food_ingredients" IS 'Permite insertar ingredientes. El user_id debe ser el del usuario actual.';



CREATE POLICY "Users can insert their own patterns" ON "public"."meal_patterns" FOR INSERT WITH CHECK ((("user_id" = "auth"."uid"()) AND ("is_system" = false)));



CREATE POLICY "Users can manage own profile" ON "public"."user_profiles" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update own or family ingredients" ON "public"."food_ingredients" FOR UPDATE USING ((("user_id" = "auth"."uid"()) OR (("family_id" IS NOT NULL) AND ("family_id" = "public"."get_current_user_family_id"()))));



COMMENT ON POLICY "Users can update own or family ingredients" ON "public"."food_ingredients" IS 'Permite actualizar ingredientes propios o de la familia.';



CREATE POLICY "Users can update their own patterns" ON "public"."meal_patterns" FOR UPDATE USING ((("user_id" = "auth"."uid"()) AND ("is_system" = false)));



CREATE POLICY "Users can view collaborators of their plans" ON "public"."plan_collaborators" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR ("plan_id" IN ( SELECT "plan_collaborators_1"."plan_id"
   FROM "public"."plan_collaborators" "plan_collaborators_1"
  WHERE ("plan_collaborators_1"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view family member profiles" ON "public"."user_profiles" FOR SELECT USING ((("user_id" IN ( SELECT "fm"."user_id"
   FROM "public"."family_members" "fm"
  WHERE ("fm"."family_id" = "public"."get_current_user_family_id"()))) OR ("user_id" = "auth"."uid"())));



CREATE POLICY "Users can view own or family ingredients" ON "public"."food_ingredients" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR (("family_id" IS NOT NULL) AND ("family_id" = "public"."get_current_user_family_id"()))));



COMMENT ON POLICY "Users can view own or family ingredients" ON "public"."food_ingredients" IS 'Permite ver ingredientes propios o de la familia. Usa get_current_user_family_id() y valida family_id IS NOT NULL.';



CREATE POLICY "delete_own_plans" ON "public"."weekly_plans" FOR DELETE USING ((("auth"."uid"() IS NOT NULL) AND ("user_id" = "auth"."uid"())));



COMMENT ON POLICY "delete_own_plans" ON "public"."weekly_plans" IS 'Eliminar solo planes propios. Requiere autenticación.';



ALTER TABLE "public"."families" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."food_ingredients" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "insert_own_plans" ON "public"."weekly_plans" FOR INSERT WITH CHECK ((("auth"."uid"() IS NOT NULL) AND ("user_id" = "auth"."uid"())));



COMMENT ON POLICY "insert_own_plans" ON "public"."weekly_plans" IS 'Insertar planes. Requiere autenticación y user_id = auth.uid().';



ALTER TABLE "public"."meal_patterns" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."plan_collaborators" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "select_own_or_family_plans" ON "public"."weekly_plans" FOR SELECT USING (((("auth"."uid"() IS NOT NULL) AND ("user_id" = "auth"."uid"())) OR (("auth"."uid"() IS NOT NULL) AND ("family_id" IS NOT NULL) AND ("family_id" = "public"."get_current_user_family_id"()))));



COMMENT ON POLICY "select_own_or_family_plans" ON "public"."weekly_plans" IS 'Ver planes propios o de familia. Requiere auth.uid() IS NOT NULL para bloquear acceso no autenticado.';



CREATE POLICY "update_own_or_family_plans" ON "public"."weekly_plans" FOR UPDATE USING (((("auth"."uid"() IS NOT NULL) AND ("user_id" = "auth"."uid"())) OR (("auth"."uid"() IS NOT NULL) AND ("family_id" IS NOT NULL) AND ("family_id" = "public"."get_current_user_family_id"()))));



COMMENT ON POLICY "update_own_or_family_plans" ON "public"."weekly_plans" IS 'Actualizar planes propios o de familia. Requiere autenticación.';



ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."weekly_plans" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."create_family"("family_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_family"("family_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_family"("family_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_user_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_user_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_user_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_invite_code"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_invite_code"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_invite_code"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_user_family_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_user_family_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_user_family_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_family_members"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_family_members"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_family_members"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_family"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_family"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_family"() TO "service_role";



GRANT ALL ON FUNCTION "public"."join_family"("p_invite_code" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."join_family"("p_invite_code" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."join_family"("p_invite_code" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."leave_family"() TO "anon";
GRANT ALL ON FUNCTION "public"."leave_family"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."leave_family"() TO "service_role";



GRANT ALL ON FUNCTION "public"."regenerate_invite_code"() TO "anon";
GRANT ALL ON FUNCTION "public"."regenerate_invite_code"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."regenerate_invite_code"() TO "service_role";



GRANT ALL ON FUNCTION "public"."remove_family_member"("target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."remove_family_member"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."remove_family_member"("target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."transfer_admin_role"("new_admin_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."transfer_admin_role"("new_admin_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."transfer_admin_role"("new_admin_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."families" TO "anon";
GRANT ALL ON TABLE "public"."families" TO "authenticated";
GRANT ALL ON TABLE "public"."families" TO "service_role";



GRANT ALL ON TABLE "public"."families_count" TO "anon";
GRANT ALL ON TABLE "public"."families_count" TO "authenticated";
GRANT ALL ON TABLE "public"."families_count" TO "service_role";



GRANT ALL ON TABLE "public"."family_members" TO "anon";
GRANT ALL ON TABLE "public"."family_members" TO "authenticated";
GRANT ALL ON TABLE "public"."family_members" TO "service_role";



GRANT ALL ON TABLE "public"."food_ingredients" TO "anon";
GRANT ALL ON TABLE "public"."food_ingredients" TO "authenticated";
GRANT ALL ON TABLE "public"."food_ingredients" TO "service_role";



GRANT ALL ON TABLE "public"."food_ingredients_backup_before_type_update" TO "anon";
GRANT ALL ON TABLE "public"."food_ingredients_backup_before_type_update" TO "authenticated";
GRANT ALL ON TABLE "public"."food_ingredients_backup_before_type_update" TO "service_role";



GRANT ALL ON TABLE "public"."ingredients_count" TO "anon";
GRANT ALL ON TABLE "public"."ingredients_count" TO "authenticated";
GRANT ALL ON TABLE "public"."ingredients_count" TO "service_role";



GRANT ALL ON TABLE "public"."meal_combinations" TO "anon";
GRANT ALL ON TABLE "public"."meal_combinations" TO "authenticated";
GRANT ALL ON TABLE "public"."meal_combinations" TO "service_role";



GRANT ALL ON TABLE "public"."meal_patterns" TO "anon";
GRANT ALL ON TABLE "public"."meal_patterns" TO "authenticated";
GRANT ALL ON TABLE "public"."meal_patterns" TO "service_role";



GRANT ALL ON TABLE "public"."plan_collaborators" TO "anon";
GRANT ALL ON TABLE "public"."plan_collaborators" TO "authenticated";
GRANT ALL ON TABLE "public"."plan_collaborators" TO "service_role";



GRANT ALL ON TABLE "public"."plans_with_family" TO "anon";
GRANT ALL ON TABLE "public"."plans_with_family" TO "authenticated";
GRANT ALL ON TABLE "public"."plans_with_family" TO "service_role";



GRANT ALL ON TABLE "public"."total_plans" TO "anon";
GRANT ALL ON TABLE "public"."total_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."total_plans" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."weekly_plans" TO "anon";
GRANT ALL ON TABLE "public"."weekly_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."weekly_plans" TO "service_role";



GRANT ALL ON TABLE "public"."weekly_plans_count" TO "anon";
GRANT ALL ON TABLE "public"."weekly_plans_count" TO "authenticated";
GRANT ALL ON TABLE "public"."weekly_plans_count" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































