import { DataPacket, PacketMeta } from '../shared/types';

export type WiFiStandard = '802.11a' | '802.11b' | '802.11g' | '802.11n' | '802.11ac' | '802.11ax' | '802.11be';

export type WiFiBand = '2.4GHz' | '5GHz' | '6GHz';

export type WiFiSecurity = 'WEP' | 'WPA' | 'WPA2' | 'WPA2-Enterprise' | 'WPA3' | 'WPA3-SAE' | 'WPA3-Enterprise';

export type WiFiEncryption = 'TKIP' | 'AES-CCMP' | 'GCMP' | 'SAE';

export type BluetoothVersion = 'BT1.x' | 'BT2.x' | 'BT3.x' | 'BT4.x' | 'BT5.x' | 'BT6.x';

export type BluetoothProfile = 'A2DP' | 'AVRCP' | 'HFP' | 'HID' | 'OPP' | 'PBAP' | 'SPP' | 'GATT';

export type ZigbeeProfile = 'HA' | 'ZB3.0' | 'ZLL' | 'ZSE';

export type LoRaBand = 'EU868' | 'US915' | 'AS923' | 'AU915' | 'CN470';

export type MIMOType = 'SISO' | 'MIMO' | 'MU-MIMO' | 'SU-MIMO';

export type ChannelWidth = '20MHz' | '40MHz' | '80MHz' | '160MHz';

export interface WirelessNetworkInfo {
  readonly ssid: string;
  readonly bssid: string;
  readonly channel: number;
  readonly band: WiFiBand;
  readonly encryption: WiFiEncryption;
  readonly security: WiFiSecurity;
  readonly clients: number;
  readonly maxClients: number;
  readonly signalStrength: number;
  readonly noiseFloor: number;
  readonly throughput: number;
  readonly standard: WiFiStandard;
}

export interface WiFiProtocol {
  readonly standard: WiFiStandard;
  readonly frequency: WiFiBand;
  readonly maxSpeed: number;
  readonly range: number;
  readonly mimo: MIMOType;
  readonly channelWidth: ChannelWidth;
  readonly modulation: string;
}

export interface WiFiClient {
  readonly id: string;
  readonly mac: string;
  readonly ip: string;
  readonly hostname: string;
  readonly signalStrength: number;
  readonly rxRate: number;
  readonly txRate: number;
  readonly connectedAt: number;
  readonly activity: 'active' | 'idle' | 'inactive';
}

export interface WiFiAccessPoint {
  readonly id: string;
  readonly bssid: string;
  readonly ssid: string;
  readonly channel: number;
  readonly band: WiFiBand;
  readonly security: WiFiSecurity;
  readonly clients: WiFiClient[];
  readonly uptime: number;
  readonly firmwareVersion: string;
  readonly model: string;
}

export interface WiFiNetworkConfig {
  readonly ssid: string;
  readonly password: string;
  readonly security: WiFiSecurity;
  readonly channel: number;
  readonly band: WiFiBand;
  readonly channelWidth: ChannelWidth;
  readonly countryCode: string;
  readonly maxClients: number;
  readonly beaconInterval: number;
  readonly dtimPeriod: number;
}

export interface BluetoothDevice {
  readonly id: string;
  readonly name: string;
  readonly address: string;
  readonly version: BluetoothVersion;
  readonly rssi: number;
  readonly connected: boolean;
  readonly paired: boolean;
  readonly profiles: BluetoothProfile[];
}

export interface BluetoothConnection {
  readonly id: string;
  readonly deviceA: string;
  readonly deviceB: string;
  readonly profile: BluetoothProfile;
  readonly status: 'connecting' | 'connected' | 'disconnecting' | 'disconnected';
  readonly encryption: boolean;
  readonly linkKey?: string;
  readonly establishedAt: number;
}

export interface ZigbeeDevice {
  readonly id: string;
  readonly ieeeAddr: string;
  readonly networkAddr: number;
  readonly type: 'coordinator' | 'router' | 'end-device';
  readonly profile: ZigbeeProfile;
  readonly manufacturer: string;
  readonly model: string;
  readonly powerSource: 'mains' | 'battery';
  readonly lastSeen: number;
  readonly rssi: number;
}

export interface ZigbeeNetwork {
  readonly id: string;
  readonly panId: number;
  readonly channel: number;
  readonly coordinator: string;
  readonly devices: ZigbeeDevice[];
  readonly routers: number;
  readonly endDevices: number;
  readonly mesh: boolean;
}

export interface LoRaDevice {
  readonly id: string;
  readonly devEui: string;
  readonly appEui: string;
  readonly band: LoRaBand;
  readonly sf: number;
  readonly bw: number;
  readonly cr: string;
  readonly power: number;
  readonly lastSeen: number;
  readonly rssi: number;
  readonly snr: number;
}

export interface LoRaGateway {
  readonly id: string;
  readonly gatewayId: string;
  readonly band: LoRaBand;
  readonly location: { latitude: number; longitude: number };
  readonly connected: boolean;
  readonly devices: number;
  readonly packetsReceived: number;
  readonly packetsForwarded: number;
}

export interface LoRaWANNetwork {
  readonly id: string;
  readonly name: string;
  readonly band: LoRaBand;
  readonly gateways: LoRaGateway[];
  readonly devices: LoRaDevice[];
  readonly applications: number;
}

export interface MeshNetwork {
  readonly id: string;
  readonly name: string;
  readonly nodes: MeshNode[];
  readonly links: MeshLink[];
  readonly topology: 'mesh' | 'tree' | 'star';
}

export interface MeshNode {
  readonly id: string;
  readonly mac: string;
  readonly ip: string;
  readonly role: 'root' | 'node' | 'leaf';
  readonly neighbors: string[];
  readonly throughput: number;
  readonly latency: number;
  readonly status: 'online' | 'offline' | 'degraded';
}

export interface MeshLink {
  readonly from: string;
  readonly to: string;
  readonly signalStrength: number;
  readonly bandwidth: number;
  readonly latency: number;
  readonly status: 'up' | 'down' | 'degraded';
}

export interface WirelessSecurityEvent {
  readonly id: string;
  readonly type: 'deauthentication' | 'association_flood' | 'rogue_ap' | 'evil_twin' | 'kr00k' | 'krack';
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly source: string;
  readonly target: string;
  readonly timestamp: number;
  readonly count: number;
}

export interface WirelessStatistics {
  readonly totalPackets: number;
  readonly bytesTransmitted: number;
  readonly bytesReceived: number;
  readonly packetLoss: number;
  readonly averageLatency: number;
  readonly peakThroughput: number;
  readonly averageThroughput: number;
}

export class WirelessNetwork {
  private _networks: Map<string, WirelessNetworkInfo> = new Map();
  private _clients: Map<string, WiFiClient> = new Map();
  private _accessPoints: Map<string, WiFiAccessPoint> = new Map();
  private _bluetoothDevices: Map<string, BluetoothDevice> = new Map();
  private _bluetoothConnections: Map<string, BluetoothConnection> = new Map();
  private _zigbeeDevices: Map<string, ZigbeeDevice> = new Map();
  private _zigbeeNetworks: Map<string, ZigbeeNetwork> = new Map();
  private _loraDevices: Map<string, LoRaDevice> = new Map();
  private _loraGateways: Map<string, LoRaGateway> = new Map();
  private _securityEvents: WirelessSecurityEvent[] = [];
  private _statistics: WirelessStatistics = {
    totalPackets: 0,
    bytesTransmitted: 0,
    bytesReceived: 0,
    packetLoss: 0,
    averageLatency: 0,
    peakThroughput: 0,
    averageThroughput: 0,
  };
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

  get accessPointCount(): number {
    return this._accessPoints.size;
  }

  get bluetoothDeviceCount(): number {
    return this._bluetoothDevices.size;
  }

  get zigbeeDeviceCount(): number {
    return this._zigbeeDevices.size;
  }

  get loraDeviceCount(): number {
    return this._loraDevices.size;
  }

  get securityEventCount(): number {
    return this._securityEvents.length;
  }

  get statistics(): WirelessStatistics {
    return { ...this._statistics };
  }

  wifiSetup(config: WiFiNetworkConfig): { ssid: string; channel: number; band: string; security: string; active: boolean; bssid: string } {
    const bssid = this._generateMAC();

    const network: WirelessNetworkInfo = {
      ssid: config.ssid,
      bssid,
      channel: config.channel,
      band: config.band,
      encryption: config.security === 'WPA3' ? 'GCMP' : config.security === 'WPA2' ? 'AES-CCMP' : 'TKIP',
      security: config.security,
      clients: 0,
      maxClients: config.maxClients,
      signalStrength: -30,
      noiseFloor: -95,
      throughput: 0,
      standard: config.band === '6GHz' ? '802.11ax' : config.band === '5GHz' ? '802.11ac' : '802.11n',
    };

    this._networks.set(config.ssid, network);

    const ap: WiFiAccessPoint = {
      id: `ap-${++this._counter}`,
      bssid,
      ssid: config.ssid,
      channel: config.channel,
      band: config.band,
      security: config.security,
      clients: [],
      uptime: Date.now(),
      firmwareVersion: '1.0.0',
      model: 'Wireless AP Pro',
    };

    this._accessPoints.set(bssid, ap);
    this._recordHistory(`wifiSetup(ssid=${config.ssid}, band=${config.band}, sec=${config.security}, ch=${config.channel})`);
    return { ssid: config.ssid, channel: config.channel, band: config.band, security: config.security, active: true, bssid };
  }

  private _generateMAC(): string {
    const hex = '0123456789ABCDEF';
    let mac = '';
    for (let i = 0; i < 6; i++) {
      mac += hex[Math.floor(Math.random() * 16)];
      mac += hex[Math.floor(Math.random() * 16)];
      if (i < 5) mac += ':';
    }
    return mac;
  }

  wifiScan(interfaceName: string = 'wlan0'): { networks: WirelessNetworkInfo[]; count: number; strongest: WirelessNetworkInfo | null; interface: string } {
    const networks: WirelessNetworkInfo[] = [];
    const count = Math.floor(Math.random() * 15) + 5;

    for (let i = 0; i < count; i++) {
      const band: WiFiBand = Math.random() > 0.5 ? '5GHz' : '2.4GHz';
      const security: WiFiSecurity = Math.random() > 0.3 ? 'WPA2' : Math.random() > 0.5 ? 'WPA3' : 'WEP';
      const signal = -30 - Math.random() * 60;

      networks.push({
        ssid: `WiFi-${i + 1}`,
        bssid: this._generateMAC(),
        channel: Math.floor(Math.random() * 11) + 1,
        band,
        encryption: security === 'WPA2' ? 'AES-CCMP' : 'TKIP',
        security,
        clients: Math.floor(Math.random() * 20),
        maxClients: 100,
        signalStrength: signal,
        noiseFloor: -95,
        throughput: Math.random() * 300 + 50,
        standard: band === '5GHz' ? '802.11ac' : '802.11n',
      });
    }

    const strongest = networks.sort((a, b) => b.signalStrength - a.signalStrength)[0] ?? null;
    this._recordHistory(`wifiScan(iface=${interfaceName}) -> ${networks.length} networks`);
    return { networks, count: networks.length, strongest, interface: interfaceName };
  }

  wifiConnect(ssid: string, clientMac: string, clientIP: string, options?: { hostname?: string }): { ap: string; client: string; connected: boolean; signal: number; ip: string; hostname: string } {
    const network = this._networks.get(ssid);
    if (!network) {
      return { ap: ssid, client: clientMac, connected: false, signal: 0, ip: '', hostname: '' };
    }

    const signal = network.signalStrength - Math.random() * 20;
    const connected = signal > -80;

    if (connected) {
      const client: WiFiClient = {
        id: `client-${++this._counter}`,
        mac: clientMac,
        ip: clientIP,
        hostname: options?.hostname ?? `device-${this._counter}`,
        signalStrength: signal,
        rxRate: Math.random() * 400 + 50,
        txRate: Math.random() * 400 + 50,
        connectedAt: Date.now(),
        activity: 'active',
      };

      this._clients.set(clientMac, client);

      const ap = this._accessPoints.get(network.bssid);
      if (ap) {
        ap.clients.push(client);
      }

      this._networks.set(ssid, { ...network, clients: network.clients + 1 });
    }

    this._recordHistory(`wifiConnect(${clientMac} -> ${ssid}) -> ${connected}, signal=${signal.toFixed(0)}dBm`);
    return { ap: ssid, client: clientMac, connected, signal, ip: clientIP, hostname: options?.hostname ?? '' };
  }

  wifiDisconnect(clientMac: string): { disconnected: boolean; ssid?: string; client: string } {
    const client = this._clients.get(clientMac);
    if (!client) {
      return { disconnected: false, client: clientMac };
    }

    for (const [ssid, network] of this._networks.entries()) {
      if (network.clients > 0) {
        this._networks.set(ssid, { ...network, clients: network.clients - 1 });
        this._recordHistory(`wifiDisconnect(${clientMac} from ${ssid})`);
        return { disconnected: true, ssid, client: clientMac };
      }
    }

    this._clients.delete(clientMac);
    return { disconnected: true, client: clientMac };
  }

  wifiAuthentication(client: string, ap: string, method: WiFiSecurity): { client: string; ap: string; authenticated: boolean; method: string; algorithm: string } {
    const authenticated = method !== 'WEP';
    const algorithm = method === 'WPA3' ? 'SAE' : method === 'WPA2-Enterprise' ? 'EAP-TLS' : 'PSK';

    this._recordHistory(`wifiAuth(${client}@${ap}, method=${method}) -> ${authenticated}, algo=${algorithm}`);
    return { client, ap, authenticated, method, algorithm };
  }

  wifiRoam(clientMac: string, fromSSID: string, toSSID: string): { client: string; from: string; to: string; roamed: boolean; signalGain: number } {
    const fromNetwork = this._networks.get(fromSSID);
    const toNetwork = this._networks.get(toSSID);
    if (!fromNetwork || !toNetwork) {
      return { client: clientMac, from: fromSSID, to: toSSID, roamed: false, signalGain: 0 };
    }

    const signalGain = toNetwork.signalStrength - fromNetwork.signalStrength;
    const roamed = signalGain > 5;

    if (roamed) {
      this._networks.set(fromSSID, { ...fromNetwork, clients: fromNetwork.clients - 1 });
      this._networks.set(toSSID, { ...toNetwork, clients: toNetwork.clients + 1 });
    }

    this._recordHistory(`wifiRoam(${clientMac}): ${fromSSID} -> ${toSSID}, gain=${signalGain.toFixed(0)}dBm`);
    return { client: clientMac, from: fromSSID, to: toSSID, roamed, signalGain };
  }

  wifiQoS(ssid: string, clientMac: string, priority: 'high' | 'medium' | 'low'): { ssid: string; client: string; priority: string; applied: boolean } {
    this._recordHistory(`wifiQoS(${ssid}, ${clientMac}, priority=${priority})`);
    return { ssid, client: clientMac, priority, applied: true };
  }

  wifiBandSteering(ssid: string, clientMac: string, preferredBand: WiFiBand): { ssid: string; client: string; band: string; steered: boolean } {
    const network = this._networks.get(ssid);
    if (!network) {
      return { ssid, client: clientMac, band: preferredBand, steered: false };
    }

    const steered = network.band === preferredBand || Math.random() > 0.2;
    this._recordHistory(`wifiBandSteering(${ssid}, ${clientMac}) -> ${preferredBand}`);
    return { ssid, client: clientMac, band: preferredBand, steered };
  }

  wepSecurity(key: string, data: string): { encrypted: string; key: string; weak: boolean; algorithm: string; iv?: string } {
    const iv = Array.from({ length: 3 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('');
    this._recordHistory(`WEP(key len=${key.length}) -> weak security, IV=${iv}`);
    return { encrypted: btoa(data), key, weak: true, algorithm: 'RC4', iv };
  }

  wpaSecurity(passphrase: string, ssid: string, data: string): { encrypted: string; passphrase: string; secure: boolean; algorithm: string; psk: string } {
    const psk = this._derivePSK(passphrase, ssid);
    this._recordHistory(`WPA(ssid=${ssid}) -> secure, algorithm=TKIP/AES`);
    return { encrypted: btoa(data + psk), passphrase, secure: true, algorithm: 'TKIP/AES-CCMP', psk };
  }

  private _derivePSK(passphrase: string, ssid: string): string {
    let hash = passphrase + ssid;
    for (let i = 0; i < 4096; i++) {
      hash = hash.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0).toString(16);
    }
    return hash.slice(0, 64);
  }

  wpa2Enterprise(client: string, radius: string, eapMethod: string = 'PEAP'): { client: string; radius: string; authenticated: boolean; eap: string; tunnel: string } {
    const authenticated = Math.random() > 0.05;
    this._recordHistory(`WPA2-Enterprise(${client}, RADIUS=${radius}, EAP=${eapMethod})`);
    return { client, radius, authenticated, eap: eapMethod, tunnel: 'TTLS' };
  }

  wpa3Security(client: string, ap: string, method: 'SAE' | 'OWE'): { client: string; ap: string; secure: boolean; method: string; algorithm: string } {
    this._recordHistory(`WPA3(${client}@${ap}, method=${method})`);
    return { client, ap, secure: true, method, algorithm: method === 'SAE' ? 'ChaCha20-Poly1305' : 'GCMP' };
  }

  wpa3Sae(peerA: string, peerB: string): { peerA: string; peerB: string; handshake: boolean; secure: boolean; group: string } {
    const group = 'X25519';
    this._recordHistory(`WPA3-SAE(${peerA} <-> ${peerB}, group=${group})`);
    return { peerA, peerB, handshake: true, secure: true, group };
  }

  ofdma(users: string[], resources: number): { users: number; resources: number; efficiency: number; throughput: number; usersPerResource: number } {
    const efficiency = 0.8 + Math.random() * 0.15;
    const throughput = resources * 10;
    const usersPerResource = Math.floor(users.length / resources);

    this._recordHistory(`OFDMA(users=${users.length}, resources=${resources}) -> eff=${(efficiency * 100).toFixed(0)}%`);
    return { users: users.length, resources, efficiency, throughput, usersPerResource };
  }

  muMimo(ap: string, clients: string[]): { ap: string; clients: number; streams: number; gain: number; downlink: boolean; uplink: boolean } {
    const streams = Math.min(8, clients.length);
    const gain = streams * 0.8;
    this._recordHistory(`MU-MIMO(${ap}, clients=${clients.length}) -> streams=${streams}`);
    return { ap, clients: clients.length, streams, gain, downlink: true, uplink: true };
  }

  beamforming(ap: string, client: string, enabled: boolean): { ap: string; client: string; enabled: boolean; signalImprovement: number; type: 'explicit' | 'implicit' } {
    const signalImprovement = enabled ? 10 + Math.random() * 15 : 0;
    this._recordHistory(`beamforming(${ap} -> ${client}, enabled=${enabled}) -> +${signalImprovement.toFixed(0)}dBm`);
    return { ap, client, enabled, signalImprovement, type: 'explicit' };
  }

  bluetoothPairing(deviceA: string, deviceB: string, method: 'pin' | 'nfc' | 'just-works' | 'numeric-comparison'): { deviceA: string; deviceB: string; paired: boolean; method: string; keyType: string } {
    const paired = Math.random() > 0.1;
    const keyType = method === 'numeric-comparison' ? 'LE Secure Connections' : 'Legacy';
    this._recordHistory(`BT pairing(${deviceA} <-> ${deviceB}, method=${method}) -> ${paired}, key=${keyType}`);
    return { deviceA, deviceB, paired, method, keyType };
  }

  bluetoothConnect(deviceA: string, deviceB: string, profile: BluetoothProfile): BluetoothConnection {
    const connection: BluetoothConnection = {
      id: `bt-${++this._counter}`,
      deviceA,
      deviceB,
      profile,
      status: 'connected',
      encryption: profile === 'HFP' || profile === 'A2DP',
      establishedAt: Date.now(),
    };

    this._bluetoothConnections.set(connection.id, connection);
    this._recordHistory(`BT connect(${deviceA} <-> ${deviceB}, profile=${profile})`);
    return connection;
  }

  bluetoothDisconnect(connectionId: string): { disconnected: boolean; connectionId: string; profile?: string } {
    const connection = this._bluetoothConnections.get(connectionId);
    if (!connection) {
      return { disconnected: false, connectionId };
    }

    connection.status = 'disconnected';
    this._bluetoothConnections.delete(connectionId);
    this._recordHistory(`BT disconnect(${connectionId})`);
    return { disconnected: true, connectionId, profile: connection.profile };
  }

  bluetoothScan(timeout: number = 10): { devices: BluetoothDevice[]; count: number; timeout: number } {
    const devices: BluetoothDevice[] = [];
    const count = Math.floor(Math.random() * 8) + 2;

    for (let i = 0; i < count; i++) {
      const version: BluetoothVersion = ['BT4.x', 'BT5.x', 'BT6.x'][Math.floor(Math.random() * 3)];
      devices.push({
        id: `bt-${++this._counter}`,
        name: `Device-${i + 1}`,
        address: this._generateMAC(),
        version,
        rssi: -30 - Math.random() * 50,
        connected: false,
        paired: Math.random() > 0.5,
        profiles: ['A2DP', 'HFP', 'HID'].slice(0, Math.floor(Math.random() * 3) + 1),
      });
    }

    this._bluetoothDevices = new Map(devices.map(d => [d.id, d]));
    this._recordHistory(`BT scan(timeout=${timeout}s) -> ${devices.length} devices`);
    return { devices, count: devices.length, timeout };
  }

  bluetoothLEAdvertise(deviceId: string, serviceUuids: string[], name: string): { deviceId: string; serviceUuids: string[]; advertising: boolean; name: string } {
    const device = this._bluetoothDevices.get(deviceId);
    if (!device) {
      return { deviceId, serviceUuids, advertising: false, name };
    }

    this._recordHistory(`BT LE advertise(${deviceId}, services=${serviceUuids.length})`);
    return { deviceId, serviceUuids, advertising: true, name };
  }

  bluetoothLEConnect(deviceId: string, serviceUuid: string): { connected: boolean; deviceId: string; serviceUuid: string; mtu: number } {
    const mtu = 23 + Math.floor(Math.random() * 500);
    this._recordHistory(`BT LE connect(${deviceId}, service=${serviceUuid}, mtu=${mtu})`);
    return { connected: true, deviceId, serviceUuid, mtu };
  }

  zigbeeNetwork(coordinator: string, devices: { id: string; ieeeAddr: string; type: 'router' | 'end-device' }[]): ZigbeeNetwork {
    const panId = Math.floor(Math.random() * 0xFFFF);

    const zigbeeDevices: ZigbeeDevice[] = devices.map(d => ({
      id: d.id,
      ieeeAddr: d.ieeeAddr,
      networkAddr: Math.floor(Math.random() * 0xFFFE) + 1,
      type: d.type,
      profile: 'ZB3.0',
      manufacturer: 'Zigbee Corp',
      model: d.type === 'router' ? 'Router Pro' : 'Sensor Mini',
      powerSource: d.type === 'router' ? 'mains' : 'battery',
      lastSeen: Date.now(),
      rssi: -50 - Math.random() * 30,
    }));

    const network: ZigbeeNetwork = {
      id: `zigbee-${++this._counter}`,
      panId,
      channel: Math.floor(Math.random() * 16) + 11,
      coordinator,
      devices: zigbeeDevices,
      routers: devices.filter(d => d.type === 'router').length,
      endDevices: devices.filter(d => d.type === 'end-device').length,
      mesh: true,
    };

    this._zigbeeNetworks.set(network.id, network);
    zigbeeDevices.forEach(d => this._zigbeeDevices.set(d.id, d));
    this._recordHistory(`Zigbee(coordinator=${coordinator}, devices=${devices.length}, panId=0x${panId.toString(16)})`);
    return network;
  }

  zigbeeJoin(networkId: string, deviceId: string, ieeeAddr: string, type: 'router' | 'end-device'): { joined: boolean; networkId: string; deviceId: string; networkAddr: number } {
    const network = this._zigbeeNetworks.get(networkId);
    if (!network) {
      return { joined: false, networkId, deviceId, networkAddr: 0 };
    }

    const networkAddr = Math.floor(Math.random() * 0xFFFE) + 1;
    const device: ZigbeeDevice = {
      id: deviceId,
      ieeeAddr,
      networkAddr,
      type,
      profile: 'ZB3.0',
      manufacturer: 'Zigbee Corp',
      model: type === 'router' ? 'Router Pro' : 'Sensor Mini',
      powerSource: type === 'router' ? 'mains' : 'battery',
      lastSeen: Date.now(),
      rssi: -60 - Math.random() * 20,
    };

    network.devices.push(device);
    if (type === 'router') network.routers++;
    else network.endDevices++;

    this._zigbeeDevices.set(deviceId, device);
    this._recordHistory(`Zigbee join: ${deviceId} -> ${networkId}, addr=${networkAddr}`);
    return { joined: true, networkId, deviceId, networkAddr };
  }

  zigbeeLeave(networkId: string, deviceId: string): { left: boolean; networkId: string; deviceId: string; remainingDevices: number } {
    const network = this._zigbeeNetworks.get(networkId);
    if (!network) {
      return { left: false, networkId, deviceId, remainingDevices: 0 };
    }

    const idx = network.devices.findIndex(d => d.id === deviceId);
    if (idx >= 0) {
      const device = network.devices[idx];
      network.devices.splice(idx, 1);
      if (device.type === 'router') network.routers--;
      else network.endDevices--;
      this._zigbeeDevices.delete(deviceId);
    }

    this._recordHistory(`Zigbee leave: ${deviceId} from ${networkId}`);
    return { left: idx >= 0, networkId, deviceId, remainingDevices: network.devices.length };
  }

  zigbeeSend(networkId: string, source: string, destination: number, data: string): { sent: boolean; networkId: string; source: string; destination: number; bytes: number; hops: number } {
    const bytes = data.length;
    const hops = Math.floor(Math.random() * 3) + 1;
    this._recordHistory(`Zigbee send: ${source} -> 0x${destination.toString(16)}, ${bytes} bytes, ${hops} hops`);
    return { sent: true, networkId, source, destination, bytes, hops };
  }

  loraCommunication(endDevice: string, gateway: string, parameters: { sf: number; bw: number; cr: string; band: LoRaBand }): { range: number; dataRate: number; power: number; gateway: string; band: string; sf: number; bw: number } {
    const range = 15 - parameters.sf * 0.5;
    const dataRate = Math.pow(2, 12 - parameters.sf) * (parameters.bw / 125);
    const power = 14;

    this._recordHistory(`LoRa(${endDevice} -> ${gateway}, SF=${parameters.sf}, BW=${parameters.bw}kHz) -> range=${range.toFixed(1)}km`);
    return { range, dataRate, power, gateway, band: parameters.band, sf: parameters.sf, bw: parameters.bw };
  }

  loraRegisterDevice(deviceId: string, devEui: string, appEui: string, band: LoRaBand): { registered: boolean; deviceId: string; devEui: string; appEui: string; band: string; devAddr?: string } {
    const devAddr = `0x${Math.floor(Math.random() * 0xFFFFFFFF).toString(16).padStart(8, '0')}`;

    const device: LoRaDevice = {
      id: deviceId,
      devEui,
      appEui,
      band,
      sf: 9,
      bw: 125,
      cr: '4/5',
      power: 14,
      lastSeen: Date.now(),
      rssi: -100,
      snr: 5,
    };

    this._loraDevices.set(deviceId, device);
    this._recordHistory(`LoRa register: ${deviceId}, devEUI=${devEui}, band=${band}`);
    return { registered: true, deviceId, devEui, appEui, band, devAddr };
  }

  loraUplink(deviceId: string, gatewayId: string, data: string): { received: boolean; deviceId: string; gatewayId: string; bytes: number; rssi: number; snr: number; timestamp: number } {
    const device = this._loraDevices.get(deviceId);
    if (!device) {
      return { received: false, deviceId, gatewayId, bytes: 0, rssi: 0, snr: 0, timestamp: Date.now() };
    }

    const rssi = -110 + Math.random() * 20;
    const snr = -5 + Math.random() * 15;

    this._recordHistory(`LoRa uplink: ${deviceId} -> ${gatewayId}, ${data.length} bytes, RSSI=${rssi.toFixed(1)}, SNR=${snr.toFixed(1)}`);
    return { received: true, deviceId, gatewayId, bytes: data.length, rssi, snr, timestamp: Date.now() };
  }

  loraDownlink(deviceId: string, gatewayId: string, data: string): { sent: boolean; deviceId: string; gatewayId: string; bytes: number } {
    this._recordHistory(`LoRa downlink: ${gatewayId} -> ${deviceId}, ${data.length} bytes`);
    return { sent: true, deviceId, gatewayId, bytes: data.length };
  }

  meshNetworkCreate(name: string, nodes: { id: string; mac: string; ip: string }[]): MeshNetwork {
    const nodesList: MeshNode[] = nodes.map((n, i) => ({
      id: n.id,
      mac: n.mac,
      ip: n.ip,
      role: i === 0 ? 'root' : i < nodes.length - 2 ? 'node' : 'leaf',
      neighbors: nodes.filter((_, j) => j !== i && Math.abs(i - j) <= 2).map(nn => nn.id),
      throughput: Math.random() * 500 + 100,
      latency: Math.floor(Math.random() * 20) + 5,
      status: 'online',
    }));

    const links: MeshLink[] = [];
    for (let i = 0; i < nodes.length - 1; i++) {
      links.push({
        from: nodes[i].id,
        to: nodes[i + 1].id,
        signalStrength: -50 - Math.random() * 20,
        bandwidth: 500 + Math.random() * 500,
        latency: Math.floor(Math.random() * 10) + 2,
        status: 'up',
      });
    }

    const network: MeshNetwork = {
      id: `mesh-${++this._counter}`,
      name,
      nodes: nodesList,
      links,
      topology: 'mesh',
    };

    this._recordHistory(`Mesh network: ${name}, ${nodes.length} nodes, ${links.length} links`);
    return network;
  }

  detectRogueAP(ssid: string, bssid: string): { detected: boolean; ssid: string; bssid: string; type: 'rogue' | 'evil_twin' | 'legitimate'; confidence: number } {
    const isRogue = Math.random() > 0.7;
    const type = isRogue ? (Math.random() > 0.5 ? 'rogue' : 'evil_twin') : 'legitimate';
    const confidence = isRogue ? 0.8 + Math.random() * 0.2 : 0.9 + Math.random() * 0.1;

    if (isRogue) {
      this._securityEvents.push({
        id: `sec-${++this._counter}`,
        type: type === 'evil_twin' ? 'evil_twin' : 'rogue_ap',
        severity: type === 'evil_twin' ? 'critical' : 'high',
        source: bssid,
        target: ssid,
        timestamp: Date.now(),
        count: 1,
      });
    }

    this._recordHistory(`detectRogueAP(${ssid}, ${bssid}) -> ${type}, confidence=${(confidence * 100).toFixed(0)}%`);
    return { detected: isRogue, ssid, bssid, type, confidence };
  }

  detectDeauthenticationAttack(clientMac: string, threshold: number = 5): { detected: boolean; client: string; count: number; threshold: number; severity: string } {
    const count = Math.floor(Math.random() * 10);
    const detected = count >= threshold;
    const severity = detected ? (count > 10 ? 'critical' : 'high') : 'low';

    if (detected) {
      this._securityEvents.push({
        id: `sec-${++this._counter}`,
        type: 'deauthentication',
        severity: detected ? 'high' : 'low',
        source: 'unknown',
        target: clientMac,
        timestamp: Date.now(),
        count,
      });
    }

    this._recordHistory(`detectDeauth(${clientMac}) -> count=${count}, detected=${detected}`);
    return { detected, client: clientMac, count, threshold, severity };
  }

  getNetworkInfo(ssid: string): WirelessNetworkInfo | null {
    return this._networks.get(ssid) ?? null;
  }

  getClientInfo(clientMac: string): WiFiClient | null {
    return this._clients.get(clientMac) ?? null;
  }

  getAccessPoint(bssid: string): WiFiAccessPoint | null {
    return this._accessPoints.get(bssid) ?? null;
  }

  getSecurityEvents(limit: number = 10): WirelessSecurityEvent[] {
    return [...this._securityEvents].reverse().slice(0, limit);
  }

  updateStatistics(packets: number, bytesTx: number, bytesRx: number, latency: number, throughput: number): void {
    this._statistics.totalPackets += packets;
    this._statistics.bytesTransmitted += bytesTx;
    this._statistics.bytesReceived += bytesRx;
    this._statistics.averageLatency = (this._statistics.averageLatency + latency) / 2;
    this._statistics.peakThroughput = Math.max(this._statistics.peakThroughput, throughput);
    this._statistics.averageThroughput = (this._statistics.averageThroughput + throughput) / 2;
  }

  cleanupStaleDevices(): { wifiCleaned: number; bluetoothCleaned: number; zigbeeCleaned: number; loraCleaned: number } {
    let wifiCleaned = 0;
    let bluetoothCleaned = 0;
    let zigbeeCleaned = 0;
    let loraCleaned = 0;
    const now = Date.now();

    for (const [mac, client] of this._clients.entries()) {
      if (client.activity === 'inactive' || now - client.connectedAt > 3600000) {
        this._clients.delete(mac);
        wifiCleaned++;
      }
    }

    for (const [id, conn] of this._bluetoothConnections.entries()) {
      if (conn.status === 'disconnected') {
        this._bluetoothConnections.delete(id);
        bluetoothCleaned++;
      }
    }

    for (const [id, device] of this._zigbeeDevices.entries()) {
      if (now - device.lastSeen > 86400000) {
        this._zigbeeDevices.delete(id);
        zigbeeCleaned++;
      }
    }

    for (const [id, device] of this._loraDevices.entries()) {
      if (now - device.lastSeen > 86400000) {
        this._loraDevices.delete(id);
        loraCleaned++;
      }
    }

    this._recordHistory(`cleanupStaleDevices: wifi=${wifiCleaned}, bt=${bluetoothCleaned}, zigbee=${zigbeeCleaned}, lora=${loraCleaned}`);
    return { wifiCleaned, bluetoothCleaned, zigbeeCleaned, loraCleaned };
  }

  toPacket(): DataPacket<{
    networks: number;
    clients: number;
    accessPoints: number;
    bluetoothDevices: number;
    zigbeeDevices: number;
    loraDevices: number;
    securityEvents: number;
    statistics: WirelessStatistics;
    history: string[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['computer_network', 'wireless', 'result'],
      priority: 0.7,
      phase: 'connectivity',
    };

    return {
      id: `wireless-${Date.now().toString(36)}-${this._counter}`,
      payload: {
        networks: this._networks.size,
        clients: this._clients.size,
        accessPoints: this._accessPoints.size,
        bluetoothDevices: this._bluetoothDevices.size,
        zigbeeDevices: this._zigbeeDevices.size,
        loraDevices: this._loraDevices.size,
        securityEvents: this._securityEvents.length,
        statistics: this._statistics,
        history: [...this._history],
      },
      metadata,
    };
  }

  reset(): void {
    this._networks.clear();
    this._clients.clear();
    this._accessPoints.clear();
    this._bluetoothDevices.clear();
    this._bluetoothConnections.clear();
    this._zigbeeDevices.clear();
    this._zigbeeNetworks.clear();
    this._loraDevices.clear();
    this._loraGateways.clear();
    this._securityEvents = [];
    this._statistics = {
      totalPackets: 0,
      bytesTransmitted: 0,
      bytesReceived: 0,
      packetLoss: 0,
      averageLatency: 0,
      peakThroughput: 0,
      averageThroughput: 0,
    };
    this._history = [];
    this._counter = 0;
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }
}