// ============================================
// FILE: src/screens/CoursesScreen.tsx
// CMS-powered Courses screen
// ============================================

import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView, ActivityIndicator,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ContentService, { ContentPage } from '../services/ContentService';
import { COLORS, SPACING } from '../utils/constants';

interface Course {
  title: string;
  description: string;
  level: string;
  duration: string;
  price: string;
}

const CoursesScreen: React.FC = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pageData, setPageData] = useState<ContentPage | null>(null);

  const loadData = async () => {
    const data = await ContentService.getPage('courses');
    setPageData(data);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { loadData(); }, []);
  const onRefresh = () => { setRefreshing(true); loadData(); };

  const content = pageData?.content as any;
  const hero = content?.hero || { title: 'Courses', subtitle: 'Professional certifications for all levels' };
  const courses: Course[] = content?.courses || [];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Courses</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.heroTitle}>{hero.title}</Text>
        <Text style={styles.heroSubtitle}>{hero.subtitle}</Text>

        {courses.length > 0 ? (
          courses.map((course, i) => (
            <View key={i} style={styles.courseCard}>
              <View style={styles.courseHeader}>
                <Text style={styles.courseTitle}>{course.title}</Text>
                <Text style={styles.coursePrice}>{course.price}</Text>
              </View>
              <View style={styles.courseMeta}>
                <Text style={styles.courseLevel}>{course.level}</Text>
                <Text style={styles.courseDuration}>{course.duration}</Text>
              </View>
              <Text style={styles.courseDesc}>{course.description}</Text>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="school-outline" size={48} color={COLORS.text.secondary} />
            <Text style={styles.emptyText}>No courses available yet</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.primary, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm + 4,
  },
  backBtn: { width: 40, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  content: { padding: SPACING.md, paddingBottom: 40 },
  heroTitle: { fontSize: 24, fontWeight: '800', color: COLORS.text.primary, marginBottom: 4 },
  heroSubtitle: { fontSize: 14, color: COLORS.text.secondary, marginBottom: SPACING.lg },
  courseCard: {
    backgroundColor: COLORS.primary, borderRadius: 16, padding: SPACING.md, marginBottom: SPACING.sm,
  },
  courseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  courseTitle: { fontSize: 17, fontWeight: '700', color: '#fff', flex: 1, marginRight: 8 },
  coursePrice: { fontSize: 15, fontWeight: '700', color: '#fff', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  courseMeta: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  courseLevel: { fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  courseDuration: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  courseDesc: { fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 18 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: COLORS.text.secondary, marginTop: SPACING.sm },
});

export default CoursesScreen;
