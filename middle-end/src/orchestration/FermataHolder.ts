export type HoldEntry = {export type HoldEntry = {
export type HoldEntry = {
  id: string;
  data: unknown;
  timeout: number;
  maxexport type HoldEntry = {
  id: string;
  data: unknown;
  timeout: number;
  maxDuration: number;
  isInfinite:export type HoldEntry = {
  id: string;
  data: unknown;
  timeout: number;
  maxDuration: number;
  isInfinite: boolean;
};

export type HoldState =export type HoldEntry = {
  id: string;
  data: unknown;
  timeout: number;
  maxDuration: number;
  isInfinite: boolean;
};

export type HoldState = 'holding' | 'released' | 'timedOut';

export type HoldResult =export type HoldEntry = {
  id: string;
  data: unknown;
  timeout: number;
  maxDuration: number;
  isInfinite: boolean;
};

export type HoldState = 'holding' | 'released' | 'timedOut';

export type HoldResult = {
  id: string;
  state: HoldState;
  heldDuration: numberexport type HoldEntry = {
  id: string;
  data: unknown;
  timeout: number;
  maxDuration: number;
  isInfinite: boolean;
};

export type HoldState = 'holding' | 'released' | 'timedOut';

export type HoldResult = {
  id: string;
  state: HoldState;
  heldDuration: number;
  data: unknown;
};

export class FermataHolder {
  privateexport type HoldEntry = {
  id: string;
  data: unknown;
  timeout: number;
  maxDuration: number;
  isInfinite: boolean;
};

export type HoldState = 'holding' | 'released' | 'timedOut';

export type HoldResult = {
  id: string;
  state: HoldState;
  heldDuration: number;
  data: unknown;
};

export class FermataHolder {
  private holds: Map<string, HoldEntry> = new Map();
  private timers: Map<string,export type HoldEntry = {
  id: string;
  data: unknown;
  timeout: number;
  maxDuration: number;
  isInfinite: boolean;
};

export type HoldState = 'holding' | 'released' | 'timedOut';

export type HoldResult = {
  id: string;
  state: HoldState;
  heldDuration: number;
  data: unknown;
};

export class FermataHolder {
  private holds: Map<string, HoldEntry> = new Map();
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private heldStart: Map<string, number>export type HoldEntry = {
  id: string;
  data: unknown;
  timeout: number;
  maxDuration: number;
  isInfinite: boolean;
};

export type HoldState = 'holding' | 'released' | 'timedOut';

export type HoldResult = {
  id: string;
  state: HoldState;
  heldDuration: number;
  data: unknown;
};

export class FermataHolder {
  private holds: Map<string, HoldEntry> = new Map();
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private heldStart: Map<string, number> = new Map();

  hold(entry: HoldEntry): void {
    const existingTimer =export type HoldEntry = {
  id: string;
  data: unknown;
  timeout: number;
  maxDuration: number;
  isInfinite: boolean;
};

export type HoldState = 'holding' | 'released' | 'timedOut';

export type HoldResult = {
  id: string;
  state: HoldState;
  heldDuration: number;
  data: unknown;
};

export class FermataHolder {
  private holds: Map<string, HoldEntry> = new Map();
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private heldStart: Map<string, number> = new Map();

  hold(entry: HoldEntry): void {
    const existingTimer = this.timers.get(entry.id);
    if (existingTimer) {
      clearTimeoutexport type HoldEntry = {
  id: string;
  data: unknown;
  timeout: number;
  maxDuration: number;
  isInfinite: boolean;
};

export type HoldState = 'holding' | 'released' | 'timedOut';

export type HoldResult = {
  id: string;
  state: HoldState;
  heldDuration: number;
  data: unknown;
};

export class FermataHolder {
  private holds: Map<string, HoldEntry> = new Map();
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private heldStart: Map<string, number> = new Map();

  hold(entry: HoldEntry): void {
    const existingTimer = this.timers.get(entry.id);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    this.holds.set(entry.id, entry);
    this.heldStart.set(entry.id, Date