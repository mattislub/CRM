import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, CreditCard, Mail, Phone, Building2, MapPin, Calendar, Plus, FileText, Heart, Users, Edit } from 'lucide-react';
import { Customer, Charge, DonorRequest, Yahrzeit } from '../types';
import ChargeModal from './ChargeModal';
import EditCustomerModal from './EditCustomerModal';
import DonorDonationsTab from './DonorDonationsTab';
import DonorRequestsTab from './DonorRequestsTab';
import DonorYahrzeitsTab from './DonorYahrzeitsTab';
import { HebrewDateUtils } from '../utils/hebrewDate';

interface CustomerDetailProps {
  customers: Customer[];
  charges: Charge[];
  funds: Fund[];
  onCreateCharge: (charge: Omit<Charge, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateCustomer: (customer: Customer) => void;
}

export default function CustomerDetail({ customers, charges, funds, onCreateCharge, onUpdateCustomer }: CustomerDetailProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showChargeModal, setShowChargeModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'donations' | 'requests' | 'yahrzeits'>('donations');

  const customer = customers.find(c => c.id === id);
  const customerCharges = charges.filter(c => c.customerId === id);

  if (!customer) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">תורם לא נמצא</h2>
        <button
          onClick={() => navigate('/customers')}
          className="text-blue-600 hover:text-blue-800"
        >
          חזור לרשימת תורמים
        </button>
      </div>
    );
  }

  const tabs = [
    {
      id: 'donations' as const,
      label: 'תרומות',
      icon: CreditCard,
      count: customerCharges.length
    },
    {
      id: 'requests' as const,
      label: 'בקשות',
      icon: FileText,
      count: 0 // Will be updated with real data
    },
    {
      id: 'yahrzeits' as const,
      label: 'יארצייטים',
      icon: Heart,
      count: 0 // Will be updated with real data
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4 space-x-reverse">
        <button
          onClick={() => navigate('/customers')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowRight className="h-5 w-5 text-gray-600" />
        </button>
        <h1 className="text-3xl font-bold text-gray-900">פרטי תורם</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Customer Info Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6 sticky top-6">
            <div className="flex items-center space-x-4 space-x-reverse mb-6">
              <div className="bg-blue-100 rounded-full p-4">
                <Building2 className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{customer.name}</h2>
                {customer.company && (
                  <p className="text-gray-600">{customer.company}</p>
                )}
              </div>
              <button
                onClick={() => setShowEditModal(true)}
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="ערוך פרטי תורם"
              >
                <Edit className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-3 space-x-reverse">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="text-gray-900">{customer.email}</span>
              </div>
              
              <div className="flex items-center space-x-3 space-x-reverse">
                <Phone className="h-4 w-4 text-gray-400" />
                <span className="text-gray-900">{customer.phone}</span>
              </div>
              
              {customer.address && (
                <div className="flex items-start space-x-3 space-x-reverse">
                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                  <span className="text-gray-900">{customer.address}</span>
                </div>
              )}
              
              <div className="flex items-center space-x-3 space-x-reverse">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-gray-900">
                  נוצר ב-{customer.createdAt.toLocaleDateString('he-IL')}
                </span>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="mt-6 pt-6 border-t">
              <h3 className="text-sm font-medium text-gray-500 mb-3">סטטיסטיקות מהירות</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">סה"כ תרומות:</span>
                  <span className="text-sm font-semibold">{customerCharges.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">סכום כולל:</span>
                  <span className="text-sm font-semibold">
                    ₪{customerCharges.reduce((sum, charge) => sum + charge.amount, 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow">
            {/* Tabs Header */}
            <div className="border-b">
              <nav className="flex space-x-8 space-x-reverse px-6">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center space-x-2 space-x-reverse py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{tab.label}</span>
                      {tab.count > 0 && (
                        <span className={`inline-flex items-center justify-center px-2 py-1 text-xs font-bold rounded-full ${
                          activeTab === tab.id
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'donations' && (
                <DonorDonationsTab
                  customer={customer}
                  charges={customerCharges}
                  onCreateCharge={() => setShowChargeModal(true)}
                />
              )}
              
              {activeTab === 'requests' && (
                <DonorRequestsTab
                  customer={customer}
                />
              )}
              
              {activeTab === 'yahrzeits' && (
                <DonorYahrzeitsTab
                  customer={customer}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {showChargeModal && (
        <ChargeModal
          customer={customer}
          funds={funds}
          onClose={() => setShowChargeModal(false)}
          onSubmit={onCreateCharge}
        />
      )}

      {showEditModal && (
        <EditCustomerModal
          customer={customer}
          onClose={() => setShowEditModal(false)}
          onSave={onUpdateCustomer}
        />
      )}
    </div>
  );
}