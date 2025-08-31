import axios from 'axios';
import { generateTranzilaHeaders } from './tranzilaAuth';
import { TranzilaRequest } from '../types';

// URLs for different Tranzila APIs
const TRANZILA_PAYMENT_URL = 'https://secure5.tranzila.com/cgi-bin/tranzila71u.cgi';
const TRANZILA_API_URL = 'https://api.tranzila.com/v1';

export class TranzilaService {
  private supplier: string;

  constructor(supplier: string) {
    this.supplier = supplier;
  }

  async processPayment(request: TranzilaRequest): Promise<Record<string, unknown>> {
    try {
      // בסביבת הפיתוח, נחזיר תשובה מדומה
      if (process.env.NODE_ENV === 'development') {
        return this.mockResponse(request);
      }

      const formData = new FormData();
      Object.entries(request).forEach(([key, value]) => {
        formData.append(key, value.toString());
      });

      const response = await fetch(TRANZILA_PAYMENT_URL, {
        method: 'POST',
        body: formData,
      });

      const textResponse = await response.text();
      return this.parseResponse(textResponse);
    } catch (error) {
      if (error instanceof TypeError) {
        console.error('Connection error to Tranzila payment API:', error.message);
      } else {
        console.error('Tranzila API Error:', error);
      }
      throw new Error('שגיאה בעיבוד התרומה');
    }
  }

  private mockResponse(request: TranzilaRequest) {
    // תשובה מדומה לצורכי פיתוח
    const isSuccess = Math.random() > 0.2; // 80% הצלחה
    
    return {
      Response: isSuccess ? '000' : '001',
      'Dcode': isSuccess ? '0' : '33',
      'TranzilaTK': isSuccess ? 'TZ' + Math.random().toString(36).substr(2, 9) : '',
      'Ecode': isSuccess ? '0' : '33',
      'sum': request.amount,
      'currency': request.currency,
    };
  }

  private parseResponse(responseText: string) {
    const params = new URLSearchParams(responseText);
    return Object.fromEntries(params.entries());
  }

  validatePaymentData(data: Record<string, unknown>): boolean {
    const requiredFields = ['amount', 'ccno', 'expdate', 'cvv', 'contact', 'email'];
    return requiredFields.every(field => data[field] && data[field].toString().trim() !== '');
  }

  /**
   * קבלת מידע על עסקה ספציפית
   */
  async getTransactionDetails(transactionId: string): Promise<Record<string, unknown>> {
    try {
      if (process.env.NODE_ENV === 'development') {
        return {
          transaction_index: transactionId,
          status: 'completed',
          sum: 150.00,
          currency: 'ILS',
          date: new Date().toISOString(),
        };
      }

      const response = await axios.get(
        `${TRANZILA_API_URL}/transactions/${transactionId}`,
        { headers: generateTranzilaHeaders() }
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && !error.response) {
        console.error('Connection error to Tranzila while getting transaction details:', error.message);
      } else {
        console.error('Error getting transaction details:', error);
      }
      throw new Error('שגיאה בקבלת פרטי עסקה');
    }
  }
}