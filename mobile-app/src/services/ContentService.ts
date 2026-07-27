// ============================================
// FILE: src/services/ContentService.ts
// CMS Content Service - Fetches from backend /api/content
// ============================================

import AuthService, { API_BASE_URL } from './AuthService';

export interface ContentPage {
  id: number;
  slug: string;
  title: string;
  content: any;
  updatedAt: string;
}

class ContentService {
  async getPage(slug: string): Promise<ContentPage | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/content/${slug}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error(`Failed to fetch content page "${slug}":`, error);
      return null;
    }
  }

  async getAllPages(): Promise<ContentPage[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/content`);
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch content pages:', error);
      return [];
    }
  }

  async updatePage(slug: string, title: string, content: any): Promise<boolean> {
    try {
      const token = await AuthService.getToken();
      if (!token) return false;
      const response = await fetch(`${API_BASE_URL}/api/content/${slug}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, content }),
      });
      return response.ok;
    } catch (error) {
      console.error(`Failed to update content page "${slug}":`, error);
      return false;
    }
  }
}

export default new ContentService();
