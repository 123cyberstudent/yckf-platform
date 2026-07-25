// ============================================
// FILE: src/screens/Admin/AdminDashboardScreen.tsx
// Complete Admin Dashboard with Coupon Management
// ============================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import SecureAdminService, { Coupon } from '../../services/SecureAdminService';
import { COLORS, SPACING } from '../../utils/constants';

const AdminDashboardScreen: React.FC = () => {
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Create coupon form state
  const [couponCode, setCouponCode] = useState('');
  const [description, setDescription] = useState('');
  const [maxRedemptions, setMaxRedemptions] = useState('');
  const [durationType, setDurationType] = useState<'12h' | '24h' | '12months'>('24h'); // ⭐ ADD THIS
  useEffect(() => {
    loadCoupons();
  }, []);

  const loadCoupons = async () => {
    try {
      setIsLoading(true);
      const fetchedCoupons = await SecureAdminService.getAllCoupons();
      setCoupons(fetchedCoupons);
    } catch (error) {
      console.error('Failed to load coupons:', error);
      Alert.alert('Error', 'Failed to load coupons');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadCoupons();
  };

  const generateRandomCode = () => {
    const code = SecureAdminService.generateCouponCode();
    setCouponCode(code);
  };

  const handleCreateCoupon = async () => {
    if (!couponCode.trim()) {
      Alert.alert('Error', 'Please enter a coupon code');
      return;
    }

    setIsLoading(true);
    try {
      const maxRedemptionsNum = maxRedemptions.trim()
        ? parseInt(maxRedemptions)
        : undefined;

      const result = await SecureAdminService.createCoupon(
        couponCode.toUpperCase(),
        description.trim() || undefined,
        undefined, // expiresAt
        durationType, // ⭐ ADD duration type
        maxRedemptionsNum
      );

      if (result.success) {
        Alert.alert(
          'Success! 🎉',
          `Coupon "${couponCode}" created successfully!`,
          [
            {
              text: 'OK',
              onPress: () => {
                setShowCreateModal(false);
                resetForm();
                loadCoupons();
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to create coupon');
      }
    } catch (error) {
      console.error('Create coupon error:', error);
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleCoupon = async (coupon: Coupon) => {
    Alert.alert(
      coupon.isActive ? 'Deactivate Coupon?' : 'Reactivate Coupon?',
      `Are you sure you want to ${coupon.isActive ? 'deactivate' : 'reactivate'} "${coupon.code}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: coupon.isActive ? 'Deactivate' : 'Reactivate',
          style: coupon.isActive ? 'destructive' : 'default',
          onPress: async () => {
            setIsLoading(true);
            try {
              const result = coupon.isActive
                ? await SecureAdminService.deactivateCoupon(coupon.code)
                : await SecureAdminService.reactivateCoupon(coupon.code);

              if (result.success) {
                Alert.alert('Success', `Coupon ${coupon.isActive ? 'deactivated' : 'reactivated'} successfully`);
                loadCoupons();
              } else {
                Alert.alert('Error', result.error || 'Operation failed');
              }
            } catch (error) {
              Alert.alert('Error', 'Something went wrong');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleDeleteCoupon = async (coupon: Coupon) => {
    Alert.alert(
      'Delete Coupon?',
      `This will permanently delete "${coupon.code}". This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              const result = await SecureAdminService.deleteCoupon(coupon.code);
              if (result.success) {
                Alert.alert('Deleted', 'Coupon deleted permanently');
                loadCoupons();
              } else {
                Alert.alert('Error', result.error || 'Failed to delete');
              }
            } catch (error) {
              Alert.alert('Error', 'Something went wrong');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setCouponCode('');
    setDescription('');
    setMaxRedemptions('');
    setDurationType('24h'); // ⭐ ADD THIS
  };

  const renderCouponCard = (coupon: Coupon) => (
    <View key={coupon.id} style={styles.couponCard}>
      <View style={styles.couponHeader}>
        <View style={styles.couponCodeContainer}>
          <Ionicons
            name="ticket"
            size={20}
            color={coupon.isActive ? COLORS.primary : '#999'}
          />
          <Text style={[
            styles.couponCode,
            !coupon.isActive && styles.couponCodeInactive
          ]}>
            {coupon.code}
          </Text>
        </View>
        <View style={[
          styles.statusBadge,
          coupon.isActive ? styles.statusBadgeActive : styles.statusBadgeInactive
        ]}>
          <Text style={[
            styles.statusText,
            coupon.isActive ? styles.statusTextActive : styles.statusTextInactive
          ]}>
            {coupon.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      {coupon.description && (
        <Text style={styles.couponDescription}>{coupon.description}</Text>
      )}

      <View style={styles.couponStats}>
        <View style={styles.statItem}>
          <Ionicons name="people" size={16} color="#666" />
          <Text style={styles.statText}>
            {coupon.currentRedemptions}{coupon.maxRedemptions ? `/${coupon.maxRedemptions}` : ''} used
          </Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="calendar" size={16} color="#666" />
          <Text style={styles.statText}>
            {new Date(coupon.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </View>

      {/* <TouchableOpacity
        style={[
          styles.toggleButton,
          coupon.isActive ? styles.toggleButtonDeactivate : styles.toggleButtonActivate
        ]}
        onPress={() => handleToggleCoupon(coupon)}
      > */}

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            { flex: 1 },
            coupon.isActive ? styles.toggleButtonDeactivate : styles.toggleButtonActivate
          ]}
          onPress={() => handleToggleCoupon(coupon)}
        >
          <Ionicons
            name={coupon.isActive ? 'close-circle' : 'checkmark-circle'}
            size={20}
            color="#fff"
          />
          <Text style={styles.toggleButtonText}>
            {coupon.isActive ? 'Deactivate' : 'Reactivate'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toggleButton, { backgroundColor: '#9E9E9E', paddingHorizontal: 16 }]}
          onPress={() => handleDeleteCoupon(coupon)}
        >
          <Ionicons name="trash" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
      </View>
  );

return (
  <SafeAreaView style={styles.container}>
    {/* Header */}
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Admin Dashboard</Text>
      <TouchableOpacity
        style={styles.refreshButton}
        onPress={onRefresh}
      >
        <Ionicons name="refresh" size={24} color={COLORS.primary} />
      </TouchableOpacity>
    </View>

    <ScrollView
      style={styles.scrollView}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Stats Card */}
      <View style={styles.statsCard}>
        <View style={styles.statBox}>
          <Ionicons name="ticket" size={32} color={COLORS.primary} />
          <Text style={styles.statNumber}>{coupons.length}</Text>
          <Text style={styles.statLabel}>Total Coupons</Text>
        </View>
        <View style={styles.statBox}>
          <Ionicons name="checkmark-circle" size={32} color="#4CAF50" />
          <Text style={styles.statNumber}>
            {coupons.filter(c => c.isActive).length}
          </Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statBox}>
          <Ionicons name="close-circle" size={32} color="#F44336" />
          <Text style={styles.statNumber}>
            {coupons.filter(c => !c.isActive).length}
          </Text>
          <Text style={styles.statLabel}>Inactive</Text>
        </View>
      </View>

      {/* Create Coupon Button */}
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => setShowCreateModal(true)}
      >
        <Ionicons name="add-circle" size={24} color="#fff" />
        <Text style={styles.createButtonText}>Create New Coupon</Text>
      </TouchableOpacity>

      {/* Coupons List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>All Coupons ({coupons.length})</Text>

        {isLoading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading coupons...</Text>
          </View>
        ) : coupons.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="ticket-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No coupons created yet</Text>
            <Text style={styles.emptySubtext}>Create your first coupon to get started</Text>
          </View>
        ) : (
          coupons.map(renderCouponCard)
        )}
      </View>
    </ScrollView>

    {/* Create Coupon Modal */}
    <Modal
      visible={showCreateModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowCreateModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create New Coupon</Text>
            <TouchableOpacity
              onPress={() => setShowCreateModal(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* Coupon Code */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Coupon Code *</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, styles.inputFlex]}
                  placeholder="YCKF-XXXXX-XXXXX"
                  value={couponCode}
                  onChangeText={setCouponCode}
                  autoCapitalize="characters"
                  maxLength={50}
                />
                <TouchableOpacity
                  style={styles.generateButton}
                  onPress={generateRandomCode}
                >
                  <Ionicons name="refresh" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="E.g., Premium access for event attendees"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* ⭐ ADD THIS ENTIRE SECTION */}
            {/* Duration Type */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Access Duration *</Text>
              <View style={styles.durationTypeContainer}>
                {[
                  { value: '12h', label: '12 Hours' },
                  { value: '24h', label: '24 Hours' },
                  { value: '12months', label: '12 Months' }
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.durationTypeOption,
                      durationType === option.value && styles.durationTypeSelected,
                    ]}
                    onPress={() => setDurationType(option.value as '12h' | '24h' | '12months')}
                  >
                    <Text
                      style={[
                        styles.durationTypeText,
                        durationType === option.value && styles.durationTypeTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            {/* ⭐ END OF NEW SECTION */}

            {/* Max Redemptions */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Max Uses (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Leave empty for unlimited"
                value={maxRedemptions}
                onChangeText={setMaxRedemptions}
                keyboardType="number-pad"
                maxLength={5}
              />
            </View>

            {/* Info Box */}
            {/* Info Box */}
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color={COLORS.primary} />
              <Text style={styles.infoText}>
                Users will automatically get the access duration you set here when they redeem the coupon
              </Text>
            </View>

            {/* Create Button */}
            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={handleCreateCoupon}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={24} color="#fff" />
                  <Text style={styles.submitButtonText}>Create Coupon</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  </SafeAreaView>
);
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    margin: SPACING.lg,
    borderRadius: 16,
    padding: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginTop: SPACING.sm,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginTop: 4,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginLeft: SPACING.sm,
  },
  section: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  loadingText: {
    marginTop: SPACING.md,
    color: COLORS.text.secondary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginTop: SPACING.md,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
  },
  couponCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  couponHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  couponCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  couponCode: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  couponCodeInactive: {
    color: '#999',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeActive: {
    backgroundColor: '#E8F5E9',
  },
  statusBadgeInactive: {
    backgroundColor: '#FFEBEE',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextActive: {
    color: '#4CAF50',
  },
  statusTextInactive: {
    color: '#F44336',
  },
  couponDescription: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: SPACING.sm,
  },
  couponStats: {
    flexDirection: 'row',
    gap: SPACING.lg,
    marginBottom: SPACING.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 13,
    color: '#666',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  toggleButtonDeactivate: {
    backgroundColor: '#F44336',
  },
  toggleButtonActivate: {
    backgroundColor: '#4CAF50',
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    padding: SPACING.lg,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  inputRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  input: {
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: 16,
    color: COLORS.text.primary,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  inputFlex: {
    flex: 1,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  generateButton: {
    backgroundColor: COLORS.primary,
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary + '10',
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text.secondary,
    lineHeight: 18,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  // ⭐ ADD THESE NEW STYLES
  durationTypeContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  durationTypeOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#F5F7FA',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E5E5',
  },
  durationTypeSelected: {
    backgroundColor: COLORS.primary + '15',
    borderColor: COLORS.primary,
  },
  durationTypeText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  durationTypeTextSelected: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});
export default AdminDashboardScreen;