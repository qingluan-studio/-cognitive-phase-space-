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

/** History record. */
interface CalendarRecord {
  operation: string;
  timestamp: number;
}

const CHINESE_HEAVENLY_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const CHINESE_EARTHLY_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

export class CalendarSystem {
  private _calendars: Map<string, Calendar> = new Map();
  private _conversions: DateConversion[] = [];
  private _history: CalendarRecord[] = [];
  private _counter = 0;

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
    return cal;
  }

  julian(year: number, month: number, day: number): Calendar {
    const leap = (year % 4) === 0;
    const cal: Calendar = {
      system: 'julian',
      date: { year, month, day },
      epoch: 0,
      leap,
    };
    this._calendars.set(`julian-${++this._counter}`, cal);
    return cal;
  }

  lunar(month: number, day: number, leap: boolean): Calendar {
    const cal: Calendar = {
      system: 'lunar',
      date: { year: 0, month, day },
      epoch: 0,
      leap,
    };
    this._calendars.set(`lunar-${++this._counter}`, cal);
    return cal;
  }

  islamic(year: number, month: number, day: number): Calendar {
    const leap = (year * 11 + 14) % 30 < 11;
    const cal: Calendar = {
      system: 'islamic',
      date: { year, month, day },
      epoch: 0,
      leap,
    };
    this._calendars.set(`islamic-${++this._counter}`, cal);
    return cal;
  }

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
    return cal;
  }

  chinese(year: number, month: number, day: number, leap: boolean): Calendar {
    const stemIdx = (year - 4) % 10;
    const branchIdx = (year - 4) % 12;
    const stem = CHINESE_HEAVENLY_STEMS[stemIdx] ?? '甲';
    const branch = CHINESE_EARTHLY_BRANCHES[branchIdx] ?? '子';
    const cal: Calendar = {
      system: 'chinese',
      date: { year, month, day },
      epoch: 0,
      leap,
    };
    this._calendars.set(`chinese-${stem}${branch}-${++this._counter}`, cal);
    return cal;
  }

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
    return cal;
  }

  julianDay(date: { year: number; month: number; day: number }): number {
    const { year, month, day } = date;
    const a = Math.floor((14 - month) / 12);
    const y = year + 4800 - a;
    const m = month + 12 * a - 3;
    return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  }

  dayOfWeek(date: { year: number; month: number; day: number }): number {
    const jd = this.julianDay(date);
    return (jd + 1) % 7;
  }

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
        const cycle = year % 19;
        return [0, 3, 6, 8, 11, 14, 17].includes(cycle);
      }
      case 'chinese':
        return this._chineseLeapYear(year);
      default:
        return false;
    }
  }

  newYear(year: number, calendar: string): { year: number; month: number; day: number } {
    switch (calendar) {
      case 'gregorian':
        return { year, month: 1, day: 1 };
      case 'chinese': {
        const stems = CHINESE_HEAVENLY_STEMS[(year - 4) % 10] ?? '甲';
        const branches = CHINESE_EARTHLY_BRANCHES[(year - 4) % 12] ?? '子';
        return { year, month: 1, day: stems.length + branches.length };
      }
      case 'islamic':
        return { year, month: 1, day: 1 };
      case 'hebrew':
        return { year, month: 7, day: 1 };
      default:
        return { year, month: 1, day: 1 };
    }
  }

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
    }
    const conv: DateConversion = {
      from, to, input: date, output, julianDay: jd,
    };
    this._conversions.push(conv);
    return conv;
  }

  dateDifference(d1: { year: number; month: number; day: number }, d2: { year: number; month: number; day: number }): number {
    return this.julianDay(d2) - this.julianDay(d1);
  }

  solarTerm(n: number): { name: string; longitude: number; approximateDate: string } {
    const terms = ['立春', '雨水', '惊蛰', '春分', '清明', '谷雨', '立夏', '小满', '芒种', '夏至', '小暑', '大暑', '立秋', '处暑', '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至', '小寒', '大寒'];
    const dates = ['Feb 4', 'Feb 19', 'Mar 6', 'Mar 21', 'Apr 5', 'Apr 20', 'May 6', 'May 21', 'Jun 6', 'Jun 21', 'Jul 7', 'Jul 23', 'Aug 8', 'Aug 23', 'Sep 8', 'Sep 23', 'Oct 8', 'Oct 23', 'Nov 7', 'Nov 22', 'Dec 7', 'Dec 22', 'Jan 6', 'Jan 20'];
    const idx = ((n - 1) % 24 + 24) % 24;
    return { name: terms[idx] ?? '立春', longitude: idx * 15, approximateDate: dates[idx] ?? '' };
  }

  moonPhase(date: { year: number; month: number; day: number }): { phase: string; illumination: number; age: number } {
    const jd = this.julianDay(date);
    const synodic = 29.53058867;
    const newMoonRef = 2451549.5;
    const age = ((jd - newMoonRef) % synodic + synodic) % synodic;
    const illumination = (1 - Math.cos(2 * Math.PI * age / synodic)) / 2;
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
    return { phase, illumination, age };
  }

  eclipsePredict(date: { year: number; month: number; day: number }): { type: string; likely: boolean; nextDate: string } {
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
    };
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

  private _chineseLeapYear(year: number): boolean {
    const stems = (year - 4) % 10;
    const branches = (year - 4) % 12;
    return (stems + branches) % 3 === 0;
  }
}
