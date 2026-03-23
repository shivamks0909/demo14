const { createClient } = require('@insforge/sdk');

async function updatePassword() {
    const url = 'https://ckj5ikqw.us-east.insforge.app';
    const key = 'ik_4c280b49c0ff95cf76486c648177850d';
    const client = createClient({ baseUrl: url, anonKey: key });

    const hash = '$2b$10$W1wkMk36BXXPMqiUL1vP1uyz2cXTGKxRX9y6r2hnbYJA/QQiesNCq';
    const email = 'admin@opinioninsights.com';

    console.log(`Updating ${email} with hash of length ${hash.length}...`);
    
    const { data, error } = await client.database
        .from('admins')
        .update({ password_hash: hash })
        .eq('email', email)
        .select();

    if (error) {
        console.error('Update failed:', error);
    } else {
        console.log('Update successful:', JSON.stringify(data, null, 2));
    }
}

updatePassword();
