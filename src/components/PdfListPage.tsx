import React, { useEffect, useState } from 'react';
import { Scissors, Upload } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

interface SplitPdf {
  name: string;
  url: string;
}

interface SavedPdf {
  name: string;
  url: string;
  splitPdfs: SplitPdf[];
}

export default function PdfListPage() {
  const [pdfs, setPdfs] = useState<SavedPdf[]>([]);

  const fetchPdfs = () => {
    fetch(`${API_URL}/pdfs`)
      .then(res => res.json())
      .then(data => setPdfs(data))
      .catch(err => console.error('Failed to fetch pdfs', err));
  };

  useEffect(() => {
    fetchPdfs();
  }, []);

  const splitPdf = async (pdf: SavedPdf) => {
    await fetch(`${API_URL}/split-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: pdf.name }),
    });
    fetchPdfs();
  };

  const uploadExcel = (pdf: SavedPdf) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls';
    input.onchange = e => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async ev => {
          const base64 = (ev.target?.result as string).split(',')[1];
          await fetch(`${API_URL}/assign-excel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: pdf.name, content: base64 }),
          });
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
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
              <React.Fragment key={pdf.url}>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{pdf.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center space-x-4 space-x-reverse">
                        <button
                          onClick={() => splitPdf(pdf)}
                          disabled={pdf.splitPdfs.length > 0}
                          className={`inline-flex items-center space-x-1 space-x-reverse ${pdf.splitPdfs.length > 0 ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:text-blue-900'}`}
                        >
                          <Scissors className="h-4 w-4" />
                          <span>פצל עמודים</span>
                        </button>
                        <button
                          onClick={() => uploadExcel(pdf)}
                          disabled={pdf.splitPdfs.length === 0}
                          className={`inline-flex items-center space-x-1 space-x-reverse ${pdf.splitPdfs.length === 0 ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:text-blue-900'}`}
                        >
                          <Upload className="h-4 w-4" />
                          <span>שיוך מאקסל</span>
                        </button>
                      </div>
                    </td>
  
                </tr>
                {pdf.splitPdfs.length > 0 && (
                  <tr>
                    <td colSpan={2} className="px-6 py-4 bg-gray-50">
                      <ul className="list-disc pr-5 space-y-1">
                        {pdf.splitPdfs.map(p => (
                          <li key={p.url}>
                            <a
                              href={`${API_URL}${p.url}`}
                              className="text-blue-600 hover:text-blue-900"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {p.name}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                )}
              </React.Fragment>
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

