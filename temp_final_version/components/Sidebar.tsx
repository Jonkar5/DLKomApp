import React, { useRef, useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Receipt, 
  TrendingUp, 
  Calendar, 
  Image as ImageIcon,
  Upload,
  LogOut
} from 'lucide-react';
import { ViewState } from '../types';

interface SidebarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView }) => {
  const [logo, setLogo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const NavItem = ({ view, icon: Icon, label }: { view: ViewState; icon: React.ElementType; label: string }) => (
    <button
      onClick={() => onChangeView(view)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
        currentView === view
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
          : 'text-slate-500 hover:bg-white hover:text-indigo-600 hover:shadow-md'
      }`}
    >
      <Icon className={`w-5 h-5 ${currentView === view ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600'}`} />
      <span className="font-medium text-sm">{label}</span>
    </button>
  );

  return (
    <div className="w-64 h-screen bg-slate-50 border-r border-slate-200 flex flex-col p-6 sticky top-0">
      {/* Logo Section */}
      <div className="mb-10 flex flex-col items-center">
        <div 
          onClick={handleLogoClick}
          className="w-32 h-32 rounded-2xl bg-white border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-all overflow-hidden shadow-sm group relative"
        >
          {logo ? (
            <img src={logo} alt="Company Logo" className="w-full h-full object-cover" />
          ) : (
            <>
              <Upload className="w-8 h-8 text-slate-300 group-hover:text-indigo-500 mb-2 transition-colors" />
              <span className="text-xs text-slate-400 group-hover:text-indigo-600 font-medium">Subir Logo</span>
            </>
          )}
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-white text-xs font-bold">Cambiar</span>
          </div>
        </div>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          className="hidden" 
          accept="image/*"
        />
        <h1 className="mt-4 text-2xl font-bold text-slate-800 tracking-tight">DLKom</h1>
        <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold mt-1">Enterprise</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2">
        <NavItem view="dashboard" icon={LayoutDashboard} label="Dashboard" />
        <NavItem view="clients" icon={Users} label="Clientes" />
        <NavItem view="expenses" icon={Receipt} label="Gastos" />
        <NavItem view="profits" icon={TrendingUp} label="Beneficios" />
        <NavItem view="calendar" icon={Calendar} label="Calendario" />
        <NavItem view="photos" icon={ImageIcon} label="Fotos" />
      </nav>

      {/* User / Logout */}
      <div className="mt-auto pt-6 border-t border-slate-200">
        <button className="flex items-center gap-3 text-slate-500 hover:text-red-500 transition-colors w-full px-4 py-2">
          <LogOut className="w-5 h-5" />
          <span className="font-medium text-sm">Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
