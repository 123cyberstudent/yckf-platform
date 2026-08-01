// ============================================
// FILE: src/services/CatalogService.ts
// Course + credit package catalogue
// ============================================

import { API_BASE_URL } from './AuthService';

export interface Course {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  level: string | null;
  duration: string | null;
  category: string | null;
  imageUrl: string | null;
  price: number;
  creditsPrice: number;
}

export interface CreditPackage {
  id: number;
  name: string;
  description: string | null;
  baseCredits: number;
  bonusCredits: number;
  totalCredits: number;
  price: number;
  featured: boolean;
  promotionLabel: string | null;
}

class CatalogService {
  async listCourses(): Promise<Course[]> {
    const res = await fetch(`${API_BASE_URL}/api/catalog/courses`);
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to load courses');
    }
    return data.courses as Course[];
  }

  async getCourse(slug: string): Promise<Course> {
    const res = await fetch(`${API_BASE_URL}/api/catalog/courses/${slug}`);
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Course not found');
    }
    return data.course as Course;
  }

  async listPackages(): Promise<CreditPackage[]> {
    const res = await fetch(`${API_BASE_URL}/api/catalog/packages`);
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to load credit packages');
    }
    return data.packages as CreditPackage[];
  }
}

const catalogService = new CatalogService();
export default catalogService;
