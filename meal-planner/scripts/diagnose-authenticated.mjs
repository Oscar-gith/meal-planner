#!/usr/bin/env node

/**
 * Script para verificar RLS con usuario autenticado
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

// Crear cliente
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔐 VERIFICACIÓN RLS CON USUARIO AUTENTICADO');
console.log('=============================================\n');

// Pedir credenciales o usar credenciales de prueba
const testUser = {
  email: 'test1@example.com',
  password: 'password123'
};

console.log(`Intentando autenticar como: ${testUser.email}`);

const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email: testUser.email,
  password: testUser.password
});

if (authError) {
  console.log(`❌ Error de autenticación: ${authError.message}`);
  console.log('\n⚠️  No hay usuario de prueba configurado.');
  console.log('   Usa credenciales reales de tu base de datos.\n');
  process.exit(1);
}

console.log(`✅ Autenticado como: ${authData.user.email}`);
console.log(`   User ID: ${authData.user.id}\n`);

// Ahora consultar con usuario autenticado
console.log('📊 CONSULTANDO CON USUARIO AUTENTICADO');
console.log('--------------------------------------\n');

// 1. Familias
console.log('👨‍👩‍👧‍👦 FAMILIAS (families)');
const { data: families, error: familiesError } = await supabase
  .from('families')
  .select('*');

if (familiesError) {
  console.log(`❌ Error: ${familiesError.message}`);
} else {
  console.log(`Total: ${families?.length ?? 0}`);
  if (families && families.length > 0) {
    families.forEach(f => {
      console.log(`  ✅ ${f.name}`);
      console.log(`     ID: ${f.id}`);
      console.log(`     Código: ${f.invite_code}`);
      console.log(`     Creado por: ${f.created_by}`);
    });
  } else {
    console.log('⚠️  No hay familias visibles para este usuario');
  }
}

// 2. Miembros
console.log('\n👥 MIEMBROS (family_members)');
const { data: members, error: membersError } = await supabase
  .from('family_members')
  .select('*');

if (membersError) {
  console.log(`❌ Error: ${membersError.message}`);
} else {
  console.log(`Total: ${members?.length ?? 0}`);
  if (members && members.length > 0) {
    members.forEach(m => {
      console.log(`  - Family: ${m.family_id}`);
      console.log(`    User: ${m.user_id}`);
      console.log(`    Role: ${m.role}`);
    });
  }
}

// 3. Planes
console.log('\n📝 PLANES (weekly_plans)');
const { data: plans, error: plansError } = await supabase
  .from('weekly_plans')
  .select('id, name, user_id, family_id');

if (plansError) {
  console.log(`❌ Error: ${plansError.message}`);
} else {
  console.log(`Total: ${plans?.length ?? 0}`);
  if (plans && plans.length > 0) {
    plans.forEach(p => {
      console.log(`  ✅ ${p.name}`);
      console.log(`     ID: ${p.id}`);
      console.log(`     User: ${p.user_id}`);
      console.log(`     Family: ${p.family_id ?? 'NULL'}`);
    });
  }
}

// 4. Ingredientes
console.log('\n🥗 INGREDIENTES (food_ingredients)');
const { data: ingredients, error: ingredientsError } = await supabase
  .from('food_ingredients')
  .select('id, name, user_id, family_id')
  .limit(5);

if (ingredientsError) {
  console.log(`❌ Error: ${ingredientsError.message}`);
} else {
  console.log(`Total visible: ${ingredients?.length ?? 0} (mostrando max 5)`);
}

// Análisis final
console.log('\n🔍 ANÁLISIS FINAL');
console.log('------------------');

if (families && families.length > 0) {
  console.log('✅ ÉXITO: Las políticas RLS están funcionando correctamente');
  console.log('   La familia es visible para el usuario autenticado');
} else {
  console.log('❌ PROBLEMA: Las políticas RLS siguen bloqueando families');
  console.log('   Posibles causas:');
  console.log('   1. La migración no se aplicó correctamente');
  console.log('   2. El usuario no es miembro de ninguna familia');
  console.log('   3. Hay un error en la lógica de las políticas');
}

// Cerrar sesión
await supabase.auth.signOut();

console.log('\n=============================================');
console.log('✅ Verificación completada');
