// ============================================
// FILE: src/services/WalletService.ts
// Credit wallet service (balance)
// ============================================

import AuthService, { API_BASE_URL } from './AuthService';

export interface WalletSummary {
  availableBalance: number;
  reservedBalance: number;
  lifetimePurchased: number;
  lifetimeBonus: number;
  lifetimeSpent: number;
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
}

const walletService = new WalletService();
export default walletService;
