export type PaymentStatus = 'Pagado' | 'Pendiente' | 'Parcial';

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'Pendiente' | 'En Curso' | 'Finalizado';
  paymentStatus?: PaymentStatus;
  paidAmount?: number;
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
  paymentStatus?: PaymentStatus;
  paidAmount?: number;
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


export interface ProfitDistributionItem {
  id: string; // Partner Name or unique ID
  name: string;
  percentage: number;
  amount: number;
  status: 'Pendiente' | 'Pagado' | 'Parcial';
  paidDate?: string;
  notes?: string;
}

export interface ProfitDistribution {
  id: string;
  date: string;
  period: string; // e.g., "Enero 2024" or "Q1 2024"
  totalProfit: number;
  items: ProfitDistributionItem[];
  notes?: string;
}

export interface SupplierInvoice {
  id: string;
  provider: string;
  date: string;
  imageUrl: string; // Base64 compressed image or PDF data uri
  fileType?: 'image' | 'pdf';
  amount?: number;
  notes?: string;
}

export type ViewState = 'dashboard' | 'clients' | 'expenses' | 'profits' | 'calendar' | 'photos' | 'invoices';