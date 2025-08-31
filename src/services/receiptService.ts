import { Receipt, ReceiptItem, Charge, Customer } from '../types';

export class ReceiptService {
  static generateReceiptNumber(): string {
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-6);
    return `RCP-${year}-${timestamp}`;
  }

  static createReceiptFromCharge(
    charge: Charge,
    customer: Customer,
    items?: ReceiptItem[]
  ): Receipt {
    const receiptNumber = charge.receiptNumber || this.generateReceiptNumber();
    
    // If no items provided, create a default item from the charge
    const defaultItems: ReceiptItem[] = items || [
      {
        id: '1',
        description: charge.description,
        quantity: 1,
        unitPrice: charge.amount * 0.85, // Assuming 15% tax
        total: charge.amount * 0.85,
      },
      {
        id: '2',
        description: 'מע"מ 17%',
        quantity: 1,
        unitPrice: charge.amount * 0.15,
        total: charge.amount * 0.15,
      },
    ];

    const subtotal = defaultItems
      .filter(item => !item.description.includes('מע"מ'))
      .reduce((sum, item) => sum + item.total, 0);
    
    const tax = defaultItems
      .filter(item => item.description.includes('מע"מ'))
      .reduce((sum, item) => sum + item.total, 0);

    return {
      id: Math.random().toString(36).substr(2, 9),
      receiptNumber,
      chargeId: charge.id,
      customerId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      customerAddress: customer.address,
      amount: charge.amount,
      currency: charge.currency,
      description: charge.description,
      transactionId: charge.transactionId,
      issueDate: new Date(),
      status: charge.status === 'completed' ? 'paid' : 'issued',
      items: defaultItems,
      subtotal,
      tax,
      total: charge.amount,
    };
  }

  static calculateTotals(items: ReceiptItem[]): {
    subtotal: number;
    tax: number;
    total: number;
  } {
    const subtotal = items
      .filter(item => !item.description.includes('מע"מ'))
      .reduce((sum, item) => sum + item.total, 0);
    
    const tax = items
      .filter(item => item.description.includes('מע"מ'))
      .reduce((sum, item) => sum + item.total, 0);

    return {
      subtotal,
      tax,
      total: subtotal + tax,
    };
  }

  static formatReceiptForEmail(receipt: Receipt): string {
    return `
קבלה מספר: ${receipt.receiptNumber}
תאריך: ${receipt.issueDate.toLocaleDateString('he-IL')}
תורם: ${receipt.customerName}

פירוט:
${receipt.items.map(item => 
  `${item.description} - כמות: ${item.quantity} - מחיר: ₪${item.unitPrice.toFixed(2)} - סה"כ: ₪${item.total.toFixed(2)}`
).join('\n')}

סכום ביניים: ₪${receipt.subtotal.toFixed(2)}
מע"מ: ₪${receipt.tax.toFixed(2)}
סה"כ לתשלום: ₪${receipt.total.toFixed(2)}

${receipt.notes ? `הערות: ${receipt.notes}` : ''}

תודה על התרומה הנדיבה!
    `.trim();
  }
}