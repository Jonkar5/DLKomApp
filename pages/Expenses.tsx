import React, { useState } from 'react';
import { Expense, Client, PaymentStatus } from '../types';
import {
  Download,
  Plus,
  ArrowLeft,
  User,
  ChevronRight,
  Calendar,
  X,
  Tag,
  FileText,
  Save,
  CreditCard,
  Trash2,
  Edit,
  Printer,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
// @ts-ignore
import { jsPDF } from 'jspdf';
// @ts-ignore
import autoTable from 'jspdf-autotable';

interface ExpensesProps {
  onBack: () => void;
  expenses: Expense[];
  onAddExpense: (expense: Expense) => void;
  onUpdateExpense: (id: string, updates: Partial<Expense>) => void;
  onDeleteExpense: (id: string) => void;
  clients: Client[];
}

const Expenses: React.FC<ExpensesProps> = ({ onBack, expenses, onAddExpense, onUpdateExpense, onDeleteExpense, clients }) => {
  console.log("Expenses component rendered", { expenses });
  const [categories, setCategories] = useState<string[]>(['Materiales', 'Personal', 'Decoracion', 'Mobiliario', 'Otros']);

  // Filtros
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('Todas');
  const [statusFilter, setStatusFilter] = useState<string>('Todos');

  // Filtros Informe PDF
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportClientId, setReportClientId] = useState<string>('');
  const [reportCategory, setReportCategory] = useState<string>('Todas');
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');
  const [reportStatus, setReportStatus] = useState<string>('Todos');

  // Modales y Estados UI
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const getLocalDateString = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [formData, setFormData] = useState({
    clientId: '',
    date: getLocalDateString(),
    category: '',
    description: '',
    amount: '',
    paymentStatus: 'Pendiente' as PaymentStatus,
    paidAmount: ''
  });

  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  // --- LOGIC ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: value };

      // Auto-calculate paidAmount based on status
      if (name === 'paymentStatus') {
        if (value === 'Pagado') {
          newData.paidAmount = newData.amount;
        } else if (value === 'Pendiente') {
          newData.paidAmount = '0';
        }
      }

      return newData;
    });
  };

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      setCategories([...categories, newCategoryName.trim()]);
      setFormData(prev => ({ ...prev, category: newCategoryName.trim() }));
      setNewCategoryName('');
      setIsAddingCategory(false);
    }
  };

  const handleCreateClick = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData({
      clientId: '',
      date: getLocalDateString(),
      category: '',
      description: '',
      amount: '',
      paymentStatus: 'Pendiente',
      paidAmount: ''
    });
    setIsModalOpen(true);
  };

  const handleEditClick = (expense: Expense) => {
    setIsEditing(true);
    setEditingId(expense.id);
    setFormData({
      clientId: expense.clientId || '',
      date: expense.date,
      category: expense.category,
      description: expense.description,
      amount: expense.amount.toString(),
      paymentStatus: expense.paymentStatus || 'Pendiente',
      paidAmount: expense.paidAmount?.toString() || (expense.paymentStatus === 'Pagado' ? expense.amount.toString() : '0')
    });
    setSelectedExpense(null);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing && editingId) {
      onUpdateExpense(editingId, {
        description: formData.description,
        amount: parseFloat(formData.amount) || 0,
        date: formData.date,
        category: formData.category,
        clientId: formData.clientId,
        paymentStatus: formData.paymentStatus,
        paidAmount: parseFloat(formData.paidAmount) || 0
      });
    } else {
      const newExpense: Expense = {
        id: Date.now().toString(),
        description: formData.description,
        amount: parseFloat(formData.amount) || 0,
        date: formData.date,
        category: formData.category,
        clientId: formData.clientId,
        paymentStatus: formData.paymentStatus,
        paidAmount: parseFloat(formData.paidAmount) || 0
      };
      onAddExpense(newExpense);
    }
    setIsModalOpen(false);
  };

  const handleDeleteClick = (expense: Expense) => {
    setSelectedExpense(null);
    setExpenseToDelete(expense);
  };

  const confirmDelete = () => {
    if (expenseToDelete) {
      onDeleteExpense(expenseToDelete.id);
      setExpenseToDelete(null);
    }
  };

  // --- PDF ---
  const handleGeneratePDF = () => {
    const doc = new jsPDF();
    const reportData = expenses.filter(exp => {
      const matchesClient = reportClientId === '' || exp.clientId === reportClientId;
      const matchesCategory = reportCategory === 'Todas' || exp.category === reportCategory;
      const matchesStatus = reportStatus === 'Todos' || (exp.paymentStatus || 'Pendiente') === reportStatus;

      let matchesDate = true;
      if (reportStartDate || reportEndDate) {
        const expDate = new Date(exp.date);
        const start = reportStartDate ? new Date(reportStartDate) : new Date('2000-01-01');
        const end = reportEndDate ? new Date(reportEndDate) : new Date();
        end.setHours(23, 59, 59);
        matchesDate = expDate >= start && expDate <= end;
      }
      return matchesClient && matchesCategory && matchesDate && matchesStatus;
    });

    if (reportData.length === 0) {
      alert("No hay gastos que coincidan con los filtros del informe.");
      return;
    }

    const totalAmount = reportData.reduce((sum, item) => sum + item.amount, 0);

    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text("DLKom Gestión", 14, 22);
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text("Informe Detallado de Gastos", 14, 32);

    doc.setFontSize(10);
    let filterText = "Filtros aplicados: ";
    if (reportCategory !== 'Todas') filterText += `Categoría [${reportCategory}] `;
    if (reportStatus !== 'Todos') filterText += `Estado [${reportStatus}] `;
    if (reportClientId !== '') {
      const clientName = clients.find(c => c.id === reportClientId)?.name;
      filterText += `Cliente [${clientName}] `;
    }
    if (reportStartDate || reportEndDate) {
      filterText += `Periodo [${reportStartDate || 'Inicio'} - ${reportEndDate || 'Hoy'}]`;
    }
    doc.text(filterText, 14, 40);

    autoTable(doc, {
      startY: 50,
      head: [['Fecha', 'Cliente', 'Categoría', 'Descripción', 'Estado', 'Importe']],
      body: reportData.map(e => [
        new Date(e.date).toLocaleDateString(),
        clients.find(c => c.id === e.clientId)?.name || '-',
        e.category,
        e.description,
        e.paymentStatus || 'Pendiente',
        e.amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })
      ]),
      headStyles: { fillColor: [225, 29, 72] },
      alternateRowStyles: { fillColor: [255, 241, 242] },
      styles: { fontSize: 9, cellPadding: 3 },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Gastos: ${totalAmount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}`, 14, finalY);

    const fileNameDate = new Date().toISOString().slice(0, 10);
    doc.save(`informe_gastos_${fileNameDate}.pdf`);
    setIsReportModalOpen(false);
  };

  const getCategoryColorStyles = (category: string) => {
    const catLower = category.toLowerCase();
    if (catLower.includes('material')) return 'bg-amber-100 text-amber-700 border-amber-200';
    if (catLower.includes('personal')) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (catLower.includes('decoracion') || catLower.includes('decoración')) return 'bg-purple-100 text-purple-700 border-purple-200';
    if (catLower.includes('mobiliario')) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (catLower.includes('oficina')) return 'bg-slate-100 text-slate-700 border-slate-200';
    return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  };

  const getCategoryBorderColor = (category: string) => {
    const catLower = category.toLowerCase();
    if (catLower.includes('material')) return 'border-amber-400';
    if (catLower.includes('personal')) return 'border-blue-400';
    if (catLower.includes('decoracion') || catLower.includes('decoración')) return 'border-purple-400';
    if (catLower.includes('mobiliario')) return 'border-emerald-400';
    if (catLower.includes('oficina')) return 'border-slate-400';
    return 'border-indigo-400';
  };

  const getPaymentStatusStyles = (status?: PaymentStatus) => {
    switch (status) {
      case 'Pagado': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Parcial': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Pendiente': default: return 'bg-rose-100 text-rose-700 border-rose-200';
    }
  };

  const getPaymentStatusIcon = (status?: PaymentStatus) => {
    switch (status) {
      case 'Pagado': return <CheckCircle className="w-3 h-3" />;
      case 'Parcial': return <Clock className="w-3 h-3" />;
      case 'Pendiente': default: return <AlertCircle className="w-3 h-3" />;
    }
  };

  const filteredExpenses = expenses.filter(expense => {
    const matchesClient = selectedClientId === '' || expense.clientId === selectedClientId;
    const matchesCategory = categoryFilter === 'Todas' || expense.category === categoryFilter;
    const matchesStatus = statusFilter === 'Todos' || (expense.paymentStatus || 'Pendiente') === statusFilter;
    return matchesClient && matchesCategory && matchesStatus;
  }).sort((a, b) => {
    // Primero ordenar por fecha (más reciente primero)
    const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (dateDiff !== 0) return dateDiff;
    // Si la fecha es igual, ordenar por creación (ID más reciente primero)
    return b.id.localeCompare(a.id);
  });

  return (
    <div className="space-y-6 animate-fade-in pb-20 relative">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-5">
          <button onClick={onBack} className="group p-3 rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-300 shadow-sm hover:shadow-xl hover:shadow-indigo-50/50 transition-all duration-300">
            <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform duration-300" strokeWidth={2.5} />
          </button>
          <div>
            <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Gastos</h2>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsReportModalOpen(true)} className="group flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 font-medium hover:border-indigo-600 hover:text-indigo-600 transition-all duration-300 shadow-sm hover:shadow-md">
            <Printer className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" strokeWidth={1.5} />
            <span className="hidden md:inline text-sm">Exportar</span>
          </button>
          <button onClick={handleCreateClick} className="group flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all duration-300 transform hover:-translate-y-0.5">
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" strokeWidth={1.5} />
            <span className="hidden md:inline text-sm font-semibold">Nuevo Gasto</span>
          </button>
        </div>
      </div>

      <div className="flex flex-row gap-4 w-full">
        <div className="relative flex-1">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><User className="w-5 h-5 text-slate-400" /></div>
          <select value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)} className="w-full pl-10 pr-10 py-3 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-700 font-medium outline-none focus:ring-2 focus:ring-indigo-100 appearance-none cursor-pointer truncate">
            <option value="">Todos los clientes</option>
            {clients.map(client => (
              <option key={client.id} value={client.id}>{client.name}</option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"><ChevronRight className="w-4 h-4 text-slate-400 rotate-90" /></div>
        </div>
        <div className="relative flex-1">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><Tag className="w-5 h-5 text-slate-400" /></div>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full pl-10 pr-10 py-3 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-700 font-medium outline-none focus:ring-2 focus:ring-indigo-100 appearance-none cursor-pointer truncate">
            <option value="Todas">Todas las categorías</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"><ChevronRight className="w-4 h-4 text-slate-400 rotate-90" /></div>
        </div>
        <div className="relative flex-1">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full pl-4 pr-10 py-3 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-700 font-medium outline-none focus:ring-2 focus:ring-indigo-100 appearance-none cursor-pointer truncate">
            <option value="Todos">Todos los estados</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Parcial">Parcial</option>
            <option value="Pagado">Pagado</option>
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"><ChevronRight className="w-4 h-4 text-slate-400 rotate-90" /></div>
        </div>
      </div>

      <div className="space-y-4">
        {filteredExpenses.length === 0 ? (
          <div className="text-center py-10 text-slate-400 bg-white rounded-2xl border border-slate-200 border-dashed"><p>No se encontraron gastos con estos filtros.</p></div>
        ) : (
          filteredExpenses.map((expense) => {
            const clientName = clients.find(c => c.id === expense.clientId)?.name;
            return (
              <div key={expense.id} onClick={() => setSelectedExpense(expense)} className={`bg-white rounded-r-xl rounded-l-sm border-l-[6px] ${getCategoryBorderColor(expense.category)} shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] p-5 flex items-center justify-between gap-5 cursor-pointer hover:shadow-2xl hover:scale-[1.01] transition-all duration-300 group`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    {clientName ? (
                      <span className="text-slate-800 font-bold text-lg tracking-tight truncate flex items-center gap-2"><User className="w-4 h-4 text-slate-400" />{clientName}</span>
                    ) : (
                      <span className="text-slate-400 italic font-medium flex items-center gap-2"><User className="w-4 h-4" />Sin cliente</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-1.5 leading-none">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getPaymentStatusStyles(expense.paymentStatus)}`}>
                      {getPaymentStatusIcon(expense.paymentStatus)}
                      {expense.paymentStatus || 'Pendiente'}
                    </span>
                  </div>
                  <h3 className="text-sm text-slate-500 font-medium truncate leading-relaxed">{expense.description}</h3>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wide ${getCategoryColorStyles(expense.category)}`}>{expense.category}</span>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium bg-slate-50 px-2 py-1 rounded-md"><Calendar className="w-3.5 h-3.5" /><span>{new Date(expense.date).toLocaleDateString()}</span></div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEditClick(expense); }}
                      className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 border border-blue-200 transition-colors"
                      title="Editar"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteClick(expense); }}
                      className="p-2 bg-white text-blue-600 rounded-lg hover:bg-rose-50 hover:text-rose-600 border border-blue-200 hover:border-rose-200 transition-colors"
                      title="Borrar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-400 shrink-0" />
              </div>
            );
          })
        )}
      </div>

      {isReportModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 animate-bounce-subtle">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600"><Printer className="w-5 h-5" /></div>
                <h3 className="text-xl font-bold text-slate-800">Informe de Gastos</h3>
              </div>
              <button onClick={() => setIsReportModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
            </div>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Filtrar por Cliente</label>
                <select value={reportClientId} onChange={(e) => setReportClientId(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none text-slate-700">
                  <option value="">Todos los clientes</option>
                  {clients.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Filtrar por Tipo</label>
                <select value={reportCategory} onChange={(e) => setReportCategory(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none text-slate-700">
                  <option value="Todas">Todas las categorías</option>
                  {categories.map(c => (<option key={c} value={c}>{c}</option>))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Desde</label>
                  <input type="date" value={reportStartDate} onChange={(e) => setReportStartDate(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-600 cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-100" onClick={(e) => e.currentTarget.showPicker?.()} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Hasta</label>
                  <input type="date" value={reportEndDate} onChange={(e) => setReportEndDate(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-600 cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-100" onClick={(e) => e.currentTarget.showPicker?.()} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Filtrar por Estado</label>
                <select value={reportStatus} onChange={(e) => setReportStatus(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none text-slate-700">
                  <option value="Todos">Todos los estados</option>
                  <option value="Pendiente">Pendiente</option>
                  <option value="Parcial">Parcial</option>
                  <option value="Pagado">Pagado</option>
                </select>
              </div>
            </div>
            <button onClick={handleGeneratePDF} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"><Download className="w-5 h-5" />Generar PDF</button>
          </div>
        </div>
      )}


      {
        selectedExpense && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-bounce-subtle overflow-hidden">
              <div className="h-24 bg-indigo-600 relative flex items-center justify-center">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-md absolute -bottom-8"><CreditCard className="w-8 h-8 text-indigo-600" /></div>
                <button onClick={() => setSelectedExpense(null)} className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/40 rounded-full text-white transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <div className="pt-12 pb-8 px-8 flex flex-col items-center text-center">
                <span className={`text-xs font-bold uppercase tracking-widest mb-2 px-3 py-1 rounded-full border ${getCategoryColorStyles(selectedExpense.category)}`}>{selectedExpense.category}</span>
                <h3 className="text-xl font-bold text-slate-800 leading-tight mb-2">{selectedExpense.description}</h3>
                <div className="text-3xl font-extrabold text-indigo-600 mb-2">-{selectedExpense.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}€</div>

                <div className="mb-6 flex flex-col items-center gap-1">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${getPaymentStatusStyles(selectedExpense.paymentStatus)}`}>
                    {getPaymentStatusIcon(selectedExpense.paymentStatus)}
                    {selectedExpense.paymentStatus || 'Pendiente'}
                  </span>
                  {(selectedExpense.paymentStatus === 'Parcial' || selectedExpense.paymentStatus === 'Pagado') && (
                    <span className="text-xs font-medium text-slate-500">
                      Pagado: <span className="text-slate-700 font-bold">{selectedExpense.paidAmount?.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
                    </span>
                  )}
                </div>

                <div className="w-full space-y-3 mb-8">
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2 text-slate-500 text-sm font-medium"><Calendar className="w-4 h-4" /> Fecha</div>
                    <span className="font-bold text-slate-700">{new Date(selectedExpense.date).toLocaleDateString()}</span>
                  </div>
                  {selectedExpense.clientId && (
                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-2 text-slate-500 text-sm font-medium"><User className="w-4 h-4" /> Cliente</div>
                      <span className="font-bold text-indigo-600">{clients.find(c => c.id === selectedExpense.clientId)?.name}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2 text-slate-500 text-sm font-medium"><FileText className="w-4 h-4" /> ID Referencia</div>
                    <span className="font-mono text-xs font-bold text-slate-400">#{selectedExpense.id}</span>
                  </div>
                </div>
                <div className="flex gap-3 w-full">
                  <button onClick={() => handleDeleteClick(selectedExpense)} className="flex-1 py-3 rounded-xl border border-blue-100 text-blue-600 font-bold hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"><Trash2 className="w-5 h-5" />Borrar</button>
                  <button onClick={() => handleEditClick(selectedExpense)} className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-colors flex items-center justify-center gap-2"><Edit className="w-5 h-5" />Editar</button>
                </div>
              </div>
            </div>
          </div>
        )}


      {
        isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg animate-bounce-subtle max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                <h3 className="text-xl font-bold text-slate-800">{isEditing ? 'Editar Gasto' : 'Añadir Gasto'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Asignar a Cliente <span className="text-rose-500">*</span></label>
                  <div className="relative">
                    <User className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                    <select name="clientId" required value={formData.clientId} onChange={handleInputChange} className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none appearance-none font-medium text-slate-700">
                      <option value="">Seleccione un cliente...</option>
                      {clients.map(client => (
                        <option key={client.id} value={client.id}>{client.name}</option>
                      ))}
                    </select>
                    <ChevronRight className="absolute right-4 top-3.5 w-4 h-4 text-slate-400 rotate-90 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Fecha</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3.5 w-5 h-5 text-slate-400 pointer-events-none" />
                    <input type="date" name="date" required value={formData.date} onChange={handleInputChange} className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none text-slate-600 cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:p-1" onClick={(e) => e.currentTarget.showPicker?.()} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-semibold text-slate-700">Tipo de Gasto</label>
                    {!isAddingCategory && (
                      <button type="button" onClick={() => setIsAddingCategory(true)} className="text-xs text-indigo-600 font-bold hover:text-indigo-800 flex items-center gap-1"><Plus className="w-3 h-3" /> Agregar tipo</button>
                    )}
                  </div>
                  <div className="relative">
                    <Tag className="absolute left-3 top-3.5 w-5 h-5 text-slate-400 pointer-events-none" />
                    <select name="category" required value={formData.category} onChange={handleInputChange} className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none appearance-none text-slate-700">
                      <option value="">Seleccionar...</option>
                      {categories.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                    </select>
                    <ChevronRight className="absolute right-4 top-3.5 w-4 h-4 text-slate-400 rotate-90 pointer-events-none" />
                  </div>
                  {isAddingCategory && (
                    <div className="flex gap-2 mt-2">
                      <input type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Nueva categoría..." className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" autoFocus />
                      <button type="button" onClick={handleAddCategory} className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm"><Save className="w-4 h-4" /></button>
                      <button type="button" onClick={() => setIsAddingCategory(false)} className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 border border-slate-200"><X className="w-4 h-4" /></button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Descripción del Gasto</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                    <textarea name="description" required rows={2} value={formData.description} onChange={handleInputChange} placeholder="Detalle del gasto..." className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none resize-none"></textarea>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Importe Total</label>
                  <div className="relative">
                    <input type="number" name="amount" required step="0.01" min="0" value={formData.amount} onChange={handleInputChange} placeholder="0.00" className="w-full pl-4 pr-10 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none font-bold text-lg text-slate-800" />
                    <span className="absolute right-4 top-3.5 text-slate-500 font-bold text-lg">€</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Estado</label>
                    <select name="paymentStatus" value={formData.paymentStatus} onChange={handleInputChange} className="w-full px-3 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none font-medium text-slate-700">
                      <option value="Pendiente">Pendiente</option>
                      <option value="Parcial">Parcial</option>
                      <option value="Pagado">Pagado</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Pagado</label>
                    <div className="relative">
                      <input
                        type="number"
                        name="paidAmount"
                        step="0.01"
                        min="0"
                        value={formData.paidAmount}
                        onChange={handleInputChange}
                        disabled={formData.paymentStatus === 'Pendiente' || formData.paymentStatus === 'Pagado'}
                        className={`w-full pl-3 pr-8 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none font-bold ${formData.paymentStatus === 'Pendiente' ? 'bg-slate-50 text-slate-400' : 'text-slate-800'}`}
                      />
                      <span className="absolute right-3 top-3.5 text-slate-500 font-bold">€</span>
                    </div>
                  </div>
                </div>
                <div className="pt-4 flex gap-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors">Cancelar</button>
                  <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-colors">{isEditing ? 'Guardar Cambios' : 'Guardar Gasto'}</button>
                </div>
              </form>
            </div>
          </div>
        )}


      {
        expenseToDelete && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center animate-bounce-subtle">
              <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 className="w-8 h-8" /></div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">¿Eliminar Gasto?</h3>
              <p className="text-slate-500 mb-6">Estás a punto de borrar <span className="font-bold text-slate-700">{expenseToDelete.description}</span>.</p>
              <div className="flex gap-3">
                <button onClick={() => setExpenseToDelete(null)} className="flex-1 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition-colors">Cancelar</button>
                <button onClick={confirmDelete} className="flex-1 px-4 py-2 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700 shadow-lg shadow-rose-200 transition-colors">Sí, eliminar</button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default Expenses;