export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'Pendiente' | 'En Curso' | 'Finalizado';
  avatar: string;
  billing?: number;
  joinDate?: string;
  address?: string;
  city?: string;
  notes?: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  clientId?: string; // Optional link to a client
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // Format YYYY-MM-DD
  time: string;
  type: 'meeting' | 'deadline' | 'call' | 'personal';
  description?: string;
}

export interface Photo {
  id: string;
  clientId: string;
  url: string;
  category: 'actual' | 'final';
  date: string;
}

export type ViewState = 'dashboard' | 'clients' | 'expenses' | 'profits' | 'calendar' | 'photos';