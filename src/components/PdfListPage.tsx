import React, { useEffect, useState } from 'react';
import { Scissors } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';

interface SavedPdf {
  id: string;
  name: string;
  data: string;
}

export default function PdfListPage() {
  const [pdfs, setPdfs] = useState<SavedPdf[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('pdfs');
    if (stored) {
      setPdfs(JSON.parse(stored));
    }
  }, []);

  const splitPdf = async (pdf: SavedPdf) => {
    const byteArray = Uint8Array.from(atob(pdf.data.split(',')[1]), c => c.charCodeAt(0));
    const doc = await PDFDocument.load(byteArray);
    const totalPages = doc.getPageCount();
    for (let i = 0; i < totalPages; i++) {
      const newDoc = await PDFDocument.create();
      const [page] = await newDoc.copyPages(doc, [i]);
      newDoc.addPage(page);
      const newBytes = await newDoc.save();
      const blob = new Blob([newBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${pdf.name.replace(/\.pdf$/i, '')}-page-${i + 1}.pdf`;
      link.click();
      URL.revokeObjectURL(link.href);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">קבצי PDF</h1>
        <p className="text-gray-600 mt-2">ניהול קבצי PDF שהועלו</p>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">שם הקובץ</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">פעולות</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {pdfs.map(pdf => (
              <tr key={pdf.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{pdf.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button
                    onClick={() => splitPdf(pdf)}
                    className="inline-flex items-center space-x-1 space-x-reverse text-blue-600 hover:text-blue-900"
                  >
                    <Scissors className="h-4 w-4" />
                    <span>פצל עמודים</span>
                  </button>
                </td>
              </tr>
            ))}
            {pdfs.length === 0 && (
              <tr>
                <td colSpan={2} className="px-6 py-4 text-center text-sm text-gray-500">
                  אין קבצי PDF זמינים
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

