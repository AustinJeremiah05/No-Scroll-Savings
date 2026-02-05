const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://cjkkzrtuoupbdclolhpu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqa2t6cnR1b3VwYmRjbG9saHB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc3OTI5NzgsImV4cCI6MjA1MzM2ODk3OH0.EXO3j_3OdHE5o4dflxoT7iC2VYr5ky09jg6TQKKzpgk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEnsExists() {
  console.log('🔍 Searching for "sylesh.eth" in usage_records...\n');

  // Test 1: Check if any record has user_id = "sylesh.eth"
  const { data: exactMatch, error: error1 } = await supabase
    .from('usage_records')
    .select('*')
    .eq('user_id', 'sylesh.eth')
    .limit(5);

  console.log('Test 1: Exact match for user_id = "sylesh.eth"');
  console.log('Found:', exactMatch?.length || 0, 'records');
  if (exactMatch && exactMatch.length > 0) {
    console.log('Sample:', JSON.stringify(exactMatch[0], null, 2));
  }

  // Test 2: Check if any user_id field is NOT null
  const { data: nonNull, error: error2 } = await supabase
    .from('usage_records')
    .select('user_id')
    .not('user_id', 'is', null)
    .limit(10);

  console.log('\nTest 2: Records with non-null user_id');
  console.log('Found:', nonNull?.length || 0, 'records');
  if (nonNull && nonNull.length > 0) {
    console.log('Unique user_ids:', [...new Set(nonNull.map(r => r.user_id))]);
  }

  // Test 3: Show total count
  const { count } = await supabase
    .from('usage_records')
    .select('*', { count: 'exact', head: true });

  console.log('\nTest 3: Total records in database:', count);

  console.log('\n📋 CONCLUSION:');
  if (exactMatch?.length === 0 && nonNull?.length === 0) {
    console.log('❌ "sylesh.eth" does NOT exist in the database');
    console.log('❌ ALL user_id fields are null/empty');
    console.log('💡 Your mobile app needs to be configured to send user_id = "sylesh.eth"');
  } else if (exactMatch?.length === 0 && nonNull?.length > 0) {
    console.log('⚠️  "sylesh.eth" does NOT exist, but other user_ids do');
    console.log('💡 Mobile app is working, but using different identifiers');
  } else {
    console.log('✅ "sylesh.eth" EXISTS in the database!');
  }
}

checkEnsExists();
