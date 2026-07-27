import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthService from '../services/AuthService';
import { COLORS, SPACING } from '../utils/constants';

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [user, setUser] = useState<any>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationTracking, setLocationTracking] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const currentUser = await AuthService.getCurrentUser();
      setUser(currentUser);
      const settings = await AsyncStorage.getItem('app_settings');
      if (settings) {
        const parsed = JSON.parse(settings);
        setNotificationsEnabled(parsed.notifications ?? true);
        setLocationTracking(parsed.locationTracking ?? true);
        setAutoSave(parsed.autoSave ?? true);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  const saveSettings = async (key: string, value: any) => {
    try {
      const settings = await AsyncStorage.getItem('app_settings');
      const parsed = settings ? JSON.parse(settings) : {};
      parsed[key] = value;
      await AsyncStorage.setItem('app_settings', JSON.stringify(parsed));
    } catch { /* ignore */ }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => AuthService.logout() },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Profile Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={28} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{user?.name || user?.fullName || 'User'}</Text>
            <Text style={styles.profileEmail}>{user?.email || ''}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{(user?.role || 'user').toUpperCase()}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Preferences */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Ionicons name="notifications-outline" size={20} color={COLORS.text.secondary} />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.settingLabel}>Push Notifications</Text>
              <Text style={styles.settingDesc}>Receive alerts for case updates</Text>
            </View>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={(v) => { setNotificationsEnabled(v); saveSettings('notifications', v); }}
            trackColor={{ true: COLORS.primary }}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Ionicons name="location-outline" size={20} color={COLORS.text.secondary} />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.settingLabel}>Location Tracking</Text>
              <Text style={styles.settingDesc}>Auto-detect location for reports</Text>
            </View>
          </View>
          <Switch
            value={locationTracking}
            onValueChange={(v) => { setLocationTracking(v); saveSettings('locationTracking', v); }}
            trackColor={{ true: COLORS.primary }}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Ionicons name="save-outline" size={20} color={COLORS.text.secondary} />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.settingLabel}>Auto-Save Drafts</Text>
              <Text style={styles.settingDesc}>Save report drafts automatically</Text>
            </View>
          </View>
          <Switch
            value={autoSave}
            onValueChange={(v) => { setAutoSave(v); saveSettings('autoSave', v); }}
            trackColor={{ true: COLORS.primary }}
          />
        </View>
      </View>

      {/* Quick Links */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Links</Text>
        <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('About')}>
          <Ionicons name="information-circle-outline" size={20} color={COLORS.text.secondary} />
          <Text style={styles.linkLabel}>About YCKF</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.text.light} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('CaseTracker')}>
          <Ionicons name="search-outline" size={20} color={COLORS.text.secondary} />
          <Text style={styles.linkLabel}>Track My Cases</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.text.light} />
        </TouchableOpacity>
      </View>

      {/* App Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Info</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Version</Text>
          <Text style={styles.infoValue}>1.0.0</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Organization</Text>
          <Text style={styles.infoValue}>Young Cyber Knights Foundation</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Founder</Text>
          <Text style={styles.infoValue}>Bright Peter Kwaku Boateng</Text>
        </View>
      </View>

      {/* Logout */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
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
  section: { paddingHorizontal: SPACING.md, marginBottom: SPACING.lg },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: COLORS.text.secondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: SPACING.sm },
  profileCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    borderRadius: 12, padding: SPACING.md, ...LAYOUT_SHADOW,
  },
  avatarCircle: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.primary + '15',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  profileName: { fontSize: 16, fontWeight: '600', color: COLORS.text.primary },
  profileEmail: { fontSize: 13, color: COLORS.text.secondary, marginTop: 2 },
  roleBadge: {
    marginTop: 4, backgroundColor: COLORS.primary + '15', paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 6, alignSelf: 'flex-start',
  },
  roleText: { fontSize: 10, fontWeight: '700', color: COLORS.primary, letterSpacing: 0.5 },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.surface, borderRadius: 12, padding: SPACING.md,
    marginBottom: 8, ...LAYOUT_SHADOW,
  },
  settingInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  settingLabel: { fontSize: 15, fontWeight: '500', color: COLORS.text.primary },
  settingDesc: { fontSize: 12, color: COLORS.text.secondary, marginTop: 2 },
  linkRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    borderRadius: 12, padding: SPACING.md, marginBottom: 8, ...LAYOUT_SHADOW,
  },
  linkLabel: { flex: 1, marginLeft: 12, fontSize: 15, color: COLORS.text.primary },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', backgroundColor: COLORS.surface,
    borderRadius: 12, padding: SPACING.md, marginBottom: 8,
  },
  infoLabel: { fontSize: 14, color: COLORS.text.secondary },
  infoValue: { fontSize: 14, color: COLORS.text.primary, fontWeight: '500' },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.surface, borderRadius: 12, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.error + '30',
  },
  logoutText: { fontSize: 15, fontWeight: '600', color: COLORS.error, marginLeft: 8 },
});

const LAYOUT_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.1,
  shadowRadius: 2,
  elevation: 1,
};

export default SettingsScreen;
