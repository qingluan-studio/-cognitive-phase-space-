import { DataPacket } from '../shared/types';

export interface TCPSegment {
  readonly srcPort: number;
  readonly dstPort: number;
  readonly seq: number;
  readonly ack: number;
  readonly flags: { syn: boolean; ack: boolean; fin: boolean; rst: boolean; psh: boolean; urg: boolean };
  readonly window: number;
}

export interface UDPDatagram {
  readonly srcPort: number;
  readonly dstPort: number;
  readonly length: number;
  readonly checksum: number;
  readonly payload: string;
}

export class TransportLayer {
  private _segments: TCPSegment[] = [];
  private _datagrams: UDPDatagram[] = [];
  private _history: string[] = [];
  private _counter = 0;
  private _seqNum = 0;

  get segmentCount(): number {
    return this._segments.length;
  }

  get datagramCount(): number {
    return this._datagrams.length;
  }

  get history(): string[] {
    return [...this._history];
  }

  public tcpHandshake(client: string, server: string): { client: string; server: string; established: boolean; seq: number } {
    this._seqNum = Math.floor(Math.random() * 10000);
    this._recordHistory(`tcpHandshake(${client} -> ${server}) -> ESTABLISHED`);
    return { client, server, established: true, seq: this._seqNum };
  }

  public threeWayHandshake(syn: number, synAck: number, ack: number): { syn: number; synAck: number; ack: number; established: boolean } {
    this._recordHistory(`3-way-handshake(syn=${syn}, synAck=${synAck}, ack=${ack})`);
    return { syn, synAck, ack, established: true };
  }

  public tcpClose(connection: string, side: 'client' | 'server'): { connection: string; side: string; closed: boolean; state: string } {
    this._recordHistory(`tcpClose(conn=${connection}, side=${side}) -> TIME_WAIT`);
    return { connection, side, closed: true, state: 'TIME_WAIT' };
  }

  public fourWayHandshake(fin1: number, fin2: number, ack1: number, ack2: number): { fin1: number; ack1: number; fin2: number; ack2: number; closed: boolean } {
    this._recordHistory(`4-way-handshake(fin1=${fin1}, fin2=${fin2})`);
    return { fin1, fin2, ack1, ack2, closed: true };
  }

  public flowControl(sender: string, receiver: string, window: number): { sender: string; receiver: string; window: number; effective: number } {
    const effective = window * 0.8;
    this._recordHistory(`flowControl(sender=${sender}, receiver=${receiver}, window=${window})`);
    return { sender, receiver, window, effective };
  }

  public congestionControl(connection: string, algorithm: string): { connection: string; algorithm: string; cwnd: number; ssthresh: number } {
    const cwnd = 1;
    const ssthresh = 64;
    this._recordHistory(`congestionControl(conn=${connection}, algo=${algorithm})`);
    return { connection, algorithm, cwnd, ssthresh };
  }

  public slowStart(connection: string, ssthresh: number): { connection: string; cwnd: number; ssthresh: number; phase: string } {
    const cwnd = Math.min(ssthresh, 8);
    this._recordHistory(`slowStart(conn=${connection}, ssthresh=${ssthresh}) -> cwnd=${cwnd}`);
    return { connection, cwnd, ssthresh, phase: 'slow-start' };
  }

  public congestionAvoidance(connection: string, ssthresh: number): { connection: string; cwnd: number; ssthresh: number; phase: string } {
    const cwnd = ssthresh + 10;
    this._recordHistory(`congestionAvoidance(conn=${connection}) -> cwnd=${cwnd}`);
    return { connection, cwnd, ssthresh, phase: 'congestion-avoidance' };
  }

  public fastRetransmit(connection: string, dupAcks: number): { connection: string; retransmitted: boolean; dupAcks: number } {
    const retransmitted = dupAcks >= 3;
    this._recordHistory(`fastRetransmit(conn=${connection}, dupAcks=${dupAcks}) -> ${retransmitted}`);
    return { connection, retransmitted, dupAcks };
  }

  public fastRecovery(connection: string): { connection: string; ssthresh: number; cwnd: number; phase: string } {
    const ssthresh = 32;
    const cwnd = ssthresh + 3;
    this._recordHistory(`fastRecovery(conn=${connection})`);
    return { connection, ssthresh, cwnd, phase: 'recovery' };
  }

  public tcpReno(connection: string): { connection: string; algorithm: string; phases: string[] } {
    this._recordHistory(`tcpReno(conn=${connection})`);
    return { connection, algorithm: 'Reno', phases: ['slow-start', 'congestion-avoidance', 'fast-retransmit', 'fast-recovery'] };
  }

  public tcpCubic(connection: string): { connection: string; algorithm: string; beta: number; c: number } {
    this._recordHistory(`tcpCubic(conn=${connection})`);
    return { connection, algorithm: 'CUBIC', beta: 0.7, c: 0.4 };
  }

  public udpTransmit(src: string, dst: string, data: string): { src: string; dst: string; datagram: UDPDatagram; sent: boolean } {
    const datagram: UDPDatagram = { srcPort: 12345, dstPort: 80, length: data.length + 8, checksum: 0, payload: data };
    this._datagrams.push(datagram);
    this._recordHistory(`udpTransmit(${src} -> ${dst}, size=${data.length})`);
    return { src, dst, datagram, sent: true };
  }

  public reliableUdp(data: string, timeout: number, retries: number): { data: string; delivered: boolean; attempts: number; timeout: number } {
    const attempts = Math.min(retries + 1, 3);
    const delivered = Math.random() > 0.2;
    this._recordHistory(`reliableUdp(timeout=${timeout}, retries=${retries}) -> ${delivered}`);
    return { data, delivered, attempts, timeout };
  }

  public slidingWindow(data: string[], windowSize: number): { window: string[]; windowSize: number; sent: number; acknowledged: number } {
    const window = data.slice(0, windowSize);
    const acknowledged = Math.floor(windowSize * 0.7);
    this._recordHistory(`slidingWindow(size=${windowSize}, data=${data.length})`);
    return { window, windowSize, sent: window.length, acknowledged };
  }

  public cumulativeAck(ackNo: number, segments: TCPSegment[]): { ackNo: number; acknowledged: number; cumulative: boolean } {
    const acknowledged = segments.filter(s => s.seq < ackNo).length;
    this._recordHistory(`cumulativeAck(ackNo=${ackNo}, segments=${segments.length})`);
    return { ackNo, acknowledged, cumulative: true };
  }

  public toPacket(): DataPacket<{
    segments: number;
    datagrams: number;
    history: string[];
  }> {
    return {
      id: `transport-layer-${Date.now()}-${this._counter}`,
      payload: {
        segments: this._segments.length,
        datagrams: this._datagrams.length,
        history: [...this._history],
      },
      metadata: {
        createdAt: Date.now(),
        route: ['computer_network', 'transport_layer', 'result'],
        priority: 0.75,
        phase: 'transmission',
      },
    };
  }

  public reset(): void {
    this._segments = [];
    this._datagrams = [];
    this._history = [];
    this._counter = 0;
    this._seqNum = 0;
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }
}
