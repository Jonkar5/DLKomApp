import React, { useState } from 'react';
import { Client } from '../types';
import { 
  Plus, 
  Phone, 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  Euro, 
  FileText,
  X,
  ChevronRight,
  Edit,
  Trash2,
  Navigation,
  Filter,
  User,
  Printer
} from 'lucide-react';
// @ts-ignore
import jsPDF from 'jspdf';
// @ts-ignore
import autoTable from 'jspdf-autotable';

interface ClientsProps {
  onBack: () => void;
  clients: Client[];
  onUpdateClients: (clients: Client[]) => void;
}

const Clients: React.FC<ClientsProps> = ({ onBack, clients, onUpdateClients }) => {
  // Filtros
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('Todos');
  
  // Modales
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  
  // Report State
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');

  // Estado de edición
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Helper local date
  const getLocalDateString = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Estado del formulario
  const [formData, setFormData] = useState<Partial<Client>>({
    name: '',
    email: '',
    phone: '',
    status: 'Pendiente',
    billing: undefined,
    address: '',
    city: '',
    joinDate: getLocalDateString(),
    notes: ''
  });

  // --- Logic for Filtering ---
  const filteredClients = clients.filter(client => {
    const matchesClient = selectedClientId === '' || client.id === selectedClientId;
    const matchesStatus = statusFilter === 'Todos' || client.status === statusFilter;
    return matchesClient && matchesStatus;
  });

  // --- Handlers ---

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'billing' ? parseFloat(value) : value
    }));
  };

  const handleCreateClick = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData({
      name: '', email: '', phone: '', status: 'Pendiente', billing: undefined, address: '', city: '', joinDate: getLocalDateString(), notes: ''
    });
    setIsFormOpen(true);
  };

  const handleEditClick = (client: Client) => {
    setIsEditing(true);
    setEditingId(client.id);
    setFormData({
      name: client.name,
      email: client.email,
      phone: client.phone,
      status: client.status,
      billing: client.billing,
      address: client.address || '',
      city: client.city || '',
      joinDate: client.joinDate || '',
      notes: client.notes || ''
    });
    setSelectedClient(null); 
    setIsFormOpen(true);    
  };

  const handleDeleteClick = (client: Client) => {
    setClientToDelete(client);
  };

  const confirmDelete = () => {
    if (clientToDelete) {
      onUpdateClients(clients.filter(c => c.id !== clientToDelete.id));
      setClientToDelete(null);
      setSelectedClient(null); 
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isEditing && editingId) {
      // ACTUALIZAR
      onUpdateClients(clients.map(c => {
        if (c.id === editingId) {
          return {
            ...c,
            name: formData.name || c.name,
            email: formData.email || '',
            phone: formData.phone || '',
            status: formData.status as any,
            billing: formData.billing || 0,
            address: formData.address,
            city: formData.city,
            joinDate: formData.joinDate,
            notes: formData.notes
          };
        }
        return c;
      }));
    } else {
      // CREAR
      const newClient: Client = {
        id: Date.now().toString(),
        avatar: `https://picsum.photos/200?random=${Date.now()}`,
        name: formData.name || 'Nuevo Cliente',
        email: formData.email || '',
        phone: formData.phone || '',
        status: formData.status as any,
        billing: formData.billing || 0,
        address: formData.address,
        city: formData.city,
        joinDate: formData.joinDate,
        notes: formData.notes
      };
      onUpdateClients([newClient, ...clients]);
    }

    setIsFormOpen(false);
  };

  const handleGeneratePDF = () => {
    const doc = new jsPDF();
    const reportClients = filteredClients.filter(c => {
      if (!c.joinDate) return false;
      const clientDate = new Date(c.joinDate);
      const start = reportStartDate ? new Date(reportStartDate) : new Date('2000-01-01');
      const end = reportEndDate ? new Date(reportEndDate) : new Date();
      end.setHours(23, 59, 59);
      return clientDate >= start && clientDate <= end;
    });

    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text("DLKom Gestión", 14, 22);
    
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text("Informe de Clientes y Estados", 14, 32);

    doc.setFontSize(10);
    let filterInfo = `Filtros: Estado [${statusFilter}]`;
    if (selectedClientId && filteredClients.length === 1) {
        filterInfo += `, Cliente [${filteredClients[0].name}]`;
    }
    doc.text(filterInfo, 14, 38);

    autoTable(doc, {
      startY: 50,
      head: [['Nombre', 'Estado', 'Fecha', 'Localidad', 'Facturación']],
      body: reportClients.map(c => [
        c.name,
        c.status,
        c.joinDate ? new Date(c.joinDate).toLocaleDateString() : '-',
        c.city || '-',
        (c.billing || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })
      ]),
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 10, cellPadding: 3 },
    });

    doc.save(`informe_clientes_${new Date().toISOString().slice(0,10)}.pdf`);
    setIsReportModalOpen(false);
  };

  const getEmbedMapUrl = (address?: string, city?: string) => {
    const query = encodeURIComponent(`${address || ''}, ${city || ''}`);
    return `https://maps.google.com/maps?q=${query}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
  };

  const getMapUrl = (address?: string, city?: string) => {
    const query = encodeURIComponent(`${address || ''}, ${city || ''}`);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Pendiente': return 'bg-amber-500';
      case 'En Curso': return 'bg-blue-500';
      case 'Finalizado': return 'bg-emerald-500';
      default: return 'bg-slate-400';
    }
  };
  
  const getStatusBorderColor = (status: string) => {
    switch(status) {
      case 'Pendiente': return 'border-amber-400';
      case 'En Curso': return 'border-blue-500';
      case 'Finalizado': return 'border-emerald-500';
      default: return 'border-slate-300';
    }
  };

  const getStatusBadgeStyles = (status: string) => {
     switch(status) {
      case 'Pendiente': return 'bg-amber-100 text-amber-700';
      case 'En Curso': return 'bg-blue-100 text-blue-700';
      case 'Finalizado': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getInitials = (name: string) => {
      return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-5">
            <button onClick={onBack} className="group p-3 rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-300 shadow-sm hover:shadow-xl hover:shadow-indigo-50/50 transition-all duration-300">
                <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform duration-300" strokeWidth={2.5} />
            </button>
            <div>
                <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Clientes</h2>
                <p className="text-slate-500 font-medium">Gestión de cartera</p>
            </div>
        </div>
        
        <div className="flex items-center gap-3">
            <button onClick={() => setIsReportModalOpen(true)} className="group flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 font-medium hover:border-indigo-600 hover:text-indigo-600 transition-all duration-300 shadow-sm hover:shadow-md">
                <Printer className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" strokeWidth={1.5} />
                <span className="hidden md:inline text-sm">Informe</span>
            </button>
            <button onClick={handleCreateClick} className="group flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all duration-300 transform hover:-translate-y-0.5">
                <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" strokeWidth={1.5} />
                <span className="hidden md:inline text-sm font-semibold">Nuevo</span>
            </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-row gap-3">
        <div className="relative flex-1">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
             <User className="w-5 h-5 text-slate-400" />
          </div>
          <select value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-700 font-medium outline-none focus:ring-2 focus:ring-indigo-100 appearance-none cursor-pointer truncate">
            <option value="">Todos los clientes</option>
            {clients.map(client => (
              <option key={client.id} value={client.id}>{client.name}</option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
             <ChevronRight className="w-4 h-4 text-slate-400 rotate-90" />
          </div>
        </div>

        <div className="relative w-1/3 min-w-[140px]">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <Filter className="w-5 h-5 text-slate-400" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-700 font-medium outline-none focus:ring-2 focus:ring-indigo-100 appearance-none cursor-pointer truncate">
            <option value="Todos">Todos</option>
            <option value="Pendiente">Pendiente</option>
            <option value="En Curso">En Curso</option>
            <option value="Finalizado">Finalizado</option>
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <ChevronRight className="w-4 h-4 text-slate-400 rotate-90" />
          </div>
        </div>
      </div>

      {/* Clients List */}
      <div className="space-y-4">
        {filteredClients.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <p>No se encontraron clientes.</p>
          </div>
        ) : (
          filteredClients.map((client) => (
            <div 
                key={client.id} 
                onClick={() => setSelectedClient(client)} 
                className={`bg-white rounded-r-2xl rounded-l-md border-l-[6px] ${getStatusBorderColor(client.status)} shadow-sm p-5 flex items-center gap-5 cursor-pointer hover:shadow-lg hover:scale-[1.01] transition-all duration-300 group`}
            >
              <div className="relative shrink-0">
                {client.avatar ? (
                  <img src={client.avatar} alt={client.name} className="w-14 h-14 rounded-full object-cover bg-slate-100 shadow-sm" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg shadow-sm">
                      {getInitials(client.name)}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                <h3 className="text-lg font-bold text-slate-800 truncate group-hover:text-indigo-700 transition-colors">
                  {client.name}
                </h3>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm text-slate-500">
                  <div className="flex items-center gap-1.5 min-w-0 truncate">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{[client.address, client.city].filter(Boolean).join(', ') || 'Sin dirección'}</span>
                  </div>
                  {client.phone && (
                    <div className="hidden sm:flex items-center gap-1.5 shrink-0 sm:border-l sm:border-slate-200 sm:pl-4">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{client.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end justify-center gap-2 shrink-0">
                <span className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full ${getStatusBadgeStyles(client.status)}`}>
                      {client.status}
                </span>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{client.joinDate ? new Date(client.joinDate).toLocaleDateString() : '-'}</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-400 shrink-0 ml-1" />
            </div>
          ))
        )}
      </div>

      {/* --- CLIENT DETAILS MODAL --- */}
      {selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-bounce-subtle flex flex-col max-h-[90vh]">
              <div className="h-32 bg-slate-100 relative">
                  {(selectedClient.address || selectedClient.city) ? (
                    <iframe width="100%" height="100%" frameBorder="0" scrolling="no" src={getEmbedMapUrl(selectedClient.address, selectedClient.city)} className="w-full h-full opacity-80"></iframe>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300"><MapPin className="w-10 h-10" /></div>
                  )}
                  <button onClick={() => setSelectedClient(null)} className="absolute top-4 right-4 p-2 rounded-full bg-white/80 hover:bg-white text-slate-600 hover:text-slate-900 transition-colors shadow-sm backdrop-blur-sm z-10">
                   <X className="w-5 h-5" />
                 </button>
              </div>

              <div className="px-6 relative -mt-10 flex justify-between items-end">
                  <div className="relative">
                      {selectedClient.avatar ? (
                        <img src={selectedClient.avatar} alt={selectedClient.name} className="w-24 h-24 rounded-full object-cover border-[6px] border-white shadow-md bg-white" />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-2xl border-[6px] border-white shadow-md">
                            {getInitials(selectedClient.name)}
                        </div>
                      )}
                      <span className={`absolute bottom-2 right-2 w-5 h-5 rounded-full border-4 border-white ${getStatusColor(selectedClient.status)}`}></span>
                  </div>
                  <div className="mb-2">
                     <span className={`inline-block text-xs font-bold uppercase tracking-wide px-3 py-1 rounded-full ${getStatusBadgeStyles(selectedClient.status)}`}>
                        {selectedClient.status}
                    </span>
                  </div>
              </div>

              <div className="p-6 pt-2 overflow-y-auto space-y-6">
                 <div>
                    <h3 className="text-2xl font-bold text-slate-800 leading-tight">{selectedClient.name}</h3>
                    <p className="text-slate-500 font-medium">{selectedClient.email}</p>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex flex-col justify-center">
                        <span className="text-xs text-indigo-400 font-bold uppercase tracking-wider">Facturación</span>
                        <div className="flex items-center gap-1 text-indigo-900 font-bold text-xl mt-1">
                            <Euro className="w-6 h-6" />
                            {selectedClient.billing?.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-center">
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Fecha</span>
                        <div className="flex items-center gap-2 text-slate-700 font-bold text-xl mt-1">
                            <Calendar className="w-5 h-5 text-slate-400" />
                            {new Date(selectedClient.joinDate || '').toLocaleDateString()}
                        </div>
                    </div>
                 </div>
                 <div className="space-y-3">
                    {selectedClient.phone && (
                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
                            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                                <Phone className="w-5 h-5" />
                            </div>
                            <div>
                                <span className="block text-xs font-bold text-slate-400 uppercase">Teléfono</span>
                                <span className="text-slate-800 font-semibold">{selectedClient.phone}</span>
                            </div>
                        </div>
                    )}
                    {(selectedClient.address || selectedClient.city) && (
                         <div className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
                            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                                <MapPin className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-center">
                                    <span className="block text-xs font-bold text-slate-400 uppercase">Dirección</span>
                                    <a href={getMapUrl(selectedClient.address, selectedClient.city)} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-md">
                                        <Navigation className="w-3 h-3" />
                                        GPS
                                    </a>
                                </div>
                                <span className="text-slate-800 font-semibold block mt-0.5">{[selectedClient.address, selectedClient.city].filter(Boolean).join(', ')}</span>
                            </div>
                        </div>
                    )}
                 </div>
              </div>

              <div className="p-5 border-t border-slate-100 flex gap-4 bg-slate-50/50">
                  <button onClick={() => handleDeleteClick(selectedClient)} className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-white border border-rose-200 text-rose-600 font-bold hover:bg-rose-50 transition-colors shadow-sm">
                      <Trash2 className="w-5 h-5" />
                      Borrar
                  </button>
                  <button onClick={() => handleEditClick(selectedClient)} className="flex-[2] flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-colors">
                      <Edit className="w-5 h-5" />
                      Editar
                  </button>
              </div>
           </div>
        </div>
      )}

      {/* --- FORM MODAL --- */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-bounce-subtle">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-2xl font-bold text-slate-800">{isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
              <button onClick={() => setIsFormOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Nombre del Cliente</label>
                  <input required name="name" value={formData.name} onChange={handleInputChange} type="text" className="w-full px-4 py-3 bg-white rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all" />
                </div>
                <div className="col-span-2 md:col-span-1">
                   <label className="block text-sm font-semibold text-slate-700 mb-2">Facturación</label>
                   <div className="relative">
                      <input name="billing" value={formData.billing || ''} onChange={handleInputChange} type="number" step="0.01" className="w-full pl-4 pr-10 py-3 bg-white rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all" />
                      <span className="absolute right-4 top-3.5 text-slate-500 font-bold">€</span>
                   </div>
                </div>
                <div className="col-span-2 md:col-span-1">
                   <label className="block text-sm font-semibold text-slate-700 mb-2">Teléfono</label>
                   <div className="relative">
                      <Phone className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                      <input name="phone" value={formData.phone} onChange={handleInputChange} type="tel" className="w-full pl-10 pr-4 py-3 bg-white rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all" />
                   </div>
                </div>
                <div className="col-span-2 md:col-span-1">
                   <label className="block text-sm font-semibold text-slate-700 mb-2">Fecha</label>
                   <div className="relative">
                      <Calendar className="absolute left-3 top-3.5 w-5 h-5 text-slate-400 pointer-events-none" />
                      <input name="joinDate" value={formData.joinDate} onChange={handleInputChange} type="date" className="w-full pl-10 pr-4 py-3 bg-white rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-slate-600 cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:p-1" onClick={(e) => e.currentTarget.showPicker?.()} />
                   </div>
                </div>
                <div className="col-span-2 md:col-span-1">
                   <label className="block text-sm font-semibold text-slate-700 mb-2">Estado</label>
                   <select name="status" value={formData.status} onChange={handleInputChange} className="w-full px-4 py-3 bg-white rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all">
                     <option value="Pendiente">Pendiente</option>
                     <option value="En Curso">En Curso</option>
                     <option value="Finalizado">Finalizado</option>
                   </select>
                </div>
                <div className="col-span-2 md:col-span-1">
                   <label className="block text-sm font-semibold text-slate-700 mb-2">Dirección</label>
                   <div className="relative">
                      <MapPin className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                      <input name="address" value={formData.address} onChange={handleInputChange} type="text" className="w-full pl-10 pr-4 py-3 bg-white rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all" />
                   </div>
                </div>
                <div className="col-span-2 md:col-span-1">
                   <label className="block text-sm font-semibold text-slate-700 mb-2">Localidad</label>
                   <input name="city" value={formData.city} onChange={handleInputChange} type="text" className="w-full px-4 py-3 bg-white rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all" />
                </div>
                <div className="col-span-2">
                   <label className="block text-sm font-semibold text-slate-700 mb-2">Notas</label>
                   <div className="relative">
                      <FileText className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                      <textarea name="notes" value={formData.notes} onChange={handleInputChange} rows={3} className="w-full pl-10 pr-4 py-3 bg-white rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all resize-none"></textarea>
                   </div>
                </div>
              </div>
              <div className="flex gap-4 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsFormOpen(false)} className="flex-1 px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-colors">{isEditing ? 'Guardar Cambios' : 'Crear Cliente'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DELETE CONFIRMATION --- */}
      {clientToDelete && (
         <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center animate-bounce-subtle">
               <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 className="w-8 h-8" /></div>
               <h3 className="text-xl font-bold text-slate-800 mb-2">¿Eliminar Cliente?</h3>
               <p className="text-slate-500 mb-6">Estás a punto de borrar a <span className="font-bold text-slate-700">{clientToDelete.name}</span>.</p>
               <div className="flex gap-3">
                  <button onClick={() => setClientToDelete(null)} className="flex-1 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition-colors">Cancelar</button>
                  <button onClick={confirmDelete} className="flex-1 px-4 py-2 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700 shadow-lg shadow-rose-200 transition-colors">Sí, eliminar</button>
               </div>
            </div>
         </div>
      )}

      {/* --- REPORT MODAL --- */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 animate-bounce-subtle">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600"><Printer className="w-5 h-5" /></div>
                        <h3 className="text-xl font-bold text-slate-800">Generar Informe</h3>
                    </div>
                    <button onClick={() => setIsReportModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
                </div>
                <div className="space-y-4 mb-6">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Fecha Inicio</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-2.5 w-5 h-5 text-slate-400 pointer-events-none" />
                            <input type="date" value={reportStartDate} onChange={(e) => setReportStartDate(e.target.value)} className="w-full pl-10 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none text-slate-600 cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:p-1" onClick={(e) => e.currentTarget.showPicker?.()} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Fecha Fin</label>
                         <div className="relative">
                            <Calendar className="absolute left-3 top-2.5 w-5 h-5 text-slate-400 pointer-events-none" />
                            <input type="date" value={reportEndDate} onChange={(e) => setReportEndDate(e.target.value)} className="w-full pl-10 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none text-slate-600 cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:p-1" onClick={(e) => e.currentTarget.showPicker?.()} />
                        </div>
                    </div>
                </div>
                <button onClick={handleGeneratePDF} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"><FileText className="w-5 h-5" />Descargar PDF</button>
            </div>
        </div>
      )}
    </div>
  );
};

export default Clients;