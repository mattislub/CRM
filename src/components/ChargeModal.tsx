import React, { useState } from 'react';
import { X, CreditCard, Loader } from 'lucide-react';
import { Customer, Charge, Fund } from '../types';
import { TranzilaService } from '../services/tranzilaService';
import { ReceiptService } from '../services/receiptService';

interface ChargeModalProps {
  customer: Customer;
  funds: Fund[];
  onClose: () => void;
  onSubmit: (charge: Omit<Charge, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

export default function ChargeModal({ customer, funds, onClose, onSubmit }: ChargeModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState({
    fundId: '',
    amount: '',
    description: '',
    ccno: '',
    expdate: '',
    cvv: '',
  });

  const tranzilaService = new TranzilaService('your-supplier-id'); // יש להחליף ב-ID האמיתי

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      const tranzilaRequest = {
        amount: parseFloat(formData.amount),
        currency: 'ILS',
        ccno: formData.ccno,
        expdate: formData.expdate,
        cvv: formData.cvv,
        contact: customer.name,
        email: customer.email,
        supplier: 'your-supplier-id', // יש להחליף ב-ID האמיתי
        tranmode: 'A' as const,
      };

      const response = await tranzilaService.processPayment(tranzilaRequest);
      
      const isSuccess = response.Response === '000';
      const receiptNumber = ReceiptService.generateReceiptNumber();
      
      const selectedFund = funds.find(f => f.id === formData.fundId);
      
      const newCharge: Omit<Charge, 'id' | 'createdAt' | 'updatedAt'> = {
        customerId: customer.id,
        customerName: customer.name,
        fundId: formData.fundId || undefined,
        fundName: selectedFund?.name || undefined,
        amount: parseFloat(formData.amount),
        currency: 'ILS',
        description: formData.description,
        status: isSuccess ? 'completed' : 'failed',
        transactionId: response.TranzilaTK || undefined,
        receiptNumber: isSuccess ? receiptNumber : undefined,
      };

      onSubmit(newCharge);
      onClose();
    } catch (error) {
      console.error('Error processing payment:', error);
      // בסביבת פיתוח, ניצור חיוב כ"נכשל"
      const receiptNumber = ReceiptService.generateReceiptNumber();
      const selectedFund = funds.find(f => f.id === formData.fundId);
      
      const newCharge: Omit<Charge, 'id' | 'createdAt' | 'updatedAt'> = {
        customerId: customer.id,
        customerName: customer.name,
        fundId: formData.fundId || undefined,
        fundName: selectedFund?.name || undefined,
        amount: parseFloat(formData.amount),
        currency: 'ILS',
        description: formData.description,
        status: 'failed',
        receiptNumber,
      };
      onSubmit(newCharge);
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">תרומה חדשה - {customer.name}</h2>
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
              קרן יעד (אופציונלי)
            </label>
            <select
              value={formData.fundId}
              onChange={(e) => handleInputChange('fundId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">בחר קרן (אופציונלי)</option>
              {funds
                .filter(fund => fund.status === 'active')
                .map(fund => (
                  <option key={fund.id} value={fund.id}>
                    {fund.fundNumber} - {fund.name} - {fund.category === 'education' ? 'חינוך' :
                     fund.category === 'health' ? 'בריאות' :
                     fund.category === 'social' ? 'חברתי' :
                     fund.category === 'religious' ? 'דתי' :
                     fund.category === 'emergency' ? 'חירום' : 'כללי'}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              סכום (₪)
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={formData.amount}
              onChange={(e) => handleInputChange('amount', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              תיאור התרומה
            </label>
            <input
              type="text"
              required
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="תיאור התרומה"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              מספר כרטיס אשראי
            </label>
            <input
              type="text"
              required
              value={formData.ccno}
              onChange={(e) => handleInputChange('ccno', e.target.value.replace(/\D/g, ''))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="1234567812345678"
              maxLength={16}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                תאריך תפוגה
              </label>
              <input
                type="text"
                required
                value={formData.expdate}
                onChange={(e) => {
                  let value = e.target.value.replace(/\D/g, '');
                  if (value.length >= 2) {
                    value = value.substring(0, 2) + '/' + value.substring(2, 4);
                  }
                  handleInputChange('expdate', value);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="MM/YY"
                maxLength={5}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CVV
              </label>
              <input
                type="text"
                required
                value={formData.cvv}
                onChange={(e) => handleInputChange('cvv', e.target.value.replace(/\D/g, ''))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="123"
                maxLength={4}
              />
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
              disabled={isProcessing}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 space-x-reverse transition-colors"
            >
              {isProcessing ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  <span>מעבד...</span>
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4" />
                  <span>קבל תרומה</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}