import { HDate, months } from '@hebcal/core';

export class HebrewDateUtils {
  /**
   * המרת תאריך לועזי לתאריך עברי
   */
  static toHebrewDate(gregorianDate: Date): string {
    try {
      const hDate = new HDate(gregorianDate);
      const hebrewDay = hDate.getDate();
      const hebrewMonth = months[hDate.getMonth()].he;
      const hebrewYear = hDate.getFullYear();
      
      return `${this.formatHebrewNumber(hebrewDay)} ${hebrewMonth} ${this.formatHebrewYear(hebrewYear)}`;
    } catch (error) {
      console.error('Error converting to Hebrew date:', error);
      return '';
    }
  }

  /**
   * המרת מספר לגרש עברי
   */
  static formatHebrewNumber(num: number): string {
    const hebrewNumerals: { [key: number]: string } = {
      1: 'א\'', 2: 'ב\'', 3: 'ג\'', 4: 'ד\'', 5: 'ה\'',
      6: 'ו\'', 7: 'ז\'', 8: 'ח\'', 9: 'ט\'', 10: 'י\'',
      11: 'י"א', 12: 'י"ב', 13: 'י"ג', 14: 'י"ד', 15: 'ט"ו',
      16: 'ט"ז', 17: 'י"ז', 18: 'י"ח', 19: 'י"ט', 20: 'כ\'',
      21: 'כ"א', 22: 'כ"ב', 23: 'כ"ג', 24: 'כ"ד', 25: 'כ"ה',
      26: 'כ"ו', 27: 'כ"ז', 28: 'כ"ח', 29: 'כ"ט', 30: 'ל\''
    };

    return hebrewNumerals[num] || num.toString();
  }

  /**
   * עיצוב שנה עברית
   */
  static formatHebrewYear(year: number): string {
    // המרה פשוטה לתצוגה - ניתן להרחיב
    return `תשפ"${this.getHebrewYearSuffix(year)}`;
  }

  /**
   * קבלת סיומת שנה עברית
   */
  private static getHebrewYearSuffix(year: number): string {
    const lastDigit = year % 10;
    const suffixes: { [key: number]: string } = {
      0: 'ף', 1: 'א', 2: 'ב', 3: 'ג', 4: 'ד',
      5: 'ה', 6: 'ו', 7: 'ז', 8: 'ח', 9: 'ט'
    };
    return suffixes[lastDigit] || lastDigit.toString();
  }

  /**
   * קבלת תאריך עברי קצר (ללא שנה)
   */
  static toShortHebrewDate(gregorianDate: Date): string {
    try {
      const hDate = new HDate(gregorianDate);
      const hebrewDay = hDate.getDate();
      const hebrewMonth = months[hDate.getMonth()].he;
      
      return `${this.formatHebrewNumber(hebrewDay)} ${hebrewMonth}`;
    } catch (error) {
      console.error('Error converting to short Hebrew date:', error);
      return '';
    }
  }
}