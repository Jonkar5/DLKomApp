import React, { useState, useEffect } from 'react';
import { ViewState, CalendarEvent, Client, Expense, Photo } from './types';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Expenses from './pages/Expenses';
import Profits from './pages/Profits';
import CalendarPage from './pages/CalendarPage';
import Photos from './pages/Photos';
import { 
  Users, 
  CreditCard, 
  TrendingUp, 
  Calendar, 
  Image as ImageIcon,
  LayoutDashboard 
} from 'lucide-react';

// Helper to get local date string YYYY-MM-DD
const getLocalDateString = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// --- INITIAL DATA ---

const initialEvents: CalendarEvent[] = [
  { 
    id: '1', 
    title: 'Reunión con Cliente: Tech Solutions', 
    date: getLocalDateString(), 
    time: '09:00', 
    type: 'meeting',
    description: 'Revisión de requisitos del proyecto Alpha.'
  },
  { 
    id: '2', 
    title: 'Llamada de estrategia', 
    date: getLocalDateString(), 
    time: '11:30', 
    type: 'call',
    description: 'Hablar sobre campaña de marketing Q4.'
  },
  { 
    id: '3', 
    title: 'Entrega de Proyecto', 
    date: '2023-10-28', 
    time: '14:00', 
    type: 'deadline',
    description: 'Fecha límite entrega diseño web.'
  },
];

const initialClients: Client[] = [
  { 
    id: '1', 
    name: 'Ana Garcia', 
    email: 'ana.garcia@example.com', 
    phone: '+34 600 123 456', 
    status: 'En Curso', 
    avatar: 'https://picsum.photos/200',
    billing: 4500.50,
    address: 'Gran Vía 24',
    city: 'Madrid',
    joinDate: '2023-01-15',
    notes: 'Cliente preferente.'
  },
  { 
    id: '2', 
    name: 'Carlos Rodriguez', 
    email: 'carlos.r@example.com', 
    phone: '+34 600 987 654', 
    status: 'Pendiente', 
    avatar: 'https://picsum.photos/201',
    billing: 0,
    address: 'Carrer de Balmes 50',
    city: 'Barcelona',
    joinDate: '2023-05-20'
  },
  { 
    id: '3', 
    name: 'Sofia Martinez', 
    email: 'sofia.m@example.com', 
    phone: '+34 611 222 333', 
    status: 'Finalizado', 
    avatar: 'https://picsum.photos/202',
    billing: 3450.00,
    address: 'Calle Sierpes 12',
    city: 'Sevilla',
    joinDate: '2023-08-10'
  }
];

const initialExpenses: Expense[] = [
  { id: '1', description: 'Licencia Software Cloud', amount: 249.00, date: '2023-10-25', category: 'Otros', clientId: '1' },
  { id: '2', description: 'Material de Obra', amount: 1250.50, date: '2023-10-24', category: 'Materiales', clientId: '1' },
  { id: '3', description: 'Decoración Hall', amount: 1200.00, date: '2023-10-01', category: 'Decoracion', clientId: '3' }, 
  { id: '4', description: 'Personal Extra', amount: 450.00, date: '2023-10-20', category: 'Personal', clientId: '1' },
];

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  
  // Centralized State
  // Initialize logo from localStorage if available
  const [logo, setLogo] = useState<string | null>(() => localStorage.getItem('appLogo'));
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [photos, setPhotos] = useState<Photo[]>([]);

  // Effect to update Favicon and LocalStorage when logo changes
  useEffect(() => {
    if (logo) {
      // Save to storage
      localStorage.setItem('appLogo', logo);
      
      // Update Favicon
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = logo;
    } else {
      localStorage.removeItem('appLogo');
      // Optional: Reset to default favicon if needed, or leave blank
    }
  }, [logo]);

  const handleNavigate = (view: ViewState) => {
    setCurrentView(view);
  };

  const goHome = () => setCurrentView('dashboard');

  // --- Logo Handler ---
  const handleLogoChange = (newLogo: string | null) => {
    setLogo(newLogo);
  };

  // --- Event Handlers ---
  const handleAddEvent = (newEvent: CalendarEvent) => {
    setEvents(prev => [...prev, newEvent]);
  };
  const handleUpdateEvent = (updatedEvent: CalendarEvent) => {
    setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
  };
  const handleDeleteEvent = (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  // --- Client Handlers ---
  const handleUpdateClients = (newClients: Client[]) => {
    setClients(newClients);
  };

  // --- Expense Handlers ---
  const handleUpdateExpenses = (newExpenses: Expense[]) => {
    setExpenses(newExpenses);
  };

  // --- Photo Handlers ---
  const handleUpdatePhotos = (newPhotos: Photo[]) => {
    setPhotos(newPhotos);
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard': 
        return (
          <Dashboard 
            onNavigate={handleNavigate} 
            events={events} 
            logo={logo}
            onLogoChange={handleLogoChange}
          />
        );
      case 'clients': 
        return (
          <div className="max-w-7xl mx-auto p-4 md:p-8">
            <Clients 
              onBack={goHome} 
              clients={clients}
              onUpdateClients={handleUpdateClients}
            />
          </div>
        );
      case 'expenses': 
        return (
          <div className="max-w-7xl mx-auto p-4 md:p-8">
            <Expenses 
              onBack={goHome} 
              expenses={expenses}
              onUpdateExpenses={handleUpdateExpenses}
              clients={clients}
            />
          </div>
        );
      case 'profits': 
        return (
           <div className="max-w-7xl mx-auto p-4 md:p-8">
            <Profits 
              onBack={goHome} 
              clients={clients}
              expenses={expenses}
            />
          </div>
        );
      case 'calendar': 
        return (
          <div className="max-w-7xl mx-auto p-4 md:p-8 h-full">
            <CalendarPage 
              onBack={goHome} 
              events={events}
              onAddEvent={handleAddEvent}
              onUpdateEvent={handleUpdateEvent}
              onDeleteEvent={handleDeleteEvent}
            />
          </div>
        );
      case 'photos': 
        return (
          <div className="max-w-7xl mx-auto p-4 md:p-8">
            <Photos 
              onBack={goHome} 
              clients={clients}
              photos={photos}
              onUpdatePhotos={handleUpdatePhotos}
            />
          </div>
        );
      default: 
        return (
            <Dashboard 
                onNavigate={handleNavigate} 
                events={events} 
                logo={logo}
                onLogoChange={handleLogoChange}
            />
        );
    }
  };

  const BottomTab = ({ view, icon: Icon, label }: { view: ViewState, icon: React.ElementType, label: string }) => {
    const isActive = currentView === view;
    return (
      <button 
        onClick={() => setCurrentView(view)}
        className={`flex flex-col items-center justify-center gap-1 p-2 transition-colors ${isActive ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
      >
          <Icon className={`w-6 h-6 ${isActive ? 'stroke-2' : 'stroke-1.5'}`} />
          <span className={`text-[10px] font-semibold uppercase tracking-wide ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>{label}</span>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <main className={`w-full flex-1 ${currentView === 'dashboard' ? 'pb-20' : 'pb-4'}`}>
        {renderContent()}
      </main>

      {/* Global Bottom Navigation - Only on Dashboard */}
      {currentView === 'dashboard' && (
        <div className="fixed bottom-0 w-full h-20 bg-white border-t border-slate-200 grid grid-cols-6 items-center px-2 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-[100]">
            <BottomTab view="dashboard" icon={LayoutDashboard} label="Inicio" />
            <BottomTab view="clients" icon={Users} label="Clientes" />
            <BottomTab view="expenses" icon={CreditCard} label="Gastos" />
            <BottomTab view="profits" icon={TrendingUp} label="Beneficios" />
            <BottomTab view="photos" icon={ImageIcon} label="Fotos" />
            <BottomTab view="calendar" icon={Calendar} label="Agenda" />
        </div>
      )}
    </div>
  );
};

export default App;