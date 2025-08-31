import React, { useState } from 'react';
import { Download, Upload, RefreshCw, CheckCircle, AlertCircle, Calendar, FileText } from 'lucide-react';
import { TranzilaIntegrationService } from '../services/tranzilaIntegrationService';

interface TranzilaSyncProps {
  onSyncComplete?: (charges: any[]) => void;
}

export default function TranzilaSync({ onSyncComplete }: TranzilaSyncProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<{
    processed: number;
    created: number;
    errors: string[];
  } | null>(null);
  const [dateRange, setDateRange] = useState({
    from: new Date().toISOString().split('T')[0], // היום
    to: new Date().toISOString().split('T')[0]     // היום
  });

  const tranzilaService = TranzilaIntegrationService.getInstance();

  const handleGenerateReceipts = async () => {
    setIsLoading(true);
    setResults(null);

    try {
      const syncResults = await tranzilaService.generateMissingReceipts(
        dateRange.from,
        dateRange.to
      );
      setResults(syncResults);
    } catch (error) {
      console.error('Error generating receipts:', error);
      setResults({
        processed: 0,
        created: 0,
        errors: [`שגיאה: ${error}`]
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncTransactions = async () => {
    setIsLoading(true);

    try {
      const charges = await tranzilaService.syncTransactionsToLocal(
        dateRange.from,
        dateRange.to
      );
      
      if (onSyncComplete) {
        onSyncComplete(charges);
      }

      setResults({
        processed: charges.length,
        created: 0,
        errors: charges.length > 0 ? [] : ['לא נמצאו עסקאות חדשות']
      });
    } catch (error) {
      console.error('Error syncing transactions:', error);
      setResults({
        processed: 0,
        created: 0,
        errors: [`שגיאה בסנכרון: ${error}`]
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center space-x-3 space-x-reverse mb-6">
        <div className="bg-blue-100 rounded-full p-2">
          <RefreshCw className="h-5 w-5 text-blue-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">סנכרון עם טרנזילה</h2>
      </div>

      {/* Date Range Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <div className="flex items-center space-x-2 space-x-reverse">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span>מתאריך</span>
            </div>
          </label>
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <div className="flex items-center space-x-2 space-x-reverse">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span>עד תאריך</span>
            </div>
          </label>
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <button
          onClick={handleGenerateReceipts}
          disabled={isLoading}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-3 rounded-lg flex items-center justify-center space-x-2 space-x-reverse transition-colors"
        >
          {isLoading ? (
            <RefreshCw className="h-5 w-5 animate-spin" />
          ) : (
            <FileText className="h-5 w-5" />
          )}
          <span>צור קבלות חסרות</span>
        </button>

        <button
          onClick={handleSyncTransactions}
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-3 rounded-lg flex items-center justify-center space-x-2 space-x-reverse transition-colors"
        >
          {isLoading ? (
            <RefreshCw className="h-5 w-5 animate-spin" />
          ) : (
            <Download className="h-5 w-5" />
          )}
          <span>סנכרן עסקאות</span>
        </button>
      </div>

      {/* Results Display */}
      {results && (
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">תוצאות הסנכרון</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">עסקאות נבדקו</p>
                  <p className="text-2xl font-bold text-blue-900">{results.processed}</p>
                </div>
                <Upload className="h-8 w-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">קבלות נוצרו</p>
                  <p className="text-2xl font-bold text-green-900">{results.created}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>

            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600">שגיאות</p>
                  <p className="text-2xl font-bold text-red-900">{results.errors.length}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </div>
          </div>

          {/* Success Message */}
          {results.created > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <div className="flex items-center space-x-3 space-x-reverse">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <h4 className="font-medium text-green-900">הסנכרון הושלם בהצלחה!</h4>
                  <p className="text-sm text-green-700">
                    נוצרו {results.created} קבלות חדשות מתוך {results.processed} עסקאות שנבדקו.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Errors Display */}
          {results.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start space-x-3 space-x-reverse">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-900 mb-2">שגיאות שאירעו:</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {results.errors.map((error, index) => (
                      <li key={index} className="list-disc list-inside">
                        {error}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="bg-gray-50 rounded-lg p-4 mt-6">
        <h4 className="font-medium text-gray-900 mb-2">הוראות שימוש:</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li className="flex items-start space-x-2 space-x-reverse">
            <span className="text-blue-600">•</span>
            <span><strong>צור קבלות חסרות:</strong> בודק עסקאות בטרנזילה ויוצר קבלות לעסקאות שאין להן קבלה</span>
          </li>
          <li className="flex items-start space-x-2 space-x-reverse">
            <span className="text-blue-600">•</span>
            <span><strong>סנכרן עסקאות:</strong> מייבא עסקאות מטרנזילה למערכת המקומית</span>
          </li>
          <li className="flex items-start space-x-2 space-x-reverse">
            <span className="text-blue-600">•</span>
            <span>בחר טווח תאריכים מתאים לפני הפעלת הסנכרון</span>
          </li>
        </ul>
      </div>
    </div>
  );
}