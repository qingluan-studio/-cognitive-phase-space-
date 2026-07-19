import { DataPacket, PacketMeta } from '../shared/types';

/** Cryptanalytic attack descriptor. */
export interface Attack {
  name: string;
  type: 'brute-force' | 'dictionary' | 'birthday' | 'meet-in-the-middle' | 'slide' | 'differential' | 'linear' | 'algebraic' | 'side-channel' | 'fault' | 'chosen-plaintext' | 'chosen-ciphertext' | 'related-key' | 'boomerang';
  complexity: number;
  success: boolean;
  details: string;
}

/** Vulnerability descriptor. */
export interface Vulnerability {
  target: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  cve: string;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Cryptanalysis: attacks against ciphers and hashes. */
export class Cryptanalysis {
  private _attacks: Attack[] = [];
  private _vulnerabilities: Vulnerability[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  /** Brute force search over a keyspace. */
  bruteForce(ciphertext: string, keyspace: number): Attack {
    const complexity = Math.log2(Math.max(1, keyspace));
    const success = keyspace < 1e6;
    const attack: Attack = {
      name: 'Brute Force',
      type: 'brute-force',
      complexity,
      success,
      details: `Attempted ${keyspace} keys`,
    };
    void ciphertext;
    this._attacks.push(attack);
    this._history.push({ method: 'bruteForce', keyspace });
    return attack;
  }

  /** Dictionary attack against a hash. */
  dictionaryAttack(hash: string, dictionary: string[]): Attack {
    let found: string | null = null;
    for (const word of dictionary) {
      if (this._simpleHash(word) === hash) {
        found = word;
        break;
      }
    }
    const attack: Attack = {
      name: 'Dictionary Attack',
      type: 'dictionary',
      complexity: dictionary.length,
      success: found !== null,
      details: found ? `Password recovered: ${found}` : 'No match found',
    };
    this._attacks.push(attack);
    this._history.push({ method: 'dictionaryAttack' });
    return attack;
  }

  /** Birthday attack against a hash function. */
  birthdayAttack(hashFunc: (s: string) => string): Attack {
    const seen = new Map<string, string>();
    let found = false;
    let attempts = 0;
    const maxAttempts = 10000;
    while (attempts < maxAttempts) {
      const input = `input-${attempts}`;
      const h = hashFunc(input);
      if (seen.has(h)) {
        found = true;
        break;
      }
      seen.set(h, input);
      attempts++;
    }
    const attack: Attack = {
      name: 'Birthday Attack',
      type: 'birthday',
      complexity: Math.sqrt(seen.size),
      success: found,
      details: `Searched ${attempts} inputs`,
    };
    this._attacks.push(attack);
    this._history.push({ method: 'birthdayAttack' });
    return attack;
  }

  /** Meet-in-the-middle attack. */
  meetInTheMiddle(ciphertext: string, keyspace: number): Attack {
    const complexity = 2 * Math.sqrt(Math.max(1, keyspace));
    const attack: Attack = {
      name: 'Meet-in-the-Middle',
      type: 'meet-in-the-middle',
      complexity,
      success: keyspace < 1e12,
      details: `Reduced 2-key search from ${keyspace ** 2} to ${complexity}`,
    };
    void ciphertext;
    this._attacks.push(attack);
    this._history.push({ method: 'meetInTheMiddle' });
    return attack;
  }

  /** Slide attack against iterated block ciphers. */
  slideAttack(ciphertext: string, rounds: number): Attack {
    const attack: Attack = {
      name: 'Slide Attack',
      type: 'slide',
      complexity: Math.floor(rounds / 2),
      success: rounds > 4,
      details: `Targets ${rounds}-round cipher`,
    };
    void ciphertext;
    this._attacks.push(attack);
    this._history.push({ method: 'slideAttack' });
    return attack;
  }

  /** Differential cryptanalysis. */
  differentialCryptanalysis(cipher: string, pairs: number): Attack {
    const attack: Attack = {
      name: 'Differential Cryptanalysis',
      type: 'differential',
      complexity: pairs,
      success: pairs >= 1000,
      details: `Used ${pairs} chosen plaintext pairs on ${cipher}`,
    };
    this._attacks.push(attack);
    this._history.push({ method: 'differentialCryptanalysis' });
    return attack;
  }

  /** Linear cryptanalysis. */
  linearCryptanalysis(cipher: string, plaintexts: number): Attack {
    const attack: Attack = {
      name: 'Linear Cryptanalysis',
      type: 'linear',
      complexity: plaintexts,
      success: plaintexts >= 10000,
      details: `Used ${plaintexts} known plaintexts on ${cipher}`,
    };
    this._attacks.push(attack);
    this._history.push({ method: 'linearCryptanalysis' });
    return attack;
  }

  /** Algebraic attack. */
  algebraicAttack(cipher: string, equations: number): Attack {
    const attack: Attack = {
      name: 'Algebraic Attack',
      type: 'algebraic',
      complexity: equations,
      success: equations < 1000,
      details: `Solved ${equations} algebraic equations on ${cipher}`,
    };
    this._attacks.push(attack);
    this._history.push({ method: 'algebraicAttack' });
    return attack;
  }

  /** Side-channel analysis (timing, power, EM). */
  sideChannelAnalysis(target: string, channel: 'timing' | 'power' | 'electromagnetic' | 'acoustic'): Attack {
    const attack: Attack = {
      name: 'Side-Channel Analysis',
      type: 'side-channel',
      complexity: 100,
      success: true,
      details: `Exploited ${channel} leakage from ${target}`,
    };
    this._attacks.push(attack);
    this._history.push({ method: 'sideChannelAnalysis' });
    return attack;
  }

  /** Fault attack. */
  faultAttack(target: string, fault: 'bit-flip' | 'byte-flip' | 'clock-glitch' | 'voltage-glitch'): Attack {
    const attack: Attack = {
      name: 'Fault Attack',
      type: 'fault',
      complexity: 50,
      success: true,
      details: `Injected ${fault} into ${target}`,
    };
    this._attacks.push(attack);
    this._history.push({ method: 'faultAttack' });
    return attack;
  }

  /** Chosen-plaintext attack. */
  chosenPlaintextAttack(cipher: string, oracle: (plaintext: string) => string): Attack {
    void oracle;
    const attack: Attack = {
      name: 'Chosen-Plaintext Attack',
      type: 'chosen-plaintext',
      complexity: 1000,
      success: true,
      details: `Queried CPA oracle on ${cipher}`,
    };
    this._attacks.push(attack);
    this._history.push({ method: 'chosenPlaintextAttack' });
    return attack;
  }

  /** Chosen-ciphertext attack. */
  chosenCiphertextAttack(cipher: string, oracle: (ciphertext: string) => string): Attack {
    void oracle;
    const attack: Attack = {
      name: 'Chosen-Ciphertext Attack',
      type: 'chosen-ciphertext',
      complexity: 1000,
      success: true,
      details: `Queried CCA oracle on ${cipher}`,
    };
    this._attacks.push(attack);
    this._history.push({ method: 'chosenCiphertextAttack' });
    return attack;
  }

  /** Related-key attack. */
  relatedKeyAttack(cipher: string, relatedKeys: number): Attack {
    const attack: Attack = {
      name: 'Related-Key Attack',
      type: 'related-key',
      complexity: relatedKeys * 1000,
      success: relatedKeys >= 2,
      details: `Used ${relatedKeys} related keys on ${cipher}`,
    };
    this._attacks.push(attack);
    this._history.push({ method: 'relatedKeyAttack' });
    return attack;
  }

  /** Boomerang attack. */
  boomerangAttack(cipher: string, quartets: number): Attack {
    const attack: Attack = {
      name: 'Boomerang Attack',
      type: 'boomerang',
      complexity: quartets,
      success: quartets >= 100,
      details: `Used ${quartets} quartets on ${cipher}`,
    };
    this._attacks.push(attack);
    this._history.push({ method: 'boomerangAttack' });
    return attack;
  }

  private _simpleHash(input: string): string {
    let h = 0;
    for (let i = 0; i < input.length; i++) {
      h = ((h << 5) - h + input.charCodeAt(i)) | 0;
    }
    return (h >>> 0).toString(16);
  }

  toPacket(): DataPacket<{
    attacks: Attack[];
    vulnerabilities: Vulnerability[];
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['cryptography', 'Cryptanalysis'],
      priority: 1,
      phase: 'crypto:analysis',
    };
    return {
      id: `cryptan-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        attacks: this._attacks,
        vulnerabilities: this._vulnerabilities,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._attacks = [];
    this._vulnerabilities = [];
    this._history = [];
    this._counter = 0;
  }

  get attackCount(): number {
    return this._attacks.length;
  }

  get vulnerabilityCount(): number {
    return this._vulnerabilities.length;
  }

  get historyDepth(): number {
    return this._history.length;
  }
}

void ALPHABET;
