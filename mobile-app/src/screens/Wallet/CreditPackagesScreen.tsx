// ============================================
// FILE: src/screens/Wallet/CreditPackagesScreen.tsx
// Buy credit packages
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
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, LAYOUT } from '../../utils/constants';
import { formatMoney, formatCredits } from '../../utils/money';
import ScreenHeader from '../../components/common/ScreenHeader';
import CatalogService, { CreditPackage } from '../../services/CatalogService';
import { RootStackParamList } from '../../types';

const CreditPackagesScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (spinner = true) => {
    if (spinner) setIsLoading(true);
    try {
      const items = await CatalogService.listPackages();
      setPackages(items);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to load credit packages');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const buy = (pkg: CreditPackage) => {
    navigation.navigate('Checkout', {
      orderType: 'CREDIT_PACKAGE',
      productId: pkg.id,
      productName: pkg.name,
      price: pkg.price,
      totalCredits: pkg.totalCredits,
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScreenHeader title="Buy Credits" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading packages...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Buy Credits" subtitle="Top up your wallet" />
      <FlatList
        data={packages}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(false)} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="pricetag-outline" size={40} color={COLORS.text.light} />
            <Text style={styles.emptyText}>No credit packages available yet</Text>
          </View>
        }
        renderItem={({ item }) => {
          const featured = item.featured;
          return (
            <TouchableOpacity
              style={[styles.packageCard, featured && styles.packageCardFeatured]}
              onPress={() => buy(item)}
              activeOpacity={0.85}
            >
              {featured ? (
                <View style={styles.featuredBadge}>
                  <Text style={styles.featuredBadgeText}>MOST POPULAR</Text>
                </View>
              ) : null}
              {item.promotionLabel ? (
                <View style={styles.promoBadge}>
                  <Text style={styles.promoBadgeText}>{item.promotionLabel}</Text>
                </View>
              ) : null}
              <View style={styles.packageHeader}>
                <Text style={styles.packageName}>{item.name}</Text>
                <Text style={styles.packagePrice}>{formatMoney(item.price)}</Text>
              </View>
              <View style={styles.creditsRow}>
                <Ionicons name="sparkles" size={16} color={COLORS.primary} />
                <Text style={styles.creditsText}>{formatCredits(item.totalCredits)}</Text>
              </View>
              {item.bonusCredits > 0 ? (
                <Text style={styles.bonusText}>Includes {formatCredits(item.bonusCredits)} bonus</Text>
              ) : null}
              {item.description ? (
                <Text style={styles.packageDesc}>{item.description}</Text>
              ) : null}
              <View style={styles.buyButton}>
                <Text style={styles.buyButtonText}>Buy Now</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          );
        }}
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
  },
  emptyText: {
    marginTop: SPACING.sm,
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  packageCard: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.borderRadius.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...LAYOUT.shadows.small,
  },
  packageCardFeatured: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  featuredBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    borderTopRightRadius: LAYOUT.borderRadius.lg - 1,
    borderBottomLeftRadius: LAYOUT.borderRadius.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  featuredBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  promoBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderRadius: LAYOUT.borderRadius.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    marginBottom: SPACING.sm,
  },
  promoBadgeText: {
    color: '#92400E',
    fontSize: 12,
    fontWeight: '700',
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  packageName: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text.primary,
  },
  packagePrice: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
  },
  creditsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  creditsText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  bonusText: {
    fontSize: 13,
    color: COLORS.secondary,
    fontWeight: '600',
    marginTop: 2,
  },
  packageDesc: {
    fontSize: 13,
    color: COLORS.text.secondary,
    marginTop: SPACING.sm,
    lineHeight: 18,
  },
  buyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.primary,
    borderRadius: LAYOUT.borderRadius.md,
    paddingVertical: 12,
    marginTop: SPACING.md,
  },
  buyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default CreditPackagesScreen;
