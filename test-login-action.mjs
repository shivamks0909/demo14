import { getUnifiedDb } from './lib/unified-db.ts';
import bcrypt from 'bcryptjs';

async function testLogin() {
  try {
    console.log('Testing login action...');
    const { database: db, source } = await getUnifiedDb();
    console.log('Database source:', source);
    
    // Query admins table
    const email = 'admin@opinioninsights.in';
    const { data, error } = await db.from('admins').select('*').eq('email', email).maybeSingle();
    
    console.log('Query result:', {
      hasData: !!data,
      error: error?.message,
      data: data ? { id: data.id, email: data.email, name: data.name } : null
    });
    
    if (data) {
      const password = 'admin123';
      const storedPwd = data.password_hash || data.password || '';
      console.log('Stored password starts with:', storedPwd.substring(0, 10));
      
      let match = false;
      if (storedPwd.startsWith('$2b$') || storedPwd.startsWith('$2a$')) {
        match = await bcrypt.compare(password, storedPwd);
      } else {
        match = storedPwd === password;
      }
      
      console.log('Password match:', match);
    }
    
  } catch (err) {
    console.error('Login test error:', err.message);
  }
}

testLogin();
