import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AuthService, { API_BASE_URL } from '../services/AuthService';
import { COLORS, SPACING } from '../utils/constants';

interface Report {
  id: number;
  ticketNumber: string;
  incidentType: string;
  status: string;
  description: string;
  reporterName: string;
  reporterEmail: string;
  createdAt: string;
  updatedAt: string;
  responses?: { id: number; message: string; responderName: string; createdAt: string }[];
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  assigned: '#3b82f6',
  in_progress: '#8b5cf6',
  resolved: '#10b981',
  closed: '#6b7280',
};

const MyReportsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchReports = useCallback(async () => {
    try {
      const token = await AuthService.getToken();
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/api/reports/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setReports(Array.isArray(data) ? data : data.reports || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { fetchReports(); }, [fetchReports]));

  const onRefresh = () => { setRefreshing(true); fetchReports(); };

  const filtered = reports.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return r.ticketNumber?.toLowerCase().includes(q) || r.incidentType?.toLowerCase().includes(q);
  });

  const getStatusLabel = (status: string) => {
    return (status || 'pending').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Reports</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={COLORS.text.light} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by ticket or type..."
          placeholderTextColor={COLORS.text.light}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{reports.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#f59e0b15' }]}>
          <Text style={[styles.statValue, { color: '#f59e0b' }]}>
            {reports.filter((r) => r.status === 'pending').length}
          </Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#10b98115' }]}>
          <Text style={[styles.statValue, { color: '#10b981' }]}>
            {reports.filter((r) => r.status === 'resolved' || r.status === 'closed').length}
          </Text>
          <Text style={styles.statLabel}>Resolved</Text>
        </View>
      </View>

      {/* Reports List */}
      {filtered.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={48} color={COLORS.text.light} />
          <Text style={styles.emptyTitle}>No Reports Yet</Text>
          <Text style={styles.emptySubtitle}>Your submitted reports will appear here.</Text>
          <TouchableOpacity style={styles.reportBtn} onPress={() => navigation.navigate('CybercrimeReport')}>
            <Text style={styles.reportBtnText}>Report a Cybercrime</Text>
          </TouchableOpacity>
        </View>
      ) : (
        filtered.map((report) => (
          <View key={report.id} style={styles.reportCard}>
            <View style={styles.reportHeader}>
              <Text style={styles.ticketNumber}>{report.ticketNumber}</Text>
              <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[report.status] || '#f59e0b') + '20' }]}>
                <Text style={[styles.statusText, { color: STATUS_COLORS[report.status] || '#f59e0b' }]}>
                  {getStatusLabel(report.status)}
                </Text>
              </View>
            </View>
            <Text style={styles.reportType}>{report.incidentType}</Text>
            <Text style={styles.reportDesc} numberOfLines={2}>{report.description}</Text>
            <View style={styles.reportFooter}>
              <Text style={styles.reportDate}>
                {new Date(report.createdAt).toLocaleDateString()}
              </Text>
              {report.responses && report.responses.length > 0 && (
                <View style={styles.responseBadge}>
                  <Ionicons name="chatbubble" size={12} color={COLORS.primary} />
                  <Text style={styles.responseText}>{report.responses.length} response{report.responses.length !== 1 ? 's' : ''}</Text>
                </View>
              )}
            </View>

            {/* Show latest response */}
            {report.responses && report.responses.length > 0 && (
              <View style={styles.responseCard}>
                <Text style={styles.responseAuthor}>
                  {report.responses[report.responses.length - 1].responderName}
                </Text>
                <Text style={styles.responseMessage} numberOfLines={3}>
                  {report.responses[report.responses.length - 1].message}
                </Text>
              </View>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingTop: 50, paddingBottom: SPACING.md,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text.primary },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    borderRadius: 12, marginHorizontal: SPACING.md, paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: SPACING.md,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text.primary },
  statsRow: {
    flexDirection: 'row', paddingHorizontal: SPACING.md, marginBottom: SPACING.md, gap: 8,
  },
  statCard: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: 12, padding: 12, alignItems: 'center',
  },
  statValue: { fontSize: 20, fontWeight: '700', color: COLORS.text.primary },
  statLabel: { fontSize: 11, color: COLORS.text.secondary, marginTop: 2 },
  reportCard: {
    backgroundColor: COLORS.surface, borderRadius: 12, padding: SPACING.md,
    marginHorizontal: SPACING.md, marginBottom: 12,
  },
  reportHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  ticketNumber: { fontSize: 12, fontFamily: 'monospace', color: COLORS.text.secondary },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '600' },
  reportType: { fontSize: 16, fontWeight: '600', color: COLORS.text.primary, marginBottom: 4 },
  reportDesc: { fontSize: 13, color: COLORS.text.secondary, lineHeight: 18 },
  reportFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10,
    borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10,
  },
  reportDate: { fontSize: 12, color: COLORS.text.light },
  responseBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  responseText: { fontSize: 12, color: COLORS.primary, fontWeight: '500' },
  responseCard: {
    backgroundColor: COLORS.primary + '08', borderRadius: 8, padding: 10, marginTop: 10,
    borderLeftWidth: 3, borderLeftColor: COLORS.primary,
  },
  responseAuthor: { fontSize: 12, fontWeight: '600', color: COLORS.primary, marginBottom: 4 },
  responseMessage: { fontSize: 12, color: COLORS.text.secondary, lineHeight: 16 },
  emptyContainer: { alignItems: 'center', paddingTop: 60, paddingHorizontal: SPACING.lg },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text.primary, marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: COLORS.text.secondary, marginTop: 8, textAlign: 'center' },
  reportBtn: {
    marginTop: 20, backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10,
  },
  reportBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});

export default MyReportsScreen;
