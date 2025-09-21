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

export type DonorNameEntry =
  | string
  | {
      id?: string | number;
      name: string;
      relation?: string;
      notes?: string;
      hebrewDate?: string;
      gregorianDate?: string;
      date?: string;
      createdAt?: string;
    };

export interface Donor {
  id: string;
  donorNumber: string;
  fullName: string;
  email: string;
  donations: Donation[];
  totalDonations: number;
  prayerNames?: DonorNameEntry[];
  yahrzeitNames?: DonorNameEntry[];
}
