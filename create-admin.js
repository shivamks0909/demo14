const { createClient } = require('@insforge/sdk');
const bcrypt = require('bcrypt');

async function createAdmin() {
  const client = createClient({
    baseUrl: 'https://ckj5ikqw.us-east.insforge.app',
    anonKey: 'ik_4c280b49c0ff95cf76486c648177850d'
  });

  // Generate hash
  const password = 'admin123';
  const hash = await bcrypt.hash(password, 10);

  console.log('Generated hash:', hash);

  // Verify hash works
  const verified = await bcrypt.compare(password, hash);
  console.log('Hash verification:', verified);

  // Delete old admin
  const { error: deleteError } = await client.database
    .from('admins')
    .delete()
    .eq('email', 'admin@opinioninsights.com');

  if (deleteError) {
    console.error('Delete error:', deleteError);
  } else {
    console.log('Old admin deleted');
  }

  // Insert new admin
  const { data, error } = await client.database
    .from('admins')
    .insert({
      email: 'admin@opinioninsights.com',
      password_hash: hash
    })
    .select();

  if (error) {
    console.error('Insert error:', error);
  } else {
    console.log('Admin created successfully:', data);
  }

  // Verify in database
  const { data: checkData, error: checkError } = await client.database
    .from('admins')
    .select('email, password_hash')
    .eq('email', 'admin@opinioninsights.com')
    .single();

  if (checkError) {
    console.error('Check error:', checkError);
  } else {
    console.log('Admin in database:', checkData.email);
    console.log('Hash in DB:', checkData.password_hash);

    // Verify the hash from database
    const dbVerified = await bcrypt.compare(password, checkData.password_hash);
    console.log('DB hash verification:', dbVerified);
  }
}

createAdmin().catch(console.error);
