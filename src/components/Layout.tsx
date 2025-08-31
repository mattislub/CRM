import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Users, CreditCard, FileText, Home, Receipt, Target } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8 space-x-reverse">
              <Link to="/" className="flex items-center space-x-2 space-x-reverse">
                <Home className="h-8 w-8 text-blue-600" />
                <span className="font-bold text-xl text-gray-900">מערכת תרומות</span>
              </Link>
              
              <div className="flex space-x-4 space-x-reverse">
                <Link
                  to="/customers"
                  className={`flex items-center space-x-2 space-x-reverse px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/customers')
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Users className="h-4 w-4" />
                  <span>לקוחות</span>
                </Link>
                
                <Link
                  to="/charges"
                  className={`flex items-center space-x-2 space-x-reverse px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/charges')
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <CreditCard className="h-4 w-4" />
                  <span>חיובים</span>
                </Link>
                
                <Link
                  to="/receipts"
                  className={`flex items-center space-x-2 space-x-reverse px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/receipts')
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Receipt className="h-4 w-4" />
                  <span>קבלות</span>
                </Link>
                
                <Link
                  to="/funds"
                  className={`flex items-center space-x-2 space-x-reverse px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/funds')
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Target className="h-4 w-4" />
                  <span>קרנות</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}