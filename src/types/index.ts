export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  address?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Charge {
  id: string;
  customerId: string;
  customerName: string;
  fundId?: string;
  fundName?: string;
  amount: number;
  currency: string;
  description: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  transactionId?: string;
  createdAt: Date;
  updatedAt: Date;
  receiptNumber?: string;
}

export interface TranzilaRequest {
  amount: number;
  currency: string;
  ccno: string;
  expdate: string;
  cvv: string;
  contact: string;
  email: string;
  supplier: string;
  tranmode: 'A' | 'VK';
}

export interface Receipt {
  id: string;
  receiptNumber: string;
  chargeId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress?: string;
  amount: number;
  currency: string;
  description: string;
  transactionId?: string;
  issueDate: Date;
  dueDate?: Date;
  status: 'issued' | 'sent' | 'paid';
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  customFields?: Record<string, any>;
}

export interface ReceiptItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface DonorRequest {
  id: string;
  donorId: string;
  donorName: string;
  title: string;
  description: string;
  requestType: 'financial' | 'material' | 'service' | 'other';
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  requestedAmount?: number;
  approvedAmount?: number;
  requestDate: Date;
  responseDate?: Date;
  completionDate?: Date;
  notes?: string;
  attachments?: string[];
  assignedTo?: string;
}

export interface Yahrzeit {
  id: string;
  donorId: string;
  donorName: string;
  deceasedName: string;
  hebrewName?: string;
  relationship: string;
  hebrewDate: string;
  gregorianDate: Date;
  yearOfDeath: number;
  notes?: string;
  reminderDays: number;
  isActive: boolean;
  lastReminderSent?: Date;
  customMessage?: string;
}

export interface Fund {
  id: string;
  fundNumber: string;
  name: string;
  description: string;
  category: 'education' | 'health' | 'social' | 'religious' | 'emergency' | 'general';
  targetAmount?: number;
  currentAmount: number;
  status: 'active' | 'inactive' | 'completed' | 'suspended';
  startDate: Date;
  endDate?: Date;
  managerId?: string;
  managerName?: string;
  donationCount: number;
  lastDonationDate?: Date;
  notes?: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TableColumn {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'email' | 'phone' | 'select' | 'boolean';
  sortable?: boolean;
  filterable?: boolean;
  required?: boolean;
  options?: string[]; // For select type
  width?: string;
  render?: (value: any, row: any) => React.ReactNode;
}

export interface TableConfig {
  columns: TableColumn[];
  searchable: boolean;
  sortable: boolean;
  filterable: boolean;
  exportable: boolean;
  addable: boolean;
  editable: boolean;
  deletable: boolean;
}