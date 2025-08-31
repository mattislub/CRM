import axios from 'axios';
import { generateTranzilaHeaders } from './tranzilaAuth';
import { Charge } from '../types';

type TranzilaTransaction = { 
  transaction_index: string; 
  sum: number; 
  currency: string; 
  date: string;
  contact?: string;
  email?: string;
  description?: string;
};

type TranzilaDocument = {
  document_id: string;
  transaction_index: string;
  document_type: string;
  sum: number;
  currency: string;
  created_date: string;
};

export class TranzilaIntegrationService {
  private static instance: TranzilaIntegrationService;

  static getInstance(): TranzilaIntegrationService {
    if (!TranzilaIntegrationService.instance) {
      TranzilaIntegrationService.instance = new TranzilaIntegrationService();
    }
    return TranzilaIntegrationService.instance;
  }

  /**
   * קבלת רשימת עסקאות מ-Tranzila לפי טווח תאריכים
   */
  async getTransactions(from: string, to: string): Promise<TranzilaTransaction[]> {
    try {
      // בסביבת פיתוח - החזר נתונים מדומים
      if (process.env.NODE_ENV === 'development') {
        return this.getMockTransactions(from, to);
      }

      const res = await axios.post(
        'https://api.tranzila.com/v1/reports/transactions',
        { from_date: from, to_date: to },
        { headers: generateTranzilaHeaders() }
      );

      const data = res.data;

      return (data.transactions || []).map((t: TranzilaTransaction) => ({
        transaction_index: t.transaction_index,
        sum: t.sum,
        currency: t.currency,
        date: t.date,
        contact: t.contact,
        email: t.email,
        description: t.description,
      }));
    } catch (error) {
      if (axios.isAxiosError(error) && !error.response) {
        console.error('Connection error to Tranzila while fetching transactions:', error.message);
      } else {
        console.error('Error fetching transactions from Tranzila:', error);
      }
      throw new Error('שגיאה בקבלת עסקאות מטרנזילה');
    }
  }

  /**
   * קבלת רשימת קבלות קיימות מ-Tranzila
   */
  async getExistingReceipts(from: string, to: string): Promise<Set<string>> {
    try {
      // בסביבת פיתוח - החזר נתונים מדומים
      if (process.env.NODE_ENV === 'development') {
        return this.getMockExistingReceipts();
      }

      const res = await axios.post(
        'https://billing5.tranzila.com/api/documents_db/get_documents',
        { document_type: 'RE', from_date: from, to_date: to },
        { headers: generateTranzilaHeaders() }
      );

      const data = res.data;
      
      // החזר סט של transaction_index שכבר הופקו להם קבלות
      return new Set((data.documents || []).map((d: TranzilaDocument) => d.transaction_index));
    } catch (error) {
      if (axios.isAxiosError(error) && !error.response) {
        console.error('Connection error to Tranzila while fetching existing receipts:', error.message);
      } else {
        console.error('Error fetching existing receipts from Tranzila:', error);
      }
      throw new Error('שגיאה בקבלת קבלות קיימות מטרנזילה');
    }
  }

  /**
   * יצירת קבלה חדשה ב-Tranzila
   */
  async createReceiptFor(tx: TranzilaTransaction): Promise<Record<string, unknown>> {
    try {
      // בסביבת פיתוח - החזר תשובה מדומה
      if (process.env.NODE_ENV === 'development') {
        return this.getMockReceiptCreation(tx);
      }

      const res = await axios.post(
        'https://billing5.tranzila.com/api/documents_db/create_document',
        {
          document_type: 'RE',
          transaction_index: tx.transaction_index,
          currency: tx.currency,
          sum: tx.sum,
          contact: tx.contact,
          email: tx.email,
          description: tx.description || 'תרומה'
        },
        { headers: generateTranzilaHeaders() }
      );

      return res.data;
    } catch (error) {
      if (axios.isAxiosError(error) && !error.response) {
        console.error('Connection error to Tranzila while creating receipt:', error.message);
      } else {
        console.error('Error creating receipt in Tranzila:', error);
      }
      throw new Error('שגיאה ביצירת קבלה בטרנזילה');
    }
  }

  /**
   * תהליך אוטומטי ליצירת קבלות לעסקאות חסרות
   */
  async generateMissingReceipts(from: string, to: string): Promise<{
    processed: number;
    created: number;
    errors: string[];
  }> {
    const results = {
      processed: 0,
      created: 0,
      errors: [] as string[]
    };

    try {
      console.log(`מתחיל תהליך יצירת קבלות לתקופה: ${from} עד ${to}`);

      // קבלת עסקאות וקבלות קיימות במקביל
      const [transactions, existingReceipts] = await Promise.all([
        this.getTransactions(from, to),
        this.getExistingReceipts(from, to)
      ]);

      console.log(`נמצאו ${transactions.length} עסקאות, ${existingReceipts.size} קבלות קיימות`);

      // סינון עסקאות שאין להן קבלות
      const missingReceipts = transactions.filter(tx => 
        !existingReceipts.has(tx.transaction_index)
      );

      console.log(`נדרש ליצור ${missingReceipts.length} קבלות חדשות`);

      results.processed = transactions.length;

      // יצירת קבלות לעסקאות חסרות
      for (const tx of missingReceipts) {
        try {
          console.log(`יוצר קבלה לעסקה: ${tx.transaction_index}`);
          await this.createReceiptFor(tx);
          results.created++;
          
          // המתנה קצרה בין בקשות למניעת עומס על השרת
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          const errorMsg = `שגיאה ביצירת קבלה לעסקה ${tx.transaction_index}: ${error}`;
          console.error(errorMsg);
          results.errors.push(errorMsg);
        }
      }

      console.log(`תהליך הושלם: נוצרו ${results.created} קבלות מתוך ${missingReceipts.length}`);
      
      return results;
    } catch (error) {
      console.error('Error in generateMissingReceipts:', error);
      results.errors.push(`שגיאה כללית: ${error}`);
      return results;
    }
  }

  /**
   * סנכרון עסקאות מ-Tranzila למערכת המקומית
   */
  async syncTransactionsToLocal(from: string, to: string): Promise<Charge[]> {
    try {
      const transactions = await this.getTransactions(from, to);
      
      return transactions.map(tx => ({
        id: `tranzila_${tx.transaction_index}`,
        customerId: 'unknown', // יש לקשר ללקוח לפי האימייל או הטלפון
        customerName: tx.contact || 'לקוח לא ידוע',
        amount: tx.sum,
        currency: tx.currency,
        description: tx.description || 'תרומה מטרנזילה',
        status: 'completed' as const,
        transactionId: tx.transaction_index,
        createdAt: new Date(tx.date),
        updatedAt: new Date(tx.date),
      }));
    } catch (error) {
      console.error('Error syncing transactions:', error);
      throw new Error('שגיאה בסנכרון עסקאות');
    }
  }

  // נתונים מדומים לפיתוח
  private getMockTransactions(): TranzilaTransaction[] {
    return [
      {
        transaction_index: 'TZ123456789',
        sum: 150.00,
        currency: 'ILS',
        date: '2024-01-20',
        contact: 'אברהם כהן',
        email: 'abraham@example.com',
        description: 'תרומה לקרן חינוך'
      },
      {
        transaction_index: 'TZ987654321',
        sum: 450.75,
        currency: 'ILS',
        date: '2024-03-10',
        contact: 'דוד מזרחי',
        email: 'david@example.com',
        description: 'תרומה שנתית'
      }
    ];
  }

  private getMockExistingReceipts(): Set<string> {
    return new Set(['TZ123456789']); // רק עסקה אחת כבר יש לה קבלה
  }

  private getMockReceiptCreation(tx: TranzilaTransaction) {
    return {
      document_id: `RE_${Date.now()}`,
      transaction_index: tx.transaction_index,
      status: 'created',
      message: 'קבלה נוצרה בהצלחה'
    };
  }
}