import React, { useMemo, useState } from 'react';
import { Mail, Pencil, Search, Filter, Calendar, HandCoins } from 'lucide-react';

interface DonationRecord {
  id: string;
  donorName: string;
  donorEmail: string;
  amount: number;
  purpose: string;
  date: string;
  status: 'התקבל' | 'ממתין' | 'נשלח';
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0
  }).format(amount);

export default function DonationsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | DonationRecord['status']>('all');

  const donations = useMemo<DonationRecord[]>(
    () => [
      {
        id: '1',
        donorName: 'שרה לוי',
        donorEmail: 'sara@example.com',
        amount: 500,
        purpose: 'סיוע למשפחות',
        date: '2024-02-12',
        status: 'התקבל'
      },
      {
        id: '2',
        donorName: 'יוסף כהן',
        donorEmail: 'yosef@example.com',
        amount: 1200,
        purpose: 'פרויקט ילדים',
        date: '2024-02-10',
        status: 'נשלח'
      },
      {
        id: '3',
        donorName: 'משה גרין',
        donorEmail: 'moshe@example.com',
        amount: 750,
        purpose: 'הנצחה',
        date: '2024-02-05',
        status: 'ממתין'
      },
      {
        id: '4',
        donorName: 'אסתר בלום',
        donorEmail: 'ester@example.com',
        amount: 300,
        purpose: 'סיוע לנזקקים',
        date: '2024-01-30',
        status: 'התקבל'
      },
      {
        id: '5',
        donorName: 'דוד רוזן',
        donorEmail: 'david@example.com',
        amount: 950,
        purpose: 'קמפיין סוף שנה',
        date: '2024-01-28',
        status: 'ממתין'
      }
    ],
    []
  );

  const filteredDonations = donations.filter(donation => {
    const matchesSearch =
      donation.donorName.includes(searchTerm) ||
      donation.donorEmail.includes(searchTerm) ||
      donation.purpose.includes(searchTerm);

    const matchesStatus = statusFilter === 'all' || donation.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

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
                <p className="text-2xl font-semibold text-gray-900">
                  {formatCurrency(donations.reduce((sum, donation) => sum + donation.amount, 0))}
                </p>
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
                  {filteredDonations.filter(donation => donation.status === 'ממתין').length}
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
              {filteredDonations.map(donation => (
                <tr key={donation.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {donation.donorName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{donation.donorEmail}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(donation.date).toLocaleDateString('he-IL')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{donation.purpose}</td>
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
              ))}
            </tbody>
          </table>
        </div>

        {filteredDonations.length === 0 && (
          <div className="p-12 text-center text-gray-500 text-sm">לא נמצאו תרומות התואמות לחיפוש.</div>
        )}
      </div>
    </div>
  );
}
