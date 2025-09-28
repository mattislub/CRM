import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserRound,
  Mail,
  Pencil,
  Search,
  Filter,
  Calendar,
  HandCoins,
  Trash,
  X,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown
} from 'lucide-react';
import { HDate } from '@hebcal/core';

const API_URL = import.meta.env.VITE_API_URL || '';

type DonationStatus = 'התקבל' | 'ממתין' | 'נשלח';

interface ApiDonationRecord {
  id: number;
  donorId: number | null;
  donorNumber: string | null;
  donorName: string | null;
  donorEmail: string | null;
  amount: number;
  donationDate: string | null;
  description: string | null;
  pdfUrl: string | null;
  emailSent: boolean;
  sentDate: string | null;
  fundNumber: string | null;
}

interface DonationRecord {
  id: string;
  donorId: number | null;
  donorNumber: string;
  donorName: string;
  donorEmail: string;
  amount: number;
  fundNumber: string;
  purpose: string;
  date: string;
  status: DonationStatus;
  emailSent: boolean;
  pdfUrl?: string;
}

type SortField = 'donorName' | 'donorEmail' | 'date' | 'fundNumber' | 'amount' | 'status';

const DEFAULT_SENDER = 'צדקת עניי ארץ ישראל';
const TORAH_SENDER = 'בני ירושלים';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0
  }).format(amount);

const formatHebrewDate = (dateInput: Date | string | undefined | null) => {
  if (!dateInput) {
    return '';
  }

  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (Number.isNaN(date.getTime())) {
    return '';
  }

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

const getDefaultSenderByFundNumber = (fundNumber?: string) =>
  fundNumber?.trim() === '6' ? TORAH_SENDER : DEFAULT_SENDER;

const getDonationLink = (senderName: string) =>
  senderName === DEFAULT_SENDER
    ? 'https://www.matara.pro/nedarimplus/online/?mosad=7000144'
    : 'https://www.matara.pro/nedarimplus/online/?mosad=7000145';

const getEmailContent = (senderName: string, donation: DonationRecord) => {
  const donorGreeting = donation.donorName?.trim() || 'תורם יקר';
  const donationAmount = formatCurrency(donation.amount);
  const donationDate = donation.date ? new Date(donation.date) : undefined;
  const formattedDonationDate = donationDate?.toLocaleDateString('he-IL') ?? '';
  const donationHebrewDate = donation.date ? formatHebrewDate(donation.date) : '';
  const donationPurpose = donation.purpose?.trim();

  const baseText = [
    `שלום ${donorGreeting},`,
    `תודה מעומק הלב על תרומתך בסך ${donationAmount}.`,
    'מצורפת הקבלה עבור תרומתך המכובדת, המוכרת לפי סעיף 46.',
  ];

  if (donationPurpose) {
    baseText.splice(2, 0, `ייעוד התרומה: ${donationPurpose}.`);
  }

  if (formattedDonationDate) {
    const dateLine = donationHebrewDate
      ? `תאריך התרומה: ${formattedDonationDate} (${donationHebrewDate})`
      : `תאריך התרומה: ${formattedDonationDate}`;
    baseText.splice(baseText.length - 1, 0, dateLine);
  }

  const donationLink = getDonationLink(senderName);

  const blessingLine =
    senderName === DEFAULT_SENDER
      ? 'בזכות הצדקה תזכו לשפע ברכה והצלחה.'
      : 'בזכות החזקת לומדי תורה תזכו לשפע ברכה והצלחה.';
  const signature = senderName === DEFAULT_SENDER ? DEFAULT_SENDER : 'כולל בני ירושלים';
  const contactLine = senderName === DEFAULT_SENDER ? 'טלפון: 1800-225-333' : undefined;

  const baseHtml = (
    blessing: string,
    signoff: string,
    link: string,
    contact?: string
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
              ${formattedDonationDate ? `<p style="margin:0 0 12px;font-size:16px;line-height:1.8;">תאריך התרומה: ${formattedDonationDate}${donationHebrewDate ? ` (${donationHebrewDate})` : ''}</p>` : ''}
              <p style="margin:0 0 20px;font-size:16px;line-height:1.8;">${blessing}</p>
              <div style="margin:32px 0;text-align:center;">
                <a href="${link}" style="display:inline-block;padding:14px 32px;background-color:#0f766e;color:#ffffff;border-radius:999px;text-decoration:none;font-size:16px;font-weight:700;">לתרומות</a>
              </div>
              <div style="padding:20px;background-color:#f0fdfa;border-radius:16px;font-size:14px;line-height:1.8;">
                <p style="margin:0 0 6px;font-weight:600;">פרטי התרומה</p>
                <p style="margin:0;">סכום התרומה: ${donationAmount}</p>
                ${formattedDonationDate ? `<p style="margin:0;">תאריך התרומה: ${formattedDonationDate}${donationHebrewDate ? ` (${donationHebrewDate})` : ''}</p>` : ''}
                ${donationPurpose ? `<p style="margin:0;">ייעוד התרומה: ${donationPurpose}</p>` : ''}
              </div>
              <p style="margin:24px 0 4px;font-size:16px;line-height:1.8;">בברכה,</p>
              <p style="margin:0;font-size:16px;font-weight:700;">${signoff}</p>
              ${contact ? `<p style="margin:4px 0 0;font-size:14px;color:#6b7280;">${contact}</p>` : ''}
            </td>
          </tr>
        </table>
        <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;">הודעה זו נשלחה אליך באופן אוטומטי, אנא אל תגיב אליה ישירות.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const subject =
    senderName === DEFAULT_SENDER
      ? 'קבלה על תרומתך - צדקת עניי ארץ ישראל'
      : 'קבלה על תרומתך - בני ירושלים';

  const text = [
    ...baseText,
    blessingLine,
    `לתרומה נוספת: ${donationLink}`,
    'בברכה,',
    signature,
    ...(contactLine ? [contactLine] : []),
  ].join('\n');

  const html = baseHtml(blessingLine, signature, donationLink, contactLine);

  return { subject, text, html };
};

const determineStatus = (donation: ApiDonationRecord): DonationStatus => {
  if (donation.emailSent) {
    return 'נשלח';
  }
  if (donation.pdfUrl) {
    return 'ממתין';
  }
  return 'התקבל';
};

const formatDateForInput = (value: string) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().split('T')[0];
};

const toDonationRecord = (donation: ApiDonationRecord): DonationRecord => ({
  id: donation.id.toString(),
  donorId: donation.donorId,
  donorNumber: donation.donorNumber || '—',
  donorName: donation.donorName || 'תורם לא ידוע',
  donorEmail: donation.donorEmail || '',
  amount: donation.amount ?? 0,
  fundNumber: donation.fundNumber || '',
  purpose: donation.description || '',
  date: donation.donationDate || '',
  status: determineStatus(donation),
  emailSent: donation.emailSent,
  pdfUrl: donation.pdfUrl || undefined
});

export default function DonationsPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [modalSearchTerm, setModalSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | DonationStatus>('all');
  const [donations, setDonations] = useState<DonationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingDonation, setEditingDonation] = useState<DonationRecord | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [editForm, setEditForm] = useState({
    amount: '',
    date: '',
    purpose: '',
    pdfUrl: '',
    fundNumber: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const modalSearchInputRef = useRef<HTMLInputElement | null>(null);
  const donationRowRefs = useRef<(HTMLTableRowElement | null)[]>([]);
  const [focusedDonationIndex, setFocusedDonationIndex] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchDonations = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_URL}/donations`);
        if (!response.ok) {
          throw new Error('Failed to fetch donations');
        }
        const data: ApiDonationRecord[] = await response.json();
        if (!cancelled) {
          setDonations(data.map(toDonationRecord));
        }
      } catch (err) {
        console.error('Failed to load donations', err);
        if (!cancelled) {
          setError('אירעה שגיאה בטעינת התרומות מהשרת. נסו שוב מאוחר יותר.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchDonations();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'F5') {
        event.preventDefault();
        setModalSearchTerm(searchTerm);
        setIsSearchModalOpen(true);
      }

      if (event.key === 'Escape') {
        setIsSearchModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [searchTerm]);

  useEffect(() => {
    if (isSearchModalOpen) {
      modalSearchInputRef.current?.focus();
      modalSearchInputRef.current?.select();
    }
  }, [isSearchModalOpen]);

  const handleModalSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearchTerm(modalSearchTerm);
    setIsSearchModalOpen(false);
  };

  const filteredDonations = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const filtered = donations.filter(donation => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        donation.donorName.toLowerCase().includes(normalizedSearch) ||
        donation.donorEmail.toLowerCase().includes(normalizedSearch) ||
        donation.purpose.toLowerCase().includes(normalizedSearch) ||
        donation.donorNumber.toLowerCase().includes(normalizedSearch) ||
        donation.fundNumber.toLowerCase().includes(normalizedSearch);

      const matchesStatus = statusFilter === 'all' || donation.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    const sorted = [...filtered].sort((a, b) => {
      const directionMultiplier = sortDirection === 'asc' ? 1 : -1;

      switch (sortField) {
        case 'amount':
          return directionMultiplier * ((a.amount ?? 0) - (b.amount ?? 0));
        case 'date': {
          const dateA = a.date ? new Date(a.date).getTime() : 0;
          const dateB = b.date ? new Date(b.date).getTime() : 0;
          return directionMultiplier * (dateA - dateB);
        }
        case 'donorEmail':
          return (
            directionMultiplier *
            a.donorEmail.localeCompare(b.donorEmail, undefined, { sensitivity: 'base' })
          );
        case 'fundNumber':
          return (
            directionMultiplier *
            a.fundNumber.localeCompare(b.fundNumber, undefined, { sensitivity: 'base', numeric: true })
          );
        case 'status':
          return directionMultiplier * a.status.localeCompare(b.status, undefined, { sensitivity: 'base' });
        case 'donorName':
        default:
          return directionMultiplier * a.donorName.localeCompare(b.donorName, undefined, { sensitivity: 'base' });
      }
    });

    return sorted;
  }, [donations, searchTerm, statusFilter, sortField, sortDirection]);

  useEffect(() => {
    donationRowRefs.current = donationRowRefs.current.slice(0, filteredDonations.length);
  }, [filteredDonations.length]);

  useEffect(() => {
    if (filteredDonations.length === 0) {
      setFocusedDonationIndex(null);
      return;
    }

    setFocusedDonationIndex(prev => {
      if (prev == null) {
        return 0;
      }

      if (prev >= filteredDonations.length) {
        return filteredDonations.length - 1;
      }

      return prev;
    });
  }, [filteredDonations.length]);

  useEffect(() => {
    if (focusedDonationIndex == null) {
      return;
    }
    const element = donationRowRefs.current[focusedDonationIndex];
    element?.focus();
  }, [focusedDonationIndex, filteredDonations.length]);

  const focusDonationRow = (index: number) => {
    if (index < 0 || index >= filteredDonations.length) {
      return;
    }

    setFocusedDonationIndex(index);
  };

  const handleDonationRowKeyDown = (
    event: React.KeyboardEvent<HTMLTableRowElement>,
    index: number,
    donation: DonationRecord,
  ) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusDonationRow(Math.min(filteredDonations.length - 1, index + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusDonationRow(Math.max(0, index - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      openEditModal(donation);
    }
  };

  const handleSort = (field: SortField) => {
    setSortField(prevField => {
      if (prevField === field) {
        setSortDirection(prevDirection => (prevDirection === 'asc' ? 'desc' : 'asc'));
        return prevField;
      }

      setSortDirection(field === 'date' ? 'desc' : 'asc');
      return field;
    });
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="h-3.5 w-3.5 text-gray-300" aria-hidden="true" />;
    }

    return sortDirection === 'asc' ? (
      <ChevronUp className="h-3.5 w-3.5 text-gray-500" aria-hidden="true" />
    ) : (
      <ChevronDown className="h-3.5 w-3.5 text-gray-500" aria-hidden="true" />
    );
  };

  const getAriaSort = (field: SortField): 'none' | 'ascending' | 'descending' => {
    if (sortField !== field) {
      return 'none';
    }

    return sortDirection === 'asc' ? 'ascending' : 'descending';
  };

  const totalAmount = useMemo(
    () => donations.reduce((sum, donation) => sum + (Number.isFinite(donation.amount) ? donation.amount : 0), 0),
    [donations]
  );

  const handleDeleteDonation = async (donationId: string) => {
    const confirmed = window.confirm('האם אתם בטוחים שברצונכם למחוק את התרומה?');
    if (!confirmed) {
      return;
    }

    setDeletingId(donationId);

    try {
      const response = await fetch(`${API_URL}/donations/${donationId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete donation');
      }

      setDonations(prevDonations => prevDonations.filter(donation => donation.id !== donationId));
      setError(null);
    } catch (err) {
      console.error('Failed to delete donation', err);
      setError('אירעה שגיאה במחיקת התרומה. נסו שוב מאוחר יותר.');
    } finally {
      setDeletingId(null);
    }
  };

  const openEditModal = (donation: DonationRecord) => {
    setEditingDonation(donation);
    setEditError(null);
    setEditForm({
      amount: donation.amount ? donation.amount.toString() : '',
      date: formatDateForInput(donation.date),
      purpose: donation.purpose || '',
      pdfUrl: donation.pdfUrl || '',
      fundNumber: donation.fundNumber || '',
    });
  };

  const handleSendEmail = async (donation: DonationRecord) => {
    if (!donation.donorEmail) {
      setError('לא ניתן לשלוח מייל ללא כתובת אימייל תקפה.');
      return;
    }

    const senderName = getDefaultSenderByFundNumber(donation.fundNumber);
    const { subject, text, html } = getEmailContent(senderName, donation);
    const donationIdNumber = Number.parseInt(donation.id, 10);

    setSendingId(donation.id);

    try {
      const payload = {
        to: donation.donorEmail,
        subject,
        text,
        html,
        pdfUrl: donation.pdfUrl,
        senderName,
        ...(Number.isNaN(donationIdNumber) ? {} : { donationId: donationIdNumber }),
      };

      const response = await fetch(`${API_URL}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to send donation email');
      }

      setDonations(prevDonations =>
        prevDonations.map(current => {
          if (current.id !== donation.id) {
            return current;
          }

          return {
            ...current,
            emailSent: true,
            status: 'נשלח',
          };
        })
      );
      setError(prev => (prev === 'שליחת המייל נכשלה. נסו שוב מאוחר יותר.' ? null : prev));
    } catch (err) {
      console.error('Failed to send donation email', err);
      setError('שליחת המייל נכשלה. נסו שוב מאוחר יותר.');
    } finally {
      setSendingId(null);
    }
  };

  const closeEditModal = () => {
    setEditingDonation(null);
    setEditForm({ amount: '', date: '', purpose: '', pdfUrl: '', fundNumber: '' });
    setEditError(null);
    setSavingEdit(false);
  };

  const handleOpenDonorCard = (donation: DonationRecord) => {
    if (!donation.donorId && !donation.donorNumber) {
      return;
    }

    navigate('/donors', {
      state: {
        donorId: donation.donorId ?? undefined,
        donorNumber: donation.donorNumber || undefined,
      },
    });
  };

  const handleEditSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingDonation) {
      return;
    }

    const trimmedAmount = editForm.amount.trim();
    const parsedAmount = Number(trimmedAmount);
    if (!trimmedAmount || Number.isNaN(parsedAmount)) {
      setEditError('אנא הזינו סכום תרומה תקין.');
      return;
    }

    if (!editForm.date) {
      setEditError('אנא בחרו תאריך תרומה.');
      return;
    }

    setSavingEdit(true);
    setEditError(null);

    const trimmedPdfUrl = editForm.pdfUrl.trim();

    try {
      const response = await fetch(`${API_URL}/donations/${editingDonation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parsedAmount,
          date: editForm.date,
          description: editForm.purpose,
          pdfUrl: trimmedPdfUrl || null,
          fundNumber: editForm.fundNumber.trim() || null,
        })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Failed to update donation', data);
        setEditError('שמירת התרומה נכשלה. נסו שוב מאוחר יותר.');
        return;
      }

      const amountFromServer =
        typeof data.amount === 'number' ? data.amount : Number(data.amount);
      const updatedAmount = Number.isFinite(amountFromServer)
        ? amountFromServer
        : parsedAmount;
      const updatedDate = typeof data.date === 'string' && data.date ? data.date : editForm.date;
      const updatedDescription = typeof data.description === 'string' ? data.description : editForm.purpose;
      const updatedPdfUrl =
        typeof data.pdfUrl === 'string' && data.pdfUrl
          ? data.pdfUrl
          : trimmedPdfUrl
            ? trimmedPdfUrl
            : undefined;
      const updatedEmailSent =
        typeof data.emailSent === 'boolean' ? data.emailSent : editingDonation.emailSent;
      const updatedFundNumber =
        typeof data.fundNumber === 'string' ? data.fundNumber : editForm.fundNumber;

      setDonations(prevDonations =>
        prevDonations.map(donation => {
          if (donation.id !== editingDonation.id) {
            return donation;
          }

          const sanitizedPdfUrl = updatedPdfUrl ? updatedPdfUrl.trim() : '';
          const hasPdf = sanitizedPdfUrl.length > 0;
          const nextStatus: DonationStatus = updatedEmailSent
            ? 'נשלח'
            : hasPdf
              ? 'ממתין'
              : 'התקבל';

          return {
            ...donation,
            amount: updatedAmount,
            date: updatedDate,
            purpose: updatedDescription || '',
            pdfUrl: hasPdf ? sanitizedPdfUrl : undefined,
            emailSent: updatedEmailSent,
            fundNumber: updatedFundNumber?.trim() || '',
            status: nextStatus,
          };
        })
      );

      closeEditModal();
    } catch (err) {
      console.error('Failed to update donation', err);
      setEditError('אירעה שגיאה בשמירת התרומה. נסו שוב מאוחר יותר.');
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="space-y-6">
      {isSearchModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={() => setIsSearchModalOpen(false)}
        >
          <div
            className="bg-white rounded-lg shadow-lg w-full max-w-md p-6"
            onClick={event => event.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">חיפוש תרומות</h2>
              <button
                type="button"
                onClick={() => setIsSearchModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="סגור חלון החיפוש"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleModalSearch} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700" htmlFor="donations-modal-search">
                  מה תרצו לחפש?
                </label>
                <input
                  id="donations-modal-search"
                  ref={modalSearchInputRef}
                  type="text"
                  value={modalSearchTerm}
                  onChange={event => setModalSearchTerm(event.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="הקלידו שם תורם או מייל"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
                >
                  חפש
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">תרומות</h1>
          <p className="text-gray-600 mt-2">ניהול ומעקב אחרי תרומות שהתקבלו במערכת</p>
          <p className="text-sm text-gray-500 mt-1">לחיצה על F5 תפתח חלון חיפוש.</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">סה"כ תרומות</p>
                <p className="text-2xl font-semibold text-gray-900">{formatCurrency(totalAmount)}</p>

              </div>
              <div className="bg-blue-50 text-blue-600 p-3 rounded-full">
                <HandCoins className="h-6 w-6" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">תרומות שממתינות לשליחה</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {donations.filter(donation => donation.status === 'ממתין').length}


                </p>
              </div>
              <div className="bg-amber-50 text-amber-600 p-3 rounded-full">
                <Mail className="h-6 w-6" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">תרומות שנשלחו</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {donations.filter(donation => donation.status === 'נשלח').length}
                </p>
              </div>
              <div className="bg-green-50 text-green-600 p-3 rounded-full">
                <Calendar className="h-6 w-6" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2 bg-gray-50 rounded-full px-4 py-2 w-full lg:w-80">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={event => setSearchTerm(event.target.value)}
                placeholder="חיפוש לפי שם או מייל"
                className="bg-transparent w-full focus:outline-none text-sm text-gray-700"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={event => setStatusFilter(event.target.value as typeof statusFilter)}
                  className="appearance-none pl-4 pr-9 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm text-gray-700 focus:outline-none"
                >
                  <option value="all">כל הסטטוסים</option>
                  <option value="התקבל">התקבל</option>
                  <option value="ממתין">ממתין</option>
                  <option value="נשלח">נשלח</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  aria-sort={getAriaSort('donorName')}
                >
                  <button
                    type="button"
                    onClick={() => handleSort('donorName')}
                    className="flex w-full items-center justify-end gap-1"
                  >
                    <span>תורם</span>
                    {renderSortIcon('donorName')}
                  </button>
                </th>
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  aria-sort={getAriaSort('donorEmail')}
                >
                  <button
                    type="button"
                    onClick={() => handleSort('donorEmail')}
                    className="flex w-full items-center justify-end gap-1"
                  >
                    <span>אימייל</span>
                    {renderSortIcon('donorEmail')}
                  </button>
                </th>
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  aria-sort={getAriaSort('date')}
                >
                  <button
                    type="button"
                    onClick={() => handleSort('date')}
                    className="flex w-full items-center justify-end gap-1"
                  >
                    <span>תאריך</span>
                    {renderSortIcon('date')}
                  </button>
                </th>
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  aria-sort={getAriaSort('fundNumber')}
                >
                  <button
                    type="button"
                    onClick={() => handleSort('fundNumber')}
                    className="flex w-full items-center justify-end gap-1"
                  >
                    <span>מס_קרן</span>
                    {renderSortIcon('fundNumber')}
                  </button>
                </th>
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  aria-sort={getAriaSort('amount')}
                >
                  <button
                    type="button"
                    onClick={() => handleSort('amount')}
                    className="flex w-full items-center justify-end gap-1"
                  >
                    <span>סכום</span>
                    {renderSortIcon('amount')}
                  </button>
                </th>
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  aria-sort={getAriaSort('status')}
                >
                  <button
                    type="button"
                    onClick={() => handleSort('status')}
                    className="flex w-full items-center justify-end gap-1"
                  >
                    <span>סטטוס</span>
                    {renderSortIcon('status')}
                  </button>
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider text-center">פעולות</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-gray-500 text-sm">
                    טוען נתוני תרומות...
                  </td>
                </tr>
              ) : filteredDonations.length > 0 ? (

                filteredDonations.map((donation, index) => {
                  const isActiveRow = focusedDonationIndex === index;
                  const isTabStop = focusedDonationIndex == null ? index === 0 : isActiveRow;

                  return (
                    <tr
                      key={donation.id}
                      ref={element => {
                        donationRowRefs.current[index] = element;
                      }}
                      className={`hover:bg-gray-50 transition-colors focus:outline-none ${
                        isActiveRow ? 'bg-blue-50/50 ring-2 ring-blue-400/60' : ''
                      }`}
                      tabIndex={isTabStop ? 0 : -1}
                      onFocus={() => setFocusedDonationIndex(index)}
                      onKeyDown={event => handleDonationRowKeyDown(event, index, donation)}
                      onDoubleClick={() => openEditModal(donation)}
                    >

                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div className="flex flex-col">
                        <span>{donation.donorName}</span>
                        <span className="text-xs text-gray-400">מספר תורם: {donation.donorNumber}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{donation.donorEmail || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {donation.date ? new Date(donation.date).toLocaleDateString('he-IL') : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{donation.fundNumber || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {formatCurrency(donation.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                          donation.status === 'התקבל'
                            ? 'bg-green-50 text-green-700'
                            : donation.status === 'נשלח'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {donation.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenDonorCard(donation)}
                          disabled={!donation.donorId && !donation.donorNumber}
                          className="inline-flex h-9 w-9 items-center justify-center text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 disabled:opacity-60 disabled:cursor-not-allowed rounded-full transition-colors"
                          aria-label="פתח כרטיס תורם"
                        >
                          <UserRound className="h-4 w-4" />
                          <span className="sr-only">פתח כרטיס תורם</span>
                        </button>
                        <button
                          onClick={() => openEditModal(donation)}
                          className="inline-flex h-9 w-9 items-center justify-center text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-full transition-colors"
                          aria-label="ערוך תרומה"
                        >
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">ערוך תרומה</span>
                        </button>
                        <button
                          onClick={() => handleSendEmail(donation)}
                          disabled={sendingId === donation.id || !donation.donorEmail}
                          className="inline-flex h-9 w-9 items-center justify-center text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-60 disabled:cursor-not-allowed rounded-full transition-colors"
                          aria-label="שלח מייל"
                        >
                          <Mail className="h-4 w-4" />
                          <span className="sr-only">שלח מייל</span>
                        </button>
                        <button
                          onClick={() => handleDeleteDonation(donation.id)}
                          disabled={deletingId === donation.id}
                          className="inline-flex h-9 w-9 items-center justify-center text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-60 disabled:cursor-not-allowed rounded-full transition-colors"
                          aria-label={deletingId === donation.id ? 'מוחק תרומה' : 'מחק תרומה'}
                        >
                          <Trash className="h-4 w-4" />
                          <span className="sr-only">{deletingId === donation.id ? 'מוחק תרומה' : 'מחק תרומה'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-gray-500 text-sm">
                    לא נמצאו תרומות התואמות לחיפוש.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {error && (
          <div className="px-6 pb-6 text-sm text-red-600">{error}</div>

        )}
      </div>

      {editingDonation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">עריכת תרומה</h2>
                <p className="mt-1 text-sm text-gray-500">
                  {editingDonation.donorName} • סכום נוכחי: {formatCurrency(editingDonation.amount)}
                </p>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                disabled={savingEdit}
                className="text-gray-400 transition-colors hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="סגור חלון עריכה"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="edit-amount">
                  סכום התרומה
                </label>
                <input
                  id="edit-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.amount}
                  onChange={event =>
                    setEditForm(prev => ({
                      ...prev,
                      amount: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="לדוגמה: 250"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="edit-date">
                  תאריך התרומה
                </label>
                <input
                  id="edit-date"
                  type="date"
                  value={editForm.date}
                  onChange={event =>
                    setEditForm(prev => ({
                      ...prev,
                      date: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="edit-fund-number">
                  מס_קרן
                </label>
                <input
                  id="edit-fund-number"
                  type="text"
                  value={editForm.fundNumber}
                  onChange={event =>
                    setEditForm(prev => ({
                      ...prev,
                      fundNumber: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="לדוגמה: 1234"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="edit-purpose">
                  ייעוד התרומה
                </label>
                <input
                  id="edit-purpose"
                  type="text"
                  value={editForm.purpose}
                  onChange={event =>
                    setEditForm(prev => ({
                      ...prev,
                      purpose: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="ייעוד התרומה"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="edit-pdf">
                  קובץ קבלה (קישור)
                </label>
                <input
                  id="edit-pdf"
                  type="text"
                  value={editForm.pdfUrl}
                  onChange={event =>
                    setEditForm(prev => ({
                      ...prev,
                      pdfUrl: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="הדביקו קישור לקובץ PDF (לא חובה)"
                />
                {editingDonation.pdfUrl && (
                  <a
                    href={`${API_URL}${editingDonation.pdfUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-sm text-blue-600 hover:underline"
                  >
                    צפייה בקובץ הנוכחי
                  </a>
                )}
              </div>

              {editError && <p className="text-sm text-red-600">{editError}</p>}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={savingEdit}
                  className="rounded-full px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {savingEdit ? 'שומר...' : 'שמור שינויים'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
