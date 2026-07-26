// ============================================
// FILE: src/screens/NewsScreen.tsx
// CMS-powered News screen
// ============================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ContentService, { ContentPage } from '../services/ContentService';
import { COLORS, SPACING } from '../utils/constants';

interface Article {
  title: string;
  excerpt: string;
  date: string;
  category: string;
  author?: string;
}

const NewsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pageData, setPageData] = useState<ContentPage | null>(null);

  const loadData = async () => {
    const data = await ContentService.getPage('news');
    setPageData(data);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { loadData(); }, []);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const content = pageData?.content as any;
  const hero = content?.hero || { title: 'Latest News', subtitle: 'Stay updated with YCKF' };
  const featured: Article | null = content?.featured || null;
  const articles: Article[] = content?.articles || [];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>News</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.heroTitle}>{hero.title}</Text>
        <Text style={styles.heroSubtitle}>{hero.subtitle}</Text>

        {featured && (
          <View style={styles.featuredCard}>
            <View style={styles.featuredBadge}>
              <Text style={styles.featuredBadgeText}>Featured</Text>
            </View>
            <Text style={styles.featuredTitle}>{featured.title}</Text>
            <Text style={styles.featuredExcerpt}>{featured.excerpt}</Text>
            <Text style={styles.meta}>{featured.date} • {featured.category}</Text>
          </View>
        )}

        {articles.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>All Articles</Text>
            {articles.map((article, i) => (
              <View key={i} style={styles.articleCard}>
                <Text style={styles.articleTitle}>{article.title}</Text>
                <Text style={styles.articleExcerpt}>{article.excerpt}</Text>
                <Text style={styles.meta}>{article.date} • {article.category}</Text>
              </View>
            ))}
          </>
        )}

        {!featured && articles.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="newspaper-outline" size={48} color={COLORS.text.secondary} />
            <Text style={styles.emptyText}>No news articles yet</Text>
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
  featuredCard: {
    backgroundColor: COLORS.primary, borderRadius: 16, padding: SPACING.md, marginBottom: SPACING.lg,
  },
  featuredBadge: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginBottom: SPACING.sm,
  },
  featuredBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  featuredTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 8 },
  featuredExcerpt: { fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 20, marginBottom: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text.primary, marginBottom: SPACING.sm },
  articleCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: SPACING.md, marginBottom: SPACING.sm,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  articleTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text.primary, marginBottom: 4 },
  articleExcerpt: { fontSize: 13, color: COLORS.text.secondary, lineHeight: 18, marginBottom: 8 },
  meta: { fontSize: 12, color: COLORS.primary, fontWeight: '500' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: COLORS.text.secondary, marginTop: SPACING.sm },
});

export default NewsScreen;
