#!/usr/bin/env node

/**
 * Script para verificar consistencia de datos entre families, family_members y weekly_plans
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

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables de entorno no encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 VERIFICACIÓN DE CONSISTENCIA DE DATOS');
console.log('==========================================\n');

// 1. Obtener planes
console.log('📝 PLANES (weekly_plans)');
console.log('------------------------');

const { data: plans, error: plansError } = await supabase
  .from('weekly_plans')
  .select('id, name, user_id, family_id');

if (plansError) {
  console.log(`❌ Error: ${plansError.message}`);
} else {
  console.log(`Total: ${plans?.length ?? 0}`);
  if (plans && plans.length > 0) {
    plans.forEach(p => {
      console.log(`  - ${p.name}`);
      console.log(`    ID: ${p.id}`);
      console.log(`    User: ${p.user_id}`);
      console.log(`    Family: ${p.family_id ?? 'NULL'}`);
    });
  }
}

// 2. Obtener miembros de familia
console.log('\n👥 MIEMBROS (family_members)');
console.log('----------------------------');

const { data: members, error: membersError } = await supabase
  .from('family_members')
  .select('id, family_id, user_id, role');

if (membersError) {
  console.log(`❌ Error: ${membersError.message}`);
} else {
  console.log(`Total: ${members?.length ?? 0}`);
  if (members && members.length > 0) {
    members.forEach(m => {
      console.log(`  - User: ${m.user_id}`);
      console.log(`    Family: ${m.family_id}`);
      console.log(`    Role: ${m.role}`);
    });
  }
}

// 3. Obtener familias
console.log('\n👨‍👩‍👧‍👦 FAMILIAS (families)');
console.log('----------------------');

const { data: families, error: familiesError } = await supabase
  .from('families')
  .select('id, name, invite_code, created_by');

if (familiesError) {
  console.log(`❌ Error: ${familiesError.message}`);
  console.log(`   Código: ${familiesError.code}`);
  console.log(`   Detalle: ${familiesError.details}`);
} else {
  console.log(`Total: ${families?.length ?? 0}`);
  if (families && families.length > 0) {
    families.forEach(f => {
      console.log(`  - ${f.name}`);
      console.log(`    ID: ${f.id}`);
      console.log(`    Código: ${f.invite_code}`);
      console.log(`    Creador: ${f.created_by}`);
    });
  } else {
    console.log('⚠️  No hay familias visibles o la tabla está vacía');
  }
}

// 4. Análisis de consistencia
console.log('\n🔍 ANÁLISIS DE CONSISTENCIA');
console.log('---------------------------');

if (plans && members) {
  const planFamilyIds = new Set(plans.filter(p => p.family_id).map(p => p.family_id));
  const memberFamilyIds = new Set(members.map(m => m.family_id));
  const familyIds = new Set(families?.map(f => f.id) ?? []);

  console.log(`Family IDs en planes:    ${Array.from(planFamilyIds).join(', ') || 'Ninguno'}`);
  console.log(`Family IDs en miembros:  ${Array.from(memberFamilyIds).join(', ') || 'Ninguno'}`);
  console.log(`Family IDs en families:  ${Array.from(familyIds).join(', ') || 'Ninguno'}`);

  // Verificar inconsistencias
  const orphanPlans = Array.from(planFamilyIds).filter(id => !familyIds.has(id));
  const orphanMembers = Array.from(memberFamilyIds).filter(id => !familyIds.has(id));

  if (orphanPlans.length > 0) {
    console.log(`\n❌ PROBLEMA: Planes apuntan a familias que no existen:`);
    orphanPlans.forEach(id => console.log(`   - Family ID: ${id}`));
  }

  if (orphanMembers.length > 0) {
    console.log(`\n❌ PROBLEMA: Miembros apuntan a familias que no existen:`);
    orphanMembers.forEach(id => console.log(`   - Family ID: ${id}`));
  }

  if (orphanPlans.length === 0 && orphanMembers.length === 0 && familyIds.size > 0) {
    console.log('\n✅ Consistencia OK: Todas las referencias son válidas');
  } else if (familyIds.size === 0 && (planFamilyIds.size > 0 || memberFamilyIds.size > 0)) {
    console.log('\n⚠️  PROBLEMA CRÍTICO: Hay datos huérfanos pero ninguna familia existe');
    console.log('    Posibles causas:');
    console.log('    1. Las políticas RLS bloquean la vista de families');
    console.log('    2. Las familias fueron eliminadas pero quedaron datos huérfanos');
    console.log('    3. Hay un bug en la migración');
  }
}

console.log('\n==========================================');
console.log('✅ Verificación completada');
