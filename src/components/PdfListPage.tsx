import React, { useEffect, useState, useRef } from 'react';
import { Scissors, FileSpreadsheet } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

interface SavedPdf {
  name: string;
  url: string;
}

interface SplitPdf {
  name: string;
  url: string;
}

export default function PdfListPage() {
  const [pdfs, setPdfs] = useState<SavedPdf[]>([]);
  const [splitPdfs, setSplitPdfs] = useState<SplitPdf[]>([]);
  const [assignPdf, setAssignPdf] = useState<string | null>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  const fetchPdfs = () => {
    fetch(`${API_URL}/pdfs`)
      .then(res => res.json())
      .then(data => setPdfs(data))
      .catch(err => console.error('Failed to fetch pdfs', err));
  };

  const fetchSplitPdfs = () => {
    fetch(`${API_URL}/split-pdfs`)
      .then(res => res.json())
      .then(data => setSplitPdfs(data))
      .catch(err => console.error('Failed to fetch split pdfs', err));
  };

  useEffect(() => {
    fetchPdfs();
    fetchSplitPdfs();
  }, []);

  const splitPdf = async (pdf: SavedPdf) => {
    await fetch(`${API_URL}/split-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: pdf.name }),
    });
    fetchSplitPdfs();
  };

  const assignFromExcel = (pdf: SavedPdf) => {
    setAssignPdf(pdf.name);
    excelInputRef.current?.click();
  };

  const onExcelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !assignPdf) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      await fetch(`${API_URL}/assign-pdfs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfName: assignPdf, excel: base64 }),
      });
      e.target.value = '';
      setAssignPdf(null);
      fetchSplitPdfs();
    };
    reader.readAsDataURL(file);
  };


  return (
    <div className="space-y-8">
      <input
        ref={excelInputRef}
        type="file"
        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        onChange={onExcelChange}
        className="hidden"
      />
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
              <tr key={pdf.url}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{pdf.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center space-x-4 space-x-reverse">
                    <button
                      onClick={() => splitPdf(pdf)}
                      className="inline-flex items-center space-x-1 space-x-reverse text-blue-600 hover:text-blue-900"
                    >
                      <Scissors className="h-4 w-4" />
                      <span>פצל עמודים</span>
                    </button>
                    <button
                      onClick={() => assignFromExcel(pdf)}
                      className="inline-flex items-center space-x-1 space-x-reverse text-green-600 hover:text-green-900"
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      <span>שיוך תורמים</span>
                    </button>
                  </div>
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

      <div>
        <h2 className="text-2xl font-bold text-gray-900">קבצים מפוצלים</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden mt-4">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">שם הקובץ</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">קישור</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {splitPdfs.map(pdf => (
                <tr key={pdf.url}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{pdf.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <a
                      href={`${API_URL}${pdf.url}`}
                      className="text-blue-600 hover:text-blue-900"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      הורדה
                    </a>
                  </td>
                </tr>
              ))}
              {splitPdfs.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-6 py-4 text-center text-sm text-gray-500">
                    אין קבצים מפוצלים
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

