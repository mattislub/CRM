import React, { useState, useMemo } from 'react';
import { Search, Filter, Plus, Edit, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Download, Settings } from 'lucide-react';
import { TableColumn, TableConfig } from '../types';

interface DynamicTableProps {
  data: any[];
  config: TableConfig;
  onAdd?: () => void;
  onEdit?: (item: any) => void;
  onDelete?: (id: string) => void;
  onExport?: () => void;
  onConfigChange?: (config: TableConfig) => void;
  title: string;
}

export default function DynamicTable({
  data,
  config,
  onAdd,
  onEdit,
  onDelete,
  onExport,
  onConfigChange,
  title
}: DynamicTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showColumnConfig, setShowColumnConfig] = useState(false);

  const filteredAndSortedData = useMemo(() => {
    let result = [...data];

    // Apply search
    if (searchTerm && config.searchable) {
      result = result.filter(item =>
        config.columns.some(column => {
          const value = item[column.key];
          return value && value.toString().toLowerCase().includes(searchTerm.toLowerCase());
        })
      );
    }

    // Apply filters
    Object.entries(filters).forEach(([key, filterValue]) => {
      if (filterValue) {
        result = result.filter(item => {
          const value = item[key];
          if (value === null || value === undefined) return false;
          return value.toString().toLowerCase().includes(filterValue.toLowerCase());
        });
      }
    });

    // Apply sorting
    if (sortConfig) {
      result.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;
        
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, searchTerm, sortConfig, filters, config]);

  const handleSort = (key: string) => {
    if (!config.sortable) return;
    
    setSortConfig(current => {
      if (current?.key === key) {
        return current.direction === 'asc' 
          ? { key, direction: 'desc' }
          : null;
      }
      return { key, direction: 'asc' };
    });
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const renderCellValue = (column: TableColumn, value: any, row: any) => {
    if (column.render) {
      return column.render(value, row);
    }

    if (value === null || value === undefined) return '-';

    switch (column.type) {
      case 'date':
        return new Date(value).toLocaleDateString('he-IL');
      case 'number':
        return typeof value === 'number' ? value.toFixed(2) : value;
      case 'boolean':
        return value ? 'כן' : 'לא';
      case 'email':
        return <a href={`mailto:${value}`} className="text-blue-600 hover:underline">{value}</a>;
      case 'phone':
        return <a href={`tel:${value}`} className="text-blue-600 hover:underline">{value}</a>;
      default:
        return value.toString();
    }
  };

  const getSortIcon = (key: string) => {
    if (!config.sortable) return null;
    
    if (sortConfig?.key === key) {
      return sortConfig.direction === 'asc' ? 
        <ArrowUp className="h-4 w-4" /> : 
        <ArrowDown className="h-4 w-4" />;
    }
    return <ArrowUpDown className="h-4 w-4 opacity-50" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        <div className="flex items-center space-x-3 space-x-reverse">
          {config.exportable && onExport && (
            <button
              onClick={onExport}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 space-x-reverse transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>ייצא</span>
            </button>
          )}
          {onConfigChange && (
            <button
              onClick={() => setShowColumnConfig(true)}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 space-x-reverse transition-colors"
            >
              <Settings className="h-4 w-4" />
              <span>הגדרות</span>
            </button>
          )}
          {config.addable && onAdd && (
            <button
              onClick={onAdd}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 space-x-reverse transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>הוסף</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        {(config.searchable || config.filterable) && (
          <div className="p-6 border-b space-y-4">
            {config.searchable && (
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="חפש..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
            
            {config.filterable && (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {config.columns.filter(col => col.filterable).map(column => (
                  <div key={column.key} className="relative">
                    <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    {column.type === 'select' && column.options ? (
                      <select
                        value={filters[column.key] || ''}
                        onChange={(e) => handleFilterChange(column.key, e.target.value)}
                        className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      >
                        <option value="">{column.label}</option>
                        {column.options.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder={`סנן לפי ${column.label}`}
                        value={filters[column.key] || ''}
                        onChange={(e) => handleFilterChange(column.key, e.target.value)}
                        className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="overflow-x-auto">
          {filteredAndSortedData.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>לא נמצאו נתונים</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {config.columns.map(column => (
                    <th
                      key={column.key}
                      className={`px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider ${
                        column.sortable && config.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                      }`}
                      style={{ width: column.width }}
                      onClick={() => column.sortable && handleSort(column.key)}
                    >
                      <div className="flex items-center justify-between">
                        <span>{column.label}</span>
                        {column.sortable && getSortIcon(column.key)}
                      </div>
                    </th>
                  ))}
                  {(config.editable || config.deletable) && (
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      פעולות
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedData.map((row, index) => (
                  <tr key={row.id || index} className="hover:bg-gray-50">
                    {config.columns.map(column => (
                      <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {renderCellValue(column, row[column.key], row)}
                      </td>
                    ))}
                    {(config.editable || config.deletable) && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center space-x-2 space-x-reverse">
                          {config.editable && onEdit && (
                            <button
                              onClick={() => onEdit(row)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          )}
                          {config.deletable && onDelete && (
                            <button
                              onClick={() => onDelete(row.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showColumnConfig && onConfigChange && (
        <ColumnConfigModal
          config={config}
          onSave={onConfigChange}
          onClose={() => setShowColumnConfig(false)}
        />
      )}
    </div>
  );
}

interface ColumnConfigModalProps {
  config: TableConfig;
  onSave: (config: TableConfig) => void;
  onClose: () => void;
}

function ColumnConfigModal({ config, onSave, onClose }: ColumnConfigModalProps) {
  const [localConfig, setLocalConfig] = useState<TableConfig>(JSON.parse(JSON.stringify(config)));
  const [newColumn, setNewColumn] = useState<Partial<TableColumn>>({
    key: '',
    label: '',
    type: 'text',
    sortable: true,
    filterable: true,
  });

  const handleAddColumn = () => {
    if (newColumn.key && newColumn.label) {
      setLocalConfig(prev => ({
        ...prev,
        columns: [...prev.columns, newColumn as TableColumn]
      }));
      setNewColumn({
        key: '',
        label: '',
        type: 'text',
        sortable: true,
        filterable: true,
      });
    }
  };

  const handleRemoveColumn = (index: number) => {
    setLocalConfig(prev => ({
      ...prev,
      columns: prev.columns.filter((_, i) => i !== index)
    }));
  };

  const handleColumnChange = (index: number, field: keyof TableColumn, value: any) => {
    setLocalConfig(prev => ({
      ...prev,
      columns: prev.columns.map((col, i) => 
        i === index ? { ...col, [field]: value } : col
      )
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">הגדרות טבלה</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center space-x-2 space-x-reverse">
              <input
                type="checkbox"
                checked={localConfig.searchable}
                onChange={(e) => setLocalConfig(prev => ({ ...prev, searchable: e.target.checked }))}
                className="rounded"
              />
              <span>חיפוש</span>
            </label>
            <label className="flex items-center space-x-2 space-x-reverse">
              <input
                type="checkbox"
                checked={localConfig.sortable}
                onChange={(e) => setLocalConfig(prev => ({ ...prev, sortable: e.target.checked }))}
                className="rounded"
              />
              <span>מיון</span>
            </label>
            <label className="flex items-center space-x-2 space-x-reverse">
              <input
                type="checkbox"
                checked={localConfig.filterable}
                onChange={(e) => setLocalConfig(prev => ({ ...prev, filterable: e.target.checked }))}
                className="rounded"
              />
              <span>סינון</span>
            </label>
            <label className="flex items-center space-x-2 space-x-reverse">
              <input
                type="checkbox"
                checked={localConfig.exportable}
                onChange={(e) => setLocalConfig(prev => ({ ...prev, exportable: e.target.checked }))}
                className="rounded"
              />
              <span>ייצוא</span>
            </label>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">עמודות</h3>
            <div className="space-y-3">
              {localConfig.columns.map((column, index) => (
                <div key={index} className="flex items-center space-x-3 space-x-reverse p-3 border rounded-lg">
                  <input
                    type="text"
                    value={column.label}
                    onChange={(e) => handleColumnChange(index, 'label', e.target.value)}
                    className="flex-1 px-3 py-1 border rounded"
                    placeholder="תווית"
                  />
                  <input
                    type="text"
                    value={column.key}
                    onChange={(e) => handleColumnChange(index, 'key', e.target.value)}
                    className="flex-1 px-3 py-1 border rounded"
                    placeholder="מפתח"
                  />
                  <select
                    value={column.type}
                    onChange={(e) => handleColumnChange(index, 'type', e.target.value)}
                    className="px-3 py-1 border rounded"
                  >
                    <option value="text">טקסט</option>
                    <option value="number">מספר</option>
                    <option value="date">תאריך</option>
                    <option value="email">אימייל</option>
                    <option value="phone">טלפון</option>
                    <option value="select">בחירה</option>
                    <option value="boolean">בוליאני</option>
                  </select>
                  <button
                    onClick={() => handleRemoveColumn(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 border-2 border-dashed border-gray-300 rounded-lg">
              <div className="flex items-center space-x-3 space-x-reverse">
                <input
                  type="text"
                  value={newColumn.label || ''}
                  onChange={(e) => setNewColumn(prev => ({ ...prev, label: e.target.value }))}
                  className="flex-1 px-3 py-1 border rounded"
                  placeholder="תווית עמודה חדשה"
                />
                <input
                  type="text"
                  value={newColumn.key || ''}
                  onChange={(e) => setNewColumn(prev => ({ ...prev, key: e.target.value }))}
                  className="flex-1 px-3 py-1 border rounded"
                  placeholder="מפתח"
                />
                <select
                  value={newColumn.type || 'text'}
                  onChange={(e) => setNewColumn(prev => ({ ...prev, type: e.target.value as any }))}
                  className="px-3 py-1 border rounded"
                >
                  <option value="text">טקסט</option>
                  <option value="number">מספר</option>
                  <option value="date">תאריך</option>
                  <option value="email">אימייל</option>
                  <option value="phone">טלפון</option>
                  <option value="select">בחירה</option>
                  <option value="boolean">בוליאני</option>
                </select>
                <button
                  onClick={handleAddColumn}
                  className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                >
                  הוסף
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 space-x-reverse p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            ביטול
          </button>
          <button
            onClick={() => {
              onSave(localConfig);
              onClose();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            שמור
          </button>
        </div>
      </div>
    </div>
  );
}