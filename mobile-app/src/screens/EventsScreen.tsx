// ============================================
// FILE: src/screens/EventsScreen.tsx
// CMS-powered Events screen
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

interface Event {
  title: string;
  description: string;
  date: string;
  format: string;
  location?: string;
}

const EventsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pageData, setPageData] = useState<ContentPage | null>(null);

  const loadData = async () => {
    const data = await ContentService.getPage('events');
    setPageData(data);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { loadData(); }, []);
  const onRefresh = () => { setRefreshing(true); loadData(); };

  const content = pageData?.content as any;
  const hero = content?.hero || { title: 'Events', subtitle: 'Join our cybersecurity community' };
  const upcoming: Event[] = content?.upcomingEvents || [];
  const past: Event[] = content?.pastEvents || [];

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
        <Text style={styles.headerTitle}>Events</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.heroTitle}>{hero.title}</Text>
        <Text style={styles.heroSubtitle}>{hero.subtitle}</Text>

        {upcoming.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Upcoming Events</Text>
            {upcoming.map((event, i) => (
              <View key={i} style={styles.eventCard}>
                <Text style={styles.eventTitle}>{event.title}</Text>
                <Text style={styles.eventDate}>{event.date}</Text>
                <Text style={styles.eventDetail}>{event.format}{event.location ? ` • ${event.location}` : ''}</Text>
                <Text style={styles.eventDesc}>{event.description}</Text>
              </View>
            ))}
          </>
        )}

        {past.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Past Events</Text>
            {past.map((event, i) => (
              <View key={i} style={[styles.eventCard, styles.eventCardPast]}>
                <Text style={styles.eventTitle}>{event.title}</Text>
                <Text style={styles.eventDate}>{event.date}</Text>
                <Text style={styles.eventDetail}>{event.format}{event.location ? ` • ${event.location}` : ''}</Text>
              </View>
            ))}
          </>
        )}

        {upcoming.length === 0 && past.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color={COLORS.text.secondary} />
            <Text style={styles.emptyText}>No events scheduled yet</Text>
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
  eventCard: {
    backgroundColor: COLORS.primary, borderRadius: 16, padding: SPACING.md, marginBottom: SPACING.sm,
  },
  eventCardPast: { opacity: 0.6 },
  eventTitle: { fontSize: 17, fontWeight: '700', color: '#fff', marginBottom: 4 },
  eventDate: { fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: '600', marginBottom: 4 },
  eventDetail: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 6 },
  eventDesc: { fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 18 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: COLORS.text.secondary, marginTop: SPACING.sm },
});

export default EventsScreen;
