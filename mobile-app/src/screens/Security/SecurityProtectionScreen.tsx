// ============================================
// FILE: src/screens/Security/SecurityProtectionScreen.tsx
// Stolen Phone Protection - hub
// ============================================

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import StolenDeviceService, {
  DEFAULT_STOLEN_DEVICE_CONFIG,
  StolenDeviceConfig,
  DeviceStatus,
} from '../../services/StolenDeviceService';
import { COLORS, SPACING, SCREEN_NAMES } from '../../utils/constants';

const SecurityProtectionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<StolenDeviceConfig>({ ...DEFAULT_STOLEN_DEVICE_CONFIG });
  const [status, setStatus] = useState<DeviceStatus>('ACTIVE');
  const [registered, setRegistered] = useState(false);
  const [activating, setActivating] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const cfg = await StolenDeviceService.loadConfig();
    setConfig(cfg);
    setContactName(cfg.emergencyContactName);
    setContactPhone(cfg.emergencyContactPhone);
    // Self-heal: (re)register with the backend so the screen reflects the true
    // server-side state. register() is an idempotent upsert, so this is safe.
    const device = await StolenDeviceService.register();
    if (device) {
      setRegistered(true);
      const st = await StolenDeviceService.checkStatus();
      if (st) {
        setStatus(st.status);
        // Backend is authoritative: adopt the server's protectionEnabled so the
        // toggle never claims a state the backend did not record.
        if (typeof st.protectionEnabled === 'boolean' && st.protectionEnabled !== cfg.protectionEnabled) {
          const synced = await StolenDeviceService.saveConfig({ protectionEnabled: st.protectionEnabled });
          setConfig(synced);
        }
      }
    } else {
      setRegistered(false);
    }
    setLoading(false);
  };

  const persist = async (patch: Partial<StolenDeviceConfig>) => {
    setSaving(true);
    try {
      const next = await StolenDeviceService.saveConfig(patch);
      setConfig(next);
      const res = await StolenDeviceService.syncPreferences();
      if (!res.ok) {
        // Revert the optimistic local change so the UI never claims a state
        // the backend did not accept.
        const reverted = await StolenDeviceService.loadConfig();
        setConfig(reverted);
        Alert.alert('Could not save', 'YCKF could not update your protection settings. Check your connection and try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleProtection = async (value: boolean) => {
    if (value) {
      Alert.alert(
        'Enable Stolen Phone Protection?',
        'YCKF will register this device and, while the app is open, send small location heartbeats so it can be located if reported stolen. No covert camera or microphone is ever used.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Enable',
            onPress: async () => {
              setActivating(true);
              try {
                // Ensure the backend actually holds this device before flipping
                // the switch. Without this, the UI would show "PROTECTION
                // ACTIVE" while the backend had no record (old defect).
                const device = await StolenDeviceService.register();
                if (!device) {
                  Alert.alert('Could not enable protection', 'YCKF could not register this device. Check your connection and try again.');
                  return;
                }
                setRegistered(true);
                const next = await StolenDeviceService.saveConfig({ protectionEnabled: true });
                setConfig(next);
                const res = await StolenDeviceService.syncPreferences();
                if (!res.ok) {
                  const reverted = await StolenDeviceService.loadConfig();
                  setConfig(reverted);
                  Alert.alert('Could not enable protection', 'YCKF accepted the device but could not save your settings. Please try again.');
                }
              } finally {
                setActivating(false);
              }
            },
          },
        ]
      );
    } else {
      persist({ protectionEnabled: false });
    }
  };

  const saveContact = async () => {
    await persist({ emergencyContactName: contactName.trim(), emergencyContactPhone: contactPhone.trim() });
    Alert.alert('Saved', 'Emergency contact updated.');
  };

  const markThisDeviceStolen = () => {
    Alert.alert(
      'Report this device as stolen?',
      'YCKF will create a theft report, notify the dashboard, and (if enabled) send last-known location from this device when it is next opened.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Stolen',
          style: 'destructive',
          onPress: async () => {
            const devices = await StolenDeviceService.listMyDevices();
            const installId = await StolenDeviceService.getInstallId();
            let me = devices.find((d) => d.internalDeviceId === installId);
            // Fall back to the server-assigned device id stored at registration,
            // and to a fresh self-healing registration, so a device that IS
            // protected can always be reported.
            if (!me) {
              const storedId = await StolenDeviceService.getRegisteredDeviceId();
              if (storedId) {
                const byStoredId = devices.find((d) => d.id === storedId);
                if (byStoredId) me = byStoredId;
              }
            }
            if (!me) {
              const fresh = await StolenDeviceService.register();
              if (fresh) me = fresh;
            }
            if (!me) {
              Alert.alert('Not registered', 'Enable Stolen Phone Protection first.');
              return;
            }
            const result = await StolenDeviceService.markStolen(me.id, 'Reported stolen from this device');
            if (result.success) {
              setStatus('STOLEN');
              Alert.alert('Theft report filed', `Ticket: ${result.ticketNumber || ''}`);
            } else {
              Alert.alert('Error', result.error || 'Failed to mark device stolen');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const isStolen = status === 'STOLEN';
  const protectionActive = registered && config.protectionEnabled;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Stolen Phone Protection</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Status card */}
      <View style={[styles.statusCard, isStolen ? styles.statusCardStolen : styles.statusCardActive]}>
        <View style={styles.statusRow}>
          <Ionicons
            name={isStolen ? 'warning' : activating ? 'shield-outline' : protectionActive ? 'shield-checkmark' : 'shield-outline'}
            size={32}
            color={isStolen ? '#fff' : protectionActive ? '#16a34a' : '#94a3b8'}
          />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.statusTitle, isStolen && { color: '#fff' }]}>
              {isStolen
                ? 'DEVICE REPORTED STOLEN'
                : activating
                ? 'ACTIVATING PROTECTION…'
                : protectionActive
                ? 'PROTECTION ACTIVE'
                : config.protectionEnabled && !registered
                ? 'PROTECTION NOT REGISTERED'
                : 'PROTECTION OFF'}
            </Text>
            <Text style={[styles.statusSub, isStolen && { color: 'rgba(255,255,255,0.9)' }]}>
              {isStolen
                ? 'Last-known location is being reported to YCKF and the dashboard has been notified.'
                : activating
                ? 'Contacting YCKF to register this device…'
                : protectionActive
                ? 'YCKF can locate and report this device if stolen.'
                : config.protectionEnabled && !registered
                ? 'Registration with YCKF failed. Check your connection and try again.'
                : 'Turn on protection to enable theft reporting and remote location.'}
            </Text>
          </View>
        </View>
      </View>

      {/* Protection toggle */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Protection</Text>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.text.secondary} />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.settingLabel}>Stolen Phone Protection</Text>
              <Text style={styles.settingDesc}>Register device + send location heartbeats while app is open</Text>
            </View>
          </View>
          <Switch
            value={config.protectionEnabled}
            onValueChange={toggleProtection}
            trackColor={{ true: COLORS.primary }}
            disabled={saving || activating}
          />
        </View>

        {config.protectionEnabled && (
          <>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name="location-outline" size={20} color={COLORS.text.secondary} />
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.settingLabel}>Send Location</Text>
                  <Text style={styles.settingDesc}>Include GPS in heartbeats so a stolen device can be found</Text>
                </View>
              </View>
              <Switch
                value={config.sendLocationEnabled}
                onValueChange={(v) => persist({ sendLocationEnabled: v })}
                trackColor={{ true: COLORS.primary }}
                disabled={saving}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name="notifications-outline" size={20} color={COLORS.text.secondary} />
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.settingLabel}>Notify YCKF Dashboard</Text>
                  <Text style={styles.settingDesc}>Alert the YCKF emergency centre immediately on theft</Text>
                </View>
              </View>
              <Switch
                value={config.notifyDashboard}
                onValueChange={(v) => persist({ notifyDashboard: v })}
                trackColor={{ true: COLORS.primary }}
                disabled={saving}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name="eye-off-outline" size={20} color={COLORS.text.secondary} />
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.settingLabel}>Silent Helper Mode</Text>
                  <Text style={styles.settingDesc}>No loud alarm - keep sending location quietly if stolen</Text>
                </View>
              </View>
              <Switch
                value={config.stealMode === 'silent'}
                onValueChange={(v) => persist({ stealMode: v ? 'silent' : 'helper' })}
                trackColor={{ true: COLORS.primary }}
                disabled={saving}
              />
            </View>
          </>
        )}
      </View>

      {/* Emergency contact */}
      {config.protectionEnabled && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trusted Emergency Contact</Text>
          <TextInput
            style={styles.input}
            placeholder="Contact name"
            value={contactName}
            onChangeText={setContactName}
            placeholderTextColor={COLORS.text.light}
          />
          <TextInput
            style={styles.input}
            placeholder="Phone (e.g. +233 ...)"
            value={contactPhone}
            onChangeText={setContactPhone}
            keyboardType="phone-pad"
            placeholderTextColor={COLORS.text.light}
          />
          <TouchableOpacity style={styles.saveBtn} onPress={saveContact} disabled={saving}>
            <Text style={styles.saveBtnText}>Save Contact</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Emergency Actions</Text>
        {config.protectionEnabled && (
          <TouchableOpacity style={styles.dangerBtn} onPress={markThisDeviceStolen}>
            <Ionicons name="warning-outline" size={20} color="#fff" />
            <Text style={styles.dangerBtnText}>Mark This Device As Stolen</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => navigation.navigate(SCREEN_NAMES.MY_DEVICES)}
        >
          <Ionicons name="phone-portrait-outline" size={20} color={COLORS.text.secondary} />
          <Text style={styles.linkLabel}>My Devices</Text>
          <Text style={styles.linkHint}>Manage devices, report lost/stolen</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.text.light} />
        </TouchableOpacity>
      </View>

      {/* Scope note */}
      <View style={styles.noteBox}>
        <Ionicons name="information-circle-outline" size={20} color={COLORS.primary} />
        <Text style={styles.noteText}>
          YCKF reports, coordinates and preserves evidence - it cannot bypass Android or iOS security. For iPhones, also enable Apple's
          Find My → Lost Mode. YCKF never uses covert cameras or microphones.
        </Text>
      </View>
    </ScrollView>
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
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text.primary, flex: 1, textAlign: 'center' },
  statusCard: {
    marginHorizontal: SPACING.md,
    borderRadius: 16,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusCardActive: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  statusCardStolen: { backgroundColor: '#b91c1c' },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  statusTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text.primary },
  statusSub: { fontSize: 12, color: COLORS.text.secondary, marginTop: 4, lineHeight: 17 },
  section: { paddingHorizontal: SPACING.md, marginTop: SPACING.lg },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text.light,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  settingInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  settingLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text.primary },
  settingDesc: { fontSize: 12, color: COLORS.text.secondary, marginTop: 2 },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#b91c1c',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: SPACING.sm,
  },
  dangerBtnText: { color: '#fff', fontWeight: '700', fontSize: 15, marginLeft: 8 },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  linkLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text.primary, flex: 1, marginLeft: 12 },
  linkHint: { fontSize: 11, color: COLORS.text.light, marginRight: 8 },
  noteBox: {
    flexDirection: 'row',
    marginHorizontal: SPACING.md,
    marginTop: SPACING.lg,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: SPACING.md,
    alignItems: 'flex-start',
  },
  noteText: { flex: 1, marginLeft: 8, fontSize: 12, color: '#1e3a8a', lineHeight: 18 },
});

export default SecurityProtectionScreen;
