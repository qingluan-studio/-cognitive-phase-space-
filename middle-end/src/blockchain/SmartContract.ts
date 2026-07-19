import { DataPacket } from '../shared/types';

/** A deployed smart contract. */
export interface Contract {
  readonly address: string;
  readonly code: string;
  readonly state: Record<string, unknown>;
  readonly abi: ContractFunction[];
  readonly deployer: string;
  readonly balance: number;
}

/** A callable function in a contract ABI. */
export interface ContractFunction {
  readonly name: string;
  readonly inputs: { name: string; type: string }[];
  readonly outputs: { name: string; type: string }[];
  readonly payable: boolean;
  readonly view: boolean;
}

/** A contract call invocation. */
export interface ContractCall {
  readonly contract: string;
  readonly function: string;
  readonly args: unknown[];
  readonly value: number;
  readonly caller: string;
  readonly gasUsed: number;
  readonly success: boolean;
  readonly output: unknown;
  readonly events: ContractEvent[];
}

/** An emitted contract event. */
export interface ContractEvent {
  readonly name: string;
  readonly args: unknown[];
  readonly logIndex: number;
}

export class SmartContract {
  private _contracts: Map<string, Contract> = new Map();
  private _calls: ContractCall[] = [];
  private _events: ContractEvent[] = [];
  private _history: string[] = [];
  private _counter = 0;

  get contractCount(): number {
    return this._contracts.size;
  }

  get callCount(): number {
    return this._calls.length;
  }

  get eventCount(): number {
    return this._events.length;
  }

  get history(): string[] {
    return [...this._history];
  }

  public deploy(code: string, args: unknown[], value: number): Contract {
    const address = `0x${this._hashString(`${code}${this._counter}`).padStart(40, '0')}`;
    const contract: Contract = {
      address,
      code,
      state: { initialized: true, args },
      abi: [],
      deployer: '0xdeployer',
      balance: value,
    };
    this._contracts.set(address, contract);
    this._recordHistory(`deploy(${address}, value=${value})`);
    return contract;
  }

  public call(contract: Contract, functionName: string, args: unknown[], value: number): ContractCall {
    const gasUsed = this.estimateGas(contract, functionName, args);
    const success = Math.random() > 0.05;
    const call: ContractCall = {
      contract: contract.address,
      function: functionName,
      args: [...args],
      value,
      caller: '0xcaller',
      gasUsed,
      success,
      output: success ? { result: 'ok' } : { error: 'reverted' },
      events: success ? [{ name: `${functionName}Called`, args: [...args], logIndex: this._events.length }] : [],
    };
    this._calls.push(call);
    this._events.push(...call.events);
    this._recordHistory(`call(${functionName}, gas=${gasUsed})`);
    return call;
  }

  public estimateGas(contract: Contract, functionName: string, args: unknown[]): number {
    const baseGas = 21000;
    const argGas = args.reduce((s: number, a) => s + (typeof a === 'string' ? a.length * 16 : 64), 0);
    const fnGas = functionName.length * 100;
    this._recordHistory(`estimateGas(${functionName})`);
    return baseGas + argGas + fnGas;
  }

  public erc20(name: string, symbol: string, decimals: number, supply: number): Contract {
    const abi: ContractFunction[] = [
      { name: 'transfer', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }], payable: false, view: false },
      { name: 'balanceOf', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], payable: false, view: true },
      { name: 'approve', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }], payable: false, view: false },
    ];
    const contract: Contract = {
      address: `0x${this._hashString(symbol + supply).padStart(40, '0')}`,
      code: 'erc20',
      state: { name, symbol, decimals, supply, balances: {} },
      abi,
      deployer: '0xdeployer',
      balance: 0,
    };
    this._contracts.set(contract.address, contract);
    this._recordHistory(`erc20(${symbol}, supply=${supply})`);
    return contract;
  }

  public erc721(name: string, symbol: string): Contract {
    const abi: ContractFunction[] = [
      { name: 'mint', inputs: [{ name: 'to', type: 'address' }, { name: 'tokenId', type: 'uint256' }], outputs: [], payable: false, view: false },
      { name: 'ownerOf', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ name: '', type: 'address' }], payable: false, view: true },
      { name: 'transferFrom', inputs: [{ name: 'from', type: 'address' }, { name: 'to', type: 'address' }, { name: 'tokenId', type: 'uint256' }], outputs: [], payable: false, view: false },
    ];
    const contract: Contract = {
      address: `0x${this._hashString(name + symbol).padStart(40, '0')}`,
      code: 'erc721',
      state: { name, symbol, tokens: {} },
      abi,
      deployer: '0xdeployer',
      balance: 0,
    };
    this._contracts.set(contract.address, contract);
    this._recordHistory(`erc721(${symbol})`);
    return contract;
  }

  public erc1155(uri: string): Contract {
    const contract: Contract = {
      address: `0x${this._hashString(uri).padStart(40, '0')}`,
      code: 'erc1155',
      state: { uri, tokens: {} },
      abi: [],
      deployer: '0xdeployer',
      balance: 0,
    };
    this._contracts.set(contract.address, contract);
    this._recordHistory('erc1155()');
    return contract;
  }

  public dao(proposal: string, voting: { for: number; against: number }, execution: string): { passed: boolean; quorum: number; execution: string } {
    const total = voting.for + voting.against;
    const passed = total > 0 && voting.for > voting.against;
    const quorum = total;
    this._recordHistory(`dao(proposal=${proposal}, passed=${passed})`);
    return { passed, quorum, execution: passed ? execution : 'rejected' };
  }

  public multisig(owners: string[], threshold: number, transaction: { to: string; value: number }): { executed: boolean; signatures: number; threshold: number } {
    const signatures = Math.floor(Math.random() * (owners.length + 1));
    const executed = signatures >= threshold;
    this._recordHistory(`multisig(sig=${signatures}, threshold=${threshold})`);
    return { executed, signatures, threshold };
  }

  public escrow(buyer: string, seller: string, arbitrator: string, amount: number): { contract: string; funded: boolean; amount: number } {
    const addr = `0x${this._hashString(buyer + seller).padStart(40, '0')}`;
    const funded = amount > 0;
    this._recordHistory(`escrow(amount=${amount})`);
    return { contract: addr, funded, amount };
  }

  public accessControl(roles: string[], members: string[], permissions: Record<string, string[]>): { granted: boolean; role: string; member: string } {
    const role = roles[0] ?? 'default';
    const member = members[0] ?? '0x0';
    const granted = (permissions[role] ?? []).includes(member);
    this._recordHistory(`accessControl(role=${role})`);
    return { granted, role, member };
  }

  public oracle(dataSource: string, query: string, callback: string): { result: number; timestamp: number; source: string } {
    const result = Math.floor(Math.random() * 1000);
    this._recordHistory(`oracle(source=${dataSource})`);
    return { result, timestamp: Date.now(), source: dataSource };
  }

  public upgrade(proxy: string, implementation: string): { upgraded: boolean; proxy: string; implementation: string } {
    this._recordHistory(`upgrade(proxy=${proxy})`);
    return { upgraded: true, proxy, implementation };
  }

  public calls(): ContractCall[] {
    return this._calls.map(c => ({ ...c, args: [...c.args], events: c.events.map(e => ({ ...e, args: [...e.args] })) }));
  }

  public contracts(): Contract[] {
    return Array.from(this._contracts.values()).map(c => ({
      ...c,
      state: { ...c.state },
      abi: c.abi.map(fn => ({ ...fn, inputs: [...fn.inputs], outputs: [...fn.outputs] })),
    }));
  }

  public events(): ContractEvent[] {
    return this._events.map(e => ({ ...e, args: [...e.args] }));
  }

  public lastCall(): ContractCall | null {
    return this._calls.length > 0
      ? { ...this._calls[this._calls.length - 1], args: [...this._calls[this._calls.length - 1].args], events: this._calls[this._calls.length - 1].events.map(e => ({ ...e, args: [...e.args] })) }
      : null;
  }

  public lastEvent(): ContractEvent | null {
    return this._events.length > 0 ? { ...this._events[this._events.length - 1], args: [...this._events[this._events.length - 1].args] } : null;
  }

  public summary(): { contracts: number; calls: number; events: number; historyLength: number; counter: number } {
    return {
      contracts: this._contracts.size,
      calls: this._calls.length,
      events: this._events.length,
      historyLength: this._history.length,
      counter: this._counter,
    };
  }

  public toJSON(): Record<string, unknown> {
    return {
      contracts: this._contracts.size,
      calls: this._calls.length,
      events: this._events.length,
      history: [...this._history],
      successfulCalls: this._calls.filter(c => c.success).length,
      contractTypes: Array.from(new Set(Array.from(this._contracts.values()).map(c => c.code))),
      totalGasUsed: this._calls.reduce((s, c) => s + c.gasUsed, 0),
    };
  }

  public validate(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    for (const c of this._contracts.values()) {
      if (c.address.length === 0) issues.push('contract: empty address');
      if (c.deployer.length === 0) issues.push(`contract ${c.address}: empty deployer`);
      if (c.balance < 0) issues.push(`contract ${c.address}: negative balance`);
    }
    for (const call of this._calls) {
      if (call.gasUsed < 0) issues.push(`call ${call.function}: negative gas`);
      if (call.value < 0) issues.push(`call ${call.function}: negative value`);
    }
    return { valid: issues.length === 0, issues };
  }

  public callStatistics(): {
    total: number;
    successful: number;
    failed: number;
    successRate: number;
    avgGas: number;
    totalValue: number;
    byFunction: { function: string; count: number; successCount: number }[];
  } {
    const total = this._calls.length;
    const successful = this._calls.filter(c => c.success).length;
    const failed = total - successful;
    const totalGas = this._calls.reduce((s, c) => s + c.gasUsed, 0);
    const totalValue = this._calls.reduce((s, c) => s + c.value, 0);
    const byFn = new Map<string, { count: number; successCount: number }>();
    for (const c of this._calls) {
      const cur = byFn.get(c.function) ?? { count: 0, successCount: 0 };
      byFn.set(c.function, { count: cur.count + 1, successCount: cur.successCount + (c.success ? 1 : 0) });
    }
    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? successful / total : 0,
      avgGas: total > 0 ? totalGas / total : 0,
      totalValue,
      byFunction: Array.from(byFn.entries()).map(([fn, v]) => ({ function: fn, count: v.count, successCount: v.successCount })),
    };
  }

  private _hashString(s: string): string {
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      const chr = s.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0;
    }
    return Math.abs(hash).toString(16);
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }

  public toPacket(): DataPacket<{
    contracts: number;
    calls: number;
    events: number;
    history: string[];
  }> {
    return {
      id: `contract-${Date.now()}-${this._counter}`,
      payload: {
        contracts: this._contracts.size,
        calls: this._calls.length,
        events: this._events.length,
        history: [...this._history],
      },
      metadata: {
        createdAt: Date.now(),
        route: ['blockchain', 'smart_contract', 'result'],
        priority: 0.85,
        phase: 'execution',
      },
    };
  }

  public reset(): void {
    this._contracts.clear();
    this._calls = [];
    this._events = [];
    this._history = [];
    this._counter = 0;
  }
}
