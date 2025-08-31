import React from 'react';
import { Link } from 'react-router-dom';
import { Users, CreditCard, DollarSign, TrendingUp, Calendar, Activity, Receipt } from 'lucide-react';
import { Customer, Charge } from '../types';
import { Receipt as ReceiptType } from '../types';
import TranzilaSync from './TranzilaSync';

interface DashboardProps {
  customers: Customer[];
  charges: Charge[];
  receipts?: ReceiptType[];
  onSyncComplete?: (charges: Charge[]) => void;
}

export default function Dashboard({ customers, charges, receipts = [], onSyncComplete }: DashboardProps) {
  const totalRevenue = charges
    .filter(charge => charge.status === 'completed')
    .reduce((sum, charge) => sum + charge.amount, 0);

  const pendingCharges = charges.filter(charge => charge.status === 'pending').length;
  const completedCharges = charges.filter(charge => charge.status === 'completed').length;
  const totalReceipts = receipts.length;
  
  const recentCharges = charges
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 5);

  const recentCustomers = customers
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 3);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
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
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">לוח בקרה</h1>
        <p className="text-gray-600 mt-2">סקירה כללית של המערכת</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">סה"כ לקוחות</p>
              <p className="text-3xl font-bold text-gray-900">{customers.length}</p>
            </div>
            <div className="bg-blue-100 rounded-full p-3">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">סה"כ הכנסות</p>
              <p className="text-3xl font-bold text-gray-900">₪{totalRevenue.toFixed(0)}</p>
            </div>
            <div className="bg-green-100 rounded-full p-3">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">תרומות ממתינות</p>
              <p className="text-3xl font-bold text-gray-900">{pendingCharges}</p>
            </div>
            <div className="bg-yellow-100 rounded-full p-3">
              <Calendar className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">קבלות שהונפקו</p>
              <p className="text-3xl font-bold text-gray-900">{totalReceipts}</p>
            </div>
            <div className="bg-orange-100 rounded-full p-3">
              <Receipt className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">תרומות מוצלחות</p>
              <p className="text-3xl font-bold text-gray-900">{completedCharges}</p>
            </div>
            <div className="bg-green-100 rounded-full p-3">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">תרומות אחרונות</h2>
              <Link
                to="/charges"
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                הצג הכל
              </Link>
            </div>
          </div>
          <div className="p-6">
            {recentCharges.length === 0 ? (
              <p className="text-gray-500 text-center py-4">אין תרומות עדיין</p>
            ) : (
              <div className="space-y-4">
                {recentCharges.map((charge) => (
                  <div key={charge.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{charge.customerName}</p>
                      <p className="text-sm text-gray-600">{charge.description}</p>
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-900">₪{charge.amount.toFixed(2)}</p>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(charge.status)}`}>
                        {getStatusText(charge.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">לקוחות חדשים</h2>
              <Link
                to="/customers"
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                הצג הכל
              </Link>
            </div>
          </div>
          <div className="p-6">
            {recentCustomers.length === 0 ? (
              <p className="text-gray-500 text-center py-4">אין לקוחות עדיין</p>
            ) : (
              <div className="space-y-4">
                {recentCustomers.map((customer) => (
                  <Link
                    key={customer.id}
                    to={`/customer/${customer.id}`}
                    className="block hover:bg-gray-50 p-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-center space-x-3 space-x-reverse">
                      <div className="bg-blue-100 rounded-full p-2">
                        <Users className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{customer.name}</p>
                        <p className="text-sm text-gray-600">{customer.email}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tranzila Sync Section */}
      <div>
        <TranzilaSync onSyncComplete={onSyncComplete} />
      </div>
    </div>
  );
}