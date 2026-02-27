import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';
import { useAuth } from './AuthContext';
import { LogIn, UserPlus, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { User } from '@supabase/supabase-js';

export const Login: React.FC = () => {
  const { setMockAuth } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'driver' | 'supervisor'>('driver');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mock Login Check
    if (email === 'admin' && password === '123456') {
      const mockUser: User = {
        id: 'mock-id',
        email: 'admin@fleetcheck.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      } as User;
      
      const mockProfile = {
        id: 'mock-id',
        full_name: 'Administrador Mock',
        role: 'supervisor' as const,
        created_at: new Date().toISOString(),
      };

      setMockAuth(mockUser, mockProfile);
      return;
    }

    if (!isSupabaseConfigured) {
      setError('O Supabase não está configurado. Verifique as variáveis de ambiente ou use as credenciais de teste (admin / 123456).');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { data: { user }, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) throw signUpError;

        if (user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([{ id: user.id, full_name: fullName, role }]);

          if (profileError) throw profileError;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-zinc-200 p-8"
      >
        {!isSupabaseConfigured && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-100 rounded-xl flex flex-col gap-2 text-amber-700 text-xs">
            <div className="flex items-center gap-2 font-bold">
              <AlertCircle size={14} />
              Configuração Necessária
            </div>
            <p>O Supabase não foi configurado. Para o sistema funcionar, você precisa definir as variáveis <strong>VITE_SUPABASE_URL</strong> e <strong>VITE_SUPABASE_ANON_KEY</strong> nos Secrets do AI Studio.</p>
          </div>
        )}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center mb-4">
            <LogIn className="text-white w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900">FleetCheck</h1>
          <p className="text-zinc-500 text-sm">Gestão inteligente de frotas</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {isSignUp && (
            <>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  placeholder="Seu nome"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Perfil</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full px-4 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                >
                  <option value="driver">Motorista</option>
                  <option value="supervisor">Supervisor</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">E-mail ou Usuário</label>
            <input
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              placeholder="seu@email.com ou 'admin'"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Senha</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Carregando...' : isSignUp ? 'Criar Conta' : 'Entrar'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            {isSignUp ? 'Já tem uma conta? Entre aqui' : 'Não tem conta? Cadastre-se'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
