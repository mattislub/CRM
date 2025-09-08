export interface UploadedFile {
  id: string;
  name: string;
  type: 'excel' | 'pdf';
  size: number;
  uploadDate: Date;
  status: 'uploading' | 'success' | 'error';
  errorMessage?: string;
  url?: string;
}

export interface Donation {
  id: string;
  amount: number;
  date: Date;
  description: string;
  pdfUrl?: string;
  emailSent: boolean;
  sentDate?: Date;
}

export interface Donor {
  id: string;
  donorNumber: string;
  fullName: string;
  email: string;
  donations: Donation[];
  totalDonations: number;
}