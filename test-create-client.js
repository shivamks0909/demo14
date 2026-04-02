require('dotenv').config({ path: '.env.local' });
const { dashboardService } = require('./lib/dashboardService');

async function test() {
    console.log('Testing client creation with InsForge backend...');
    console.log('URL:', process.env.NEXT_PUBLIC_INSFORGE_URL);
    
    try {
        const clientName = 'Test Client ' + Date.now();
        const { data, error } = await dashboardService.createClient(clientName);
        
        if (error) {
            console.error('Error creating client:', error);
            process.exit(1);
        }
        
        console.log('Successfully created client:', data);
        console.log('ID:', data.id);
        
        if (data.id && data.id.length > 30) {
            console.log('ID looks like a UUID. Success!');
        } else {
            console.warn('Warning: ID does not look like a UUID:', data.id);
        }
        
    } catch (err) {
        console.error('Unexpected error:', err);
        process.exit(1);
    }
}

test();
