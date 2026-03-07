import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
    console.log('Cleaning up duplicate reports from the infinite loop...');
    const { data, error } = await supabase.from('system_reports').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) {
        console.error('Failed to clean reports:', error);
    } else {
        console.log('Deleted all reports successfully to clean up duplicates.');
    }
}
main();
