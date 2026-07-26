// ============================================
// FILE: src/screens/ResourcesScreen.tsx
// CMS-powered Resources screen
// ============================================

import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView, ActivityIndicator,
  TouchableOpacity, RefreshControl, Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ContentService, { ContentPage } from '../services/ContentService';
import { COLORS, SPACING } from '../utils/constants';

interface Download {
  title: string;
  format: string;
  description: string;
  url?: string;
}

interface Video {
  title: string;
  url: string;
  description?: string;
}

const ResourcesScreen: React.FC = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pageData, setPageData] = useState<ContentPage | null>(null);

  const loadData = async () => {
    const data = await ContentService.getPage('resources');
    setPageData(data);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { loadData(); }, []);
  const onRefresh = () => { setRefreshing(true); loadData(); };

  const content = pageData?.content as any;
  const hero = content?.hero || { title: 'Resources', subtitle: 'Free tools and guides for digital safety' };
  const downloads: Download[] = content?.downloads || [];
  const videos: Video[] = content?.videos || [];

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
        <Text style={styles.headerTitle}>Resources</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.heroTitle}>{hero.title}</Text>
        <Text style={styles.heroSubtitle}>{hero.subtitle}</Text>

        {downloads.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Downloads</Text>
            {downloads.map((item, i) => (
              <TouchableOpacity
                key={i}
                style={styles.resourceCard}
                onPress={() => item.url && Linking.openURL(item.url)}
                disabled={!item.url}
              >
                <Ionicons name="document-text" size={24} color={COLORS.primary} />
                <View style={styles.resourceInfo}>
                  <Text style={styles.resourceTitle}>{item.title}</Text>
                  <Text style={styles.resourceFormat}>{item.format}</Text>
                  <Text style={styles.resourceDesc}>{item.description}</Text>
                </View>
                {item.url && <Ionicons name="open-outline" size={18} color={COLORS.primary} />}
              </TouchableOpacity>
            ))}
          </>
        )}

        {videos.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Videos</Text>
            {videos.map((video, i) => (
              <TouchableOpacity
                key={i}
                style={styles.videoCard}
                onPress={() => Linking.openURL(video.url)}
              >
                <Ionicons name="play-circle" size={24} color="#fff" />
                <View style={styles.videoInfo}>
                  <Text style={styles.videoTitle}>{video.title}</Text>
                  {video.description && <Text style={styles.videoDesc}>{video.description}</Text>}
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        {downloads.length === 0 && videos.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="folder-open-outline" size={48} color={COLORS.text.secondary} />
            <Text style={styles.emptyText}>No resources available yet</Text>
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
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text.primary, marginBottom: SPACING.sm, marginTop: SPACING.md },
  resourceCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 12, padding: SPACING.md, marginBottom: SPACING.sm,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  resourceInfo: { flex: 1, marginLeft: SPACING.sm },
  resourceTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text.primary },
  resourceFormat: { fontSize: 12, color: COLORS.primary, fontWeight: '600', marginTop: 2 },
  resourceDesc: { fontSize: 13, color: COLORS.text.secondary, marginTop: 4 },
  videoCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary,
    borderRadius: 12, padding: SPACING.md, marginBottom: SPACING.sm,
  },
  videoInfo: { flex: 1, marginLeft: SPACING.sm },
  videoTitle: { fontSize: 15, fontWeight: '700', color: '#fff' },
  videoDesc: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: COLORS.text.secondary, marginTop: SPACING.sm },
});

export default ResourcesScreen;
