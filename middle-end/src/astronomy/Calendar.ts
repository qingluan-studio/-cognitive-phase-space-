import { DataPacket, PacketMeta } from '../shared/types';

/** A calendar system. */
export interface Calendar {
  system: string;
  date: { year: number; month: number; day: number };
  epoch: number;
  leap: boolean;
}

/** A date conversion result. */
export interface DateConversion {
  from: string;
  to: string;
  input: { year: number; month: number; day: number };
  output: { year: number; month: number; day: number };
  julianDay: number;
}

/** Leap year rule. */
export interface LeapRule {
  calendar: string;
  rule: string;
  cycle: number;
  leapYearsInCycle: number;
}

/** ISO 8601 week date. */
export interface WeekDate {
  year: number;
  week: number;
  day: number; // 1-7 (Mon-Sun)
}

/** Solar position. */
export interface SolarPosition {
  declination: number; // degrees
  rightAscension: number; // degrees
  equationOfTime: number; // minutes
  distanceAU: number;
  trueAnomaly: number; // degrees
}

/** Moon phase details. */
export interface MoonPhaseInfo {
  phase: string;
  illumination: number; // 0-1
  age: number; // days since new moon
  phaseAngle: number; // degrees
}

/** Eclipse prediction. */
export interface EclipsePrediction {
  type: string;
  likely: boolean;
  nextDate: string;
  daysToNext: number;
}

/** Zodiac descriptor. */
export interface ZodiacSign {
  sign: string;
  symbol: string;
  startDate: string;
  endDate: string;
  element: 'fire' | 'earth' | 'air' | 'water';
  modality: 'cardinal' | 'fixed' | 'mutable';
  ruler: string;
}

/** Holiday descriptor. */
export interface Holiday {
  name: string;
  date: { year: number; month: number; day: number };
  type: 'religious' | 'cultural' | 'astronomical' | 'secular';
  calendar: string;
}

/** Solar term descriptor. */
export interface SolarTerm {
  name: string;
  longitude: number;
  approximateDate: string;
  season: string;
}

/** Calendrical cycle descriptor. */
export interface CalendricalCycle {
  name: string;
  lengthDays: number;
  lengthYears: number;
  description: string;
}

/** History record. */
interface CalendarRecord {
  operation: string;
  target: string;
  timestamp: number;
}

const CHINESE_HEAVENLY_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const CHINESE_EARTHLY_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

const WESTERN_ZODIAC: ZodiacSign[] = [
  { sign: 'Aries', symbol: '♈', startDate: 'Mar 21', endDate: 'Apr 19', element: 'fire', modality: 'cardinal', ruler: 'Mars' },
  { sign: 'Taurus', symbol: '♉', startDate: 'Apr 20', endDate: 'May 20', element: 'earth', modality: 'fixed', ruler: 'Venus' },
  { sign: 'Gemini', symbol: '♊', startDate: 'May 21', endDate: 'Jun 20', element: 'air', modality: 'mutable', ruler: 'Mercury' },
  { sign: 'Cancer', symbol: '♋', startDate: 'Jun 21', endDate: 'Jul 22', element: 'water', modality: 'cardinal', ruler: 'Moon' },
  { sign: 'Leo', symbol: '♌', startDate: 'Jul 23', endDate: 'Aug 22', element: 'fire', modality: 'fixed', ruler: 'Sun' },
  { sign: 'Virgo', symbol: '♍', startDate: 'Aug 23', endDate: 'Sep 22', element: 'earth', modality: 'mutable', ruler: 'Mercury' },
  { sign: 'Libra', symbol: '♎', startDate: 'Sep 23', endDate: 'Oct 22', element: 'air', modality: 'cardinal', ruler: 'Venus' },
  { sign: 'Scorpio', symbol: '♏', startDate: 'Oct 23', endDate: 'Nov 21', element: 'water', modality: 'fixed', ruler: 'Mars/Pluto' },
  { sign: 'Sagittarius', symbol: '♐', startDate: 'Nov 22', endDate: 'Dec 21', element: 'fire', modality: 'mutable', ruler: 'Jupiter' },
  { sign: 'Capricorn', symbol: '♑', startDate: 'Dec 22', endDate: 'Jan 19', element: 'earth', modality: 'cardinal', ruler: 'Saturn' },
  { sign: 'Aquarius', symbol: '♒', startDate: 'Jan 20', endDate: 'Feb 18', element: 'air', modality: 'fixed', ruler: 'Saturn/Uranus' },
  { sign: 'Pisces', symbol: '♓', startDate: 'Feb 19', endDate: 'Mar 20', element: 'water', modality: 'mutable', ruler: 'Jupiter/Neptune' },
];

const CHINESE_ZODIAC_ANIMALS = ['Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake', 'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Pig'];

const CHINESE_ZODIAC_CHINESE = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];

const CHINESE_ELEMENTS = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'];
const CHINESE_ELEMENTS_CHINESE = ['木', '火', '土', '金', '水'];

const CALENDAR_SYSTEMS = [
  { name: 'gregorian', epoch: '0001-01-01', daysInYear: 365.2425, type: 'solar' },
  { name: 'julian', epoch: '0045-01-01', daysInYear: 365.25, type: 'solar' },
  { name: 'hebrew', epoch: '-3761-10-07', daysInYear: 365.2468, type: 'lunisolar' },
  { name: 'islamic', epoch: '0622-07-16', daysInYear: 354.367, type: 'lunar' },
  { name: 'persian', epoch: '0622-03-22', daysInYear: 365.2424, type: 'solar' },
  { name: 'indian', epoch: '0079-03-22', daysInYear: 365.2425, type: 'solar' },
  { name: 'chinese', epoch: '-2637-01-01', daysInYear: 365.2425, type: 'lunisolar' },
  { name: 'coptic', epoch: '0284-08-29', daysInYear: 365.25, type: 'solar' },
  { name: 'ethiopian', epoch: '0008-08-29', daysInYear: 365.25, type: 'solar' },
  { name: 'mayan-long-count', epoch: '-3114-08-11', daysInYear: 365.0, type: 'solar' },
  { name: 'bahai', epoch: '1844-03-21', daysInYear: 365.2422, type: 'solar' },
  { name: 'french-republican', epoch: '1792-09-22', daysInYear: 365.2422, type: 'solar' },
];

const MONTH_NAMES_GREGORIAN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const PLANETARY_DAY_NAMES = [
  'Sun-day', 'Moon-day', 'Mars-day (Tiw)', 'Mercury-day (Woden)',
  'Jupiter-day (Thor)', 'Venus-day (Frigg)', 'Saturn-day',
];

/** Calendrical cycle data. */
const CALENDRICAL_CYCLES: CalendricalCycle[] = [
  { name: 'Solar cycle (28 years)', lengthDays: 10227, lengthYears: 28, description: 'Gregorian cycle of weekdays' },
  { name: 'Metonic cycle', lengthDays: 6939.69, lengthYears: 19, description: 'lunar phases repeat on same solar dates' },
  { name: 'Callippic cycle', lengthDays: 27759, lengthYears: 76, description: 'improved Metonic cycle (4×19)' },
  { name: 'Saros', lengthDays: 6585.32, lengthYears: 18.03, description: 'eclipse cycle of 223 synodic months' },
  { name: 'Draconic cycle', lengthDays: 6798.38, lengthYears: 18.61, description: 'node return (242 draconic months)' },
  { name: 'Inex', lengthDays: 10571.95, lengthYears: 29.03, description: '358 synodic months, saros family link' },
  { name: 'Octaeteris', lengthDays: 2922, lengthYears: 8, description: 'lunisolar cycle of 99 synodic months' },
  { name: 'Indiction', lengthDays: 13323, lengthYears: 15, description: 'Roman tax cycle' },
  { name: 'Golden number cycle', lengthDays: 6939.69, lengthYears: 19, description: 'same as Metonic, used for Easter dating' },
];

/** Solar terms (24 in Chinese calendar). */
const SOLAR_TERMS: SolarTerm[] = [
  { name: '立春', longitude: 315, approximateDate: 'Feb 4', season: 'spring begins' },
  { name: '雨水', longitude: 330, approximateDate: 'Feb 19', season: 'rain water' },
  { name: '惊蛰', longitude: 345, approximateDate: 'Mar 6', season: 'awakening insects' },
  { name: '春分', longitude: 0, approximateDate: 'Mar 21', season: 'spring equinox' },
  { name: '清明', longitude: 15, approximateDate: 'Apr 5', season: 'pure brightness' },
  { name: '谷雨', longitude: 30, approximateDate: 'Apr 20', season: 'grain rain' },
  { name: '立夏', longitude: 45, approximateDate: 'May 6', season: 'summer begins' },
  { name: '小满', longitude: 60, approximateDate: 'May 21', season: 'grain buds' },
  { name: '芒种', longitude: 75, approximateDate: 'Jun 6', season: 'grain in ear' },
  { name: '夏至', longitude: 90, approximateDate: 'Jun 21', season: 'summer solstice' },
  { name: '小暑', longitude: 105, approximateDate: 'Jul 7', season: 'minor heat' },
  { name: '大暑', longitude: 120, approximateDate: 'Jul 23', season: 'major heat' },
  { name: '立秋', longitude: 135, approximateDate: 'Aug 8', season: 'autumn begins' },
  { name: '处暑', longitude: 150, approximateDate: 'Aug 23', season: 'end of heat' },
  { name: '白露', longitude: 165, approximateDate: 'Sep 8', season: 'white dew' },
  { name: '秋分', longitude: 180, approximateDate: 'Sep 23', season: 'autumn equinox' },
  { name: '寒露', longitude: 195, approximateDate: 'Oct 8', season: 'cold dew' },
  { name: '霜降', longitude: 210, approximateDate: 'Oct 23', season: 'frost descent' },
  { name: '立冬', longitude: 225, approximateDate: 'Nov 7', season: 'winter begins' },
  { name: '小雪', longitude: 240, approximateDate: 'Nov 22', season: 'minor snow' },
  { name: '大雪', longitude: 255, approximateDate: 'Dec 7', season: 'major snow' },
  { name: '冬至', longitude: 270, approximateDate: 'Dec 22', season: 'winter solstice' },
  { name: '小寒', longitude: 285, approximateDate: 'Jan 6', season: 'minor cold' },
  { name: '大寒', longitude: 300, approximateDate: 'Jan 20', season: 'major cold' },
];

/** Main calendar system. */
export class CalendarSystem {
  private _calendars: Map<string, Calendar> = new Map();
  private _conversions: DateConversion[] = [];
  private _history: CalendarRecord[] = [];
  private _counter = 0;

  /** Create a Gregorian calendar entry. */
  gregorian(year: number, month: number, day: number): Calendar {
    const leap = this.leapYear(year, 'gregorian');
    const jd = this.julianDay({ year, month, day });
    const cal: Calendar = {
      system: 'gregorian',
      date: { year, month, day },
      epoch: 577736 + jd,
      leap,
    };
    this._calendars.set(`gregorian-${++this._counter}`, cal);
    this._history.push({ operation: 'gregorian', target: `${year}-${month}-${day}`, timestamp: Date.now() });
    return cal;
  }

  /** Create a Julian calendar entry. */
  julian(year: number, month: number, day: number): Calendar {
    const leap = (year % 4) === 0;
    const cal: Calendar = {
      system: 'julian',
      date: { year, month, day },
      epoch: 0,
      leap,
    };
    this._calendars.set(`julian-${++this._counter}`, cal);
    this._history.push({ operation: 'julian', target: `${year}-${month}-${day}`, timestamp: Date.now() });
    return cal;
  }

  /** Create a lunar calendar entry. */
  lunar(month: number, day: number, leap: boolean): Calendar {
    const cal: Calendar = {
      system: 'lunar',
      date: { year: 0, month, day },
      epoch: 0,
      leap,
    };
    this._calendars.set(`lunar-${++this._counter}`, cal);
    this._history.push({ operation: 'lunar', target: `${month}-${day}`, timestamp: Date.now() });
    return cal;
  }

  /** Create an Islamic (Hijri) calendar entry. */
  islamic(year: number, month: number, day: number): Calendar {
    const leap = (year * 11 + 14) % 30 < 11;
    const cal: Calendar = {
      system: 'islamic',
      date: { year, month, day },
      epoch: 0,
      leap,
    };
    this._calendars.set(`islamic-${++this._counter}`, cal);
    this._history.push({ operation: 'islamic', target: `${year}-${month}-${day}`, timestamp: Date.now() });
    return cal;
  }

  /** Create a Hebrew calendar entry. */
  hebrew(year: number, month: number, day: number): Calendar {
    const cycle = year % 19;
    const leap = [0, 3, 6, 8, 11, 14, 17].includes(cycle);
    const cal: Calendar = {
      system: 'hebrew',
      date: { year, month, day },
      epoch: 0,
      leap,
    };
    this._calendars.set(`hebrew-${++this._counter}`, cal);
    this._history.push({ operation: 'hebrew', target: `${year}-${month}-${day}`, timestamp: Date.now() });
    return cal;
  }

  /** Create a Chinese calendar entry. */
  chinese(year: number, month: number, day: number, leap: boolean): Calendar {
    const stemIdx = ((year - 4) % 10 + 10) % 10;
    const branchIdx = ((year - 4) % 12 + 12) % 12;
    const stem = CHINESE_HEAVENLY_STEMS[stemIdx] ?? '甲';
    const branch = CHINESE_EARTHLY_BRANCHES[branchIdx] ?? '子';
    const cal: Calendar = {
      system: 'chinese',
      date: { year, month, day },
      epoch: 0,
      leap,
    };
    this._calendars.set(`chinese-${stem}${branch}-${++this._counter}`, cal);
    this._history.push({ operation: 'chinese', target: `${stem}${branch}`, timestamp: Date.now() });
    return cal;
  }

  /** Create a Mayan Long Count calendar entry. */
  mayan(longCount: number[]): Calendar {
    const baktun = longCount[0] ?? 0;
    const katun = longCount[1] ?? 0;
    const tun = longCount[2] ?? 0;
    const uinal = longCount[3] ?? 0;
    const kin = longCount[4] ?? 0;
    const totalDays = baktun * 144000 + katun * 7200 + tun * 360 + uinal * 20 + kin;
    const cal: Calendar = {
      system: 'mayan',
      date: { year: baktun, month: katun, day: tun },
      epoch: totalDays,
      leap: false,
    };
    this._calendars.set(`mayan-${++this._counter}`, cal);
    this._history.push({ operation: 'mayan', target: `${baktun}.${katun}.${tun}.${uinal}.${kin}`, timestamp: Date.now() });
    return cal;
  }

  /** Create a Persian (Solar Hijri) calendar entry. */
  persian(year: number, month: number, day: number): Calendar {
    // Persian calendar uses a 33-year cycle with 8 leap years (33-29-33-29-33-29 pattern variants)
    const cycle = ((year % 33) + 33) % 33;
    const leapYears = [1, 5, 9, 13, 17, 22, 26, 30];
    const leap = leapYears.includes(cycle);
    const cal: Calendar = {
      system: 'persian',
      date: { year, month, day },
      epoch: 0,
      leap,
    };
    this._calendars.set(`persian-${++this._counter}`, cal);
    this._history.push({ operation: 'persian', target: `${year}-${month}-${day}`, timestamp: Date.now() });
    return cal;
  }

  /** Create an Indian National Calendar (Saka) entry. */
  indian(year: number, month: number, day: number): Calendar {
    // Saka calendar: leap year follows Gregorian rules
    const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    const cal: Calendar = {
      system: 'indian',
      date: { year, month, day },
      epoch: 0,
      leap,
    };
    this._calendars.set(`indian-${++this._counter}`, cal);
    this._history.push({ operation: 'indian', target: `${year}-${month}-${day}`, timestamp: Date.now() });
    return cal;
  }

  /** Create a Coptic calendar entry. */
  coptic(year: number, month: number, day: number): Calendar {
    // Coptic: 13 months of 30 days + 5 or 6 epagomenal days
    const leap = year % 4 === 3;
    const cal: Calendar = {
      system: 'coptic',
      date: { year, month, day },
      epoch: 0,
      leap,
    };
    this._calendars.set(`coptic-${++this._counter}`, cal);
    this._history.push({ operation: 'coptic', target: `${year}-${month}-${day}`, timestamp: Date.now() });
    return cal;
  }

  /** Create an Ethiopian calendar entry. */
  ethiopian(year: number, month: number, day: number): Calendar {
    // Ethiopian: 13 months (12×30 + 5/6), leap year is year before Gregorian leap
    const leap = (year + 1) % 4 === 0;
    const cal: Calendar = {
      system: 'ethiopian',
      date: { year, month, day },
      epoch: 0,
      leap,
    };
    this._calendars.set(`ethiopian-${++this._counter}`, cal);
    this._history.push({ operation: 'ethiopian', target: `${year}-${month}-${day}`, timestamp: Date.now() });
    return cal;
  }

  /** Create a Bahá'í calendar entry (19 months × 19 days + intercalary). */
  bahai(year: number, month: number, day: number): Calendar {
    const leap = this.leapYear(year, 'gregorian');
    const cal: Calendar = {
      system: 'bahai',
      date: { year, month, day },
      epoch: 0,
      leap,
    };
    this._calendars.set(`bahai-${++this._counter}`, cal);
    this._history.push({ operation: 'bahai', target: `${year}-${month}-${day}`, timestamp: Date.now() });
    return cal;
  }

  /** Create a French Republican calendar entry. */
  frenchRepublican(year: number, month: number, day: number): Calendar {
    // 12 months × 30 days + 5-6 sansculottides
    const leap = (year % 4 === 3 && year !== 100 && year !== 200) || year % 400 === 3;
    const cal: Calendar = {
      system: 'french-republican',
      date: { year, month, day },
      epoch: 0,
      leap,
    };
    this._calendars.set(`french-${++this._counter}`, cal);
    this._history.push({ operation: 'frenchRepublican', target: `${year}-${month}-${day}`, timestamp: Date.now() });
    return cal;
  }

  /** Compute the Julian Day Number from a Gregorian date. */
  julianDay(date: { year: number; month: number; day: number }): number {
    const { year, month, day } = date;
    const a = Math.floor((14 - month) / 12);
    const y = year + 4800 - a;
    const m = month + 12 * a - 3;
    return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  }

  /** Day of week (0 = Sunday, 6 = Saturday). */
  dayOfWeek(date: { year: number; month: number; day: number }): number {
    const jd = this.julianDay(date);
    return ((jd + 1) % 7 + 7) % 7;
  }

  /** Day of week name (e.g. 'Monday'). */
  dayOfWeekName(date: { year: number; month: number; day: number }): string {
    return DAY_NAMES[this.dayOfWeek(date)] ?? 'Unknown';
  }

  /** Planetary day name (e.g. 'Sun-day'). */
  planetaryDayName(date: { year: number; month: number; day: number }): string {
    return PLANETARY_DAY_NAMES[this.dayOfWeek(date)] ?? 'Unknown';
  }

  /** Day of year (1-366). */
  dayOfYear(date: { year: number; month: number; day: number }): number {
    const jd = this.julianDay(date);
    const jan1 = this.julianDay({ year: date.year, month: 1, day: 1 });
    return jd - jan1 + 1;
  }

  /** Day remaining in the year. */
  daysRemainingInYear(date: { year: number; month: number; day: number }): number {
    const totalDays = this.leapYear(date.year, 'gregorian') ? 366 : 365;
    return totalDays - this.dayOfYear(date);
  }

  /** Week of year (ISO 8601). */
  weekOfYear(date: { year: number; month: number; day: number }): WeekDate {
    const doy = this.dayOfYear(date);
    const dow = this.dayOfWeek(date);
    const isoDow = dow === 0 ? 7 : dow;
    const week = Math.ceil((doy - isoDow + 10) / 7);
    let year = date.year;
    let resultWeek = week;
    if (week < 1) {
      year = date.year - 1;
      resultWeek = this.weeksInYear(year);
    } else if (week > this.weeksInYear(date.year)) {
      year = date.year + 1;
      resultWeek = 1;
    }
    return { year, week: resultWeek, day: isoDow };
  }

  /** Number of weeks in a year (ISO 8601: 52 or 53). */
  weeksInYear(year: number): number {
    const jan1Dow = this.dayOfWeek({ year, month: 1, day: 1 });
    const dec31Dow = this.dayOfWeek({ year, month: 12, day: 31 });
    if (jan1Dow === 4 || dec31Dow === 4) return 53;
    return 52;
  }

  /** Leap year determination by calendar. */
  leapYear(year: number, calendar: string = 'gregorian'): boolean {
    switch (calendar) {
      case 'gregorian':
        return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
      case 'julian':
        return year % 4 === 0;
      case 'islamic': {
        const cycle = (year * 11 + 14) % 30;
        return cycle < 11;
      }
      case 'hebrew': {
        const cycle = ((year % 19) + 19) % 19;
        return [0, 3, 6, 8, 11, 14, 17].includes(cycle);
      }
      case 'persian': {
        const cycle = ((year % 33) + 33) % 33;
        return [1, 5, 9, 13, 17, 22, 26, 30].includes(cycle);
      }
      case 'coptic':
        return year % 4 === 3;
      case 'ethiopian':
        return (year + 1) % 4 === 0;
      case 'chinese':
        return this._chineseLeapYear(year);
      default:
        return false;
    }
  }

  /** New Year date for a calendar. */
  newYear(year: number, calendar: string): { year: number; month: number; day: number } {
    switch (calendar) {
      case 'gregorian':
        return { year, month: 1, day: 1 };
      case 'chinese': {
        const stems = CHINESE_HEAVENLY_STEMS[((year - 4) % 10 + 10) % 10] ?? '甲';
        const branches = CHINESE_EARTHLY_BRANCHES[((year - 4) % 12 + 12) % 12] ?? '子';
        return { year, month: 1, day: stems.length + branches.length };
      }
      case 'islamic':
        return { year, month: 1, day: 1 };
      case 'hebrew':
        return { year, month: 7, day: 1 };
      case 'persian':
        return { year, month: 1, day: 1 };
      case 'indian':
        return { year, month: 1, day: 22 };
      case 'ethiopian':
        return { year, month: 1, day: 11 };
      case 'coptic':
        return { year, month: 1, day: 12 };
      default:
        return { year, month: 1, day: 1 };
    }
  }

  /** Convert dates between calendar systems. */
  convert(from: string, to: string, date: { year: number; month: number; day: number }): DateConversion {
    const jd = this.julianDay(date);
    let output = date;
    if (from === 'gregorian' && to === 'julian') {
      output = this._jdToJulian(jd + 13);
    } else if (from === 'julian' && to === 'gregorian') {
      output = this._jdToGregorian(jd - 13);
    } else if (to === 'islamic') {
      output = this._jdToIslamic(jd);
    } else if (to === 'hebrew') {
      output = this._jdToHebrew(jd);
    } else if (to === 'persian') {
      output = this._jdToPersian(jd);
    } else if (to === 'indian') {
      output = this._jdToIndian(jd);
    }
    const conv: DateConversion = {
      from, to, input: date, output, julianDay: jd,
    };
    this._conversions.push(conv);
    this._history.push({ operation: 'convert', target: `${from}→${to}`, timestamp: Date.now() });
    return conv;
  }

  /** Difference in days between two dates. */
  dateDifference(d1: { year: number; month: number; day: number }, d2: { year: number; month: number; day: number }): number {
    return this.julianDay(d2) - this.julianDay(d1);
  }

  /** Add days to a date. */
  addDays(date: { year: number; month: number; day: number }, days: number): { year: number; month: number; day: number } {
    const jd = this.julianDay(date) + days;
    return this._jdToGregorian(jd);
  }

  /** Subtract days from a date. */
  subtractDays(date: { year: number; month: number; day: number }, days: number): { year: number; month: number; day: number } {
    return this.addDays(date, -days);
  }

  /** Add months to a date (clamping day if needed). */
  addMonths(date: { year: number; month: number; day: number }, months: number): { year: number; month: number; day: number } {
    const totalMonths = (date.year * 12 + date.month - 1) + months;
    const newYear = Math.floor(totalMonths / 12);
    const newMonth = (totalMonths % 12 + 12) % 12 + 1;
    const maxDay = this.daysInMonth(newYear, newMonth);
    return { year: newYear, month: newMonth, day: Math.min(date.day, maxDay) };
  }

  /** Add years to a date. */
  addYears(date: { year: number; month: number; day: number }, years: number): { year: number; month: number; day: number } {
    const newYear = date.year + years;
    const maxDay = this.daysInMonth(newYear, date.month);
    return { year: newYear, month: date.month, day: Math.min(date.day, maxDay) };
  }

  /** Days in a given month. */
  daysInMonth(year: number, month: number): number {
    const daysPerMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (month === 2 && this.leapYear(year, 'gregorian')) return 29;
    return daysPerMonth[month - 1] ?? 30;
  }

  /** Days in a year. */
  daysInYear(year: number, calendar: string = 'gregorian'): number {
    if (this.leapYear(year, calendar)) {
      if (calendar === 'islamic') return 355;
      return 366;
    }
    if (calendar === 'islamic') return 354;
    return 365;
  }

  /** Get the solar term by index (1-24). */
  solarTerm(n: number): SolarTerm {
    const idx = ((n - 1) % 24 + 24) % 24;
    return SOLAR_TERMS[idx] ?? SOLAR_TERMS[0]!;
  }

  /** All 24 solar terms. */
  allSolarTerms(): SolarTerm[] {
    return [...SOLAR_TERMS];
  }

  /** Approximate moon phase calculation. */
  moonPhase(date: { year: number; month: number; day: number }): MoonPhaseInfo {
    const jd = this.julianDay(date);
    const synodic = 29.53058867;
    const newMoonRef = 2451549.5;
    const age = ((jd - newMoonRef) % synodic + synodic) % synodic;
    const illumination = (1 - Math.cos(2 * Math.PI * age / synodic)) / 2;
    const phaseAngle = (age / synodic) * 360;
    let phase = 'New Moon';
    if (age < 1.85) phase = 'New Moon';
    else if (age < 5.54) phase = 'Waxing Crescent';
    else if (age < 9.23) phase = 'First Quarter';
    else if (age < 12.92) phase = 'Waxing Gibbous';
    else if (age < 16.61) phase = 'Full Moon';
    else if (age < 20.30) phase = 'Waning Gibbous';
    else if (age < 23.99) phase = 'Last Quarter';
    else if (age < 27.68) phase = 'Waning Crescent';
    else phase = 'New Moon';
    return { phase, illumination, age, phaseAngle };
  }

  /** Next new moon (days until next new moon). */
  nextNewMoon(date: { year: number; month: number; day: number }): number {
    const { age } = this.moonPhase(date);
    return Math.round(29.53058867 - age);
  }

  /** Next full moon (days until next full moon). */
  nextFullMoon(date: { year: number; month: number; day: number }): number {
    const { age } = this.moonPhase(date);
    const fullAge = 14.77;
    if (age <= fullAge) return Math.round(fullAge - age);
    return Math.round(29.53058867 - age + fullAge);
  }

  /** Predict solar/lunar eclipses based on Saros cycle. */
  eclipsePredict(date: { year: number; month: number; day: number }): EclipsePrediction {
    const jd = this.julianDay(date);
    const saros = 223 * 29.53058867;
    const lastEclipse = 2451545.0;
    const cyclesSince = Math.floor((jd - lastEclipse) / saros);
    const daysSinceLast = jd - lastEclipse - cyclesSince * saros;
    const daysToNext = saros - daysSinceLast;
    const likely = daysToNext < 30;
    const eclipseType = (cyclesSince % 3 === 0) ? 'total' : (cyclesSince % 3 === 1) ? 'partial' : 'annular';
    return {
      type: eclipseType,
      likely,
      nextDate: `~${Math.round(daysToNext)} days from input date`,
      daysToNext: Math.round(daysToNext),
    };
  }

  /** Western zodiac sign for a given date. */
  westernZodiac(date: { year: number; month: number; day: number }): ZodiacSign {
    const md = date.month * 100 + date.day;
    // Aries starts Mar 21
    if (md >= 321 && md <= 419) return WESTERN_ZODIAC[0]!;
    if (md >= 420 && md <= 520) return WESTERN_ZODIAC[1]!;
    if (md >= 521 && md <= 620) return WESTERN_ZODIAC[2]!;
    if (md >= 621 && md <= 722) return WESTERN_ZODIAC[3]!;
    if (md >= 723 && md <= 822) return WESTERN_ZODIAC[4]!;
    if (md >= 823 && md <= 922) return WESTERN_ZODIAC[5]!;
    if (md >= 923 && md <= 1022) return WESTERN_ZODIAC[6]!;
    if (md >= 1023 && md <= 1121) return WESTERN_ZODIAC[7]!;
    if (md >= 1122 && md <= 1221) return WESTERN_ZODIAC[8]!;
    if (md >= 1222 || md <= 119) return WESTERN_ZODIAC[9]!;
    if (md >= 120 && md <= 218) return WESTERN_ZODIAC[10]!;
    return WESTERN_ZODIAC[11]!;
  }

  /** Chinese zodiac animal. */
  chineseZodiacAnimal(year: number): string {
    return CHINESE_ZODIAC_ANIMALS[((year - 4) % 12 + 12) % 12] ?? 'Rat';
  }

  /** Chinese zodiac animal (Chinese characters). */
  chineseZodiacAnimalChinese(year: number): string {
    return CHINESE_ZODIAC_CHINESE[((year - 4) % 12 + 12) % 12] ?? '鼠';
  }

  /** Chinese heavenly stem (天干). */
  chineseHeavenlyStem(year: number): string {
    return CHINESE_HEAVENLY_STEMS[((year - 4) % 10 + 10) % 10] ?? '甲';
  }

  /** Chinese earthly branch (地支). */
  chineseEarthlyBranch(year: number): string {
    return CHINESE_EARTHLY_BRANCHES[((year - 4) % 12 + 12) % 12] ?? '子';
  }

  /** Chinese element (五行) for the year. */
  chineseElement(year: number): string {
    // Element cycle: every 2 years belongs to the same element
    // 甲乙=木, 丙丁=火, 戊己=土, 庚辛=金, 壬癸=水
    const stemIdx = ((year - 4) % 10 + 10) % 10;
    const elementIdx = Math.floor(stemIdx / 2);
    return CHINESE_ELEMENTS[elementIdx] ?? 'Wood';
  }

  /** Chinese element (Chinese characters). */
  chineseElementChinese(year: number): string {
    const stemIdx = ((year - 4) % 10 + 10) % 10;
    const elementIdx = Math.floor(stemIdx / 2);
    return CHINESE_ELEMENTS_CHINESE[elementIdx] ?? '木';
  }

  /** Full Chinese zodiac descriptor (e.g. "Fire Dragon"). */
  chineseZodiacFull(year: number): { stem: string; branch: string; element: string; animal: string; fullString: string } {
    const stem = this.chineseHeavenlyStem(year);
    const branch = this.chineseEarthlyBranch(year);
    const element = this.chineseElement(year);
    const animal = this.chineseZodiacAnimal(year);
    return { stem, branch, element, animal, fullString: `${element} ${animal}` };
  }

  /** Vedic (Indian) zodiac sign approximation. */
  vedicZodiac(date: { year: number; month: number; day: number }): ZodiacSign {
    // Vedic (sidereal) zodiac is offset ~24° from tropical
    // Approximation: subtract ~24 days from tropical
    const adjustedDay = this.subtractDays(date, 24);
    return this.westernZodiac(adjustedDay);
  }

  /** Compute approximate solar declination. */
  solarDeclination(date: { year: number; month: number; day: number }): number {
    const doy = this.dayOfYear(date);
    // Solar declination: -23.44° to +23.44°
    // δ = -23.44° * cos(360° * (doy + 10) / 365)
    const angle = 2 * Math.PI * (doy + 10) / 365;
    return -23.44 * Math.cos(angle);
  }

  /** Approximate sunrise time (in decimal hours, local solar time). */
  sunriseHour(date: { year: number; month: number; day: number }, latitude: number): number {
    const declination = this.solarDeclination(date);
    const latRad = latitude * Math.PI / 180;
    const decRad = declination * Math.PI / 180;
    // Hour angle: cos(H) = -tan(φ) * tan(δ)
    const cosH = -Math.tan(latRad) * Math.tan(decRad);
    if (cosH > 1) return 0; // Polar night
    if (cosH < -1) return 0; // Midnight sun
    const H = Math.acos(cosH);
    return 12 - H * 12 / Math.PI;
  }

  /** Approximate sunset time (in decimal hours, local solar time). */
  sunsetHour(date: { year: number; month: number; day: number }, latitude: number): number {
    const declination = this.solarDeclination(date);
    const latRad = latitude * Math.PI / 180;
    const decRad = declination * Math.PI / 180;
    const cosH = -Math.tan(latRad) * Math.tan(decRad);
    if (cosH > 1) return 24; // Polar night - no sunrise, no sunset
    if (cosH < -1) return 24; // Midnight sun - sun never sets
    const H = Math.acos(cosH);
    return 12 + H * 12 / Math.PI;
  }

  /** Day length in hours. */
  dayLengthHours(date: { year: number; month: number; day: number }, latitude: number): number {
    return this.sunsetHour(date, latitude) - this.sunriseHour(date, latitude);
  }

  /** Compute the equation of time (minutes). */
  equationOfTime(date: { year: number; month: number; day: number }): number {
    const doy = this.dayOfYear(date);
    const b = 2 * Math.PI * (doy - 81) / 365;
    // EoT ≈ 9.87 sin(2B) - 7.53 cos(B) - 1.5 sin(B)  (in minutes)
    return 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
  }

  /** Solar position (declination, RA, distance, true anomaly). */
  solarPosition(date: { year: number; month: number; day: number }): SolarPosition {
    const doy = this.dayOfYear(date);
    const meanAnomaly = 357.529 + 0.9856 * doy; // degrees
    const equationOfCenter = 1.915 * Math.sin(meanAnomaly * Math.PI / 180)
      + 0.020 * Math.sin(2 * meanAnomaly * Math.PI / 180);
    const trueAnomaly = meanAnomaly + equationOfCenter;
    // Sun's ecliptic longitude
    const lambda = 280.466 + 0.9856 * doy + equationOfCenter;
    const epsilon = 23.4397; // obliquity of the ecliptic
    const lambdaRad = lambda * Math.PI / 180;
    const epsRad = epsilon * Math.PI / 180;
    const ra = Math.atan2(Math.cos(epsRad) * Math.sin(lambdaRad), Math.cos(lambdaRad)) * 180 / Math.PI;
    const dec = Math.asin(Math.sin(epsRad) * Math.sin(lambdaRad)) * 180 / Math.PI;
    const distanceAU = 1.00014 - 0.01671 * Math.cos(meanAnomaly * Math.PI / 180)
      - 0.00014 * Math.cos(2 * meanAnomaly * Math.PI / 180);
    return {
      declination: dec,
      rightAscension: (ra + 360) % 360,
      equationOfTime: this.equationOfTime(date),
      distanceAU,
      trueAnomaly: ((trueAnomaly % 360) + 360) % 360,
    };
  }

  /** Approximate equinox and solstice dates for a given year. */
  equinoxSolstice(year: number): Array<{ event: string; month: number; day: number; solarLongitude: number }> {
    // Approximate average dates - true dates vary by a day or so
    return [
      { event: 'Vernal Equinox', month: 3, day: 20, solarLongitude: 0 },
      { event: 'Summer Solstice', month: 6, day: 21, solarLongitude: 90 },
      { event: 'Autumnal Equinox', month: 9, day: 22, solarLongitude: 180 },
      { event: 'Winter Solstice', month: 12, day: 21, solarLongitude: 270 },
    ];
  }

  /** Compute Easter (Gregorian) using Meeus/Jones/Butcher's algorithm. */
  easterGregorian(year: number): { month: number; day: number } {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return { month, day };
  }

  /** Compute Easter (Julian) using the Orthodox algorithm. */
  easterJulian(year: number): { month: number; day: number } {
    const a = year % 4;
    const b = year % 7;
    const c = year % 19;
    const d = (19 * c + 15) % 30;
    const e = (2 * a + 4 * b - d + 34) % 7;
    const month = Math.floor((d + e + 114) / 31);
    const day = ((d + e + 114) % 31) + 1;
    return { month, day };
  }

  /** Passover (Pesach) approximate date. */
  passover(year: number): { month: number; day: number } {
    // Approximation - first full moon after vernal equinox in Hebrew calendar
    const springFullMoon = 5 + Math.floor(year * 12.368 / 1) % 29;
    return { month: 3, day: Math.min(30, Math.max(15, springFullMoon)) };
  }

  /** Chinese New Year (approximate, between Jan 21 and Feb 21). */
  chineseNewYearApprox(year: number): { month: number; day: number } {
    // Very rough approximation; actual depends on lunisolar calculations
    const offset = (year * 7) % 30;
    const day = 21 + (offset % 31);
    return { month: day > 31 ? 2 : 1, day: day > 31 ? day - 31 : day };
  }

  /** Ramadan start (approximate, shifts ~11 days earlier each year). */
  ramadanStartApprox(year: number): { month: number; day: number } {
    // Ramadan cycles every ~33 years through the Gregorian calendar
    const daysSince2000 = (year - 2000) * 11;
    const dayOfYear = ((31 + 28) - daysSince2000) % 365;
    const adjustedDay = ((dayOfYear % 365) + 365) % 365;
    let month = 1;
    let day = adjustedDay;
    while (day > this.daysInMonth(year, month)) {
      day -= this.daysInMonth(year, month);
      month++;
      if (month > 12) { month = 1; }
    }
    return { month, day };
  }

  /** Diwali (approximate). */
  diwaliApprox(year: number): { month: number; day: number } {
    // Diwali typically falls in October/November on Amavasya (new moon)
    return { month: 11, day: 4 + ((year * 11) % 15) };
  }

  /** All major holidays for a given year. */
  majorHolidays(year: number): Holiday[] {
    const easterG = this.easterGregorian(year);
    const easterJ = this.easterJulian(year);
    const passover = this.passover(year);
    const ramadan = this.ramadanStartApprox(year);
    const chineseNewYear = this.chineseNewYearApprox(year);
    const diwali = this.diwaliApprox(year);
    return [
      { name: 'New Year\'s Day', date: { year, month: 1, day: 1 }, type: 'secular', calendar: 'gregorian' },
      { name: 'Martin Luther King Jr. Day', date: { year, month: 1, day: this.nthWeekday(year, 1, 1, 3) }, type: 'cultural', calendar: 'gregorian' },
      { name: 'Groundhog Day', date: { year, month: 2, day: 2 }, type: 'cultural', calendar: 'gregorian' },
      { name: 'Valentine\'s Day', date: { year, month: 2, day: 14 }, type: 'cultural', calendar: 'gregorian' },
      { name: 'Presidents\' Day (US)', date: { year, month: 2, day: this.nthWeekday(year, 2, 1, 3) }, type: 'secular', calendar: 'gregorian' },
      { name: 'St. Patrick\'s Day', date: { year, month: 3, day: 17 }, type: 'cultural', calendar: 'gregorian' },
      { name: 'April Fools\' Day', date: { year, month: 4, day: 1 }, type: 'cultural', calendar: 'gregorian' },
      { name: 'Earth Day', date: { year, month: 4, day: 22 }, type: 'secular', calendar: 'gregorian' },
      { name: 'May Day', date: { year, month: 5, day: 1 }, type: 'cultural', calendar: 'gregorian' },
      { name: 'Cinco de Mayo', date: { year, month: 5, day: 5 }, type: 'cultural', calendar: 'gregorian' },
      { name: 'Mother\'s Day', date: { year, month: 5, day: this.nthWeekday(year, 5, 0, 2) }, type: 'cultural', calendar: 'gregorian' },
      { name: 'Memorial Day (US)', date: { year, month: 5, day: this.lastWeekday(year, 5, 1) }, type: 'secular', calendar: 'gregorian' },
      { name: 'Father\'s Day', date: { year, month: 6, day: this.nthWeekday(year, 6, 0, 3) }, type: 'cultural', calendar: 'gregorian' },
      { name: 'Independence Day (US)', date: { year, month: 7, day: 4 }, type: 'secular', calendar: 'gregorian' },
      { name: 'Bastille Day', date: { year, month: 7, day: 14 }, type: 'secular', calendar: 'gregorian' },
      { name: 'Labor Day (US)', date: { year, month: 9, day: this.nthWeekday(year, 9, 1, 1) }, type: 'secular', calendar: 'gregorian' },
      { name: 'Halloween', date: { year, month: 10, day: 31 }, type: 'cultural', calendar: 'gregorian' },
      { name: 'Veterans Day (US)', date: { year, month: 11, day: 11 }, type: 'secular', calendar: 'gregorian' },
      { name: 'Thanksgiving (US)', date: { year, month: 11, day: this.nthWeekday(year, 11, 4, 4) }, type: 'cultural', calendar: 'gregorian' },
      { name: 'Christmas Day', date: { year, month: 12, day: 25 }, type: 'religious', calendar: 'gregorian' },
      { name: 'Boxing Day', date: { year, month: 12, day: 26 }, type: 'cultural', calendar: 'gregorian' },
      { name: 'Kwanzaa begins', date: { year, month: 12, day: 26 }, type: 'cultural', calendar: 'gregorian' },
      { name: 'Easter (Gregorian)', date: { year, month: easterG.month, day: easterG.day }, type: 'religious', calendar: 'gregorian' },
      { name: 'Good Friday', date: { year, month: easterG.month, day: easterG.day - 2 }, type: 'religious', calendar: 'gregorian' },
      { name: 'Ash Wednesday', date: { year, month: easterG.month, day: easterG.day - 46 }, type: 'religious', calendar: 'gregorian' },
      { name: 'Palm Sunday', date: { year, month: easterG.month, day: easterG.day - 7 }, type: 'religious', calendar: 'gregorian' },
      { name: 'Easter (Julian/Orthodox)', date: { year, month: easterJ.month, day: easterJ.day }, type: 'religious', calendar: 'julian' },
      { name: 'Passover (Pesach) approx', date: { year, month: passover.month, day: passover.day }, type: 'religious', calendar: 'hebrew' },
      { name: 'Ramadan start approx', date: { year, month: ramadan.month, day: ramadan.day }, type: 'religious', calendar: 'islamic' },
      { name: 'Chinese New Year approx', date: { year, month: chineseNewYear.month, day: chineseNewYear.day }, type: 'cultural', calendar: 'chinese' },
      { name: 'Diwali approx', date: { year, month: diwali.month, day: diwali.day }, type: 'religious', calendar: 'indian' },
    ];
  }

  /** Find Nth weekday of a month (e.g. 3rd Monday). */
  nthWeekday(year: number, month: number, dayOfWeek: number, n: number): number {
    const firstDow = this.dayOfWeek({ year, month, day: 1 });
    const offset = (dayOfWeek - firstDow + 7) % 7;
    return 1 + offset + (n - 1) * 7;
  }

  /** Last weekday of a month (e.g. last Monday). */
  lastWeekday(year: number, month: number, dayOfWeek: number): number {
    const lastDay = this.daysInMonth(year, month);
    const lastDow = this.dayOfWeek({ year, month, day: lastDay });
    return lastDay - ((lastDow - dayOfWeek + 7) % 7);
  }

  /** Calendrical cycles catalog. */
  calendricalCycles(): CalendricalCycle[] {
    return [...CALENDRICAL_CYCLES];
  }

  /** Calendar systems catalog. */
  calendarSystems(): Array<{ name: string; epoch: string; daysInYear: number; type: string }> {
    return [...CALENDAR_SYSTEMS];
  }

  /** Golden number (used in Easter calculations). */
  goldenNumber(year: number): number {
    return (year % 19) + 1;
  }

  /** Solar cycle (weekday pattern). */
  solarCycle(year: number): number {
    return ((year - 1) % 28 + 28) % 28 + 1;
  }

  /** Roman indiction. */
  indiction(year: number): number {
    return ((year + 2) % 15 + 15) % 15 + 1;
  }

  /** Julian Period (combination of solar, lunar, indiction cycles). */
  julianPeriod(year: number): number {
    // Julian Period starts at 4713 BC
    return year + 4713;
  }

  /** Convert Unix timestamp to date. */
  fromUnixTimestamp(unixSec: number): { year: number; month: number; day: number; hour: number; minute: number; second: number } {
    const days = Math.floor(unixSec / 86400);
    const sec = unixSec % 86400;
    const jd = days + 2440587.5; // Unix epoch = JD 2440587.5
    const date = this._jdToGregorian(jd);
    const hour = Math.floor(sec / 3600);
    const minute = Math.floor((sec % 3600) / 60);
    const second = Math.floor(sec % 60);
    return { ...date, hour, minute, second };
  }

  /** Convert date to Unix timestamp. */
  toUnixTimestamp(date: { year: number; month: number; day: number; hour?: number; minute?: number; second?: number }): number {
    const jd = this.julianDay(date);
    const daySec = (date.hour ?? 0) * 3600 + (date.minute ?? 0) * 60 + (date.second ?? 0);
    return Math.floor((jd - 2440587.5) * 86400 + daySec);
  }

  /** Swatch Internet Time (beats). */
  swatchInternetTime(date: { year: number; month: number; day: number; hour: number; minute: number; second: number }): number {
    // BMT (Biel Mean Time = UTC+1)
    const totalSec = (date.hour - 1) * 3600 + date.minute * 60 + date.second;
    const adjSec = ((totalSec % 86400) + 86400) % 86400;
    return (adjSec / 86.4); // 1 beat = 86.4 seconds, total = 1000 beats per day
  }

  /** Decimal time (French Republican). */
  decimalTime(date: { year: number; month: number; day: number; hour: number; minute: number; second: number }): { hours: number; minutes: number; seconds: number } {
    const totalSec = date.hour * 3600 + date.minute * 60 + date.second;
    const decSec = totalSec * 100000 / 86400;
    const decHours = Math.floor(decSec / 10000);
    const decMinutes = Math.floor((decSec % 10000) / 100);
    const decSeconds = Math.floor(decSec % 100);
    return { hours: decHours, minutes: decMinutes, seconds: decSeconds };
  }

  /** Get all calendar names. */
  allCalendarNames(): string[] {
    return CALENDAR_SYSTEMS.map(c => c.name);
  }

  /** Check if two dates are in the same week (ISO 8601). */
  sameWeek(d1: { year: number; month: number; day: number }, d2: { year: number; month: number; day: number }): boolean {
    const w1 = this.weekOfYear(d1);
    const w2 = this.weekOfYear(d2);
    return w1.year === w2.year && w1.week === w2.week;
  }

  /** Check if a date is a weekday (Mon-Fri). */
  isWeekday(date: { year: number; month: number; day: number }): boolean {
    const dow = this.dayOfWeek(date);
    return dow >= 1 && dow <= 5;
  }

  /** Check if a date is a weekend (Sat/Sun). */
  isWeekend(date: { year: number; month: number; day: number }): boolean {
    return !this.isWeekday(date);
  }

  /** Count weekdays between two dates. */
  weekdaysBetween(d1: { year: number; month: number; day: number }, d2: { year: number; month: number; day: number }): number {
    const start = Math.min(this.julianDay(d1), this.julianDay(d2));
    const end = Math.max(this.julianDay(d1), this.julianDay(d2));
    let count = 0;
    for (let jd = start; jd <= end; jd++) {
      const dow = ((jd + 1) % 7 + 7) % 7;
      if (dow >= 1 && dow <= 5) count++;
    }
    return count;
  }

  /** Get month name. */
  monthName(month: number): string {
    return MONTH_NAMES_GREGORIAN[month - 1] ?? 'Unknown';
  }

  /** Get month number from name. */
  monthFromName(name: string): number {
    const idx = MONTH_NAMES_GREGORIAN.findIndex(m => m.toLowerCase() === name.toLowerCase());
    return idx + 1;
  }

  /** Format a date as ISO 8601 string. */
  iso8601(date: { year: number; month: number; day: number; hour?: number; minute?: number; second?: number }): string {
    const y = String(date.year).padStart(4, '0');
    const m = String(date.month).padStart(2, '0');
    const d = String(date.day).padStart(2, '0');
    if (date.hour === undefined) return `${y}-${m}-${d}`;
    const h = String(date.hour).padStart(2, '0');
    const min = String(date.minute ?? 0).padStart(2, '0');
    const s = String(date.second ?? 0).padStart(2, '0');
    return `${y}-${m}-${d}T${h}:${min}:${s}`;
  }

  /** Parse ISO 8601 date string. */
  parseISO8601(s: string): { year: number; month: number; day: number; hour?: number; minute?: number; second?: number } {
    const datePart = s.split('T')[0] ?? '';
    const [y, m, d] = datePart.split('-').map(n => parseInt(n, 10));
    if (s.includes('T')) {
      const timePart = s.split('T')[1] ?? '';
      const [h, min, sec] = timePart.split(':').map(n => parseInt(n, 10));
      return { year: y ?? 0, month: m ?? 1, day: d ?? 1, hour: h, minute: min, second: sec };
    }
    return { year: y ?? 0, month: m ?? 1, day: d ?? 1 };
  }

  /** Roman numeral year. */
  toRoman(year: number): string {
    if (year <= 0) return '';
    const numerals: Array<[number, string]> = [
      [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
      [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
      [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
    ];
    let result = '';
    let n = year;
    for (const [value, symbol] of numerals) {
      while (n >= value) {
        result += symbol;
        n -= value;
      }
    }
    return result;
  }

  /** Parse Roman numeral year. */
  fromRoman(roman: string): number {
    const values: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
    let result = 0;
    const upper = roman.toUpperCase();
    for (let i = 0; i < upper.length; i++) {
      const curr = values[upper[i]!] ?? 0;
      const next = values[upper[i + 1]!] ?? 0;
      if (curr < next) {
        result += next - curr;
        i++;
      } else {
        result += curr;
      }
    }
    return result;
  }

  /** Convert Gregorian to Julian Period (Scaliger cycle). */
  julianPeriodDate(year: number, month: number, day: number): { solar: number; lunar: number; indiction: number } {
    return {
      solar: this.solarCycle(year),
      lunar: this.goldenNumber(year),
      indiction: this.indiction(year),
    };
  }

  /** Number of days since Unix epoch (Jan 1, 1970). */
  daysSinceUnixEpoch(date: { year: number; month: number; day: number }): number {
    return this.dateDifference({ year: 1970, month: 1, day: 1 }, date);
  }

  /** Number of days until Unix epoch. */
  daysUntilUnixEpoch(date: { year: number; month: number; day: number }): number {
    return this.dateDifference(date, { year: 1970, month: 1, day: 1 });
  }

  /** Approximate sidereal time at Greenwich (in hours). */
  greenwichSiderealTime(date: { year: number; month: number; day: number }, hour: number = 0): number {
    const jd = this.julianDay(date) + hour / 24;
    const t = (jd - 2451545.0) / 36525;
    // Greenwich Mean Sidereal Time
    let gmst = 6.697374558 + 0.06570982441908 * (jd - 2451545.0) + 0.00002622 * t * t;
    gmst = ((gmst % 24) + 24) % 24;
    return gmst;
  }

  /** Local sidereal time given longitude. */
  localSiderealTime(date: { year: number; month: number; day: number }, hour: number, longitudeDeg: number): number {
    const gmst = this.greenwichSiderealTime(date, hour);
    const offset = longitudeDeg / 15;
    return ((gmst + offset) % 24 + 24) % 24;
  }

  /** Find the next occurrence of a specific weekday after a given date. */
  nextWeekday(date: { year: number; month: number; day: number }, targetDow: number): { year: number; month: number; day: number } {
    const currentDow = this.dayOfWeek(date);
    let diff = (targetDow - currentDow + 7) % 7;
    if (diff === 0) diff = 7; // next week, not today
    return this.addDays(date, diff);
  }

  /** Find the previous occurrence of a specific weekday before a given date. */
  previousWeekday(date: { year: number; month: number; day: number }, targetDow: number): { year: number; month: number; day: number } {
    const currentDow = this.dayOfWeek(date);
    let diff = (currentDow - targetDow + 7) % 7;
    if (diff === 0) diff = 7;
    return this.subtractDays(date, diff);
  }

  /** Count leap years between two years (inclusive). */
  leapYearsBetween(startYear: number, endYear: number): number {
    let count = 0;
    for (let y = startYear; y <= endYear; y++) {
      if (this.leapYear(y, 'gregorian')) count++;
    }
    return count;
  }

  /** Check if a date is valid. */
  isValidDate(date: { year: number; month: number; day: number }): boolean {
    if (date.month < 1 || date.month > 12) return false;
    if (date.day < 1 || date.day > this.daysInMonth(date.year, date.month)) return false;
    return true;
  }

  /** Determine the season (Northern Hemisphere). */
  northernSeason(date: { year: number; month: number; day: number }): string {
    const md = date.month * 100 + date.day;
    if (md >= 320 && md < 621) return 'Spring';
    if (md >= 621 && md < 922) return 'Summer';
    if (md >= 922 && md < 1221) return 'Autumn';
    return 'Winter';
  }

  /** Determine the season (Southern Hemisphere). */
  southernSeason(date: { year: number; month: number; day: number }): string {
    const northern = this.northernSeason(date);
    if (northern === 'Spring') return 'Autumn';
    if (northern === 'Summer') return 'Winter';
    if (northern === 'Autumn') return 'Spring';
    return 'Summer';
  }

  /** Get the Mayan Tzolkin day name. */
  mayanTzolkin(day: number): { number: number; name: string } {
    const names = ['Imix', 'Ik\'', 'Ak\'bal', 'K\'an', 'Chikchan', 'Kimi', 'Manik\'', 'Lamat', 'Muluk', 'Ok',
      'Chuwen', 'Eb', 'Ben', 'Ix', 'Men', 'K\'ib\'', 'Kab\'an', 'Etz\'nab\'', 'Kawak', 'Ajaw'];
    const number = ((day - 1) % 13) + 1;
    const nameIdx = (day - 1) % 20;
    return { number, name: names[nameIdx] ?? 'Imix' };
  }

  /** Get the Mayan Haab month and day. */
  mayanHaab(day: number): { month: string; day: number } {
    const months = ['Pop', 'Wo\'', 'Sip', 'Sotz\'', 'Tzek', 'Xul', 'Yaxk\'in', 'Mol', 'Ch\'en', 'Yax',
      'Zac\'', 'Keh', 'Mak', 'K\'ank\'in', 'Muwan', 'Pax', 'K\'ayab\'', 'Kumk\'u', 'Wayeb\''];
    const dayInYear = ((day - 1) % 365) + 1;
    const monthIdx = Math.min(18, Math.floor((dayInYear - 1) / 20));
    const dayInMonth = ((dayInYear - 1) % 20);
    return { month: months[monthIdx] ?? 'Pop', day: dayInMonth };
  }

  /** Get the French Republican month name. */
  frenchRepublicanMonth(month: number): string {
    const months = [
      'Vendémiaire', 'Brumaire', 'Frimaire', 'Nivôse', 'Pluviôse', 'Ventôse',
      'Germinal', 'Floréal', 'Prairial', 'Messidor', 'Thermidor', 'Fructidor',
    ];
    return months[month - 1] ?? 'Unknown';
  }

  /** French Republican day name (10-day décades). */
  frenchRepublicanDayName(day: number): string {
    const names = ['Primidi', 'Duodi', 'Tridi', 'Quartidi', 'Quintidi', 'Sextidi', 'Septidi', 'Octidi', 'Nonidi', 'Décadi'];
    return names[(day - 1) % 10] ?? 'Primidi';
  }

  /** Sanskrit / Vedic month name (Saka calendar). */
  sakaMonthName(month: number): string {
    const months = [
      'Chaitra', 'Vaisakha', 'Jyaistha', 'Asadha', 'Sravana', 'Bhadra',
      'Asvina', 'Kartika', 'Agrahayana', 'Pausa', 'Magha', 'Phalguna',
    ];
    return months[month - 1] ?? 'Unknown';
  }

  /** Sanskrit weekday name. */
  sakaDayName(date: { year: number; month: number; day: number }): string {
    const names = ['Ravivara', 'Somavara', 'Mangalavara', 'Budhavara', 'Guruvara', 'Shukravara', 'Shanivara'];
    return names[this.dayOfWeek(date)] ?? 'Ravivara';
  }

  /** Hebrew month name. */
  hebrewMonthName(month: number): string {
    // Nisan = 1 ... Adar = 12 (Adar II = 13)
    const months = [
      'Nisan', 'Iyar', 'Sivan', 'Tammuz', 'Av', 'Elul',
      'Tishrei', 'Cheshvan', 'Kislev', 'Tevet', 'Shevat', 'Adar', 'Adar II',
    ];
    return months[month - 1] ?? 'Nisan';
  }

  /** Islamic (Hijri) month name. */
  islamicMonthName(month: number): string {
    const months = [
      'Muharram', 'Safar', 'Rabi\' al-awwal', 'Rabi\' al-thani', 'Jumada al-awwal', 'Jumada al-thani',
      'Rajab', 'Sha\'ban', 'Ramadan', 'Shawwal', 'Dhu al-Qi\'dah', 'Dhu al-Hijjah',
    ];
    return months[month - 1] ?? 'Muharram';
  }

  /** Persian (Solar Hijri) month name. */
  persianMonthName(month: number): string {
    const months = [
      'Farvardin', 'Ordibehesht', 'Khordad', 'Tir', 'Mordad', 'Shahrivar',
      'Mehr', 'Aban', 'Azar', 'Dey', 'Bahman', 'Esfand',
    ];
    return months[month - 1] ?? 'Farvardin';
  }

  /** Get the Chinese zodiac animal's lucky numbers. */
  chineseAnimalLuckyNumbers(animal: string): number[] {
    const luckyMap: Record<string, number[]> = {
      Rat: [2, 3], Ox: [1, 9], Tiger: [1, 3, 4], Rabbit: [3, 4, 9],
      Dragon: [1, 6, 7], Snake: [2, 8, 9], Horse: [2, 3, 7], Goat: [3, 4, 9],
      Monkey: [4, 9], Rooster: [5, 7, 8], Dog: [3, 4, 9], Pig: [2, 5, 8],
    };
    return luckyMap[animal] ?? [1, 2, 3];
  }

  /** Get lucky colors for Chinese zodiac animal. */
  chineseAnimalLuckyColors(animal: string): string[] {
    const colorMap: Record<string, string[]> = {
      Rat: ['blue', 'gold', 'green'], Ox: ['white', 'yellow', 'green'],
      Tiger: ['grey', 'blue', 'orange'], Rabbit: ['red', 'pink', 'purple'],
      Dragon: ['gold', 'silver', 'grey'], Snake: ['red', 'yellow', 'black'],
      Horse: ['green', 'yellow', 'red'], Goat: ['brown', 'red', 'purple'],
      Monkey: ['white', 'blue', 'gold'], Rooster: ['brown', 'gold', 'yellow'],
      Dog: ['green', 'red', 'purple'], Pig: ['yellow', 'grey', 'brown'],
    };
    return colorMap[animal] ?? ['red'];
  }

  /** Get the cultural significance of an eclipse type. */
  eclipseCulturalSignificance(type: string): { name: string; mythology: string } {
    const map: Record<string, { name: string; mythology: string }> = {
      total: { name: 'Total Eclipse', mythology: 'Sun fully obscured by Moon (Apophis/Rahu)' },
      partial: { name: 'Partial Eclipse', mythology: 'Sun partially obscured' },
      annular: { name: 'Annular Eclipse', mythology: 'Ring of fire - Moon too far to fully cover Sun' },
    };
    return map[type] ?? { name: 'Unknown', mythology: 'No information' };
  }

  /** Get all known calendar systems with their descriptions. */
  calendarInfo(name: string): { name: string; epoch: string; daysInYear: number; type: string } | undefined {
    return CALENDAR_SYSTEMS.find(c => c.name === name);
  }

  toPacket(): DataPacket<{ calendars: Map<string, Calendar>; conversions: DateConversion[]; history: CalendarRecord[] }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['astronomy', 'CalendarSystem'],
      priority: 1,
      phase: 'calendar',
    };
    return {
      id: `calendar-system-${Date.now().toString(36)}`,
      payload: { calendars: this._calendars, conversions: this._conversions, history: this._history },
      metadata,
    };
  }

  reset(): void {
    this._calendars = new Map();
    this._conversions = [];
    this._history = [];
    this._counter = 0;
  }

  get calendarCount(): number { return this._calendars.size; }
  get conversionCount(): number { return this._conversions.length; }
  get historyDepth(): number { return this._history.length; }

  private _jdToGregorian(jd: number): { year: number; month: number; day: number } {
    const L = jd + 68569;
    const N = Math.floor(4 * L / 146097);
    const L2 = L - Math.floor((146097 * N + 3) / 4);
    const I = Math.floor(4000 * (L2 + 1) / 1461001);
    const L3 = L2 - Math.floor(1461 * I / 4) + 31;
    const J = Math.floor(80 * L3 / 2447);
    const day = L3 - Math.floor(2447 * J / 80);
    const L4 = Math.floor(J / 11);
    const month = J + 2 - 12 * L4;
    const year = 100 * (N - 49) + I + L4;
    return { year, month, day };
  }

  private _jdToJulian(jd: number): { year: number; month: number; day: number } {
    const b = 0;
    const c = jd + 32082;
    const d = Math.floor((4 * c + 3) / 1461);
    const e = c - Math.floor(1461 * d / 4);
    const m = Math.floor((5 * e + 2) / 153);
    const day = e - Math.floor((153 * m + 2) / 5) + 1;
    const month = m + 3 - 12 * Math.floor(m / 10);
    const year = b + d - 4800 + Math.floor(m / 10);
    return { year, month, day };
  }

  private _jdToIslamic(jd: number): { year: number; month: number; day: number } {
    const l1 = jd - 1948440 + 10632;
    const n = Math.floor((l1 - 1) / 10631);
    const l2 = l1 - 10631 * n + 354;
    const j = Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) + Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
    const l3 = l2 - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
    const month = Math.floor((24 * l3) / 709);
    const day = l3 - Math.floor((709 * month) / 24);
    const year = 30 * n + j - 30;
    return { year, month, day };
  }

  private _jdToHebrew(jd: number): { year: number; month: number; day: number } {
    const approxYear = Math.floor((jd - 347997) / 365.246822206) + 1;
    return { year: approxYear, month: 1, day: Math.floor((jd - 347997) % 30) + 1 };
  }

  private _jdToPersian(jd: number): { year: number; month: number; day: number } {
    // Approximate Persian calendar conversion
    const persianEpoch = 1948321; // JD of Persian epoch (22 March 622)
    const daysSinceEpoch = jd - persianEpoch;
    if (daysSinceEpoch < 0) return { year: 1, month: 1, day: 1 };
    // Approximate year using 365.2424-day average
    const year = Math.floor(daysSinceEpoch / 365.2424) + 1;
    const daysInYear = Math.floor(daysSinceEpoch - (year - 1) * 365.2424);
    const month = Math.min(12, Math.floor(daysInYear / 31) + 1);
    const day = Math.max(1, daysInYear - (month - 1) * 31);
    return { year, month, day };
  }

  private _jdToIndian(jd: number): { year: number; month: number; day: number } {
    // Approximate Saka conversion (Saka epoch = 78 CE)
    const sakaEpoch = 1748295; // Approximate JD for 22 March 78 CE
    const daysSinceEpoch = jd - sakaEpoch;
    if (daysSinceEpoch < 0) return { year: 1, month: 1, day: 1 };
    const year = Math.floor(daysSinceEpoch / 365.2425) + 1;
    const daysInYear = Math.floor(daysSinceEpoch - (year - 1) * 365.2425);
    const month = Math.min(12, Math.floor(daysInYear / 30) + 1);
    const day = Math.max(1, daysInYear - (month - 1) * 30);
    return { year, month, day };
  }

  private _chineseLeapYear(year: number): boolean {
    const stems = ((year - 4) % 10 + 10) % 10;
    const branches = ((year - 4) % 12 + 12) % 12;
    return (stems + branches) % 3 === 0;
  }
}
