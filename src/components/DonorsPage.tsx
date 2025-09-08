import React, { useState } from 'react';
import { Users, Mail, Plus, Eye, Send, FileText, CheckCircle, X } from 'lucide-react';

interface Donation {
  id: string;
  amount: number;
  date: Date;
  description: string;
  pdfUrl?: string;
  emailSent: boolean;
  sentDate?: Date;
}

interface Donor {
  id: string;
  donorNumber: string;
  fullName: string;
  email: string;
  donations: Donation[];
  totalDonations: number;
}

export default function DonorsPage() {
  const [donors, setDonors] = useState<Donor[]>([
    {
      id: '1',
      donorNumber: '001',
      fullName: 'יוסי כהן',
      email: 'yossi@example.com',
      donations: [
        {
          id: 'd1',
          amount: 500,
          date: new Date('2024-01-15'),
          description: 'תרומה חודשית',
          pdfUrl: '/donations/d1.pdf',
          emailSent: true,
          sentDate: new Date('2024-01-15')
        },
        {
          id: 'd2',
          amount: 1000,
          date: new Date('2024-02-15'),
          description: 'תרומה מיוחדת',
          pdfUrl: '/donations/d2.pdf',
          emailSent: false
        }
      ],
      totalDonations: 1500
    },
    {
      id: '2',
      donorNumber: '002',
      fullName: 'שרה לוי',
      email: 'sarah@example.com',
      donations: [
        {
          id: 'd3',
          amount: 300,
          date: new Date('2024-01-20'),
          description: 'תרומה רגילה',
          pdfUrl: '/donations/d3.pdf',
          emailSent: true,
          sentDate: new Date('2024-01-20')
        }
      ],
      totalDonations: 300
    }
  ]);

  const [selectedDonor, setSelectedDonor] = useState<Donor | null>(null);
  const [showAddDonor, setShowAddDonor] = useState(false);
  const [newDonor, setNewDonor] = useState({
    donorNumber: '',
    fullName: '',
    email: ''
  });

  const handleAddDonor = () => {
    if (newDonor.donorNumber && newDonor.fullName && newDonor.email) {
      const donor: Donor = {
        id: Math.random().toString(36).substr(2, 9),
        donorNumber: newDonor.donorNumber,
        fullName: newDonor.fullName,
        email: newDonor.email,
        donations: [],
        totalDonations: 0
      };
      
      setDonors(prev => [...prev, donor]);
      setNewDonor({ donorNumber: '', fullName: '', email: '' });
      setShowAddDonor(false);
    }
  };

  const handleSendEmail = async (donorId: string, donationId: string) => {
    const donor = donors.find(d => d.id === donorId);
    const donation = donor?.donations.find(d => d.id === donationId);
    if (!donor || !donation) return;
    try {
      await fetch('/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: donor.email,
          subject: 'אישור תרומה',
          text: `תודה על תרומתך בסך ${formatCurrency(donation.amount)}`
        })
      });
      setDonors(prev =>
        prev.map(d =>
          d.id === donorId
            ? {
                ...d,
                donations: d.donations.map(dd =>
                  dd.id === donationId
                    ? { ...dd, emailSent: true, sentDate: new Date() }
                    : dd
                )
              }
            : d
        )
      );
    } catch (err) {
      console.error('Failed to send email', err);
    }
  };

  // Future enhancements: add bulk email operations if required.

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS'
    }).format(amount);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">רשימת תורמים</h1>
          <p className="text-gray-600 mt-2">ניהול תורמים ותרומות</p>
        </div>
        
        <button
          onClick={() => setShowAddDonor(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 space-x-reverse transition-colors"
        >
          <Plus className="h-5 w-5" />
          <span>הוסף תורם חדש</span>
        </button>
      </div>

      {/* Add Donor Modal */}
      {showAddDonor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">הוסף תורם חדש</h3>
              <button
                onClick={() => setShowAddDonor(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  מספר תורם
                </label>
                <input
                  type="text"
                  value={newDonor.donorNumber}
                  onChange={(e) => setNewDonor(prev => ({ ...prev, donorNumber: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="הכנס מספר תורם"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  שם מלא
                </label>
                <input
                  type="text"
                  value={newDonor.fullName}
                  onChange={(e) => setNewDonor(prev => ({ ...prev, fullName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="הכנס שם מלא"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  כתובת מייל
                </label>
                <input
                  type="email"
                  value={newDonor.email}
                  onChange={(e) => setNewDonor(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="הכנס כתובת מייל"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 space-x-reverse mt-6">
              <button
                onClick={() => setShowAddDonor(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                ביטול
              </button>
              <button
                onClick={handleAddDonor}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
              >
                הוסף תורם
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">סה"כ תורמים</p>
              <p className="text-3xl font-bold text-gray-900">{donors.length}</p>
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">סה"כ תרומות</p>
              <p className="text-3xl font-bold text-green-900">
                {formatCurrency(donors.reduce((sum, donor) => sum + donor.totalDonations, 0))}
              </p>
            </div>
            <FileText className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">מיילים שנשלחו</p>
              <p className="text-3xl font-bold text-purple-900">
                {donors.reduce((sum, donor) => 
                  sum + donor.donations.filter(d => d.emailSent).length, 0
                )}
              </p>
            </div>
            <Mail className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Donors List */}
      <div className="bg-white rounded-lg shadow-lg">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">רשימת תורמים</h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {donors.map((donor) => (
            <div key={donor.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 space-x-reverse">
                  <div className="bg-blue-100 rounded-full p-3">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{donor.fullName}</h4>
                    <div className="flex items-center space-x-4 space-x-reverse text-sm text-gray-500">
                      <span>מספר תורם: {donor.donorNumber}</span>
                      <span className="flex items-center space-x-1 space-x-reverse">
                        <Mail className="h-4 w-4" />
                        <span>{donor.email}</span>
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      סה"כ תרומות: {formatCurrency(donor.totalDonations)} | 
                      {donor.donations.length} תרומות
                      {donor.donations.filter(d => !d.emailSent).length > 0 && (
                        <span className="text-orange-600 mr-2">
                          | {donor.donations.filter(d => !d.emailSent).length} ממתינות לשליחה
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 space-x-reverse">
                  <button
                    onClick={() => setSelectedDonor(selectedDonor?.id === donor.id ? null : donor)}
                    className="flex items-center space-x-2 space-x-reverse px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                    <span>צפה בתרומות</span>
                  </button>
                </div>
              </div>
              
              {selectedDonor?.id === donor.id && (
                <div className="mt-4 bg-gray-50 rounded-lg p-4">
                  <h5 className="font-medium text-gray-900 mb-3">תרומות של {donor.fullName}</h5>
                  <div className="space-y-3">
                    {donor.donations.map((donation) => (
                      <div key={donation.id} className="bg-white rounded-lg p-4 flex items-center justify-between">
                        <div className="flex items-center space-x-3 space-x-reverse">
                          <FileText className="h-5 w-5 text-gray-400" />
                          <div>
                            <div className="font-medium text-gray-900">
                              {formatCurrency(donation.amount)}
                            </div>
                            <div className="text-sm text-gray-500">
                              {donation.date.toLocaleDateString('he-IL')} | {donation.description}
                            </div>
                            {donation.emailSent && donation.sentDate && (
                              <div className="text-xs text-green-600 flex items-center space-x-1 space-x-reverse mt-1">
                                <CheckCircle className="h-3 w-3" />
                                <span>נשלח ב-{donation.sentDate.toLocaleDateString('he-IL')}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 space-x-reverse">
                          {donation.emailSent ? (
                            <div className="flex items-center space-x-1 space-x-reverse text-green-600">
                              <CheckCircle className="h-4 w-4" />
                              <span className="text-sm">נשלח</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleSendEmail(donor.id, donation.id)}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center space-x-1 space-x-reverse transition-colors"
                            >
                              <Send className="h-3 w-3" />
                              <span>שלח מייל</span>
                            </button>
                          )}
                          
                          {donation.pdfUrl && (
                            <button
                              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm flex items-center space-x-1 space-x-reverse transition-colors"
                              title="הורד PDF"
                            >
                              <FileText className="h-3 w-3" />
                              <span>PDF</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}