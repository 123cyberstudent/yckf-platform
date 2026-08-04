import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AuthService, { API_BASE_URL } from '../services/AuthService';
import { COLORS, SPACING, CASE_STATUS_LABELS, API_ENDPOINTS } from '../utils/constants';

interface CaseResponse {
  id: number;
  message: string;
  isPublic: boolean;
  createdAt: string;
  author: {
    id: number;
    fullName: string;
    role: string;
  };
}

interface CaseData {
  id: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  report: {
    id: number;
    ticketNumber: string;
    incidentType: string;
    status: string;
    createdAt: string;
  };
  assignedInvestigator: {
    id: number;
    fullName: string;
  } | null;
  responses: CaseResponse[];
}

const STATUS_COLORS: Record<string, string> = {
  new: '#3b82f6',
  assigned: '#f59e0b',
  accepted: '#8b5cf6',
  in_progress: '#8b5cf6',
  resolved: '#10b981',
  closed: '#6b7280',
};

const STATUS_TIMELINE: Record<string, string[]> = {
  new: ['new'],
  assigned: ['new', 'assigned'],
  accepted: ['new', 'assigned', 'accepted'],
  in_progress: ['new', 'assigned', 'accepted', 'in_progress'],
  resolved: ['new', 'assigned', 'accepted', 'in_progress', 'resolved'],
  closed: ['new', 'assigned', 'accepted', 'in_progress', 'resolved', 'closed'],
};

const CaseTrackerScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [ticketNumber, setTicketNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [error, setError] = useState('');

  const fetchCase = useCallback(async (ticket?: string, isRefresh = false) => {
    const searchTicket = ticket || ticketNumber;
    if (!searchTicket.trim()) {
      Alert.alert('Error', 'Please enter a ticket number');
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');
    setCaseData(null);

    try {
      const token = await AuthService.getToken();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Try public lookup first (by ticket number)
      const res = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.TRACK_CASE}/${searchTicket.trim()}`,
        { headers }
      );

      if (res.ok) {
        const data = await res.json();
        setCaseData(data);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Case not found. Please check your ticket number.');
      }
    } catch (err) {
      setError('Network error. Please check your connection.');
    }

    setLoading(false);
    setRefreshing(false);
  }, [ticketNumber]);

  const handleSearch = () => {
    fetchCase();
  };

  const onRefresh = () => {
    if (caseData) {
      fetchCase(caseData.report.ticketNumber, true);
    }
  };

  const getStatusLabel = (status: string) => {
    return (status || 'new').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const renderTimelineStep = (label: string, key: string, isActive: boolean, isCompleted: boolean, isLast: boolean) => {
    const iconColor = isCompleted ? COLORS.primary : isActive ? COLORS.accent : '#d1d5db';
    const bgColor = isCompleted ? COLORS.primary : isActive ? COLORS.accent : '#d1d5db';
    const iconName = isCompleted ? 'checkmark-circle' : isActive ? 'time' : 'ellipse-outline';

    return (
      <View key={key} style={styles.timelineStep}>
        <View style={styles.timelineLeft}>
          <View style={[styles.timelineDot, { backgroundColor: bgColor + '20' }]}>
            <Ionicons name={iconName as any} size={20} color={iconColor} />
          </View>
          {!isLast && (
            <View style={[styles.timelineLine, { backgroundColor: isCompleted ? COLORS.primary + '40' : '#e5e7eb' }]} />
          )}
        </View>
        <View style={styles.timelineContent}>
          <Text style={[styles.timelineLabel, { color: isCompleted || isActive ? COLORS.text.primary : COLORS.text.light }]}>
            {label}
          </Text>
        </View>
      </View>
    );
  };

  const timelineSteps = ['New', 'Assigned', 'Accepted', 'In Progress', 'Resolved', 'Closed'];
  const timelineKeys = ['new', 'assigned', 'accepted', 'in_progress', 'resolved', 'closed'];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Track Your Case</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.content}>
          {/* Search Section */}
          <View style={styles.searchCard}>
            <Ionicons name="search-outline" size={20} color={COLORS.text.secondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Enter ticket (e.g. YCKF-CYB-20250715-000001)"
              placeholderTextColor={COLORS.text.light}
              value={ticketNumber}
              onChangeText={setTicketNumber}
              autoCapitalize="characters"
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {ticketNumber ? (
              <TouchableOpacity onPress={() => { setTicketNumber(''); setCaseData(null); setError(''); }}>
                <Ionicons name="close-circle" size={20} color={COLORS.text.light} />
              </TouchableOpacity>
            ) : null}
          </View>

          <TouchableOpacity
            style={[styles.searchBtn, (!ticketNumber.trim() || loading) && styles.searchBtnDisabled]}
            onPress={handleSearch}
            disabled={!ticketNumber.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="search" size={18} color="#fff" />
                <Text style={styles.searchBtnText}>Track Case</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Error */}
          {error ? (
            <View style={styles.errorCard}>
              <Ionicons name="alert-circle-outline" size={20} color={COLORS.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Case Details */}
          {caseData ? (
            <>
              {/* Ticket & Status */}
              <View style={styles.ticketCard}>
                <View style={styles.ticketHeader}>
                  <Text style={styles.ticketNumber}>{caseData.report.ticketNumber}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[caseData.status] || '#3b82f6') + '20' }]}>
                    <Text style={[styles.statusText, { color: STATUS_COLORS[caseData.status] || '#3b82f6' }]}>
                      {getStatusLabel(caseData.status)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.incidentType}>{caseData.report.incidentType}</Text>
                <View style={styles.dateRow}>
                  <Ionicons name="calendar-outline" size={14} color={COLORS.text.light} />
                  <Text style={styles.dateText}>Reported {new Date(caseData.report.createdAt).toLocaleDateString()}</Text>
                </View>
              </View>

              {/* Investigator */}
              {caseData.assignedInvestigator && (
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Assigned Investigator</Text>
                  <View style={styles.investigatorRow}>
                    <View style={styles.investigatorAvatar}>
                      <Ionicons name="person" size={20} color={COLORS.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.investigatorName}>{caseData.assignedInvestigator.fullName}</Text>
                    </View>
                    <View style={styles.activeDot} />
                  </View>
                </View>
              )}

              {/* Status Timeline */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Case Progress</Text>
                <View style={styles.timeline}>
                  {timelineSteps.map((step, index) => {
                    const key = timelineKeys[index];
                    const completedSteps = STATUS_TIMELINE[caseData.status] || ['new'];
                    const isCompleted = completedSteps.includes(key);
                    const currentStepIndex = timelineKeys.indexOf(caseData.status);
                    const isActive = index === currentStepIndex;
                    return renderTimelineStep(step, key, isActive, isCompleted, index === timelineSteps.length - 1);
                  })}
                </View>
              </View>

              {/* Updates / Responses */}
              {caseData.responses && caseData.responses.length > 0 && (
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Case Updates ({caseData.responses.length})</Text>
                  {caseData.responses
                    .filter((r) => r.isPublic)
                    .map((response) => (
                      <View key={response.id} style={styles.responseCard}>
                        <View style={styles.responseHeader}>
                          <View style={styles.responseAvatar}>
                            <Ionicons
                              name={response.author.role === 'ADMIN' ? 'shield-checkmark' : 'person'}
                              size={14}
                              color={response.author.role === 'ADMIN' ? COLORS.primary : COLORS.accent}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.responseAuthor}>{response.author.fullName}</Text>
                            <Text style={styles.responseRole}>{response.author.role}</Text>
                          </View>
                          <Text style={styles.responseDate}>
                            {new Date(response.createdAt).toLocaleDateString()}
                          </Text>
                        </View>
                        <Text style={styles.responseMessage}>{response.message}</Text>
                      </View>
                    ))}
                </View>
              )}

              {/* Info */}
              <View style={styles.infoCard}>
                <Ionicons name="information-circle" size={20} color={COLORS.primary} />
                <Text style={styles.infoText}>
                  Case updates are provided in real-time. Pull down to refresh the latest status.
                </Text>
              </View>
            </>
          ) : !loading && !error ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={48} color={COLORS.text.light} />
              <Text style={styles.emptyTitle}>Enter Your Ticket Number</Text>
              <Text style={styles.emptySubtitle}>
                Enter your YCKF ticket number above to check the status and progress of your report.
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: SPACING.lg, paddingBottom: 40 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingTop: 50, paddingBottom: SPACING.md,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text.primary },

  searchCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, marginTop: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text.primary, marginLeft: 8 },
  searchBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, marginTop: 12,
    gap: 8,
  },
  searchBtnDisabled: { opacity: 0.5 },
  searchBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  errorCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.error + '10',
    borderRadius: 12, padding: 12, marginTop: 12, gap: 8,
  },
  errorText: { flex: 1, fontSize: 13, color: COLORS.error },

  ticketCard: {
    backgroundColor: COLORS.surface, borderRadius: 12, padding: SPACING.md, marginTop: 16,
  },
  ticketHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  ticketNumber: { fontSize: 13, fontFamily: 'monospace', color: COLORS.text.secondary, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '700' },
  incidentType: { fontSize: 17, fontWeight: '600', color: COLORS.text.primary, marginBottom: 8 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateText: { fontSize: 12, color: COLORS.text.light },

  sectionCard: {
    backgroundColor: COLORS.surface, borderRadius: 12, padding: SPACING.md, marginTop: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text.primary, marginBottom: 12 },

  investigatorRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background,
    borderRadius: 10, padding: 12, gap: 12,
  },
  investigatorAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary + '15',
    justifyContent: 'center', alignItems: 'center',
  },
  investigatorName: { fontSize: 14, fontWeight: '600', color: COLORS.text.primary },
  activeDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#10b981' },

  timeline: { paddingLeft: 4 },
  timelineStep: { flexDirection: 'row', minHeight: 44 },
  timelineLeft: { alignItems: 'center', width: 28 },
  timelineDot: {
    width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center',
  },
  timelineLine: { width: 2, flex: 1, minHeight: 16 },
  timelineContent: { flex: 1, paddingLeft: 8, paddingBottom: 8 },
  timelineLabel: { fontSize: 14, fontWeight: '500', paddingTop: 3 },

  responseCard: {
    backgroundColor: COLORS.background, borderRadius: 10, padding: 12, marginBottom: 8,
    borderLeftWidth: 3, borderLeftColor: COLORS.primary,
  },
  responseHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  responseAvatar: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primary + '15',
    justifyContent: 'center', alignItems: 'center',
  },
  responseAuthor: { fontSize: 13, fontWeight: '600', color: COLORS.text.primary },
  responseRole: { fontSize: 11, color: COLORS.text.secondary },
  responseDate: { fontSize: 11, color: COLORS.text.light },
  responseMessage: { fontSize: 13, color: COLORS.text.secondary, lineHeight: 20 },

  infoCard: {
    flexDirection: 'row', backgroundColor: COLORS.primary + '10', borderRadius: 12,
    padding: 14, marginTop: 12, borderLeftWidth: 3, borderLeftColor: COLORS.primary, gap: 10,
  },
  infoText: { flex: 1, fontSize: 13, color: COLORS.text.secondary, lineHeight: 18 },

  emptyContainer: { alignItems: 'center', paddingTop: 60, paddingHorizontal: SPACING.lg },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: COLORS.text.primary, marginTop: 16 },
  emptySubtitle: { fontSize: 13, color: COLORS.text.secondary, marginTop: 8, textAlign: 'center', lineHeight: 18 },
});

export default CaseTrackerScreen;
