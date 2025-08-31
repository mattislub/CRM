import React, { useState } from 'react';
import { CreditCard, User, Calendar } from 'lucide-react';
import { Charge } from '../types';
import { TableColumn, TableConfig } from '../types';
import DynamicTable from './DynamicTable';
import HebrewDate from './HebrewDate';

interface ChargesListProps {
  charges: Charge[];
  funds: Fund[];
}

const ChargesList: React.FC<ChargesListProps> = ({ charges, funds }) => {
  const [tableConfig, setTableConfig] = useState<TableConfig>({
    columns: [
      {
        key: 'description',
        label: 'תיאור',
        type: 'text',
        sortable: true,
        filterable: true,
        required: true,
        render: (value, row) => (
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="bg-blue-100 rounded-full p-2">
              <CreditCard className="h-4 w-4 text-blue-600" />
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
        key: 'customerName',
        label: 'לקוח',
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
        label: 'תאריך יצירה',
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
    link.download = 'charges.csv';
    link.click();
  };

  const totalAmount = charges
    .filter(charge => charge.status === 'completed')
    .reduce((sum, charge) => sum + charge.amount, 0);

  return (
    <div className="space-y-6">
      <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg w-fit">
        <span className="font-semibold">סה"כ הכנסות: ₪{totalAmount.toFixed(2)}</span>
      </div>
      
      <DynamicTable
        data={charges}
        config={tableConfig}
        onExport={handleExport}
        onConfigChange={setTableConfig}
        title="רשימת תרומות"
      />
    </div>
  );
};

export default ChargesList;