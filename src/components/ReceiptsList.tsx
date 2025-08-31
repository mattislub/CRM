import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Receipt, User, Calendar, Eye, Download, Send } from 'lucide-react';
import { Receipt as ReceiptType } from '../types';
import { TableColumn, TableConfig } from '../types';
import DynamicTable from './DynamicTable';
import HebrewDate from './HebrewDate';

interface ReceiptsListProps {
  receipts: ReceiptType[];
}

export default function ReceiptsList({ receipts }: ReceiptsListProps) {
  const [tableConfig, setTableConfig] = useState<TableConfig>({
    columns: [
      {
        key: 'receiptNumber',
        label: 'מספר קבלה',
        type: 'text',
        sortable: true,
        filterable: true,
        required: true,
        render: (value, row) => (
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="bg-orange-100 rounded-full p-2">
              <Receipt className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <div className="font-semibold">{value}</div>
              <div className="text-sm text-gray-500">{row.description}</div>
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
        key: 'total',
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
        options: ['issued', 'sent', 'paid'],
        sortable: true,
        filterable: true,
        render: (value) => {
          const getStatusColor = (status: string) => {
            switch (status) {
              case 'paid':
                return 'bg-green-100 text-green-800';
              case 'sent':
                return 'bg-blue-100 text-blue-800';
              case 'issued':
                return 'bg-yellow-100 text-yellow-800';
              default:
                return 'bg-gray-100 text-gray-800';
            }
          };

          const getStatusText = (status: string) => {
            switch (status) {
              case 'paid':
                return 'שולם';
              case 'sent':
                return 'נשלח';
              case 'issued':
                return 'הונפק';
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
        key: 'issueDate',
        label: 'תאריך הנפקה',
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
        key: 'actions',
        label: 'פעולות',
        type: 'text',
        sortable: false,
        filterable: false,
        render: (_, row) => (
          <div className="flex items-center space-x-2 space-x-reverse">
            <Link
              to={`/receipt/${row.id}`}
              className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
              title="הצג קבלה"
            >
              <Eye className="h-4 w-4" />
            </Link>
            <button
              className="p-2 text-gray-400 hover:text-green-600 transition-colors"
              title="הורד PDF"
              onClick={() => {
                // TODO: Implement PDF download
                console.log('Download PDF for receipt:', row.id);
              }}
            >
              <Download className="h-4 w-4" />
            </button>
            <button
              className="p-2 text-gray-400 hover:text-orange-600 transition-colors"
              title="שלח ללקוח"
              onClick={() => {
                const subject = `קבלה ${row.receiptNumber}`;
               const body = `שלום ${row.customerName},\n\nמצורפת קבלה מספר ${row.receiptNumber} בסך ${row.total.toFixed(2)} ₪.\n\nתודה על התרומה הנדיבה!`;
                const mailtoLink = `mailto:${row.customerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                window.open(mailtoLink);
              }}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        )
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
      ['מספר קבלה', 'לקוח', 'סכום', 'סטטוס', 'תאריך הנפקה'].join(','),
      ...receipts.map(receipt => [
        receipt.receiptNumber,
        receipt.customerName,
        receipt.total.toFixed(2),
        receipt.status,
        receipt.issueDate.toLocaleDateString('he-IL')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'receipts.csv';
    link.click();
  };

  const totalAmount = receipts
    .filter(receipt => receipt.status === 'paid')
    .reduce((sum, receipt) => sum + receipt.total, 0);

  return (
    <div className="space-y-6">
      <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg w-fit">
        <span className="font-semibold">סה"כ הכנסות: ₪{totalAmount.toFixed(2)}</span>
      </div>
      
      <DynamicTable
        data={receipts}
        config={tableConfig}
        onExport={handleExport}
        onConfigChange={setTableConfig}
        title="רשימת קבלות"
      />
    </div>
  );
}