import React, { useEffect, useRef, useState } from 'react';
import {
  Scissors,
  Upload,
  List,
  CheckCircle,
  FileSpreadsheet,
  FileText,
  X,
  AlertCircle,
  Download,
} from 'lucide-react';
import * as XLSX from 'xlsx';

const API_URL = import.meta.env.VITE_API_URL || '';

interface SplitPdf {
  name: string;
  url: string;
}

interface SavedPdf {
  name: string;
  url: string;
  splitPdfs: SplitPdf[];
  excelAssigned?: boolean;
  assignments?: Assignment[];
  showAssignments?: boolean;
}

interface Assignment {
  donorNumber: string;
  fullName: string;
  amount: number;
  donationDate: string;
  fundNumber?: string | null;
}

interface UploadedFile {
  id: string;
  name: string;
  type: 'excel' | 'pdf';
  size: number;
  uploadDate: Date;
  status: 'uploading' | 'success' | 'error';
  errorMessage?: string;
  url?: string;
}

type ColumnKey = 'donorNumber' | 'fullName' | 'amount' | 'description' | 'date' | 'fundNumber';

interface HeaderOption {
  raw: string;
  display: string;
}

interface MappingModalState {
  pdf: SavedPdf;
  base64: string;
  headers: HeaderOption[];
  previewRows: string[][];
}

type ColumnMapping = Record<ColumnKey, number | null>;

const columnLabels: Record<ColumnKey, string> = {
  donorNumber: 'מספר תורם',
  fullName: 'שם התורם',
  amount: 'סכום התרומה',
  description: 'תיאור / ייעוד',
  date: 'תאריך התרומה',
  fundNumber: 'מספר קרן',
};

const createEmptyMapping = (): ColumnMapping => ({
  donorNumber: null,
  fullName: null,
  amount: null,
  description: null,
  date: null,
  fundNumber: null,
});

const formatPreviewValue = (value: unknown): string => {
  if (value == null) {
    return '';
  }
  if (value instanceof Date) {
    return value.toLocaleDateString('he-IL');
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value.toString() : '';
  }
  if (typeof value === 'boolean') {
    return value ? 'כן' : 'לא';
  }
  return value.toString();
};

const inferColumnMapping = (headers: HeaderOption[]): ColumnMapping => {
  const mapping = createEmptyMapping();

  headers.forEach((header, index) => {
    const normalized = header.raw.replace(/[\s_-]/g, '').toLowerCase();
    if (!normalized) {
      return;
    }

    if (
      mapping.donorNumber == null &&
      (normalized.includes('מספרתורם') ||
        (normalized.includes('מספר') && normalized.includes('תורם')) ||
        normalized.includes('donornumber') ||
        normalized === 'id')
    ) {
      mapping.donorNumber = index;
      return;
    }

    if (
      mapping.fullName == null &&
      ((normalized.includes('שם') && !normalized.includes('קרן')) || normalized.includes('name'))
    ) {
      mapping.fullName = index;
      return;
    }

    if (
      mapping.amount == null &&
      (normalized.includes('סכום') || normalized.includes('amount') || normalized.includes('sum'))
    ) {
      mapping.amount = index;
      return;
    }

    if (
      mapping.description == null &&
      (normalized.includes('תיאור') ||
        normalized.includes('ייעוד') ||
        normalized.includes('description') ||
        normalized.includes('purpose') ||
        normalized.includes('הערה') ||
        normalized.includes('note'))
    ) {
      mapping.description = index;
      return;
    }

    if (mapping.date == null && (normalized.includes('תאריך') || normalized.includes('date'))) {
      mapping.date = index;
      return;
    }

    if (
      mapping.fundNumber == null &&
      (normalized.includes('קרן') || normalized.includes('fund') || normalized.includes('מסקרן'))
    ) {
      mapping.fundNumber = index;
    }
  });

  return mapping;
};

export default function PdfListPage() {
  const [pdfs, setPdfs] = useState<SavedPdf[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [mappingModal, setMappingModal] = useState<MappingModalState | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>(createEmptyMapping);
  const [mappingError, setMappingError] = useState<string | null>(null);
  const [assigningExcel, setAssigningExcel] = useState(false);

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
        reader.onload = ev => {
          const result = ev.target?.result;
          if (typeof result !== 'string') {
            setMappingError('אירעה שגיאה בטעינת הקובץ. נסו שוב.');
            setMappingModal({ pdf, base64: '', headers: [], previewRows: [] });
            setColumnMapping(createEmptyMapping());
            return;
          }

          const base64 = result.split(',')[1];

          try {
            const workbook = XLSX.read(base64, { type: 'base64' });
            if (workbook.SheetNames.length === 0) {
              setMappingError('הקובץ לא מכיל גיליונות נתונים.');
              setMappingModal({ pdf, base64: '', headers: [], previewRows: [] });
              setColumnMapping(createEmptyMapping());
              return;
            }

            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            if (!sheet) {
              setMappingError('לא נמצא גיליון נתונים בקובץ.');
              setMappingModal({ pdf, base64: '', headers: [], previewRows: [] });
              setColumnMapping(createEmptyMapping());
              return;
            }

            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as Array<Array<unknown>>;
            const columnCount = rows.reduce((max, row) => Math.max(max, row.length), 0);

            if (columnCount === 0) {
              setMappingError('הקובץ לא מכיל עמודות נתונים.');
              setMappingModal({ pdf, base64: '', headers: [], previewRows: [] });
              setColumnMapping(createEmptyMapping());
              return;
            }

            const headerRow = rows[0] || [];
            const dataRows = rows.slice(1);

            const headers: HeaderOption[] = Array.from({ length: columnCount }, (_, index) => {
              const rawValue = headerRow[index];
              const raw = rawValue == null ? '' : rawValue.toString().trim();
              const display = raw || `עמודה ${index + 1}`;
              return { raw, display };
            });

            const previewRows = dataRows.slice(0, 5).map(row =>
              Array.from({ length: columnCount }, (_, colIndex) => formatPreviewValue(row[colIndex]))
            );

            setColumnMapping(inferColumnMapping(headers));
            setMappingModal({ pdf, base64, headers, previewRows });
            setMappingError(null);
          } catch (err) {
            console.error('Failed to parse Excel file', err);
            setMappingError('אירעה שגיאה בקריאת הקובץ. ודאו כי הקובץ בפורמט Excel תקין.');
            setMappingModal({ pdf, base64: '', headers: [], previewRows: [] });
            setColumnMapping(createEmptyMapping());
          }
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const closeMappingModal = () => {
    setMappingModal(null);
    setColumnMapping(createEmptyMapping());
    setMappingError(null);
    setAssigningExcel(false);
  };

  const handleConfirmMapping = async () => {
    if (!mappingModal || !mappingModal.base64) {
      return;
    }

    if (columnMapping.donorNumber == null) {
      setMappingError('בחרו עמודה עבור מספר התורם.');
      return;
    }

    if (columnMapping.amount == null) {
      setMappingError('בחרו עמודה עבור סכום התרומה.');
      return;
    }

    setAssigningExcel(true);
    setMappingError(null);

    try {
      const payloadMapping = Object.fromEntries(
        (Object.entries(columnMapping) as Array<[ColumnKey, number | null]>)
          .filter(([, value]) => value != null)
          .map(([key, value]) => [key, value])
      );

      const res = await fetch(`${API_URL}/assign-excel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: mappingModal.pdf.name,
          content: mappingModal.base64,
          mapping: payloadMapping,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setPdfs(prev =>
          prev.map(p =>
            p.name === mappingModal.pdf.name
              ? {
                  ...p,
                  excelAssigned: true,
                  assignments: data.assignments,
                  showAssignments: true,
                }
              : p
          )
        );
        closeMappingModal();
      } else {
        setMappingError(data.message || 'אירעה שגיאה בעת שיוך הקובץ.');
      }
    } catch (err) {
      console.error('Failed to assign excel', err);
      setMappingError('אירעה שגיאה בעת שיוך הקובץ.');
    } finally {
      setAssigningExcel(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (files: File[]) => {
    files.forEach(file => {
      const fileType = getFileType(file);
      if (!fileType) {
        return;
      }

      const newFile: UploadedFile = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        type: fileType,
        size: file.size,
        uploadDate: new Date(),
        status: 'uploading',
      };

      setUploadedFiles(prev => [...prev, newFile]);

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        fetch(`${API_URL}/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: file.name, content: base64 }),
        })
          .then(res => res.json())
          .then(data => {
            setUploadedFiles(prev =>
              prev.map(f =>
                f.id === newFile.id
                  ? { ...f, status: 'success', url: data.url }
                  : f
              )
            );
            if (fileType === 'pdf') {
              fetchPdfs();
            }
          })
          .catch(() => {
            setUploadedFiles(prev =>
              prev.map(f =>
                f.id === newFile.id
                  ? { ...f, status: 'error', errorMessage: 'שגיאה בהעלאת הקובץ' }
                  : f
              )
            );
          });
      };
      reader.onerror = () => {
        setUploadedFiles(prev =>
          prev.map(f =>
            f.id === newFile.id
              ? { ...f, status: 'error', errorMessage: 'שגיאה בהעלאת הקובץ' }
              : f
          )
        );
      };
      reader.readAsDataURL(file);
    });
  };

  const getFileType = (file: File): 'excel' | 'pdf' | null => {
    if (
      file.type.includes('sheet') ||
      file.name.endsWith('.xlsx') ||
      file.name.endsWith('.xls')
    ) {
      return 'excel';
    }
    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      return 'pdf';
    }
    return null;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const removeFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'uploading':
        return (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
        );
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return null;
    }
  };

  const getFileIcon = (type: UploadedFile['type']) => {
    switch (type) {
      case 'excel':
        return <FileSpreadsheet className="h-8 w-8 text-green-600" />;
      case 'pdf':
        return <FileText className="h-8 w-8 text-red-600" />;
      default:
        return <FileText className="h-8 w-8 text-gray-600" />;
    }
  };

  const toggleAssignments = (pdf: SavedPdf) => {
    setPdfs(prev =>
      prev.map(p =>
        p.name === pdf.name ? { ...p, showAssignments: !p.showAssignments } : p
      )
    );
  };

  const columnKeys: ColumnKey[] = ['donorNumber', 'fullName', 'amount', 'description', 'date', 'fundNumber'];
  const confirmDisabled =
    assigningExcel ||
    !mappingModal ||
    !mappingModal.base64 ||
    mappingModal.headers.length === 0 ||
    columnMapping.donorNumber == null ||
    columnMapping.amount == null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">קבצי PDF</h1>
        <p className="text-gray-600 mt-2">העלה ונהל קבצי PDF במערכת</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="text-center">
            <div className="bg-red-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <FileText className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">העלאת קובץ PDF</h3>
            <p className="text-gray-600 mb-4">העלה קבצי PDF חדשים</p>

            <button
              onClick={() => pdfInputRef.current?.click()}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 space-x-reverse mx-auto transition-colors"
            >
              <Upload className="h-5 w-5" />
              <span>בחר קובץ PDF</span>
            </button>

            <input
              ref={pdfInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileInput}
              className="hidden"
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="text-center">
            <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <FileSpreadsheet className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">העלאת קובץ Excel</h3>
            <p className="text-gray-600 mb-4">העלה קבצי Excel לשימוש עתידי</p>

            <button
              onClick={() => excelInputRef.current?.click()}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 space-x-reverse mx-auto transition-colors"
            >
              <Upload className="h-5 w-5" />
              <span>בחר קובץ Excel</span>
            </button>

            <input
              ref={excelInputRef}
              type="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              onChange={handleFileInput}
              className="hidden"
            />
          </div>
        </div>
      </div>

      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="bg-gray-100 rounded-full p-6 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
          <Upload className="h-10 w-10 text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">גרור וזרוק קבצים כאן</h3>
        <p className="text-gray-600">או השתמש בכפתורים למעלה לבחירת קבצים</p>
        <p className="text-sm text-gray-500 mt-2">נתמכים: Excel (.xlsx, .xls) ו-PDF (.pdf)</p>
      </div>

      {uploadedFiles.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">קבצים שהועלו</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {uploadedFiles.map(file => (
              <div key={file.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-4 space-x-reverse">
                  {getFileIcon(file.type)}
                  <div>
                    <h4 className="font-medium text-gray-900">{file.name}</h4>
                    <div className="flex items-center space-x-4 space-x-reverse text-sm text-gray-500">
                      <span>{formatFileSize(file.size)}</span>
                      <span>{file.uploadDate.toLocaleString('he-IL')}</span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          file.type === 'excel'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {file.type === 'excel' ? 'Excel' : 'PDF'}
                      </span>
                    </div>
                    {file.status === 'error' && file.errorMessage && (
                      <p className="text-sm text-red-600 mt-1">{file.errorMessage}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-3 space-x-reverse">
                  {getStatusIcon(file.status)}

                  {file.status === 'success' && file.url && (
                    <a
                      href={file.url}
                      download
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      title="הורד קובץ"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  )}

                  <button
                    onClick={() => removeFile(file.id)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    title="הסר קובץ"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {uploadedFiles.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">סה"כ קבצים</p>
                <p className="text-3xl font-bold text-gray-900">{uploadedFiles.length}</p>
              </div>
              <Upload className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">הועלו בהצלחה</p>
                <p className="text-3xl font-bold text-green-900">
                  {uploadedFiles.filter(f => f.status === 'success').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">שגיאות</p>
                <p className="text-3xl font-bold text-red-900">
                  {uploadedFiles.filter(f => f.status === 'error').length}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </div>
        </div>
      )}

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
                        className={`inline-flex items-center space-x-1 space-x-reverse ${
                          pdf.splitPdfs.length > 0
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-blue-600 hover:text-blue-900'
                        }`}
                      >
                        <Scissors className="h-4 w-4" />
                        <span>פצל עמודים</span>
                      </button>
                      <button
                        onClick={() => uploadExcel(pdf)}
                        disabled={pdf.splitPdfs.length === 0 || pdf.excelAssigned}
                        className={`inline-flex items-center space-x-1 space-x-reverse ${
                          pdf.splitPdfs.length === 0 || pdf.excelAssigned
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-blue-600 hover:text-blue-900'
                        }`}
                      >
                        <Upload className="h-4 w-4" />
                        <span>שיוך מאקסל</span>
                      </button>
                      {pdf.excelAssigned && <CheckCircle className="h-4 w-4 text-green-600" />}
                      {pdf.excelAssigned && (
                        <button
                          onClick={() => toggleAssignments(pdf)}
                          className="inline-flex items-center space-x-1 space-x-reverse text-blue-600 hover:text-blue-900"
                        >
                          <List className="h-4 w-4" />
                          <span>הצג רשימה</span>
                        </button>
                      )}
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
                {pdf.showAssignments && pdf.assignments && pdf.assignments.length > 0 && (
                  <tr>
                    <td colSpan={2} className="px-6 py-4 bg-gray-50">
                      <ul className="list-disc pr-5 space-y-1">
                        {pdf.assignments.map((a, idx) => (
                          <li key={idx}>
                            {`${a.donorNumber} - ${a.fullName} - ${a.amount} - ${new Date(
                              a.donationDate
                            ).toLocaleDateString('he-IL')}`}
                            {a.fundNumber ? ` - קרן ${a.fundNumber}` : ''}
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

      {mappingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-3xl rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">שיוך עמודות לקובץ תרומות</h2>
                <p className="mt-1 text-sm text-gray-600">
                  התאימו בין עמודות הקובץ לשדות התרומה הרצויים. עמודות שלא תבחרו לא ייובאו.
                </p>
              </div>
              <button
                type="button"
                onClick={closeMappingModal}
                className="text-gray-400 transition-colors hover:text-gray-600"
                aria-label="סגור חלון שיוך עמודות"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {mappingModal.headers.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {columnKeys.map(key => (
                  <div key={key}>
                    <label className="mb-1 block text-sm font-medium text-gray-700">{columnLabels[key]}</label>
                    <select
                      value={columnMapping[key] ?? 'none'}
                      onChange={event => {
                        const value = event.target.value;
                        setColumnMapping(prev => ({
                          ...prev,
                          [key]: value === 'none' ? null : Number.parseInt(value, 10),
                        }));
                      }}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      <option value="none">ללא שיוך</option>
                      {mappingModal.headers.map((header, index) => (
                        <option key={`${header.display}-${index}`} value={index}>
                          {header.display}
                        </option>
                      ))}
                    </select>
                    {key === 'donorNumber' && (
                      <p className="mt-1 text-xs text-gray-500">חובה לבחור עמודה זו כדי לשייך לתורמים קיימים.</p>
                    )}
                    {key === 'amount' && (
                      <p className="mt-1 text-xs text-gray-500">חובה לבחור עמודה זו כדי לקלוט את סכום התרומה.</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                {mappingError || 'לא נמצאו עמודות נתונים בקובץ. סגרו חלון זה ונסו להעלות קובץ אחר.'}
              </div>
            )}

            {mappingModal.headers.length > 0 && mappingModal.previewRows.length > 0 && (
              <div className="mt-6">
                <h3 className="mb-2 text-sm font-semibold text-gray-700">תצוגה מקדימה של חמש השורות הראשונות</h3>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200 text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        {mappingModal.headers.map((header, index) => (
                          <th key={index} className="px-3 py-2 text-right font-medium text-gray-600">
                            {header.display}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {mappingModal.previewRows.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {mappingModal.headers.map((_, colIndex) => (
                            <td key={colIndex} className="px-3 py-2 text-gray-700">
                              {row[colIndex] ?? ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {mappingError && mappingModal.headers.length > 0 && (
              <p className="mt-4 text-sm text-red-600">{mappingError}</p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeMappingModal}
                className="rounded-full px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-800"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={handleConfirmMapping}
                disabled={confirmDisabled}
                className={`rounded-full px-4 py-2 text-sm font-medium text-white transition-colors ${
                  confirmDisabled ? 'cursor-not-allowed bg-blue-300' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {assigningExcel ? 'משייך...' : 'בצע שיוך'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
