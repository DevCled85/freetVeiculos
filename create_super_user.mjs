import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY; // Em dev, a anon key funciona se RLS permitir, ou com service_role

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required in .env file.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createSuperUser() {
    const email = 'super@fleetcheck.com';
    const password = '965596';

    console.log('Creating developer super user...');

    // 1. Sign up the user
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
    });

    if (authError) {
        if (authError.message.includes('User already registered')) {
            console.log('User already registered, updating profile directly...');
            // We can't get auth.users ID using anon key easily if already registered, 
            // need to sign in to get the user ID, update profile.
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                email, password
            });

            if (signInError) {
                console.error('Error signing in to update profile:', signInError.message);
                return;
            }

            await updateProfile(signInData.user.id);
            return;
        } else {
            console.error('Error creating user:', authError.message);
            return;
        }
    }

    if (authData.user) {
        console.log('User created successfully. User ID:', authData.user.id);
        await updateProfile(authData.user.id);
    }
}

async function updateProfile(userId) {
    console.log(`Updating profile for user ID: ${userId} to supervisor and full_name: Desenvolvedor (Super)...`);

    const { data, error } = await supabase
        .from('profiles')
        .update({
            role: 'supervisor',
            full_name: 'Desenvolvedor (Super)',
            is_super: true
        })
        .eq('id', userId)
        .select();

    if (error) {
        console.error('Error updating profile:', error.message);
    } else {
        console.log('Profile updated successfully:', data);
    }
}

createSuperUser();
