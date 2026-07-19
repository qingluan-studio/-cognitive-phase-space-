import { DataPacket } from '../shared/types';

export interface VRInput {
  device: string;
  hand: 'left' | 'right';
  buttons: Record<string, boolean>;
  trackpad: { x: number; y: number; pressed: boolean };
}

export interface VRSkeleton {
  bones: string[];
  rotations: [number, number, number, number][];
}

interface HandJoint {
  name: string;
  position: [number, number, number];
  rotation: [number, number, number, number];
}

interface Gesture {
  type: string;
  hand: 'left' | 'right';
  confidence: number;
  timestamp: number;
}

interface HapticEvent {
  hand: 'left' | 'right';
  amplitude: number;
  frequency: number;
  duration: number;
  timestamp: number;
}

interface LocomotionState {
  position: [number, number, number];
  rotation: [number, number, number];
  velocity: [number, number, number];
  mode: 'teleport' | 'smooth' | 'snap';
}

export class VRInteraction {
  private _inputs: Map<string, VRInput> = new Map();
  private _skeletons: Map<string, VRSkeleton> = new Map();
  private _gestures: Gesture[] = [];
  private _haptics: HapticEvent[] = [];
  private _counter = 0;
  private _locomotion: LocomotionState = {
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    velocity: [0, 0, 0],
    mode: 'smooth',
  };
  private _avatar = {
    present: false,
    model: '',
    trackingQuality: 0,
  };

  controllerInput(controller: string, button: string, state: boolean): { pressed: boolean; holdTime: number } {
    return {
      pressed: state,
      holdTime: state ? Math.random() * 2 : 0,
    };
  }

  handTracking(skeleton: VRSkeleton, joints: HandJoint[], confidence: number): { tracked: boolean; joints: HandJoint[]; confidence: number } {
    return {
      tracked: confidence > 0.5,
      joints,
      confidence,
    };
  }

  fingerTracking(finger: string, joint: string, position: [number, number, number]): { finger: string; joint: string; position: [number, number, number]; angle: number } {
    return {
      finger,
      joint,
      position: [...position] as [number, number, number],
      angle: Math.random() * 90,
    };
  }

  gestureRecognize(hand: 'left' | 'right', gesture: string): { recognized: boolean; confidence: number; gesture: string } {
    const confidence = Math.random() * 0.4 + 0.6;
    const recognized = confidence > 0.7;
    if (recognized) {
      this._gestures.push({
        type: gesture,
        hand,
        confidence,
        timestamp: Date.now(),
      });
      if (this._gestures.length > 100) this._gestures.shift();
    }
    return { recognized, confidence, gesture };
  }

  pinchGrip(hand: 'left' | 'right', object: string, strength: number): { gripping: boolean; strength: number; object: string } {
    const gripping = strength > 0.5;
    return {
      gripping,
      strength,
      object: gripping ? object : '',
    };
  }

  teleport(controller: string, target: [number, number, number], rotation: [number, number, number]): { position: [number, number, number]; rotation: [number, number, number]; instant: boolean } {
    this._locomotion.position = [...target] as [number, number, number];
    this._locomotion.rotation = [...rotation] as [number, number, number];
    this._locomotion.mode = 'teleport';
    return {
      position: [...target] as [number, number, number],
      rotation: [...rotation] as [number, number, number],
      instant: true,
    };
  }

  locomotion(controller: string, direction: [number, number, number], speed: number): { position: [number, number, number]; velocity: [number, number, number] } {
    const velocity = direction.map(d => d * speed) as [number, number, number];
    this._locomotion.velocity = velocity;
    this._locomotion.position = this._locomotion.position.map((p, i) => p + velocity[i] * 0.016) as [number, number, number];
    this._locomotion.mode = 'smooth';
    return {
      position: [...this._locomotion.position] as [number, number, number],
      velocity: [...velocity] as [number, number, number],
    };
  }

  grabInteraction(hand: 'left' | 'right', object: string, type: 'pinch' | 'palm' | 'fist'): { grabbed: boolean; type: string; object: string } {
    const grabbed = Math.random() > 0.3;
    return {
      grabbed,
      type,
      object: grabbed ? object : '',
    };
  }

  uiInteraction(canvas: string, element: string, action: string): { element: string; action: string; confirmed: boolean } {
    return {
      element,
      action,
      confirmed: Math.random() > 0.2,
    };
  }

  hapticFeedback(controller: string, amplitude: number, frequency: number, duration: number): HapticEvent {
    const event: HapticEvent = {
      hand: controller.includes('left') ? 'left' : 'right',
      amplitude,
      frequency,
      duration,
      timestamp: Date.now(),
    };
    this._haptics.push(event);
    if (this._haptics.length > 100) this._haptics.shift();
    return event;
  }

  bodyPresence(avatar: string, tracking: string, comfort: number): { present: boolean; avatar: string; comfort: number } {
    this._avatar.present = true;
    this._avatar.model = avatar;
    this._avatar.trackingQuality = comfort;
    return {
      present: true,
      avatar,
      comfort,
    };
  }

  avatarRender(skeleton: VRSkeleton, model: string, materials: string[]): { model: string; visible: boolean; quality: number } {
    const quality = Math.random() * 0.3 + 0.7;
    return {
      model,
      visible: true,
      quality,
    };
  }

  socialVR(users: string[], avatars: string[], space: string): { users: string[]; space: string; connected: boolean } {
    return {
      users,
      space,
      connected: true,
    };
  }

  get inputCount(): number {
    return this._inputs.size;
  }

  get skeletonCount(): number {
    return this._skeletons.size;
  }

  get gestureCount(): number {
    return this._gestures.length;
  }

  get locomotionState(): { position: [number, number, number]; rotation: [number, number, number]; mode: string } {
    return {
      position: [...this._locomotion.position] as [number, number, number],
      rotation: [...this._locomotion.rotation] as [number, number, number],
      mode: this._locomotion.mode,
    };
  }

  public toPacket(): DataPacket<{
    inputs: number;
    skeletons: number;
    gestures: number;
    haptics: number;
    locomotion: { position: [number, number, number]; rotation: [number, number, number]; mode: string };
    avatar: { present: boolean; model: string; trackingQuality: number };
  }> {
    return {
      id: `vr-interaction-${Date.now()}-${this._counter}`,
      payload: {
        inputs: this._inputs.size,
        skeletons: this._skeletons.size,
        gestures: this._gestures.length,
        haptics: this._haptics.length,
        locomotion: {
          position: [...this._locomotion.position] as [number, number, number],
          rotation: [...this._locomotion.rotation] as [number, number, number],
          mode: this._locomotion.mode,
        },
        avatar: { ...this._avatar },
      },
      metadata: {
        createdAt: Date.now(),
        route: ['ar_vr', 'vr_interaction', 'result'],
        priority: 0.9,
        phase: 'interaction',
      },
    };
  }

  public reset(): void {
    this._inputs.clear();
    this._skeletons.clear();
    this._gestures = [];
    this._haptics = [];
    this._counter = 0;
    this._locomotion = {
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      velocity: [0, 0, 0],
      mode: 'smooth',
    };
    this._avatar = {
      present: false,
      model: '',
      trackingQuality: 0,
    };
  }
}
