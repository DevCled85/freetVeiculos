import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

    // Login as William (Assuming he is the supervisor)
    const { data: { session }, error: authError } = await supabase.auth.signInWithPassword({
        email: 'william@fleetcheck.local',
        password: 'password123'
    });

    if (authError || !session) {
        console.error("Auth error", authError);
        return;
    }

    console.log("Calling function as supervisor...");
    const result = await supabase.functions.invoke('create-user', {
        body: { username: "testuser22", password: "password123", role: "driver" }
    });
    console.log("Result:", JSON.stringify(result, null, 2));
}

test();
