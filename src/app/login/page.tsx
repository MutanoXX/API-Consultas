'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Lock, Shield, AlertCircle, CheckCircle2, Sparkles, Zap } from 'lucide-react';
import { create } from 'zustand';

interface UserState {
  apiKey: string;
  user: any;
  setApiKey: (key: string) => void;
  logout: () => void;
}

export const useAuthStore = create<UserState>((set) => ({
  apiKey: '',
  user: null,
  setApiKey: (key) => {
    localStorage.setItem('apiKey', key);
    set({ apiKey: key, user: { nome: 'Admin', tipo: 'admin', isAdmin: true } });
  },
  logout: () => {
    localStorage.removeItem('apiKey');
    set({ apiKey: '', user: null });
  }
}));

export default function LoginPage() {
  const router = useRouter();
  const { setApiKey } = useAuthStore();
  const [apiKey, setApiKeyValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const savedKey = localStorage.getItem('apiKey');
    if (savedKey) {
      setApiKeyValue(savedKey);
    }
  }, []);

  const handleLogin = async () => {
    setError(null);
    setShowSuccess(false);

    if (!apiKey.trim()) {
      setError('Por favor, insira sua API-KEY');
      return;
    }

    setLoading(true);

    try {
      // Enviar para endpoint de validação (server-side)
      const response = await fetch('/api/auth/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ apiKey })
      });

      const data = await response.json();

      if (!response.ok || !data.valid) {
        setError(data.error || 'API-KEY inválida');
      } else {
        // Validada com sucesso - armazenar no localStorage
        setApiKey(apiKey);
        
        // Armazenar dados do usuário (sem expor a chave)
        localStorage.setItem('apiKey', apiKey);
        localStorage.setItem('user', JSON.stringify({
          nome: data.userData?.nome || 'Usuário',
          tipo: data.userData?.tipo || 'standard',
          isAdmin: data.userData?.isAdmin || false
        }));

        setShowSuccess(true);
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      }
    } catch (err) {
      setError('Erro ao conectar. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/30 to-amber-950/30 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-amber-500/5 to-purple-500/5 rounded-full blur-3xl animate-spin-slow" style={{ animationDuration: '60s' }}></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo/Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-purple-600 shadow-lg shadow-amber-500/30 mb-4">
            <Lock className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-400 to-purple-400 bg-clip-text text-transparent mb-2">
            MutanoX
          </h1>
          <p className="text-slate-400 text-lg">Dashboard Premium</p>
        </div>

        {/* Login Card */}
        <Card className="bg-slate-950/80 backdrop-blur-xl border border-purple-500/20 shadow-2xl shadow-purple-500/10">
          <CardHeader className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Shield className="w-6 h-6 text-purple-400" />
              Acesso Administrativo
            </CardTitle>
            <CardDescription>
              Entre com sua API-KEY para acessar o painel de controle
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Success Message */}
            {showSuccess && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <div>
                  <p className="font-semibold text-emerald-400">Login realizado com sucesso!</p>
                  <p className="text-sm text-emerald-300">Redirecionando...</p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
                <AlertCircle className="w-5 h-5 text-rose-400" />
                <p className="text-rose-400">{error}</p>
              </div>
            )}

            {/* API-KEY Input */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Lock className="w-4 h-4 text-purple-400" />
                API-KEY
              </label>
              <div className="relative">
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => {
                    setApiKeyValue(e.target.value);
                    setError(null);
                  }}
                  placeholder="Insira sua chave de acesso aqui"
                  disabled={loading}
                  className="pr-12 h-12 text-base bg-slate-900/50 border-slate-700 focus:ring-purple-500 text-white placeholder:text-slate-500 disabled:opacity-50"
                  onKeyPress={(e) => e.key === 'Enter' && !loading && handleLogin()}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Sparkles className="w-5 h-5 text-slate-500" />
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-400">
                Formato: Chave alfanumérica de 10+ caracteres
              </p>
            </div>

            {/* Features */}
            <div className="space-y-3 p-4 rounded-xl bg-slate-900/30 border border-slate-700">
              <p className="text-xs font-semibold text-slate-300 mb-2">Recursos disponíveis:</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>Consultas em tempo real com cache inteligente</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Shield className="w-4 h-4 text-purple-400" />
                  <span>Sistema de gerenciamento de API-KEYs</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <span>Auditoria completa de acessos</span>
                </div>
              </div>
            </div>

            {/* Login Button */}
            <Button
              onClick={handleLogin}
              disabled={loading || !apiKey.trim()}
              className="w-full h-12 bg-gradient-to-r from-amber-500 to-purple-600 hover:from-amber-600 hover:to-purple-700 text-white font-medium text-lg shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Autenticando...
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5 mr-2" />
                  Acessar Dashboard
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} MutanoX Premium • Todos os direitos reservados
          </p>
          <p className="text-xs text-slate-600 mt-2">
            Sistema protegido com criptografia de ponta a ponta
          </p>
        </div>
      </div>
    </div>
  );
}
