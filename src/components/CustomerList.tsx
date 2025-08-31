import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Mail, Phone, Search, X } from 'lucide-react';
import { Customer } from '../types';
import { TableColumn, TableConfig } from '../types';
import DynamicTable from './DynamicTable';
import EditCustomerModal from './EditCustomerModal';
import HebrewDate from './HebrewDate';

interface CustomerListProps {
  customers: Customer[];
  onDeleteCustomer: (id: string) => void;
}

export default function CustomerList({ customers, onDeleteCustomer }: CustomerListProps) {
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [searchFilters, setSearchFilters] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    address: ''
  });
  const [filteredCustomers, setFilteredCustomers] = useState(customers);

  // Handle F5 key press
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'F5') {
        event.preventDefault();
        setShowAdvancedSearch(true);
      }
      if (event.key === 'Escape') {
        setShowAdvancedSearch(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Apply advanced search filters
  React.useEffect(() => {
    let filtered = customers;

    Object.entries(searchFilters).forEach(([key, value]) => {
      if (value.trim()) {
        filtered = filtered.filter(customer => {
          const fieldValue = customer[key as keyof Customer];
          return fieldValue && fieldValue.toString().toLowerCase().includes(value.toLowerCase());
        });
      }
    });

    setFilteredCustomers(filtered);
  }, [searchFilters, customers]);

  const handleSearchFilterChange = (field: string, value: string) => {
    setSearchFilters(prev => ({ ...prev, [field]: value }));
  };

  const clearAllFilters = () => {
    setSearchFilters({
      name: '',
      email: '',
      phone: '',
      company: '',
      address: ''
    });
  };

  const [tableConfig, setTableConfig] = useState<TableConfig>({
    columns: [
      {
        key: 'name',
        label: 'שם',
        type: 'text',
        sortable: true,
        filterable: true,
        required: true,
        render: (value, row) => (
          <Link
            to={`/customer/${row.id}`}
            className="flex items-center space-x-3 space-x-reverse hover:text-blue-600 transition-colors"
          >
            <div className="bg-blue-100 rounded-full p-2">
              <Building2 className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <div className="font-semibold">{value}</div>
              {row.company && <div className="text-sm text-gray-500">{row.company}</div>}
            </div>
          </Link>
        )
      },
      {
        key: 'email',
        label: 'אימייל',
        type: 'email',
        sortable: true,
        filterable: true,
        render: (value) => (
          <div className="flex items-center space-x-2 space-x-reverse">
            <Mail className="h-4 w-4 text-gray-400" />
            <a href={`mailto:${value}`} className="text-blue-600 hover:underline">{value}</a>
          </div>
        )
      },
      {
        key: 'phone',
        label: 'טלפון',
        type: 'phone',
        sortable: true,
        filterable: true,
        render: (value) => (
          <div className="flex items-center space-x-2 space-x-reverse">
            <Phone className="h-4 w-4 text-gray-400" />
            <a href={`tel:${value}`} className="text-blue-600 hover:underline">{value}</a>
          </div>
        )
      },
      {
        key: 'company',
        label: 'חברה',
        type: 'text',
        sortable: true,
        filterable: true
      },
      {
        key: 'address',
        label: 'כתובת',
        type: 'text',
        sortable: false,
        filterable: true
      },
      {
        key: 'createdAt',
        label: 'תאריך יצירה',
        type: 'date',
        sortable: true,
        filterable: false
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

  const handleAdd = () => {
    // TODO: Implement add customer modal
    console.log('Add customer');
  };

  const handleEdit = (customer: Customer) => {
    // TODO: Implement edit customer modal
    console.log('Edit customer:', customer);
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    const csv = [
      tableConfig.columns.map(col => col.label).join(','),
      ...customers.map(customer => 
        tableConfig.columns.map(col => {
          const value = customer[col.key as keyof Customer];
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
    link.download = 'customers.csv';
    link.click();
  };

  return (
    <>
    <DynamicTable
      data={filteredCustomers}
      config={tableConfig}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={onDeleteCustomer}
      onExport={handleExport}
      onConfigChange={setTableConfig}
      title="רשימת לקוחות"
    />

      {/* Advanced Search Modal */}
      {showAdvancedSearch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <div className="flex items-center space-x-3 space-x-reverse">
                <Search className="h-6 w-6 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">חיפוש מתקדם בתורמים</h2>
              </div>
              <button
                onClick={() => setShowAdvancedSearch(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    שם התורם
                  </label>
                  <input
                    type="text"
                    value={searchFilters.name}
                    onChange={(e) => handleSearchFilterChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="חפש לפי שם..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    אימייל
                  </label>
                  <input
                    type="email"
                    value={searchFilters.email}
                    onChange={(e) => handleSearchFilterChange('email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="חפש לפי אימייל..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    טלפון
                  </label>
                  <input
                    type="tel"
                    value={searchFilters.phone}
                    onChange={(e) => handleSearchFilterChange('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="חפש לפי טלפון..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    חברה/ארגון
                  </label>
                  <input
                    type="text"
                    value={searchFilters.company}
                    onChange={(e) => handleSearchFilterChange('company', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="חפש לפי חברה..."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    כתובת
                  </label>
                  <input
                    type="text"
                    value={searchFilters.address}
                    onChange={(e) => handleSearchFilterChange('address', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="חפש לפי כתובת..."
                  />
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-900">
                      נמצאו {filteredCustomers.length} תורמים מתוך {customers.length}
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      השתמש ב-F5 לפתיחת החיפוש המתקדם, Escape לסגירה
                    </p>
                  </div>
                  <button
                    onClick={clearAllFilters}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    נקה הכל
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 space-x-reverse p-6 border-t bg-gray-50">
              <button
                onClick={() => setShowAdvancedSearch(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                סגור
              </button>
              <button
                onClick={() => {
                  clearAllFilters();
                  setShowAdvancedSearch(false);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                נקה וסגור
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}