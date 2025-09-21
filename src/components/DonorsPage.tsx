import React, { useState, useEffect, useRef } from 'react';
import { Users, Mail, Plus, Eye, Send, FileText, CheckCircle, X, Upload, Pencil } from 'lucide-react';
import { HDate } from '@hebcal/core';


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
  hebrewDate?: string;
  sentHebrewDate?: string;
}

type DonorNameEntry =
  | string
  | {
      id?: string | number;
      name: string;
      relation?: string;
      notes?: string;
      hebrewDate?: string;
      gregorianDate?: string;
      date?: string;
      createdAt?: string;
    };

interface Donor {
  id: string;
  donorNumber: string;
  fullName: string;
  email: string;
  donations: Donation[];
  totalDonations: number;
  prayerNames?: DonorNameEntry[];
  yahrzeitNames?: DonorNameEntry[];
}

export default function DonorsPage() {
  const SENDER_OPTIONS = [
    { senderName: 'צדקת עניי ארץ ישראל', label: 'שלח מייל בשם צדקת עניי ארץ ישראל' },
    { senderName: 'בני ירושלים', label: 'שלח מייל בשם בני ירושלים' }
  ] as const;
  type SenderOption = (typeof SENDER_OPTIONS)[number]['senderName'];

  const [donors, setDonors] = useState<Donor[]>([]);

  const [selectedDonor, setSelectedDonor] = useState<Donor | null>(null);
  const [showAddDonor, setShowAddDonor] = useState(false);
  const [newDonor, setNewDonor] = useState({
    donorNumber: '',
    fullName: '',
    email: ''
  });
  const [addDonorError, setAddDonorError] = useState<string | null>(null);
  const [editingDonor, setEditingDonor] = useState<Donor | null>(null);
  const [editDonorData, setEditDonorData] = useState({
    donorNumber: '',
    fullName: '',
    email: ''
  });
  const [editDonorError, setEditDonorError] = useState<string | null>(null);

  const [showAddDonation, setShowAddDonation] = useState<Donor | null>(null);
  const [newDonation, setNewDonation] = useState({
    amount: '',
    date: '',
    description: '',
    file: null as File | null
  });
  const [editDonation, setEditDonation] = useState<{ donor: Donor; donation: Donation } | null>(null);
  const [editDonationData, setEditDonationData] = useState<{
    amount: string;
    date: string;
    description: string;
    file: File | null;
    pdfUrl?: string;
  }>({
    amount: '',
    date: '',
    description: '',
    file: null,
    pdfUrl: undefined,
  });
  const excelInputRef = useRef<HTMLInputElement | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    inserted: { id: number; donorNumber: string; fullName: string; email: string }[];
    duplicates: { rowNumber: number; donorNumber?: string; reason: string }[];
    errors: { rowNumber?: number; reason: string }[];
  } | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [minTotal, setMinTotal] = useState('');
  const [maxTotal, setMaxTotal] = useState('');
  const [onlyPending, setOnlyPending] = useState(false);
  const [sendingDonationId, setSendingDonationId] = useState<string | null>(null);
  const [sendingAll, setSendingAll] = useState(false);
  const [selectedSenders, setSelectedSenders] = useState<Record<string, SenderOption>>({});
  const [activeDonorTab, setActiveDonorTab] = useState<'details' | 'donations' | 'prayer' | 'yahrzeit'>('details');

  const isNameObject = (entry: DonorNameEntry): entry is Exclude<DonorNameEntry, string> =>
    typeof entry === 'object' && entry !== null;

  const formatDateString = (value?: string) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return date.toLocaleDateString('he-IL');
  };

  const formatHebrewDate = (dateInput: Date | string | undefined | null) => {
    if (!dateInput) return '';
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (Number.isNaN(date.getTime())) return '';
    try {
      const hebrewDate = new HDate(date) as unknown as {
        renderGematriya?: () => string;
        render?: () => string;
      };
      if (typeof hebrewDate.renderGematriya === 'function') {
        return hebrewDate.renderGematriya();
      }
      if (typeof hebrewDate.render === 'function') {
        return hebrewDate.render();
      }
      return '';
    } catch (error) {
      console.error('Failed to format Hebrew date', error);
      return '';
    }
  };

  const createDonation = (donation: any): Donation => {
    const hasDate = Boolean(donation.date);
    const date = hasDate ? new Date(donation.date) : new Date();
    const sentDate = donation.sentDate ? new Date(donation.sentDate) : undefined;
    return {
      ...donation,
      date,
      sentDate,
      hebrewDate: hasDate ? formatHebrewDate(date) : undefined,
      sentHebrewDate: sentDate ? formatHebrewDate(sentDate) : undefined
    };
  };

  useEffect(() => {
    setSelectedSenders(prev => {
      const updatedSelections: Record<string, SenderOption> = {};
      donors.forEach(donor => {
        donor.donations.forEach(donation => {
          updatedSelections[donation.id] = prev[donation.id] || SENDER_OPTIONS[0].senderName;
        });
      });
      return updatedSelections;
    });
  }, [donors]);

  useEffect(() => {
    setActiveDonorTab('details');
  }, [selectedDonor?.id]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS'
    }).format(amount);
  };

  const getEmailContent = (
    senderName: typeof SENDER_OPTIONS[number]['senderName'],
    donor: Donor,
    donation: Donation
  ) => {
    const donorGreeting = donor.fullName?.trim() || 'תורם יקר';
    const donationAmount = formatCurrency(donation.amount);
    const donationDate = donation.date ? donation.date.toLocaleDateString('he-IL') : '';
    const donationHebrewDate = donation.hebrewDate || formatHebrewDate(donation.date);
    const donationPurpose = donation.description?.trim();

    const baseText = [
      `שלום ${donorGreeting},`,
      `תודה מעומק הלב על תרומתך בסך ${donationAmount}.`,
      'מצורפת הקבלה עבור תרומתך המכובדת, המוכרת לפי סעיף 46.',
    ];

    if (donationPurpose) {
      baseText.splice(2, 0, `ייעוד התרומה: ${donationPurpose}.`);
    }

    if (donationDate) {
      const dateLine = donationHebrewDate
        ? `תאריך התרומה: ${donationDate} (${donationHebrewDate})`
        : `תאריך התרומה: ${donationDate}`;
      baseText.splice(baseText.length - 1, 0, dateLine);
    }

    const baseHtml = (
      blessingLine: string,
      signature: string,
      donationLink: string,
      contactLine?: string
    ) => `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charSet="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>קבלה על תרומתך</title>
</head>
<body style="margin:0;background-color:#f4f5f7;font-family:'Assistant','Segoe UI',Tahoma,Arial,sans-serif;direction:rtl;text-align:right;color:#1f2937;">
  <table role="presentation" width="100%" style="border-collapse:collapse;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" style="max-width:600px;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 20px 45px rgba(15,23,42,0.12);">
          <tr>
            <td style="padding:32px;background:linear-gradient(135deg,#22d3ee,#0f766e);color:#ffffff;">
              <p style="margin:0;font-size:28px;font-weight:700;">${senderName}</p>
              <p style="margin:8px 0 0;font-size:16px;font-weight:500;">קבלה על תרומתך</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;font-size:18px;font-weight:600;">שלום ${donorGreeting},</p>
              <p style="margin:0 0 12px;font-size:16px;line-height:1.8;">תודה מעומק הלב על תרומתך בסך <strong>${donationAmount}</strong>.</p>
              ${donationPurpose ? `<p style="margin:0 0 12px;font-size:16px;line-height:1.8;">ייעוד התרומה: ${donationPurpose}.</p>` : ''}
              <p style="margin:0 0 12px;font-size:16px;line-height:1.8;">מצורפת הקבלה עבור תרומתך המכובדת, המוכרת לפי סעיף 46.</p>
              ${donationDate ? `<p style="margin:0 0 12px;font-size:16px;line-height:1.8;">תאריך התרומה: ${donationDate}${donationHebrewDate ? ` (${donationHebrewDate})` : ''}</p>` : ''}
              <p style="margin:0 0 20px;font-size:16px;line-height:1.8;">${blessingLine}</p>
              <div style="margin:32px 0;text-align:center;">
                <a href="${donationLink}" style="display:inline-block;padding:14px 32px;background-color:#0f766e;color:#ffffff;border-radius:999px;text-decoration:none;font-size:16px;font-weight:700;">לתרומות</a>
              </div>
              <div style="padding:20px;background-color:#f0fdfa;border-radius:16px;font-size:14px;line-height:1.8;">
                <p style="margin:0 0 6px;font-weight:600;">פרטי התרומה</p>
                <p style="margin:0;">סכום התרומה: ${donationAmount}</p>
                ${donationDate ? `<p style="margin:0;">תאריך התרומה: ${donationDate}${donationHebrewDate ? ` (${donationHebrewDate})` : ''}</p>` : ''}
                ${donationPurpose ? `<p style="margin:0;">ייעוד התרומה: ${donationPurpose}</p>` : ''}
              </div>
              <p style="margin:24px 0 4px;font-size:16px;line-height:1.8;">בברכה,</p>
              <p style="margin:0;font-size:16px;font-weight:700;">${signature}</p>
              ${contactLine ? `<p style="margin:4px 0 0;font-size:14px;color:#6b7280;">${contactLine}</p>` : ''}
            </td>
          </tr>
        </table>
        <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;">הודעה זו נשלחה אליך באופן אוטומטי, אנא אל תגיב אליה ישירות.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;

    if (senderName === 'צדקת עניי ארץ ישראל') {
      const donationLink = 'https://www.matara.pro/nedarimplus/online/?mosad=7000144';
      const blessingLine = 'בזכות הצדקה תזכו לשפע ברכה והצלחה.';
      const signature = 'צדקת עניי ארץ ישראל';
      const contactLine = 'טלפון: 1800-225-333';
      const subject = 'קבלה על תרומתך - צדקת עניי ארץ ישראל';
      const text = [
        ...baseText,
        blessingLine,
        `לתרומה נוספת: ${donationLink}`,
        'בברכה,',
        signature,
        contactLine
      ].join('\n');

      return {
        subject,
        text,
        html: baseHtml(blessingLine, signature, donationLink, contactLine)
      };
    }

    const donationLink = 'https://www.matara.pro/nedarimplus/online/?mosad=7000145';
    const blessingLine = 'בזכות החזקת לומדי תורה תזכו לשפע ברכה והצלחה.';
    const signature = 'כולל בני ירושלים';
    const subject = 'קבלה על תרומתך - בני ירושלים';
    const text = [
      ...baseText,
      blessingLine,
      `לתרומה נוספת: ${donationLink}`,
      'בברכה,',
      signature
    ].join('\n');

    return {
      subject,
      text,
      html: baseHtml(blessingLine, signature, donationLink)
    };
  };


  useEffect(() => {
    fetch(`${API_URL}/donors`)
      .then(res => res.json())
      .then(data => {
        const loaded = data.map((d: any) => ({
          ...d,
          donations: Array.isArray(d.donations) ? d.donations.map((dn: any) => createDonation(dn)) : [],
          prayerNames: Array.isArray(d.prayerNames) ? d.prayerNames : [],
          yahrzeitNames: Array.isArray(d.yahrzeitNames) ? d.yahrzeitNames : [],
        }));
        setDonors(loaded);
      })
      .catch(err => {
        console.error('Failed to load donors', err);
      });
  }, []);

  const handleAddDonor = async () => {
    if (newDonor.donorNumber && newDonor.fullName && newDonor.email) {
      setAddDonorError(null);
      try {
        const res = await fetch(`${API_URL}/donors`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newDonor)
        });
        const donor = await res.json();
        if (!res.ok) {
          setAddDonorError(donor.message || 'לא ניתן להוסיף תורם זה');
          return;
        }
        setDonors(prev => [
          ...prev,
          {
            ...donor,
            donations: donor.donations || [],
            prayerNames: Array.isArray(donor.prayerNames) ? donor.prayerNames : [],
            yahrzeitNames: Array.isArray(donor.yahrzeitNames) ? donor.yahrzeitNames : [],
          },
        ]);
        setNewDonor({ donorNumber: '', fullName: '', email: '' });
        setShowAddDonor(false);
      } catch (err) {
        console.error('Failed to add donor', err);
        setAddDonorError('אירעה שגיאה בעת הוספת התורם');
      }
    }
  };

  const openEditDonor = (donor: Donor) => {
    setEditingDonor(donor);
    setEditDonorData({
      donorNumber: donor.donorNumber || '',
      fullName: donor.fullName || '',
      email: donor.email || ''
    });
    setEditDonorError(null);
  };

  const handleUpdateDonor = async () => {
    if (!editingDonor) return;
    if (!editDonorData.donorNumber || !editDonorData.fullName || !editDonorData.email) {
      setEditDonorError('נא למלא את כל השדות');
      return;
    }
    setEditDonorError(null);
    try {
      const res = await fetch(`${API_URL}/donors/${editingDonor.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editDonorData)
      });
      const updatedDonor = await res.json();
      if (!res.ok) {
        setEditDonorError(updatedDonor.message || 'לא ניתן לעדכן את התורם הזה');
        return;
      }
      setDonors(prev =>
        prev.map(donor =>
          donor.id === editingDonor.id
            ? {
                ...donor,
                donorNumber: updatedDonor.donorNumber,
                fullName: updatedDonor.fullName,
                email: updatedDonor.email
              }
            : donor
        )
      );
      setSelectedDonor(prev =>
        prev && prev.id === editingDonor.id
          ? {
              ...prev,
              donorNumber: updatedDonor.donorNumber,
              fullName: updatedDonor.fullName,
              email: updatedDonor.email
            }
          : prev
      );
      setEditingDonor(null);
    } catch (err) {
      console.error('Failed to update donor', err);
      setEditDonorError('אירעה שגיאה בעת עדכון התורם');
    }
  };

  const handleImportDonors = async (file: File) => {
    setImporting(true);
    setImportResult(null);
    try {
      const content = await fileToBase64(file);
      const res = await fetch(`${API_URL}/donors/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, content })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.inserted?.length) {
          setDonors(prev => [
            ...prev,
            ...data.inserted.map((donor: any) => ({
              ...donor,
              donations: [],
              totalDonations: 0,
              prayerNames: Array.isArray(donor.prayerNames) ? donor.prayerNames : [],
              yahrzeitNames: Array.isArray(donor.yahrzeitNames) ? donor.yahrzeitNames : [],
            }))
          ]);
        }
        setImportResult({
          inserted: data.inserted || [],
          duplicates: data.duplicates || [],
          errors: data.errors || []
        });
      } else {
        setImportResult({
          inserted: [],
          duplicates: [],
          errors: [
            {
              reason: data.message || 'אירעה שגיאה בעת יבוא הקובץ'
            }
          ]
        });
      }
    } catch (err) {
      console.error('Failed to import donors', err);
      setImportResult({
        inserted: [],
        duplicates: [],
        errors: [
          {
            reason: 'אירעה שגיאה בעת יבוא הקובץ'
          }
        ]
      });
    } finally {
      setImporting(false);
      if (excelInputRef.current) {
        excelInputRef.current.value = '';
      }
    }
  };

  const handleImportInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImportDonors(file);
    }
  };

  const openEditDonation = (donor: Donor, donation: Donation) => {
    const donationDate = donation.date instanceof Date ? donation.date : new Date(donation.date);
    setEditDonation({ donor, donation });
    setEditDonationData({
      amount: donation.amount.toString(),
      date: donationDate.toISOString().split('T')[0],
      description: donation.description || '',
      file: null,
      pdfUrl: donation.pdfUrl,
    });
  };

  const handleSendEmail = async (
    donorId: string,
    donationId: string,
    senderName: SenderOption = SENDER_OPTIONS[0].senderName
  ) => {
    const donor = donors.find(d => d.id === donorId);
    const donation = donor?.donations.find(d => d.id === donationId);
    if (!donor || !donation) return;
    setSendingDonationId(donationId);
    try {
      const { subject, text, html } = getEmailContent(senderName, donor, donation);

      await fetch(`${API_URL}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: donor.email,
          subject,
          text,
          html,
          donationId,
          pdfUrl: donation.pdfUrl,
          senderName
        })
      });
      const sentDate = new Date();
      const sentHebrewDate = formatHebrewDate(sentDate);
      setDonors(prev =>
        prev.map(d =>
          d.id === donorId
            ? {
                ...d,
                donations: d.donations.map(dd =>
                  dd.id === donationId
                    ? {
                        ...dd,
                        emailSent: true,
                        sentDate,
                        sentHebrewDate
                      }
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
            const selectedSender = selectedSenders[donation.id] || SENDER_OPTIONS[0].senderName;
            await handleSendEmail(donor.id, donation.id, selectedSender);
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
                  createDonation(data)
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

  const handleUpdateDonation = async () => {
    if (!editDonation) return;
    if (!editDonationData.amount || !editDonationData.date || !editDonationData.description) return;

    try {
      let pdfUrl = editDonationData.pdfUrl;
      if (editDonationData.file) {
        const content = await fileToBase64(editDonationData.file);
        const uploadRes = await fetch(`${API_URL}/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: editDonationData.file.name, content })
        });
        const uploadData = await uploadRes.json();
        pdfUrl = uploadData.url;
      }

      const res = await fetch(`${API_URL}/donations/${editDonation.donation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(editDonationData.amount),
          date: editDonationData.date,
          description: editDonationData.description,
          pdfUrl,
        })
      });

      const data = await res.json();
      if (!res.ok) {
        console.error('Failed to update donation', data);
        return;
      }

      const updatedAmount = typeof data.amount === 'number' ? data.amount : parseFloat(data.amount);
      if (Number.isNaN(updatedAmount)) {
        console.error('Invalid donation amount received from server');
        return;
      }

      const updatedDate = data.date ? new Date(data.date) : new Date(editDonationData.date);
      const updatedSentDate = data.sentDate ? new Date(data.sentDate) : undefined;

      let nextDonors: Donor[] = [];
      setDonors(prev => {
        nextDonors = prev.map(donor => {
          if (donor.id !== editDonation.donor.id) {
            return donor;
          }

          const oldDonation = donor.donations.find(d => d.id === editDonation.donation.id);
          const oldAmount = oldDonation ? oldDonation.amount : 0;

          return {
            ...donor,
            donations: donor.donations.map(d =>
              d.id === editDonation.donation.id
                ? {
                    ...d,
                    amount: updatedAmount,
                    date: updatedDate,
                    description: data.description || '',
                    pdfUrl: data.pdfUrl || undefined,
                    emailSent: data.emailSent ?? d.emailSent,
                    sentDate: updatedSentDate,
                  }
                : d
            ),
            totalDonations: donor.totalDonations - oldAmount + updatedAmount,
          };
        });
        return nextDonors;
      });

      setSelectedDonor(prevSelected => {
        if (!prevSelected || prevSelected.id !== editDonation.donor.id) {
          return prevSelected;
        }
        return nextDonors.find(donor => donor.id === editDonation.donor.id) || prevSelected;
      });

      setEditDonation(null);
      setEditDonationData({ amount: '', date: '', description: '', file: null, pdfUrl: undefined });
    } catch (err) {
      console.error('Failed to update donation', err);
    }
  };

  const renderSendButton = (donation: Donation, donorId: string) => {
    const isSending = sendingDonationId === donation.id;
    const selectedSender = selectedSenders[donation.id] || SENDER_OPTIONS[0].senderName;
    return (
      <div className="flex flex-col space-y-2">
        <label className="text-xs text-gray-600" htmlFor={`sender-select-${donation.id}`}>
          בחר שולח
        </label>
        <select
          id={`sender-select-${donation.id}`}
          value={selectedSender}
          onChange={(event) =>
            setSelectedSenders(prev => ({
              ...prev,
              [donation.id]: event.target.value as SenderOption
            }))
          }
          className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {SENDER_OPTIONS.map(option => (
            <option key={option.senderName} value={option.senderName}>
              {option.senderName}
            </option>
          ))}
        </select>
        <button
          onClick={() => handleSendEmail(donorId, donation.id, selectedSender)}
          disabled={isSending}
          className={`bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center space-x-1 space-x-reverse justify-center transition active:scale-95 ${isSending ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isSending ? (
            <span>מעבד...</span>
          ) : (
            <>
              <Send className="h-3 w-3" />
              <span>שלח קבלה</span>
            </>
          )}
        </button>
      </div>
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
            onClick={() => excelInputRef.current?.click()}
            disabled={importing}
            className={`bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 space-x-reverse transition-colors ${importing ? 'opacity-50 cursor-not-allowed hover:bg-purple-600' : ''}`}
          >
            {importing ? (
              <span>מייבא...</span>
            ) : (
              <>
                <Upload className="h-5 w-5" />
                <span>ייבוא תורמים מאקסל</span>
              </>
            )}
          </button>
          <input
            ref={excelInputRef}
            type="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            onChange={handleImportInputChange}
            className="hidden"
          />
          <button
            onClick={() => setShowAddDonor(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 space-x-reverse transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span>הוסף תורם חדש</span>
          </button>
        </div>
      </div>

      {importResult && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">תוצאות יבוא</h2>
          {importResult.inserted.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-green-700">תורמים שנוספו</h3>
              <ul className="list-disc pr-5 text-green-700">
                {importResult.inserted.map(donor => (
                  <li key={donor.id}>
                    {donor.fullName} ({donor.donorNumber}) - {donor.email}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {importResult.duplicates.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-yellow-700">תורמים שדולגו</h3>
              <ul className="list-disc pr-5 text-yellow-700">
                {importResult.duplicates.map((dup, index) => (
                  <li key={`${dup.donorNumber || 'duplicate'}-${dup.rowNumber}-${index}`}>
                    שורה {dup.rowNumber}: {dup.donorNumber || 'ללא מספר'} - {dup.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {importResult.errors.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-red-700">שגיאות</h3>
              <ul className="list-disc pr-5 text-red-700">
                {importResult.errors.map((error, index) => (
                  <li key={`${error.rowNumber || 'general'}-${index}`}>
                    {error.rowNumber ? `שורה ${error.rowNumber}: ` : ''}{error.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Add Donor Modal */}
      {showAddDonor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">הוסף תורם חדש</h3>
              <button
                onClick={() => {
                  setShowAddDonor(false);
                  setAddDonorError(null);
                }}
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
              {addDonorError && (
                <p className="text-sm text-red-600">{addDonorError}</p>
              )}
            </div>
            
            <div className="flex justify-end space-x-3 space-x-reverse mt-6">
              <button
                onClick={() => {
                  setShowAddDonor(false);
                  setAddDonorError(null);
                }}
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

      {editingDonor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">עריכת תורם</h3>
              <button
                onClick={() => setEditingDonor(null)}
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
                  value={editDonorData.donorNumber}
                  onChange={(e) => setEditDonorData(prev => ({ ...prev, donorNumber: e.target.value }))}
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
                  value={editDonorData.fullName}
                  onChange={(e) => setEditDonorData(prev => ({ ...prev, fullName: e.target.value }))}
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
                  value={editDonorData.email}
                  onChange={(e) => setEditDonorData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="הכנס כתובת מייל"
                />
              </div>

              {editDonorError && (
                <p className="text-sm text-red-600">{editDonorError}</p>
              )}
            </div>

            <div className="flex justify-end space-x-3 space-x-reverse mt-6">
              <button
                onClick={() => setEditingDonor(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                ביטול
              </button>
              <button
                onClick={handleUpdateDonor}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
              >
                שמור שינויים
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Donation Modal */}
      {editDonation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">ערוך תרומה</h3>
              <button
                onClick={() => {
                  setEditDonation(null);
                  setEditDonationData({ amount: '', date: '', description: '', file: null, pdfUrl: undefined });
                }}
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
                  value={editDonationData.amount}
                  onChange={(e) => setEditDonationData(prev => ({ ...prev, amount: e.target.value }))}
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
                  value={editDonationData.date}
                  onChange={(e) => setEditDonationData(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  תיאור
                </label>
                <input
                  type="text"
                  value={editDonationData.description}
                  onChange={(e) => setEditDonationData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="הכנס תיאור"
                />
              </div>

              {editDonationData.pdfUrl && !editDonationData.file && (
                <div className="border border-gray-200 rounded-md p-3 flex items-center justify-between text-sm">
                  <a
                    href={`${API_URL}${editDonationData.pdfUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    צפה בקובץ הנוכחי
                  </a>
                  <button
                    onClick={() => setEditDonationData(prev => ({ ...prev, pdfUrl: undefined }))}
                    className="text-red-600 hover:text-red-700"
                  >
                    הסר קובץ
                  </button>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  החלף קובץ PDF
                </label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) =>
                    setEditDonationData(prev => ({
                      ...prev,
                      file: e.target.files ? e.target.files[0] : null,
                    }))
                  }
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  אם לא תבחר קובץ חדש יישמר הקובץ הנוכחי.
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 space-x-reverse mt-6">
              <button
                onClick={() => {
                  setEditDonation(null);
                  setEditDonationData({ amount: '', date: '', description: '', file: null, pdfUrl: undefined });
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                ביטול
              </button>
              <button
                onClick={handleUpdateDonation}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
              >
                עדכן תרומה
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
          {filteredDonors.map((donor) => {
            const prayerNames = Array.isArray(donor.prayerNames) ? donor.prayerNames : [];
            const yahrzeitNames = Array.isArray(donor.yahrzeitNames) ? donor.yahrzeitNames : [];
            const donorTabs: { id: 'details' | 'donations' | 'prayer' | 'yahrzeit'; label: string }[] = [
              { id: 'details', label: 'פרטי תורם' },
              { id: 'donations', label: `רשימת תרומות (${donor.donations.length})` },
              { id: 'prayer', label: `רשימת שמות לתפילה (${prayerNames.length})` },
              { id: 'yahrzeit', label: `רשימת שמות ליארצייט (${yahrzeitNames.length})` },
            ];

            const pendingEmails = donor.donations.filter(donation => !donation.emailSent).length;

            return (
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
                        סה"כ תרומות: {formatCurrency(donor.totalDonations)} | {donor.donations.length} תרומות
                        {pendingEmails > 0 && (
                          <span className="text-orange-600 mr-2">| {pendingEmails} ממתינות לשליחה</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 space-x-reverse">
                    <button
                      onClick={() => openEditDonor(donor)}
                      className="flex items-center space-x-2 space-x-reverse px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                      <span>ערוך תורם</span>
                    </button>
                    <button
                      onClick={() =>
                        setSelectedDonor(prev => (prev?.id === donor.id ? null : donor))
                      }
                      className="flex items-center space-x-2 space-x-reverse px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                      <span>{selectedDonor?.id === donor.id ? 'סגור כרטיס' : 'צפה בכרטיס'}</span>
                    </button>
                  </div>
                </div>

                {selectedDonor?.id === donor.id && (
                  <div className="mt-4">
                    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                      <div className="px-6 py-5 border-b bg-gradient-to-l from-blue-50 to-transparent">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div>
                            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">כרטיס תורם</p>
                            <h5 className="mt-1 text-xl font-semibold text-gray-900">{donor.fullName}</h5>
                            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                              <span>מספר תורם: {donor.donorNumber}</span>
                              <span className="flex items-center space-x-1 space-x-reverse">
                                <Mail className="h-4 w-4" />
                                <span>{donor.email}</span>
                              </span>
                              <span>סה"כ תרומות: {formatCurrency(donor.totalDonations)}</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-start md:items-end gap-3 w-full md:w-auto">
                            <div className="text-sm text-gray-600">
                              {pendingEmails > 0
                                ? `${pendingEmails} קבלות ממתינות לשליחה`
                                : 'כל הקבלות נשלחו'}
                            </div>
                            <div className="flex gap-2 w-full md:w-auto">
                              <button
                                onClick={() => setShowAddDonation(donor)}
                                className="flex-1 md:flex-initial bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                              >
                                הוסף תרומה
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="px-6 py-3 border-b bg-gray-50">
                        <div className="flex items-center gap-2 overflow-x-auto">
                          {donorTabs.map(tab => (
                            <button
                              key={tab.id}
                              onClick={() => setActiveDonorTab(tab.id)}
                              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                                activeDonorTab === tab.id
                                  ? 'bg-white text-blue-600 shadow-sm border border-blue-200'
                                  : 'text-gray-600 hover:text-blue-600 hover:bg-white/60'
                              }`}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="p-6 space-y-6">
                        {activeDonorTab === 'details' && (
                          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            <div className="rounded-lg border border-gray-200 p-4">
                              <span className="text-sm text-gray-500">שם מלא</span>
                              <p className="mt-2 text-base font-semibold text-gray-900">{donor.fullName || '—'}</p>
                            </div>
                            <div className="rounded-lg border border-gray-200 p-4">
                              <span className="text-sm text-gray-500">מספר תורם</span>
                              <p className="mt-2 text-base font-semibold text-gray-900">{donor.donorNumber || '—'}</p>
                            </div>
                            <div className="rounded-lg border border-gray-200 p-4">
                              <span className="text-sm text-gray-500">כתובת מייל</span>
                              <p className="mt-2 text-base font-semibold text-gray-900 break-all">{donor.email || '—'}</p>
                            </div>
                            <div className="rounded-lg border border-gray-200 p-4">
                              <span className="text-sm text-gray-500">סה"כ תרומות</span>
                              <p className="mt-2 text-base font-semibold text-gray-900">{formatCurrency(donor.totalDonations)}</p>
                            </div>
                            <div className="rounded-lg border border-gray-200 p-4">
                              <span className="text-sm text-gray-500">מספר תרומות</span>
                              <p className="mt-2 text-base font-semibold text-gray-900">{donor.donations.length}</p>
                            </div>
                            <div className="rounded-lg border border-gray-200 p-4">
                              <span className="text-sm text-gray-500">קבלות בהמתנה</span>
                              <p className={`mt-2 text-base font-semibold ${pendingEmails > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
                                {pendingEmails > 0 ? pendingEmails : 'אין'}
                              </p>
                            </div>
                          </div>
                        )}

                        {activeDonorTab === 'donations' && (
                          donor.donations.length > 0 ? (
                            <div className="space-y-4">
                              {donor.donations.map((donation) => {
                                const sentOn = donation.sentDate ? donation.sentDate.toLocaleDateString('he-IL') : '';
                                return (
                                  <div key={donation.id} className="rounded-lg border border-gray-200 p-4 bg-white">
                                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                      <div className="flex items-start space-x-3 space-x-reverse">
                                        <div className="bg-blue-50 rounded-full p-2">
                                          <FileText className="h-5 w-5 text-blue-600" />
                                        </div>
                                        <div className="space-y-2">
                                          <div>
                                            <p className="text-base font-semibold text-gray-900">{formatCurrency(donation.amount)}</p>
                                            <p className="text-sm text-gray-600">
                                              {donation.date.toLocaleDateString('he-IL')}
                                              {donation.hebrewDate ? ` (${donation.hebrewDate})` : ''}
                                            </p>
                                          </div>
                                          {donation.description && (
                                            <p className="text-sm text-gray-600">{donation.description}</p>
                                          )}
                                          {donation.emailSent && sentOn && (
                                            <div className="text-xs text-green-600 flex items-center space-x-1 space-x-reverse">
                                              <CheckCircle className="h-3 w-3" />
                                              <span>
                                                נשלח ב-{sentOn}
                                                {donation.sentHebrewDate ? ` (${donation.sentHebrewDate})` : ''}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex flex-wrap items-center justify-end gap-3">
                                        {donation.pdfUrl && (
                                          <a
                                            href={`${API_URL}${donation.pdfUrl}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block w-20 h-20 border border-gray-200 rounded-lg overflow-hidden"
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

                                        <button
                                          onClick={() => openEditDonation(donor, donation)}
                                          className="flex items-center space-x-1 space-x-reverse border border-blue-200 text-blue-600 px-3 py-1 rounded text-sm hover:bg-blue-50 transition-colors"
                                        >
                                          <Pencil className="h-4 w-4" />
                                          <span>ערוך</span>
                                        </button>

                                        {renderSendButton(donation, donor.id)}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500 text-sm">
                              אין תרומות להצגה עבור תורם זה.
                            </div>
                          )
                        )}

                        {activeDonorTab === 'prayer' && (
                          prayerNames.length > 0 ? (
                            <div className="space-y-4">
                              {prayerNames.map((entry, index) => {
                                const objectEntry = isNameObject(entry) ? entry : null;
                                const displayName = objectEntry ? objectEntry.name : entry;
                                const secondary = objectEntry
                                  ? [objectEntry.relation, objectEntry.notes].filter(Boolean).join(' • ')
                                  : '';
                                const createdAt = objectEntry ? formatDateString(objectEntry.createdAt) : '';
                                const key = objectEntry?.id ? `prayer-${objectEntry.id}` : `prayer-${index}-${displayName}`;

                                return (
                                  <div key={key} className="rounded-lg border border-gray-200 p-4 bg-white">
                                    <div className="flex flex-col gap-2">
                                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                                        <p className="text-base font-semibold text-gray-900">{displayName || 'ללא שם'}</p>
                                        {createdAt && (
                                          <span className="text-xs text-gray-500">נוסף בתאריך {createdAt}</span>
                                        )}
                                      </div>
                                      {secondary && <p className="text-sm text-gray-600">{secondary}</p>}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500 text-sm">
                              עדיין לא נוספו שמות לתפילה לתורם זה.
                            </div>
                          )
                        )}

                        {activeDonorTab === 'yahrzeit' && (
                          yahrzeitNames.length > 0 ? (
                            <div className="space-y-4">
                              {yahrzeitNames.map((entry, index) => {
                                const objectEntry = isNameObject(entry) ? entry : null;
                                const displayName = objectEntry ? objectEntry.name : entry;
                                const secondary = objectEntry
                                  ? [objectEntry.relation, objectEntry.notes].filter(Boolean).join(' • ')
                                  : '';
                                const hebrewDate = objectEntry?.hebrewDate || '';
                                const gregorianDate = objectEntry ? formatDateString(objectEntry.gregorianDate || objectEntry.date) : '';
                                const key = objectEntry?.id ? `yahrzeit-${objectEntry.id}` : `yahrzeit-${index}-${displayName}`;

                                return (
                                  <div key={key} className="rounded-lg border border-gray-200 p-4 bg-white">
                                    <div className="flex flex-col gap-2">
                                      <p className="text-base font-semibold text-gray-900">{displayName || 'ללא שם'}</p>
                                      {secondary && <p className="text-sm text-gray-600">{secondary}</p>}
                                      {(hebrewDate || gregorianDate) && (
                                        <div className="text-sm text-gray-600 space-y-1">
                                          {gregorianDate && <p>תאריך לועזי: {gregorianDate}</p>}
                                          {hebrewDate && <p>תאריך עברי: {hebrewDate}</p>}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500 text-sm">
                              עדיין לא נוספו שמות ליארצייט לתורם זה.
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
