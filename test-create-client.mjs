import 'dotenv/config';
import { dashboardService } from './lib/dashboardService.ts';

async function test() {
    console.log('Testing client creation with InsForge backend...');
    console.log('URL:', process.env.NEXT_PUBLIC_INSFORGE_URL);
    
    try {
        const clientName = 'Test Client ' + Date.now();
        console.log('Creating client:', clientName);
        const { data, error } = await dashboardService.createClient(clientName);
        
        if (error) {
            console.error('Error creating client:', error);
            process.exit(1);
        }
        
        console.log('Successfully created client:', data);
        if (data && data.id) {
            console.log('ID:', data.id);
            if (data.id.length > 30) {
                console.log('ID looks like a UUID. Success!');
            }
        }
    } catch (err) {
        console.error('Unexpected error:', err);
        process.exit(1);
    }
}

test();
