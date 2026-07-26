import React, { useState } from 'react';
import {View,Text,ScrollView,StyleSheet,Alert,KeyboardAvoidingView,Platform,} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Components
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import CaseStatusCard from '../components/case/CaseStatusCard';
import CaseUpdateItem from '../components/case/CaseUpdateItem';
import EmptyState from '../components/common/EmptyState';
// Utils
import {COLORS,SPACING,CASE_STATUS,CASE_STATUS_LABELS,} from '../utils/constants';
// Types
import { CaseInfo, CaseUpdate } from '../types';

const CaseTrackerScreen: React.FC = () => {
  const [caseCode, setCaseCode] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [caseInfo, setCaseInfo] = useState<CaseInfo | null>(null);

  // Mock function to simulate case tracking (Phase 1)
  const generateMockCaseData = (code: string): CaseInfo => {
    const mockUpdates: CaseUpdate[] = [
      {
        id: '1',
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        status: CASE_STATUS.RECEIVED,
        message: 'Your report has been received and logged into our system.',
        updatedBy: 'YCKF System',
      },
      {
        id: '2',
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        status: CASE_STATUS.UNDER_REVIEW,
        message: 'Case is under review by our cybersecurity team. Initial analysis in progress.',
        updatedBy: 'Review Team',
      },
      
      {
        id: '3',
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        status: CASE_STATUS.INVESTIGATING,
        message: 'Active investigation initiated. Relevant authorities have been notified.',
        updatedBy: 'Investigation Team',
      },
    ];

    return {
      caseId: code,
      status: CASE_STATUS.INVESTIGATING,
      title: 'Cybercrime Investigation',
      description: 'Your case is being actively investigated by our team.',
      dateReported: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      lastUpdated: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      volunteer: 'Officer John Smith',
      priority: 'medium',
      updates: mockUpdates,
    };
  };

  const handleSearch = () => {
    if (!caseCode.trim()) {
      Alert.alert('Error', 'Please enter a case ID');
      return;
    }

    setIsSearching(true);
    // Simulate API call delay
    setTimeout(() => {
      // For Phase 1, generate mock data for any case code
      const mockData = generateMockCaseData(caseCode.trim());
      setCaseInfo(mockData);
      setIsSearching(false);
    }, 1000);
  };

  const handleClearSearch = () => {
    setCaseCode('');
    setCaseInfo(null);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return COLORS.error;
      case 'high':
        return '#f97316';
      case 'medium':
        return COLORS.accent;
      case 'low':
        return COLORS.secondary;
      default:
        return COLORS.text.secondary;
    }
  };

  const getPriorityLabel = (priority: string) => {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Track Your Case</Text>
            <Text style={styles.subtitle}>
              Enter your case ID to track the status and progress of your cybercrime report
            </Text>
          </View>

          {/* Search Section */}
          <View style={styles.searchSection}>
            <Input
              label="Case ID"
              value={caseCode}
              onChangeText={setCaseCode}
              placeholder="Enter case ID (e.g., YCKF123456)"
              autoCapitalize="characters"
              testID="caseCode-input"
            />

            <Button
              title={isSearching ? 'Searching...' : 'Track Case'}
              onPress={handleSearch}
              disabled={!caseCode.trim() || isSearching}
              loading={isSearching}
              icon="search"
              fullWidth
              size="large"
            />

            {caseInfo && (
              <Button
                title="Clear Search"
                onPress={handleClearSearch}
                variant="outline"
                icon="close"
                fullWidth
                size="medium"
              />
            )}
          </View>

          {/* Case Information */}
          {caseInfo ? (
            <>
              {/* Status Card */}
              <CaseStatusCard
                status={caseInfo.status}
                statusLabel={CASE_STATUS_LABELS[caseInfo.status]}
                lastUpdated={caseInfo.lastUpdated}
              />

              {/* Case Details */}
              <View style={styles.detailsSection}>
                <Text style={styles.sectionTitle}>Case Details</Text>
                
                <View style={styles.detailsCard}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Case ID:</Text>
                    <Text style={styles.detailValue}>{caseInfo.caseId}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Date Reported:</Text>
                    <Text style={styles.detailValue}>
                      {caseInfo.dateReported.toLocaleDateString()}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Investigator:</Text>
                    <Text style={styles.detailValue}>{caseInfo.volunteer}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Priority:</Text>
                    <View style={[styles.priorityBadge, { backgroundColor: `${getPriorityColor(caseInfo.priority)}20` }]}>
                      <Text style={[styles.priorityText, { color: getPriorityColor(caseInfo.priority) }]}>
                        {getPriorityLabel(caseInfo.priority)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Case Updates Timeline */}
              <View style={styles.updatesSection}>
                <Text style={styles.sectionTitle}>Case Updates</Text>
                
                <View style={styles.timeline}>
                  {caseInfo.updates.map((update, index) => (
                    <CaseUpdateItem
                      key={update.id}
                      update={update}
                      isLast={index === caseInfo.updates.length - 1}
                    />
                  ))}
                </View>
              </View>

              {/* Info Card */}
              <View style={styles.infoCard}>
                <Ionicons name="information-circle" size={24} color={COLORS.primary} />
                <Text style={styles.infoText}>
                  Case updates are provided in real-time. You will receive notifications
                  when there are significant developments in your case.
                </Text>
              </View>
            </>
          ) : !isSearching && (
            <EmptyState
              icon="search-outline"
              title="No Case Selected"
              message="Enter a case ID above to track your cybercrime report status and updates."
            />
          )}

          {/* Footer Spacing */}
          <View style={styles.footer} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: SPACING.lg,
  },

  // Header
  header: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: SPACING.md,
  },

  // Search
  searchSection: {
    marginBottom: SPACING.xl,
    gap: SPACING.md,
  },

  // Details
  detailsSection: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  detailsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  detailLabel: {
    fontSize: 16,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 16,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  priorityBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Updates
  updatesSection: {
    marginBottom: SPACING.xl,
  },
  timeline: {
    paddingLeft: SPACING.md,
  },

  // Info Card
  infoCard: {
    flexDirection: 'row',
    backgroundColor: `${COLORS.primary}10`,
    borderRadius: 12,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
    marginLeft: SPACING.md,
  },

  // Footer
  footer: {
    height: SPACING.xl,
  },
});

export default CaseTrackerScreen;

