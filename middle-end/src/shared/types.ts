/**
 * Shared core types for the Cognitive Phase Space Middle-End.
 * All modules build upon these foundational abstractions.
 */

/** A quantum-entangled state token that cannot be cloned independently. */
export interface EntangledToken<T = unknown> {
  readonly id: string;
  readonly payload: T;
  readonly entangledWith: string[];
  readonly bornAt: number;
}

/** Five thermal states for SoulThermograph. */
export type ThermalState = 'cold' | 'warm' | 'hot' | 'boiling' | 'nirvana';

/** A time-anchor node in the mesh. No central clock exists. */
export interface TimeAnchor {
  readonly nodeId: string;
  readonly localTime: number;
  readonly peers: string[];
  readonly drift: number;
}

/** A signal extracted from noise or anomaly. */
export interface Signal {
  readonly source: string;
  readonly magnitude: number;
  readonly entropy: number;
  readonly timestamp: number;
}

/** Generic data packet flowing through the middle-end. */
export interface DataPacket<T = unknown> {
  readonly id: string;
  readonly payload: T;
  readonly metadata: PacketMeta;
}

export interface PacketMeta {
  readonly createdAt: number;
  readonly route: string[];
  readonly priority: number;
  readonly phase: string;
  readonly residue?: unknown;
}

/** Result of paradox processing. */
export interface ParadoxResult<T = unknown> {
  readonly resolved: boolean;
  readonly output: T | null;
  readonly contradictionEnergy: number;
  readonly fuelUsed: number;
}

/** A unit of knowledge that can be grafted, folded, or mirrored. */
export interface KnowledgeUnit {
  readonly id: string;
  readonly content: string;
  readonly vector: number[];
  readonly lineage: string[];
}

/** Hormone levels for endocrine subsystem. */
export interface HormoneLevel {
  readonly cortisol: number;
  readonly oxytocin: number;
  readonly melatonin: number;
  readonly adrenaline: number;
}

/** Generic handler function signature. */
export type Handler<T, R> = (input: T) => Promise<R> | R;

/** Stream of packets. */
export type PacketStream<T = unknown> = AsyncIterable<DataPacket<T>>;
