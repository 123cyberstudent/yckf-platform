// ============================================
// FILE: src/services/WalletService.ts
// Credit wallet service (balance + ledger)
// ============================================

import AuthService, { API_BASE_URL } from './AuthService';

export interface WalletSummary {
  availableBalance: number;
  reservedBalance: number;
  lifetimePurchased: number;
  lifetimeBonus: number;
  lifetimeSpent: number;
}

export interface LedgerEntry {
  id: number;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string | null;
  createdAt: string;
}

export interface LedgerResponse {
  entries: LedgerEntry[];
  nextCursor: number | null;
}

class WalletService {
  private async headers(): Promise<Record<string, string>> {
    const token = await AuthService.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  async getWallet(): Promise<WalletSummary> {
    const res = await fetch(`${API_BASE_URL}/api/wallet`, { headers: await this.headers() });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to load wallet');
    }
    return data.wallet as WalletSummary;
  }

  async getLedger(limit = 50, cursor?: number): Promise<LedgerResponse> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set('cursor', String(cursor));
    const res = await fetch(`${API_BASE_URL}/api/wallet/ledger?${params.toString()}`, {
      headers: await this.headers(),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to load ledger');
    }
    return { entries: data.entries as LedgerEntry[], nextCursor: data.nextCursor ?? null };
  }
}

const walletService = new WalletService();
export default walletService;
