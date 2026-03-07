import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
    const { data: vehicles, error: vError } = await supabase.from('vehicles').select('*');
    if (vError) { console.error(vError); return; }

    for (const vehicle of vehicles || []) {
        // Fetch all fuel logs for this vehicle to find the earliest mileage recorded in a log
        const { data: logs, error: lError } = await supabase
            .from('fuel_logs')
            .select('mileage, created_at')
            .eq('vehicle_id', vehicle.id)
            .order('created_at', { ascending: true }); // Earliest first

        if (lError) {
            console.error(`Error fetching logs for ${vehicle.plate}:`, lError);
            continue;
        }

        if (logs && logs.length > 0) {
            const earliestLogMileage = logs[0].mileage;
            console.log(`Plate: ${vehicle.plate} | Current in DB: ${vehicle.mileage} | Earliest log: ${earliestLogMileage}`);

            // Revert! 
            await supabase.from('vehicles').update({ mileage: earliestLogMileage }).eq('id', vehicle.id);
            console.log(`Updated ${vehicle.plate} back to ${earliestLogMileage}`);
        } else {
            console.log(`Plate: ${vehicle.plate} | Current in DB: ${vehicle.mileage} | No logs`);
        }
    }
}

main().catch(console.error);
