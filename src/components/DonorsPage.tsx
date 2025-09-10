import React, { useState, useEffect } from 'react';
import { Users, Mail, Plus, Eye, Send, FileText, CheckCircle, X } from 'lucide-react';

// Use an environment variable so API calls work when the app is served statically
const API_URL = import.meta.env.VITE_API_URL || '';

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
  const [donors, setDonors] = useState<Donor[]>([]);

  const [selectedDonor, setSelectedDonor] = useState<Donor | null>(null);
  const [showAddDonor, setShowAddDonor] = useState(false);
  const [newDonor, setNewDonor] = useState({
    donorNumber: '',
    fullName: '',
    email: ''
  });

  const [showAddDonation, setShowAddDonation] = useState<Donor | null>(null);
  const [newDonation, setNewDonation] = useState({
    amount: '',
    date: '',
    description: '',
    file: null as File | null
  });

 const [searchTerm, setSearchTerm] = useState('');
  const [minTotal, setMinTotal] = useState('');
  const [maxTotal, setMaxTotal] = useState('');
  const [onlyPending, setOnlyPending] = useState(false);
  const [sendingDonationId, setSendingDonationId] = useState<string | null>(null);
  const [sendingAll, setSendingAll] = useState(false);


  useEffect(() => {
    fetch(`${API_URL}/donors`)
      .then(res => res.json())
      .then(data => {
        const loaded = data.map((d: any) => ({
          ...d,
          donations: d.donations.map((dn: any) => ({
            ...dn,
            date: new Date(dn.date),
            sentDate: dn.sentDate ? new Date(dn.sentDate) : undefined,
          }))
        }));
        setDonors(loaded);
      })
      .catch(err => {
        console.error('Failed to load donors', err);
      });
  }, []);

  const handleAddDonor = async () => {
    if (newDonor.donorNumber && newDonor.fullName && newDonor.email) {
      try {
        const res = await fetch(`${API_URL}/donors`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newDonor)
        });
        const donor = await res.json();
        setDonors(prev => [...prev, { ...donor, donations: donor.donations || [] }]);
        setNewDonor({ donorNumber: '', fullName: '', email: '' });
        setShowAddDonor(false);
      } catch (err) {
        console.error('Failed to add donor', err);
      }
    }
  };

  const handleSendEmail = async (donorId: string, donationId: string) => {
    const donor = donors.find(d => d.id === donorId);
    const donation = donor?.donations.find(d => d.id === donationId);
    if (!donor || !donation) return;
    setSendingDonationId(donationId);
    try {
      await fetch(`${API_URL}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: donor.email,
          subject: 'תודה על התרומה שלך',
          text:
            'שלום,\nמצורף הקבלה שלכם על התרומה שלכם.\nהתרומה שלכם מוכרת לפי סעיף 46.\n\nבברכה,\nצדקה עניי ישראל ובני ירושלים',
          html:
            '<p>שלום,</p><p>מצורף הקבלה שלכם על התרומה שלכם.</p><p>התרומה שלכם מוכרת לפי סעיף 46.</p><p>בברכה,<br/>צדקה עניי ישראל ובני ירושלים</p>',
          donationId,
          pdfUrl: donation.pdfUrl
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
    } finally {
      setSendingDonationId(null);
    }
  };

  const handleSendAllPendingEmails = async () => {
    setSendingAll(true);
    try {
      for (const donor of donors) {
        for (const donation of donor.donations) {
          if (!donation.emailSent) {
            await handleSendEmail(donor.id, donation.id);
          }
        }
      }
    } finally {
      setSendingAll(false);
    }
  };

  const fileToBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleAddDonation = async () => {
    if (!showAddDonation) return;
    if (!newDonation.amount || !newDonation.date || !newDonation.description) return;
    try {
      let pdfUrl: string | undefined;
      if (newDonation.file) {
        const content = await fileToBase64(newDonation.file);
        console.log('Uploading to', `${API_URL}/upload`);
        const uploadRes = await fetch(`${API_URL}/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: newDonation.file.name, content })
        });
        const uploadData = await uploadRes.json();
        pdfUrl = uploadData.url;
      }
      const res = await fetch(`${API_URL}/donations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          donorId: showAddDonation.id,
          amount: parseFloat(newDonation.amount),
          date: newDonation.date,
          description: newDonation.description,
          pdfUrl
        })
      });
      const data = await res.json();
      setDonors(prev =>
        prev.map(d =>
          d.id === showAddDonation.id
            ? {
                ...d,
                donations: [
                  ...d.donations,
                  {
                    ...data,
                    date: new Date(data.date),
                    sentDate: data.sentDate ? new Date(data.sentDate) : undefined
                  }
                ],
                totalDonations: d.totalDonations + data.amount
              }
            : d
        )
      );
      setShowAddDonation(null);
      setNewDonation({ amount: '', date: '', description: '', file: null });
    } catch (err) {
      console.error('Failed to add donation', err);
    }
  };

  const renderSendButton = (donation: Donation, donorId: string) => {
    const isSending = sendingDonationId === donation.id;
    return (
      <button
        onClick={() => handleSendEmail(donorId, donation.id)}
        disabled={isSending}
        className={`bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center space-x-1 space-x-reverse transition active:scale-95 ${isSending ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {isSending ? (
          <span>מעבד...</span>
        ) : (
          <>
            <Send className="h-3 w-3" />
            <span>{donation.emailSent ? 'שלח שוב' : 'שלח מייל'}</span>
          </>
        )}
      </button>
    );
  };

  const hasPendingEmails = donors.some(donor =>
    donor.donations.some(donation => !donation.emailSent)
  );

  const filteredDonors = donors.filter(donor => {
    const term = searchTerm.toLowerCase();
    if (term) {
      const matches =
        donor.fullName.toLowerCase().includes(term) ||
        donor.email.toLowerCase().includes(term) ||
        donor.donorNumber.toLowerCase().includes(term);
      if (!matches) return false;
    }
    if (minTotal && donor.totalDonations < parseFloat(minTotal)) return false;
    if (maxTotal && donor.totalDonations > parseFloat(maxTotal)) return false;
    if (onlyPending && !donor.donations.some(d => !d.emailSent)) return false;
    return true;
  });

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

        <div className="flex items-center space-x-3 space-x-reverse">
          <button
            onClick={handleSendAllPendingEmails}
            disabled={!hasPendingEmails || sendingAll}
            className={`bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 space-x-reverse transition active:scale-95 ${(!hasPendingEmails || sendingAll) ? 'opacity-50 cursor-not-allowed hover:bg-green-600' : ''}`}
          >
            {sendingAll ? (
              <span>מעבד...</span>
            ) : (
              <>
                <Send className="h-5 w-5" />
                <span>שלח כל הקבלות שעדיין לא נשלחו</span>
              </>
            )}
          </button>
          <button
            onClick={() => setShowAddDonor(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 space-x-reverse transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span>הוסף תורם חדש</span>
          </button>
        </div>
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

      {/* Add Donation Modal */}
      {showAddDonation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">הוסף תרומה חדשה</h3>
              <button
                onClick={() => setShowAddDonation(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  סכום
                </label>
                <input
                  type="number"
                  value={newDonation.amount}
                  onChange={(e) => setNewDonation(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="הכנס סכום"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  תאריך
                </label>
                <input
                  type="date"
                  value={newDonation.date}
                  onChange={(e) => setNewDonation(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  תיאור
                </label>
                <input
                  type="text"
                  value={newDonation.description}
                  onChange={(e) => setNewDonation(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="הכנס תיאור"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  קובץ PDF
                </label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) =>
                    setNewDonation(prev => ({
                      ...prev,
                      file: e.target.files ? e.target.files[0] : null,
                    }))
                  }
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 space-x-reverse mt-6">
              <button
                onClick={() => setShowAddDonation(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                ביטול
              </button>
              <button
                onClick={handleAddDonation}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
              >
                הוסף תרומה
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
        <div className="px-6 py-4 border-b space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">רשימת תורמים</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">חיפוש</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="חפש לפי שם, מייל או מספר תורם"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">סה"כ מינימלי</label>
              <input
                type="number"
                value={minTotal}
                onChange={(e) => setMinTotal(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">סה"כ מקסימלי</label>
              <input
                type="number"
                value={maxTotal}
                onChange={(e) => setMaxTotal(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center mt-6 md:mt-0">
              <input
                id="pending"
                type="checkbox"
                checked={onlyPending}
                onChange={(e) => setOnlyPending(e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <label htmlFor="pending" className="mr-2 text-sm text-gray-700">
                רק עם מיילים בהמתנה
              </label>
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredDonors.map((donor) => (
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
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="font-medium text-gray-900">תרומות של {donor.fullName}</h5>
                    <button
                      onClick={() => setShowAddDonation(donor)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                    >
                      הוסף תרומה
                    </button>
                  </div>
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
                  {donation.pdfUrl && (
                    <a
                      href={`${API_URL}${donation.pdfUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-16 h-16 border rounded overflow-hidden"
                      title="צפה ב-PDF"
                    >
                      <iframe
                        src={`${API_URL}${donation.pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                        className="w-full h-full pointer-events-none"
                        title="PDF Preview"
                      />
                    </a>
                  )}

                  {donation.emailSent && (
                    <div className="flex items-center space-x-1 space-x-reverse text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm">נשלח</span>
                    </div>
                  )}

                  {renderSendButton(donation, donor.id)}
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
