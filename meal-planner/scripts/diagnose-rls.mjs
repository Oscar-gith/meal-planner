#!/usr/bin/env node

/**
 * Script de diagnóstico RLS para weekly_plans
 * Ejecuta queries de diagnóstico y muestra resultados formateados
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno no encontradas');
  console.error('   Asegúrate de tener NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 DIAGNÓSTICO RLS - weekly_plans');
console.log('=====================================\n');

// 1. Verificar políticas RLS
console.log('📋 1. POLÍTICAS RLS ACTIVAS');
console.log('----------------------------');

const { data: policies, error: policiesError } = await supabase.rpc('exec_sql', {
  query: `
    SELECT
      polname AS policy_name,
      CASE
        WHEN polcmd = 'r' THEN 'SELECT'
        WHEN polcmd = 'a' THEN 'INSERT'
        WHEN polcmd = 'w' THEN 'UPDATE'
        WHEN polcmd = 'd' THEN 'DELETE'
        ELSE 'ALL'
      END AS operation,
      pg_get_expr(polqual, polrelid) AS using_clause,
      pg_get_expr(polwithcheck, polrelid) AS with_check_clause
    FROM pg_policy
    WHERE polrelid = 'weekly_plans'::regclass
    ORDER BY polname;
  `
});

if (policiesError) {
  console.log('⚠️  No se pudo verificar políticas (función RPC no disponible)');
  console.log('   Esto es esperado - continuando con queries directas...\n');
} else {
  console.table(policies);
}

// 2. Verificar datos en weekly_plans
console.log('\n📊 2. ESTADÍSTICAS DE DATOS');
console.log('---------------------------');

const { count: totalPlans } = await supabase
  .from('weekly_plans')
  .select('*', { count: 'exact', head: true });

const { count: plansWithFamily } = await supabase
  .from('weekly_plans')
  .select('*', { count: 'exact', head: true })
  .not('family_id', 'is', null);

const { count: plansWithoutFamily } = await supabase
  .from('weekly_plans')
  .select('*', { count: 'exact', head: true })
  .is('family_id', null);

console.log(`Total de planes:           ${totalPlans ?? 0}`);
console.log(`Planes con family_id:      ${plansWithFamily ?? 0}`);
console.log(`Planes sin family_id:      ${plansWithoutFamily ?? 0}`);

// 3. Listar planes
console.log('\n📝 3. ÚLTIMOS PLANES');
console.log('-------------------');

const { data: plans, error: plansError } = await supabase
  .from('weekly_plans')
  .select('id, name, user_id, family_id, start_date, end_date, created_at')
  .order('created_at', { ascending: false })
  .limit(10);

if (plansError) {
  console.log(`❌ Error al obtener planes: ${plansError.message}`);
} else if (!plans || plans.length === 0) {
  console.log('ℹ️  No hay planes en la base de datos');
} else {
  console.table(plans.map(p => ({
    Nombre: p.name,
    'User ID': p.user_id?.substring(0, 8) + '...',
    'Family ID': p.family_id ? p.family_id.substring(0, 8) + '...' : 'NULL',
    Fecha: p.start_date,
    Creado: new Date(p.created_at).toLocaleDateString()
  })));
}

// 4. Análisis de visibilidad
console.log('\n🔐 4. ANÁLISIS DE VISIBILIDAD');
console.log('-----------------------------');

if (plans && plans.length > 0) {
  const analysis = plans.reduce((acc, plan) => {
    if (plan.family_id === null) {
      acc.soloOwner++;
    } else {
      acc.compartidoFamilia++;
    }
    return acc;
  }, { soloOwner: 0, compartidoFamilia: 0 });

  console.log(`Planes solo visibles por owner:   ${analysis.soloOwner}`);
  console.log(`Planes compartidos con familia:    ${analysis.compartidoFamilia}`);

  if (analysis.compartidoFamilia > 0) {
    console.log('\n⚠️  ATENCIÓN: Hay planes con family_id.');
    console.log('   Verifica que las políticas RLS filtren correctamente.');
    console.log('   Los planes solo deben ser visibles por:');
    console.log('   - El usuario que los creó (user_id)');
    console.log('   - Miembros de la misma familia (family_id)');
  }
}

// 5. Verificar families y family_members
console.log('\n👨‍👩‍👧‍👦 5. FAMILIAS Y MIEMBROS');
console.log('------------------------');

const { count: totalFamilies } = await supabase
  .from('families')
  .select('*', { count: 'exact', head: true });

const { count: totalMembers } = await supabase
  .from('family_members')
  .select('*', { count: 'exact', head: true });

console.log(`Total de familias:         ${totalFamilies ?? 0}`);
console.log(`Total de miembros:         ${totalMembers ?? 0}`);

console.log('\n=====================================');
console.log('✅ Diagnóstico completado');
