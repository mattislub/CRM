import React from 'react';
import { Calendar } from 'lucide-react';
import { HebrewDateUtils } from '../utils/hebrewDate';

interface HebrewDateProps {
  date: Date;
  showIcon?: boolean;
  showYear?: boolean;
  className?: string;
}

export default function HebrewDate({ date, showIcon = true, showYear = true, className = '' }: HebrewDateProps) {
  const gregorianDate = date.toLocaleDateString('he-IL');
  const hebrewDate = showYear 
    ? HebrewDateUtils.toHebrewDate(date)
    : HebrewDateUtils.toShortHebrewDate(date);

  return (
    <div className={`flex items-center space-x-2 space-x-reverse ${className}`}>
      {showIcon && <Calendar className="h-4 w-4 text-gray-400" />}
      <div className="text-sm">
        <div className="font-medium text-gray-900">{gregorianDate}</div>
        {hebrewDate && (
          <div className="text-xs text-blue-600 font-hebrew">{hebrewDate}</div>
        )}
      </div>
    </div>
  );
}