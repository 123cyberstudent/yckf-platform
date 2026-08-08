// ============================================
// FILE: src/screens/Security/MyDevicesScreen.tsx
// List registered devices; report lost/stolen, recover, unpair.
// ============================================

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import StolenDeviceService, { DeviceRecord } from '../../services/StolenDeviceService';
import { COLORS, SPACING } from '../../utils/constants';

const MyDevicesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const list = await StolenDeviceService.listMyDevices();
    setDevices(list);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const reportStolen = (device: DeviceRecord) => {
    Alert.alert(
      'Report stolen?',
      `Mark "${device.deviceName || device.internalDeviceId}" as stolen? YCKF will create a theft report and notify the dashboard.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report Stolen',
          style: 'destructive',
          onPress: async () => {
            const result = await StolenDeviceService.markStolen(device.id, `Reported stolen from My Devices`);
            if (result.success) {
              Alert.alert('Reported', `Ticket: ${result.ticketNumber || ''}`);
            } else {
              Alert.alert('Error', result.error || 'Failed');
            }
            load();
          },
        },
      ]
    );
  };

  const recoverDevice = (device: DeviceRecord) => {
    Alert.alert('Mark as recovered?', `Mark "${device.deviceName || device.internalDeviceId}" as recovered?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Recovered',
        onPress: async () => {
          const result = await StolenDeviceService.recover(device.id);
          if (result.success) {
            Alert.alert('Recovered', 'Device marked as recovered.');
          } else {
            Alert.alert('Error', result.error || 'Failed');
          }
          load();
        },
      },
    ]);
  };

  const unpairDevice = (device: DeviceRecord) => {
    Alert.alert('Unpair device?', `Remove "${device.deviceName || device.internalDeviceId}" from your account?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unpair',
        style: 'destructive',
        onPress: async () => {
          const result = await StolenDeviceService.unpair(device.id);
          if (result.success) {
            Alert.alert('Unpaired', 'Device removed from your account.');
          } else {
            Alert.alert('Error', result.error || 'Failed');
          }
          load();
        },
      },
    ]);
  };

  const renderDevice = ({ item }: { item: DeviceRecord }) => {
    const isStolen = item.status === 'STOLEN';
    const statusColor = isStolen ? '#b91c1c' : item.status === 'RECOVERED' ? '#16a34a' : '#2563EB';
    const lastSeen = item.lastSeenAt ? new Date(item.lastSeenAt).toLocaleString() : 'Never';
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.deviceIcon}>
            <Ionicons name={item.platform === 'IOS' ? 'phone-portrait' : 'phone-portrait'} size={26} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.deviceName}>{item.deviceName || item.internalDeviceId}</Text>
            <Text style={styles.deviceMeta}>
              {item.platform || 'Android'} {item.deviceModel ? `· ${item.deviceModel}` : ''} · Last seen {lastSeen}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>

        {item.activeTheftReport?.ticketNumber && (
          <View style={styles.theftNote}>
            <Ionicons name="warning-outline" size={14} color="#b91c1c" />
            <Text style={styles.theftNoteText}>Open theft report: {item.activeTheftReport.ticketNumber}</Text>
          </View>
        )}

        <View style={styles.cardActions}>
          {!isStolen && (
            <TouchableOpacity style={styles.dangerBtn} onPress={() => reportStolen(item)}>
              <Ionicons name="warning-outline" size={16} color="#fff" />
              <Text style={styles.dangerBtnText}>Report Stolen</Text>
            </TouchableOpacity>
          )}
          {isStolen && (
            <TouchableOpacity style={styles.successBtn} onPress={() => recoverDevice(item)}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
              <Text style={styles.dangerBtnText}>Recovered</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.ghostBtn} onPress={() => unpairDevice(item)}>
            <Text style={styles.ghostBtnText}>Unpair</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Devices</Text>
        <TouchableOpacity onPress={load} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {devices.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="phone-portrait-outline" size={48} color={COLORS.text.light} />
          <Text style={styles.emptyTitle}>No protected devices</Text>
          <Text style={styles.emptyText}>
            Enable Stolen Phone Protection on a device to register it here, then you can report it lost or stolen from any
            device or the YCKF website.
          </Text>
        </View>
      ) : (
        <FlatList
          data={devices}
          keyExtractor={(d) => String(d.id)}
          renderItem={renderDevice}
          contentContainerStyle={{ padding: SPACING.md, paddingBottom: 40 }}
          onRefresh={load}
          refreshing={loading}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: 50,
    paddingBottom: SPACING.md,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  refreshBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text.primary, flex: 1, textAlign: 'center' },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  deviceIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceName: { fontSize: 15, fontWeight: '700', color: COLORS.text.primary },
  deviceMeta: { fontSize: 11, color: COLORS.text.secondary, marginTop: 3 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  theftNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: SPACING.sm,
    marginTop: SPACING.sm,
  },
  theftNoteText: { marginLeft: 6, fontSize: 12, color: '#b91c1c', fontWeight: '600' },
  cardActions: { flexDirection: 'row', marginTop: SPACING.md },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#b91c1c',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginRight: SPACING.sm,
  },
  successBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16a34a',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginRight: SPACING.sm,
  },
  dangerBtnText: { color: '#fff', fontWeight: '600', fontSize: 13, marginLeft: 6 },
  ghostBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  ghostBtnText: { color: COLORS.text.secondary, fontWeight: '600', fontSize: 13 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text.primary, marginTop: SPACING.md },
  emptyText: {
    fontSize: 13,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 20,
  },
});

export default MyDevicesScreen;
