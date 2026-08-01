// ============================================
// FILE: src/screens/Wallet/WalletScreen.tsx
// Credit wallet: balance, stats, referral, ledger
// ============================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, LAYOUT } from '../../utils/constants';
import { formatMoney, formatCredits } from '../../utils/money';
import ScreenHeader from '../../components/common/ScreenHeader';
import WalletService, { WalletSummary, LedgerEntry } from '../../services/WalletService';
import PromotionsService from '../../services/PromotionsService';

const LEDGER_PAGE_SIZE = 50;

const typeLabel: Record<string, string> = {
  PURCHASE: 'Credit purchase',
  TOPUP: 'Top up',
  BONUS: 'Bonus',
  SIGNUP_REWARD: 'Sign-up reward',
  REFERRAL_REWARD: 'Referral reward',
  SPEND: 'Spent on purchase',
  REVERSAL: 'Reversal',
  REFUND: 'Refund',
  ADJUSTMENT: 'Manual adjustment',
};

const WalletScreen: React.FC = () => {
  const navigation = useNavigation();
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (showSpinner = true) => {
    if (showSpinner) setIsLoading(true);
    try {
      const [w, ledger, code] = await Promise.all([
        WalletService.getWallet(),
        WalletService.getLedger(LEDGER_PAGE_SIZE),
        PromotionsService.getReferralCode().catch(() => null),
      ]);
      setWallet(w);
      setEntries(ledger.entries);
      setNextCursor(ledger.nextCursor);
      setReferralCode(code);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to load wallet');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(false);
    setRefreshing(false);
  }, [load]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const page = await WalletService.getLedger(LEDGER_PAGE_SIZE, nextCursor);
      setEntries((prev) => [...prev, ...page.entries]);
      setNextCursor(page.nextCursor);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to load more entries');
    } finally {
      setIsLoadingMore(false);
    }
  }, [nextCursor, isLoadingMore]);

  const copyReferralCode = useCallback(() => {
    if (!referralCode) return;
    // Best-effort copy; falls back to sharing the code in an alert.
    Alert.alert('Referral Code', referralCode, [
      { text: 'OK' },
    ]);
  }, [referralCode]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScreenHeader title="Wallet" showBack={false} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading wallet...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Wallet" showBack={false} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Balance card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Credits</Text>
          <Text style={styles.balanceValue}>{formatCredits(wallet?.availableBalance ?? 0)}</Text>
          {(wallet?.reservedBalance ?? 0) > 0 && (
            <Text style={styles.balanceReserved}>
              {formatCredits(wallet!.reservedBalance)} reserved in pending orders
            </Text>
          )}
          <View style={styles.balanceActions}>
            <TouchableOpacity
              style={styles.balanceAction}
              onPress={() => navigation.navigate('CreditPackages' as never)}
            >
              <Ionicons name="add-circle" size={20} color="#FFFFFF" />
              <Text style={styles.balanceActionText}>Buy Credits</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.balanceAction}
              onPress={() => navigation.navigate('CourseCatalog' as never)}
            >
              <Ionicons name="school" size={20} color="#FFFFFF" />
              <Text style={styles.balanceActionText}>Browse Courses</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Lifetime stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatCredits(wallet?.lifetimePurchased ?? 0)}</Text>
            <Text style={styles.statLabel}>Purchased</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.secondary }]}>{formatCredits(wallet?.lifetimeBonus ?? 0)}</Text>
            <Text style={styles.statLabel}>Bonus</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.error }]}>{formatCredits(wallet?.lifetimeSpent ?? 0)}</Text>
            <Text style={styles.statLabel}>Spent</Text>
          </View>
        </View>

        {/* Referral card */}
        {referralCode ? (
          <TouchableOpacity style={styles.referralCard} onPress={copyReferralCode} activeOpacity={0.8}>
            <View style={styles.referralIcon}>
              <Ionicons name="gift" size={24} color={COLORS.accent} />
            </View>
            <View style={styles.referralContent}>
              <Text style={styles.referralTitle}>Invite friends & earn</Text>
              <Text style={styles.referralCode}>{referralCode}</Text>
            </View>
            <Ionicons name="share-outline" size={22} color={COLORS.primary} />
          </TouchableOpacity>
        ) : null}

        {/* Quick links */}
        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => navigation.navigate('MyOrders' as never)}
        >
          <View style={styles.linkIcon}>
            <Ionicons name="receipt" size={20} color={COLORS.primary} />
          </View>
          <Text style={styles.linkText}>My Orders</Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.text.secondary} />
        </TouchableOpacity>

        {/* Ledger */}
        <Text style={styles.sectionTitle}>Transaction History</Text>
        {entries.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="wallet-outline" size={40} color={COLORS.text.light} />
            <Text style={styles.emptyText}>No transactions yet</Text>
          </View>
        ) : (
          entries.map((entry) => (
            <View key={entry.id} style={styles.entryRow}>
              <View style={styles.entryIcon}>
                <Ionicons
                  name={entry.amount >= 0 ? 'add' : 'remove'}
                  size={18}
                  color={entry.amount >= 0 ? COLORS.secondary : COLORS.error}
                />
              </View>
              <View style={styles.entryContent}>
                <Text style={styles.entryLabel}>{typeLabel[entry.type] || entry.type}</Text>
                {entry.description ? <Text style={styles.entryDesc}>{entry.description}</Text> : null}
                <Text style={styles.entryDate}>
                  {new Date(entry.createdAt).toLocaleString(undefined, {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
              <View style={styles.entryAmount}>
                <Text style={[styles.entryAmountText, { color: entry.amount >= 0 ? COLORS.secondary : COLORS.error }]}>
                  {entry.amount >= 0 ? '+' : ''}{formatCredits(entry.amount)}
                </Text>
                <Text style={styles.entryBalance}>Bal: {formatCredits(entry.balanceAfter)}</Text>
              </View>
            </View>
          ))
        )}

        {nextCursor ? (
          <TouchableOpacity style={styles.loadMoreButton} onPress={loadMore} disabled={isLoadingMore}>
            <Text style={styles.loadMoreText}>{isLoadingMore ? 'Loading...' : 'Load more'}</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
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
  balanceCard: {
    backgroundColor: COLORS.primary,
    borderRadius: LAYOUT.borderRadius.xl,
    padding: SPACING.lg,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '600',
  },
  balanceValue: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
    marginTop: SPACING.xs,
  },
  balanceReserved: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    marginTop: SPACING.xs,
  },
  balanceActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  balanceAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: LAYOUT.borderRadius.md,
    paddingVertical: 12,
  },
  balanceActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.borderRadius.lg,
    padding: SPACING.md,
    alignItems: 'center',
    ...LAYOUT.shadows.small,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  referralCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.borderRadius.lg,
    padding: SPACING.md,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    ...LAYOUT.shadows.small,
  },
  referralIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  referralContent: {
    flex: 1,
  },
  referralTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  referralCode: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
    marginTop: 2,
    letterSpacing: 1,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.borderRadius.lg,
    padding: SPACING.md,
    marginTop: SPACING.md,
    ...LAYOUT.shadows.small,
  },
  linkIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  linkText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyText: {
    marginTop: SPACING.sm,
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.borderRadius.md,
    padding: SPACING.sm,
    marginBottom: SPACING.xs,
    ...LAYOUT.shadows.small,
  },
  entryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.divider,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  entryContent: {
    flex: 1,
  },
  entryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  entryDesc: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginTop: 1,
  },
  entryDate: {
    fontSize: 11,
    color: COLORS.text.light,
    marginTop: 2,
  },
  entryAmount: {
    alignItems: 'flex-end',
  },
  entryAmountText: {
    fontSize: 15,
    fontWeight: '700',
  },
  entryBalance: {
    fontSize: 11,
    color: COLORS.text.light,
    marginTop: 2,
  },
  loadMoreButton: {
    backgroundColor: COLORS.primary + '15',
    borderRadius: LAYOUT.borderRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  loadMoreText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});

export default WalletScreen;
