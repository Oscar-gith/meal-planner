


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






CREATE OR REPLACE FUNCTION "public"."create_plan_owner_collaborator"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Automatically add the plan creator as owner
  INSERT INTO plan_collaborators (plan_id, user_id, role, invited_by)
  VALUES (NEW.id, NEW.user_id, 'owner', NULL);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_plan_owner_collaborator"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."find_user_by_email"("search_email" "text") RETURNS TABLE("user_id" "uuid", "user_email" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    id as user_id,
    email as user_email
  FROM auth.users
  WHERE
    email = lower(trim(search_email))
    AND email_confirmed_at IS NOT NULL; -- Only return confirmed users
END;
$$;


ALTER FUNCTION "public"."find_user_by_email"("search_email" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."find_user_by_email"("search_email" "text") IS 'Securely search for users by email to add as collaborators';



CREATE OR REPLACE FUNCTION "public"."get_user_plan_role"("p_plan_id" "uuid", "p_user_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM plan_collaborators
  WHERE plan_id = p_plan_id AND user_id = p_user_id;

  RETURN user_role;
END;
$$;


ALTER FUNCTION "public"."get_user_plan_role"("p_plan_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_plan_owner"("p_plan_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM plan_collaborators
    WHERE plan_id = p_plan_id
    AND user_id = p_user_id
    AND role = 'owner'
  );
END;
$$;


ALTER FUNCTION "public"."is_plan_owner"("p_plan_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


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


CREATE TABLE IF NOT EXISTS "public"."food_ingredients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "type" character varying(50) NOT NULL,
    "description" "text",
    "tags" "text"[],
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
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



CREATE TABLE IF NOT EXISTS "public"."weekly_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "include_weekends" boolean DEFAULT false,
    "plan_data" "jsonb" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."weekly_plans" OWNER TO "postgres";


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



ALTER TABLE ONLY "public"."weekly_plans"
    ADD CONSTRAINT "weekly_plans_pkey" PRIMARY KEY ("id");



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



CREATE INDEX "idx_weekly_plans_user" ON "public"."weekly_plans" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "trigger_create_plan_owner_collaborator" AFTER INSERT ON "public"."weekly_plans" FOR EACH ROW EXECUTE FUNCTION "public"."create_plan_owner_collaborator"();



CREATE OR REPLACE TRIGGER "update_food_ingredients_updated_at" BEFORE UPDATE ON "public"."food_ingredients" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_meal_combinations_updated_at" BEFORE UPDATE ON "public"."meal_combinations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_weekly_plans_updated_at" BEFORE UPDATE ON "public"."weekly_plans" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."plan_collaborators"
    ADD CONSTRAINT "fk_plan_collaborators_invited_by" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."plan_collaborators"
    ADD CONSTRAINT "fk_plan_collaborators_plan" FOREIGN KEY ("plan_id") REFERENCES "public"."weekly_plans"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."plan_collaborators"
    ADD CONSTRAINT "fk_plan_collaborators_user" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Only owners can delete plans" ON "public"."weekly_plans" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Plan owners can add collaborators" ON "public"."plan_collaborators" FOR INSERT WITH CHECK (("plan_id" IN ( SELECT "plan_collaborators_1"."plan_id"
   FROM "public"."plan_collaborators" "plan_collaborators_1"
  WHERE (("plan_collaborators_1"."user_id" = "auth"."uid"()) AND ("plan_collaborators_1"."role" = 'owner'::"text")))));



CREATE POLICY "Plan owners can remove collaborators" ON "public"."plan_collaborators" FOR DELETE USING (("plan_id" IN ( SELECT "plan_collaborators_1"."plan_id"
   FROM "public"."plan_collaborators" "plan_collaborators_1"
  WHERE (("plan_collaborators_1"."user_id" = "auth"."uid"()) AND ("plan_collaborators_1"."role" = 'owner'::"text")))));



CREATE POLICY "System patterns are viewable by everyone" ON "public"."meal_patterns" FOR SELECT USING ((("is_system" = true) OR ("user_id" = "auth"."uid"())));



CREATE POLICY "Users can delete their own patterns" ON "public"."meal_patterns" FOR DELETE USING ((("user_id" = "auth"."uid"()) AND ("is_system" = false)));



CREATE POLICY "Users can insert their own patterns" ON "public"."meal_patterns" FOR INSERT WITH CHECK ((("user_id" = "auth"."uid"()) AND ("is_system" = false)));



CREATE POLICY "Users can insert their own plans" ON "public"."weekly_plans" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update plans they own or collaborate on" ON "public"."weekly_plans" FOR UPDATE USING ((("user_id" = "auth"."uid"()) OR ("id" IN ( SELECT "plan_collaborators"."plan_id"
   FROM "public"."plan_collaborators"
  WHERE ("plan_collaborators"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update their own patterns" ON "public"."meal_patterns" FOR UPDATE USING ((("user_id" = "auth"."uid"()) AND ("is_system" = false)));



CREATE POLICY "Users can view collaborators of their plans" ON "public"."plan_collaborators" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR ("plan_id" IN ( SELECT "plan_collaborators_1"."plan_id"
   FROM "public"."plan_collaborators" "plan_collaborators_1"
  WHERE ("plan_collaborators_1"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view plans they own or collaborate on" ON "public"."weekly_plans" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR ("id" IN ( SELECT "plan_collaborators"."plan_id"
   FROM "public"."plan_collaborators"
  WHERE ("plan_collaborators"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."meal_patterns" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."plan_collaborators" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."create_plan_owner_collaborator"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_plan_owner_collaborator"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_plan_owner_collaborator"() TO "service_role";



GRANT ALL ON FUNCTION "public"."find_user_by_email"("search_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."find_user_by_email"("search_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."find_user_by_email"("search_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_plan_role"("p_plan_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_plan_role"("p_plan_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_plan_role"("p_plan_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_plan_owner"("p_plan_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_plan_owner"("p_plan_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_plan_owner"("p_plan_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."food_ingredients" TO "anon";
GRANT ALL ON TABLE "public"."food_ingredients" TO "authenticated";
GRANT ALL ON TABLE "public"."food_ingredients" TO "service_role";



GRANT ALL ON TABLE "public"."food_ingredients_backup_before_type_update" TO "anon";
GRANT ALL ON TABLE "public"."food_ingredients_backup_before_type_update" TO "authenticated";
GRANT ALL ON TABLE "public"."food_ingredients_backup_before_type_update" TO "service_role";



GRANT ALL ON TABLE "public"."meal_combinations" TO "anon";
GRANT ALL ON TABLE "public"."meal_combinations" TO "authenticated";
GRANT ALL ON TABLE "public"."meal_combinations" TO "service_role";



GRANT ALL ON TABLE "public"."meal_patterns" TO "anon";
GRANT ALL ON TABLE "public"."meal_patterns" TO "authenticated";
GRANT ALL ON TABLE "public"."meal_patterns" TO "service_role";



GRANT ALL ON TABLE "public"."plan_collaborators" TO "anon";
GRANT ALL ON TABLE "public"."plan_collaborators" TO "authenticated";
GRANT ALL ON TABLE "public"."plan_collaborators" TO "service_role";



GRANT ALL ON TABLE "public"."weekly_plans" TO "anon";
GRANT ALL ON TABLE "public"."weekly_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."weekly_plans" TO "service_role";









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































