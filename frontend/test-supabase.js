// Simple Supabase test script
require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY;

console.log('🧪 Testing Supabase Connection...\n');
console.log('📋 Configuration:');
console.log('   URL:', supabaseUrl || '❌ NOT SET');
console.log('   Key:', supabaseKey ? '✅ Set (' + supabaseKey.slice(0, 20) + '...)' : '❌ NOT SET');
console.log('');

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Supabase credentials not configured in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('🔍 Testing connection to usage_records table...\n');
    
    // Test 1: Check if table exists and is accessible
    const { data, error, count } = await supabase
      .from('usage_records')
      .select('*', { count: 'exact', head: false })
      .limit(10);

    if (error) {
      console.log('❌ Error querying usage_records:');
      console.log('   Message:', error.message);
      console.log('   Details:', error.details);
      console.log('   Hint:', error.hint);
      return;
    }

    console.log('✅ Successfully connected to Supabase!');
    console.log('📊 Total records in table:', count);
    console.log('');

    if (data && data.length > 0) {
      console.log('📝 Sample records (last 10):');
      data.slice(0, 10).forEach((record, i) => {
        console.log(`\n   Record ${i + 1}:`);
        console.log('     User:', record.user_address || 'not set');
        console.log('     App:', record.app_name);
        console.log('     Package:', record.package_name);
        console.log('     Timestamp:', new Date(record.timestamp).toLocaleString());
      });
    } else {
      console.log('⚠️  No records found in usage_records table');
      console.log('');
      console.log('💡 To test the system:');
      console.log('   1. Install the mobile app');
      console.log('   2. Use Instagram/Snapchat for a few seconds');
      console.log('   3. The app should send usage data to Supabase');
      console.log('   4. Run this script again to verify');
    }

    console.log('\n✅ Supabase monitoring is properly configured!');
    
  } catch (err) {
    console.log('❌ Unexpected error:', err.message);
  }
}

testConnection();
