import { DataPacket } from '../shared/types';

export interface WirelessNetworkInfo {
  readonly ssid: string;
  readonly channel: number;
  readonly encryption: string;
  readonly clients: number;
}

export interface WiFiProtocol {
  readonly standard: string;
  readonly frequency: string;
  readonly maxSpeed: number;
  readonly range: number;
}

export class WirelessNetwork {
  private _networks: Map<string, WirelessNetworkInfo> = new Map();
  private _clients: Map<string, string> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get networkCount(): number {
    return this._networks.size;
  }

  get clientCount(): number {
    return this._clients.size;
  }

  get history(): string[] {
    return [...this._history];
  }

  public wifiSetup(ssid: string, password: string, encryption: string, channel: number): { ssid: string; channel: number; encryption: string; active: boolean } {
    this._networks.set(ssid, { ssid, channel, encryption, clients: 0 });
    this._recordHistory(`wifiSetup(ssid=${ssid}, enc=${encryption}, ch=${channel})`);
    return { ssid, channel, encryption, active: true };
  }

  public wifiScan(surroundings: string[]): { networks: string[]; count: number; strongest: string } {
    const networks = [...surroundings];
    const strongest = networks[0] ?? 'none';
    this._recordHistory(`wifiScan() -> ${networks.length} networks`);
    return { networks, count: networks.length, strongest };
  }

  public wifiConnect(ap: string, client: string): { ap: string; client: string; connected: boolean; signal: number } {
    const signal = -30 - Math.random() * 50;
    const connected = signal > -80;
    if (connected) {
      this._clients.set(client, ap);
      const net = this._networks.get(ap);
      if (net) {
        this._networks.set(ap, { ...net, clients: net.clients + 1 });
      }
    }
    this._recordHistory(`wifiConnect(${client} -> ${ap}) -> ${connected}, signal=${signal.toFixed(0)}dBm`);
    return { ap, client, connected, signal };
  }

  public wifiAuthentication(client: string, ap: string, method: string): { client: string; ap: string; authenticated: boolean; method: string } {
    const authenticated = Math.random() > 0.1;
    this._recordHistory(`wifiAuth(${client}@${ap}, method=${method}) -> ${authenticated}`);
    return { client, ap, authenticated, method };
  }

  public wepSecurity(key: string, data: string): { encrypted: string; key: string; weak: boolean } {
    this._recordHistory(`WEP(key len=${key.length}) -> weak security`);
    return { encrypted: btoa(data), key, weak: true };
  }

  public wpaSecurity(passphrase: string, ssid: string, data: string): { encrypted: string; passphrase: string; secure: boolean } {
    this._recordHistory(`WPA(ssid=${ssid}) -> secure`);
    return { encrypted: btoa(data + passphrase), passphrase, secure: true };
  }

  public wpa2Enterprise(client: string, radius: string): { client: string; radius: string; authenticated: boolean; eap: string } {
    const authenticated = Math.random() > 0.05;
    this._recordHistory(`WPA2-Enterprise(${client}, RADIUS=${radius})`);
    return { client, radius, authenticated, eap: 'PEAP' };
  }

  public wpa3Security(client: string, ap: string, method: string): { client: string; ap: string; secure: boolean; method: string } {
    this._recordHistory(`WPA3(${client}@${ap}, method=${method})`);
    return { client, ap, secure: true, method };
  }

  public wpa3Sae(peerA: string, peerB: string): { peerA: string; peerB: string; handshake: boolean; secure: boolean } {
    this._recordHistory(`WPA3-SAE(${peerA} <-> ${peerB})`);
    return { peerA, peerB, handshake: true, secure: true };
  }

  public ofdma(users: string[], resources: number): { users: number; resources: number; efficiency: number; throughput: number } {
    const efficiency = 0.8 + Math.random() * 0.15;
    const throughput = resources * 10;
    this._recordHistory(`OFDMA(users=${users.length}, resources=${resources}) -> eff=${(efficiency * 100).toFixed(0)}%`);
    return { users: users.length, resources, efficiency, throughput };
  }

  public muMimo(ap: string, clients: string[]): { ap: string; clients: number; streams: number; gain: number } {
    const streams = Math.min(8, clients.length);
    const gain = streams * 0.8;
    this._recordHistory(`MU-MIMO(${ap}, clients=${clients.length}) -> streams=${streams}`);
    return { ap, clients: clients.length, streams, gain };
  }

  public bluetoothPairing(deviceA: string, deviceB: string, method: string): { deviceA: string; deviceB: string; paired: boolean; method: string } {
    const paired = Math.random() > 0.1;
    this._recordHistory(`BT pairing(${deviceA} <-> ${deviceB}, method=${method}) -> ${paired}`);
    return { deviceA, deviceB, paired, method };
  }

  public zigbeeNetwork(coordinator: string, devices: string[]): { coordinator: string; devices: number; mesh: boolean; panId: string } {
    this._recordHistory(`Zigbee(coordinator=${coordinator}, devices=${devices.length})`);
    return { coordinator, devices: devices.length, mesh: true, panId: '0xABCD' };
  }

  public loraCommunication(endDevice: string, gateway: string, parameters: { sf: number; bw: number; cr: string }): { range: number; dataRate: number; power: number } {
    const range = 15 - parameters.sf * 0.5;
    const dataRate = Math.pow(2, 12 - parameters.sf) * 0.1;
    const power = 14;
    this._recordHistory(`LoRa(${endDevice} -> ${gateway}, SF=${parameters.sf}) -> range=${range.toFixed(1)}km`);
    return { range, dataRate, power };
  }

  public toPacket(): DataPacket<{
    networks: number;
    clients: number;
    history: string[];
  }> {
    return {
      id: `wireless-${Date.now()}-${this._counter}`,
      payload: {
        networks: this._networks.size,
        clients: this._clients.size,
        history: [...this._history],
      },
      metadata: {
        createdAt: Date.now(),
        route: ['computer_network', 'wireless', 'result'],
        priority: 0.7,
        phase: 'connectivity',
      },
    };
  }

  public reset(): void {
    this._networks.clear();
    this._clients.clear();
    this._history = [];
    this._counter = 0;
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }
}
