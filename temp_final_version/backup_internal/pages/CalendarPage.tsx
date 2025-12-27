import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Plus,
  Clock,
  Trash2,
  Edit,
  X,
  CheckCircle2,
  Phone,
  Briefcase,
  AlertCircle
} from 'lucide-react';
import { CalendarEvent } from '../types';

interface CalendarPageProps {
  onBack: () => void;
  events: CalendarEvent[];
  onAddEvent: (event: CalendarEvent) => void;
  onUpdateEvent: (event: CalendarEvent) => void;
  onDeleteEvent: (id: string) => void;
}

const CalendarPage: React.FC<CalendarPageProps> = ({
  onBack,
  events,
  onAddEvent,
  onUpdateEvent,
  onDeleteEvent
}) => {
  // Navigation State
  const [currentDate, setCurrentDate] = useState(new Date()); // Controls the Month View
  const [selectedDate, setSelectedDate] = useState(new Date()); // Controls the Agenda View

  // CRUD Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Helper to get local date string YYYY-MM-DD
  const getLocalDateString = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Form State
  const [formData, setFormData] = useState<Partial<CalendarEvent>>({
    title: '',
    date: getLocalDateString(),
    time: '09:00',
    type: 'meeting',
    description: ''
  });

  // --- CALENDAR LOGIC ---

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  // Semana empezando en Lunes
  const getFirstDayOfMonth = (date: Date) => {
    const dayJS = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    if (dayJS === 0) return 6; // Domingo
    return dayJS - 1; // Lunes = 0
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDateClick = (day: number) => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(newDate);
  };

  const isToday = (day: number) => {
    const today = new Date();
    return day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear();
  };

  const isSelected = (day: number) => {
    return day === selectedDate.getDate() &&
      currentDate.getMonth() === selectedDate.getMonth() &&
      currentDate.getFullYear() === selectedDate.getFullYear();
  };

  const hasEvent = (day: number) => {
    const checkDateStr = getLocalDateString(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
    return events.some(e => e.date === checkDateStr);
  };

  // --- CRUD LOGIC ---

  const handleCreateClick = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData({
      title: '',
      date: getLocalDateString(selectedDate), // Use local date of selection
      time: '09:00',
      type: 'meeting',
      description: ''
    });
    setIsModalOpen(true);
  };

  const handleEditClick = (event: CalendarEvent) => {
    setIsEditing(true);
    setEditingId(event.id);
    setFormData({ ...event });
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    if (window.confirm('¿Eliminar este evento?')) {
      onDeleteEvent(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing && editingId) {
      onUpdateEvent({
        id: editingId,
        title: formData.title!,
        date: formData.date!,
        time: formData.time!,
        type: formData.type as any,
        description: formData.description
      });
    } else {
      onAddEvent({
        id: Date.now().toString(),
        title: formData.title || 'Nuevo Evento',
        date: formData.date || getLocalDateString(),
        time: formData.time || '09:00',
        type: (formData.type as any) || 'meeting',
        description: formData.description
      });
    }
    setIsModalOpen(false);
  };

  // --- RENDERING HELPERS ---

  const filteredEvents = events.filter(e => {
    return e.date === getLocalDateString(selectedDate);
  }).sort((a, b) => a.time.localeCompare(b.time));

  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const daysOfWeek = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'meeting': return <Briefcase className="w-3 h-3 text-blue-500" />;
      case 'call': return <Phone className="w-3 h-3 text-green-500" />;
      case 'deadline': return <AlertCircle className="w-3 h-3 text-red-500" />;
      default: return <CheckCircle2 className="w-3 h-3 text-slate-400" />;
    }
  };

  return (
    <div className="h-full flex flex-col animate-fade-in pb-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-3 flex-shrink-0">
        <button
          onClick={onBack}
          className="group p-3 rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-300 shadow-sm hover:shadow-xl hover:shadow-indigo-50/50 transition-all duration-300"
          title="Volver al Inicio"
        >
          <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform duration-300" strokeWidth={2.5} />
        </button>
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800">Calendario</h2>
        </div>
      </div>

      {/* Main Split Content */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden min-h-0">

        {/* LEFT PANEL: MONTHLY CALENDAR */}
        <div className="w-full lg:w-[75%] h-[65%] lg:h-full bg-white rounded-3xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
            <h3 className="text-lg font-bold text-slate-800 capitalize">
              {months[currentDate.getMonth()]} <span className="text-slate-400 font-medium">{currentDate.getFullYear()}</span>
            </h3>
            <div className="flex gap-1">
              <button onClick={handlePrevMonth} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-600 transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={handleNextMonth} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-600 transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 p-2 md:p-4 flex flex-col min-h-0">
            <div className="grid grid-cols-7 mb-2 flex-shrink-0">
              {daysOfWeek.map(day => (
                <div key={day} className="text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 flex-1 auto-rows-fr gap-1 min-h-0">
              {Array.from({ length: getFirstDayOfMonth(currentDate) }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}

              {Array.from({ length: getDaysInMonth(currentDate) }).map((_, i) => {
                const day = i + 1;
                const today = isToday(day);
                const selected = isSelected(day);
                const eventDot = hasEvent(day);

                return (
                  <button
                    key={day}
                    onClick={() => handleDateClick(day)}
                    className={`
                      relative flex flex-col items-center justify-center rounded-lg transition-all duration-200
                      hover:bg-indigo-50
                      ${today ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700' : ''}
                      ${selected && !today ? 'ring-2 ring-indigo-600 bg-indigo-50' : ''}
                      ${!today && !selected ? 'text-slate-700 bg-white border border-slate-100' : ''}
                    `}
                  >
                    <span className={`text-base md:text-xl font-bold ${today ? 'text-white' : 'text-slate-700'}`}>{day}</span>
                    {eventDot && (
                      <span className={`absolute bottom-1 md:bottom-2 w-1 md:w-1.5 h-1 md:h-1.5 rounded-full ${today ? 'bg-white' : 'bg-indigo-500'}`}></span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: AGENDA LIST */}
        <div className="w-full lg:w-[25%] h-[35%] lg:h-full flex flex-col bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">

          <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10 h-14">
            <h2 className="text-lg font-bold text-slate-800 capitalize leading-none truncate">
              {selectedDate.getDate()} {months[selectedDate.getMonth()]}
            </h2>
            <button
              onClick={handleCreateClick}
              className="flex items-center justify-center w-8 h-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-md transition-all hover:scale-105"
              title="Añadir Evento"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 bg-slate-50/50">
            {filteredEvents.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                <Clock className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-sm text-slate-500 font-medium">Sin eventos</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredEvents.map((event) => (
                  <div key={event.id} className="group flex items-center gap-2 relative bg-white rounded-xl p-3 border border-slate-100 shadow-sm hover:shadow-md transition-all">

                    <div className="w-12 text-center shrink-0 border-r border-slate-100 pr-2">
                      <span className="text-sm font-bold text-slate-700 block">{event.time}</span>
                    </div>

                    <div className={`flex-1 pl-1 min-w-0 pr-24`}>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {getTypeIcon(event.type)}
                        <h4 className="text-sm font-bold text-slate-800 truncate">{event.title}</h4>
                      </div>
                      {event.description && (
                        <p className="text-[10px] text-slate-400 truncate">{event.description}</p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-1/2 -translate-y-1/2 bg-white shadow-lg border border-slate-100 rounded-xl p-1.5 z-10">
                      <button
                        onClick={() => handleEditClick(event)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                        title="Editar"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(event.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        title="Borrar"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- MODAL (CREATE/EDIT) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-bounce-subtle">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800">{isEditing ? 'Editar Evento' : 'Nuevo Evento'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Título</label>
                <input
                  required
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none"
                  placeholder="Ej: Reunión de equipo"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Fecha</label>
                  <input
                    required
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-100"
                    onClick={(e) => e.currentTarget.showPicker?.()}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Hora</label>
                  <input
                    required
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-100"
                    onClick={(e) => e.currentTarget.showPicker?.()}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Tipo</label>
                <div className="grid grid-cols-3 gap-2">
                  {['meeting', 'call', 'deadline'].map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData({ ...formData, type: type as any })}
                      className={`py-2 rounded-lg text-sm font-bold capitalize transition-all border ${formData.type === type
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                          : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Descripción</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none resize-none"
                  placeholder="Detalles adicionales..."
                ></textarea>
              </div>

              <div className="pt-2">
                <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all">
                  {isEditing ? 'Guardar Cambios' : 'Crear Evento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarPage;