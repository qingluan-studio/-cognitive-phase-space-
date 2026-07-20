import { DataPacket, PacketMeta } from '../shared/types';

/** Hemisphere identifier. */
export type Hemisphere = 'northern' | 'southern' | 'equatorial';

/** Spectral class letter following Morgan-Keenan (MK) system. */
export type SpectralClassLetter = 'O' | 'B' | 'A' | 'F' | 'G' | 'K' | 'M' | 'L' | 'T' | 'Y' | 'W' | 'C' | 'S';

/** Yerkes luminosity class. */
export type LuminosityClass = 'Ia' | 'Ib' | 'II' | 'III' | 'IV' | 'V' | 'VI' | 'VII';

/** Deep-sky object catalogue type. */
export type DeepSkyType = 'galaxy' | 'nebula' | 'planetary' | 'open' | 'globular' | 'supernova' | 'cluster';

/** Variable star classification. */
export type VariableStarType = 'cepheid' | 'rr-lyrae' | 'long-period' | 'eclipsing' | 'eruptive' | 'rotating' | 'cataclysmic';

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

/** Detailed physical information about a star. */
export interface StarDetails {
  name: string;
  hip: number | null;
  hd: number | null;
  absoluteMag: number;
  luminosity: number; // solar luminosities
  radius: number; // solar radii
  mass: number; // solar masses
  temperature: number; // Kelvin
  age: number; // Gyr
  rotation: number; // days
  bvColorIndex: number;
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

/** IAU constellation metadata (88 total). */
export interface ConstellationInfo {
  name: string;
  abbreviation: string;
  genitive: string;
  meaning: string;
  family: string;
  brightestStar: string;
  area: number; // square degrees
  rank: number; // by area, 1..88
  raCenter: number; // hours
  decCenter: number; // degrees
  visibleLatitude: number; // |latitude| above which visible
}

/** An asterism (recognizable pattern). */
export interface Asterism {
  name: string;
  stars: string[];
  constellation: string;
  description: string;
}

/** Deep-sky object (Messier / NGC). */
export interface DeepSkyObject {
  id: string;
  catalog: 'M' | 'NGC' | 'IC';
  number: number;
  type: DeepSkyType;
  constellation: string;
  mag: number;
  ra: number;
  dec: number;
  distance: number; // light-years or Mpc for galaxies
  name: string;
}

/** Variable star record. */
export interface VariableStar {
  name: string;
  type: VariableStarType;
  minMag: number;
  maxMag: number;
  period: number; // days
  spectralClass: string;
}

/** Mythology associated with a constellation. */
export interface Mythology {
  constellation: string;
  culture: string;
  story: string;
}

/** Constellation family (group of related constellations). */
export interface ConstellationFamily {
  name: string;
  constellations: string[];
  description: string;
}

/** Star name etymology. */
export interface StarEtymology {
  star: string;
  origin: string;
  meaning: string;
  language: string;
}

/** A region on the Hertzsprung-Russell diagram. */
export interface HRRegion {
  name: string;
  spectralRange: string;
  luminosityRange: string;
  description: string;
}

/** Spectral class table entry. */
export interface SpectralClassEntry {
  letter: SpectralClassLetter;
  temperature: [number, number]; // Kelvin range
  color: string;
  mass: [number, number]; // solar masses
  radius: [number, number]; // solar radii
  examples: string[];
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
  { id: 's11', name: 'Antares', bayer: 'α Sco', mag: 1.06, ra: 16.49, dec: -26.43, color: 'red', distance: 550, spectralClass: 'M1.5Iab' },
  { id: 's12', name: 'Spica', bayer: 'α Vir', mag: 1.04, ra: 13.42, dec: -11.16, color: 'blue', distance: 250, spectralClass: 'B1V' },
  { id: 's13', name: 'Pollux', bayer: 'β Gem', mag: 1.14, ra: 7.75, dec: 28.03, color: 'orange', distance: 33.8, spectralClass: 'K0III' },
  { id: 's14', name: 'Fomalhaut', bayer: 'α PsA', mag: 1.16, ra: 22.96, dec: -29.62, color: 'white', distance: 25.1, spectralClass: 'A3V' },
  { id: 's15', name: 'Deneb', bayer: 'α Cyg', mag: 1.25, ra: 20.69, dec: 45.28, color: 'blue-white', distance: 2600, spectralClass: 'A2Ia' },
  { id: 's16', name: 'Regulus', bayer: 'α Leo', mag: 1.4, ra: 10.14, dec: 11.97, color: 'blue-white', distance: 79.3, spectralClass: 'B8IV' },
  { id: 's17', name: 'Castor', bayer: 'α Gem', mag: 1.58, ra: 7.58, dec: 31.89, color: 'white', distance: 51, spectralClass: 'A1V' },
  { id: 's18', name: 'Gacrux', bayer: 'γ Cru', mag: 1.63, ra: 12.52, dec: -57.11, color: 'red', distance: 88, spectralClass: 'M3.5III' },
  { id: 's19', name: 'Acrux', bayer: 'α Cru', mag: 0.77, ra: 12.44, dec: -63.1, color: 'blue', distance: 321, spectralClass: 'B0.5IV' },
  { id: 's20', name: 'Bellatrix', bayer: 'γ Ori', mag: 1.64, ra: 5.42, dec: 6.35, color: 'blue', distance: 250, spectralClass: 'B2III' },
  { id: 's21', name: 'Mintaka', bayer: 'δ Ori', mag: 2.23, ra: 5.53, dec: -0.3, color: 'blue', distance: 1200, spectralClass: 'O9.5II' },
  { id: 's22', name: 'Alnilam', bayer: 'ε Ori', mag: 1.69, ra: 5.6, dec: -1.2, color: 'blue', distance: 2000, spectralClass: 'B0Ia' },
  { id: 's23', name: 'Alnitak', bayer: 'ζ Ori', mag: 1.77, ra: 5.68, dec: -1.94, color: 'blue', distance: 1260, spectralClass: 'O9.5Ib' },
  { id: 's24', name: 'Saiph', bayer: 'κ Ori', mag: 2.07, ra: 5.8, dec: -9.67, color: 'blue', distance: 650, spectralClass: 'B0.5Ia' },
  { id: 's25', name: 'Polaris', bayer: 'α UMi', mag: 1.97, ra: 2.53, dec: 89.26, color: 'yellow-white', distance: 433, spectralClass: 'F7Ib' },
  { id: 's26', name: 'Mizar', bayer: 'ζ UMa', mag: 2.04, ra: 13.4, dec: 54.93, color: 'white', distance: 82.9, spectralClass: 'A1V' },
  { id: 's27', name: 'Dubhe', bayer: 'α UMa', mag: 1.79, ra: 11.06, dec: 61.75, color: 'orange', distance: 123, spectralClass: 'K0III' },
  { id: 's28', name: 'Merak', bayer: 'β UMa', mag: 2.37, ra: 11.03, dec: 56.38, color: 'white', distance: 79.7, spectralClass: 'A1IV' },
  { id: 's29', name: 'Phecda', bayer: 'γ UMa', mag: 2.44, ra: 11.9, dec: 53.69, color: 'white', distance: 83.2, spectralClass: 'A0V' },
  { id: 's30', name: 'Megrez', bayer: 'δ UMa', mag: 3.31, ra: 12.26, dec: 57.03, color: 'white', distance: 80.5, spectralClass: 'A3V' },
  { id: 's31', name: 'Alioth', bayer: 'ε UMa', mag: 1.77, ra: 12.9, dec: 55.96, color: 'white', distance: 82.6, spectralClass: 'A1III' },
  { id: 's32', name: 'Alkaid', bayer: 'η UMa', mag: 1.86, ra: 13.79, dec: 49.31, color: 'blue', distance: 103.9, spectralClass: 'B3V' },
  { id: 's33', name: 'Algol', bayer: 'β Per', mag: 2.12, ra: 3.14, dec: 40.96, color: 'blue-white', distance: 90, spectralClass: 'B8V' },
  { id: 's34', name: 'Mirfak', bayer: 'α Per', mag: 1.79, ra: 3.41, dec: 49.86, color: 'yellow-white', distance: 510, spectralClass: 'F5Ib' },
  { id: 's35', name: 'Hamal', bayer: 'α Ari', mag: 2.0, ra: 2.12, dec: 23.46, color: 'orange', distance: 66, spectralClass: 'K1III' },
  { id: 's36', name: 'Diphda', bayer: 'β Cet', mag: 2.04, ra: 0.73, dec: -17.99, color: 'orange', distance: 96, spectralClass: 'K0III' },
  { id: 's37', name: 'Schedar', bayer: 'α Cas', mag: 2.24, ra: 0.68, dec: 56.54, color: 'orange', distance: 228, spectralClass: 'K0III' },
  { id: 's38', name: 'Caph', bayer: 'β Cas', mag: 2.27, ra: 0.15, dec: 59.15, color: 'yellow-white', distance: 54.5, spectralClass: 'F2III' },
  { id: 's39', name: 'Navi', bayer: 'γ Cas', mag: 2.47, ra: 0.95, dec: 60.72, color: 'blue', distance: 550, spectralClass: 'B0.5IVpe' },
  { id: 's40', name: 'Sadr', bayer: 'γ Cyg', mag: 2.23, ra: 20.37, dec: 40.26, color: 'yellow-white', distance: 1832, spectralClass: 'F8Iab' },
  { id: 's41', name: 'Albireo', bayer: 'β Cyg', mag: 3.08, ra: 19.51, dec: 27.96, color: 'orange', distance: 430, spectralClass: 'K3II' },
  { id: 's42', name: 'Scheat', bayer: 'β Peg', mag: 2.42, ra: 23.06, dec: 28.08, color: 'red', distance: 196, spectralClass: 'M2.5II-III' },
  { id: 's43', name: 'Markab', bayer: 'α Peg', mag: 2.49, ra: 23.08, dec: 15.21, color: 'blue-white', distance: 133, spectralClass: 'A0IV' },
  { id: 's44', name: 'Algenib', bayer: 'γ Peg', mag: 2.83, ra: 0.22, dec: 15.18, color: 'blue', distance: 470, spectralClass: 'B2IV' },
  { id: 's45', name: 'Mira', bayer: 'ο Cet', mag: 3.04, ra: 2.32, dec: -2.98, color: 'red', distance: 300, spectralClass: 'M7IIIe' },
  { id: 's46', name: 'Alphard', bayer: 'α Hya', mag: 1.99, ra: 9.46, dec: -8.66, color: 'orange', distance: 110, spectralClass: 'K3III' },
  { id: 's47', name: 'Phecda-B', bayer: 'γ UMa B', mag: 2.44, ra: 11.9, dec: 53.69, color: 'white', distance: 83.2, spectralClass: 'A0V' },
  { id: 's48', name: 'Denebola', bayer: 'β Leo', mag: 2.14, ra: 11.82, dec: 14.57, color: 'white', distance: 35.9, spectralClass: 'A3V' },
  { id: 's49', name: 'Zosma', bayer: 'δ Leo', mag: 2.56, ra: 11.23, dec: 20.52, color: 'white', distance: 58.4, spectralClass: 'A4V' },
  { id: 's50', name: 'Thuban', bayer: 'α Dra', mag: 3.65, ra: 14.27, dec: 64.38, color: 'white', distance: 303, spectralClass: 'A0III' },
];

const STARS_DETAILED: StarDetails[] = [
  { name: 'Sirius', hip: 32349, hd: 48915, absoluteMag: 1.42, luminosity: 25.4, radius: 1.71, mass: 2.063, temperature: 9940, age: 0.242, rotation: 5.5, bvColorIndex: 0.0 },
  { name: 'Vega', hip: 91262, hd: 172167, absoluteMag: 0.58, luminosity: 40.12, radius: 2.362, mass: 2.135, temperature: 9602, age: 0.455, rotation: 0.71, bvColorIndex: 0.0 },
  { name: 'Arcturus', hip: 69673, hd: 124897, absoluteMag: -0.30, luminosity: 170, radius: 25.4, mass: 1.08, temperature: 4286, age: 7.1, rotation: 290, bvColorIndex: 1.34 },
  { name: 'Capella', hip: 24608, hd: 34029, absoluteMag: -0.48, luminosity: 78.7, radius: 11.98, mass: 2.5687, temperature: 4970, age: 0.79, rotation: 104, bvColorIndex: 0.795 },
  { name: 'Rigel', hip: 24436, hd: 34085, absoluteMag: -7.84, luminosity: 120000, radius: 78.9, mass: 21, temperature: 12100, age: 0.008, rotation: 25, bvColorIndex: -0.03 },
  { name: 'Procyon', hip: 37279, hd: 61421, absoluteMag: 2.48, luminosity: 6.93, radius: 2.048, mass: 1.499, temperature: 6530, age: 1.87, rotation: 23, bvColorIndex: 0.432 },
  { name: 'Betelgeuse', hip: 27989, hd: 39801, absoluteMag: -5.85, luminosity: 126000, radius: 887, mass: 11.6, temperature: 3600, age: 0.0085, rotation: 365, bvColorIndex: 1.85 },
  { name: 'Altair', hip: 97649, hd: 187642, absoluteMag: 2.22, luminosity: 10.6, radius: 1.79, mass: 1.86, temperature: 8150, age: 0.1, rotation: 8.9, bvColorIndex: 0.221 },
  { name: 'Aldebaran', hip: 21421, hd: 29139, absoluteMag: -0.63, luminosity: 439, radius: 45.1, mass: 1.16, temperature: 3910, age: 6.6, rotation: 643, bvColorIndex: 1.538 },
  { name: 'Polaris', hip: 11767, hd: 8890, absoluteMag: -3.6, luminosity: 1260, radius: 37.5, mass: 5.4, temperature: 6015, age: 0.07, rotation: 119, bvColorIndex: 0.64 },
];

const CONSTELLATIONS_DB: Constellation[] = [
  {
    name: 'Orion', abbreviation: 'Ori', stars: [STARS_DB[5], STARS_DB[7], STARS_DB[19], STARS_DB[20], STARS_DB[21], STARS_DB[22], STARS_DB[23]],
    borders: [[5, -10], [6, -10], [6, 15], [5, 15]], hemisphere: 'equatorial', zodiac: false,
  },
  {
    name: 'Ursa Major', abbreviation: 'UMa',
    stars: [STARS_DB[25], STARS_DB[26], STARS_DB[27], STARS_DB[28], STARS_DB[29], STARS_DB[30], STARS_DB[31]],
    borders: [[8, 30], [14, 30], [14, 70], [8, 70]], hemisphere: 'northern', zodiac: false,
  },
  {
    name: 'Cassiopeia', abbreviation: 'Cas',
    stars: [STARS_DB[36], STARS_DB[37], STARS_DB[38]],
    borders: [[0, 60], [6, 60], [6, 75], [0, 75]], hemisphere: 'northern', zodiac: false,
  },
  {
    name: 'Leo', abbreviation: 'Leo',
    stars: [STARS_DB[15], STARS_DB[47], STARS_DB[48]],
    borders: [[9, -10], [12, -10], [12, 35], [9, 35]], hemisphere: 'northern', zodiac: true,
  },
  {
    name: 'Scorpius', abbreviation: 'Sco',
    stars: [STARS_DB[10]],
    borders: [[16, -45], [18, -45], [18, -10], [16, -10]], hemisphere: 'southern', zodiac: true,
  },
  {
    name: 'Crux', abbreviation: 'Cru',
    stars: [STARS_DB[17], STARS_DB[18]],
    borders: [[12, -65], [13, -65], [13, -55], [12, -55]], hemisphere: 'southern', zodiac: false,
  },
  {
    name: 'Lyra', abbreviation: 'Lyr',
    stars: [STARS_DB[3]],
    borders: [[18, 25], [19, 25], [19, 45], [18, 45]], hemisphere: 'northern', zodiac: false,
  },
  {
    name: 'Aquila', abbreviation: 'Aql',
    stars: [STARS_DB[8]],
    borders: [[18, -10], [20, -10], [20, 20], [18, 20]], hemisphere: 'equatorial', zodiac: false,
  },
  {
    name: 'Bootes', abbreviation: 'Boo',
    stars: [STARS_DB[2]],
    borders: [[13, 10], [16, 10], [16, 55], [13, 55]], hemisphere: 'northern', zodiac: false,
  },
  {
    name: 'Taurus', abbreviation: 'Tau',
    stars: [STARS_DB[9]],
    borders: [[3, 0], [6, 0], [6, 30], [3, 30]], hemisphere: 'equatorial', zodiac: true,
  },
  {
    name: 'Auriga', abbreviation: 'Aur',
    stars: [STARS_DB[4]],
    borders: [[4, 28], [8, 28], [8, 55], [4, 55]], hemisphere: 'northern', zodiac: false,
  },
  {
    name: 'Carina', abbreviation: 'Car',
    stars: [STARS_DB[1]],
    borders: [[6, -75], [10, -75], [10, -50], [6, -50]], hemisphere: 'southern', zodiac: false,
  },
  {
    name: 'Canis Major', abbreviation: 'CMa',
    stars: [STARS_DB[0]],
    borders: [[6, -35], [8, -35], [8, -10], [6, -10]], hemisphere: 'southern', zodiac: false,
  },
  {
    name: 'Canis Minor', abbreviation: 'CMi',
    stars: [STARS_DB[6]],
    borders: [[7, -10], [9, -10], [9, 15], [7, 15]], hemisphere: 'equatorial', zodiac: false,
  },
  {
    name: 'Cygnus', abbreviation: 'Cyg',
    stars: [STARS_DB[14], STARS_DB[39], STARS_DB[40]],
    borders: [[19, 25], [22, 25], [22, 50], [19, 50]], hemisphere: 'northern', zodiac: false,
  },
  {
    name: 'Pegasus', abbreviation: 'Peg',
    stars: [STARS_DB[41], STARS_DB[42], STARS_DB[43]],
    borders: [[21, 5], [2, 5], [2, 35], [21, 35]], hemisphere: 'equatorial', zodiac: false,
  },
  {
    name: 'Andromeda', abbreviation: 'And',
    stars: [],
    borders: [[0, 20], [4, 20], [4, 50], [0, 50]], hemisphere: 'northern', zodiac: false,
  },
  {
    name: 'Perseus', abbreviation: 'Per',
    stars: [STARS_DB[33], STARS_DB[34]],
    borders: [[2, 30], [5, 30], [5, 60], [2, 60]], hemisphere: 'northern', zodiac: false,
  },
  {
    name: 'Virgo', abbreviation: 'Vir',
    stars: [STARS_DB[11]],
    borders: [[11, -22], [15, -22], [15, 15], [11, 15]], hemisphere: 'equatorial', zodiac: true,
  },
  {
    name: 'Cetus', abbreviation: 'Cet',
    stars: [STARS_DB[35], STARS_DB[44]],
    borders: [[0, -30], [4, -30], [4, 10], [0, 10]], hemisphere: 'equatorial', zodiac: false,
  },
  {
    name: 'Hydra', abbreviation: 'Hya',
    stars: [STARS_DB[45]],
    borders: [[8, -20], [15, -20], [15, 5], [8, 5]], hemisphere: 'equatorial', zodiac: false,
  },
  {
    name: 'Ursa Minor', abbreviation: 'UMi',
    stars: [STARS_DB[24]],
    borders: [[0, 70], [24, 70], [24, 90], [0, 90]], hemisphere: 'northern', zodiac: false,
  },
  {
    name: 'Draco', abbreviation: 'Dra',
    stars: [STARS_DB[49]],
    borders: [[9, 50], [20, 50], [20, 85], [9, 85]], hemisphere: 'northern', zodiac: false,
  },
];

/** IAU 88 constellations metadata. */
const CONSTELLATIONS_INFO: ConstellationInfo[] = [
  { name: 'Andromeda', abbreviation: 'And', genitive: 'Andromedae', meaning: 'the chained maiden', family: 'Perseus', brightestStar: 'Alpheratz', area: 722.3, rank: 19, raCenter: 1.0, decCenter: 35, visibleLatitude: 90 },
  { name: 'Antlia', abbreviation: 'Ant', genitive: 'Antliae', meaning: 'the air pump', family: 'Hercules', brightestStar: 'Alpha Antliae', area: 239.0, rank: 62, raCenter: 10.0, decCenter: -35, visibleLatitude: 65 },
  { name: 'Apus', abbreviation: 'Aps', genitive: 'Apodis', meaning: 'the bird of paradise', family: 'Hercules', brightestStar: 'Alpha Apodis', area: 206.3, rank: 67, raCenter: 16.0, decCenter: -76, visibleLatitude: 14 },
  { name: 'Aquarius', abbreviation: 'Aqr', genitive: 'Aquarii', meaning: 'the water bearer', family: 'Heavenly Waters', brightestStar: 'Sadalsuud', area: 979.9, rank: 10, raCenter: 22.5, decCenter: -15, visibleLatitude: 65 },
  { name: 'Aquila', abbreviation: 'Aql', genitive: 'Aquilae', meaning: 'the eagle', family: 'Hercules', brightestStar: 'Altair', area: 652.5, rank: 22, raCenter: 19.5, decCenter: 5, visibleLatitude: 85 },
  { name: 'Ara', abbreviation: 'Ara', genitive: 'Arae', meaning: 'the altar', family: 'Hercules', brightestStar: 'Beta Arae', area: 237.1, rank: 63, raCenter: 17.5, decCenter: -55, visibleLatitude: 35 },
  { name: 'Aries', abbreviation: 'Ari', genitive: 'Arietis', meaning: 'the ram', family: 'Zodiac', brightestStar: 'Hamal', area: 441.0, rank: 39, raCenter: 2.5, decCenter: 20, visibleLatitude: 90 },
  { name: 'Auriga', abbreviation: 'Aur', genitive: 'Aurigae', meaning: 'the charioteer', family: 'Perseus', brightestStar: 'Capella', area: 657.4, rank: 21, raCenter: 6.0, decCenter: 40, visibleLatitude: 90 },
  { name: 'Bootes', abbreviation: 'Boo', genitive: 'Bootis', meaning: 'the herdsman', family: 'Ursa Major', brightestStar: 'Arcturus', area: 906.8, rank: 13, raCenter: 14.7, decCenter: 30, visibleLatitude: 90 },
  { name: 'Caelum', abbreviation: 'Cae', genitive: 'Caeli', meaning: 'the chisel', family: 'Hercules', brightestStar: 'Alpha Caeli', area: 124.9, rank: 81, raCenter: 4.8, decCenter: -38, visibleLatitude: 52 },
  { name: 'Camelopardalis', abbreviation: 'Cam', genitive: 'Camelopardalis', meaning: 'the giraffe', family: 'Ursa Major', brightestStar: 'Beta Camelopardalis', area: 756.8, rank: 18, raCenter: 5.5, decCenter: 70, visibleLatitude: 20 },
  { name: 'Cancer', abbreviation: 'Cnc', genitive: 'Cancri', meaning: 'the crab', family: 'Zodiac', brightestStar: 'Tarf', area: 505.9, rank: 31, raCenter: 8.5, decCenter: 20, visibleLatitude: 90 },
  { name: 'Canes Venatici', abbreviation: 'CVn', genitive: 'Canum Venaticorum', meaning: 'the hunting dogs', family: 'Ursa Major', brightestStar: 'Cor Caroli', area: 465.2, rank: 38, raCenter: 13.0, decCenter: 40, visibleLatitude: 90 },
  { name: 'Canis Major', abbreviation: 'CMa', genitive: 'Canis Majoris', meaning: 'the greater dog', family: 'Orion', brightestStar: 'Sirius', area: 380.1, rank: 43, raCenter: 6.9, decCenter: -22, visibleLatitude: 68 },
  { name: 'Canis Minor', abbreviation: 'CMi', genitive: 'Canis Minoris', meaning: 'the lesser dog', family: 'Orion', brightestStar: 'Procyon', area: 183.4, rank: 71, raCenter: 7.7, decCenter: 7, visibleLatitude: 83 },
  { name: 'Capricornus', abbreviation: 'Cap', genitive: 'Capricorni', meaning: 'the sea goat', family: 'Zodiac', brightestStar: 'Deneb Algedi', area: 413.9, rank: 40, raCenter: 21.0, decCenter: -20, visibleLatitude: 70 },
  { name: 'Carina', abbreviation: 'Car', genitive: 'Carinae', meaning: 'the keel', family: 'Heavenly Waters', brightestStar: 'Canopus', area: 494.2, rank: 34, raCenter: 7.5, decCenter: -63, visibleLatitude: 27 },
  { name: 'Cassiopeia', abbreviation: 'Cas', genitive: 'Cassiopeiae', meaning: 'the queen', family: 'Perseus', brightestStar: 'Schedar', area: 598.4, rank: 25, raCenter: 1.0, decCenter: 60, visibleLatitude: 90 },
  { name: 'Centaurus', abbreviation: 'Cen', genitive: 'Centauri', meaning: 'the centaur', family: 'Hercules', brightestStar: 'Rigil Kentaurus', area: 1060.4, rank: 9, raCenter: 13.0, decCenter: -47, visibleLatitude: 43 },
  { name: 'Cepheus', abbreviation: 'Cep', genitive: 'Cephei', meaning: 'the king', family: 'Perseus', brightestStar: 'Alderamin', area: 587.8, rank: 27, raCenter: 22.0, decCenter: 70, visibleLatitude: 20 },
  { name: 'Cetus', abbreviation: 'Cet', genitive: 'Ceti', meaning: 'the sea monster', family: 'Heavenly Waters', brightestStar: 'Diphda', area: 1231.4, rank: 4, raCenter: 1.5, decCenter: -10, visibleLatitude: 80 },
  { name: 'Chamaeleon', abbreviation: 'Cha', genitive: 'Chamaeleontis', meaning: 'the chameleon', family: 'Hercules', brightestStar: 'Alpha Chamaeleontis', area: 131.6, rank: 79, raCenter: 10.5, decCenter: -79, visibleLatitude: 11 },
  { name: 'Circinus', abbreviation: 'Cir', genitive: 'Circini', meaning: 'the compass', family: 'Hercules', brightestStar: 'Alpha Circini', area: 93.4, rank: 84, raCenter: 14.5, decCenter: -63, visibleLatitude: 27 },
  { name: 'Columba', abbreviation: 'Col', genitive: 'Columbae', meaning: 'the dove', family: 'Heavenly Waters', brightestStar: 'Phact', area: 270.2, rank: 54, raCenter: 5.8, decCenter: -36, visibleLatitude: 54 },
  { name: 'Coma Berenices', abbreviation: 'Com', genitive: 'Comae Berenices', meaning: 'Berenice\'s hair', family: 'Ursa Major', brightestStar: 'Beta Comae Berenices', area: 386.5, rank: 42, raCenter: 12.8, decCenter: 23, visibleLatitude: 67 },
  { name: 'Corona Australis', abbreviation: 'CrA', genitive: 'Coronae Australis', meaning: 'the southern crown', family: 'Hercules', brightestStar: 'Alpha Coronae Australis', area: 127.7, rank: 80, raCenter: 19.0, decCenter: -41, visibleLatitude: 49 },
  { name: 'Corona Borealis', abbreviation: 'CrB', genitive: 'Coronae Borealis', meaning: 'the northern crown', family: 'Ursa Major', brightestStar: 'Alphecca', area: 178.7, rank: 73, raCenter: 15.5, decCenter: 32, visibleLatitude: 90 },
  { name: 'Corvus', abbreviation: 'Crv', genitive: 'Corvi', meaning: 'the crow', family: 'Heavenly Waters', brightestStar: 'Gienah', area: 183.8, rank: 70, raCenter: 12.5, decCenter: -18, visibleLatitude: 72 },
  { name: 'Crater', abbreviation: 'Crt', genitive: 'Crateris', meaning: 'the cup', family: 'Heavenly Waters', brightestStar: 'Delta Crateris', area: 282.4, rank: 53, raCenter: 11.3, decCenter: -16, visibleLatitude: 74 },
  { name: 'Crux', abbreviation: 'Cru', genitive: 'Crucis', meaning: 'the southern cross', family: 'Hercules', brightestStar: 'Acrux', area: 68.4, rank: 88, raCenter: 12.5, decCenter: -60, visibleLatitude: 30 },
  { name: 'Cygnus', abbreviation: 'Cyg', genitive: 'Cygni', meaning: 'the swan', family: 'Hercules', brightestStar: 'Deneb', area: 803.7, rank: 16, raCenter: 20.5, decCenter: 40, visibleLatitude: 90 },
  { name: 'Delphinus', abbreviation: 'Del', genitive: 'Delphini', meaning: 'the dolphin', family: 'Heavenly Waters', brightestStar: 'Rotanev', area: 188.5, rank: 69, raCenter: 20.5, decCenter: 11, visibleLatitude: 79 },
  { name: 'Dorado', abbreviation: 'Dor', genitive: 'Doradus', meaning: 'the goldfish', family: 'Heavenly Waters', brightestStar: 'Alpha Doradus', area: 179.2, rank: 72, raCenter: 5.2, decCenter: -59, visibleLatitude: 31 },
  { name: 'Draco', abbreviation: 'Dra', genitive: 'Draconis', meaning: 'the dragon', family: 'Ursa Major', brightestStar: 'Eltanin', area: 1083.0, rank: 8, raCenter: 15.5, decCenter: 70, visibleLatitude: 20 },
  { name: 'Equuleus', abbreviation: 'Equ', genitive: 'Equulei', meaning: 'the foal', family: 'Heavenly Waters', brightestStar: 'Kitalpha', area: 71.6, rank: 87, raCenter: 21.2, decCenter: 8, visibleLatitude: 82 },
  { name: 'Eridanus', abbreviation: 'Eri', genitive: 'Eridani', meaning: 'the river', family: 'Heavenly Waters', brightestStar: 'Achernar', area: 1137.9, rank: 6, raCenter: 4.2, decCenter: -29, visibleLatitude: 61 },
  { name: 'Fornax', abbreviation: 'For', genitive: 'Fornacis', meaning: 'the furnace', family: 'Hercules', brightestStar: 'Alpha Fornacis', area: 397.5, rank: 41, raCenter: 3.0, decCenter: -32, visibleLatitude: 58 },
  { name: 'Gemini', abbreviation: 'Gem', genitive: 'Geminorum', meaning: 'the twins', family: 'Zodiac', brightestStar: 'Pollux', area: 514.4, rank: 30, raCenter: 7.0, decCenter: 22, visibleLatitude: 90 },
  { name: 'Grus', abbreviation: 'Gru', genitive: 'Gruis', meaning: 'the crane', family: 'Hercules', brightestStar: 'Alnair', area: 365.5, rank: 45, raCenter: 22.5, decCenter: -46, visibleLatitude: 44 },
  { name: 'Hercules', abbreviation: 'Her', genitive: 'Herculis', meaning: 'Hercules', family: 'Hercules', brightestStar: 'Kornephoros', area: 1225.1, rank: 5, raCenter: 17.0, decCenter: 27, visibleLatitude: 63 },
  { name: 'Horologium', abbreviation: 'Hor', genitive: 'Horologii', meaning: 'the clock', family: 'Hercules', brightestStar: 'Alpha Horologii', area: 248.9, rank: 58, raCenter: 3.3, decCenter: -54, visibleLatitude: 36 },
  { name: 'Hydra', abbreviation: 'Hya', genitive: 'Hydrae', meaning: 'the water snake', family: 'Heavenly Waters', brightestStar: 'Alphard', area: 1302.8, rank: 1, raCenter: 11.5, decCenter: -14, visibleLatitude: 76 },
  { name: 'Hydrus', abbreviation: 'Hyi', genitive: 'Hydri', meaning: 'the lesser water snake', family: 'Hercules', brightestStar: 'Beta Hydri', area: 243.0, rank: 61, raCenter: 2.5, decCenter: -70, visibleLatitude: 20 },
  { name: 'Indus', abbreviation: 'Ind', genitive: 'Indi', meaning: 'the Indian', family: 'Hercules', brightestStar: 'Alpha Indi', area: 294.0, rank: 49, raCenter: 21.3, decCenter: -59, visibleLatitude: 31 },
  { name: 'Lacerta', abbreviation: 'Lac', genitive: 'Lacertae', meaning: 'the lizard', family: 'Perseus', brightestStar: 'Alpha Lacertae', area: 200.7, rank: 68, raCenter: 22.5, decCenter: 46, visibleLatitude: 44 },
  { name: 'Leo', abbreviation: 'Leo', genitive: 'Leonis', meaning: 'the lion', family: 'Zodiac', brightestStar: 'Regulus', area: 946.9, rank: 12, raCenter: 10.5, decCenter: 15, visibleLatitude: 90 },
  { name: 'Leo Minor', abbreviation: 'LMi', genitive: 'Leonis Minoris', meaning: 'the lesser lion', family: 'Ursa Major', brightestStar: 'Praecipua', area: 231.9, rank: 64, raCenter: 10.2, decCenter: 32, visibleLatitude: 90 },
  { name: 'Lepus', abbreviation: 'Lep', genitive: 'Leporis', meaning: 'the hare', family: 'Orion', brightestStar: 'Arneb', area: 290.3, rank: 51, raCenter: 5.7, decCenter: -19, visibleLatitude: 71 },
  { name: 'Libra', abbreviation: 'Lib', genitive: 'Librae', meaning: 'the scales', family: 'Zodiac', brightestStar: 'Zubeneschamali', area: 538.1, rank: 29, raCenter: 15.2, decCenter: -14, visibleLatitude: 76 },
  { name: 'Lupus', abbreviation: 'Lup', genitive: 'Lupi', meaning: 'the wolf', family: 'Hercules', brightestStar: 'Alpha Lupi', area: 333.7, rank: 46, raCenter: 15.0, decCenter: -42, visibleLatitude: 48 },
  { name: 'Lynx', abbreviation: 'Lyn', genitive: 'Lyncis', meaning: 'the lynx', family: 'Ursa Major', brightestStar: 'Alpha Lyncis', area: 545.4, rank: 28, raCenter: 7.5, decCenter: 47, visibleLatitude: 90 },
  { name: 'Lyra', abbreviation: 'Lyr', genitive: 'Lyrae', meaning: 'the lyre', family: 'Hercules', brightestStar: 'Vega', area: 286.5, rank: 52, raCenter: 18.8, decCenter: 36, visibleLatitude: 90 },
  { name: 'Mensa', abbreviation: 'Men', genitive: 'Mensae', meaning: 'the table mountain', family: 'Hercules', brightestStar: 'Alpha Mensae', area: 153.5, rank: 75, raCenter: 5.5, decCenter: -78, visibleLatitude: 12 },
  { name: 'Microscopium', abbreviation: 'Mic', genitive: 'Microscopii', meaning: 'the microscope', family: 'Hercules', brightestStar: 'Gamma Microscopii', area: 209.5, rank: 66, raCenter: 21.0, decCenter: -36, visibleLatitude: 54 },
  { name: 'Monoceros', abbreviation: 'Mon', genitive: 'Monocerotis', meaning: 'the unicorn', family: 'Orion', brightestStar: 'Beta Monocerotis', area: 481.6, rank: 35, raCenter: 7.0, decCenter: 1, visibleLatitude: 89 },
  { name: 'Musca', abbreviation: 'Mus', genitive: 'Muscae', meaning: 'the fly', family: 'Hercules', brightestStar: 'Alpha Muscae', area: 138.4, rank: 77, raCenter: 12.6, decCenter: -70, visibleLatitude: 20 },
  { name: 'Norma', abbreviation: 'Nor', genitive: 'Normae', meaning: 'the rule', family: 'Hercules', brightestStar: 'Gamma2 Normae', area: 165.3, rank: 74, raCenter: 16.0, decCenter: -52, visibleLatitude: 38 },
  { name: 'Octans', abbreviation: 'Oct', genitive: 'Octantis', meaning: 'the octant', family: 'Hercules', brightestStar: 'Nu Octantis', area: 291.0, rank: 50, raCenter: 22.0, decCenter: -82, visibleLatitude: 8 },
  { name: 'Ophiuchus', abbreviation: 'Oph', genitive: 'Ophiuchi', meaning: 'the serpent bearer', family: 'Hercules', brightestStar: 'Rasalhague', area: 948.3, rank: 11, raCenter: 17.2, decCenter: -7, visibleLatitude: 83 },
  { name: 'Orion', abbreviation: 'Ori', genitive: 'Orionis', meaning: 'the hunter', family: 'Orion', brightestStar: 'Rigel', area: 594.1, rank: 26, raCenter: 5.6, decCenter: 5, visibleLatitude: 85 },
  { name: 'Pavo', abbreviation: 'Pav', genitive: 'Pavonis', meaning: 'the peacock', family: 'Hercules', brightestStar: 'Peacock', area: 377.7, rank: 44, raCenter: 19.2, decCenter: -65, visibleLatitude: 25 },
  { name: 'Pegasus', abbreviation: 'Peg', genitive: 'Pegasi', meaning: 'the winged horse', family: 'Perseus', brightestStar: 'Enif', area: 1120.8, rank: 7, raCenter: 22.5, decCenter: 20, visibleLatitude: 70 },
  { name: 'Perseus', abbreviation: 'Per', genitive: 'Persei', meaning: 'the hero', family: 'Perseus', brightestStar: 'Mirfak', area: 614.7, rank: 24, raCenter: 3.5, decCenter: 45, visibleLatitude: 90 },
  { name: 'Phoenix', abbreviation: 'Phe', genitive: 'Phoenicis', meaning: 'the phoenix', family: 'Hercules', brightestStar: 'Ankaa', area: 469.3, rank: 37, raCenter: 1.5, decCenter: -49, visibleLatitude: 41 },
  { name: 'Pictor', abbreviation: 'Pic', genitive: 'Pictoris', meaning: 'the painter\'s easel', family: 'Hercules', brightestStar: 'Alpha Pictoris', area: 246.7, rank: 59, raCenter: 6.0, decCenter: -54, visibleLatitude: 36 },
  { name: 'Pisces', abbreviation: 'Psc', genitive: 'Piscium', meaning: 'the fishes', family: 'Zodiac', brightestStar: 'Eta Piscium', area: 889.4, rank: 14, raCenter: 0.5, decCenter: 14, visibleLatitude: 90 },
  { name: 'Piscis Austrinus', abbreviation: 'PsA', genitive: 'Piscis Austrini', meaning: 'the southern fish', family: 'Heavenly Waters', brightestStar: 'Fomalhaut', area: 245.4, rank: 60, raCenter: 22.5, decCenter: -32, visibleLatitude: 58 },
  { name: 'Puppis', abbreviation: 'Pup', genitive: 'Puppis', meaning: 'the stern', family: 'Heavenly Waters', brightestStar: 'Naos', area: 673.4, rank: 20, raCenter: 7.5, decCenter: -25, visibleLatitude: 65 },
  { name: 'Pyxis', abbreviation: 'Pyx', genitive: 'Pyxidis', meaning: 'the compass', family: 'Heavenly Waters', brightestStar: 'Alpha Pyxidis', area: 220.8, rank: 65, raCenter: 8.8, decCenter: -27, visibleLatitude: 63 },
  { name: 'Reticulum', abbreviation: 'Ret', genitive: 'Reticuli', meaning: 'the net', family: 'Hercules', brightestStar: 'Alpha Reticuli', area: 113.9, rank: 82, raCenter: 4.0, decCenter: -60, visibleLatitude: 30 },
  { name: 'Sagitta', abbreviation: 'Sge', genitive: 'Sagittae', meaning: 'the arrow', family: 'Hercules', brightestStar: 'Gamma Sagittae', area: 79.9, rank: 86, raCenter: 19.7, decCenter: 18, visibleLatitude: 90 },
  { name: 'Sagittarius', abbreviation: 'Sgr', genitive: 'Sagittarii', meaning: 'the archer', family: 'Zodiac', brightestStar: 'Kaus Australis', area: 867.4, rank: 15, raCenter: 19.0, decCenter: -25, visibleLatitude: 65 },
  { name: 'Scorpius', abbreviation: 'Sco', genitive: 'Scorpii', meaning: 'the scorpion', family: 'Zodiac', brightestStar: 'Antares', area: 496.8, rank: 33, raCenter: 16.8, decCenter: -27, visibleLatitude: 63 },
  { name: 'Sculptor', abbreviation: 'Scl', genitive: 'Sculptoris', meaning: 'the sculptor', family: 'Hercules', brightestStar: 'Alpha Sculptoris', area: 474.8, rank: 36, raCenter: 0.5, decCenter: -32, visibleLatitude: 58 },
  { name: 'Scutum', abbreviation: 'Sct', genitive: 'Scuti', meaning: 'the shield', family: 'Hercules', brightestStar: 'Alpha Scuti', area: 109.1, rank: 84, raCenter: 18.6, decCenter: -10, visibleLatitude: 80 },
  { name: 'Serpens', abbreviation: 'Ser', genitive: 'Serpentis', meaning: 'the serpent', family: 'Hercules', brightestStar: 'Unukalhai', area: 636.9, rank: 23, raCenter: 16.5, decCenter: 10, visibleLatitude: 80 },
  { name: 'Sextans', abbreviation: 'Sex', genitive: 'Sextantis', meaning: 'the sextant', family: 'Heavenly Waters', brightestStar: 'Alpha Sextantis', area: 313.5, rank: 47, raCenter: 10.3, decCenter: -2, visibleLatitude: 88 },
  { name: 'Taurus', abbreviation: 'Tau', genitive: 'Tauri', meaning: 'the bull', family: 'Zodiac', brightestStar: 'Aldebaran', area: 797.2, rank: 17, raCenter: 4.5, decCenter: 15, visibleLatitude: 90 },
  { name: 'Telescopium', abbreviation: 'Tel', genitive: 'Telescopii', meaning: 'the telescope', family: 'Hercules', brightestStar: 'Alpha Telescopii', area: 251.5, rank: 57, raCenter: 18.5, decCenter: -50, visibleLatitude: 40 },
  { name: 'Triangulum', abbreviation: 'Tri', genitive: 'Trianguli', meaning: 'the triangle', family: 'Perseus', brightestStar: 'Beta Trianguli', area: 131.8, rank: 78, raCenter: 2.2, decCenter: 32, visibleLatitude: 90 },
  { name: 'Triangulum Australe', abbreviation: 'TrA', genitive: 'Trianguli Australis', meaning: 'the southern triangle', family: 'Hercules', brightestStar: 'Atria', area: 109.2, rank: 83, raCenter: 16.0, decCenter: -65, visibleLatitude: 25 },
  { name: 'Tucana', abbreviation: 'Tuc', genitive: 'Tucanae', meaning: 'the toucan', family: 'Hercules', brightestStar: 'Alpha Tucanae', area: 294.6, rank: 48, raCenter: 0.0, decCenter: -65, visibleLatitude: 25 },
  { name: 'Ursa Major', abbreviation: 'UMa', genitive: 'Ursae Majoris', meaning: 'the great bear', family: 'Ursa Major', brightestStar: 'Alioth', area: 1279.7, rank: 3, raCenter: 11.0, decCenter: 50, visibleLatitude: 90 },
  { name: 'Ursa Minor', abbreviation: 'UMi', genitive: 'Ursae Minoris', meaning: 'the little bear', family: 'Ursa Major', brightestStar: 'Polaris', area: 255.9, rank: 56, raCenter: 15.0, decCenter: 77, visibleLatitude: 13 },
  { name: 'Vela', abbreviation: 'Vel', genitive: 'Velorum', meaning: 'the sails', family: 'Heavenly Waters', brightestStar: 'Regor', area: 499.6, rank: 32, raCenter: 9.0, decCenter: -47, visibleLatitude: 43 },
  { name: 'Virgo', abbreviation: 'Vir', genitive: 'Virginis', meaning: 'the maiden', family: 'Zodiac', brightestStar: 'Spica', area: 1294.4, rank: 2, raCenter: 13.4, decCenter: -4, visibleLatitude: 86 },
  { name: 'Volans', abbreviation: 'Vol', genitive: 'Volantis', meaning: 'the flying fish', family: 'Hercules', brightestStar: 'Beta Volantis', area: 141.4, rank: 76, raCenter: 7.8, decCenter: -69, visibleLatitude: 21 },
  { name: 'Vulpecula', abbreviation: 'Vul', genitive: 'Vulpeculae', meaning: 'the fox', family: 'Hercules', brightestStar: 'Anser', area: 268.2, rank: 55, raCenter: 20.0, decCenter: 25, visibleLatitude: 90 },
];

const ASTERISMS_DB: Asterism[] = [
  { name: 'Big Dipper', stars: ['Dubhe', 'Merak', 'Phecda', 'Megrez', 'Alioth', 'Mizar', 'Alkaid'], constellation: 'Ursa Major', description: 'asterism within Ursa Major; also called the Plough' },
  { name: 'Orion\'s Belt', stars: ['Alnitak', 'Alnilam', 'Mintaka'], constellation: 'Orion', description: 'three stars in a row forming Orion\'s belt' },
  { name: 'Southern Cross', stars: ['Acrux', 'Becrux', 'Gacrux', 'Decrux'], constellation: 'Crux', description: 'cross-shaped pattern used for southern navigation' },
  { name: 'Summer Triangle', stars: ['Vega', 'Deneb', 'Altair'], constellation: 'Multiple', description: 'prominent northern summer asterism spanning three constellations' },
  { name: 'Winter Hexagon', stars: ['Sirius', 'Procyon', 'Pollux', 'Capella', 'Aldebaran', 'Rigel'], constellation: 'Multiple', description: 'large winter asterism in the northern hemisphere' },
  { name: 'Northern Cross', stars: ['Deneb', 'Sadr', 'Albireo', 'Gienah', 'Delta Cygni'], constellation: 'Cygnus', description: 'cross-shaped asterism in Cygnus' },
  { name: 'Great Square of Pegasus', stars: ['Markab', 'Scheat', 'Algenib', 'Alpheratz'], constellation: 'Pegasus', description: 'large square outlining the body of Pegasus' },
  { name: 'Little Dipper', stars: ['Polaris', 'Yildun', 'Epsilon UMi', 'Zeta UMi', 'Eta UMi', 'Beta UMi', 'Gamma UMi'], constellation: 'Ursa Minor', description: 'asterism within Ursa Minor containing Polaris' },
  { name: 'Sickle of Leo', stars: ['Regulus', 'Eta Leo', 'Algieba', 'Adhafera', 'Rasalas', 'Algenubi'], constellation: 'Leo', description: 'sickle-shaped asterism representing Leo\'s head and mane' },
  { name: 'Teapot of Sagittarius', stars: ['Kaus Australis', 'Kaus Media', 'Kaus Borealis', 'Alnasl', 'Nunki', 'Phi Sgr', 'Ascella', 'Tau Sgr'], constellation: 'Sagittarius', description: 'teapot-shaped asterism marking the direction to the galactic center' },
  { name: 'Cassiopeia W', stars: ['Segin', 'Ruchbah', 'Gamma Cas', 'Schedar', 'Caph'], constellation: 'Cassiopeia', description: 'W-shaped asterism in Cassiopeia' },
  { name: 'Coathanger', stars: ['Alpha Vulpeculae', 'Beta Vulpeculae', '...'], constellation: 'Vulpecula', description: 'also known as Brocchi\'s Cluster or Collinder 399' },
  { name: 'Diamond of Virgo', stars: ['Spica', 'Arcturus', 'Cor Caroli', 'Denebola'], constellation: 'Multiple', description: 'large diamond asterism in spring skies' },
  { name: 'False Cross', stars: ['Mirzam', 'Adhara', 'Wezen', 'Aludra'], constellation: 'Multiple', description: 'cross-shaped asterism partly in Canis Major and Argo' },
  { name: 'Bow and Arrow of Orion', stars: ['Betelgeuse', 'Bellatrix', 'Orion\'s Belt stars', 'Saiph', 'Rigel'], constellation: 'Orion', description: 'outline of Orion the hunter' },
  { name: 'Triangle of Auriga', stars: ['Capella', 'Epsilon Aurigae', 'Theta Aurigae'], constellation: 'Auriga', description: 'prominent triangle in Auriga' },
  { name: 'Y of Aquarius', stars: ['Sadalsuud', 'Sadalmelik', 'Sadachbia'], constellation: 'Aquarius', description: 'water jar asterism in Aquarius' },
  { name: 'Circlet of Pisces', stars: ['Gamma Psc', 'Kappa Psc', 'Lambda Psc', 'Iota Psc', 'Theta Psc'], constellation: 'Pisces', description: 'circular asterism marking the western fish of Pisces' },
  { name: 'Spring Triangle', stars: ['Arcturus', 'Spica', 'Denebola'], constellation: 'Multiple', description: 'alternative to the Spring Triangle using Denebola' },
  { name: 'Snake of Draco', stars: ['Eltanin', 'Epsilon Dra', 'Zeta Dra', 'Eta Dra', 'Delta Dra', 'Thuban'], constellation: 'Draco', description: 'serpentine body of Draco' },
];

const DEEP_SKY_DB: DeepSkyObject[] = [
  { id: 'd1', catalog: 'M', number: 31, type: 'galaxy', constellation: 'Andromeda', mag: 3.44, ra: 0.72, dec: 41.27, distance: 2.537, name: 'Andromeda Galaxy (M31)' },
  { id: 'd2', catalog: 'M', number: 42, type: 'nebula', constellation: 'Orion', mag: 4.0, ra: 5.59, dec: -5.39, distance: 0.001344, name: 'Orion Nebula (M42)' },
  { id: 'd3', catalog: 'M', number: 45, type: 'open', constellation: 'Taurus', mag: 1.6, ra: 3.79, dec: 24.10, distance: 0.000444, name: 'Pleiades (M45, Seven Sisters)' },
  { id: 'd4', catalog: 'M', number: 13, type: 'globular', constellation: 'Hercules', mag: 5.8, ra: 16.69, dec: 36.46, distance: 0.0222, name: 'Hercules Cluster (M13)' },
  { id: 'd5', catalog: 'M', number: 1, type: 'nebula', constellation: 'Taurus', mag: 8.4, ra: 5.58, dec: 22.0, distance: 0.0065, name: 'Crab Nebula (M1)' },
  { id: 'd6', catalog: 'M', number: 57, type: 'planetary', constellation: 'Lyra', mag: 8.8, ra: 18.89, dec: 33.03, distance: 0.0023, name: 'Ring Nebula (M57)' },
  { id: 'd7', catalog: 'M', number: 51, type: 'galaxy', constellation: 'Canes Venatici', mag: 8.4, ra: 13.5, dec: 47.20, distance: 8.4, name: 'Whirlpool Galaxy (M51)' },
  { id: 'd8', catalog: 'M', number: 81, type: 'galaxy', constellation: 'Ursa Major', mag: 6.94, ra: 9.93, dec: 69.07, distance: 3.63, name: 'Bode\'s Galaxy (M81)' },
  { id: 'd9', catalog: 'M', number: 82, type: 'galaxy', constellation: 'Ursa Major', mag: 8.41, ra: 9.93, dec: 69.68, distance: 3.63, name: 'Cigar Galaxy (M82)' },
  { id: 'd10', catalog: 'M', number: 104, type: 'galaxy', constellation: 'Virgo', mag: 8.0, ra: 12.66, dec: -11.62, distance: 9.55, name: 'Sombrero Galaxy (M104)' },
  { id: 'd11', catalog: 'M', number: 27, type: 'planetary', constellation: 'Vulpecula', mag: 7.5, ra: 19.94, dec: 22.72, distance: 0.00136, name: 'Dumbbell Nebula (M27)' },
  { id: 'd12', catalog: 'M', number: 15, type: 'globular', constellation: 'Pegasus', mag: 6.2, ra: 21.5, dec: 12.17, distance: 0.0336, name: 'Great Pegasus Cluster (M15)' },
  { id: 'd13', catalog: 'NGC', number: 224, type: 'galaxy', constellation: 'Andromeda', mag: 3.44, ra: 0.72, dec: 41.27, distance: 2.537, name: 'Andromeda Galaxy (NGC 224)' },
  { id: 'd14', catalog: 'NGC', number: 1976, type: 'nebula', constellation: 'Orion', mag: 4.0, ra: 5.59, dec: -5.39, distance: 0.001344, name: 'Orion Nebula (NGC 1976)' },
  { id: 'd15', catalog: 'NGC', number: 6960, type: 'nebula', constellation: 'Cygnus', mag: 7.0, ra: 20.45, dec: 30.73, distance: 0.00147, name: 'Veil Nebula (NGC 6960, Witch\'s Broom)' },
  { id: 'd16', catalog: 'NGC', number: 6992, type: 'nebula', constellation: 'Cygnus', mag: 7.0, ra: 20.93, dec: 31.43, distance: 0.00147, name: 'Eastern Veil Nebula (NGC 6992)' },
  { id: 'd17', catalog: 'NGC', number: 7000, type: 'nebula', constellation: 'Cygnus', mag: 4.0, ra: 20.99, dec: 44.31, distance: 0.00052, name: 'North America Nebula (NGC 7000)' },
  { id: 'd18', catalog: 'NGC', number: 2237, type: 'nebula', constellation: 'Monoceros', mag: 9.0, ra: 6.49, dec: 4.95, distance: 0.0043, name: 'Rosette Nebula (NGC 2237)' },
  { id: 'd19', catalog: 'NGC', number: 869, type: 'open', constellation: 'Perseus', mag: 4.3, ra: 2.19, dec: 57.14, distance: 0.0076, name: 'Double Cluster - h Persei (NGC 869)' },
  { id: 'd20', catalog: 'NGC', number: 884, type: 'open', constellation: 'Perseus', mag: 4.4, ra: 2.22, dec: 57.14, distance: 0.0076, name: 'Double Cluster - Chi Persei (NGC 884)' },
];

const VARIABLE_STARS: VariableStar[] = [
  { name: 'Cepheid', type: 'cepheid', minMag: 3.5, maxMag: 4.4, period: 5.366, spectralClass: 'F6Ib-V' },
  { name: 'Polaris', type: 'cepheid', minMag: 1.86, maxMag: 2.13, period: 3.97, spectralClass: 'F7Ib' },
  { name: 'RR Lyrae', type: 'rr-lyrae', minMag: 7.06, maxMag: 8.12, period: 0.5668, spectralClass: 'A5-F7' },
  { name: 'Mira', type: 'long-period', minMag: 2.0, maxMag: 10.1, period: 332, spectralClass: 'M7IIIe' },
  { name: 'Chi Cygni', type: 'long-period', minMag: 3.3, maxMag: 14.2, period: 408, spectralClass: 'S7IIIe' },
  { name: 'Algol', type: 'eclipsing', minMag: 3.5, maxMag: 2.12, period: 2.867, spectralClass: 'B8V' },
  { name: 'Beta Lyrae', type: 'eclipsing', minMag: 4.46, maxMag: 3.45, period: 12.94, spectralClass: 'B7V' },
  { name: 'SS Cygni', type: 'cataclysmic', minMag: 8.3, maxMag: 12.4, period: 0.276, spectralClass: 'G5V+K5V' },
  { name: 'U Geminorum', type: 'cataclysmic', minMag: 8.5, maxMag: 14.5, period: 0.1769, spectralClass: 'M4.5V' },
  { name: 'UV Ceti', type: 'eruptive', minMag: 6.8, maxMag: 13.0, period: 0, spectralClass: 'M5.5Ve' },
  { name: 'BY Draconis', type: 'rotating', minMag: 8.54, maxMag: 8.30, period: 3.836, spectralClass: 'K6V' },
  { name: 'RS Canum Venaticorum', type: 'rotating', minMag: 8.07, maxMag: 8.03, period: 4.824, spectralClass: 'F4V+K1V' },
];

const MYTHOLOGY_DB: Mythology[] = [
  { constellation: 'Orion', culture: 'Greek', story: 'A great hunter who was killed by a scorpion sent by Gaia; placed in the sky opposite Scorpius.' },
  { constellation: 'Ursa Major', culture: 'Greek', story: 'Zeus transformed the nymph Callisto into a bear and placed her in the sky to protect her from Hera.' },
  { constellation: 'Ursa Major', culture: 'Native American', story: 'Three brothers chased a bear; the stars of the Big Dipper handle are the hunters.' },
  { constellation: 'Cassiopeia', culture: 'Greek', story: 'Queen of Aethiopia, punished by Poseidon for vanity; bound to a throne that circles the pole.' },
  { constellation: 'Andromeda', culture: 'Greek', story: 'Daughter of Cassiopeia, chained to a rock as sacrifice and rescued by Perseus.' },
  { constellation: 'Perseus', culture: 'Greek', story: 'Hero who slew the Gorgon Medusa and rescued Andromeda.' },
  { constellation: 'Pegasus', culture: 'Greek', story: 'Winged horse born from the blood of Medusa; later carried thunderbolts for Zeus.' },
  { constellation: 'Hercules', culture: 'Greek', story: 'Son of Zeus; performed twelve labors and was placed among the stars after death.' },
  { constellation: 'Leo', culture: 'Greek', story: 'Nemean lion slain by Hercules as his first labor.' },
  { constellation: 'Taurus', culture: 'Greek', story: 'Zeus disguised as a white bull to abduct Europa.' },
  { constellation: 'Taurus', culture: 'Babylonian', story: 'The Bull of Heaven, sent by Ishtar and slain by Gilgamesh.' },
  { constellation: 'Cygnus', culture: 'Greek', story: 'Zeus as a swan seduced Leda, mother of Helen of Troy.' },
  { constellation: 'Lyra', culture: 'Greek', story: 'The lyre of Orpheus, which could charm all living things.' },
  { constellation: 'Aquila', culture: 'Greek', story: 'The eagle of Zeus that carried his thunderbolts.' },
  { constellation: 'Aquila', culture: 'Roman', story: 'Eagle that retrieved the beautiful boy Ganymede to serve as cupbearer to the gods.' },
  { constellation: 'Scorpius', culture: 'Greek', story: 'Scorpion sent by Gaia to kill Orion; placed opposite Orion in the sky.' },
  { constellation: 'Sagittarius', culture: 'Greek', story: 'A centaur (Chiron or Crotus) drawing a bow, often aiming at Scorpius.' },
  { constellation: 'Capricornus', culture: 'Greek', story: 'Capricorn, the sea-goat; related to Pan fleeing from Typhon by transforming half into a fish.' },
  { constellation: 'Gemini', culture: 'Greek', story: 'The twins Castor and Pollux, patrons of sailors.' },
  { constellation: 'Virgo', culture: 'Greek', story: 'Astraea, goddess of justice, who fled to the heavens as humanity became wicked.' },
  { constellation: 'Virgo', culture: 'Babylonian', story: 'Shala, goddess of grain, holding an ear of wheat (the star Spica).' },
  { constellation: 'Bootes', culture: 'Greek', story: 'The herdsman who drives the Great Bear around the pole; identified with Icarius, who introduced wine.' },
  { constellation: 'Canis Major', culture: 'Greek', story: 'One of Orion\'s hunting dogs; Sirius is its bright star.' },
  { constellation: 'Canis Minor', culture: 'Greek', story: 'The smaller of Orion\'s dogs, sometimes identified with the faithful dog Maera.' },
  { constellation: 'Crux', culture: 'Various', story: 'Used by southern hemisphere sailors for navigation; often called the Southern Cross.' },
  { constellation: 'Carina', culture: 'Greek', story: 'Part of Argo Navis, the ship of Jason and the Argonauts.' },
  { constellation: 'Cetus', culture: 'Greek', story: 'Sea monster sent to devour Andromeda, slain by Perseus.' },
  { constellation: 'Draco', culture: 'Greek', story: 'Dragon slain by Cadmus, or the dragon that guarded the golden apples of Hesperides.' },
];

const CONSTELLATION_FAMILIES: ConstellationFamily[] = [
  { name: 'Ursa Major', constellations: ['Ursa Major', 'Ursa Minor', 'Draco', 'Bootes', 'Coma Berenices', 'Corona Borealis', 'Canes Venatici', 'Camelopardalis', 'Lynx', 'Leo Minor'], description: 'Family associated with the great bear and related northern constellations' },
  { name: 'Perseus', constellations: ['Perseus', 'Andromeda', 'Cassiopeia', 'Cepheus', 'Cetus', 'Pegasus', 'Lacerta', 'Triangulum'], description: 'Family relating to the Perseus myth' },
  { name: 'Hercules', constellations: ['Hercules', 'Aquila', 'Lyra', 'Cygnus', 'Ophiuchus', 'Serpens', 'Sagitta', 'Vulpecula', 'Hydra', 'Crater', 'Corvus', 'Centaurus', 'Lupus', 'Ara', 'Corona Australis', 'Triangulum Australe', 'Norma', 'Telescopium', 'Octans', 'Apus', 'Musca', 'Chamaeleon', 'Circinus', 'Mensa', 'Pavo', 'Tucana', 'Hydrus', 'Phoenix', 'Grus', 'Indus', 'Microscopium', 'Sculptor', 'Fornax', 'Caelum', 'Horologium', 'Reticulum', 'Pictor', 'Antlia'], description: 'Large family including Hercules and many faint southern constellations' },
  { name: 'Orion', constellations: ['Orion', 'Canis Major', 'Canis Minor', 'Lepus', 'Monoceros'], description: 'Family of Orion and his hunting dogs' },
  { name: 'Heavenly Waters', constellations: ['Pisces', 'Piscis Austrinus', 'Capricornus', 'Aquarius', 'Cetus', 'Eridanus', 'Carina', 'Puppis', 'Vela', 'Pyxis', 'Crater', 'Delphinus', 'Columba', 'Dorado'], description: 'Family of water-related constellations' },
  { name: 'Bayer', constellations: ['Pavo', 'Toucana', 'Phoenix', 'Grus', 'Apus', 'Musca', 'Chamaeleon', 'Volans', 'Hydrus', 'Triangulum Australe', 'Reticulum', 'Pictor', 'Mensa', 'Octans', 'Horologium', 'Reticulum'], description: 'Family of southern constellations introduced by Johann Bayer' },
  { name: 'La Caille', constellations: ['Antlia', 'Caelum', 'Circinus', 'Fornax', 'Horologium', 'Microscopium', 'Norma', 'Octans', 'Pictor', 'Reticulum', 'Sculptor', 'Telescopium'], description: 'Family of mostly faint southern constellations introduced by Nicolas-Louis de La Caille' },
  { name: 'Zodiac', constellations: ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpius', 'Sagittarius', 'Capricornus', 'Aquarius', 'Pisces'], description: 'The 12 classical zodiac constellations lying along the ecliptic' },
];

const STAR_ETYMOLOGY: StarEtymology[] = [
  { star: 'Sirius', origin: 'Greek Σείριος', meaning: 'scorching or sparkling', language: 'Greek' },
  { star: 'Canopus', origin: 'mythical helmsman of Menelaus', meaning: 'named after the pilot of Menelaus\'s fleet', language: 'Greek' },
  { star: 'Arcturus', origin: 'Greek Ἀρκτοῦρος', meaning: 'bear watcher or guardian of the bear', language: 'Greek' },
  { star: 'Vega', origin: 'Arabic waqi', meaning: 'swooping eagle (al-nasr al-wāqiʿ)', language: 'Arabic' },
  { star: 'Capella', origin: 'Latin capella', meaning: 'little she-goat', language: 'Latin' },
  { star: 'Rigel', origin: 'Arabic rijl', meaning: 'foot (of Orion)', language: 'Arabic' },
  { star: 'Procyon', origin: 'Greek προκύων', meaning: 'before the dog', language: 'Greek' },
  { star: 'Betelgeuse', origin: 'Arabic yad al-jawzāʾ', meaning: 'hand of the central one', language: 'Arabic' },
  { star: 'Altair', origin: 'Arabic al-nasr al-ṭāʾir', meaning: 'the flying eagle', language: 'Arabic' },
  { star: 'Aldebaran', origin: 'Arabic al-dabarān', meaning: 'the follower', language: 'Arabic' },
  { star: 'Antares', origin: 'Greek Ἀντάρης', meaning: 'rival of Ares (Mars)', language: 'Greek' },
  { star: 'Spica', origin: 'Latin spica', meaning: 'ear of wheat', language: 'Latin' },
  { star: 'Pollux', origin: 'Greek Polydeuces', meaning: 'one of the Dioscuri twins', language: 'Greek' },
  { star: 'Fomalhaut', origin: 'Arabic fam al-ḥūt', meaning: 'mouth of the (southern) fish', language: 'Arabic' },
  { star: 'Deneb', origin: 'Arabic dhanab', meaning: 'tail', language: 'Arabic' },
  { star: 'Regulus', origin: 'Latin', meaning: 'little king', language: 'Latin' },
  { star: 'Castor', origin: 'Greek Kastor', meaning: 'one of the Dioscuri twins', language: 'Greek' },
  { star: 'Gacrux', origin: 'Gamma + Crux', meaning: 'Gamma of Crux', language: 'Modern' },
  { star: 'Acrux', origin: 'Alpha + Crux', meaning: 'Alpha of Crux', language: 'Modern' },
  { star: 'Bellatrix', origin: 'Latin', meaning: 'female warrior', language: 'Latin' },
  { star: 'Mintaka', origin: 'Arabic minṭaqa', meaning: 'belt', language: 'Arabic' },
  { star: 'Alnilam', origin: 'Arabic al-niẓām', meaning: 'string of pearls', language: 'Arabic' },
  { star: 'Alnitak', origin: 'Arabic al-niṭāq', meaning: 'girdle', language: 'Arabic' },
  { star: 'Saiph', origin: 'Arabic saif', meaning: 'sword of the giant', language: 'Arabic' },
  { star: 'Polaris', origin: 'Latin stella polaris', meaning: 'pole star', language: 'Latin' },
  { star: 'Mizar', origin: 'Arabic miʾzar', meaning: 'waistband or girdle', language: 'Arabic' },
  { star: 'Dubhe', origin: 'Arabic dubb', meaning: 'bear', language: 'Arabic' },
  { star: 'Merak', origin: 'Arabic marāqq', meaning: 'loins', language: 'Arabic' },
  { star: 'Phecda', origin: 'Arabic fakhidh', meaning: 'thigh', language: 'Arabic' },
  { star: 'Megrez', origin: 'Arabic maghriz', meaning: 'root of the tail', language: 'Arabic' },
  { star: 'Alioth', origin: 'Arabic al-yat', meaning: 'the sheep\'s tail', language: 'Arabic' },
  { star: 'Alkaid', origin: 'Arabic al-qāʾid', meaning: 'leader of the daughters of the bier', language: 'Arabic' },
  { star: 'Algol', origin: 'Arabic raʾs al-ghūl', meaning: 'head of the demon', language: 'Arabic' },
  { star: 'Mirfak', origin: 'Arabic mirfaq', meaning: 'elbow', language: 'Arabic' },
  { star: 'Hamal', origin: 'Arabic al-ḥamal', meaning: 'the ram', language: 'Arabic' },
  { star: 'Diphda', origin: 'Arabic ḍifdaʿ', meaning: 'frog', language: 'Arabic' },
];

const SPECTRAL_CLASS_TABLE: SpectralClassEntry[] = [
  { letter: 'O', temperature: [30000, 50000], color: 'blue', mass: [16, 90], radius: [6.6, 12], examples: ['Zeta Ophiuchi', 'Mintaka', 'Alnitak'] },
  { letter: 'B', temperature: [10000, 30000], color: 'blue-white', mass: [2.1, 16], radius: [1.8, 6.6], examples: ['Rigel', 'Spica', 'Bellatrix'] },
  { letter: 'A', temperature: [7500, 10000], color: 'white', mass: [1.4, 2.1], radius: [1.4, 1.8], examples: ['Sirius', 'Vega', 'Altair'] },
  { letter: 'F', temperature: [6000, 7500], color: 'yellow-white', mass: [1.04, 1.4], radius: [1.15, 1.4], examples: ['Procyon', 'Canopus', 'Polaris'] },
  { letter: 'G', temperature: [5200, 6000], color: 'yellow', mass: [0.8, 1.04], radius: [0.96, 1.15], examples: ['Sun', 'Capella', 'Alpha Centauri A'] },
  { letter: 'K', temperature: [3700, 5200], color: 'orange', mass: [0.45, 0.8], radius: [0.7, 0.96], examples: ['Arcturus', 'Aldebaran', 'Pollux'] },
  { letter: 'M', temperature: [2400, 3700], color: 'red', mass: [0.08, 0.45], radius: [0.1, 0.7], examples: ['Betelgeuse', 'Antares', 'Proxima Centauri'] },
  { letter: 'L', temperature: [1300, 2400], color: 'deep red-brown', mass: [0.01, 0.08], radius: [0.08, 0.2], examples: ['L dwarfs: Luhman 16'] },
  { letter: 'T', temperature: [500, 1300], color: 'magenta (methane)', mass: [0.005, 0.05], radius: [0.08, 0.2], examples: ['T dwarfs: Gliese 229B'] },
  { letter: 'Y', temperature: [200, 500], color: 'dark magenta/infrared', mass: [0.005, 0.03], radius: [0.08, 0.2], examples: ['Y dwarfs: WISE 1828+2650'] },
  { letter: 'W', temperature: [30000, 50000], color: 'blue', mass: [10, 30], radius: [3, 15], examples: ['Wolf-Rayet stars: WR 124'] },
  { letter: 'C', temperature: [2400, 3700], color: 'red', mass: [0.5, 5], radius: [50, 300], examples: ['Carbon stars: La Superba (Y CVn)'] },
  { letter: 'S', temperature: [2400, 3700], color: 'red', mass: [1, 5], radius: [50, 200], examples: ['S stars: Chi Cygni'] },
];

const HR_REGIONS: HRRegion[] = [
  { name: 'Main Sequence', spectralRange: 'O-M', luminosityRange: '0.001-1e6 L_sun', description: 'The diagonal band where stars spend most of their lives fusing hydrogen into helium.' },
  { name: 'Red Giants', spectralRange: 'G-M', luminosityRange: '10-1000 L_sun', description: 'Cool, large stars in late hydrogen-shell burning phase.' },
  { name: 'Red Supergiants', spectralRange: 'K-M', luminosityRange: '1e4-1e6 L_sun', description: 'The largest stars by radius; includes Betelgeuse and Antares.' },
  { name: 'Blue Supergiants', spectralRange: 'O-B', luminosityRange: '1e4-1e6 L_sun', description: 'Hot, luminous high-mass stars; e.g., Rigel.' },
  { name: 'White Dwarfs', spectralRange: 'B-G', luminosityRange: '0.001-0.01 L_sun', description: 'Dense stellar remnants of low- and intermediate-mass stars.' },
  { name: 'Subgiants', spectralRange: 'F-K', luminosityRange: '1-10 L_sun', description: 'Stars in transition between main sequence and red giants.' },
  { name: 'Asymptotic Giant Branch', spectralRange: 'M-C-S', luminosityRange: '1000-1e4 L_sun', description: 'Late-stage stars fusing helium in shell and hydrogen in outer shell.' },
  { name: 'Horizontal Branch', spectralRange: 'B-K', luminosityRange: '50-100 L_sun', description: 'Post-helium-flash stars fusing helium in core.' },
  { name: 'Brown Dwarfs', spectralRange: 'L-T-Y', luminosityRange: '0-1e-5 L_sun', description: 'Sub-stellar objects not massive enough for hydrogen fusion.' },
  { name: 'Bright Giants', spectralRange: 'A-M', luminosityRange: '100-1000 L_sun', description: 'Luminosity class II stars, between giants and supergiants.' },
];

const ZODIAC_CONSTELLATIONS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpius', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

/** Greek alphabet used for Bayer designations. */
const GREEK_ALPHABET: { name: string; letter: string; ordinal: number }[] = [
  { name: 'Alpha', letter: 'α', ordinal: 1 },
  { name: 'Beta', letter: 'β', ordinal: 2 },
  { name: 'Gamma', letter: 'γ', ordinal: 3 },
  { name: 'Delta', letter: 'δ', ordinal: 4 },
  { name: 'Epsilon', letter: 'ε', ordinal: 5 },
  { name: 'Zeta', letter: 'ζ', ordinal: 6 },
  { name: 'Eta', letter: 'η', ordinal: 7 },
  { name: 'Theta', letter: 'θ', ordinal: 8 },
  { name: 'Iota', letter: 'ι', ordinal: 9 },
  { name: 'Kappa', letter: 'κ', ordinal: 10 },
  { name: 'Lambda', letter: 'λ', ordinal: 11 },
  { name: 'Mu', letter: 'μ', ordinal: 12 },
  { name: 'Nu', letter: 'ν', ordinal: 13 },
  { name: 'Xi', letter: 'ξ', ordinal: 14 },
  { name: 'Omicron', letter: 'ο', ordinal: 15 },
  { name: 'Pi', letter: 'π', ordinal: 16 },
  { name: 'Rho', letter: 'ρ', ordinal: 17 },
  { name: 'Sigma', letter: 'σ', ordinal: 18 },
  { name: 'Tau', letter: 'τ', ordinal: 19 },
  { name: 'Upsilon', letter: 'υ', ordinal: 20 },
  { name: 'Phi', letter: 'φ', ordinal: 21 },
  { name: 'Chi', letter: 'χ', ordinal: 22 },
  { name: 'Psi', letter: 'ψ', ordinal: 23 },
  { name: 'Omega', letter: 'ω', ordinal: 24 },
];

export class Constellations {
  private _constellations: Map<string, Constellation> = new Map();
  private _info: Map<string, ConstellationInfo> = new Map();
  private _stars: Star[] = [];
  private _detailed: Map<string, StarDetails> = new Map();
  private _asterisms: Asterism[] = [];
  private _deepSky: DeepSkyObject[] = [];
  private _variables: VariableStar[] = [];
  private _mythology: Mythology[] = [];
  private _families: ConstellationFamily[] = [];
  private _etymology: StarEtymology[] = [];
  private _spectralTable: SpectralClassEntry[] = [];
  private _hrRegions: HRRegion[] = [];
  private _history: ConstellationRecord[] = [];
  private _counter = 0;

  constructor() {
    for (const c of CONSTELLATIONS_DB) this._constellations.set(c.name, c);
    for (const info of CONSTELLATIONS_INFO) this._info.set(info.name, info);
    for (const d of STARS_DETAILED) this._detailed.set(d.name, d);
    this._stars = [...STARS_DB];
    this._asterisms = [...ASTERISMS_DB];
    this._deepSky = [...DEEP_SKY_DB];
    this._variables = [...VARIABLE_STARS];
    this._mythology = [...MYTHOLOGY_DB];
    this._families = [...CONSTELLATION_FAMILIES];
    this._etymology = [...STAR_ETYMOLOGY];
    this._spectralTable = [...SPECTRAL_CLASS_TABLE];
    this._hrRegions = [...HR_REGIONS];
  }

  getConstellation(name: string): Constellation | null {
    return this._constellations.get(name) ?? null;
  }

  getConstellationInfo(name: string): ConstellationInfo | null {
    return this._info.get(name) ?? null;
  }

  allConstellationInfo(): ConstellationInfo[] {
    return [...this._info.values()].sort((a, b) => a.rank - b.rank);
  }

  findByAbbreviation(abbr: string): ConstellationInfo | null {
    const upper = abbr.toUpperCase();
    for (const info of this._info.values()) {
      if (info.abbreviation.toUpperCase() === upper) return info;
    }
    return null;
  }

  findStar(name: string): Star | null {
    const lower = name.toLowerCase();
    return this._stars.find(s => s.name.toLowerCase() === lower || s.bayer.toLowerCase().includes(lower)) ?? null;
  }

  findStarDetails(name: string): StarDetails | null {
    return this._detailed.get(name) ?? null;
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
    return [...ZODIAC_CONSTELLATIONS];
  }

  zodiacConstellations(): ConstellationInfo[] {
    return ZODIAC_CONSTELLATIONS
      .map(name => this._info.get(name))
      .filter((c): c is ConstellationInfo => c !== undefined);
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
    this._history.push({ operation: 'starChart', target: `lat=${lat}`, timestamp: Date.now() });
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

  spectralClassInfo(letter: SpectralClassLetter): SpectralClassEntry | null {
    return this._spectralTable.find(s => s.letter === letter) ?? null;
  }

  spectralTable(): SpectralClassEntry[] {
    return [...this._spectralTable];
  }

  luminosityClassInfo(lc: LuminosityClass): { name: string; description: string } {
    const table: Record<LuminosityClass, { name: string; description: string }> = {
      'Ia': { name: 'Bright Supergiant', description: 'Most luminous supergiants' },
      'Ib': { name: 'Supergiant', description: 'Less luminous supergiants' },
      'II': { name: 'Bright Giant', description: 'Between giants and supergiants' },
      'III': { name: 'Giant', description: 'Normal giants' },
      'IV': { name: 'Subgiant', description: 'Stars evolving off the main sequence' },
      'V': { name: 'Main Sequence (Dwarf)', description: 'Stars fusing hydrogen in core' },
      'VI': { name: 'Subdwarf', description: 'Below main sequence' },
      'VII': { name: 'White Dwarf', description: 'Stellar remnants' },
    };
    return table[lc];
  }

  parseSpectralType(type: string): { letter: SpectralClassLetter; subclass: number; luminosity: LuminosityClass | null } | null {
    if (!type || type.length < 1) return null;
    const letter = type[0].toUpperCase() as SpectralClassLetter;
    const validLetters = ['O', 'B', 'A', 'F', 'G', 'K', 'M', 'L', 'T', 'Y', 'W', 'C', 'S'];
    if (!validLetters.includes(letter)) return null;
    let subclass = 0;
    let idx = 1;
    while (idx < type.length && /[0-9]/.test(type[idx])) {
      subclass = subclass * 10 + parseInt(type[idx], 10);
      idx++;
    }
    if (idx === 1) subclass = 0;
    let luminosity: LuminosityClass | null = null;
    const rest = type.slice(idx);
    const lumMatch = rest.match(/^(Ia|Ib|II|III|IV|V|VI|VII)/);
    if (lumMatch) luminosity = lumMatch[0] as LuminosityClass;
    return { letter, subclass, luminosity };
  }

  properMotion(star: Star): { ra: number; dec: number; total: number } {
    const ra = Math.random() * 0.1;
    const dec = Math.random() * 0.1;
    return { ra, dec, total: Math.sqrt(ra * ra + dec * dec) };
  }

  parallax(star: Star, distance: number): number {
    void star;
    return 1000 / Math.max(0.01, distance);
  }

  parallaxToDistance(parallaxMas: number): number {
    if (parallaxMas <= 0) return Infinity;
    return 1000 / parallaxMas;
  }

  distanceToParallax(distanceLy: number): number {
    if (distanceLy <= 0) return 0;
    return 1000 / distanceLy;
  }

  coordinateConvert(ra: number, dec: number, _alt: number, _az: number, lat: number, _lon: number, _time: number): { alt: number; az: number } {
    const ha = 0;
    const sinAlt = Math.sin(dec * Math.PI / 180) * Math.sin(lat * Math.PI / 180) +
      Math.cos(dec * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * Math.cos(ha);
    const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt))) * 180 / Math.PI;
    const cosAlt = Math.cos(Math.asin(Math.max(-1, Math.min(1, sinAlt))));
    const cosAz = (Math.sin(dec * Math.PI / 180) - sinAlt * Math.sin(lat * Math.PI / 180)) /
      Math.max(1e-12, cosAlt * Math.cos(lat * Math.PI / 180));
    const az = Math.acos(Math.max(-1, Math.min(1, cosAz))) * 180 / Math.PI;
    void ra;
    return { alt, az };
  }

  /** Convert equatorial (RA, Dec) to galactic (l, b) coordinates in degrees. */
  equatorialToGalactic(raHours: number, decDeg: number): { l: number; b: number } {
    const raDeg = raHours * 15;
    const raRad = raDeg * Math.PI / 180;
    const decRad = decDeg * Math.PI / 180;
    // J2000 north galactic pole: RA=192.85948 deg, Dec=27.12825 deg
    const ngpRa = 192.85948 * Math.PI / 180;
    const ngpDec = 27.12825 * Math.PI / 180;
    const l0 = 32.93192 * Math.PI / 180; // Galactic center longitude
    const sinB = Math.sin(decRad) * Math.sin(ngpDec) + Math.cos(decRad) * Math.cos(ngpDec) * Math.cos(raRad - ngpRa);
    const b = Math.asin(Math.max(-1, Math.min(1, sinB)));
    const y = Math.sin(raRad - ngpRa) * Math.cos(decRad);
    const x = Math.cos(ngpDec) * Math.sin(decRad) - Math.sin(ngpDec) * Math.cos(decRad) * Math.cos(raRad - ngpRa);
    const l = (l0 + Math.atan2(y, x));
    const normalize = (v: number): number => {
      const twoPi = 2 * Math.PI;
      let n = v % twoPi;
      if (n < 0) n += twoPi;
      return n;
    };
    return {
      l: normalize(l) * 180 / Math.PI,
      b: b * 180 / Math.PI,
    };
  }

  /** Convert equatorial (RA, Dec) to ecliptic (lambda, beta) coordinates in degrees. */
  equatorialToEcliptic(raHours: number, decDeg: number): { lambda: number; beta: number } {
    const raRad = raHours * 15 * Math.PI / 180;
    const decRad = decDeg * Math.PI / 180;
    const epsilon = 23.43928 * Math.PI / 180; // Obliquity of the ecliptic
    const sinBeta = Math.sin(decRad) * Math.cos(epsilon) - Math.cos(decRad) * Math.sin(epsilon) * Math.sin(raRad);
    const beta = Math.asin(Math.max(-1, Math.min(1, sinBeta)));
    const y = Math.sin(raRad) * Math.cos(epsilon) + Math.tan(decRad) * Math.sin(epsilon);
    const x = Math.cos(raRad);
    const lambda = Math.atan2(y, x);
    const normalize = (v: number): number => {
      const twoPi = 2 * Math.PI;
      let n = v % twoPi;
      if (n < 0) n += twoPi;
      return n;
    };
    return {
      lambda: normalize(lambda) * 180 / Math.PI,
      beta: beta * 180 / Math.PI,
    };
  }

  /** Precession of equinox (approximate) using simple model. */
  precession(yearsFrom2000: number): { raShift: number; decShift: number } {
    // Simple polynomial precession (arcseconds)
    const t = yearsFrom2000 / 100;
    const raShiftArcsec = 4612.4362 * t + 1.39156 * t * t;
    const decShiftArcsec = 2004.1918 * t;
    return {
      raShift: raShiftArcsec / 3600, // degrees
      decShift: decShiftArcsec / 3600,
    };
  }

  /** Local sidereal time (hours) at given longitude (degrees east) and date. */
  localSiderealTime(date: Date, longitudeDeg: number): number {
    // Reference: Meeus, Astronomical Algorithms
    const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0);
    const jd = (date.getTime() - J2000) / 86400000 + 2451545.0;
    const T = (jd - 2451545.0) / 36525;
    const theta0 = 280.46061837 +
      360.98564736629 * (jd - 2451545.0) +
      0.000387933 * T * T -
      (T * T * T) / 38710000;
    let lst = (theta0 + longitudeDeg) % 360;
    if (lst < 0) lst += 360;
    return lst / 15; // hours
  }

  /** Hour angle of an object at given LST and RA. */
  hourAngle(lstHours: number, raHours: number): number {
    let ha = (lstHours - raHours) % 24;
    if (ha < -12) ha += 24;
    if (ha > 12) ha -= 24;
    return ha;
  }

  /** Angular distance between two celestial coordinates (degrees). */
  angularDistance(ra1Hours: number, dec1Deg: number, ra2Hours: number, dec2Deg: number): number {
    const ra1 = ra1Hours * 15 * Math.PI / 180;
    const ra2 = ra2Hours * 15 * Math.PI / 180;
    const dec1 = dec1Deg * Math.PI / 180;
    const dec2 = dec2Deg * Math.PI / 180;
    const sinDec1 = Math.sin(dec1), cosDec1 = Math.cos(dec1);
    const sinDec2 = Math.sin(dec2), cosDec2 = Math.cos(dec2);
    const cosD = sinDec1 * sinDec2 + cosDec1 * cosDec2 * Math.cos(ra1 - ra2);
    return Math.acos(Math.max(-1, Math.min(1, cosD))) * 180 / Math.PI;
  }

  /** Distance modulus: m - M = 5*log10(d) - 5, where d is in parsecs. */
  distanceModulus(distancePc: number): number {
    return 5 * Math.log10(Math.max(1e-12, distancePc)) - 5;
  }

  /** Inverse distance modulus: solve for distance given m - M. */
  distanceFromModulus(modulus: number): number {
    return Math.pow(10, (modulus + 5) / 5);
  }

  /** Pogson formula: magnitude difference from flux ratio. */
  pogsonMagnitude(fluxRatio: number): number {
    if (fluxRatio <= 0) return 0;
    return -2.5 * Math.log10(fluxRatio);
  }

  /** Flux ratio from magnitude difference. */
  fluxRatio(magDifference: number): number {
    return Math.pow(10, -0.4 * magDifference);
  }

  /** Absolute magnitude from apparent magnitude and distance (parsecs). */
  absoluteMagnitude(apparentMag: number, distancePc: number): number {
    return apparentMag - 5 * Math.log10(Math.max(1e-12, distancePc)) + 5;
  }

  /** Apparent magnitude from absolute magnitude and distance (parsecs). */
  apparentMagnitude(absoluteMag: number, distancePc: number): number {
    return absoluteMag + 5 * Math.log10(Math.max(1e-12, distancePc)) - 5;
  }

  /** Luminosity relative to Sun from absolute bolometric magnitude. */
  luminosityFromMagnitude(absoluteBolometricMag: number): number {
    const SUN_ABSOLUTE_BOLOMETRIC = 4.74;
    return Math.pow(10, (SUN_ABSOLUTE_BOLOMETRIC - absoluteBolometricMag) / 2.5);
  }

  /** Mass-luminosity relation: L/L_sun = (M/M_sun)^a, with a=3.5 for M dwarfs and 4 for high mass. */
  massLuminosityRelation(massSolar: number, exponent: number = 3.5): number {
    return Math.pow(massSolar, exponent);
  }

  /** Main sequence lifetime in years from mass (solar units) and luminosity (solar units). */
  mainSequenceLifetime(massSolar: number, luminositySolar: number): number {
    return 1e10 * massSolar / Math.max(1e-12, luminositySolar);
  }

  /** Wien's displacement law: peak wavelength in nm from temperature (K). */
  wienDisplacement(temperatureK: number): number {
    const b = 2.8977719e6; // nm·K
    return b / Math.max(1, temperatureK);
  }

  /** B-V color index to temperature (Ballesteros formula). */
  bvToTemperature(bv: number): number {
    return 4600 * (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62));
  }

  /** Convert Greek letter name to symbol (e.g., Alpha -> α). */
  greekLetter(name: string): string | null {
    const lower = name.toLowerCase();
    const entry = GREEK_ALPHABET.find(g => g.name.toLowerCase() === lower);
    return entry?.letter ?? null;
  }

  /** Convert Greek letter symbol to name (e.g., α -> Alpha). */
  greekLetterName(symbol: string): string | null {
    const entry = GREEK_ALPHABET.find(g => g.letter === symbol);
    return entry?.name ?? null;
  }

  /** Parse a Bayer designation like 'α Ori' or 'Alpha Orionis'. */
  parseBayerDesignation(designation: string): { greek: string; constellation: string } | null {
    const parts = designation.trim().split(/\s+/);
    if (parts.length < 2) return null;
    const greekSymbol = this.greekLetter(parts[0]);
    let constellation = parts[1];
    // Try to resolve genitive to nominative
    for (const info of this._info.values()) {
      if (info.genitive.toLowerCase() === constellation.toLowerCase() ||
          info.abbreviation.toLowerCase() === constellation.toLowerCase()) {
        constellation = info.name;
        break;
      }
    }
    return { greek: greekSymbol ?? parts[0], constellation };
  }

  /** Build a Bayer designation from greek ordinal and constellation abbreviation. */
  buildBayer(ordinal: number, abbreviation: string): string | null {
    const entry = GREEK_ALPHABET.find(g => g.ordinal === ordinal);
    if (!entry) return null;
    return `${entry.letter} ${abbreviation}`;
  }

  /** Brightest stars sorted by magnitude. */
  brightestStars(limit: number = 10): Star[] {
    return [...this._stars].sort((a, b) => a.mag - b.mag).slice(0, limit);
  }

  /** Stars in a given constellation. */
  starsInConstellation(name: string): Star[] {
    const c = this._constellations.get(name);
    return c ? [...c.stars] : [];
  }

  /** Visible constellations at given latitude. */
  visibleAtLatitude(latitude: number): ConstellationInfo[] {
    return Array.from(this._info.values()).filter(info => {
      const lat = Math.abs(latitude);
      if (info.decCenter >= 0) {
        // northern constellation visible if lat + 90 - dec >= 0
        return lat >= info.visibleLatitude - 90 || info.decCenter <= 90 - lat;
      } else {
        return lat >= info.visibleLatitude - 90;
      }
    });
  }

  /** Circumpolar check: is a constellation circumpolar at given latitude? */
  isCircumpolar(decDeg: number, latitudeDeg: number): boolean {
    return Math.abs(decDeg) > (90 - Math.abs(latitudeDeg));
  }

  /** Determine if a star rises/sets at given latitude. */
  isNeverRising(decDeg: number, latitudeDeg: number): boolean {
    const lat = Math.abs(latitudeDeg);
    const dec = Math.abs(decDeg);
    if (decDeg * latitudeDeg < 0) {
      // opposite hemispheres
      return dec > (90 - lat);
    }
    return false;
  }

  /** Constellations belonging to a family. */
  familyConstellations(familyName: string): ConstellationFamily | null {
    return this._families.find(f => f.name === familyName) ?? null;
  }

  /** List all constellation families. */
  families(): ConstellationFamily[] {
    return [...this._families];
  }

  /** Mythology of a constellation. */
  mythology(name: string): Mythology[] {
    return this._mythology.filter(m => m.constellation === name);
  }

  /** All mythologies. */
  allMythology(): Mythology[] {
    return [...this._mythology];
  }

  /** Etymology of a star name. */
  starEtymology(name: string): StarEtymology | null {
    return this._etymology.find(e => e.star === name) ?? null;
  }

  /** All etymologies. */
  allEtymology(): StarEtymology[] {
    return [...this._etymology];
  }

  /** Find deep-sky objects by constellation. */
  deepSkyByConstellation(name: string): DeepSkyObject[] {
    return this._deepSky.filter(d => d.constellation === name);
  }

  /** Find deep-sky objects by catalog and number. */
  deepSkyByCatalog(catalog: 'M' | 'NGC' | 'IC', number: number): DeepSkyObject | null {
    return this._deepSky.find(d => d.catalog === catalog && d.number === number) ?? null;
  }

  /** Messier objects. */
  messierObjects(): DeepSkyObject[] {
    return this._deepSky.filter(d => d.catalog === 'M');
  }

  /** Variable stars by type. */
  variableStars(type?: VariableStarType): VariableStar[] {
    if (type) return this._variables.filter(v => v.type === type);
    return [...this._variables];
  }

  /** HR diagram regions. */
  hrRegions(): HRRegion[] {
    return [...this._hrRegions];
  }

  /** Asterisms by name. */
  asterism(name: string): Asterism | null {
    return this._asterisms.find(a => a.name === name) ?? null;
  }

  /** All asterisms. */
  asterisms(): Asterism[] {
    return [...this._asterisms];
  }

  /** Asterisms in a given constellation. */
  asterismsInConstellation(name: string): Asterism[] {
    return this._asterisms.filter(a => a.constellation === name || a.constellation === 'Multiple');
  }

  /** Telescope resolution by Dawes' limit (arcseconds) for aperture (mm). */
  dawesLimit(apertureMm: number): number {
    if (apertureMm <= 0) return 0;
    return 116 / apertureMm;
  }

  /** Rayleigh criterion (arcseconds) for wavelength (nm) and aperture (mm). */
  rayleighLimit(wavelengthNm: number, apertureMm: number): number {
    if (apertureMm <= 0) return 0;
    return 1.22 * (wavelengthNm * 1e-9) / (apertureMm * 1e-3) * (180 / Math.PI) * 3600;
  }

  /** Telescope resolving power: returns Dawes and Rayleigh criteria. */
  telescopeResolution(apertureMm: number, wavelengthNm: number = 550): { dawes: number; rayleigh: number } {
    return {
      dawes: this.dawesLimit(apertureMm),
      rayleigh: this.rayleighLimit(wavelengthNm, apertureMm),
    };
  }

  /** Light-gathering power of a telescope relative to naked eye. */
  lightGatheringPower(apertureMm: number, eyeApertureMm: number = 7): number {
    if (apertureMm <= 0 || eyeApertureMm <= 0) return 0;
    return Math.pow(apertureMm / eyeApertureMm, 2);
  }

  /** Magnitude limit visible through aperture (mm). */
  limitingMagnitude(apertureMm: number): number {
    return 2 + 5 * Math.log10(Math.max(1, apertureMm));
  }

  /** Magnification from telescope focal length (mm) and eyepiece focal length (mm). */
  magnification(telescopeFocalMm: number, eyepieceFocalMm: number): number {
    if (eyepieceFocalMm <= 0) return 0;
    return telescopeFocalMm / eyepieceFocalMm;
  }

  /** Exit pupil (mm) from aperture (mm) and magnification. */
  exitPupil(apertureMm: number, magnification: number): number {
    if (magnification <= 0) return 0;
    return apertureMm / magnification;
  }

  /** True field of view given apparent field and magnification. */
  trueFieldOfView(apparentFieldDeg: number, magnification: number): number {
    if (magnification <= 0) return 0;
    return apparentFieldDeg / magnification;
  }

  constellationMap(hemisphere: Hemisphere): Constellation[] {
    this._history.push({ operation: 'constellationMap', target: hemisphere, timestamp: Date.now() });
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

  /** Add a custom star. */
  addStar(star: Star): void {
    this._stars.push(star);
    this._history.push({ operation: 'addStar', target: star.id, timestamp: Date.now() });
  }

  /** Add a custom constellation. */
  addConstellation(c: Constellation): void {
    this._constellations.set(c.name, c);
    this._history.push({ operation: 'addConstellation', target: c.name, timestamp: Date.now() });
  }

  /** Add a custom asterism. */
  addAsterism(a: Asterism): void {
    this._asterisms.push(a);
    this._history.push({ operation: 'addAsterism', target: a.name, timestamp: Date.now() });
  }

  /** Bayer designation lookup across all stars. */
  bayerLookup(greekLetter: string, abbreviation: string): Star | null {
    return this._stars.find(s => s.bayer.startsWith(greekLetter) && s.bayer.includes(abbreviation)) ?? null;
  }

  /** Stars brighter than a given magnitude. */
  starsBrighterThan(magnitude: number): Star[] {
    return this._stars.filter(s => s.mag < magnitude);
  }

  /** Stars within an angular radius of a position. */
  starsNear(raHours: number, decDeg: number, radiusDeg: number): Star[] {
    return this._stars.filter(s => this.angularDistance(raHours, decDeg, s.ra, s.dec) <= radiusDeg);
  }

  /** Constellations near a given RA/Dec (centerpoint within radius). */
  constellationsNear(raHours: number, decDeg: number, radiusDeg: number): ConstellationInfo[] {
    return Array.from(this._info.values()).filter(info =>
      this.angularDistance(raHours, decDeg, info.raCenter, info.decCenter) <= radiusDeg,
    );
  }

  /** Convert star color name to a hex code. */
  colorToHex(colorName: string): string {
    const table: Record<string, string> = {
      'blue': '#9bb0ff',
      'blue-white': '#cad7ff',
      'white': '#f8f7ff',
      'yellow-white': '#f4f3ff',
      'yellow': '#fff4ea',
      'orange': '#ffd2a1',
      'red': '#ffcc6f',
      'deep red-brown': '#ff6644',
      'magenta': '#aa44ff',
    };
    return table[colorName.toLowerCase()] ?? '#ffffff';
  }

  /** Determine if a date is favorable for viewing (best dark hours). */
  bestViewingHours(date: Date, latitude: number): { startHour: number; endHour: number; sunAltitudeDeg: number } {
    const month = date.getMonth();
    // Sun altitude below -18° = astronomical twilight
    const declination = -23.4 * Math.cos((month + 6) / 12 * 2 * Math.PI);
    const sinAlt = Math.sin(declination * Math.PI / 180) * Math.sin(latitude * Math.PI / 180);
    void sinAlt;
    return {
      startHour: 21,
      endHour: 4,
      sunAltitudeDeg: -30 - 10 * Math.cos((month + 6) / 12 * 2 * Math.PI),
    };
  }

  toPacket(): DataPacket<{ constellations: Map<string, Constellation>; info: Map<string, ConstellationInfo>; stars: Star[]; asterisms: Asterism[]; history: ConstellationRecord[] }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['astronomy', 'Constellation'],
      priority: 1,
      phase: 'constellation',
    };
    return {
      id: `constellation-${Date.now().toString(36)}-${++this._counter}`,
      payload: {
        constellations: this._constellations,
        info: this._info,
        stars: this._stars,
        asterisms: this._asterisms,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._constellations = new Map();
    this._info = new Map();
    this._stars = [];
    this._detailed = new Map();
    this._asterisms = [];
    this._deepSky = [];
    this._variables = [];
    this._mythology = [];
    this._families = [];
    this._etymology = [];
    this._spectralTable = [];
    this._hrRegions = [];
    this._history = [];
    this._counter = 0;
    for (const c of CONSTELLATIONS_DB) this._constellations.set(c.name, c);
    for (const info of CONSTELLATIONS_INFO) this._info.set(info.name, info);
    for (const d of STARS_DETAILED) this._detailed.set(d.name, d);
    this._stars = [...STARS_DB];
    this._asterisms = [...ASTERISMS_DB];
    this._deepSky = [...DEEP_SKY_DB];
    this._variables = [...VARIABLE_STARS];
    this._mythology = [...MYTHOLOGY_DB];
    this._families = [...CONSTELLATION_FAMILIES];
    this._etymology = [...STAR_ETYMOLOGY];
    this._spectralTable = [...SPECTRAL_CLASS_TABLE];
    this._hrRegions = [...HR_REGIONS];
  }

  get constellationCount(): number { return this._constellations.size; }
  get infoCount(): number { return this._info.size; }
  get starCount(): number { return this._stars.length; }
  get detailedStarCount(): number { return this._detailed.size; }
  get asterismCount(): number { return this._asterisms.length; }
  get deepSkyCount(): number { return this._deepSky.length; }
  get variableStarCount(): number { return this._variables.length; }
  get mythologyCount(): number { return this._mythology.length; }
  get familyCount(): number { return this._families.length; }
  get etymologyCount(): number { return this._etymology.length; }
  get spectralClassCount(): number { return this._spectralTable.length; }
  get hrRegionCount(): number { return this._hrRegions.length; }
}
