import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Users, HandCoins } from 'lucide-react';

interface PageLink {
  title: string;
  description: string;
  to: string;
  icon: React.ReactNode;
}

const pageLinks: PageLink[] = [
  {
    title: 'קבצי PDF',
    description: 'העלה ונהל את כל קבצי ה-PDF במערכת',
    to: '/pdfs',
    icon: <FileText className="h-12 w-12 text-blue-600" />
  },
  {
    title: 'תורמים',
    description: 'נהל את רשימת התורמים ופרטי הקשר שלהם',
    to: '/donors',
    icon: <Users className="h-12 w-12 text-blue-600" />
  },
  {
    title: 'תרומות',
    description: 'עקוב אחר תרומות והיסטוריה פיננסית',
    to: '/donations',
    icon: <HandCoins className="h-12 w-12 text-blue-600" />
  }
];

export default function HomePage() {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-900">ברוכים הבאים למערכת הניהול</h1>
        <p className="text-lg text-gray-600">
          בחרו באחד מהאזורים הבאים כדי להתחיל לעבוד עם המערכת
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
        {pageLinks.map(page => (
          <Link
            key={page.to}
            to={page.to}
            className="block bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow p-8 border border-transparent hover:border-blue-200"
          >
            <div className="flex flex-col items-center space-y-6 text-center">
              <div className="bg-blue-50 rounded-full p-6 w-28 h-28 flex items-center justify-center">
                {page.icon}
              </div>
              <div className="space-y-3">
                <h2 className="text-2xl font-semibold text-gray-900">{page.title}</h2>
                <p className="text-gray-600 text-base">{page.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
