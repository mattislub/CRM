import React, { useState } from 'react';
import { Plus, Target, TrendingUp, Calendar, User, Eye, Edit, Trash2, DollarSign } from 'lucide-react';
import { Fund, TableColumn, TableConfig } from '../types';
import DynamicTable from './DynamicTable';
import HebrewDate from './HebrewDate';

interface FundsListProps {
  funds: Fund[];
  onAddFund?: () => void;
  onEditFund?: (fund: Fund) => void;
  onDeleteFund?: (id: string) => void;
}

export default function FundsList({ funds, onAddFund, onEditFund, onDeleteFund }: FundsListProps) {
  const [tableConfig, setTableConfig] = useState<TableConfig>({
    columns: [
      {
        key: 'name',
        label: 'שם הקרן',
        type: 'text',
        sortable: true,
        filterable: true,
        required: true,
        render: (value, row) => (
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className={`rounded-full p-2 ${
              row.category === 'education' ? 'bg-blue-100' :
              row.category === 'health' ? 'bg-red-100' :
              row.category === 'social' ? 'bg-green-100' :
              row.category === 'religious' ? 'bg-purple-100' :
              row.category === 'emergency' ? 'bg-orange-100' : 'bg-gray-100'
            }`}>
              <Target className={`h-4 w-4 ${
                row.category === 'education' ? 'text-blue-600' :
                row.category === 'health' ? 'text-red-600' :
                row.category === 'social' ? 'text-green-600' :
                row.category === 'religious' ? 'text-purple-600' :
                row.category === 'emergency' ? 'text-orange-600' : 'text-gray-600'
              }`} />
            </div>
            <div>
              <div className="font-semibold">{value}</div>
              <div className="text-xs text-gray-500">מס' קרן: {row.fundNumber}</div>
              <div className="text-sm text-gray-500">{row.description}</div>
            </div>
          </div>
        )
      },
      {
        key: 'fundNumber',
        label: 'מספר קרן',
        type: 'text',
        sortable: true,
        filterable: true,
        render: (value) => (
          <div className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
            {value}
          </div>
        )
      },
      {
        key: 'category',
        label: 'קטגוריה',
        type: 'select',
        options: ['education', 'health', 'social', 'religious', 'emergency', 'general'],
        sortable: true,
        filterable: true,
        render: (value) => {
          const getCategoryText = (category: string) => {
            switch (category) {
              case 'education': return 'חינוך';
              case 'health': return 'בריאות';
              case 'social': return 'חברתי';
              case 'religious': return 'דתי';
              case 'emergency': return 'חירום';
              case 'general': return 'כללי';
              default: return category;
            }
          };

          const getCategoryColor = (category: string) => {
            switch (category) {
              case 'education': return 'bg-blue-100 text-blue-800';
              case 'health': return 'bg-red-100 text-red-800';
              case 'social': return 'bg-green-100 text-green-800';
              case 'religious': return 'bg-purple-100 text-purple-800';
              case 'emergency': return 'bg-orange-100 text-orange-800';
              case 'general': return 'bg-gray-100 text-gray-800';
              default: return 'bg-gray-100 text-gray-800';
            }
          };

          return (
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(value)}`}>
              {getCategoryText(value)}
            </span>
          );
        }
      },
      {
        key: 'progress',
        label: 'התקדמות',
        type: 'text',
        sortable: false,
        filterable: false,
        render: (_, row) => {
          const percentage = row.targetAmount ? (row.currentAmount / row.targetAmount) * 100 : 0;
          const hasTarget = row.targetAmount > 0;
          
          return (
            <div className="w-full">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-900">
                  ₪{row.currentAmount.toLocaleString()}
                </span>
                {hasTarget && (
                  <span className="text-sm text-gray-500">
                    {percentage.toFixed(1)}%
                  </span>
                )}
              </div>
              {hasTarget && (
                <>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        percentage >= 100 ? 'bg-green-500' :
                        percentage >= 75 ? 'bg-blue-500' :
                        percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    יעד: ₪{row.targetAmount.toLocaleString()}
                  </div>
                </>
              )}
            </div>
          );
        }
      },
      {
        key: 'status',
        label: 'סטטוס',
        type: 'select',
        options: ['active', 'inactive', 'completed', 'suspended'],
        sortable: true,
        filterable: true,
        render: (value) => {
          const getStatusText = (status: string) => {
            switch (status) {
              case 'active': return 'פעיל';
              case 'inactive': return 'לא פעיל';
              case 'completed': return 'הושלם';
              case 'suspended': return 'מושעה';
              default: return status;
            }
          };

          const getStatusColor = (status: string) => {
            switch (status) {
              case 'active': return 'bg-green-100 text-green-800';
              case 'inactive': return 'bg-gray-100 text-gray-800';
              case 'completed': return 'bg-blue-100 text-blue-800';
              case 'suspended': return 'bg-red-100 text-red-800';
              default: return 'bg-gray-100 text-gray-800';
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
        key: 'managerName',
        label: 'מנהל הקרן',
        type: 'text',
        sortable: true,
        filterable: true,
        render: (value) => value ? (
          <div className="flex items-center space-x-2 space-x-reverse">
            <User className="h-4 w-4 text-gray-400" />
            <span>{value}</span>
          </div>
        ) : '-'
      },
      {
        key: 'donationCount',
        label: 'מספר תרומות',
        type: 'number',
        sortable: true,
        filterable: false,
        render: (value, row) => (
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">{value}</div>
            {row.lastDonationDate && (
              <div className="text-xs text-gray-500">
                אחרונה: {row.lastDonationDate.toLocaleDateString('he-IL')}
              </div>
            )}
          </div>
        )
      },
      {
        key: 'startDate',
        label: 'תאריך התחלה',
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
        key: 'isPublic',
        label: 'ציבורי',
        type: 'boolean',
        sortable: true,
        filterable: true,
        render: (value) => (
          <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
            value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
            {value ? 'ציבורי' : 'פרטי'}
          </span>
        )
      }
    ],
    searchable: true,
    sortable: true,
    filterable: true,
    exportable: true,
    addable: true,
    editable: true,
    deletable: true
  });

  const handleExport = () => {
    const csv = [
      tableConfig.columns.map(col => col.label).join(','),
      ...funds.map(fund => 
        tableConfig.columns.map(col => {
          const value = fund[col.key as keyof Fund];
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
    link.download = 'funds.csv';
    link.click();
  };

  // Statistics
  const activeFunds = funds.filter(f => f.status === 'active').length;
  const completedFunds = funds.filter(f => f.status === 'completed').length;
  const totalRaised = funds.reduce((sum, fund) => sum + fund.currentAmount, 0);
  const totalTarget = funds.reduce((sum, fund) => sum + (fund.targetAmount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">סה"כ קרנות</p>
              <p className="text-3xl font-bold text-gray-900">{funds.length}</p>
            </div>
            <div className="bg-blue-100 rounded-full p-3">
              <Target className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">קרנות פעילות</p>
              <p className="text-3xl font-bold text-green-900">{activeFunds}</p>
            </div>
            <div className="bg-green-100 rounded-full p-3">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">סה"כ נגבה</p>
              <p className="text-3xl font-bold text-blue-900">₪{totalRaised.toLocaleString()}</p>
            </div>
            <div className="bg-blue-100 rounded-full p-3">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">אחוז השלמה</p>
              <p className="text-3xl font-bold text-purple-900">
                {totalTarget > 0 ? ((totalRaised / totalTarget) * 100).toFixed(1) : '0'}%
              </p>
            </div>
            <div className="bg-purple-100 rounded-full p-3">
              <Target className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      <DynamicTable
        data={funds}
        config={tableConfig}
        onAdd={onAddFund}
        onEdit={onEditFund}
        onDelete={onDeleteFund}
        onExport={handleExport}
        onConfigChange={setTableConfig}
        title="רשימת קרנות"
      />
    </div>
  );
}