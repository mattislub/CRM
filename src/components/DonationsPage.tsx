import React, { useEffect, useMemo, useState } from 'react';
import { Mail, Pencil, Search, Filter, Calendar, HandCoins } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

type DonationStatus = 'התקבל' | 'ממתין' | 'נשלח';

interface ApiDonationRecord {
  id: number;
  donorId: number | null;
  donorNumber: string | null;
  donorName: string | null;
  donorEmail: string | null;
  amount: number;
  donationDate: string | null;
  description: string | null;
  pdfUrl: string | null;
  emailSent: boolean;
  sentDate: string | null;
}

interface DonationRecord {
  id: string;
  donorId: number | null;
  donorNumber: string;
  donorName: string;
  donorEmail: string;
  amount: number;
  purpose: string;
  date: string;
  status: DonationStatus;
  emailSent: boolean;
  pdfUrl?: string;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0
  }).format(amount);

const determineStatus = (donation: ApiDonationRecord): DonationStatus => {
  if (donation.emailSent) {
    return 'נשלח';
  }
  if (donation.pdfUrl) {
    return 'ממתין';
  }
  return 'התקבל';
};

const toDonationRecord = (donation: ApiDonationRecord): DonationRecord => ({
  id: donation.id.toString(),
  donorId: donation.donorId,
  donorNumber: donation.donorNumber || '—',
  donorName: donation.donorName || 'תורם לא ידוע',
  donorEmail: donation.donorEmail || '',
  amount: donation.amount ?? 0,
  purpose: donation.description || '',
  date: donation.donationDate || '',
  status: determineStatus(donation),
  emailSent: donation.emailSent,
  pdfUrl: donation.pdfUrl || undefined
});

export default function DonationsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | DonationStatus>('all');
  const [donations, setDonations] = useState<DonationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchDonations = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_URL}/donations`);
        if (!response.ok) {
          throw new Error('Failed to fetch donations');
        }
        const data: ApiDonationRecord[] = await response.json();
        if (!cancelled) {
          setDonations(data.map(toDonationRecord));
        }
      } catch (err) {
        console.error('Failed to load donations', err);
        if (!cancelled) {
          setError('אירעה שגיאה בטעינת התרומות מהשרת. נסו שוב מאוחר יותר.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchDonations();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredDonations = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return donations.filter(donation => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        donation.donorName.toLowerCase().includes(normalizedSearch) ||
        donation.donorEmail.toLowerCase().includes(normalizedSearch) ||
        donation.purpose.toLowerCase().includes(normalizedSearch) ||
        donation.donorNumber.toLowerCase().includes(normalizedSearch);

      const matchesStatus = statusFilter === 'all' || donation.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [donations, searchTerm, statusFilter]);

  const totalAmount = useMemo(
    () => donations.reduce((sum, donation) => sum + (Number.isFinite(donation.amount) ? donation.amount : 0), 0),
    [donations]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">תרומות</h1>
          <p className="text-gray-600 mt-2">ניהול ומעקב אחרי תרומות שהתקבלו במערכת</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">סה"כ תרומות</p>
                <p className="text-2xl font-semibold text-gray-900">{formatCurrency(totalAmount)}</p>

              </div>
              <div className="bg-blue-50 text-blue-600 p-3 rounded-full">
                <HandCoins className="h-6 w-6" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">תרומות שממתינות לשליחה</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {donations.filter(donation => donation.status === 'ממתין').length}


                </p>
              </div>
              <div className="bg-amber-50 text-amber-600 p-3 rounded-full">
                <Mail className="h-6 w-6" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">תרומות שנשלחו</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {donations.filter(donation => donation.status === 'נשלח').length}
                </p>
              </div>
              <div className="bg-green-50 text-green-600 p-3 rounded-full">
                <Calendar className="h-6 w-6" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2 bg-gray-50 rounded-full px-4 py-2 w-full lg:w-80">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={event => setSearchTerm(event.target.value)}
                placeholder="חיפוש לפי שם, מייל או ייעוד"
                className="bg-transparent w-full focus:outline-none text-sm text-gray-700"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={event => setStatusFilter(event.target.value as typeof statusFilter)}
                  className="appearance-none pl-4 pr-9 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm text-gray-700 focus:outline-none"
                >
                  <option value="all">כל הסטטוסים</option>
                  <option value="התקבל">התקבל</option>
                  <option value="ממתין">ממתין</option>
                  <option value="נשלח">נשלח</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">תורם</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">אימייל</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">תאריך</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">ייעוד התרומה</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">סכום</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">סטטוס</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider text-center">פעולות</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-gray-500 text-sm">
                    טוען נתוני תרומות...
                  </td>
                </tr>
              ) : filteredDonations.length > 0 ? (
                filteredDonations.map(donation => (
                  <tr key={donation.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div className="flex flex-col">
                        <span>{donation.donorName}</span>
                        <span className="text-xs text-gray-400">מספר תורם: {donation.donorNumber}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{donation.donorEmail || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {donation.date ? new Date(donation.date).toLocaleDateString('he-IL') : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{donation.purpose || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {formatCurrency(donation.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                          donation.status === 'התקבל'
                            ? 'bg-green-50 text-green-700'
                            : donation.status === 'נשלח'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {donation.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <button className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-full transition-colors">
                          <Pencil className="h-4 w-4" /> ערוך
                        </button>
                        <button className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-full transition-colors">
                          <Mail className="h-4 w-4" /> שלח מייל
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-gray-500 text-sm">
                    לא נמצאו תרומות התואמות לחיפוש.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {error && (
          <div className="px-6 pb-6 text-sm text-red-600">{error}</div>

        )}
      </div>
    </div>
  );
}
