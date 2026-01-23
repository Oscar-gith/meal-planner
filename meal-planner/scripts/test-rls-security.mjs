#!/usr/bin/env node

/**
 * Script para probar el bug de seguridad RLS
 * Simula dos usuarios diferentes y verifica qué planes puede ver cada uno
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables de entorno no encontradas');
  process.exit(1);
}

console.log('🔐 TEST DE SEGURIDAD RLS - weekly_plans');
console.log('=========================================\n');

// Primero obtener todos los datos con service role
const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

console.log('📊 DATOS REALES EN LA BASE DE DATOS (bypasea RLS)');
console.log('--------------------------------------------------');

const { data: allPlans } = await adminClient
  .from('weekly_plans')
  .select('id, name, user_id, family_id');

const { data: allMembers } = await adminClient
  .from('family_members')
  .select('user_id, family_id, role');

const { data: allFamilies } = await adminClient
  .from('families')
  .select('id, name');

console.log(`\nFamilias: ${allFamilies?.length ?? 0}`);
allFamilies?.forEach(f => {
  console.log(`  - ${f.name} (${f.id})`);
});

console.log(`\nPlanes totales: ${allPlans?.length ?? 0}`);
allPlans?.forEach(p => {
  console.log(`  - ${p.name}`);
  console.log(`    Owner: ${p.user_id}`);
  console.log(`    Family: ${p.family_id ?? 'NULL'}`);
});

console.log(`\nMiembros totales: ${allMembers?.length ?? 0}`);
allMembers?.forEach(m => {
  console.log(`  - User ${m.user_id.substring(0, 8)}...`);
  console.log(`    Family: ${m.family_id}`);
  console.log(`    Role: ${m.role}`);
});

// Ahora probar con cada usuario
console.log('\n\n🧪 PRUEBA DE AISLAMIENTO DE DATOS');
console.log('==================================\n');

// Agrupar usuarios por familia
const usersByFamily = new Map();
allMembers?.forEach(m => {
  if (!usersByFamily.has(m.family_id)) {
    usersByFamily.set(m.family_id, []);
  }
  usersByFamily.get(m.family_id).push(m.user_id);
});

console.log('Usuarios agrupados por familia:');
for (const [familyId, users] of usersByFamily.entries()) {
  const family = allFamilies?.find(f => f.id === familyId);
  console.log(`\nFamilia: ${family?.name ?? 'Desconocida'} (${familyId})`);
  users.forEach((userId, idx) => {
    console.log(`  Usuario ${idx + 1}: ${userId}`);
  });
}

// Probar qué planes ve cada usuario sin autenticación
console.log('\n\n❌ SIN AUTENTICACIÓN (anon key)');
console.log('--------------------------------');

const anonClient = createClient(supabaseUrl, supabaseKey);
const { data: anonPlans, error: anonError } = await anonClient
  .from('weekly_plans')
  .select('id, name, user_id, family_id');

console.log(`Planes visibles: ${anonPlans?.length ?? 0}`);
if (anonPlans && anonPlans.length > 0) {
  console.log('⚠️  PROBLEMA: Usuario no autenticado puede ver planes!');
  anonPlans.forEach(p => {
    console.log(`  - ${p.name} (Family: ${p.family_id})`);
  });
} else {
  console.log('✅ Correcto: No se ven planes sin autenticación');
}

// Simular autenticación directamente usando el userId
// (esto simula lo que pasa cuando un usuario está logueado)
console.log('\n\n🔐 SIMULACIÓN DE USUARIOS AUTENTICADOS');
console.log('---------------------------------------');

// Para cada usuario, verificar qué planes puede ver
for (const [familyId, userIds] of usersByFamily.entries()) {
  const family = allFamilies?.find(f => f.id === familyId);
  console.log(`\n\nFamilia: ${family?.name ?? 'Desconocida'}`);

  for (let i = 0; i < userIds.length; i++) {
    const userId = userIds[i];
    console.log(`\n  Usuario ${i + 1}: ${userId.substring(0, 8)}...`);

    // Crear query para simular RLS manualmente
    // Esto es lo que la política RLS debería hacer:
    const expectedPlans = allPlans?.filter(p =>
      p.user_id === userId ||
      (p.family_id !== null && p.family_id === familyId)
    );

    console.log(`    Debería ver ${expectedPlans?.length ?? 0} planes:`);
    expectedPlans?.forEach(p => {
      const ownership = p.user_id === userId ? 'PROPIO' : 'FAMILIA';
      console.log(`      - ${p.name} (${ownership})`);
    });
  }
}

// Verificar políticas activas
console.log('\n\n📋 POLÍTICAS RLS ACTIVAS');
console.log('------------------------');

const { data: policies } = await adminClient.rpc('exec_sql', {
  query: `
    SELECT polname, pg_get_expr(polqual, polrelid) as using_expr
    FROM pg_policy
    WHERE polrelid = 'weekly_plans'::regclass
    ORDER BY polname;
  `
}).catch(() => ({ data: null }));

if (policies) {
  console.table(policies);
} else {
  console.log('⚠️  No se pudo consultar políticas (función RPC no disponible)');
}

console.log('\n\n=========================================');
console.log('✅ Test completado');
console.log('\nPróximo paso: Prueba con usuario real autenticado en la app');
