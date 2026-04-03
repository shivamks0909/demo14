const db = require('better-sqlite3')('data/local.db');

console.log('Adding missing columns to responses table...');

// Add oi_session column if it doesn't exist
try {
  db.exec("ALTER TABLE responses ADD COLUMN oi_session TEXT");
  console.log('✓ Added oi_session column');
} catch (e) {
  if (e.message.includes('duplicate column')) {
    console.log('✓ oi_session column already exists');
  } else {
    console.error('✗ Error adding oi_session:', e.message);
  }
}

// Add session_token column if it doesn't exist
try {
  db.exec("ALTER TABLE responses ADD COLUMN session_token TEXT");
  console.log('✓ Added session_token column');
} catch (e) {
  if (e.message.includes('duplicate column')) {
    console.log('✓ session_token column already exists');
  } else {
    console.error('✗ Error adding session_token:', e.message);
  }
}

// Add hash_identifier column if it doesn't exist
try {
  db.exec("ALTER TABLE responses ADD COLUMN hash_identifier TEXT");
  console.log('✓ Added hash_identifier column');
} catch (e) {
  if (e.message.includes('duplicate column')) {
    console.log('✓ hash_identifier column already exists');
  } else {
    console.error('✗ Error adding hash_identifier:', e.message);
  }
}

// Add user_uid column if it doesn't exist
try {
  db.exec("ALTER TABLE responses ADD COLUMN user_uid TEXT");
  console.log('✓ Added user_uid column');
} catch (e) {
  if (e.message.includes('duplicate column')) {
    console.log('✓ user_uid column already exists');
  } else {
    console.error('✗ Error adding user_uid:', e.message);
  }
}

// Add supplier_uid column if it doesn't exist
try {
  db.exec("ALTER TABLE responses ADD COLUMN supplier_uid TEXT");
  console.log('✓ Added supplier_uid column');
} catch (e) {
  if (e.message.includes('duplicate column')) {
    console.log('✓ supplier_uid column already exists');
  } else {
    console.error('✗ Error adding supplier_uid:', e.message);
  }
}

// Add hash column if it doesn't exist
try {
  db.exec("ALTER TABLE responses ADD COLUMN hash TEXT");
  console.log('✓ Added hash column');
} catch (e) {
  if (e.message.includes('duplicate column')) {
    console.log('✓ hash column already exists');
  } else {
    console.error('✗ Error adding hash:', e.message);
  }
}

// Add supplier_token column if it doesn't exist
try {
  db.exec("ALTER TABLE responses ADD COLUMN supplier_token TEXT");
  console.log('✓ Added supplier_token column');
} catch (e) {
  if (e.message.includes('duplicate column')) {
    console.log('✓ supplier_token column already exists');
  } else {
    console.error('✗ Error adding supplier_token:', e.message);
  }
}

// Add supplier_name column if it doesn't exist
try {
  db.exec("ALTER TABLE responses ADD COLUMN supplier_name TEXT");
  console.log('✓ Added supplier_name column');
} catch (e) {
  if (e.message.includes('duplicate column')) {
    console.log('✓ supplier_name column already exists');
  } else {
    console.error('✗ Error adding supplier_name:', e.message);
  }
}

// Add supplier column if it doesn't exist
try {
  db.exec("ALTER TABLE responses ADD COLUMN supplier TEXT");
  console.log('✓ Added supplier column');
} catch (e) {
  if (e.message.includes('duplicate column')) {
    console.log('✓ supplier column already exists');
  } else {
    console.error('✗ Error adding supplier:', e.message);
  }
}

// Add device_type column if it doesn't exist
try {
  db.exec("ALTER TABLE responses ADD COLUMN device_type TEXT");
  console.log('✓ Added device_type column');
} catch (e) {
  if (e.message.includes('duplicate column')) {
    console.log('✓ device_type column already exists');
  } else {
    console.error('✗ Error adding device_type:', e.message);
  }
}

// Add country_code column if it doesn't exist
try {
  db.exec("ALTER TABLE responses ADD COLUMN country_code TEXT");
  console.log('✓ Added country_code column');
} catch (e) {
  if (e.message.includes('duplicate column')) {
    console.log('✓ country_code column already exists');
  } else {
    console.error('✗ Error adding country_code:', e.message);
  }
}

// Add last_landing_page column if it doesn't exist
try {
  db.exec("ALTER TABLE responses ADD COLUMN last_landing_page TEXT");
  console.log('✓ Added last_landing_page column');
} catch (e) {
  if (e.message.includes('duplicate column')) {
    console.log('✓ last_landing_page column already exists');
  } else {
    console.error('✗ Error adding last_landing_page:', e.message);
  }
}

// Add start_time column if it doesn't exist
try {
  db.exec("ALTER TABLE responses ADD COLUMN start_time TEXT");
  console.log('✓ Added start_time column');
} catch (e) {
  if (e.message.includes('duplicate column')) {
    console.log('✓ start_time column already exists');
  } else {
    console.error('✗ Error adding start_time:', e.message);
  }
}

// Add duration_seconds column if it doesn't exist
try {
  db.exec("ALTER TABLE responses ADD COLUMN duration_seconds INTEGER");
  console.log('✓ Added duration_seconds column');
} catch (e) {
  if (e.message.includes('duplicate column')) {
    console.log('✓ duration_seconds column already exists');
  } else {
    console.error('✗ Error adding duration_seconds:', e.message);
  }
}

// Add client_pid column if it doesn't exist
try {
  db.exec("ALTER TABLE responses ADD COLUMN client_pid TEXT");
  console.log('✓ Added client_pid column');
} catch (e) {
  if (e.message.includes('duplicate column')) {
    console.log('✓ client_pid column already exists');
  } else {
    console.error('✗ Error adding client_pid:', e.message);
  }
}

// Add completion_time column if it doesn't exist
try {
  db.exec("ALTER TABLE responses ADD COLUMN completion_time TEXT");
  console.log('✓ Added completion_time column');
} catch (e) {
  if (e.message.includes('duplicate column')) {
    console.log('✓ completion_time column already exists');
  } else {
    console.error('✗ Error adding completion_time:', e.message);
  }
}

console.log('\nSchema update complete!');
