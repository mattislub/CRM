import React, { useState } from 'react';
import { Plus, FileText, Clock, CheckCircle, XCircle, AlertCircle, User, Calendar } from 'lucide-react';
import { Customer, DonorRequest, TableConfig } from '../types';
import { mockDonorRequests } from '../data/mockData';
import DynamicTable from './DynamicTable';
import HebrewDate from './HebrewDate';

interface DonorRequestsTabProps {
  customer: Customer;
}

export default function DonorRequestsTab({ customer }: DonorRequestsTabProps) {
  const [showRequestModal, setShowRequestModal] = useState(false);
  
  // Filter requests for this specific donor
  const donorRequests = mockDonorRequests.filter(request => request.donorId === customer.id);

  const [tableConfig, setTableConfig] = useState<TableConfig>({
    columns: [
      {
        key: 'title',
        label: 'כותרת הבקשה',
        type: 'text',
        sortable: true,
        filterable: true,
        required: true,
        render: (value, row) => (
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className={`rounded-full p-2 ${
              row.requestType === 'financial' ? 'bg-green-100' :
              row.requestType === 'material' ? 'bg-blue-100' :
              row.requestType === 'service' ? 'bg-purple-100' : 'bg-gray-100'
            }`}>
              <FileText className={`h-4 w-4 ${
                row.requestType === 'financial' ? 'text-green-600' :
                row.requestType === 'material' ? 'text-blue-600' :
                row.requestType === 'service' ? 'text-purple-600' : 'text-gray-600'
              }`} />
            </div>
            <div>
              <div className="font-semibold">{value}</div>
              <div className="text-sm text-gray-500">{row.description}</div>
            </div>
          </div>
        )
      },
      {
        key: 'requestType',
        label: 'סוג בקשה',
        type: 'select',
        options: ['financial', 'material', 'service', 'other'],
        sortable: true,
        filterable: true,
        render: (value) => {
          const getTypeText = (type: string) => {
            switch (type) {
              case 'financial': return 'כספי';
              case 'material': return 'חומרי';
              case 'service': return 'שירות';
              case 'other': return 'אחר';
              default: return type;
            }
          };

          const getTypeColor = (type: string) => {
            switch (type) {
              case 'financial': return 'bg-green-100 text-green-800';
              case 'material': return 'bg-blue-100 text-blue-800';
              case 'service': return 'bg-purple-100 text-purple-800';
              case 'other': return 'bg-gray-100 text-gray-800';
              default: return 'bg-gray-100 text-gray-800';
            }
          };

          return (
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getTypeColor(value)}`}>
              {getTypeText(value)}
            </span>
          );
        }
      },
      {
        key: 'status',
        label: 'סטטוס',
        type: 'select',
        options: ['pending', 'approved', 'rejected', 'completed'],
        sortable: true,
        filterable: true,
        render: (value) => {
          const getStatusIcon = (status: string) => {
            switch (status) {
              case 'pending': return <Clock className="h-4 w-4" />;
              case 'approved': return <CheckCircle className="h-4 w-4" />;
              case 'rejected': return <XCircle className="h-4 w-4" />;
              case 'completed': return <CheckCircle className="h-4 w-4" />;
              default: return <AlertCircle className="h-4 w-4" />;
            }
          };

          const getStatusText = (status: string) => {
            switch (status) {
              case 'pending': return 'ממתין';
              case 'approved': return 'אושר';
              case 'rejected': return 'נדחה';
              case 'completed': return 'הושלם';
              default: return status;
            }
          };

          const getStatusColor = (status: string) => {
            switch (status) {
              case 'pending': return 'bg-yellow-100 text-yellow-800';
              case 'approved': return 'bg-green-100 text-green-800';
              case 'rejected': return 'bg-red-100 text-red-800';
              case 'completed': return 'bg-blue-100 text-blue-800';
              default: return 'bg-gray-100 text-gray-800';
            }
          };

          return (
            <div className={`inline-flex items-center space-x-2 space-x-reverse px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(value)}`}>
              {getStatusIcon(value)}
              <span>{getStatusText(value)}</span>
            </div>
          );
        }
      },
      {
        key: 'priority',
        label: 'עדיפות',
        type: 'select',
        options: ['low', 'medium', 'high', 'urgent'],
        sortable: true,
        filterable: true,
        render: (value) => {
          const getPriorityText = (priority: string) => {
            switch (priority) {
              case 'low': return 'נמוכה';
              case 'medium': return 'בינונית';
              case 'high': return 'גבוהה';
              case 'urgent': return 'דחוף';
              default: return priority;
            }
          };

          const getPriorityColor = (priority: string) => {
            switch (priority) {
              case 'low': return 'bg-gray-100 text-gray-800';
              case 'medium': return 'bg-yellow-100 text-yellow-800';
              case 'high': return 'bg-orange-100 text-orange-800';
              case 'urgent': return 'bg-red-100 text-red-800';
              default: return 'bg-gray-100 text-gray-800';
            }
          };

          return (
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(value)}`}>
              {getPriorityText(value)}
            </span>
          );
        }
      },
      {
        key: 'requestedAmount',
        label: 'סכום מבוקש',
        type: 'number',
        sortable: true,
        filterable: false,
        render: (value) => value ? `₪${value.toFixed(2)}` : '-'
      },
      {
        key: 'approvedAmount',
        label: 'סכום מאושר',
        type: 'number',
        sortable: true,
        filterable: false,
        render: (value) => value ? `₪${value.toFixed(2)}` : '-'
      },
      {
        key: 'requestDate',
        label: 'תאריך בקשה',
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
        key: 'assignedTo',
        label: 'מטופל על ידי',
        type: 'text',
        sortable: true,
        filterable: true,
        render: (value) => value ? (
          <div className="flex items-center space-x-2 space-x-reverse">
            <User className="h-4 w-4 text-gray-400" />
            <span>{value}</span>
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
      ...donorRequests.map(request => 
        tableConfig.columns.map(col => {
          const value = request[col.key as keyof DonorRequest];
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
    link.download = `בקשות-${customer.name}.csv`;
    link.click();
  };

  // Statistics
  const pendingRequests = donorRequests.filter(req => req.status === 'pending').length;
  const approvedRequests = donorRequests.filter(req => req.status === 'approved').length;
  const completedRequests = donorRequests.filter(req => req.status === 'completed').length;
  const totalRequestedAmount = donorRequests.reduce((sum, req) => sum + (req.requestedAmount || 0), 0);
  const totalApprovedAmount = donorRequests.reduce((sum, req) => sum + (req.approvedAmount || 0), 0);

  if (donorRequests.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="bg-gray-100 rounded-full p-6 w-24 h-24 mx-auto mb-4 flex items-center justify-center">
          <FileText className="h-12 w-12 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">אין בקשות עדיין</h3>
        <p className="text-gray-600 mb-6">{customer.name} לא הגיש בקשות עדיין</p>
        <button
          onClick={() => setShowRequestModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 space-x-reverse mx-auto transition-colors"
        >
          <Plus className="h-5 w-5" />
          <span>הוסף בקשה חדשה</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600">ממתינות</p>
              <p className="text-2xl font-bold text-yellow-900">{pendingRequests}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">מאושרות</p>
              <p className="text-2xl font-bold text-green-900">{approvedRequests}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">הושלמו</p>
              <p className="text-2xl font-bold text-blue-900">{completedRequests}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">סה"כ מבוקש</p>
              <p className="text-xl font-bold text-purple-900">₪{totalRequestedAmount.toFixed(0)}</p>
              <p className="text-xs text-purple-600">מאושר: ₪{totalApprovedAmount.toFixed(0)}</p>
            </div>
            <FileText className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowRequestModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 space-x-reverse transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>בקשה חדשה</span>
        </button>
      </div>

      {/* Requests Table */}
      <DynamicTable
        data={donorRequests}
        config={tableConfig}
        onExport={handleExport}
        onConfigChange={setTableConfig}
        title={`בקשות של ${customer.name}`}
      />

      {/* TODO: Add Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">בקשה חדשה</h3>
            <p className="text-gray-600 mb-4">תכונה זו תתווסף בקרוב...</p>
            <button
              onClick={() => setShowRequestModal(false)}
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