import React, { useState, useMemo, useEffect } from 'react';
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
    Landmark,
    Receipt,
    TrendingUp,
    ArrowUpRight,
    ArrowDownRight,
    Settings,
    Save,
    History,
    CheckCircle,
    AlertCircle,
    Clock,
    Printer,
    X,
    Plus,
    Trash2
} from 'lucide-react';
import { Client, Expense, ProfitDistribution, ProfitDistributionItem } from '../types';
// @ts-ignore
import { jsPDF } from 'jspdf';
// @ts-ignore
import autoTable from 'jspdf-autotable';

interface ProfitsProps {
    onBack: () => void;
    clients: Client[];
    expenses: Expense[];
    distributions: ProfitDistribution[];
    onAddDistribution: (distribution: ProfitDistribution) => void;
    onUpdateDistribution: (id: string, updates: Partial<ProfitDistribution>) => void;
    onDeleteDistribution: (id: string) => void;
}

const Profits: React.FC<ProfitsProps> = ({
    onBack,
    clients,
    expenses,
    distributions,
    onAddDistribution,
    onUpdateDistribution,
    onDeleteDistribution
}) => {
    const [selectedClientId, setSelectedClientId] = useState<string>('');
    const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');

    // --- Distribution State ---
    const [partners, setPartners] = useState<{ name: string, percentage: number }[]>(() => {
        const saved = localStorage.getItem('profitPartners');
        return saved ? JSON.parse(saved) : [
            { name: 'Socio 1', percentage: 33 },
            { name: 'Socio 2', percentage: 33 },
            { name: 'DLKom', percentage: 34 }
        ];
    });

    useEffect(() => {
        localStorage.setItem('profitPartners', JSON.stringify(partners));
    }, [partners]);
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

    const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false);

    // Detail modal for a specific distribution
    const [selectedDistribution, setSelectedDistribution] = useState<ProfitDistribution | null>(null);

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

        filteredExpensesList.forEach(e => {
            const date = new Date(e.date);
            const monthIdx = date.getMonth();
            if (monthIdx >= 0 && monthIdx < 12) {
                data[monthIdx].expenses += e.amount;
            }
        });

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

    // --- DISTRIBUTION HANDLERS ---

    const handleCreateDistribution = () => {
        if (totalProfit <= 0) {
            alert("No hay beneficio neto para distribuir.");
            return;
        }

        const items: ProfitDistributionItem[] = partners.map(p => ({
            id: p.name,
            name: p.name,
            percentage: p.percentage,
            amount: (totalProfit * p.percentage) / 100,
            status: 'Pendiente'
        }));

        let periodName = new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
        // Capitalize first letter of date
        periodName = periodName.charAt(0).toUpperCase() + periodName.slice(1);

        if (selectedClientId) {
            const client = clients.find(c => c.id === selectedClientId);
            if (client) {
                // User requested explicit client name
                periodName = client.name;
            }
        }

        const newDist: ProfitDistribution = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            period: periodName,
            totalProfit: totalProfit,
            items: items
        };

        onAddDistribution(newDist);
        // Optionally open the history or show success
        alert("Distribución guardada correctamente en el historial.");
    };

    const handleUpdateItemStatus = (distId: string, itemId: string, newStatus: 'Pendiente' | 'Pagado' | 'Parcial') => {
        const dist = distributions.find(d => d.id === distId);
        if (!dist) return;

        const updatedItems = dist.items.map(item => {
            if (item.id === itemId) {
                return {
                    ...item,
                    status: newStatus,
                    paidDate: newStatus === 'Pagado' ? new Date().toISOString() : undefined
                };
            }
            return item;
        });

        onUpdateDistribution(distId, { items: updatedItems });
        // Update local selected distribution to reflect changes immediately in modal
        if (selectedDistribution && selectedDistribution.id === distId) {
            setSelectedDistribution({ ...dist, items: updatedItems });
        }
    };

    const handleDeleteClick = () => {
        setIsDeleteConfirmModalOpen(true);
    };

    const confirmDelete = () => {
        if (selectedDistribution) {
            onDeleteDistribution(selectedDistribution.id);
            setIsDeleteConfirmModalOpen(false);
            setSelectedDistribution(null);
        }
    };

    const handleAddPartner = () => {
        setPartners([...partners, { name: 'Nuevo Socio', percentage: 0 }]);
    };

    const handleRemovePartner = (index: number) => {
        const newPartners = [...partners];
        newPartners.splice(index, 1);
        setPartners(newPartners);
    };

    const generateDistributionPDF = (dist: ProfitDistribution) => {
        const doc = new jsPDF();

        doc.setFontSize(20);
        doc.text("Informe de Distribución de Beneficios", 14, 22);

        doc.setFontSize(12);
        doc.text(`Periodo: ${dist.period}`, 14, 32);
        doc.text(`Fecha: ${new Date(dist.date).toLocaleDateString()}`, 14, 38);
        doc.text(`Beneficio Total: ${dist.totalProfit.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}`, 14, 44);

        autoTable(doc, {
            startY: 50,
            head: [['Socio', 'Porcentaje', 'Importe', 'Estado', 'Fecha Pago']],
            body: dist.items.map(item => [
                item.name,
                `${item.percentage}%`,
                item.amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }),
                item.status,
                item.paidDate ? new Date(item.paidDate).toLocaleDateString() : '-'
            ]),
            headStyles: { fillColor: [79, 70, 229] },
        });

        doc.save(`distribucion_${dist.period.replace(/\s/g, '_')}.pdf`);
    };


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

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Pagado': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
            case 'Parcial': return 'text-amber-600 bg-amber-50 border-amber-100';
            default: return 'text-rose-600 bg-rose-50 border-rose-100';
        }
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
                        <p className="text-slate-400 font-medium text-sm">Resumen y Distribución</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Client Selector */}
                    <div className="relative group w-full md:w-56">
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
                    </div>

                    {/* --- CONFIG BUTTON --- */}
                    <button
                        onClick={() => setIsConfigModalOpen(true)}
                        className="p-3 bg-white rounded-2xl border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 shadow-sm transition-all"
                        title="Configurar Socios"
                    >
                        <Settings className="w-5 h-5" />
                    </button>

                    {/* --- HISTORY BUTTON --- */}
                    <button
                        onClick={() => setIsHistoryModalOpen(true)}
                        className="p-3 bg-white rounded-2xl border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 shadow-sm transition-all"
                        title="Historial de Distribuciones"
                    >
                        <History className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* --- KPI SECTION --- */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* KPI 1: INGRESOS */}
                <div className="relative overflow-hidden bg-white p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 group hover:-translate-y-1 transition-transform duration-300">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Landmark className="w-24 h-24 text-emerald-500 rotate-12" />
                    </div>
                    <div className="flex flex-col h-full justify-between relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600 border border-emerald-100">
                                <ArrowUpRight className="w-5 h-5" />
                            </div>
                        </div>
                        <div>
                            <span className="text-sm font-bold text-slate-400 uppercase tracking-wider block mb-1">Ingresos</span>
                            <span className="text-xl md:text-2xl font-extrabold text-emerald-600 tracking-tight block">
                                {totalIncome.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}€
                            </span>
                            <div className="h-1 w-12 bg-emerald-500 rounded-full mt-3 opacity-80"></div>
                        </div>
                    </div>
                </div>

                {/* KPI 2: GASTOS */}
                <div className="relative overflow-hidden bg-white p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 group hover:-translate-y-1 transition-transform duration-300">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Receipt className="w-24 h-24 text-blue-500 -rotate-12" />
                    </div>
                    <div className="flex flex-col h-full justify-between relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600 border border-blue-100">
                                <ArrowDownRight className="w-5 h-5" />
                            </div>
                        </div>
                        <div>
                            <span className="text-sm font-bold text-slate-400 uppercase tracking-wider block mb-1">Gastos</span>
                            <span className="text-xl md:text-2xl font-extrabold text-blue-600 tracking-tight block">
                                {totalExpenses.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}€
                            </span>
                            <div className="h-1 w-12 bg-blue-500 rounded-full mt-3 opacity-80"></div>
                        </div>
                    </div>
                </div>

                {/* KPI 3: BENEFICIO NETO REFINADO */}
                <div className="col-span-2 relative overflow-hidden bg-slate-100 p-6 rounded-[2rem] shadow-lg shadow-slate-200/50 flex flex-col justify-between group border border-slate-200">
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-50 to-slate-100"></div>

                    <div className="relative z-10 flex justify-between items-start mb-4">
                        <div>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Beneficio Neto</span>
                            {/* Size Reduced as requested */}
                            <span className={`text-2xl md:text-3xl font-black tracking-tight ${totalProfit >= 0 ? 'text-slate-800' : 'text-rose-500'}`}>
                                {totalProfit.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€
                            </span>
                        </div>
                        {/* Replaced Wallet with Percentage Badge */}
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-xl shadow-sm ring-1 ring-slate-200 text-indigo-600">
                            <TrendingUp className="w-4 h-4" />
                            <span className="font-bold text-sm">{profitMargin.toFixed(1)}%</span>
                        </div>
                    </div>

                    {/* Distribution Action */}
                    <div className="relative z-10 pt-4 border-t border-slate-200 flex justify-between items-end">
                        <div className="flex gap-2 w-full pr-2">
                            {partners.slice(0, 3).map((p, i) => (
                                <div key={i} className="flex-1 bg-white/60 p-2 rounded-xl border border-slate-200/60 flex flex-col items-start min-w-0">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight truncate w-full mb-0.5" title={p.name}>
                                        {p.name}
                                    </span>
                                    <span className="font-bold text-slate-700 text-xs sm:text-sm">
                                        {((totalProfit * p.percentage) / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={handleCreateDistribution}
                            className="flex shrink-0 items-center justify-center p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-95"
                            title="Guardar Distribución Actual"
                        >
                            <Save className="w-5 h-5" />
                        </button>
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
                    <div className="flex bg-slate-100 p-1 rounded-xl relative">
                        <div
                            className={`absolute inset-y-1 w-[calc(50%-4px)] bg-white rounded-lg shadow-sm transition-all duration-300 ease-out ${chartType === 'bar' ? 'left-1' : 'left-[calc(50%)]'
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
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} dy={10} interval={1} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                                <Bar dataKey="income" name="Facturado" fill="#10b981" radius={[6, 6, 0, 0]} barSize={16} />
                                <Bar dataKey="expenses" name="Gastos" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={16} />
                            </BarChart>
                        ) : (
                            <PieChart>
                                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={6} dataKey="value" cornerRadius={6} stroke="none">
                                    {pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend layout="vertical" verticalAlign="middle" align="right" iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#475569', paddingLeft: '40px' }} />
                            </PieChart>
                        )}
                    </ResponsiveContainer>
                </div>
            </div>

            {/* --- MODAL: CONFIGURATION --- */}
            {isConfigModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-bounce-subtle p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-800">Configurar Reparto</h3>
                            <button onClick={() => setIsConfigModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="space-y-4">
                            {partners.map((p, idx) => (
                                <div key={idx} className="flex gap-3 items-center">
                                    <input
                                        value={p.name}
                                        onChange={(e) => {
                                            const newPartners = [...partners];
                                            newPartners[idx].name = e.target.value;
                                            setPartners(newPartners);
                                        }}
                                        className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-indigo-100 outline-none"
                                        placeholder="Nombre"
                                    />
                                    <div className="relative w-24">
                                        <input
                                            type="number"
                                            value={p.percentage}
                                            onChange={(e) => {
                                                const newPartners = [...partners];
                                                newPartners[idx].percentage = Number(e.target.value);
                                                setPartners(newPartners);
                                            }}
                                            className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-bold text-center focus:ring-2 focus:ring-indigo-100 outline-none"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
                                    </div>
                                    <button onClick={() => handleRemovePartner(idx)} className="p-3 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-colors" title="Eliminar socio">
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            ))}
                            <button onClick={handleAddPartner} className="w-full py-4 mt-2 border-2 border-dashed border-slate-200 text-slate-400 font-bold rounded-2xl hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2">
                                <Plus className="w-5 h-5" /> Añadir Socio
                            </button>
                            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
                                <button onClick={() => setIsConfigModalOpen(false)} className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition">Aceptar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL: HISTORY --- */}
            {isHistoryModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-bounce-subtle flex flex-col max-h-[85vh]">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="text-xl font-bold text-slate-800">Historial de Distribuciones</h3>
                            <button onClick={() => setIsHistoryModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-4 overflow-y-auto space-y-3">
                            {distributions && distributions.length > 0 ? (
                                distributions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(dist => (
                                    <div key={dist.id} onClick={() => { setSelectedDistribution(dist); setIsHistoryModalOpen(false); }} className="p-4 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 cursor-pointer transition-all flex items-center justify-between group">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl">
                                                <Wallet className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-700 text-sm">{dist.period}</p>
                                                <p className="text-xs text-slate-400">{new Date(dist.date).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-slate-800">{dist.totalProfit.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}</p>
                                            <span className="text-[10px] text-indigo-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">Ver Detalles &rarr;</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-12 text-slate-400">
                                    <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    <p>No hay distribuciones guardadas</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL: DETAIL & ACTIONS --- */}
            {selectedDistribution && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-bounce-subtle flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">Detalle de Distribución</h3>
                                <p className="text-sm text-slate-500">{selectedDistribution.period}</p>
                            </div>
                            <button onClick={() => setSelectedDistribution(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6 overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                                    <span className="text-xs uppercase font-bold text-indigo-400 tracking-wider">Total Repartido</span>
                                    <p className="text-3xl font-black text-indigo-700 mt-1">{selectedDistribution.totalProfit.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => generateDistributionPDF(selectedDistribution)}
                                        className="flex-1 rounded-2xl border-2 border-slate-100 hover:border-indigo-100 hover:bg-indigo-50 text-slate-600 font-bold flex flex-col items-center justify-center gap-1 transition-all"
                                    >
                                        <Printer className="w-5 h-5 text-indigo-500" />
                                        <span className="text-xs">Descargar PDF</span>
                                    </button>
                                    <button
                                        onClick={handleDeleteClick}
                                        className="flex-1 rounded-2xl border-2 border-rose-50 hover:border-rose-100 hover:bg-rose-50 text-rose-500 font-bold flex flex-col items-center justify-center gap-1 transition-all"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                        <span className="text-xs">Eliminar</span>
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {selectedDistribution.items.map((item) => (
                                    <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-slate-100 rounded-xl shadow-sm gap-4">
                                        <div>
                                            <h4 className="font-bold text-slate-800 text-lg">{item.name}</h4>
                                            <span className="text-xs font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-md">{item.percentage}% del beneficio</span>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <p className="font-bold text-slate-700 text-lg">{item.amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })}</p>
                                            </div>

                                            <select
                                                value={item.status}
                                                onChange={(e) => handleUpdateItemStatus(selectedDistribution.id, item.id, e.target.value as any)}
                                                className={`pl-3 pr-8 py-2 rounded-lg text-xs font-bold uppercase tracking-wide border outline-none appearance-none cursor-pointer ${getStatusColor(item.status)}`}
                                            >
                                                <option value="Pendiente">Pendiente</option>
                                                <option value="Parcial">Parcial</option>
                                                <option value="Pagado">Pagado</option>
                                            </select>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL: DELETE CONFIRMATION --- */}
            {isDeleteConfirmModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-bounce-subtle p-6 text-center">
                        <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertCircle className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Confirmar Eliminación</h3>
                        <p className="text-slate-500 text-sm mb-6">
                            Esta acción no se puede deshacer. Se borrará el registro de este reparto de beneficios del historial.
                        </p>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={() => setIsDeleteConfirmModalOpen(false)}
                                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-5 py-2.5 rounded-xl bg-rose-500 text-white font-bold hover:bg-rose-600 shadow-lg shadow-rose-200 transition"
                            >
                                Sí, Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profits;