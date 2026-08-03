// ============================================
// FILE: src/services/CatalogService.ts
// Course catalogue
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
}

const catalogService = new CatalogService();
export default catalogService;
