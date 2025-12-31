import React, { useState, useEffect } from 'react';
import { ViewState, CalendarEvent, Client, Expense, Photo } from './types';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Expenses from './pages/Expenses';
import Profits from './pages/Profits';
import CalendarPage from './pages/CalendarPage';
import Photos from './pages/Photos';
import NotificationManager, { NotificationManagerRef } from './components/NotificationManager';
import { useFirestore } from './src/hooks/useFirestore';
import {
  Users,
  CreditCard,
  TrendingUp,
  Calendar,
  Image as ImageIcon,
  LayoutDashboard
} from 'lucide-react';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const notificationRef = React.useRef<NotificationManagerRef>(null);

  // Centralized State - Firestore
  const [logo, setLogo] = useState<string | null>(() => localStorage.getItem('appLogo'));

  // Firestore Hooks
  const {
    data: events,
    add: addEvent,
    update: updateEvent,
    remove: deleteEvent
  } = useFirestore<CalendarEvent>('events');

  const {
    data: clients,
    add: addClient,
    update: updateClient,
    remove: deleteClient
  } = useFirestore<Client>('clients');

  const {
    data: expenses,
    add: addExpense,
    update: updateExpense,
    remove: deleteExpense
  } = useFirestore<Expense>('expenses');

  const {
    data: profitDistributions,
    add: addDistribution,
    update: updateDistribution,
    remove: deleteDistribution
  } = useFirestore<import('./types').ProfitDistribution>('profit_distributions');

  const {
    data: photos,
    add: addPhoto,
    remove: deletePhoto
  } = useFirestore<Photo>('photos');

  // Effect to update Favicon and LocalStorage when logo changes
  // Effect to update Favicon and LocalStorage when logo changes
  useEffect(() => {
    if (logo) {
      try {
        localStorage.setItem('appLogo', logo);
      } catch (error) {
        console.error("Error saving logo to localStorage", error);
        alert("La imagen del logo es demasiado grande para guardarse. Se ha redimensionado automáticamente, pero si sigue fallando, pruebe con una imagen más pequeña.");
      }

      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = logo;
    } else {
      localStorage.removeItem('appLogo');
    }
  }, [logo]);

  // --- Navigation & History Handler ---
  useEffect(() => {
    // Initial state
    window.history.replaceState({ view: 'dashboard' }, '', '');

    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.view) {
        setCurrentView(event.state.view);
      } else {
        // Fallback or default
        setCurrentView('dashboard');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleNavigate = (view: ViewState) => {
    window.history.pushState({ view }, '', '');
    setCurrentView(view);
  };

  const goHome = () => {
    window.history.pushState({ view: 'dashboard' }, '', '');
    setCurrentView('dashboard');
  };

  // --- Logo Handler ---
  const handleLogoChange = (newLogo: string | null) => {
    setLogo(newLogo);
  };

  // --- Wrapper Handlers for Type Compatibility ---
  const handleAddEvent = (event: CalendarEvent) => addEvent(event);
  const handleUpdateEvent = (event: CalendarEvent) => updateEvent(event.id, event);
  const handleDeleteEvent = (id: string) => deleteEvent(id);

  const handleAddClient = (client: Client) => addClient(client);
  const handleUpdateClient = (id: string, updates: Partial<Client>) => updateClient(id, updates);
  const handleDeleteClient = (id: string) => deleteClient(id);

  const handleAddExpense = (expense: Expense) => addExpense(expense);
  const handleUpdateExpense = (id: string, updates: Partial<Expense>) => updateExpense(id, updates);
  const handleDeleteExpense = (id: string) => deleteExpense(id);

  const handleAddDistribution = (distribution: import('./types').ProfitDistribution) => addDistribution(distribution);
  const handleUpdateDistribution = (id: string, updates: Partial<import('./types').ProfitDistribution>) => updateDistribution(id, updates);
  const handleDeleteDistribution = (id: string) => deleteDistribution(id);

  const handleAddPhoto = (photo: Photo) => addPhoto(photo);
  const handleDeletePhoto = (id: string) => deletePhoto(id);

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
              onAddClient={handleAddClient}
              onUpdateClient={handleUpdateClient}
              onDeleteClient={handleDeleteClient}
            />
          </div>
        );
      case 'expenses':
        return (
          <div className="max-w-7xl mx-auto p-4 md:p-8">
            <Expenses
              onBack={goHome}
              expenses={expenses}
              onAddExpense={handleAddExpense}
              onUpdateExpense={handleUpdateExpense}
              onDeleteExpense={handleDeleteExpense}
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
              distributions={profitDistributions}
              onAddDistribution={handleAddDistribution}
              onUpdateDistribution={handleUpdateDistribution}
              onDeleteDistribution={handleDeleteDistribution}
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
              onAddPhoto={handleAddPhoto}
              onDeletePhoto={handleDeletePhoto}
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
            onRequestNotifications={() => notificationRef.current?.requestPermission()}
          />
        );
    }
  };

  const BottomTab = ({ view, icon: Icon, label }: { view: ViewState, icon: React.ElementType, label: string }) => {
    const isActive = currentView === view;
    return (
      <button
        onClick={() => {
          window.history.pushState({ view }, '', '');
          setCurrentView(view);
        }}
        className={`flex flex-col items-center justify-center gap-1 p-2 transition-colors ${isActive ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
      >
        <Icon className={`w-6 h-6 ${isActive ? 'stroke-2' : 'stroke-1.5'}`} />
        <span className={`text-[10px] font-semibold uppercase tracking-wide ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>{label}</span>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <NotificationManager ref={notificationRef} events={events} />
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