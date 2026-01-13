'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Sparkles } from 'lucide-react';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirecionar para login se não estiver autenticado
    const apiKey = localStorage.getItem('apiKey');
    if (apiKey) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/30 to-amber-950/30 flex items-center justify-center">
      <div className="text-center">
        <div className="relative inline-flex">
          <Lock className="w-20 h-20 text-purple-400 animate-pulse" />
          <Sparkles className="w-8 h-8 text-amber-400 absolute -top-2 -right-2 animate-pulse" style={{ animationDelay: '0.5s' }} />
        </div>
        <p className="mt-8 text-xl text-slate-400">Carregando...</p>
      </div>
    </div>
  );
}
