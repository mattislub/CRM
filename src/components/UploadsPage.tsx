import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, FileText, X, CheckCircle, AlertCircle, Download } from 'lucide-react';
import axios from 'axios';

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

export default function UploadsPage() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
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
      if (fileType) {
        const newFile: UploadedFile = {
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          type: fileType,
          size: file.size,
          uploadDate: new Date(),
          status: 'uploading'
        };

        setUploadedFiles(prev => [...prev, newFile]);


        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          axios
            .post('/upload', { fileName: file.name, content: base64 })
            .then(res => {
              setUploadedFiles(prev =>
                prev.map(f =>
                  f.id === newFile.id
                    ? { ...f, status: 'success', url: res.data.url }
                    : f
                )
              );
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
        }
    });
  };

  const getFileType = (file: File): 'excel' | 'pdf' | null => {
    if (file.type.includes('sheet') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
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
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const removeFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploading':
        return <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return null;
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'excel':
        return <FileSpreadsheet className="h-8 w-8 text-green-600" />;
      case 'pdf':
        return <FileText className="h-8 w-8 text-red-600" />;
      default:
        return <FileText className="h-8 w-8 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">העלאת קבצים</h1>
        <p className="text-gray-600 mt-2">העלה קבצי Excel ו-PDF למערכת</p>
      </div>

      {/* Upload Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Excel Upload */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="text-center">
            <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <FileSpreadsheet className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">העלאת קובץ Excel</h3>
            <p className="text-gray-600 mb-4">העלה קבצי .xlsx או .xls</p>
            
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

        {/* PDF Upload */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="text-center">
            <div className="bg-red-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <FileText className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">העלאת קובץ PDF</h3>
            <p className="text-gray-600 mb-4">העלה קבצי PDF</p>
            
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
      </div>

      {/* Drag & Drop Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
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
        <p className="text-gray-600">או לחץ על הכפתורים למעלה לבחירת קבצים</p>
        <p className="text-sm text-gray-500 mt-2">נתמכים: Excel (.xlsx, .xls) ו-PDF (.pdf)</p>
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">קבצים שהועלו</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {uploadedFiles.map((file) => (
              <div key={file.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-4 space-x-reverse">
                  {getFileIcon(file.type)}
                  <div>
                    <h4 className="font-medium text-gray-900">{file.name}</h4>
                    <div className="flex items-center space-x-4 space-x-reverse text-sm text-gray-500">
                      <span>{formatFileSize(file.size)}</span>
                      <span>{file.uploadDate.toLocaleString('he-IL')}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        file.type === 'excel' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
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

      {/* Statistics */}
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
    </div>
  );
}