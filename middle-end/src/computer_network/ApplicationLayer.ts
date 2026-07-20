import { DataPacket, PacketMeta } from '../shared/types';

export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS' | 'TRACE';

export type HTTPVersion = 'HTTP/1.0' | 'HTTP/1.1' | 'HTTP/2' | 'HTTP/3';

export type HTTPStatus = 100 | 101 | 200 | 201 | 204 | 301 | 302 | 304 | 400 | 401 | 403 | 404 | 500 | 502 | 503;

export type TLSVersion = 'TLSv1.0' | 'TLSv1.1' | 'TLSv1.2' | 'TLSv1.3';

export type CompressionMethod = 'gzip' | 'deflate' | 'br' | 'identity';

export interface ApplicationProtocol {
  readonly name: string;
  readonly port: number;
  readonly method: string;
  readonly payload: string;
  readonly version: string;
}

export interface HTTPRequest {
  readonly method: HTTPMethod;
  readonly url: string;
  readonly headers: Record<string, string>;
  readonly body: string;
  readonly version: HTTPVersion;
  readonly host: string;
  readonly path: string;
  readonly query: Record<string, string>;
}

export interface HTTPResponse {
  readonly status: HTTPStatus;
  readonly statusText: string;
  readonly headers: Record<string, string>;
  readonly body: string;
  readonly version: HTTPVersion;
  readonly latency: number;
}

export interface HTTP2Stream {
  readonly id: number;
  readonly weight: number;
  readonly dependency: number;
  readonly state: 'idle' | 'open' | 'half-closed-remote' | 'half-closed-local' | 'closed';
  readonly priority: number;
}

export interface WebSocketFrame {
  readonly fin: boolean;
  readonly rsv1: boolean;
  readonly rsv2: boolean;
  readonly rsv3: boolean;
  readonly opcode: number;
  readonly mask: boolean;
  readonly payloadLength: number;
  readonly payload: Buffer | string;
}

export interface WebSocketConnection {
  readonly id: string;
  readonly client: string;
  readonly server: string;
  readonly protocol: string;
  readonly state: 'connecting' | 'open' | 'closing' | 'closed';
  readonly subprotocol?: string;
  readonly pingInterval: number;
}

export interface gRPCMethod {
  readonly service: string;
  readonly method: string;
  readonly requestType: string;
  readonly responseType: string;
  readonly streaming: boolean;
}

export interface gRPCStatus {
  readonly code: number;
  readonly message: string;
  readonly details?: string[];
}

export interface GraphQLSchema {
  readonly types: string[];
  readonly queries: string[];
  readonly mutations: string[];
  readonly subscriptions: string[];
}

export interface GraphQLQuery {
  readonly query: string;
  readonly variables?: Record<string, unknown>;
  readonly operationName?: string;
}

export interface GraphQLResponse {
  readonly data?: Record<string, unknown>;
  readonly errors?: { message: string; locations?: { line: number; column: number }[] }[];
}

export interface SMTPMessage {
  readonly from: string;
  readonly to: string[];
  readonly cc?: string[];
  readonly bcc?: string[];
  readonly subject: string;
  readonly body: string;
  readonly attachments?: { filename: string; content: string }[];
}

export interface FTPFile {
  readonly name: string;
  readonly size: number;
  readonly type: 'file' | 'directory';
  readonly permissions: string;
  readonly modifiedAt: number;
}

export interface SSHSession {
  readonly id: string;
  readonly client: string;
  readonly server: string;
  readonly user: string;
  readonly authMethod: 'password' | 'publickey' | 'hostbased' | 'gssapi';
  readonly state: 'authenticating' | 'connected' | 'disconnected';
  readonly cipher: string;
}

export interface Cookie {
  readonly name: string;
  readonly value: string;
  readonly domain?: string;
  readonly path?: string;
  readonly expires?: Date;
  readonly maxAge?: number;
  readonly secure?: boolean;
  readonly httpOnly?: boolean;
  readonly sameSite?: 'strict' | 'lax' | 'none';
}

export interface CORSConfig {
  readonly origin: string | string[];
  readonly methods: string[];
  readonly allowedHeaders: string[];
  readonly exposedHeaders: string[];
  readonly credentials: boolean;
  readonly maxAge: number;
}

export interface RateLimitConfig {
  readonly requests: number;
  readonly windowMs: number;
  readonly delayAfter?: number;
  readonly maxDelayMs?: number;
}

export class ApplicationLayer {
  private _requests: HTTPRequest[] = [];
  private _responses: HTTPResponse[] = [];
  private _protocols: Map<string, ApplicationProtocol> = new Map();
  private _websocketConnections: Map<string, WebSocketConnection> = new Map();
  private _http2Streams: Map<number, HTTP2Stream> = new Map();
  private _sshSessions: Map<string, SSHSession> = new Map();
  private _corsConfigs: Map<string, CORSConfig> = new Map();
  private _rateLimits: Map<string, { count: number; resetTime: number }> = new Map();
  private _cookies: Map<string, Cookie[]> = new Map();
  private _history: string[] = [];
  private _counter = 0;
  private _streamId = 0;

  get requestCount(): number {
    return this._requests.length;
  }

  get protocolCount(): number {
    return this._protocols.size;
  }

  get history(): string[] {
    return [...this._history];
  }

  get websocketCount(): number {
    return this._websocketConnections.size;
  }

  get http2StreamCount(): number {
    return this._http2Streams.size;
  }

  httpRequest(method: HTTPMethod, url: string, headers: Record<string, string>, body: string, options?: { version?: HTTPVersion; host?: string }): HTTPRequest {
    const version = options?.version ?? 'HTTP/1.1';
    const host = options?.host ?? new URL(url).hostname;
    const urlObj = new URL(url);
    const query: Record<string, string> = {};
    urlObj.searchParams.forEach((value, key) => {
      query[key] = value;
    });

    const req: HTTPRequest = {
      method,
      url,
      headers,
      body,
      version,
      host,
      path: urlObj.pathname,
      query,
    };

    this._requests.push(req);
    this._protocols.set('HTTP', { name: 'HTTP', port: 80, method, payload: body, version });
    this._recordHistory(`HTTP ${method} ${url} (${version})`);
    return req;
  }

  httpResponse(status: HTTPStatus, headers: Record<string, string>, body: string, options?: { version?: HTTPVersion; latency?: number }): HTTPResponse {
    const version = options?.version ?? 'HTTP/1.1';
    const latency = options?.latency ?? Math.floor(Math.random() * 100) + 10;

    const statusTexts: Record<HTTPStatus, string> = {
      100: 'Continue',
      101: 'Switching Protocols',
      200: 'OK',
      201: 'Created',
      204: 'No Content',
      301: 'Moved Permanently',
      302: 'Found',
      304: 'Not Modified',
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
    };

    const res: HTTPResponse = {
      status,
      statusText: statusTexts[status],
      headers,
      body,
      version,
      latency,
    };

    this._responses.push(res);
    this._recordHistory(`HTTP ${status} ${statusTexts[status]} (${latency}ms)`);
    return res;
  }

  http2Request(method: HTTPMethod, url: string, headers: Record<string, string>, body: string): { request: HTTPRequest; stream: HTTP2Stream } {
    const request = this.httpRequest(method, url, headers, body, { version: 'HTTP/2' });
    const stream: HTTP2Stream = {
      id: ++this._streamId,
      weight: 16,
      dependency: 0,
      state: 'open',
      priority: 0,
    };

    this._http2Streams.set(stream.id, stream);
    this._recordHistory(`HTTP/2 ${method} ${url} stream=${stream.id}`);
    return { request, stream };
  }

  http2Push(streamId: number, url: string, headers: Record<string, string>): { pushed: boolean; stream: HTTP2Stream } {
    const stream = this._http2Streams.get(streamId);
    if (!stream || stream.state !== 'open') {
      return { pushed: false, stream: {} as HTTP2Stream };
    }

    const pushStream: HTTP2Stream = {
      id: ++this._streamId,
      weight: stream.weight,
      dependency: streamId,
      state: 'open',
      priority: stream.priority,
    };

    this._http2Streams.set(pushStream.id, pushStream);
    this._recordHistory(`HTTP/2 PUSH ${url} stream=${pushStream.id}`);
    return { pushed: true, stream: pushStream };
  }

  http2Prioritize(streamId: number, weight: number, dependency: number): { updated: boolean; stream: HTTP2Stream | null } {
    const stream = this._http2Streams.get(streamId);
    if (!stream) {
      return { updated: false, stream: null };
    }

    stream.weight = weight;
    stream.dependency = dependency;
    this._recordHistory(`HTTP/2 prioritize stream=${streamId}, weight=${weight}, dep=${dependency}`);
    return { updated: true, stream };
  }

  http2CloseStream(streamId: number): { closed: boolean } {
    const stream = this._http2Streams.get(streamId);
    if (!stream) {
      return { closed: false };
    }

    stream.state = 'closed';
    this._http2Streams.delete(streamId);
    this._recordHistory(`HTTP/2 close stream=${streamId}`);
    return { closed: true };
  }

  dnsQuery(domain: string, type: string, resolver: string): { domain: string; type: string; resolver: string; result: string; ttl: number; authoritative: boolean } {
    const result = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    const ttl = 3600;
    const authoritative = Math.random() > 0.3;

    this._recordHistory(`DNS ${type} ${domain} via ${resolver} -> ${result}`);
    return { domain, type, resolver, result, ttl, authoritative };
  }

  dnsResolve(domain: string, recordType: string): { domain: string; recordType: string; records: string[]; ttl: number; nameservers: string[] } {
    const records = [
      `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
    ];
    const ttl = 3600;
    const nameservers = ['ns1.example.com', 'ns2.example.com'];

    this._recordHistory(`dnsResolve(${domain}, ${recordType}) -> ${records.length} records`);
    return { domain, recordType, records, ttl, nameservers };
  }

  dnsZoneTransfer(zone: string, master: string, slave: string): { transferred: boolean; records: number; zone: string; master: string; slave: string } {
    const records = Math.floor(Math.random() * 100) + 50;
    this._recordHistory(`DNS AXFR: ${zone} ${master} -> ${slave}, ${records} records`);
    return { transferred: true, records, zone, master, slave };
  }

  ftpConnect(host: string, port: number, credentials: { username: string; password: string }, mode: 'active' | 'passive'): { connected: boolean; host: string; port: number; mode: string; user: string } {
    const connected = Math.random() > 0.05;
    this._recordHistory(`FTP ${mode}: ${credentials.username}@${host}:${port}`);
    return { connected, host, port, mode, user: credentials.username };
  }

  ftpList(host: string, path: string): { host: string; path: string; files: FTPFile[]; totalFiles: number } {
    const files: FTPFile[] = [];
    const fileCount = Math.floor(Math.random() * 10) + 5;

    for (let i = 0; i < fileCount; i++) {
      files.push({
        name: `file-${i}.txt`,
        size: Math.floor(Math.random() * 1000000),
        type: Math.random() > 0.7 ? 'directory' : 'file',
        permissions: 'rw-r--r--',
        modifiedAt: Date.now() - Math.floor(Math.random() * 86400000),
      });
    }

    this._recordHistory(`FTP LIST: ${host}${path} -> ${files.length} files`);
    return { host, path, files, totalFiles: files.length };
  }

  ftpTransfer(client: string, server: string, file: string, mode: 'active' | 'passive', direction: 'upload' | 'download'): { client: string; server: string; file: string; mode: string; direction: string; transferred: boolean; bytes: number } {
    const bytes = Math.floor(Math.random() * 1000000);
    this._recordHistory(`FTP ${direction} ${mode}: ${client} <-> ${server}, file=${file}, ${bytes} bytes`);
    return { client, server, file, mode, direction, transferred: true, bytes };
  }

  smtpSend(message: SMTPMessage, server: string, port: number): { sender: string; recipients: number; messageId: string; sent: boolean; server: string; port: number } {
    const messageId = `<${Date.now()}.${this._counter}@${server}>`;
    const sent = Math.random() > 0.05;
    this._recordHistory(`SMTP: ${message.from} -> ${message.to.length} recipients via ${server}:${port}`);
    return { sender: message.from, recipients: message.to.length, messageId, sent, server, port };
  }

  smtpReceive(server: string, user: string, password: string): { server: string; user: string; messages: number; unread: number } {
    const messages = Math.floor(Math.random() * 20) + 5;
    const unread = Math.floor(Math.random() * 5);
    this._recordHistory(`SMTP receive: ${user}@${server} -> ${messages} messages (${unread} unread)`);
    return { server, user, messages, unread };
  }

  pop3Retrieve(server: string, user: string, password: string, messageId: string): { server: string; user: string; messageId: string; message: SMTPMessage; retrieved: boolean } {
    const message: SMTPMessage = {
      from: 'sender@example.com',
      to: [user],
      subject: 'Test Message',
      body: 'This is a test email body.',
    };
    this._recordHistory(`POP3: ${user}@${server}, msg=${messageId}`);
    return { server, user, messageId, message, retrieved: true };
  }

  pop3Delete(server: string, user: string, messageIds: string[]): { server: string; user: string; deleted: number; remaining: number } {
    const deleted = messageIds.length;
    const remaining = Math.floor(Math.random() * 10);
    this._recordHistory(`POP3 DELETE: ${user}@${server}, ${deleted} messages`);
    return { server, user, deleted, remaining };
  }

  imapSync(server: string, user: string, password: string, folder: string): { server: string; user: string; folder: string; messages: number; newMessages: number; syncStatus: string } {
    const messages = Math.floor(Math.random() * 100) + 10;
    const newMessages = Math.floor(Math.random() * 10);
    this._recordHistory(`IMAP sync: ${user}@${server}/${folder}, ${messages} msgs (${newMessages} new)`);
    return { server, user, folder, messages, newMessages, syncStatus: 'completed' };
  }

  imapSearch(server: string, user: string, query: string): { server: string; user: string; query: string; results: number[]; count: number } {
    const count = Math.floor(Math.random() * 20) + 1;
    const results = Array.from({ length: count }, (_, i) => i + 1);
    this._recordHistory(`IMAP SEARCH: ${user}@${server}, query="${query}" -> ${count} results`);
    return { server, user, query, results, count };
  }

  sshConnect(client: string, server: string, credentials: { username: string; key?: string; password?: string }): SSHSession {
    const authMethod = credentials.key ? 'publickey' : 'password';
    const session: SSHSession = {
      id: `ssh-${++this._counter}`,
      client,
      server,
      user: credentials.username,
      authMethod,
      state: 'connected',
      cipher: 'aes256-gcm@openssh.com',
    };

    this._sshSessions.set(session.id, session);
    this._recordHistory(`SSH: ${credentials.username}@${server} from ${client} (${authMethod})`);
    return session;
  }

  sshExecute(sessionId: string, command: string): { sessionId: string; command: string; output: string; exitCode: number } {
    const session = this._sshSessions.get(sessionId);
    if (!session || session.state !== 'connected') {
      return { sessionId, command, output: '', exitCode: -1 };
    }

    const output = `Command executed: ${command}\nOutput: success`;
    const exitCode = 0;
    this._recordHistory(`SSH exec: ${sessionId} "${command}" -> exit=${exitCode}`);
    return { sessionId, command, output, exitCode };
  }

  sshClose(sessionId: string): { closed: boolean; sessionId: string } {
    const session = this._sshSessions.get(sessionId);
    if (!session) {
      return { closed: false, sessionId };
    }

    session.state = 'disconnected';
    this._sshSessions.delete(sessionId);
    this._recordHistory(`SSH close: ${sessionId}`);
    return { closed: true, sessionId };
  }

  telnetSession(host: string, port: number): { host: string; port: number; connected: boolean; terminal: string; timeout: number } {
    const connected = Math.random() > 0.1;
    this._recordHistory(`Telnet: ${host}:${port}`);
    return { host, port, connected, terminal: 'vt100', timeout: 300 };
  }

  tlsHandshake(client: string, server: string, version?: TLSVersion, cipher?: string): { client: string; server: string; cipher: string; version: string; connected: boolean; certificate?: string } {
    const tlsVersion = version ?? 'TLSv1.3';
    const selectedCipher = cipher ?? 'TLS_AES_256_GCM_SHA384';
    this._recordHistory(`TLS ${tlsVersion} handshake: ${client} <-> ${server}, cipher=${selectedCipher}`);
    return { client, server, cipher: selectedCipher, version: tlsVersion, connected: true };
  }

  tlsCertificateVerify(certificate: string): { valid: boolean; issuer: string; subject: string; expires: Date; validFrom: Date } {
    const valid = Math.random() > 0.05;
    this._recordHistory(`TLS cert verify: valid=${valid}`);
    return {
      valid,
      issuer: 'Example CA',
      subject: 'example.com',
      expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      validFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    };
  }

  websocketHandshake(request: HTTPRequest): { upgraded: boolean; protocol: string; key: string; accept: string; subprotocol?: string } {
    const upgraded = request.headers['upgrade']?.toLowerCase() === 'websocket';
    const key = request.headers['sec-websocket-key'] ?? '';
    const accept = upgraded ? Buffer.from(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11', 'ascii').toString('base64') : '';

    this._recordHistory(`WebSocket handshake: upgraded=${upgraded}`);
    return { upgraded, protocol: 'WebSocket', key, accept };
  }

  websocketConnect(client: string, server: string, url: string): WebSocketConnection {
    const connection: WebSocketConnection = {
      id: `ws-${++this._counter}`,
      client,
      server,
      protocol: 'WebSocket',
      state: 'open',
      pingInterval: 30000,
    };

    this._websocketConnections.set(connection.id, connection);
    this._recordHistory(`WebSocket connect: ${client} -> ${server} (${url})`);
    return connection;
  }

  websocketSend(connectionId: string, data: string | Buffer): { sent: boolean; bytes: number; connectionId: string } {
    const connection = this._websocketConnections.get(connectionId);
    if (!connection || connection.state !== 'open') {
      return { sent: false, bytes: 0, connectionId };
    }

    const bytes = typeof data === 'string' ? data.length : data.length;
    this._recordHistory(`WebSocket send: ${connectionId}, ${bytes} bytes`);
    return { sent: true, bytes, connectionId };
  }

  websocketReceive(connectionId: string): { received: boolean; data: string; bytes: number; connectionId: string } {
    const connection = this._websocketConnections.get(connectionId);
    if (!connection || connection.state !== 'open') {
      return { received: false, data: '', bytes: 0, connectionId };
    }

    const data = 'WebSocket message payload';
    this._recordHistory(`WebSocket receive: ${connectionId}, ${data.length} bytes`);
    return { received: true, data, bytes: data.length, connectionId };
  }

  websocketClose(connectionId: string, code?: number, reason?: string): { closed: boolean; connectionId: string; code: number; reason: string } {
    const connection = this._websocketConnections.get(connectionId);
    if (!connection) {
      return { closed: false, connectionId, code: code ?? 1000, reason: reason ?? '' };
    }

    connection.state = 'closed';
    this._websocketConnections.delete(connectionId);
    this._recordHistory(`WebSocket close: ${connectionId}, code=${code ?? 1000}`);
    return { closed: true, connectionId, code: code ?? 1000, reason: reason ?? '' };
  }

  grpcCall(service: string, method: string, request: string, options?: { timeout?: number; metadata?: Record<string, string> }): { service: string; method: string; response: string; status: gRPCStatus; latency: number } {
    const latency = options?.timeout ?? Math.floor(Math.random() * 50) + 5;
    const status: gRPCStatus = { code: 0, message: 'OK' };

    this._recordHistory(`gRPC: ${service}/${method} (${latency}ms)`);
    return { service, method, response: 'response data', status, latency };
  }

  grpcStream(service: string, method: string, messages: string[]): { service: string; method: string; messagesSent: number; messagesReceived: number; status: gRPCStatus } {
    const status: gRPCStatus = { code: 0, message: 'OK' };
    this._recordHistory(`gRPC stream: ${service}/${method}, ${messages.length} messages`);
    return { service, method, messagesSent: messages.length, messagesReceived: messages.length, status };
  }

  grpcHealthCheck(service: string): { service: string; status: 'SERVING' | 'NOT_SERVING' | 'UNKNOWN'; timestamp: number } {
    const status = Math.random() > 0.05 ? 'SERVING' : 'NOT_SERVING';
    this._recordHistory(`gRPC health: ${service} -> ${status}`);
    return { service, status, timestamp: Date.now() };
  }

  graphqlQuery(schema: string, query: GraphQLQuery): GraphQLResponse {
    const errors: GraphQLResponse['errors'] = Math.random() > 0.9 ? [{ message: 'Query error' }] : undefined;
    const data = errors ? undefined : { result: 'success' };

    this._recordHistory(`GraphQL query: ${query.query.slice(0, 50)}...`);
    return { data, errors };
  }

  graphqlMutation(schema: string, mutation: GraphQLQuery): GraphQLResponse {
    const errors: GraphQLResponse['errors'] = Math.random() > 0.95 ? [{ message: 'Mutation error' }] : undefined;
    const data = errors ? undefined : { updated: true };

    this._recordHistory(`GraphQL mutation: ${mutation.query.slice(0, 50)}...`);
    return { data, errors };
  }

  graphqlSchema(schema: string): GraphQLSchema {
    const types = ['User', 'Post', 'Comment', 'Query', 'Mutation'];
    const queries = ['user', 'posts', 'comments'];
    const mutations = ['createUser', 'createPost', 'updatePost'];
    const subscriptions = ['postCreated'];

    this._recordHistory(`GraphQL schema loaded: ${schema}`);
    return { types, queries, mutations, subscriptions };
  }

  restApi(request: HTTPRequest): HTTPResponse {
    let status: HTTPStatus = 200;
    let body = '{}';

    switch (request.method) {
      case 'GET':
        body = JSON.stringify({ data: 'GET response' });
        break;
      case 'POST':
        body = JSON.stringify({ data: 'POST response', received: request.body });
        break;
      case 'PUT':
        body = JSON.stringify({ data: 'PUT response' });
        break;
      case 'DELETE':
        body = JSON.stringify({ deleted: true });
        break;
      default:
        status = 400;
        body = JSON.stringify({ error: 'Invalid method' });
    }

    const response = this.httpResponse(status, { 'Content-Type': 'application/json' }, body);
    this._recordHistory(`REST API: ${request.method} ${request.path} -> ${status}`);
    return response;
  }

  corsPreflight(request: HTTPRequest, config: CORSConfig): HTTPResponse {
    const headers: Record<string, string> = {
      'Access-Control-Allow-Origin': Array.isArray(config.origin) ? config.origin.join(', ') : config.origin,
      'Access-Control-Allow-Methods': config.methods.join(', '),
      'Access-Control-Allow-Headers': config.allowedHeaders.join(', '),
      'Access-Control-Max-Age': config.maxAge.toString(),
    };

    if (config.credentials) {
      headers['Access-Control-Allow-Credentials'] = 'true';
    }

    const response = this.httpResponse(204, headers, '');
    this._recordHistory(`CORS preflight: ${request.method} ${request.path}`);
    return response;
  }

  corsConfig(origin: string | string[], config: Partial<CORSConfig>): { saved: boolean; origin: string | string[] } {
    const key = Array.isArray(origin) ? origin.join(',') : origin;
    const corsConfig: CORSConfig = {
      origin,
      methods: config.methods ?? ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: config.allowedHeaders ?? ['Content-Type', 'Authorization'],
      exposedHeaders: config.exposedHeaders ?? [],
      credentials: config.credentials ?? false,
      maxAge: config.maxAge ?? 86400,
    };

    this._corsConfigs.set(key, corsConfig);
    this._recordHistory(`CORS config saved for ${key}`);
    return { saved: true, origin };
  }

  rateLimit(key: string, config: RateLimitConfig): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const entry = this._rateLimits.get(key);

    if (!entry || now > entry.resetTime) {
      this._rateLimits.set(key, { count: 1, resetTime: now + config.windowMs });
      return { allowed: true, remaining: config.requests - 1, resetTime: now + config.windowMs };
    }

    if (entry.count >= config.requests) {
      return { allowed: false, remaining: 0, resetTime: entry.resetTime };
    }

    entry.count++;
    return { allowed: true, remaining: config.requests - entry.count, resetTime: entry.resetTime };
  }

  setCookie(name: string, value: string, options?: Partial<Cookie>): Cookie {
    const cookie: Cookie = {
      name,
      value,
      domain: options?.domain,
      path: options?.path ?? '/',
      expires: options?.expires,
      maxAge: options?.maxAge,
      secure: options?.secure ?? false,
      httpOnly: options?.httpOnly ?? false,
      sameSite: options?.sameSite ?? 'lax',
    };

    const domain = options?.domain ?? 'example.com';
    if (!this._cookies.has(domain)) {
      this._cookies.set(domain, []);
    }
    this._cookies.get(domain)?.push(cookie);
    this._recordHistory(`Set-Cookie: ${name}=${value}`);
    return cookie;
  }

  getCookies(domain: string): Cookie[] {
    return this._cookies.get(domain) ?? [];
  }

  httpCompression(data: string, method: CompressionMethod): { compressed: string; originalSize: number; compressedSize: number; ratio: number; method: string } {
    const originalSize = data.length;
    const ratios: Record<CompressionMethod, number> = { gzip: 0.3, deflate: 0.35, br: 0.25, identity: 1 };
    const ratio = ratios[method];
    const compressedSize = Math.floor(originalSize * ratio);
    const compressed = data.slice(0, compressedSize);

    this._recordHistory(`HTTP compression: ${method}, ratio=${(ratio * 100).toFixed(0)}%`);
    return { compressed, originalSize, compressedSize, ratio, method };
  }

  httpCacheControl(url: string, headers: Record<string, string>): { cached: boolean; ttl: number; staleWhileRevalidate?: number; mustRevalidate: boolean } {
    const cacheControl = headers['cache-control'] ?? '';
    const cached = cacheControl.includes('public') || cacheControl.includes('private');
    const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
    const ttl = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : 0;
    const staleMatch = cacheControl.match(/stale-while-revalidate=(\d+)/);
    const mustRevalidate = cacheControl.includes('must-revalidate');

    this._recordHistory(`HTTP Cache-Control: ${url}, ttl=${ttl}`);
    return { cached, ttl, staleWhileRevalidate: staleMatch ? parseInt(staleMatch[1], 10) : undefined, mustRevalidate };
  }

  getWebSocketConnection(id: string): WebSocketConnection | null {
    return this._websocketConnections.get(id) ?? null;
  }

  getSSHSession(id: string): SSHSession | null {
    return this._sshSessions.get(id) ?? null;
  }

  cleanupInactiveConnections(): { websocketsCleaned: number; sshCleaned: number; http2Cleaned: number } {
    let websocketsCleaned = 0;
    let sshCleaned = 0;
    let http2Cleaned = 0;

    for (const [id, conn] of this._websocketConnections.entries()) {
      if (conn.state === 'closed') {
        this._websocketConnections.delete(id);
        websocketsCleaned++;
      }
    }

    for (const [id, session] of this._sshSessions.entries()) {
      if (session.state === 'disconnected') {
        this._sshSessions.delete(id);
        sshCleaned++;
      }
    }

    for (const [id, stream] of this._http2Streams.entries()) {
      if (stream.state === 'closed') {
        this._http2Streams.delete(id);
        http2Cleaned++;
      }
    }

    this._recordHistory(`cleanupInactiveConnections: ws=${websocketsCleaned}, ssh=${sshCleaned}, h2=${http2Cleaned}`);
    return { websocketsCleaned, sshCleaned, http2Cleaned };
  }

  toPacket(): DataPacket<{
    requests: number;
    responses: number;
    protocols: number;
    websockets: number;
    http2Streams: number;
    sshSessions: number;
    history: string[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['computer_network', 'application_layer', 'result'],
      priority: 0.7,
      phase: 'application',
    };

    return {
      id: `app-layer-${Date.now().toString(36)}-${this._counter}`,
      payload: {
        requests: this._requests.length,
        responses: this._responses.length,
        protocols: this._protocols.size,
        websockets: this._websocketConnections.size,
        http2Streams: this._http2Streams.size,
        sshSessions: this._sshSessions.size,
        history: [...this._history],
      },
      metadata,
    };
  }

  reset(): void {
    this._requests = [];
    this._responses = [];
    this._protocols.clear();
    this._websocketConnections.clear();
    this._http2Streams.clear();
    this._sshSessions.clear();
    this._corsConfigs.clear();
    this._rateLimits.clear();
    this._cookies.clear();
    this._history = [];
    this._counter = 0;
    this._streamId = 0;
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }
}