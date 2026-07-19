import { DataPacket } from '../shared/types';

export interface ApplicationProtocol {
  readonly name: string;
  readonly port: number;
  readonly method: string;
  readonly payload: string;
}

export interface HTTPRequest {
  readonly method: string;
  readonly url: string;
  readonly headers: Record<string, string>;
  readonly body: string;
}

export class ApplicationLayer {
  private _requests: HTTPRequest[] = [];
  private _protocols: Map<string, ApplicationProtocol> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get requestCount(): number {
    return this._requests.length;
  }

  get protocolCount(): number {
    return this._protocols.size;
  }

  get history(): string[] {
    return [...this._history];
  }

  public httpRequest(method: string, url: string, headers: Record<string, string>, body: string): HTTPRequest {
    const req: HTTPRequest = { method, url, headers, body };
    this._requests.push(req);
    this._protocols.set('HTTP', { name: 'HTTP', port: 80, method, payload: body });
    this._recordHistory(`HTTP ${method} ${url}`);
    return req;
  }

  public httpResponse(status: number, headers: Record<string, string>, body: string): { status: number; headers: Record<string, string>; body: string; ok: boolean } {
    const ok = status >= 200 && status < 300;
    this._recordHistory(`HTTP ${status} -> ok=${ok}`);
    return { status, headers, body, ok };
  }

  public dnsQuery(domain: string, type: string, resolver: string): { domain: string; type: string; resolver: string; result: string } {
    const result = '192.168.1.1';
    this._recordHistory(`DNS ${type} ${domain} via ${resolver} -> ${result}`);
    return { domain, type, resolver, result };
  }

  public dnsResolve(domain: string, recordType: string): { domain: string; recordType: string; records: string[]; ttl: number } {
    const records = ['192.168.1.1', '192.168.1.2'];
    const ttl = 3600;
    this._recordHistory(`dnsResolve(${domain}, ${recordType}) -> ${records.length} records`);
    return { domain, recordType, records, ttl };
  }

  public ftpTransfer(client: string, server: string, file: string, mode: 'active' | 'passive'): { client: string; server: string; file: string; mode: string; transferred: boolean } {
    this._recordHistory(`FTP ${mode}: ${client} -> ${server}, file=${file}`);
    return { client, server, file, mode, transferred: true };
  }

  public smtpSend(sender: string, recipients: string[], message: string): { sender: string; recipients: number; message: string; sent: boolean } {
    this._recordHistory(`SMTP: ${sender} -> ${recipients.length} recipients`);
    return { sender, recipients: recipients.length, message, sent: true };
  }

  public pop3Retrieve(server: string, user: string, messageId: string): { server: string; user: string; messageId: string; message: string } {
    const message = 'email content';
    this._recordHistory(`POP3: ${user}@${server}, msg=${messageId}`);
    return { server, user, messageId, message };
  }

  public imapSync(server: string, user: string, folder: string): { server: string; user: string; folder: string; messages: number } {
    const messages = 50;
    this._recordHistory(`IMAP sync: ${user}@${server}/${folder}, ${messages} msgs`);
    return { server, user, folder, messages };
  }

  public sshConnect(client: string, server: string, credentials: { username: string; key: string }): { client: string; server: string; connected: boolean; user: string } {
    this._recordHistory(`SSH: ${credentials.username}@${server} from ${client}`);
    return { client, server, connected: true, user: credentials.username };
  }

  public telnetSession(host: string, port: number): { host: string; port: number; connected: boolean; terminal: string } {
    this._recordHistory(`Telnet: ${host}:${port}`);
    return { host, port, connected: true, terminal: 'vt100' };
  }

  public tlsHandshake(client: string, server: string): { client: string; server: string; cipher: string; connected: boolean } {
    const cipher = 'TLS_AES_256_GCM_SHA384';
    this._recordHistory(`TLS handshake: ${client} <-> ${server}, cipher=${cipher}`);
    return { client, server, cipher, connected: true };
  }

  public websocketHandshake(request: HTTPRequest): { upgraded: boolean; protocol: string; key: string } {
    const upgraded = request.headers['upgrade']?.toLowerCase() === 'websocket';
    this._recordHistory(`WebSocket handshake: upgraded=${upgraded}`);
    return { upgraded, protocol: 'WebSocket', key: request.headers['sec-websocket-key'] ?? '' };
  }

  public grpcCall(service: string, method: string, request: string): { service: string; method: string; response: string; status: string } {
    this._recordHistory(`gRPC: ${service}/${method}`);
    return { service, method, response: 'response data', status: 'OK' };
  }

  public graphqlQuery(schema: string, query: string): { schema: string; query: string; data: string; errors: string[] } {
    this._recordHistory(`GraphQL query: ${query.slice(0, 50)}...`);
    return { schema, query, data: '{}', errors: [] };
  }

  public toPacket(): DataPacket<{
    requests: number;
    protocols: number;
    history: string[];
  }> {
    return {
      id: `app-layer-${Date.now()}-${this._counter}`,
      payload: {
        requests: this._requests.length,
        protocols: this._protocols.size,
        history: [...this._history],
      },
      metadata: {
        createdAt: Date.now(),
        route: ['computer_network', 'application_layer', 'result'],
        priority: 0.7,
        phase: 'application',
      },
    };
  }

  public reset(): void {
    this._requests = [];
    this._protocols.clear();
    this._history = [];
    this._counter = 0;
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }
}
