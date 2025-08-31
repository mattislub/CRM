import React, { useState } from 'react';
import { X, User, Mail, Phone, Building2, MapPin, Save } from 'lucide-react';
import { Customer } from '../types';
import { HebrewDateUtils } from '../utils/hebrewDate';

interface EditCustomerModalProps {
  customer: Customer;
  onClose: () => void;
  onSave: (updatedCustomer: Customer) => void;
}

export default function EditCustomerModal({ customer, onClose, onSave }: EditCustomerModalProps) {
  const [formData, setFormData] = useState({
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    company: customer.company || '',
    address: customer.address || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'שם התורם הוא שדה חובה';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'אימייל הוא שדה חובה';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'כתובת אימייל לא תקינה';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'מספר טלפון הוא שדה חובה';
    } else if (!/^[\d\-\+\(\)\s]+$/.test(formData.phone)) {
      newErrors.phone = 'מספר טלפון לא תקין';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const updatedCustomer: Customer = {
      ...customer,
      ...formData,
      updatedAt: new Date(),
    };

    onSave(updatedCustomer);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="bg-blue-100 rounded-full p-2">
              <User className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">עריכת פרטי תורם</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <div className="flex items-center space-x-2 space-x-reverse">
                <User className="h-4 w-4 text-gray-400" />
                <span>שם התורם *</span>
              </div>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="הכנס שם מלא"
            />
            {errors.name && (
              <p className="text-red-600 text-sm mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <div className="flex items-center space-x-2 space-x-reverse">
                <Mail className="h-4 w-4 text-gray-400" />
                <span>כתובת אימייל *</span>
              </div>
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.email ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="example@email.com"
            />
            {errors.email && (
              <p className="text-red-600 text-sm mt-1">{errors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <div className="flex items-center space-x-2 space-x-reverse">
                <Phone className="h-4 w-4 text-gray-400" />
                <span>מספר טלפון *</span>
              </div>
            </label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.phone ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="050-1234567"
            />
            {errors.phone && (
              <p className="text-red-600 text-sm mt-1">{errors.phone}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <div className="flex items-center space-x-2 space-x-reverse">
                <Building2 className="h-4 w-4 text-gray-400" />
                <span>חברה/ארגון</span>
              </div>
            </label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => handleInputChange('company', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="שם החברה או הארגון"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <div className="flex items-center space-x-2 space-x-reverse">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span>כתובת</span>
              </div>
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="כתובת מלאה"
            />
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-start space-x-3 space-x-reverse">
              <div className="bg-blue-100 rounded-full p-1 mt-0.5">
                <User className="h-3 w-3 text-blue-600" />
              </div>
              <div className="text-sm">
                <p className="font-medium text-blue-900">מידע נוסף</p>
                <p className="text-blue-700 mt-1">
                  תאריך יצירה: {customer.createdAt.toLocaleDateString('he-IL')}
                </p>
                <p className="text-blue-700">
                  עדכון אחרון: {customer.updatedAt.toLocaleDateString('he-IL')}
                </p>
              </div>
            </div>
          </div>

          <div className="flex space-x-3 space-x-reverse pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              ביטול
            </button>
            <button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 space-x-reverse transition-colors"
            >
              <Save className="h-4 w-4" />
              <span>שמור שינויים</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}