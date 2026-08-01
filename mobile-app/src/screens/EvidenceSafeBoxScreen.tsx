import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Components
import Button from '../components/common/Button';
import EvidenceItemCard from '../components/evidence/EvidenceItemCard';
import EmptyState from '../components/common/EmptyState';

// Services
import EmailService from '../services/EmailService';
import WhatsAppService from '../services/WhatsAppService';

// Contexts
import { useStorage } from '../contexts/StorageContext';
import { useApp } from '../contexts/AppContext';

// Utils
import { COLORS, SPACING, TYPOGRAPHY } from '../utils/constants';

// Types
import { EvidenceItem } from '../types';

const EvidenceSafeBoxScreen: React.FC = () => {
  const navigation = useNavigation();

  // Contexts
  const storage = useStorage();
  const app = useApp();

  // Defensive: if context is partially implemented, pick what we need
  const safeBoxData = storage?.safeBoxData ?? null;
  const loadSafeBoxData = storage?.loadSafeBoxData ?? (async () => {});
  const removeEvidenceItem = storage?.removeEvidenceItem ?? (async (_id: string) => false);
  const clearSafeBox = storage?.clearSafeBox ?? (async () => false);
  const storageIsLoading = storage?.isLoading ?? false;

  const isAppOnline = app?.state?.isOnline ?? true;

  const [refreshing, setRefreshing] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [actionLoadingIds, setActionLoadingIds] = useState<Record<string, boolean>>({});
  const [globalLoading, setGlobalLoading] = useState(false);

  // Load on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setGlobalLoading(true);
        await loadSafeBoxData();
      } catch (err) {
        console.error('Failed to load safebox on mount:', err);
      } finally {
        if (mounted) setGlobalLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [loadSafeBoxData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadSafeBoxData();
    } catch (err) {
      console.error('SafeBox refresh failed:', err);
      Alert.alert('Error', 'Failed to refresh SafeBox data.');
    } finally {
      setRefreshing(false);
    }
  }, [loadSafeBoxData]);

  const formatBytes = (bytes: number = 0): string => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const v = bytes / Math.pow(k, i);
    return `${Math.round(v * 100) / 100} ${sizes[i]}`;
  };

  const setItemLoading = (id: string, loading: boolean) => {
    setActionLoadingIds(prev => ({ ...prev, [id]: loading }));
  };

  const handleDeleteItem = (itemId: string) => {
    Alert.alert('Delete Item', 'Are you sure you want to delete this item from your SafeBox?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setItemLoading(itemId, true);
            const success = await removeEvidenceItem(itemId);
            if (success) {
              Alert.alert('Success', 'Item deleted successfully');
              await loadSafeBoxData();
            } else {
              Alert.alert('Error', 'Failed to delete item');
            }
          } catch (err) {
            console.error('Delete item error:', err);
            Alert.alert('Error', 'Failed to delete item');
          } finally {
            setItemLoading(itemId, false);
          }
        },
      },
    ]);
  };

  const submitViaEmail = async (item: EvidenceItem) => {
    try {
      setItemLoading(item.id, true);
      if (item.type === 'report' && item.data) {
        const res = await EmailService.sendCybercrimeReport(item.data);
        if (res?.success) {
          Alert.alert('Success', 'Report submitted via email successfully');
          return true;
        } else {
          Alert.alert('Error', 'Failed to submit report via email');
          return false;
        }
      } else {
        Alert.alert('Unsupported', 'This item cannot be submitted via Email.');
        return false;
      }
    } catch (err) {
      console.error('Email submission failed:', err);
      Alert.alert('Error', 'Failed to submit via email');
      return false;
    } finally {
      setItemLoading(item.id, false);
    }
  };

  const submitViaWhatsApp = async (item: EvidenceItem) => {
    try {
      setItemLoading(item.id, true);
      if (item.type === 'report' && item.data) {
        const res = await WhatsAppService.sendCybercrimeReport(item.data);
        if (res?.success) {
          Alert.alert('Success', 'Report submitted via WhatsApp successfully');
          return true;
        } else {
          Alert.alert('Error', 'Failed to submit report via WhatsApp');
          return false;
        }
      } else {
        Alert.alert('Unsupported', 'This item cannot be submitted via WhatsApp.');
        return false;
      }
    } catch (err) {
      console.error('WhatsApp submission failed:', err);
      Alert.alert('Error', 'Failed to submit via WhatsApp');
      return false;
    } finally {
      setItemLoading(item.id, false);
    }
  };

  const submitViaBoth = async (item: EvidenceItem) => {
    try {
      setItemLoading(item.id, true);
      if (item.type === 'report' && item.data) {
        const [emailRes, whatsappRes] = await Promise.all([
          EmailService.sendCybercrimeReport(item.data).catch(e => ({ success: false, error: e })),
          WhatsAppService.sendCybercrimeReport(item.data).catch(e => ({ success: false, error: e })),
        ]);

        if (emailRes?.success || whatsappRes?.success) {
          Alert.alert('Success', 'Report submitted successfully');
          return true;
        } else {
          Alert.alert('Error', 'Failed to submit report');
          return false;
        }
      } else {
        Alert.alert('Unsupported', 'This item cannot be submitted via Email/WhatsApp.');
        return false;
      }
    } catch (err) {
      console.error('Submission failed:', err);
      Alert.alert('Error', 'Failed to submit report');
      return false;
    } finally {
      setItemLoading(item.id, false);
    }
  };

  const handleSubmitItem = (item: EvidenceItem) => {
    if (!isAppOnline) {
      Alert.alert('No Internet Connection', 'Please connect to the internet to submit items.');
      return;
    }

    Alert.alert('Submit Item', 'How would you like to submit this item?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Email', onPress: () => submitViaEmail(item) },
      { text: 'WhatsApp', onPress: () => submitViaWhatsApp(item) },
      { text: 'Both', onPress: () => submitViaBoth(item) },
    ]);
  };

  const toggleSelectionMode = () => {
    setIsSelectionMode(prev => !prev);
    setSelectedItems([]);
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => (prev.includes(itemId) ? prev.filter(i => i !== itemId) : [...prev, itemId]));
  };

  const handleDeleteSelected = () => {
    if (selectedItems.length === 0) {
      Alert.alert('No Selection', 'Please select items to delete.');
      return;
    }

    Alert.alert(
      'Delete Selected Items', 
      `Are you sure you want to delete ${selectedItems.length} item(s)? This action cannot be undone.`, 
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setGlobalLoading(true);
              
              // Store the items to delete before clearing selection
              const itemsToDelete = [...selectedItems];
              
              // Track successes and failures
              let successCount = 0;
              let failCount = 0;
              
              console.log('🗑️ Starting bulk delete for items:', itemsToDelete);
              
              // Delete items sequentially to avoid race conditions
              for (const itemId of itemsToDelete) {
                try {
                  console.log(`🗑️ Attempting to delete item: ${itemId}`);
                  const success = await removeEvidenceItem(itemId);
                  
                  if (success) {
                    successCount++;
                    console.log(`✅ Successfully deleted: ${itemId}`);
                  } else {
                    failCount++;
                    console.log(`❌ Failed to delete (returned false): ${itemId}`);
                  }
                  
                  // Add a small delay between deletions to prevent issues
                  await new Promise(resolve => setTimeout(resolve, 100));
                  
                } catch (itemErr) {
                  failCount++;
                  console.error(`❌ Error deleting ${itemId}:`, itemErr);
                }
              }
              
              console.log(`📊 Delete results: ${successCount} success, ${failCount} failed`);
              
              // Clear selection and exit selection mode BEFORE reloading
              setSelectedItems([]);
              setIsSelectionMode(false);
              
              // Reload data to reflect changes
              console.log('🔄 Reloading SafeBox data...');
              await loadSafeBoxData();
              console.log('✅ SafeBox data reloaded');
              
              // Show appropriate message
              if (failCount === 0) {
                Alert.alert('Success', `Successfully deleted ${successCount} item(s).`);
              } else if (successCount === 0) {
                Alert.alert('Error', `Failed to delete all ${failCount} item(s). Please try again.`);
              } else {
                Alert.alert(
                  'Partial Success', 
                  `Deleted ${successCount} item(s). Failed to delete ${failCount} item(s).`
                );
              }
              
            } catch (err) {
              console.error('❌ Bulk delete error:', err);
              Alert.alert('Error', 'An unexpected error occurred while deleting items.');
            } finally {
              setGlobalLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert('Clear All Items', 'Are you sure you want to delete all items from your SafeBox? This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All',
        style: 'destructive',
        onPress: async () => {
          try {
            setGlobalLoading(true);
            const success = await clearSafeBox();
            if (success) {
              setSelectedItems([]);
              setIsSelectionMode(false);
              await loadSafeBoxData();
              Alert.alert('Success', 'SafeBox cleared successfully');
            } else {
              Alert.alert('Error', 'Failed to clear SafeBox');
            }
          } catch (err) {
            console.error('Clear safe box error:', err);
            Alert.alert('Error', 'Failed to clear SafeBox');
          } finally {
            setGlobalLoading(false);
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: EvidenceItem }) => (
    <EvidenceItemCard
      item={item}
      onPress={() => {
        if (isSelectionMode) {
          toggleItemSelection(item.id);
        } else {
          handleSubmitItem(item);
        }
      }}
      onDelete={() => handleDeleteItem(item.id)}
      onSubmit={() => handleSubmitItem(item)}
      isSelected={selectedItems.includes(item.id)}
      isSelectionMode={isSelectionMode}
    />
  );

  const renderHeader = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statCard}>
        <Ionicons name="document-text-outline" size={24} color={COLORS.primary} />
        <Text style={styles.statValue}>{safeBoxData?.totalItems ?? 0}</Text>
        <Text style={styles.statLabel}>Items Stored</Text>
      </View>

      <View style={styles.statCard}>
        <Ionicons name="cloud-outline" size={24} color={COLORS.secondary} />
        <Text style={styles.statValue}>{formatBytes(safeBoxData?.totalSize ?? 0)}</Text>
        <Text style={styles.statLabel}>Total Size</Text>
      </View>
    </View>
  );

  const renderFooter = () => {
    if (!safeBoxData?.items || safeBoxData.items.length === 0) return null;

    return (
      <View style={styles.footerActions}>
        <View style={{ marginBottom: SPACING.md }}>
          <Button
            title={isSelectionMode ? 'Cancel Selection' : 'Select Items'}
            onPress={toggleSelectionMode}
            variant="outline"
            size="medium"
            icon={isSelectionMode ? 'close' : 'checkmark-circle-outline'}
            fullWidth
          />
        </View>

        {isSelectionMode && selectedItems.length > 0 && (
          <View style={{ marginBottom: SPACING.md }}>
            <Button
              title={`Delete Selected (${selectedItems.length})`}
              onPress={handleDeleteSelected}
              variant="primary"
              size="medium"
              icon="trash-outline"
              fullWidth
            />
          </View>
        )}

        {!isSelectionMode && (
          <View style={{ marginBottom: SPACING.md }}>
            <Button
              title="Clear All"
              onPress={handleClearAll}
              variant="outline"
              size="medium"
              icon="trash-outline"
              fullWidth
            />
          </View>
        )}
      </View>
    );
  };

  if (globalLoading || storageIsLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]} edges={['top', 'bottom']}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading SafeBox...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <FlatList
        data={safeBoxData?.items ?? []}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          <EmptyState
            icon="folder-open-outline"
            title="SafeBox is Empty"
            message="Your evidence and reports will be saved here when you're offline or want to submit them later."
          />
        }
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background 
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    color: COLORS.text.secondary,
    fontSize: TYPOGRAPHY.fontSizes.md,
  },
  listContent: { 
    flexGrow: 1, 
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md, // Added top padding to prevent overlap
    paddingBottom: SPACING.xxl,
  },

  // Stats - Improved responsiveness and fit
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.sm, // Further reduced padding
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: SPACING.xs / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 100, // Reduced height to prevent overflow
    maxHeight: 110, // Added max height
  },
  statValue: {
    fontSize: 18, // Further reduced from 20
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.text.primary,
    marginTop: SPACING.xs,
    marginBottom: SPACING.xs / 2,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },

  // Footer - Improved spacing
  footerActions: {
    marginTop: SPACING.lg,
    paddingBottom: SPACING.xl,
    paddingHorizontal: SPACING.xs,
  },
});

export default EvidenceSafeBoxScreen;