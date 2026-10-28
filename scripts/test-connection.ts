import 'dotenv/config';
import { supabase } from '../lib/supabase';

async function testSupabaseConnection() {
  console.log('\n======================================================');
  console.log('   Doubt Chain - Supabase Cloud Connection Tester');
  console.log('======================================================\n');

  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  // 1. Check if .env credentials are set
  if (!url || url.includes('YOUR_PROJECT_ID')) {
    console.error('❌ Error: SUPABASE_URL is missing or still set to placeholder in .env');
    console.log('👉 Please paste your Supabase Project URL into .env\n');
    process.exit(1);
  }

  if (!anonKey || anonKey.includes('YOUR_ANON_KEY_HERE')) {
    console.error('❌ Error: SUPABASE_ANON_KEY is missing or still set to placeholder in .env');
    console.log('👉 Please paste your anon public key into .env\n');
    process.exit(1);
  }

  console.log(`Connecting to: ${url}`);

  try {
    // 2. Query universities table to test connectivity & schema
    const { data: universities, error } = await supabase
      .from('universities')
      .select('id, name, allowed_domains')
      .limit(5);

    if (error) {
      if (error.code === '42P01') {
        console.error('\n❌ Connection succeeded, but tables were NOT found in your database!');
        console.log('👉 You need to run the migrations in your Supabase SQL Editor:');
        console.log('   1. 001_initial_schema.sql');
        console.log('   2. 002_search_rpc.sql');
        console.log('   3. 003_auth_trigger.sql');
        console.log('   4. 004_gamification_triggers.sql\n');
      } else {
        console.error('\n❌ Database query failed:', error.message);
      }
      process.exit(1);
    }

    console.log('\n Database connection SUCCESSFUL!');
    console.log(` Tables verified. Found ${universities.length} university tenant(s) in database:`);

    if (universities.length === 0) {
      console.log('   ⚠️  No universities registered yet. Run this in your Supabase SQL Editor:');
      console.log("   INSERT INTO public.universities (name, allowed_domains) VALUES ('SRM University', ARRAY['srmist.edu.in', 'srm.edu']);");
    } else {
      universities.forEach((u) => {
        console.log(`   - ${u.name} (Domains: ${u.allowed_domains.join(', ')})`);
      });
    }

    console.log('\n All systems operational. Your backend is connected to Supabase Cloud!\n');
  } catch (err: any) {
    console.error('\n❌ Network or configuration error:', err.message);
    process.exit(1);
  }
}

testSupabaseConnection();
