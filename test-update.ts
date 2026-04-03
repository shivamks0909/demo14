import { createClient } from '@insforge/sdk';
import { config } from 'dotenv';
config({ path: '.env.local' });

// Setup DB connection
const db = createClient({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL,
    anonKey: process.env.INSFORGE_API_KEY
});

async function testUpdate() {
    console.log("Fetching record...");
    const { data: record } = await db.database.from('responses').select('id, status, start_time').eq('oi_session', 'd8eb130a-b411-425a-91e7-192ca6a0e79b').maybeSingle();
    
    if (!record) {
        console.log("No record");
        return;
    }
    
    console.log("Record:", record);
    
    const updatePayload = {
        status: 'complete',
        completed_at: new Date().toISOString()
    };
    
    const { data, error } = await db.database
        .from('responses')
        .update(updatePayload)
        .eq('id', record.id)
        .in('status', ['in_progress', 'started', 'click'])
        .select()
        .maybeSingle();

    console.log("Update result:", error ? "Error - " + error.message : "Success");
    console.log(data);
}

testUpdate();
