import React, { useRef, useState, useEffect } from 'react';
import { CalendarEvent, ViewState } from '../types';
import {
  Users,
  CreditCard,
  TrendingUp,
  Calendar,
  Image as ImageIcon,
  Upload,
  Search,
  ChevronRight,
  Eraser,
  RefreshCw
} from 'lucide-react';

interface DashboardProps {
  onNavigate: (view: ViewState) => void;
  events: CalendarEvent[];
  logo: string | null;
  onLogoChange: (logo: string | null) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate, events, logo, onLogoChange }) => {
  const [isReloading, setIsReloading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 500;

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          const dataUrl = canvas.toDataURL('image/jpeg', 0.8); // Compress to JPEG
          onLogoChange(dataUrl);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRefresh = () => {
    setIsReloading(true);
    setTimeout(() => {
      setIsReloading(false);
    }, 1500);
  };

  const handleClearCache = () => {
    if (window.confirm('¿Estás seguro de que quieres borrar la caché y reiniciar la aplicación?')) {
      try {
        localStorage.clear();
        sessionStorage.clear();
        onLogoChange(null);
        window.location.reload();
      } catch (e) {
        console.error('Error al borrar caché', e);
      }
    }
  };

  const DashboardCard = ({
    view,
    icon: Icon,
    title,
    color,
    delay,
    fullWidth = false,
    compact = false
  }: {
    view: ViewState;
    icon: React.ElementType;
    title: string;
    color: string;
    delay: string;
    fullWidth?: boolean;
    compact?: boolean;
  }) => (
    <button
      onClick={() => onNavigate(view)}
      className={`
        ${fullWidth ? 'col-span-2 flex-row px-8 md:px-12' : 'col-span-1 flex-col p-4'}
        w-full h-full group relative overflow-hidden bg-white hover:bg-gradient-to-br hover:from-white hover:to-${color}-50 
        rounded-3xl shadow-sm border border-slate-100 hover:shadow-2xl hover:border-${color}-200 
        transition-all duration-300 flex items-center justify-center gap-4 animate-fade-in ${delay}
      `}
    >
      <div className={`
        ${compact ? 'p-3' : 'p-5'} rounded-2xl bg-${color}-50 text-${color}-600 
        group-hover:scale-110 group-hover:-translate-y-2 transition-transform duration-300 shadow-sm
      `}>
        {/* Icon sizing logic */}
        <Icon className={
          compact ? "w-8 h-8 md:w-10 md:h-10" :
            fullWidth ? "w-10 h-10 md:w-14 md:h-14" :
              "w-10 h-10 md:w-16 md:h-16"
        } strokeWidth={1.5} />
      </div>

      <div className={fullWidth ? "flex-1 text-left" : "text-center"}>
        <span className={`block font-bold text-slate-700 ${compact ? 'text-lg' : 'text-lg md:text-2xl'} group-hover:text-indigo-900 transition-colors tracking-tight`}>
          {title}
        </span>
        {fullWidth && !compact && <span className="text-sm md:text-lg text-slate-400 hidden md:inline mt-1 block">Gestión completa de agenda y citas</span>}
      </div>

      {fullWidth && (
        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-slate-100 flex items-center justify-center text-slate-300 group-hover:border-${color}-200 group-hover:text-${color}-500 transition-colors`}>
          <ChevronRight className="w-6 h-6 md:w-8 md:h-8" />
        </div>
      )}
    </button>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden bg-slate-50/50 relative">

      {/* Header Bar */}
      <header className="h-28 md:h-32 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between shrink-0 z-10 relative shadow-sm">
        <div className="flex items-center gap-4 md:gap-6">
          <div
            onClick={handleLogoClick}
            className="w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-slate-50 overflow-hidden relative group shadow-sm transition-all"
          >
            {logo ? (
              <img src={logo} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center text-slate-400 group-hover:text-indigo-500">
                <Upload className="w-8 h-8 mb-1" />
                <span className="text-[10px] font-bold uppercase">Logo</span>
              </div>
            )}
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
          </div>
          <div className="flex flex-col justify-center">
            <h1 className="text-xl md:text-2xl font-extrabold text-slate-800 tracking-tight leading-none">DLKom</h1>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Gestión</span>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <div className="hidden md:flex items-center bg-slate-100 rounded-full px-5 py-2.5 border border-transparent focus-within:border-indigo-300 focus-within:bg-white transition-all mr-2">
            <Search className="w-5 h-5 text-slate-400 mr-2" />
            <input type="text" placeholder="Buscar..." className="bg-transparent border-none outline-none text-sm text-slate-600 placeholder:text-slate-400 w-32 focus:w-48 transition-all" />
          </div>

          <button
            onClick={handleRefresh}
            title="Actualizar datos"
            className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors relative group"
          >
            <RefreshCw className={`w-6 h-6 ${isReloading ? 'animate-spin text-indigo-600' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
          </button>

          <button
            onClick={handleClearCache}
            title="Borrar Caché y Reiniciar"
            className="w-10 h-10 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-sm group"
          >
            <Eraser className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </header>

      {/* Main Content Area - Grid */}
      <div className="flex-1 flex flex-col p-3 md:p-6 overflow-hidden pb-0">
        <div className="flex-1 grid grid-cols-2 gap-3 md:gap-6 auto-rows-fr">

          {/* Fila 1 */}
          <DashboardCard view="clients" icon={Users} title="Clientes" color="violet" delay="delay-75" />
          <DashboardCard view="expenses" icon={CreditCard} title="Gastos" color="rose" delay="delay-100" />

          {/* Fila 2 */}
          <DashboardCard view="profits" icon={TrendingUp} title="Beneficios" color="teal" delay="delay-150" />
          <DashboardCard view="photos" icon={ImageIcon} title="Fotos" color="sky" delay="delay-200" />

          {/* Fila 3 - Full Width */}
          <DashboardCard view="calendar" icon={Calendar} title="Calendario" color="orange" delay="delay-300" fullWidth={true} compact={true} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;