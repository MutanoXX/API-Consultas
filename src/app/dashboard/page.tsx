'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../login/page';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  LayoutDashboard, FileText, Search, Settings, Key, Shield,
  Clock, Zap, Database, TrendingUp, LogOut, Plus,
  Activity, BarChart3, RefreshCw
} from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, 
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, ComposedChart, 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

const COLORS = {
  purple: '#8b5cf6',
  amber: '#f59e0b',
  pink: '#ec4899',
  emerald: '#10b981',
  cyan: '#06b6d4'
};

export default function DashboardPage() {
  const router = useRouter();
  const { apiKey, user, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Simular dados
  const [stats, setStats] = useState({
    totalConsultas: 1250,
    consultasSucesso: 1180,
    consultasErro: 70,
    consultasCPF: 450,
    consultasNome: 380,
    consultasNumero: 420,
    cacheHitRate: 67.5,
    avgResponseTime: 1250
  });

  useEffect(() => {
    if (!apiKey) {
      router.push('/login');
    }
  }, [apiKey, router]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const sidebarItems = [
    { icon: LayoutDashboard, label: 'Visão Geral', value: 'overview' },
    { icon: Activity, label: 'Atividade', value: 'atividade' },
    { icon: Key, label: 'API Keys', value: 'apikeys' },
    { icon: FileText, label: 'Consultas', value: 'consultas' },
    { icon: Search, label: 'Testar API', value: 'teste' },
    { icon: Settings, label: 'Configurações', value: 'config' },
  ];

  // Dados para gráficos
  const hourlyData = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}:00`,
    consultas: Math.floor(Math.random() * 50) + 20,
    sucesso: Math.floor(Math.random() * 45) + 15,
    erro: Math.floor(Math.random() * 5)
  }));

  const weeklyData = [
    { day: 'Dom', consultas: 120 },
    { day: 'Seg', consultas: 180 },
    { day: 'Ter', consultas: 165 },
    { day: 'Qua', consultas: 200 },
    { day: 'Qui', consultas: 175 },
    { day: 'Sex', consultas: 220 },
    { day: 'Sáb', consultas: 190 }
  ];

  const pieData = [
    { name: 'CPF', value: stats.consultasCPF, color: COLORS.purple },
    { name: 'Nome', value: stats.consultasNome, color: COLORS.amber },
    { name: 'Número', value: stats.consultasNumero, color: COLORS.pink }
  ];

  const radarData = [
    { subject: 'Performance', A: 85, fullMark: 100 },
    { subject: 'Confiabilidade', A: 92, fullMark: 100 },
    { subject: 'Velocidade', A: 78, fullMark: 100 },
    { subject: 'Segurança', A: 95, fullMark: 100 },
    { subject: 'Cache', A: 88, fullMark: 100 },
    { subject: 'Disponibilidade', A: 99, fullMark: 100 }
  ];

  const responseTimeData = Array.from({ length: 7 }, (_, i) => ({
    day: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][i],
    tempo: Math.floor(Math.random() * 500) + 800
  }));

  const cacheData = [
    { name: 'Cache Hit', value: stats.cacheHitRate },
    { name: 'Cache Miss', value: 100 - stats.cacheHitRate }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-amber-950/20 text-white">
      {/* Background Animation */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-purple-500/5 via-amber-500/5 to-pink-500/5 animate-spin-slow" style={{ animationDuration: '60s' }}></div>
      </div>

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-full bg-gradient-to-b from-slate-950/95 via-purple-950/40 to-amber-950/40 backdrop-blur-xl border-r border-amber-500/20 z-40 transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-72'}`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-amber-500/20">
            <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-purple-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <Shield className="w-6 h-6 text-white" />
              </div>
              {!sidebarCollapsed && (
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-amber-400 to-purple-400 bg-clip-text text-transparent">
                    MutanoX
                  </h1>
                  <p className="text-xs text-slate-400">Premium Dashboard</p>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.value;
              return (
                <button
                  key={item.value}
                  onClick={() => setActiveTab(item.value)}
                  className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-500/20 to-purple-500/20 border border-amber-500/30 text-amber-400'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-amber-400' : ''}`} />
                  {!sidebarCollapsed && <span className="font-medium text-sm">{item.label}</span>}
                </button>
              );
            })}
          </nav>

          {/* User */}
          <div className="p-4 border-t border-amber-500/20">
            <div className={`flex flex-col ${sidebarCollapsed ? 'items-center' : 'gap-3'}`}>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-gradient-to-r from-amber-500/10 to-purple-500/10">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-purple-600 flex items-center justify-center text-xs font-bold">
                  {user?.nome?.[0] || 'A'}
                </div>
                {!sidebarCollapsed && <span className="text-sm text-slate-300">{user?.nome || 'Admin'}</span>}
              </div>
              {!sidebarCollapsed && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-rose-400 hover:bg-rose-500/10 w-full justify-start gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Sair
                </Button>
              )}
              {sidebarCollapsed && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-rose-400 hover:bg-rose-500/10"
                >
                  <LogOut className="w-5 h-5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-20' : 'ml-72'}`}>
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-gradient-to-r from-slate-950/90 via-purple-950/60 to-amber-950/60 backdrop-blur-xl border-b border-amber-500/20">
          <div className="px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold text-white">Dashboard Premium</h2>
                <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                  <span className="text-sm font-medium text-emerald-400">Sistema Online</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/20 border border-purple-500/30">
                  <Database className="w-4 h-4 text-purple-400" />
                  <span className="text-sm text-slate-300">Cache: {stats.cacheHitRate}%</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/20 border border-amber-500/30">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span className="text-sm text-slate-300">{stats.avgResponseTime}ms</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Atualizar
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-8">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-slate-950 via-purple-950/30 to-slate-950 border border-purple-500/20 hover:border-purple-500/40 transition-all">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-purple-400 text-xs font-medium">Total de Consultas</CardDescription>
                    <CardTitle className="text-3xl font-bold">{stats.totalConsultas}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-emerald-400">
                      <TrendingUp className="w-4 h-4" />
                      <span>+12.5% essa semana</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-slate-950 via-emerald-950/30 to-slate-950 border border-emerald-500/20 hover:border-emerald-500/40 transition-all">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-emerald-400 text-xs font-medium">Sucesso</CardDescription>
                    <CardTitle className="text-3xl font-bold text-emerald-400">{stats.consultasSucesso}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-emerald-500 to-green-400" style={{ width: `${(stats.consultasSucesso / stats.totalConsultas * 100).toFixed(1)}%` }}></div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-slate-950 via-rose-950/30 to-slate-950 border border-rose-500/20 hover:border-rose-500/40 transition-all">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-rose-400 text-xs font-medium">Erros</CardDescription>
                    <CardTitle className="text-3xl font-bold text-rose-400">{stats.consultasErro}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-400">Requer atenção</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-slate-950 via-amber-950/30 to-slate-950 border border-amber-500/20 hover:border-amber-500/40 transition-all">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-amber-400 text-xs font-medium">Taxa de Sucesso</CardDescription>
                    <CardTitle className="text-3xl font-bold text-amber-400">{((stats.consultasSucesso / stats.totalConsultas) * 100).toFixed(1)}%</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-emerald-400">Excelente</p>
                  </CardContent>
                </Card>
              </div>

              {/* Advanced Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Line Chart - Consultas por Hora */}
                <Card className="bg-gradient-to-br from-slate-950/80 to-slate-950 border border-slate-700">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-purple-400" />
                      Consultas por Hora (24h)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={hourlyData}>
                        <defs>
                          <linearGradient id="colorConsultas" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={COLORS.purple} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={COLORS.purple} stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorSucesso" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={COLORS.emerald} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={COLORS.emerald} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="hour" stroke="#64748b" />
                        <YAxis stroke="#64748b" />
                        <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: '12px' }} />
                        <Legend />
                        <Area type="monotone" dataKey="consultas" stroke={COLORS.purple} fillOpacity={1} fill="url(#colorConsultas)" strokeWidth={2} />
                        <Line type="monotone" dataKey="sucesso" stroke={COLORS.emerald} strokeWidth={2} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Composed Chart - Semanal */}
                <Card className="bg-gradient-to-br from-slate-950/80 to-slate-950 border border-slate-700">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-amber-400" />
                      Comparativo Semanal
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={weeklyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="day" stroke="#64748b" />
                        <YAxis stroke="#64748b" />
                        <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '12px' }} />
                        <Bar dataKey="consultas" fill={COLORS.amber} radius={[4, 4, 4, 4]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Pie Chart - Distribuição */}
                <Card className="bg-gradient-to-br from-slate-950/80 to-slate-950 border border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-slate-300">Distribuição por Tipo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={60}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '12px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Cache Performance */}
                <Card className="bg-gradient-to-br from-slate-950/80 to-slate-950 border border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-slate-300">Performance do Cache</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={cacheData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={60}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          <Cell fill={COLORS.purple} />
                          <Cell fill={COLORS.amber} />
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: '12px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Response Time */}
                <Card className="bg-gradient-to-br from-slate-950/80 to-slate-950 border border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-slate-300">Tempo Médio de Resposta</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center mb-4">
                      <p className="text-4xl font-bold text-purple-400">{stats.avgResponseTime}</p>
                      <p className="text-sm text-slate-400">milissegundos</p>
                    </div>
                    <ResponsiveContainer width="100%" height={150}>
                      <AreaChart data={responseTimeData}>
                        <defs>
                          <linearGradient id="colorResponse" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={COLORS.purple} stopOpacity={0.5} />
                            <stop offset="95%" stopColor={COLORS.purple} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="day" stroke="#64748b" fontSize={10} />
                        <YAxis stroke="#64748b" fontSize={10} />
                        <Area type="monotone" dataKey="tempo" stroke={COLORS.purple} fillOpacity={1} fill="url(#colorResponse)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Radar Chart - Performance Metrics */}
              <Card className="bg-gradient-to-br from-slate-950/80 to-slate-950 border border-slate-700">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-slate-300">Métricas de Desempenho</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="rgba(255,255,255,0.1)" />
                      <PolarAngleAxis dataKey="subject" stroke="#64748b" tick={{ fontSize: 10 }} />
                      <PolarRadiusAxis angleCount={5} stroke="#64748b" tick={{ fontSize: 10 }} />
                      <Radar
                        name="Performance"
                        dataKey="A"
                        stroke={COLORS.purple}
                        fill={COLORS.purple}
                        fillOpacity={0.3}
                        strokeWidth={2}
                      />
                      <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: '12px' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'apikeys' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Gerenciamento de API Keys</h2>
                <Button className="bg-gradient-to-r from-purple-500 to-amber-500 hover:from-purple-600 hover:to-amber-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Nova API Key
                </Button>
              </div>

              <Card className="bg-gradient-to-br from-slate-950/80 to-slate-950 border border-slate-700">
                <CardContent className="p-6">
                  <div className="text-center py-12 text-slate-400">
                    <Key className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p>Nenhuma API Key criada ainda</p>
                    <p className="text-sm mt-2">Crie uma nova chave para distribuir acessos</p>
                  </div>
                </CardContent>
              </Card>

              {/* Exemplo de como seria um card de API Key */}
              <Card className="bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 border border-purple-500/30">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Key className="w-4 h-4 text-purple-400" />
                        <h3 className="font-semibold">Chave de Exemplo</h3>
                        <span className="ml-auto px-2 py-1 rounded text-xs bg-emerald-500/20 text-emerald-400">Ativa</span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <p><span className="text-slate-400">Nome:</span> Cliente Premium #1</p>
                        <p><span className="text-slate-400">Key:</span> <code className="px-2 py-1 rounded bg-slate-800 text-purple-300 font-mono">AMDIM;MutanoX3397</code></p>
                        <p><span className="text-slate-400">Limite:</span> 1000/dia • 100/hora</p>
                        <p><span className="text-slate-400">Criada:</span> {new Date().toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">Editar</Button>
                      <Button variant="outline" size="sm" className="text-rose-400 border-rose-500/30">Desativar</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'atividade' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Atividade Recente</h2>
              <Card className="bg-gradient-to-br from-slate-950/80 to-slate-950 border border-slate-700">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Log de Auditoria</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <div className="space-y-2">
                      {Array.from({ length: 10 }, (_, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50 border border-slate-700">
                          <div className={`w-2 h-2 rounded-full ${i % 3 === 0 ? 'bg-emerald-400' : i % 3 === 1 ? 'bg-amber-400' : 'bg-rose-400'}`}></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{i % 3 === 0 ? 'Consulta CPF realizada' : i % 3 === 1 ? 'Login bem-sucedido' : 'Erro na autenticação'}</p>
                            <p className="text-xs text-slate-400">{new Date(Date.now() - i * 3600000).toLocaleString('pt-BR')}</p>
                          </div>
                          <span className="text-xs text-slate-500">{['192.168.1.1', '200.145.50.2', '177.33.12.55'][i % 3]}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'teste' && (
            <Card className="bg-gradient-to-br from-slate-950/80 to-slate-950 border border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5 text-amber-400" />
                  Testar API
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-slate-400">
                  <Search className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p>Vá para a página principal para testar</p>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'config' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Configurações</h2>
              <Card className="bg-gradient-to-br from-slate-950/80 to-slate-950 border border-slate-700">
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-purple-400">Sistema de Cache</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50">
                        <div>
                          <p className="text-sm font-medium">Cache Inteligente</p>
                          <p className="text-xs text-slate-400">Acelera consultas repetidas</p>
                        </div>
                        <span className="px-2 py-1 rounded text-xs bg-emerald-500/20 text-emerald-400">Ativo</span>
                      </div>
                      <Button variant="outline" className="w-full justify-start gap-2">
                        <Database className="w-4 h-4" />
                        Limpar Cache
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-amber-400">Segurança</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50">
                        <div>
                          <p className="text-sm font-medium">Validação por API-KEY</p>
                          <p className="text-xs text-slate-400">Todas as requisições requerem chave</p>
                        </div>
                        <span className="px-2 py-1 rounded text-xs bg-emerald-500/20 text-emerald-400">Ativo</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50">
                        <div>
                          <p className="text-sm font-medium">Rate Limiting</p>
                          <p className="text-xs text-slate-400">Controle de requisições</p>
                        </div>
                        <span className="px-2 py-1 rounded text-xs bg-emerald-500/20 text-emerald-400">Ativo</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50">
                        <div>
                          <p className="text-sm font-medium">Auditoria Completa</p>
                          <p className="text-xs text-slate-400">Log de todas as ações</p>
                        </div>
                        <span className="px-2 py-1 rounded text-xs bg-emerald-500/20 text-emerald-400">Ativo</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-pink-400">API Keys</h3>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50">
                      <div>
                        <p className="text-sm font-medium">Chave Admin</p>
                        <p className="text-xs text-slate-400 font-mono">AMDIM;MutanoX3397</p>
                      </div>
                      <span className="px-2 py-1 rounded text-xs bg-purple-500/20 text-purple-400">Ativo</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className={`fixed bottom-0 left-0 right-0 bg-gradient-to-r from-slate-950/95 via-purple-950/60 to-amber-950/60 backdrop-blur-xl border-t border-amber-500/20 transition-all duration-300 ${sidebarCollapsed ? 'ml-20' : 'ml-72'}`}>
        <div className="px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Shield className="w-5 h-5 text-amber-400" />
              <span className="text-sm text-slate-400">MutanoX Premium Dashboard v2.0</span>
            </div>
            <span className="text-sm text-slate-500">© {new Date().getFullYear()} - Todos os direitos reservados</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
