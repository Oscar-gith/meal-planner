#!/usr/bin/env node

/**
 * Script para verificar datos SIN RLS (usando service role key)
 * Esto bypasea RLS y muestra el estado real de las tablas
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL no encontrada');
  process.exit(1);
}

if (!serviceRoleKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY no encontrada');
  console.error('   Esta variable debe estar en .env.local');
  console.error('   Búscala en: Supabase Dashboard → Settings → API → service_role key');
  process.exit(1);
}

// Crear cliente con service role (bypasea RLS)
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('🔓 VERIFICACIÓN SIN RLS (Service Role)');
console.log('========================================');
console.log('⚠️  Este script bypasea RLS y muestra TODOS los datos\n');

// 1. Verificar families
console.log('👨‍👩‍👧‍👦 FAMILIAS (families) - TODOS los registros');
console.log('--------------------------------------------------');

const { data: families, error: familiesError } = await supabase
  .from('families')
  .select('*');

if (familiesError) {
  console.log(`❌ Error: ${familiesError.message}`);
} else {
  console.log(`Total en BD: ${families?.length ?? 0}`);
  if (families && families.length > 0) {
    families.forEach(f => {
      console.log(`\n  📁 ${f.name}`);
      console.log(`     ID: ${f.id}`);
      console.log(`     Código invitación: ${f.invite_code}`);
      console.log(`     Creado por: ${f.created_by}`);
      console.log(`     Creado: ${new Date(f.created_at).toLocaleString()}`);
    });
  } else {
    console.log('⚠️  La tabla families está VACÍA - la familia fue eliminada o nunca existió');
  }
}

// 2. Verificar family_members
console.log('\n👥 MIEMBROS (family_members) - TODOS los registros');
console.log('--------------------------------------------------');

const { data: members, error: membersError } = await supabase
  .from('family_members')
  .select('*');

if (membersError) {
  console.log(`❌ Error: ${membersError.message}`);
} else {
  console.log(`Total en BD: ${members?.length ?? 0}`);
  if (members && members.length > 0) {
    members.forEach(m => {
      console.log(`\n  👤 User ID: ${m.user_id}`);
      console.log(`     Family ID: ${m.family_id}`);
      console.log(`     Role: ${m.role}`);
      console.log(`     Se unió: ${new Date(m.joined_at).toLocaleString()}`);
    });
  }
}

// 3. Verificar weekly_plans
console.log('\n📝 PLANES (weekly_plans) - TODOS los registros');
console.log('----------------------------------------------');

const { data: plans, error: plansError } = await supabase
  .from('weekly_plans')
  .select('id, name, user_id, family_id, created_at');

if (plansError) {
  console.log(`❌ Error: ${plansError.message}`);
} else {
  console.log(`Total en BD: ${plans?.length ?? 0}`);
  if (plans && plans.length > 0) {
    plans.forEach(p => {
      console.log(`\n  📋 ${p.name}`);
      console.log(`     ID: ${p.id}`);
      console.log(`     User ID: ${p.user_id}`);
      console.log(`     Family ID: ${p.family_id ?? 'NULL'}`);
      console.log(`     Creado: ${new Date(p.created_at).toLocaleString()}`);
    });
  }
}

// 4. Análisis de consistencia
console.log('\n🔍 ANÁLISIS DE CONSISTENCIA');
console.log('----------------------------');

if (families && members && plans) {
  const familyIds = new Set(families.map(f => f.id));
  const memberFamilyIds = new Set(members.map(m => m.family_id));
  const planFamilyIds = new Set(plans.filter(p => p.family_id).map(p => p.family_id));

  console.log(`\nFamily IDs en tabla families:       ${families.length === 0 ? 'NINGUNO' : Array.from(familyIds).join(', ')}`);
  console.log(`Family IDs en family_members:       ${Array.from(memberFamilyIds).join(', ') || 'Ninguno'}`);
  console.log(`Family IDs en weekly_plans:         ${Array.from(planFamilyIds).join(', ') || 'Ninguno'}`);

  // Detectar datos huérfanos
  const orphanMembers = Array.from(memberFamilyIds).filter(id => !familyIds.has(id));
  const orphanPlans = Array.from(planFamilyIds).filter(id => !familyIds.has(id));

  if (orphanMembers.length > 0) {
    console.log(`\n❌ DATOS HUÉRFANOS en family_members:`);
    orphanMembers.forEach(id => {
      const count = members.filter(m => m.family_id === id).length;
      console.log(`   Family ID ${id}: ${count} miembros huérfanos`);
    });
  }

  if (orphanPlans.length > 0) {
    console.log(`\n❌ DATOS HUÉRFANOS en weekly_plans:`);
    orphanPlans.forEach(id => {
      const count = plans.filter(p => p.family_id === id).length;
      console.log(`   Family ID ${id}: ${count} planes huérfanos`);
    });
  }

  if (orphanMembers.length === 0 && orphanPlans.length === 0 && families.length > 0) {
    console.log('\n✅ CONSISTENCIA OK - Todos los datos están correctos');
  } else if (families.length === 0 && (memberFamilyIds.size > 0 || planFamilyIds.size > 0)) {
    console.log('\n🚨 PROBLEMA CRÍTICO: La tabla families está vacía pero hay datos huérfanos');
    console.log('   Solución: Necesitas recrear la familia o limpiar los datos huérfanos');
  }
}

console.log('\n========================================');
console.log('✅ Verificación completada');
