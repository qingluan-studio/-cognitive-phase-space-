import { DataPacket, PacketMeta } from '../shared/types';

/** Hemisphere identifier. */
export type Hemisphere = 'northern' | 'southern' | 'equatorial';

/** A star (catalog entry). */
export interface Star {
  id: string;
  name: string;
  bayer: string;
  mag: number;
  ra: number;
  dec: number;
  color: string;
  distance: number;
  spectralClass: string;
}

/** A constellation. */
export interface Constellation {
  name: string;
  abbreviation: string;
  stars: Star[];
  borders: [number, number][];
  hemisphere: Hemisphere;
  zodiac: boolean;
}

/** An asterism (recognizable pattern). */
export interface Asterism {
  name: string;
  stars: string[];
  constellation: string;
  description: string;
}

/** History record. */
interface ConstellationRecord {
  operation: string;
  target: string;
  timestamp: number;
}

const STARS_DB: Star[] = [
  { id: 's1', name: 'Sirius', bayer: 'α CMa', mag: -1.46, ra: 6.75, dec: -16.7, color: 'blue-white', distance: 8.6, spectralClass: 'A1V' },
  { id: 's2', name: 'Canopus', bayer: 'α Car', mag: -0.74, ra: 6.4, dec: -52.7, color: 'yellow-white', distance: 310, spectralClass: 'A9II' },
  { id: 's3', name: 'Arcturus', bayer: 'α Boo', mag: -0.05, ra: 14.26, dec: 19.18, color: 'orange', distance: 36.7, spectralClass: 'K1.5III' },
  { id: 's4', name: 'Vega', bayer: 'α Lyr', mag: 0.03, ra: 18.61, dec: 38.78, color: 'blue-white', distance: 25, spectralClass: 'A0V' },
  { id: 's5', name: 'Capella', bayer: 'α Aur', mag: 0.08, ra: 5.28, dec: 45.99, color: 'yellow', distance: 42.9, spectralClass: 'G8III' },
  { id: 's6', name: 'Rigel', bayer: 'β Ori', mag: 0.13, ra: 5.24, dec: -8.2, color: 'blue', distance: 860, spectralClass: 'B8Ia' },
  { id: 's7', name: 'Procyon', bayer: 'α CMi', mag: 0.34, ra: 7.65, dec: 5.22, color: 'white', distance: 11.5, spectralClass: 'F5IV' },
  { id: 's8', name: 'Betelgeuse', bayer: 'α Ori', mag: 0.5, ra: 5.92, dec: 7.41, color: 'red', distance: 548, spectralClass: 'M1Ia' },
  { id: 's9', name: 'Altair', bayer: 'α Aql', mag: 0.77, ra: 19.85, dec: 8.87, color: 'white', distance: 16.7, spectralClass: 'A7V' },
  { id: 's10', name: 'Aldebaran', bayer: 'α Tau', mag: 0.85, ra: 4.6, dec: 16.51, color: 'orange', distance: 65, spectralClass: 'K5III' },
];

const CONSTELLATIONS_DB: Constellation[] = [
  {
    name: 'Orion', abbreviation: 'Ori', stars: [STARS_DB[5], STARS_DB[7]], borders: [[5, -10], [6, -10], [6, 15], [5, 15]],
    hemisphere: 'equatorial', zodiac: false,
  },
  {
    name: 'Ursa Major', abbreviation: 'UMa', stars: [], borders: [[8, 30], [14, 30], [14, 70], [8, 70]],
    hemisphere: 'northern', zodiac: false,
  },
  {
    name: 'Cassiopeia', abbreviation: 'Cas', stars: [], borders: [[0, 60], [6, 60], [6, 75], [0, 75]],
    hemisphere: 'northern', zodiac: false,
  },
  {
    name: 'Leo', abbreviation: 'Leo', stars: [], borders: [[9, -10], [12, -10], [12, 35], [9, 35]],
    hemisphere: 'northern', zodiac: true,
  },
  {
    name: 'Scorpius', abbreviation: 'Sco', stars: [], borders: [[16, -45], [18, -45], [18, -10], [16, -10]],
    hemisphere: 'southern', zodiac: true,
  },
  {
    name: 'Crux', abbreviation: 'Cru', stars: [], borders: [[12, -65], [13, -65], [13, -55], [12, -55]],
    hemisphere: 'southern', zodiac: false,
  },
];

const ZODIAC_CONSTELLATIONS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpius', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

export class Constellations {
  private _constellations: Map<string, Constellation> = new Map();
  private _stars: Star[] = [];
  private _asterisms: Asterism[] = [];
  private _history: ConstellationRecord[] = [];

  constructor() {
    for (const c of CONSTELLATIONS_DB) this._constellations.set(c.name, c);
    this._stars = [...STARS_DB];
    this._asterisms = [
      { name: 'Big Dipper', stars: ['Dubhe', 'Merak', 'Phecda', 'Megrez', 'Alioth', 'Mizar', 'Alkaid'], constellation: 'Ursa Major', description: 'asterism within Ursa Major' },
      { name: 'Orion\'s Belt', stars: ['Alnitak', 'Alnilam', 'Mintaka'], constellation: 'Orion', description: 'three stars in a row' },
      { name: 'Southern Cross', stars: ['Acrux', 'Becrux', 'Gacrux', 'Decrux'], constellation: 'Crux', description: 'cross-shaped pattern' },
    ];
  }

  getConstellation(name: string): Constellation | null {
    return this._constellations.get(name) ?? null;
  }

  findStar(name: string): Star | null {
    return this._stars.find(s => s.name.toLowerCase() === name.toLowerCase() || s.bayer.toLowerCase().includes(name.toLowerCase())) ?? null;
  }

  zodiac(date: Date): string {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const signs: [string, number, number][] = [
      ['Capricorn', 12, 22], ['Aquarius', 1, 20], ['Pisces', 2, 19], ['Aries', 3, 21],
      ['Taurus', 4, 20], ['Gemini', 5, 21], ['Cancer', 6, 21], ['Leo', 7, 23],
      ['Virgo', 8, 23], ['Libra', 9, 23], ['Scorpio', 10, 23], ['Sagittarius', 11, 22], ['Capricorn', 12, 22],
    ];
    for (let i = signs.length - 1; i >= 0; i--) {
      const [sign, m, d] = signs[i];
      if (month > m || (month === m && day >= d)) return sign;
    }
    return 'Capricorn';
  }

  constellationZodiac(): string[] {
    return ZODIAC_CONSTELLATIONS;
  }

  starChart(lat: number, lon: number, date: Date, time: number): { visible: Star[]; altitude: Map<string, number> } {
    const altitude = new Map<string, number>();
    const visible = this._stars.filter(s => {
      const declinationDiff = Math.abs(s.dec - lat);
      const isVisible = declinationDiff < 90;
      if (isVisible) altitude.set(s.name, 90 - declinationDiff);
      return isVisible;
    });
    void lon; void date; void time;
    return { visible, altitude };
  }

  starName(bayer: string, constellation: string): string | null {
    const star = this._stars.find(s => s.bayer.includes(bayer) && s.bayer.includes(constellation));
    return star?.name ?? null;
  }

  magnitudeScale(): { magnitude: number; description: string }[] {
    return [
      { magnitude: -1, description: 'brightest stars (Sirius)' },
      { magnitude: 0, description: 'very bright stars' },
      { magnitude: 1, description: 'bright stars' },
      { magnitude: 2, description: 'moderately bright' },
      { magnitude: 3, description: 'visible from cities' },
      { magnitude: 4, description: 'visible from suburbs' },
      { magnitude: 5, description: 'visible from dark skies' },
      { magnitude: 6, description: 'faintest visible to naked eye' },
    ];
  }

  spectralClass(star: Star): { class: string; temperature: number; color: string } {
    const cls = star.spectralClass[0];
    const table: Record<string, { temperature: number; color: string }> = {
      O: { temperature: 30000, color: 'blue' },
      B: { temperature: 20000, color: 'blue-white' },
      A: { temperature: 9000, color: 'white' },
      F: { temperature: 7000, color: 'yellow-white' },
      G: { temperature: 5500, color: 'yellow' },
      K: { temperature: 4500, color: 'orange' },
      M: { temperature: 3000, color: 'red' },
    };
    const info = table[cls] ?? { temperature: 5000, color: 'unknown' };
    return { class: cls, temperature: info.temperature, color: info.color };
  }

  properMotion(star: Star): { ra: number; dec: number; total: number } {
    const ra = Math.random() * 0.1;
    const dec = Math.random() * 0.1;
    return { ra, dec, total: Math.sqrt(ra * ra + dec * dec) };
  }

  parallax(star: Star, distance: number): number {
    return 1000 / Math.max(0.01, distance);
  }

  coordinateConvert(ra: number, dec: number, _alt: number, _az: number, lat: number, _lon: number, _time: number): { alt: number; az: number } {
    const ha = 0;
    const sinAlt = Math.sin(dec * Math.PI / 180) * Math.sin(lat * Math.PI / 180) +
      Math.cos(dec * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * Math.cos(ha);
    const alt = Math.asin(sinAlt) * 180 / Math.PI;
    const cosAz = (Math.sin(dec * Math.PI / 180) - sinAlt * Math.sin(lat * Math.PI / 180)) /
      (Math.cos(Math.asin(sinAlt)) * Math.cos(lat * Math.PI / 180));
    const az = Math.acos(Math.max(-1, Math.min(1, cosAz))) * 180 / Math.PI;
    void ra;
    return { alt, az };
  }

  constellationMap(hemisphere: Hemisphere): Constellation[] {
    return Array.from(this._constellations.values()).filter(c => c.hemisphere === hemisphere);
  }

  seasonalConstellations(season: 'spring' | 'summer' | 'autumn' | 'winter'): Constellation[] {
    const seasonalMap: Record<string, string[]> = {
      spring: ['Leo', 'Virgo', 'Bootes'],
      summer: ['Scorpius', 'Sagittarius', 'Lyra'],
      autumn: ['Pegasus', 'Andromeda', 'Perseus'],
      winter: ['Orion', 'Taurus', 'Gemini'],
    };
    const names = seasonalMap[season];
    return names.map(n => this._constellations.get(n)).filter((c): c is Constellation => c !== undefined);
  }

  toPacket(): DataPacket<{ constellations: Map<string, Constellation>; stars: Star[]; asterisms: Asterism[]; history: ConstellationRecord[] }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['astronomy', 'Constellation'],
      priority: 1,
      phase: 'constellation',
    };
    return {
      id: `constellation-${Date.now().toString(36)}`,
      payload: {
        constellations: this._constellations,
        stars: this._stars,
        asterisms: this._asterisms,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._constellations = new Map();
    this._stars = [];
    this._asterisms = [];
    this._history = [];
    for (const c of CONSTELLATIONS_DB) this._constellations.set(c.name, c);
    this._stars = [...STARS_DB];
  }

  get constellationCount(): number { return this._constellations.size; }
  get starCount(): number { return this._stars.length; }
  get asterismCount(): number { return this._asterisms.length; }
}
