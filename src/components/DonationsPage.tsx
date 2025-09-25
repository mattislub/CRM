import React, { useEffect, useMemo, useState } from 'react';
import { Mail, Pencil, Search, Filter, Calendar, HandCoins, Trash } from 'lucide-react';

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

const formatDateForInput = (value: string) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().split('T')[0];
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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingDonation, setEditingDonation] = useState<DonationRecord | null>(null);
  const [editForm, setEditForm] = useState({
    amount: '',
    date: '',
    purpose: '',
    pdfUrl: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

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

  const handleDeleteDonation = async (donationId: string) => {
    const confirmed = window.confirm('האם אתם בטוחים שברצונכם למחוק את התרומה?');
    if (!confirmed) {
      return;
    }

    setDeletingId(donationId);

    try {
      const response = await fetch(`${API_URL}/donations/${donationId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete donation');
      }

      setDonations(prevDonations => prevDonations.filter(donation => donation.id !== donationId));
      setError(null);
    } catch (err) {
      console.error('Failed to delete donation', err);
      setError('אירעה שגיאה במחיקת התרומה. נסו שוב מאוחר יותר.');
    } finally {
      setDeletingId(null);
    }
  };

  const openEditModal = (donation: DonationRecord) => {
    setEditingDonation(donation);
    setEditError(null);
    setEditForm({
      amount: donation.amount ? donation.amount.toString() : '',
      date: formatDateForInput(donation.date),
      purpose: donation.purpose || '',
      pdfUrl: donation.pdfUrl || '',
    });
  };

  const closeEditModal = () => {
    setEditingDonation(null);
    setEditForm({ amount: '', date: '', purpose: '', pdfUrl: '' });
    setEditError(null);
    setSavingEdit(false);
  };

  const handleEditSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingDonation) {
      return;
    }

    const trimmedAmount = editForm.amount.trim();
    const parsedAmount = Number(trimmedAmount);
    if (!trimmedAmount || Number.isNaN(parsedAmount)) {
      setEditError('אנא הזינו סכום תרומה תקין.');
      return;
    }

    if (!editForm.date) {
      setEditError('אנא בחרו תאריך תרומה.');
      return;
    }

    setSavingEdit(true);
    setEditError(null);

    const trimmedPdfUrl = editForm.pdfUrl.trim();

    try {
      const response = await fetch(`${API_URL}/donations/${editingDonation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parsedAmount,
          date: editForm.date,
          description: editForm.purpose,
          pdfUrl: trimmedPdfUrl || null,
        })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Failed to update donation', data);
        setEditError('שמירת התרומה נכשלה. נסו שוב מאוחר יותר.');
        return;
      }

      const amountFromServer =
        typeof data.amount === 'number' ? data.amount : Number(data.amount);
      const updatedAmount = Number.isFinite(amountFromServer)
        ? amountFromServer
        : parsedAmount;
      const updatedDate = typeof data.date === 'string' && data.date ? data.date : editForm.date;
      const updatedDescription = typeof data.description === 'string' ? data.description : editForm.purpose;
      const updatedPdfUrl =
        typeof data.pdfUrl === 'string' && data.pdfUrl
          ? data.pdfUrl
          : trimmedPdfUrl
            ? trimmedPdfUrl
            : undefined;
      const updatedEmailSent =
        typeof data.emailSent === 'boolean' ? data.emailSent : editingDonation.emailSent;

      setDonations(prevDonations =>
        prevDonations.map(donation => {
          if (donation.id !== editingDonation.id) {
            return donation;
          }

          const sanitizedPdfUrl = updatedPdfUrl ? updatedPdfUrl.trim() : '';
          const hasPdf = sanitizedPdfUrl.length > 0;
          const nextStatus: DonationStatus = updatedEmailSent
            ? 'נשלח'
            : hasPdf
              ? 'ממתין'
              : 'התקבל';

          return {
            ...donation,
            amount: updatedAmount,
            date: updatedDate,
            purpose: updatedDescription || '',
            pdfUrl: hasPdf ? sanitizedPdfUrl : undefined,
            emailSent: updatedEmailSent,
            status: nextStatus,
          };
        })
      );

      closeEditModal();
    } catch (err) {
      console.error('Failed to update donation', err);
      setEditError('אירעה שגיאה בשמירת התרומה. נסו שוב מאוחר יותר.');
    } finally {
      setSavingEdit(false);
    }
  };

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
                        <button
                          onClick={() => openEditModal(donation)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-full transition-colors"
                        >
                          <Pencil className="h-4 w-4" /> ערוך
                        </button>
                        <button className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-full transition-colors">
                          <Mail className="h-4 w-4" /> שלח מייל
                        </button>
                        <button
                          onClick={() => handleDeleteDonation(donation.id)}
                          disabled={deletingId === donation.id}
                          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-60 disabled:cursor-not-allowed rounded-full transition-colors"
                        >
                          <Trash className="h-4 w-4" /> {deletingId === donation.id ? 'מוחק...' : 'מחק'}
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

      {editingDonation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">עריכת תרומה</h2>
                <p className="mt-1 text-sm text-gray-500">
                  {editingDonation.donorName} • סכום נוכחי: {formatCurrency(editingDonation.amount)}
                </p>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                disabled={savingEdit}
                className="text-gray-400 transition-colors hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="סגור חלון עריכה"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="edit-amount">
                  סכום התרומה
                </label>
                <input
                  id="edit-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.amount}
                  onChange={event =>
                    setEditForm(prev => ({
                      ...prev,
                      amount: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="לדוגמה: 250"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="edit-date">
                  תאריך התרומה
                </label>
                <input
                  id="edit-date"
                  type="date"
                  value={editForm.date}
                  onChange={event =>
                    setEditForm(prev => ({
                      ...prev,
                      date: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="edit-purpose">
                  ייעוד התרומה
                </label>
                <input
                  id="edit-purpose"
                  type="text"
                  value={editForm.purpose}
                  onChange={event =>
                    setEditForm(prev => ({
                      ...prev,
                      purpose: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="ייעוד התרומה"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="edit-pdf">
                  קובץ קבלה (קישור)
                </label>
                <input
                  id="edit-pdf"
                  type="text"
                  value={editForm.pdfUrl}
                  onChange={event =>
                    setEditForm(prev => ({
                      ...prev,
                      pdfUrl: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="הדביקו קישור לקובץ PDF (לא חובה)"
                />
                {editingDonation.pdfUrl && (
                  <a
                    href={`${API_URL}${editingDonation.pdfUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-sm text-blue-600 hover:underline"
                  >
                    צפייה בקובץ הנוכחי
                  </a>
                )}
              </div>

              {editError && <p className="text-sm text-red-600">{editError}</p>}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={savingEdit}
                  className="rounded-full px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {savingEdit ? 'שומר...' : 'שמור שינויים'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
