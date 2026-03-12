import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const superEmail = 'super@fleetcheck.com';
const superPass = '965596';

if (!supabaseUrl || !supabaseKey) {
    console.error('ERRO: VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são necessários no arquivo .env.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runBuild() {
    try {
        console.log('🚀 Iniciando processo de Build Automatizado...');

        // 1. Autenticar como Super Usuário para ter permissão de escrita
        console.log('🔐 Autenticando...');
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: superEmail,
            password: superPass
        });

        if (authError) throw new Error('Erro na autenticação: ' + authError.message);
        const userId = authData.user.id;

        // 2. Obter última versão
        console.log('🔢 Buscando última versão no banco...');
        const { data: lastVersion, error: fetchError } = await supabase
            .from('app_versions')
            .select('version_number')
            .order('version_number', { ascending: false })
            .limit(1)
            .single();

        let nextVersion = 1;
        if (lastVersion) {
            nextVersion = lastVersion.version_number + 1;
        }
        console.log(`✅ Próxima versão: 1.0.${nextVersion}`);

        // 3. Obter Info do Git
        console.log('🌿 Coletando informações do Git...');
        const commitHash = execSync('git rev-parse HEAD').toString().trim();
        const commitMsg = process.argv[2] || `Build v1.0.${nextVersion} - Auto Update`;

        // 4. Salvar nova versão no Banco
        console.log('💾 Salvando versão no Supabase...');
        const { error: insertError } = await supabase
            .from('app_versions')
            .insert({
                version_number: nextVersion,
                commit_hash: commitHash,
                commit_message: commitMsg
            });

        if (insertError) throw new Error('Erro ao salvar versão: ' + insertError.message);

        // 5. Git Operations
        console.log('📤 Enviando para o GitHub...');
        execSync('git add .');
        try {
            execSync(`git commit -m "${commitMsg}"`);
        } catch (e) {
            console.log('ℹ️ Nada para commitar (ou commit já realizado).');
        }
        execSync('git push');
        console.log('✅ GitHub sincronizado!');

        // 6. Deploy para Git Pages
        console.log('🏗️ Gerando build e fazendo Deploy (Git Pages)...');
        execSync('npm run deploy', { stdio: 'inherit' });

        console.log(`\n✨ SUCESSO! Sistema atualizado para v1.0.${nextVersion}`);
        console.log(`🔗 Link: https://DevCled85.github.io/freetVeiculos`);

    } catch (error) {
        console.error('\n❌ ERRO NO BUILD:', error.message);
        process.exit(1);
    }
}

runBuild();
