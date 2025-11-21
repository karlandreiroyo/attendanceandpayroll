// Node.js script to check attendance table foreign key constraints
// Run with: node check-attendance-schema.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_KEY in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('🔍 Checking attendance table foreign key constraints...\n');

  // Check attendance table structure
  console.log('1. Checking attendance table columns:');
  const { data: attendanceColumns, error: colError } = await supabase
    .rpc('exec_sql', {
      query: `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'attendance'
        ORDER BY ordinal_position;
      `
    });

  if (colError) {
    // Try direct query instead
    const { data: testData, error: testError } = await supabase
      .from('attendance')
      .select('*')
      .limit(1);
    
    if (testError) {
      console.error('❌ Error accessing attendance table:', testError.message);
    } else {
      console.log('✅ Attendance table exists. Columns:', Object.keys(testData[0] || {}));
    }
  } else {
    console.log(attendanceColumns);
  }

  // Check users table structure
  console.log('\n2. Checking users table columns:');
  const { data: usersData, error: usersError } = await supabase
    .from('users')
    .select('*')
    .limit(1);

  if (usersError) {
    console.error('❌ Error accessing users table:', usersError.message);
  } else {
    console.log('✅ Users table exists. Columns:', Object.keys(usersData[0] || {}));
  }

  // Check if employee_id exists in users
  console.log('\n3. Testing employee_id lookup:');
  const testEmployeeId = '7f8a1741-d44a-4157-8206-c9302f828da9';
  
  // Try user_id
  const { data: userById, error: userByIdError } = await supabase
    .from('users')
    .select('user_id, id, first_name, last_name')
    .eq('user_id', testEmployeeId)
    .maybeSingle();

  console.log('   By user_id:', userById ? `✅ Found: ${userById.first_name} ${userById.last_name}` : '❌ Not found');

  // Try id
  const { data: userById2, error: userById2Error } = await supabase
    .from('users')
    .select('user_id, id, first_name, last_name')
    .eq('id', testEmployeeId)
    .maybeSingle();

  console.log('   By id:', userById2 ? `✅ Found: ${userById2.first_name} ${userById2.last_name}` : '❌ Not found');

  console.log('\n💡 Recommendation:');
  if (userById2 && !userById) {
    console.log('   The foreign key likely references users.id, not users.user_id');
    console.log('   Update the code to use users.id instead of users.user_id');
  } else if (userById && !userById2) {
    console.log('   The foreign key likely references users.user_id');
    console.log('   The issue might be a data type mismatch or the user doesn\'t exist');
  } else {
    console.log('   Neither user_id nor id matches. The employee might not exist in the database.');
  }
}

checkSchema().catch(console.error);

