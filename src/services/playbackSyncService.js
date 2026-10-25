const CHANNEL_NAME = 'pulse-playback-sync';
const STATE_KEY = 'pulse_playback_state';
const DEVICE_KEY = 'pulse_playback_device_id';
const STALE_AFTER_MS = 15000;

function getDeviceId() {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return `${Date.now()}-${Math.random()}`;
  }
}

export class PlaybackSyncService {
  constructor() {
    this.userId = null;
    this.channel = null;
    this.listeners = new Set();
    this.deviceId = getDeviceId();
    this.isLeader = false;
    this.lastState = null;
    this.onStorage = (event) => {
      if (event.key === STATE_KEY && event.newValue) this.receive(event.newValue);
    };
    if (typeof window !== 'undefined') window.addEventListener('storage', this.onStorage);
    this.heartbeat = setInterval(() => this.refreshLeadership(), 3000);
  }

  connect(userId) {
    if (!userId || userId === this.userId) return;
    this.disconnect();
    this.userId = userId;
    this.isLeader = this.claimLeadership();
    this.channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(`${CHANNEL_NAME}:${userId}`) : null;
    if (this.channel) this.channel.onmessage = (event) => this.handleMessage(event.data);
    this.refreshLeadership();
  }

  disconnect() {
    this.channel?.close();
    this.channel = null;
    this.userId = null;
    this.isLeader = false;
  }

  get stateKey() {
    return `${STATE_KEY}:${this.userId || 'anonymous'}`;
  }

  claimLeadership() {
    if (typeof localStorage === 'undefined') return true;
    const now = Date.now();
    try {
      const current = JSON.parse(localStorage.getItem(this.stateKey) || 'null');
      if (current?.deviceId && current.deviceId !== this.deviceId && now - current.heartbeat < STALE_AFTER_MS) return false;
      localStorage.setItem(this.stateKey, JSON.stringify({ deviceId: this.deviceId, heartbeat: now }));
      return true;
    } catch {
      return true;
    }
  }

  becomeLeader() {
    this.isLeader = true;
    try { localStorage.setItem(this.stateKey, JSON.stringify({ deviceId: this.deviceId, heartbeat: Date.now() })); } catch {}
  }

  refreshLeadership() {
    if (!this.userId) return;
    this.isLeader = this.claimLeadership();
    if (this.isLeader && this.lastState) this.publish({ ...this.lastState, heartbeat: Date.now() });
  }

  publish(state) {
    if (!this.userId || !this.isLeader) return;
    const message = { ...state, userId: this.userId, deviceId: this.deviceId, heartbeat: Date.now(), sentAt: Date.now() };
    this.lastState = message;
    this.channel?.postMessage({ type: 'state', state: message });
    try { localStorage.setItem(this.stateKey, JSON.stringify(message)); } catch {}
  }

  request(command, payload = {}) {
    if (!this.userId || this.isLeader || !this.channel) return false;
    this.channel.postMessage({ type: 'command', command, payload, userId: this.userId, deviceId: this.deviceId });
    return true;
  }

  onMessage(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  handleMessage(message) {
    if (!message || message.userId !== this.userId || message.deviceId === this.deviceId) return;
    if (message.type === 'command') {
      if (this.isLeader) this.listeners.forEach((listener) => listener({ type: 'command', ...message }));
      return;
    }
    if (message.type === 'state') this.receive(message.state);
  }

  receive(raw) {
    try {
      const state = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (!state || state.userId !== this.userId || state.deviceId === this.deviceId) return;
      if (Date.now() - (state.sentAt || state.heartbeat || 0) > STALE_AFTER_MS) return;
      if (!this.isLeader) this.listeners.forEach((listener) => listener({ type: 'state', state }));
    } catch {}
  }
}

export const playbackSync = new PlaybackSyncService();
