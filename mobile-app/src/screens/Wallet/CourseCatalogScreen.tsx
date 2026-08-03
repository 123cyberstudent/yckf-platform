// ============================================
// FILE: src/screens/Wallet/CourseCatalogScreen.tsx
// Browse and purchase courses
// ============================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, LAYOUT } from '../../utils/constants';
import { formatMoney } from '../../utils/money';
import ScreenHeader from '../../components/common/ScreenHeader';
import CatalogService, { Course } from '../../services/CatalogService';
import { RootStackParamList } from '../../types';

const CourseCatalogScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (spinner = true) => {
    if (spinner) setIsLoading(true);
    try {
      const items = await CatalogService.listCourses();
      setCourses(items);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to load courses');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const buy = (course: Course) => {
    navigation.navigate('Checkout', {
      orderType: 'COURSE',
      productId: course.id,
      productName: course.title,
      price: course.price,
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScreenHeader title="Courses" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading courses...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Courses" subtitle="Cyber safety & skills training" />
      <FlatList
        data={courses}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(false)} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="school-outline" size={40} color={COLORS.text.light} />
            <Text style={styles.emptyTitle}>No courses available yet</Text>
            <Text style={styles.emptyText}>Check back soon — new cyber safety courses are being added.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.courseCard} onPress={() => buy(item)} activeOpacity={0.85}>
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.courseImage} resizeMode="cover" />
            ) : (
              <View style={[styles.courseImage, styles.courseImagePlaceholder]}>
                <Ionicons name="shield-checkmark" size={36} color={COLORS.primary} />
              </View>
            )}
            <View style={styles.courseBody}>
              <View style={styles.courseMeta}>
                {item.category ? <Text style={styles.metaText}>{item.category}</Text> : null}
                {item.level ? <Text style={styles.metaText}>• {item.level}</Text> : null}
                {item.duration ? <Text style={styles.metaText}>• {item.duration}</Text> : null}
              </View>
              <Text style={styles.courseTitle}>{item.title}</Text>
              {item.description ? (
                <Text style={styles.courseDesc} numberOfLines={2}>
                  {item.description}
                </Text>
              ) : null}
              <View style={styles.priceRow}>
                <Text style={styles.priceText}>{formatMoney(item.price)}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.lg,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginTop: SPACING.md,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
    lineHeight: 18,
  },
  courseCard: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.borderRadius.lg,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...LAYOUT.shadows.small,
  },
  courseImage: {
    width: '100%',
    height: 140,
  },
  courseImagePlaceholder: {
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  courseBody: {
    padding: SPACING.md,
  },
  courseMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },
  courseTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text.primary,
  },
  courseDesc: {
    fontSize: 13,
    color: COLORS.text.secondary,
    marginTop: 4,
    lineHeight: 18,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  priceText: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.primary,
  },
});

export default CourseCatalogScreen;
