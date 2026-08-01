// ============================================
// FILE: src/services/OrdersService.ts
// Order lifecycle: create, pay (credits/paystack), fetch
// ============================================

import AuthService, { API_BASE_URL } from './AuthService';

export type OrderType = 'COURSE' | 'CREDIT_PACKAGE';

export interface OrderItemSummary {
  productType: string;
  productId: number;
  productName: string;
  unitPrice: number;
  totalPrice: number;
}

export interface OrderSummary {
  id: number;
  orderNumber: string;
  orderType: string;
  status: string;
  subtotalAmount: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;
  createdAt: string;
  expiresAt: string | null;
  items: OrderItemSummary[];
  appliedCode: string | null;
  promotionLabel: string | null;
  bonusCredits: number;
}

export interface PaystackInit {
  provider: string;
  reference: string;
  authorizationUrl: string;
  accessCode: string | null;
}

export interface ApiError {
  status?: number;
  code?: string;
  error: string;
}

class OrdersService {
  private async headers(): Promise<Record<string, string>> {
    const token = await AuthService.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  private errorFrom(data: any, fallback: string): ApiError {
    return { code: data?.code, error: data?.error || fallback };
  }

  async createOrder(input: {
    orderType: OrderType;
    productId: number;
    promoCode?: string;
    payWithCredits?: boolean;
  }): Promise<OrderSummary> {
    const res = await fetch(`${API_BASE_URL}/api/orders`, {
      method: 'POST',
      headers: await this.headers(),
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw this.errorFrom(data, 'Failed to create order');
    }
    return data.order as OrderSummary;
  }

  async getOrder(orderNumber: string): Promise<OrderSummary> {
    const res = await fetch(`${API_BASE_URL}/api/orders/${orderNumber}`, {
      headers: await this.headers(),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw this.errorFrom(data, 'Failed to load order');
    }
    return data.order as OrderSummary;
  }

  async listOrders(limit = 50): Promise<OrderSummary[]> {
    const res = await fetch(`${API_BASE_URL}/api/orders?limit=${limit}`, {
      headers: await this.headers(),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw this.errorFrom(data, 'Failed to load orders');
    }
    return data.orders as OrderSummary[];
  }

  /** Pay an order using wallet credits. Returns the updated order. */
  async payWithCredits(orderNumber: string): Promise<OrderSummary> {
    const res = await fetch(`${API_BASE_URL}/api/orders/${orderNumber}/pay`, {
      method: 'POST',
      headers: await this.headers(),
      body: JSON.stringify({ method: 'credits' }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw this.errorFrom(data, 'Failed to pay with credits');
    }
    return data.order as OrderSummary;
  }

  /** Initialize a Paystack transaction. Returns the redirect authorization URL. */
  async payWithPaystack(orderNumber: string): Promise<{ order: OrderSummary; payment: PaystackInit }> {
    const res = await fetch(`${API_BASE_URL}/api/orders/${orderNumber}/pay`, {
      method: 'POST',
      headers: await this.headers(),
      body: JSON.stringify({ method: 'paystack' }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw this.errorFrom(data, 'Failed to initialize payment');
    }
    return { order: data.order as OrderSummary, payment: data.payment as PaystackInit };
  }

  async cancelOrder(orderNumber: string): Promise<OrderSummary> {
    const res = await fetch(`${API_BASE_URL}/api/orders/${orderNumber}/cancel`, {
      method: 'POST',
      headers: await this.headers(),
      body: JSON.stringify({}),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw this.errorFrom(data, 'Failed to cancel order');
    }
    return data.order as OrderSummary;
  }
}

const ordersService = new OrdersService();
export default ordersService;
