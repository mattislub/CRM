import React, { useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, Download, Send, Printer, Building2, Calendar, CreditCard } from 'lucide-react';
import { Receipt } from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ReceiptDetailProps {
  receipts: Receipt[];
}

export default function ReceiptDetail({ receipts }: ReceiptDetailProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const receiptRef = useRef<HTMLDivElement>(null);

  const receipt = receipts.find(r => r.id === id);

  if (!receipt) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">קבלה לא נמצאה</h2>
        <button
          onClick={() => navigate('/receipts')}
          className="text-blue-600 hover:text-blue-800"
        >
          חזור לרשימת קבלות
        </button>
      </div>
    );
  }

  const handleDownloadPDF = async () => {
    if (!receiptRef.current) return;

    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`קבלה-${receipt.receiptNumber}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('שגיאה ביצירת קובץ PDF');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSendEmail = () => {
    const subject = `קבלה ${receipt.receiptNumber}`;
    const body = `שלום ${receipt.customerName},\n\nמצורפת קבלה מספר ${receipt.receiptNumber} בסך ${receipt.total.toFixed(2)} ₪.\n\nתודה רבה!`;
    const mailtoLink = `mailto:${receipt.customerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'issued':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'שולם';
      case 'sent':
        return 'נשלח';
      case 'issued':
        return 'הונפק';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 space-x-reverse">
          <button
            onClick={() => navigate('/receipts')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowRight className="h-5 w-5 text-gray-600" />
          </button>
          <h1 className="text-3xl font-bold text-gray-900">קבלה {receipt.receiptNumber}</h1>
        </div>

        <div className="flex items-center space-x-3 space-x-reverse">
          <button
            onClick={handlePrint}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 space-x-reverse transition-colors"
          >
            <Printer className="h-4 w-4" />
            <span>הדפס</span>
          </button>
          <button
            onClick={handleDownloadPDF}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 space-x-reverse transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>הורד PDF</span>
          </button>
          <button
            onClick={handleSendEmail}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 space-x-reverse transition-colors"
          >
            <Send className="h-4 w-4" />
            <span>שלח ללקוח</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div ref={receiptRef} className="p-8 print:p-6">
          {/* Header */}
          <div className="border-b-2 border-gray-200 pb-6 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">קבלה</h2>
                <div className="text-gray-600">
                  <p className="text-lg font-semibold">מספר קבלה: {receipt.receiptNumber}</p>
                  <p>תאריך הנפקה: {receipt.issueDate.toLocaleDateString('he-IL')}</p>
                  {receipt.transactionId && (
                    <p>מספר עסקה: {receipt.transactionId}</p>
                  )}
                </div>
              </div>
              <div className="text-left">
                <div className="bg-blue-100 rounded-full p-4 mb-4">
                  <Building2 className="h-8 w-8 text-blue-600" />
                </div>
                <div className="text-gray-600">
                  <p className="font-semibold text-lg">החברה שלי</p>
                  <p>רחוב הדוגמה 123</p>
                  <p>תל אביב, ישראל</p>
                  <p>טל: 03-1234567</p>
                  <p>אימייל: info@company.com</p>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">פרטי תורם</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-semibold text-gray-900">{receipt.customerName}</p>
                <p className="text-gray-600">{receipt.customerEmail}</p>
                <p className="text-gray-600">{receipt.customerPhone}</p>
                {receipt.customerAddress && (
                  <p className="text-gray-600">{receipt.customerAddress}</p>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">סטטוס תשלום</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <span className={`inline-block px-3 py-2 rounded-full text-sm font-medium ${getStatusColor(receipt.status)}`}>
                  {getStatusText(receipt.status)}
                </span>
                {receipt.status === 'paid' && (
                  <div className="mt-2 flex items-center space-x-2 space-x-reverse text-green-600">
                    <CreditCard className="h-4 w-4" />
                    <span className="text-sm">התשלום התקבל בהצלחה</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">פירוט פריטים</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-4 py-3 text-right font-semibold">תיאור</th>
                    <th className="border border-gray-300 px-4 py-3 text-center font-semibold">כמות</th>
                    <th className="border border-gray-300 px-4 py-3 text-center font-semibold">מחיר יחידה</th>
                    <th className="border border-gray-300 px-4 py-3 text-center font-semibold">סה"כ</th>
                  </tr>
                </thead>
                <tbody>
                  {receipt.items.map((item) => (
                    <tr key={item.id}>
                      <td className="border border-gray-300 px-4 py-3">{item.description}</td>
                      <td className="border border-gray-300 px-4 py-3 text-center">{item.quantity}</td>
                      <td className="border border-gray-300 px-4 py-3 text-center">₪{item.unitPrice.toFixed(2)}</td>
                      <td className="border border-gray-300 px-4 py-3 text-center font-semibold">₪{item.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-full max-w-sm">
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">סכום ביניים:</span>
                  <span className="font-semibold">₪{receipt.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">מע"מ:</span>
                  <span className="font-semibold">₪{receipt.tax.toFixed(2)}</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between text-lg">
                    <span className="font-bold">סה"כ לתשלום:</span>
                    <span className="font-bold text-blue-600">₪{receipt.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {receipt.notes && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">הערות</h3>
              <p className="text-gray-600 bg-gray-50 p-4 rounded-lg">{receipt.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="border-t pt-6 mt-8 text-center text-gray-500 text-sm">
            <p>תודה על התרומה הנדיבה ועל התמיכה בפעילותנו!</p>
            <p className="mt-2">קבלה זו הונפקה אוטומטית על ידי מערכת ה-CRM</p>
          </div>
        </div>
      </div>
    </div>
  );
}