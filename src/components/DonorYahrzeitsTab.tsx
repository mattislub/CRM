import React, { useState } from 'react';
import { Plus, Heart, Calendar, Bell, Star, User, Clock } from 'lucide-react';
import { Customer, Yahrzeit, TableConfig } from '../types';
import { mockYahrzeits } from '../data/mockData';
import DynamicTable from './DynamicTable';
import HebrewDate from './HebrewDate';

interface DonorYahrzeitsTabProps {
  customer: Customer;
}

export default function DonorYahrzeitsTab({ customer }: DonorYahrzeitsTabProps) {
  const [showYahrzeitModal, setShowYahrzeitModal] = useState(false);
  
  // Filter yahrzeits for this specific donor
  const donorYahrzeits = mockYahrzeits.filter(yahrzeit => yahrzeit.donorId === customer.id);

  const [tableConfig, setTableConfig] = useState<TableConfig>({
    columns: [
      {
        key: 'deceasedName',
        label: 'שם הנפטר',
        type: 'text',
        sortable: true,
        filterable: true,
        required: true,
        render: (value, row) => (
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="bg-purple-100 rounded-full p-2">
              <Heart className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <div className="font-semibold">{value}</div>
              {row.hebrewName && (
                <div className="text-sm text-gray-500">{row.hebrewName}</div>
              )}
            </div>
          </div>
        )
      },
      {
        key: 'relationship',
        label: 'קרבה משפחתית',
        type: 'text',
        sortable: true,
        filterable: true,
        render: (value) => (
          <div className="flex items-center space-x-2 space-x-reverse">
            <User className="h-4 w-4 text-gray-400" />
            <span>{value}</span>
          </div>
        )
      },
      {
        key: 'hebrewDate',
        label: 'תאריך עברי',
        type: 'text',
        sortable: true,
        filterable: true,
        render: (value) => (
          <div className="flex items-center space-x-2 space-x-reverse">
            <Star className="h-4 w-4 text-yellow-500" />
            <span className="font-hebrew">{value}</span>
          </div>
        )
      },
      {
        key: 'gregorianDate',
        label: 'תאריך לועזי',
        type: 'date',
        sortable: true,
        filterable: false,
        render: (value) => (
          <div className="flex items-center space-x-2 space-x-reverse">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span>{value.toLocaleDateString('he-IL')}</span>
          </div>
        )
      },
      {
        key: 'yearOfDeath',
        label: 'שנת פטירה',
        type: 'number',
        sortable: true,
        filterable: false,
        render: (value) => (
          <span className="text-gray-600">{value}</span>
        )
      },
      {
        key: 'reminderDays',
        label: 'תזכורת (ימים)',
        type: 'number',
        sortable: true,
        filterable: false,
        render: (value) => (
          <div className="flex items-center space-x-2 space-x-reverse">
            <Bell className="h-4 w-4 text-blue-500" />
            <span>{value} ימים לפני</span>
          </div>
        )
      },
      {
        key: 'isActive',
        label: 'פעיל',
        type: 'boolean',
        sortable: true,
        filterable: true,
        render: (value) => (
          <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
            value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
            {value ? 'פעיל' : 'לא פעיל'}
          </span>
        )
      },
      {
        key: 'lastReminderSent',
        label: 'תזכורת אחרונה',
        type: 'date',
        sortable: true,
        filterable: false,
        render: (value) => value ? (
          <div className="flex items-center space-x-2 space-x-reverse">
            <Clock className="h-4 w-4 text-gray-400" />
            <span>{value.toLocaleDateString('he-IL')}</span>
          </div>
        ) : '-'
      }
    ],
    searchable: true,
    sortable: true,
    filterable: true,
    exportable: true,
    addable: false,
    editable: false,
    deletable: false
  });

  const handleExport = () => {
    const csv = [
      tableConfig.columns.map(col => col.label).join(','),
      ...donorYahrzeits.map(yahrzeit => 
        tableConfig.columns.map(col => {
          const value = yahrzeit[col.key as keyof Yahrzeit];
          if (col.type === 'date' && value instanceof Date) {
            return value.toLocaleDateString('he-IL');
          }
          if (col.type === 'boolean') {
            return value ? 'כן' : 'לא';
          }
          return value || '';
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `יארצייטים-${customer.name}.csv`;
    link.click();
  };

  // Statistics
  const activeYahrzeits = donorYahrzeits.filter(y => y.isActive).length;
  const upcomingYahrzeits = donorYahrzeits.filter(y => {
    const today = new Date();
    const yahrzeit = new Date(y.gregorianDate);
    const daysUntil = Math.ceil((yahrzeit.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntil >= 0 && daysUntil <= 30 && y.isActive;
  }).length;

  const thisYearYahrzeits = donorYahrzeits.filter(y => {
    const thisYear = new Date().getFullYear();
    return y.gregorianDate.getFullYear() === thisYear;
  }).length;

  if (donorYahrzeits.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="bg-gray-100 rounded-full p-6 w-24 h-24 mx-auto mb-4 flex items-center justify-center">
          <Heart className="h-12 w-12 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">אין יארצייטים רשומים</h3>
        <p className="text-gray-600 mb-6">לא נרשמו יארצייטים עבור {customer.name}</p>
        <button
          onClick={() => setShowYahrzeitModal(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 space-x-reverse mx-auto transition-colors"
        >
          <Plus className="h-5 w-5" />
          <span>הוסף יארצייט ראשון</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">יארצייטים פעילים</p>
              <p className="text-2xl font-bold text-purple-900">{activeYahrzeits}</p>
            </div>
            <Heart className="h-8 w-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-orange-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">קרובים (30 ימים)</p>
              <p className="text-2xl font-bold text-orange-900">{upcomingYahrzeits}</p>
            </div>
            <Bell className="h-8 w-8 text-orange-600" />
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">השנה</p>
              <p className="text-2xl font-bold text-blue-900">{thisYearYahrzeits}</p>
            </div>
            <Calendar className="h-8 w-8 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowYahrzeitModal(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 space-x-reverse transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>יארצייט חדש</span>
        </button>
      </div>

      {/* Upcoming Yahrzeits Alert */}
      {upcomingYahrzeits > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center space-x-3 space-x-reverse">
            <Bell className="h-5 w-5 text-orange-600" />
            <div>
              <h4 className="font-medium text-orange-900">יארצייטים קרובים</h4>
              <p className="text-sm text-orange-700">
                יש {upcomingYahrzeits} יארצייטים בחודש הקרוב. וודא שנשלחו התזכורות המתאימות.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Yahrzeits Table */}
      <DynamicTable
        data={donorYahrzeits}
        config={tableConfig}
        onExport={handleExport}
        onConfigChange={setTableConfig}
        title={`יארצייטים של ${customer.name}`}
      />

      {/* TODO: Add Yahrzeit Modal */}
      {showYahrzeitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">יארצייט חדש</h3>
            <p className="text-gray-600 mb-4">תכונה זו תתווסף בקרוב...</p>
            <button
              onClick={() => setShowYahrzeitModal(false)}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              סגור
            </button>
          </div>
        </div>
      )}
    </div>
  );
}