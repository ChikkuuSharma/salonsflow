export type SocketLifecycleState =
  | 'CONNECTING'
  | 'QR_READY'
  | 'PAIRING_PENDING'
  | 'CONNECTED'
  | 'DISCONNECTED';

export interface MediaPayload {
  mimetype: string;
  data: string; // Base64
  filename?: string;
  caption?: string;
}

export interface NormalizedMessage {
  id: string;
  from: string; // Phone number or JID
  to?: string;
  body: string;
  hasMedia: boolean;
  media?: MediaPayload;
  timestamp: number;
  isGroupMsg: boolean;
  author?: string;
  raw?: any;
}

export interface ProviderSessionStatus {
  status: SocketLifecycleState;
  qr?: string;
  pairingCode?: string;
  whatsappNumber?: string;
  lastDisconnectReason?: string;
}
