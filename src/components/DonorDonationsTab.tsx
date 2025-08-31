import React, { useState } from 'react';
import { Plus, CreditCard, Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { Customer, Charge, TableConfig } from '../types';
import DynamicTable from './DynamicTable';
import HebrewDate from './HebrewDate';

interface DonorDonationsTabProps {
  customer: Customer;
  charges: Charge[];
  funds: Fund[];
  onCreateCharge: () => void;
}

export default function DonorDonationsTab({ customer, charges, funds, onCreateCharge }: DonorDonationsTabProps) {
  const [tableConfig, setTableConfig] = useState<TableConfig>({
    columns: [
      {
        key: 'description',
        label: 'תיאור התרומה',
        type: 'text',
        sortable: true,
        filterable: true,
        required: true,
        render: (value, row) => (
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="bg-green-100 rounded-full p-2">
              <CreditCard className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <div className="font-semibold">{value}</div>
              {row.fundName && (
                <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full inline-block mt-1">
                  קרן: {row.fundName}
                </div>
              )}
              {row.transactionId && (
                <div className="text-xs text-gray-500">מספר עסקה: {row.transactionId}</div>
              )}
            </div>
          </div>
        )
      },
      {
        key: 'amount',
        label: 'סכום',
        type: 'number',
        sortable: true,
        filterable: false,
        render: (value, row) => (
          <div className="text-left">
            <div className="text-xl font-bold text-gray-900">
              ₪{value.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500">{row.currency}</div>
          </div>
        )
      },
      {
        key: 'status',
        label: 'סטטוס',
        type: 'select',
        options: ['completed', 'pending', 'failed', 'refunded'],
        sortable: true,
        filterable: true,
        render: (value) => {
          const getStatusColor = (status: string) => {
            switch (status) {
              case 'completed':
                return 'bg-green-100 text-green-800';
              case 'pending':
                return 'bg-yellow-100 text-yellow-800';
              case 'failed':
                return 'bg-red-100 text-red-800';
              case 'refunded':
                return 'bg-gray-100 text-gray-800';
              default:
                return 'bg-gray-100 text-gray-800';
            }
          };

          const getStatusText = (status: string) => {
            switch (status) {
              case 'completed':
                return 'הושלם';
              case 'pending':
                return 'ממתין';
              case 'failed':
                return 'נכשל';
              case 'refunded':
                return 'הוחזר';
              default:
                return status;
            }
          };

          return (
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(value)}`}>
              {getStatusText(value)}
            </span>
          );
        }
      },
      {
        key: 'createdAt',
        label: 'תאריך',
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
        key: 'receiptNumber',
        label: 'מספר קבלה',
        type: 'text',
        sortable: true,
        filterable: true,
        render: (value) => value || '-'
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

  const totalAmount = charges
    .filter(charge => charge.status === 'completed')
    .reduce((sum, charge) => sum + charge.amount, 0);

  const pendingAmount = charges
    .filter(charge => charge.status === 'pending')
    .reduce((sum, charge) => sum + charge.amount, 0);

  const lastMonthCharges = charges.filter(charge => {
    const chargeDate = new Date(charge.createdAt);
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    return chargeDate >= lastMonth;
  });

  const lastMonthAmount = lastMonthCharges
    .filter(charge => charge.status === 'completed')
    .reduce((sum, charge) => sum + charge.amount, 0);

  const handleExport = () => {
    const csv = [
      tableConfig.columns.map(col => col.label).join(','),
      ...charges.map(charge => 
        tableConfig.columns.map(col => {
          const value = charge[col.key as keyof Charge];
          if (col.type === 'date' && value instanceof Date) {
            return value.toLocaleDateString('he-IL');
          }
          return value || '';
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `תרומות-${customer.name}.csv`;
    link.click();
  };

  if (charges.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="bg-gray-100 rounded-full p-6 w-24 h-24 mx-auto mb-4 flex items-center justify-center">
          <CreditCard className="h-12 w-12 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">אין תרומות עדיין</h3>
        <p className="text-gray-600 mb-6">התחל על ידי יצירת התרומה הראשונה עבור {customer.name}</p>
        <button
          onClick={onCreateCharge}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 space-x-reverse mx-auto transition-colors"
        >
          <Plus className="h-5 w-5" />
          <span>צור תרומה ראשונה</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">סה"כ תרומות</p>
              <p className="text-2xl font-bold text-green-900">₪{totalAmount.toFixed(2)}</p>
            </div>
            <div className="bg-green-100 rounded-full p-3">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600">תרומות ממתינות</p>
              <p className="text-2xl font-bold text-yellow-900">₪{pendingAmount.toFixed(2)}</p>
            </div>
            <div className="bg-yellow-100 rounded-full p-3">
              <Calendar className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">חודש אחרון</p>
              <p className="text-2xl font-bold text-blue-900">₪{lastMonthAmount.toFixed(2)}</p>
              <p className="text-xs text-blue-600">{lastMonthCharges.length} תרומות</p>
            </div>
            <div className="bg-blue-100 rounded-full p-3">
              <TrendingDown className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="flex justify-end">
        <button
          onClick={onCreateCharge}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 space-x-reverse transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>תרומה חדשה</span>
        </button>
      </div>

      {/* Donations Table */}
      <DynamicTable
        data={charges}
        config={tableConfig}
        onExport={handleExport}
        onConfigChange={setTableConfig}
        title={`תרומות של ${customer.name}`}
      />
    </div>
  );
}