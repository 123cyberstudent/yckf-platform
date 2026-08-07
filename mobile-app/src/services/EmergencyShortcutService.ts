// src/services/EmergencyShortcutService.ts
// Listens for native Android VOLUME_DOWN key events and turns a rapid
// multi-press into a trigger. Press-counting + cooldown logic lives in JS so
// the native side stays tiny. Requires a native (dev-client / APK) build that
// includes the withEmergencyShortcut config-plugin (does NOT work in Expo Go).

import { NativeModules, DeviceEventEmitter, Vibration } from 'react-native';
import type { EmitterSubscription } from 'react-native';

const EVENT = 'EmergencyShortcut';
const PRESS_WINDOW_MS = 1000; // presses counted within this window
const REQUIRED_PRESSES = 3; // triple-press to trigger
const TRIGGER_COOLDOWN_MS = 4000; // ignore presses for a bit after a trigger

export interface EmergencyShortcutSub {
  onTriggered: () => void;
  onCount?: (current: number, required: number) => void;
}

class EmergencyShortcutService {
  private subscription: EmitterSubscription | null = null;
  private presses: number[] = [];
  private lastTriggerAt = 0;
  private listeners: EmergencyShortcutSub[] = [];

  get available(): boolean {
    return Boolean((NativeModules as any).EmergencyShortcutModule);
  }

  private get bridge(): any {
    return (NativeModules as any).EmergencyShortcutModule;
  }

  private onNativePress() {
    const now = Date.now();

    if (now - this.lastTriggerAt < TRIGGER_COOLDOWN_MS) {
      this.presses = [];
      return;
    }

    this.presses = this.presses.filter((t) => now - t <= PRESS_WINDOW_MS);
    this.presses.push(now);

    if (this.presses.length >= REQUIRED_PRESSES) {
      this.fire();
    } else {
      // Haptic feedback per press so the user knows it's counting.
      Vibration.vibrate(25);
      this.emit((c) => c.onCount?.(this.presses.length, REQUIRED_PRESSES));
    }
  }

  private fire() {
    this.lastTriggerAt = Date.now();
    this.presses = [];
    Vibration.vibrate(300);
    this.emit((c) => c.onTriggered());
  }

  private emit(fn: (c: EmergencyShortcutSub) => void) {
    this.listeners.slice().forEach((c) => {
      try {
        fn(c);
      } catch (e) {
        console.warn('EmergencyShortcut listener error', e);
      }
    });
  }

  subscribe(cb: EmergencyShortcutSub): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((c) => c !== cb);
    };
  }

  start(): void {
    if (this.subscription) return;
    if (!this.available) {
      console.warn('EmergencyShortcutModule not present (non-native build or plugin missing).');
      return;
    }
    this.subscription = DeviceEventEmitter.addListener(EVENT, () => this.onNativePress());
    try {
      this.bridge?.enable?.();
    } catch (e) {
      console.warn('EmergencyShortcut enable failed', e);
    }
  }

  stop(): void {
    this.listeners = [];
    try {
      this.bridge?.disable?.();
    } catch (e) {
      // noop
    }
    this.subscription?.remove?.();
    this.subscription = null;
  }
}

export default new EmergencyShortcutService();