import { DataPacket, PacketMeta } from '../shared/types';

export type TCPState = 
  | 'CLOSED'
  | 'LISTEN'
  | 'SYN_SENT'
  | 'SYN_RECEIVED'
  | 'ESTABLISHED'
  | 'FIN_WAIT_1'
  | 'FIN_WAIT_2'
  | 'CLOSE_WAIT'
  | 'CLOSING'
  | 'LAST_ACK'
  | 'TIME_WAIT';

export type CongestionControlAlgorithm = 'Reno' | 'CUBIC' | 'BBR' | 'Vegas' | 'Westwood';

export type TCPPortStatus = 'open' | 'closed' | 'filtered' | 'stealth';

export interface TCPSegment {
  readonly srcPort: number;
  readonly dstPort: number;
  readonly seq: number;
  readonly ack: number;
  readonly dataOffset: number;
  readonly reserved: number;
  readonly flags: { 
    ns: boolean;
    cwr: boolean;
    ece: boolean;
    urg: boolean;
    ack: boolean;
    psh: boolean;
    rst: boolean;
    syn: boolean;
    fin: boolean;
  };
  readonly window: number;
  readonly checksum: number;
  readonly urgentPointer?: number;
  readonly options?: TCPOption[];
  readonly payload: Buffer | string;
}

export interface TCPOption {
  kind: number;
  length?: number;
  value?: number | Buffer;
}

export interface UDPDatagram {
  readonly srcPort: number;
  readonly dstPort: number;
  readonly length: number;
  readonly checksum: number;
  readonly payload: Buffer | string;
}

export interface TCPConnection {
  id: string;
  srcIP: string;
  dstIP: string;
  srcPort: number;
  dstPort: number;
  state: TCPState;
  localSeq: number;
  remoteSeq: number;
  localAck: number;
  remoteAck: number;
  windowSize: number;
  maxSegmentSize: number;
  congestionWindow: number;
  slowStartThreshold: number;
  congestionAlgorithm: CongestionControlAlgorithm;
  roundTripTime: number;
  smoothedRTT: number;
  rttVariance: number;
  timeout: number;
  retransmissionCount: number;
  duplicateAcks: number;
  createdAt: number;
  lastActivity: number;
}

export interface FlowControlState {
  receiverWindow: number;
  receiverBufferSize: number;
  bytesInBuffer: number;
  advertisedWindow: number;
}

export interface CongestionState {
  algorithm: CongestionControlAlgorithm;
  congestionWindow: number;
  slowStartThreshold: number;
  phase: 'slow-start' | 'congestion-avoidance' | 'fast-retransmit' | 'fast-recovery' | 'steady-state';
  lastCongestionEvent: number;
  packetLossRate: number;
}

export interface QUICConnection {
  id: string;
  srcIP: string;
  dstIP: string;
  srcPort: number;
  dstPort: number;
  state: 'connecting' | 'connected' | 'closing' | 'closed';
  streams: QUICStream[];
  congestionControl: CongestionState;
  encryptionLevel: 'initial' | 'handshake' | 'application';
  createdAt: number;
}

export interface QUICStream {
  id: number;
  connectionId: string;
  state: 'open' | 'half-closed-local' | 'half-closed-remote' | 'closed';
  priority: number;
  flowControlOffset: number;
  maxOffset: number;
  data: Buffer;
}

export interface PortMapping {
  externalPort: number;
  internalPort: number;
  internalIP: string;
  protocol: 'TCP' | 'UDP';
  description: string;
  enabled: boolean;
}

export interface NATSession {
  id: string;
  externalIP: string;
  externalPort: number;
  internalIP: string;
  internalPort: number;
  protocol: 'TCP' | 'UDP';
  destinationIP: string;
  destinationPort: number;
  createdAt: number;
  lastActivity: number;
  timeout: number;
}

export interface SocketStatistics {
  connections: number;
  activeConnections: number;
  closedConnections: number;
  bytesSent: number;
  bytesReceived: number;
  packetsSent: number;
  packetsReceived: number;
  retransmissions: number;
  duplicateAcks: number;
  averageRTT: number;
  averageWindowSize: number;
}

export interface ConnectionPool {
  connections: Map<string, TCPConnection>;
  maxConnections: number;
  activeConnections: number;
}

export class TransportLayer {
  private _segments: TCPSegment[] = [];
  private _datagrams: UDPDatagram[] = [];
  private _connections: Map<string, TCPConnection> = new Map();
  private _quicConnections: Map<string, QUICConnection> = new Map();
  private _natSessions: Map<string, NATSession> = new Map();
  private _portMappings: Map<number, PortMapping> = new Map();
  private _history: string[] = [];
  private _counter = 0;
  private _seqNum = 0;
  private _socketStats: SocketStatistics = {
    connections: 0,
    activeConnections: 0,
    closedConnections: 0,
    bytesSent: 0,
    bytesReceived: 0,
    packetsSent: 0,
    packetsReceived: 0,
    retransmissions: 0,
    duplicateAcks: 0,
    averageRTT: 0,
    averageWindowSize: 0,
  };

  get segmentCount(): number {
    return this._segments.length;
  }

  get datagramCount(): number {
    return this._datagrams.length;
  }

  get history(): string[] {
    return [...this._history];
  }

  get connectionCount(): number {
    return this._connections.size;
  }

  get socketStatistics(): SocketStatistics {
    return { ...this._socketStats };
  }

  createTCPConnection(srcIP: string, dstIP: string, srcPort: number, dstPort: number, options?: {
    congestionAlgorithm?: CongestionControlAlgorithm;
    maxSegmentSize?: number;
    windowSize?: number;
  }): TCPConnection {
    const connection: TCPConnection = {
      id: `conn-${++this._counter}`,
      srcIP,
      dstIP,
      srcPort,
      dstPort,
      state: 'CLOSED',
      localSeq: Math.floor(Math.random() * 1000000),
      remoteSeq: 0,
      localAck: 0,
      remoteAck: 0,
      windowSize: options?.windowSize || 65535,
      maxSegmentSize: options?.maxSegmentSize || 1460,
      congestionWindow: 1,
      slowStartThreshold: 65535,
      congestionAlgorithm: options?.congestionAlgorithm || 'CUBIC',
      roundTripTime: 0,
      smoothedRTT: 0,
      rttVariance: 0,
      timeout: 1000,
      retransmissionCount: 0,
      duplicateAcks: 0,
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };

    this._connections.set(connection.id, connection);
    this._socketStats.connections++;
    this._recordHistory(`createTCPConnection(${srcIP}:${srcPort} -> ${dstIP}:${dstPort})`);
    return connection;
  }

  tcpHandshake(connectionId: string): TCPConnection | null {
    const connection = this._connections.get(connectionId);
    if (!connection) return null;

    connection.state = 'SYN_SENT';
    connection.lastActivity = Date.now();
    this._recordHistory(`tcpHandshake: ${connection.id} -> SYN_SENT`);

    const synSegment = this._createTCPSegment(
      connection.srcPort,
      connection.dstPort,
      connection.localSeq,
      0,
      { syn: true },
      connection.windowSize
    );
    this._segments.push(synSegment);
    connection.localSeq++;

    connection.state = 'SYN_RECEIVED';
    this._recordHistory(`tcpHandshake: ${connection.id} -> SYN_RECEIVED`);

    const synAckSegment = this._createTCPSegment(
      connection.dstPort,
      connection.srcPort,
      Math.floor(Math.random() * 1000000),
      connection.localSeq,
      { syn: true, ack: true },
      connection.windowSize
    );
    this._segments.push(synAckSegment);
    connection.remoteSeq = synAckSegment.seq;

    connection.state = 'ESTABLISHED';
    connection.remoteAck = synAckSegment.ack;
    this._socketStats.activeConnections++;
    this._recordHistory(`tcpHandshake: ${connection.id} -> ESTABLISHED`);

    return connection;
  }

  private _createTCPSegment(
    srcPort: number,
    dstPort: number,
    seq: number,
    ack: number,
    flags: Partial<TCPState['flags']>,
    window: number,
    options?: TCPOption[],
    payload: Buffer | string = ''
  ): TCPSegment {
    const defaultFlags = {
      ns: false,
      cwr: false,
      ece: false,
      urg: false,
      ack: false,
      psh: false,
      rst: false,
      syn: false,
      fin: false,
    };

    return {
      srcPort,
      dstPort,
      seq,
      ack,
      dataOffset: 5 + (options?.length || 0),
      reserved: 0,
      flags: { ...defaultFlags, ...flags },
      window,
      checksum: this._calculateChecksum(srcPort, dstPort, seq, ack, window, payload),
      options,
      payload,
    };
  }

  private _calculateChecksum(srcPort: number, dstPort: number, seq: number, ack: number, window: number, payload: Buffer | string): number {
    let sum = srcPort + dstPort + (seq >> 16) + (seq & 0xFFFF) + (ack >> 16) + (ack & 0xFFFF) + window;
    const payloadStr = typeof payload === 'string' ? payload : payload.toString('utf8');
    for (let i = 0; i < payloadStr.length; i++) {
      sum += payloadStr.charCodeAt(i);
    }
    return ~sum & 0xFFFF;
  }

  tcpClose(connectionId: string, side: 'client' | 'server'): TCPConnection | null {
    const connection = this._connections.get(connectionId);
    if (!connection) return null;

    if (side === 'client') {
      connection.state = 'FIN_WAIT_1';
      const finSegment = this._createTCPSegment(
        connection.srcPort,
        connection.dstPort,
        connection.localSeq,
        connection.remoteSeq + 1,
        { fin: true, ack: true },
        connection.windowSize
      );
      this._segments.push(finSegment);
      connection.localSeq++;

      connection.state = 'FIN_WAIT_2';
      this._recordHistory(`tcpClose: ${connection.id} -> FIN_WAIT_2`);
    } else {
      connection.state = 'CLOSE_WAIT';
      connection.state = 'LAST_ACK';
      const finSegment = this._createTCPSegment(
        connection.dstPort,
        connection.srcPort,
        connection.remoteSeq,
        connection.localSeq,
        { fin: true, ack: true },
        connection.windowSize
      );
      this._segments.push(finSegment);
    }

    connection.state = 'TIME_WAIT';
    setTimeout(() => {
      connection.state = 'CLOSED';
      this._socketStats.activeConnections--;
      this._socketStats.closedConnections++;
      this._recordHistory(`tcpClose: ${connection.id} -> CLOSED`);
    }, 60000);

    return connection;
  }

  fourWayHandshake(connectionId: string): TCPConnection | null {
    const connection = this._connections.get(connectionId);
    if (!connection) return null;

    connection.state = 'FIN_WAIT_1';
    const fin1 = this._createTCPSegment(
      connection.srcPort,
      connection.dstPort,
      connection.localSeq,
      connection.remoteSeq + 1,
      { fin: true, ack: true },
      connection.windowSize
    );
    this._segments.push(fin1);
    connection.localSeq++;

    connection.state = 'FIN_WAIT_2';
    const ack1 = this._createTCPSegment(
      connection.dstPort,
      connection.srcPort,
      connection.remoteSeq,
      connection.localSeq,
      { ack: true },
      connection.windowSize
    );
    this._segments.push(ack1);

    connection.state = 'CLOSE_WAIT';
    connection.state = 'LAST_ACK';
    const fin2 = this._createTCPSegment(
      connection.dstPort,
      connection.srcPort,
      connection.remoteSeq + 1,
      connection.localSeq,
      { fin: true, ack: true },
      connection.windowSize
    );
    this._segments.push(fin2);

    connection.state = 'TIME_WAIT';
    const ack2 = this._createTCPSegment(
      connection.srcPort,
      connection.dstPort,
      connection.localSeq,
      connection.remoteSeq + 2,
      { ack: true },
      connection.windowSize
    );
    this._segments.push(ack2);

    this._recordHistory(`fourWayHandshake: ${connection.id} completed`);
    return connection;
  }

  sendTCPData(connectionId: string, data: string | Buffer): { sent: boolean; segment: TCPSegment; bytesSent: number } {
    const connection = this._connections.get(connectionId);
    if (!connection || connection.state !== 'ESTABLISHED') {
      return { sent: false, segment: {} as TCPSegment, bytesSent: 0 };
    }

    const payload = typeof data === 'string' ? data : data.toString('utf8');
    const maxPayloadSize = connection.maxSegmentSize;
    const chunks: string[] = [];
    
    for (let i = 0; i < payload.length; i += maxPayloadSize) {
      chunks.push(payload.substring(i, i + maxPayloadSize));
    }

    let totalBytes = 0;
    let lastSegment: TCPSegment;

    for (const chunk of chunks) {
      const psh = chunk === chunks[chunks.length - 1];
      const segment = this._createTCPSegment(
        connection.srcPort,
        connection.dstPort,
        connection.localSeq,
        connection.remoteSeq + 1,
        { ack: true, psh },
        connection.windowSize,
        undefined,
        chunk
      );
      this._segments.push(segment);
      this._socketStats.bytesSent += chunk.length;
      this._socketStats.packetsSent++;
      connection.localSeq += chunk.length;
      totalBytes += chunk.length;
      lastSegment = segment;
    }

    connection.lastActivity = Date.now();
    this._recordHistory(`sendTCPData: ${connection.id} sent ${totalBytes} bytes`);
    return { sent: true, segment: lastSegment!, bytesSent: totalBytes };
  }

  receiveTCPData(connectionId: string): { received: boolean; segments: TCPSegment[]; bytesReceived: number } {
    const connection = this._connections.get(connectionId);
    if (!connection || connection.state !== 'ESTABLISHED') {
      return { received: false, segments: [], bytesReceived: 0 };
    }

    const receivedSegments = this._segments.filter(s => 
      s.srcPort === connection.dstPort && s.dstPort === connection.srcPort && s.seq >= connection.remoteSeq
    );

    let totalBytes = 0;
    for (const segment of receivedSegments) {
      const payloadSize = typeof segment.payload === 'string' ? segment.payload.length : segment.payload.length;
      totalBytes += payloadSize;
      connection.remoteSeq += payloadSize;
      connection.remoteAck = segment.ack;
    }

    this._socketStats.bytesReceived += totalBytes;
    this._socketStats.packetsReceived += receivedSegments.length;
    connection.lastActivity = Date.now();
    this._recordHistory(`receiveTCPData: ${connection.id} received ${totalBytes} bytes`);
    return { received: true, segments: receivedSegments, bytesReceived: totalBytes };
  }

  flowControl(connectionId: string, receiverBufferSize: number, bytesInBuffer: number): FlowControlState {
    const connection = this._connections.get(connectionId);
    if (!connection) {
      return { receiverWindow: 0, receiverBufferSize, bytesInBuffer, advertisedWindow: 0 };
    }

    const receiverWindow = receiverBufferSize - bytesInBuffer;
    const advertisedWindow = Math.max(0, receiverWindow);

    connection.windowSize = advertisedWindow;
    this._recordHistory(`flowControl: ${connection.id} window=${advertisedWindow}`);
    return { receiverWindow, receiverBufferSize, bytesInBuffer, advertisedWindow };
  }

  congestionControl(connectionId: string, algorithm?: CongestionControlAlgorithm): CongestionState {
    const connection = this._connections.get(connectionId);
    if (!connection) {
      return {
        algorithm: algorithm || 'CUBIC',
        congestionWindow: 1,
        slowStartThreshold: 65535,
        phase: 'slow-start',
        lastCongestionEvent: 0,
        packetLossRate: 0,
      };
    }

    const targetAlgorithm = algorithm || connection.congestionAlgorithm;
    let phase: CongestionState['phase'] = 'slow-start';
    let cwnd = connection.congestionWindow;
    let ssthresh = connection.slowStartThreshold;

    if (cwnd >= ssthresh) {
      phase = 'congestion-avoidance';
      switch (targetAlgorithm) {
        case 'Reno':
          cwnd += 1;
          break;
        case 'CUBIC':
          cwnd = Math.min(cwnd + 1, ssthresh * 2);
          break;
        case 'BBR':
          cwnd = Math.min(cwnd + 2, ssthresh * 1.5);
          break;
        case 'Vegas':
          cwnd += 0.5;
          break;
        case 'Westwood':
          cwnd += 1;
          break;
      }
    } else {
      cwnd *= 2;
    }

    connection.congestionWindow = cwnd;
    connection.congestionAlgorithm = targetAlgorithm;
    this._recordHistory(`congestionControl: ${connection.id} ${targetAlgorithm} cwnd=${cwnd}`);

    return {
      algorithm: targetAlgorithm,
      congestionWindow: cwnd,
      slowStartThreshold: ssthresh,
      phase,
      lastCongestionEvent: Date.now(),
      packetLossRate: 0,
    };
  }

  slowStart(connectionId: string, ssthresh: number): CongestionState {
    const connection = this._connections.get(connectionId);
    if (!connection) {
      return {
        algorithm: 'Reno',
        congestionWindow: 1,
        slowStartThreshold: ssthresh,
        phase: 'slow-start',
        lastCongestionEvent: 0,
        packetLossRate: 0,
      };
    }

    connection.slowStartThreshold = ssthresh;
    connection.congestionWindow = Math.min(connection.congestionWindow * 2, ssthresh);
    this._recordHistory(`slowStart: ${connection.id} cwnd=${connection.congestionWindow}`);

    return {
      algorithm: connection.congestionAlgorithm,
      congestionWindow: connection.congestionWindow,
      slowStartThreshold: ssthresh,
      phase: connection.congestionWindow >= ssthresh ? 'congestion-avoidance' : 'slow-start',
      lastCongestionEvent: 0,
      packetLossRate: 0,
    };
  }

  congestionAvoidance(connectionId: string): CongestionState {
    const connection = this._connections.get(connectionId);
    if (!connection) {
      return {
        algorithm: 'Reno',
        congestionWindow: 1,
        slowStartThreshold: 65535,
        phase: 'congestion-avoidance',
        lastCongestionEvent: 0,
        packetLossRate: 0,
      };
    }

    switch (connection.congestionAlgorithm) {
      case 'Reno':
        connection.congestionWindow += 1;
        break;
      case 'CUBIC':
        connection.congestionWindow = Math.min(connection.congestionWindow + 1, connection.slowStartThreshold * 1.5);
        break;
      case 'BBR':
        connection.congestionWindow = Math.min(connection.congestionWindow + 2, connection.slowStartThreshold * 1.2);
        break;
      case 'Vegas':
        connection.congestionWindow += 0.5;
        break;
    }

    this._recordHistory(`congestionAvoidance: ${connection.id} cwnd=${connection.congestionWindow}`);
    return {
      algorithm: connection.congestionAlgorithm,
      congestionWindow: connection.congestionWindow,
      slowStartThreshold: connection.slowStartThreshold,
      phase: 'congestion-avoidance',
      lastCongestionEvent: 0,
      packetLossRate: 0,
    };
  }

  fastRetransmit(connectionId: string, dupAcks: number): { retransmitted: boolean; newCWND: number; newSSTHRESH: number } {
    const connection = this._connections.get(connectionId);
    if (!connection) {
      return { retransmitted: false, newCWND: 1, newSSTHRESH: 65535 };
    }

    connection.duplicateAcks += dupAcks;
    
    if (connection.duplicateAcks >= 3) {
      connection.slowStartThreshold = Math.floor(connection.congestionWindow / 2);
      connection.congestionWindow = connection.slowStartThreshold;
      this._socketStats.retransmissions++;
      this._recordHistory(`fastRetransmit: ${connection.id} retransmitted, cwnd=${connection.congestionWindow}`);
      return { retransmitted: true, newCWND: connection.congestionWindow, newSSTHRESH: connection.slowStartThreshold };
    }

    return { retransmitted: false, newCWND: connection.congestionWindow, newSSTHRESH: connection.slowStartThreshold };
  }

  fastRecovery(connectionId: string): CongestionState {
    const connection = this._connections.get(connectionId);
    if (!connection) {
      return {
        algorithm: 'Reno',
        congestionWindow: 1,
        slowStartThreshold: 65535,
        phase: 'recovery',
        lastCongestionEvent: 0,
        packetLossRate: 0,
      };
    }

    connection.congestionWindow = connection.slowStartThreshold + 3;
    this._recordHistory(`fastRecovery: ${connection.id} cwnd=${connection.congestionWindow}`);

    return {
      algorithm: connection.congestionAlgorithm,
      congestionWindow: connection.congestionWindow,
      slowStartThreshold: connection.slowStartThreshold,
      phase: 'recovery',
      lastCongestionEvent: Date.now(),
      packetLossRate: 0,
    };
  }

  tcpReno(connectionId: string): CongestionState {
    const connection = this._connections.get(connectionId);
    if (!connection) {
      return {
        algorithm: 'Reno',
        congestionWindow: 1,
        slowStartThreshold: 65535,
        phase: 'slow-start',
        lastCongestionEvent: 0,
        packetLossRate: 0,
      };
    }

    connection.congestionAlgorithm = 'Reno';
    return this.congestionControl(connectionId, 'Reno');
  }

  tcpCubic(connectionId: string): CongestionState {
    const connection = this._connections.get(connectionId);
    if (!connection) {
      return {
        algorithm: 'CUBIC',
        congestionWindow: 1,
        slowStartThreshold: 65535,
        phase: 'slow-start',
        lastCongestionEvent: 0,
        packetLossRate: 0,
      };
    }

    connection.congestionAlgorithm = 'CUBIC';
    return this.congestionControl(connectionId, 'CUBIC');
  }

  tcpBBR(connectionId: string): CongestionState {
    const connection = this._connections.get(connectionId);
    if (!connection) {
      return {
        algorithm: 'BBR',
        congestionWindow: 1,
        slowStartThreshold: 65535,
        phase: 'slow-start',
        lastCongestionEvent: 0,
        packetLossRate: 0,
      };
    }

    connection.congestionAlgorithm = 'BBR';
    return this.congestionControl(connectionId, 'BBR');
  }

  udpTransmit(srcIP: string, dstIP: string, srcPort: number, dstPort: number, data: string | Buffer): { sent: boolean; datagram: UDPDatagram } {
    const payload = typeof data === 'string' ? data : data.toString('utf8');
    const length = payload.length + 8;

    const datagram: UDPDatagram = {
      srcPort,
      dstPort,
      length,
      checksum: this._calculateUDPChecksum(srcPort, dstPort, payload),
      payload,
    };

    this._datagrams.push(datagram);
    this._socketStats.bytesSent += payload.length;
    this._socketStats.packetsSent++;
    this._recordHistory(`udpTransmit(${srcIP}:${srcPort} -> ${dstIP}:${dstPort}, size=${payload.length})`);
    return { sent: true, datagram };
  }

  private _calculateUDPChecksum(srcPort: number, dstPort: number, payload: string): number {
    let sum = srcPort + dstPort + (payload.length + 8);
    for (let i = 0; i < payload.length; i++) {
      sum += payload.charCodeAt(i);
    }
    return ~sum & 0xFFFF;
  }

  udpReceive(srcIP: string, dstIP: string, dstPort: number): { received: boolean; datagrams: UDPDatagram[]; bytesReceived: number } {
    const received = this._datagrams.filter(d => 
      d.srcPort !== dstPort && d.dstPort === dstPort
    );

    let totalBytes = 0;
    for (const d of received) {
      totalBytes += typeof d.payload === 'string' ? d.payload.length : d.payload.length;
    }

    this._socketStats.bytesReceived += totalBytes;
    this._socketStats.packetsReceived += received.length;
    this._recordHistory(`udpReceive(${srcIP} -> ${dstIP}:${dstPort}, count=${received.length})`);
    return { received: received.length > 0, datagrams: received, bytesReceived: totalBytes };
  }

  reliableUdp(data: string, timeout: number, retries: number): { delivered: boolean; attempts: number; timeout: number } {
    let attempts = 0;
    let delivered = false;

    while (attempts <= retries && !delivered) {
      attempts++;
      delivered = Math.random() > 0.15;
      if (!delivered && attempts < retries) {
        this._recordHistory(`reliableUdp: attempt ${attempts} failed, retrying...`);
      }
    }

    this._recordHistory(`reliableUdp: delivered=${delivered}, attempts=${attempts}`);
    return { delivered, attempts, timeout };
  }

  slidingWindow(connectionId: string, windowSize: number, dataChunks: string[]): { sent: number; acknowledged: number; window: string[] } {
    const connection = this._connections.get(connectionId);
    if (!connection) {
      return { sent: 0, acknowledged: 0, window: [] };
    }

    const window = dataChunks.slice(0, windowSize);
    const acknowledged = Math.floor(window.length * (0.6 + Math.random() * 0.4));
    
    connection.localSeq += acknowledged;
    this._recordHistory(`slidingWindow: ${connection.id} sent=${window.length}, acked=${acknowledged}`);
    return { sent: window.length, acknowledged, window };
  }

  cumulativeAck(connectionId: string, ackNo: number): { acknowledged: number; unacknowledged: number } {
    const connection = this._connections.get(connectionId);
    if (!connection) {
      return { acknowledged: 0, unacknowledged: 0 };
    }

    const acknowledged = Math.max(0, ackNo - connection.remoteSeq);
    connection.remoteSeq = ackNo;
    this._recordHistory(`cumulativeAck: ${connection.id} ackNo=${ackNo}, acknowledged=${acknowledged}`);
    return { acknowledged, unacknowledged: connection.localSeq - ackNo };
  }

  updateRTT(connectionId: string, sampleRTT: number): { smoothedRTT: number; rttVariance: number; timeout: number } {
    const connection = this._connections.get(connectionId);
    if (!connection) {
      return { smoothedRTT: sampleRTT, rttVariance: 0, timeout: sampleRTT * 2 };
    }

    if (connection.smoothedRTT === 0) {
      connection.smoothedRTT = sampleRTT;
      connection.rttVariance = sampleRTT / 2;
    } else {
      connection.rttVariance = 0.75 * connection.rttVariance + 0.25 * Math.abs(sampleRTT - connection.smoothedRTT);
      connection.smoothedRTT = 0.875 * connection.smoothedRTT + 0.125 * sampleRTT;
    }

    connection.roundTripTime = sampleRTT;
    connection.timeout = connection.smoothedRTT + Math.max(1, 4 * connection.rttVariance);
    
    this._socketStats.averageRTT = (this._socketStats.averageRTT + sampleRTT) / 2;
    this._recordHistory(`updateRTT: ${connection.id} RTT=${sampleRTT}ms, timeout=${connection.timeout}ms`);
    return { smoothedRTT: connection.smoothedRTT, rttVariance: connection.rttVariance, timeout: connection.timeout };
  }

  createQUICConnection(srcIP: string, dstIP: string, srcPort: number, dstPort: number): QUICConnection {
    const connection: QUICConnection = {
      id: `quic-${++this._counter}`,
      srcIP,
      dstIP,
      srcPort,
      dstPort,
      state: 'connecting',
      streams: [],
      congestionControl: {
        algorithm: 'BBR',
        congestionWindow: 1,
        slowStartThreshold: 65535,
        phase: 'slow-start',
        lastCongestionEvent: 0,
        packetLossRate: 0,
      },
      encryptionLevel: 'initial',
      createdAt: Date.now(),
    };

    this._quicConnections.set(connection.id, connection);
    connection.state = 'connected';
    connection.encryptionLevel = 'application';
    this._recordHistory(`createQUICConnection(${srcIP}:${srcPort} -> ${dstIP}:${dstPort})`);
    return connection;
  }

  createQUICStream(connectionId: string, priority: number = 0): QUICStream | null {
    const connection = this._quicConnections.get(connectionId);
    if (!connection) return null;

    const streamId = connection.streams.length * 2 + (connection.srcPort > connection.dstPort ? 1 : 0);
    const stream: QUICStream = {
      id: streamId,
      connectionId,
      state: 'open',
      priority,
      flowControlOffset: 0,
      maxOffset: 0,
      data: Buffer.alloc(0),
    };

    connection.streams.push(stream);
    this._recordHistory(`createQUICStream: ${connectionId} stream=${streamId}`);
    return stream;
  }

  sendQUICData(connectionId: string, streamId: number, data: string | Buffer): { sent: boolean; bytesSent: number } {
    const connection = this._quicConnections.get(connectionId);
    if (!connection) return { sent: false, bytesSent: 0 };

    const stream = connection.streams.find(s => s.id === streamId);
    if (!stream || stream.state === 'closed') return { sent: false, bytesSent: 0 };

    const buffer = typeof data === 'string' ? Buffer.from(data) : data;
    stream.data = Buffer.concat([stream.data, buffer]);
    stream.maxOffset += buffer.length;
    this._socketStats.bytesSent += buffer.length;
    this._socketStats.packetsSent++;

    this._recordHistory(`sendQUICData: ${connectionId} stream=${streamId} bytes=${buffer.length}`);
    return { sent: true, bytesSent: buffer.length };
  }

  addPortMapping(externalPort: number, internalPort: number, internalIP: string, protocol: 'TCP' | 'UDP', description?: string): PortMapping {
    const mapping: PortMapping = {
      externalPort,
      internalPort,
      internalIP,
      protocol,
      description: description || '',
      enabled: true,
    };

    this._portMappings.set(externalPort, mapping);
    this._recordHistory(`addPortMapping: ${protocol} ${externalPort} -> ${internalIP}:${internalPort}`);
    return mapping;
  }

  createNATSession(externalIP: string, internalIP: string, internalPort: number, protocol: 'TCP' | 'UDP', destinationIP: string, destinationPort: number): NATSession {
    const externalPort = 30000 + Math.floor(Math.random() * 32767);
    const session: NATSession = {
      id: `nat-${++this._counter}`,
      externalIP,
      externalPort,
      internalIP,
      internalPort,
      protocol,
      destinationIP,
      destinationPort,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      timeout: protocol === 'TCP' ? 3600 : 60,
    };

    this._natSessions.set(session.id, session);
    this._recordHistory(`createNATSession: ${protocol} ${internalIP}:${internalPort} -> ${externalIP}:${externalPort}`);
    return session;
  }

  getNATSession(internalIP: string, internalPort: number): NATSession | null {
    const session = Array.from(this._natSessions.values()).find(
      s => s.internalIP === internalIP && s.internalPort === internalPort && s.lastActivity + s.timeout * 1000 > Date.now()
    );
    if (session) {
      session.lastActivity = Date.now();
    }
    return session || null;
  }

  portScan(targetIP: string, ports: number[]): { port: number; status: TCPPortStatus; service?: string }[] {
    const results = ports.map(port => {
      const status: TCPPortStatus = Math.random() > 0.3 ? 'open' : Math.random() > 0.5 ? 'closed' : 'filtered';
      const services: Record<number, string> = {
        21: 'FTP',
        22: 'SSH',
        23: 'Telnet',
        25: 'SMTP',
        53: 'DNS',
        80: 'HTTP',
        443: 'HTTPS',
        3306: 'MySQL',
        5432: 'PostgreSQL',
        8080: 'HTTP Proxy',
      };

      return { port, status, service: services[port] };
    });

    this._recordHistory(`portScan: ${targetIP} ports=${ports.length}`);
    return results;
  }

  traceroute(targetIP: string, maxHops: number = 30): { hop: number; ip: string; rtt: number }[] {
    const hops: { hop: number; ip: string; rtt: number }[] = [];
    
    for (let i = 1; i <= Math.min(maxHops, 15); i++) {
      const ip = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
      const rtt = Math.floor(Math.random() * 50) + 10;
      hops.push({ hop: i, ip, rtt });
      
      if (ip === targetIP || Math.random() > 0.85) {
        break;
      }
    }

    this._recordHistory(`traceroute: ${targetIP} hops=${hops.length}`);
    return hops;
  }

  getConnectionById(connectionId: string): TCPConnection | null {
    return this._connections.get(connectionId) || null;
  }

  listConnections(filter?: { state?: TCPState; srcIP?: string; dstIP?: string }): TCPConnection[] {
    let connections = Array.from(this._connections.values());
    
    if (filter?.state) {
      connections = connections.filter(c => c.state === filter.state);
    }
    if (filter?.srcIP) {
      connections = connections.filter(c => c.srcIP === filter.srcIP);
    }
    if (filter?.dstIP) {
      connections = connections.filter(c => c.dstIP === filter.dstIP);
    }

    return connections;
  }

  closeConnection(connectionId: string): boolean {
    const connection = this._connections.get(connectionId);
    if (!connection) return false;

    this.tcpClose(connectionId, 'client');
    this._connections.delete(connectionId);
    return true;
  }

  cleanupStaleConnections(): number {
    let cleaned = 0;
    const now = Date.now();

    for (const [id, connection] of this._connections.entries()) {
      if (connection.state === 'CLOSED' || (connection.lastActivity + 300000 < now && connection.state !== 'ESTABLISHED')) {
        this._connections.delete(id);
        cleaned++;
      }
    }

    for (const [id, session] of this._natSessions.entries()) {
      if (session.lastActivity + session.timeout * 1000 < now) {
        this._natSessions.delete(id);
      }
    }

    this._recordHistory(`cleanupStaleConnections: cleaned ${cleaned} connections`);
    return cleaned;
  }

  toPacket(): DataPacket<{
    segments: number;
    datagrams: number;
    connections: number;
    socketStats: SocketStatistics;
    history: string[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['computer_network', 'transport_layer', 'result'],
      priority: 0.75,
      phase: 'transmission',
    };

    return {
      id: `transport-layer-${Date.now().toString(36)}-${this._counter}`,
      payload: {
        segments: this._segments.length,
        datagrams: this._datagrams.length,
        connections: this._connections.size,
        socketStats: this.socketStatistics,
        history: [...this._history],
      },
      metadata,
    };
  }

  reset(): void {
    this._segments = [];
    this._datagrams = [];
    this._connections = new Map();
    this._quicConnections = new Map();
    this._natSessions = new Map();
    this._portMappings = new Map();
    this._history = [];
    this._counter = 0;
    this._seqNum = 0;
    this._socketStats = {
      connections: 0,
      activeConnections: 0,
      closedConnections: 0,
      bytesSent: 0,
      bytesReceived: 0,
      packetsSent: 0,
      packetsReceived: 0,
      retransmissions: 0,
      duplicateAcks: 0,
      averageRTT: 0,
      averageWindowSize: 0,
    };
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }
}