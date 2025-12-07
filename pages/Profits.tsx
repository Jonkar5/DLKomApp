import React, { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  Legend,
  Tooltip, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  CartesianGrid
} from 'recharts';
import { 
  ArrowLeft, 
  User, 
  ChevronRight, 
  Wallet,
  PieChart as PieChartIcon,
  BarChart3,
  Percent,
  Landmark,
  Receipt,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { Client, Expense } from '../types';

interface ProfitsProps {
  onBack: () => void;
  clients: Client[];
  expenses: Expense[];
}

const Profits: React.FC<ProfitsProps> = ({ onBack, clients, expenses }) => {
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');

  // --- LOGIC: Calculate Totals based on real data ---
  const { totalIncome, totalExpenses, filteredExpensesList } = useMemo(() => {
      let currentIncome = 0;
      let currentExpenses = 0;
      let filteredExp: Expense[] = [];

      if (selectedClientId) {
          // Specific Client
          const client = clients.find(c => c.id === selectedClientId);
          if (client) {
              currentIncome = client.billing || 0;
          }
          filteredExp = expenses.filter(e => e.clientId === selectedClientId);
          currentExpenses = filteredExp.reduce((sum, e) => sum + e.amount, 0);
      } else {
          // Global
          currentIncome = clients.reduce((sum, c) => sum + (c.billing || 0), 0);
          filteredExp = expenses;
          currentExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
      }

      return { totalIncome: currentIncome, totalExpenses: currentExpenses, filteredExpensesList: filteredExp };
  }, [selectedClientId, clients, expenses]);

  const totalProfit = totalIncome - totalExpenses;
  const profitMargin = totalIncome > 0 ? (totalProfit / totalIncome) * 100 : 0;

  // --- CHART DATA PREPARATION ---
  
  // 1. Expense Distribution (Pie)
  const pieData = useMemo(() => {
      const categoryTotals: Record<string, number> = {};
      filteredExpensesList.forEach(e => {
          if (!categoryTotals[e.category]) categoryTotals[e.category] = 0;
          categoryTotals[e.category] += e.amount;
      });
      
      // Elegant Pastel Palette
      const colors = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6', '#64748b'];
      return Object.keys(categoryTotals).map((cat, idx) => ({
          name: cat,
          value: categoryTotals[cat],
          color: colors[idx % colors.length]
      }));
  }, [filteredExpensesList]);

  // 2. Bar Chart Data (Monthly)
  const barData = useMemo(() => {
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const data = months.map(m => ({ name: m, income: 0, expenses: 0 }));
      
      // A. Map Expenses
      filteredExpensesList.forEach(e => {
          const date = new Date(e.date);
          const monthIdx = date.getMonth();
          if (monthIdx >= 0 && monthIdx < 12) {
              data[monthIdx].expenses += e.amount;
          }
      });

      // B. Map Income
      const targetClients = selectedClientId 
        ? clients.filter(c => c.id === selectedClientId)
        : clients;

      targetClients.forEach(client => {
          if (client.billing && client.joinDate) {
              const date = new Date(client.joinDate);
              const monthIdx = date.getMonth();
              if (monthIdx >= 0 && monthIdx < 12) {
                  data[monthIdx].income += client.billing;
              }
          }
      });

      return data;
  }, [filteredExpensesList, clients, selectedClientId]);

  // Custom Tooltip for Charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-2xl shadow-xl border border-slate-100/50 backdrop-blur-md">
          <p className="font-bold text-slate-800 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm mb-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }}></div>
              <span className="text-slate-500 capitalize">{entry.name}:</span>
              <span className="font-bold text-slate-700">
                {entry.value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20 max-w-5xl mx-auto">
       
       {/* HEADER */}
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-2 mb-8">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="group p-2.5 rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 shadow-sm transition-all duration-300">
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform duration-300" strokeWidth={2.5} />
            </button>
            <div>
               <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Análisis</h2>
               <p className="text-slate-400 font-medium text-sm">Resumen financiero</p>
            </div>
          </div>
          
          <div className="relative group w-full md:w-72">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors group-hover:text-indigo-500 text-slate-400">
                <User className="w-4 h-4" />
            </div>
            <select 
                value={selectedClientId} 
                onChange={(e) => setSelectedClientId(e.target.value)} 
                className="w-full pl-10 pr-10 py-3 bg-white hover:bg-slate-50 border border-slate-200 hover:border-indigo-300 rounded-2xl shadow-sm text-slate-700 font-semibold outline-none focus:ring-4 focus:ring-indigo-500/10 appearance-none cursor-pointer text-sm transition-all duration-300"
            >
                <option value="">Vista Global</option>
                {clients.map(client => (<option key={client.id} value={client.id}>{client.name}</option>))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-indigo-500 transition-colors">
                <ChevronRight className="w-4 h-4 rotate-90" />
            </div>
          </div>
      </div>

      {/* --- KPI SECTION --- */}
      <div className="grid grid-cols-2 gap-4">
        
        {/* KPI 1: INGRESOS (Verde) */}
        <div className="relative overflow-hidden bg-white p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 group hover:-translate-y-1 transition-transform duration-300">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Landmark className="w-24 h-24 text-emerald-500 rotate-12" />
            </div>
            <div className="flex flex-col h-full justify-between relative z-10">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600 border border-emerald-100">
                        <ArrowUpRight className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Ingresos</span>
                </div>
                <div>
                    <span className="text-2xl md:text-3xl font-extrabold text-emerald-600 tracking-tight block">
                        {totalIncome.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}€
                    </span>
                    <div className="h-1 w-12 bg-emerald-500 rounded-full mt-3 opacity-80"></div>
                </div>
            </div>
        </div>

        {/* KPI 2: GASTOS (Azul) */}
        <div className="relative overflow-hidden bg-white p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 group hover:-translate-y-1 transition-transform duration-300">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Receipt className="w-24 h-24 text-blue-500 -rotate-12" />
            </div>
            <div className="flex flex-col h-full justify-between relative z-10">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600 border border-blue-100">
                        <ArrowDownRight className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Gastos</span>
                </div>
                <div>
                    <span className="text-2xl md:text-3xl font-extrabold text-blue-600 tracking-tight block">
                        {totalExpenses.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}€
                    </span>
                    <div className="h-1 w-12 bg-blue-500 rounded-full mt-3 opacity-80"></div>
                </div>
            </div>
        </div>

        {/* KPI 3: BENEFICIO NETO (Gris Claro / Clean) */}
        <div className="col-span-2 relative overflow-hidden bg-slate-100 p-4 rounded-2xl shadow-lg shadow-slate-200/50 flex items-center justify-between gap-4 group border border-slate-200">
            <div className="absolute inset-0 bg-gradient-to-r from-slate-50 to-slate-100"></div>
            
            <div className="relative z-10 flex items-center gap-4">
                <div className="p-2 bg-white rounded-lg text-indigo-500 shadow-sm ring-1 ring-slate-200">
                    <Wallet className="w-5 h-5" strokeWidth={2} />
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Beneficio Neto</span>
                    <span className={`text-xl font-bold tracking-tight ${totalProfit >= 0 ? 'text-slate-800' : 'text-rose-500'}`}>
                         {totalProfit.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€
                    </span>
                </div>
            </div>

            <div className="relative z-10 flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                <TrendingUp className={`w-3 h-3 ${totalProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`} />
                <span className="text-sm font-bold text-slate-700">{profitMargin.toFixed(1)}%</span>
            </div>
        </div>
      </div>

      {/* --- CHART SECTION --- */}
      <div className="bg-white p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
          <div className="flex justify-between items-center mb-6">
              <div>
                  <h3 className="text-lg font-bold text-slate-800">Métricas</h3>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    {chartType === 'bar' ? 'Comparativa mensual' : 'Distribución por categoría'}
                  </p>
              </div>
              
              {/* Modern Pill Switcher */}
              <div className="flex bg-slate-100 p-1 rounded-xl relative">
                  <div 
                    className={`absolute inset-y-1 w-[calc(50%-4px)] bg-white rounded-lg shadow-sm transition-all duration-300 ease-out ${
                        chartType === 'bar' ? 'left-1' : 'left-[calc(50%)]'
                    }`}
                  ></div>
                  <button 
                    onClick={() => setChartType('bar')} 
                    className={`relative z-10 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${chartType === 'bar' ? 'text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                     <div className="flex items-center gap-1.5">
                        <BarChart3 className="w-3.5 h-3.5" />
                        <span>Balance</span>
                     </div>
                  </button>
                  <button 
                    onClick={() => setChartType('pie')} 
                    className={`relative z-10 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${chartType === 'pie' ? 'text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                     <div className="flex items-center gap-1.5">
                        <PieChartIcon className="w-3.5 h-3.5" />
                        <span>Gastos</span>
                     </div>
                  </button>
              </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' ? (
                 <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="3 3" />
                    <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 500}} 
                        dy={10} 
                        interval={1} 
                    />
                    <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: '#94a3b8', fontSize: 10}} 
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc'}} />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                    <Bar 
                        dataKey="income" 
                        name="Facturado" 
                        fill="#10b981" 
                        radius={[6, 6, 0, 0]} 
                        barSize={16} 
                    />
                    <Bar 
                        dataKey="expenses" 
                        name="Gastos" 
                        fill="#3b82f6" 
                        radius={[6, 6, 0, 0]} 
                        barSize={16} 
                    />
                 </BarChart>
              ) : (
                 <PieChart>
                    <Pie 
                        data={pieData} 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={60} 
                        outerRadius={85} 
                        paddingAngle={6} 
                        dataKey="value"
                        cornerRadius={6}
                        stroke="none"
                    >
                        {pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                        layout="vertical" 
                        verticalAlign="middle" 
                        align="right" 
                        iconType="circle" 
                        wrapperStyle={{ fontSize: '12px', fontFamily: 'inherit', fontWeight: 500, color: '#475569', paddingLeft: '40px' }} 
                    />
                 </PieChart>
              )}
            </ResponsiveContainer>
          </div>
      </div>
    </div>
  );
};

export default Profits;