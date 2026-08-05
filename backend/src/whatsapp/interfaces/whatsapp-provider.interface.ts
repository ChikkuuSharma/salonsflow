import { NormalizedMessage, SocketLifecycleState, MediaPayload, ProviderSessionStatus } from './whatsapp-types';

export const WHATSAPP_PROVIDER_TOKEN = 'WHATSAPP_PROVIDER_TOKEN';

export interface IWhatsappProvider {
  initializeSession(salonId: string, forceFresh?: boolean): Promise<void>;
  getQrCode(salonId: string, forceFresh?: boolean): Promise<{ status: SocketLifecycleState; qr?: string }>;
  getPairingCode?(salonId: string, phoneNumber: string): Promise<{ code?: string; error?: string }>;
  sendMessage(salonId: string, to: string, content: string | MediaPayload): Promise<{ success: boolean; messageId?: string; error?: string }>;
  disconnectSession(salonId: string): Promise<void>;
  getSessionStatus(salonId: string): Promise<ProviderSessionStatus>;
  onMessageReceived(handler: (salonId: string, message: NormalizedMessage) => Promise<void>): void;
  onStatusChanged(handler: (salonId: string, status: SocketLifecycleState, metadata?: any) => void): void;
}
