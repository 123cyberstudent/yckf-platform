// src/components/EmergencyShortcutOverlay.tsx
// Full-screen countdown shown when the volume-down shortcut is armed. Provides
// a clear CANCEL so the report is never sent by accident. If the countdown
// finishes, it dispatches the emergency report and shows confirmation.

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import EmergencyReportService, { EmergencySendResult } from '../services/EmergencyReportService';
import { COLORS, SPACING } from '../utils/constants';

export interface EmergencyShortcutOverlayProps {
  armed: boolean;
  triggeredAt: number;
  onCancel: () => void;
}

const COUNTDOWN_MS = 5000;

export default function EmergencyShortcutOverlay({
  armed,
  triggeredAt,
  onCancel,
}: EmergencyShortcutOverlayProps) {
  const [remaining, setRemaining] = useState(COUNTDOWN_MS);
  const [phase, setPhase] = useState<'countdown' | 'sending'>('countdown');
  const [result, setResult] = useState<EmergencySendResult | null>(null);
  const firedRef = useRef(false);

  useEffect(() => {
    if (!armed) {
      setRemaining(COUNTDOWN_MS);
      setPhase('countdown');
      setResult(null);
      firedRef.current = false;
      return;
    }

    setPhase('countdown');
    setResult(null);
    firedRef.current = false;
    setRemaining(COUNTDOWN_MS);

    const start = Date.now() - triggeredAt;
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const left = Math.max(0, COUNTDOWN_MS - elapsed);
      setRemaining(left);
      if (left <= 0 && !firedRef.current) {
        firedRef.current = true;
        clearInterval(interval);
        setPhase('sending');
        setRemaining(0);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [armed, triggeredAt]);

  // Trigger the send once countdown reaches zero.
  useEffect(() => {
    if (phase === 'sending' && !result) {
      emergencyReport()
        .then((res) => setResult(res))
        .catch((e) => setResult({ success: false, error: String(e) }));
    }
  }, [phase]);

  const emergencyReport = () => EmergencyReportService.sendAlert({ incidentType: 'physical_threat' });

  const visible = armed;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        {result ? (
          <View style={styles.card}>
            <Text style={[styles.big, { color: result.success ? '#16a34a' : '#dc2626' }]}>
              {result.success ? '✓' : '✕'}
            </Text>
            <Text style={styles.title}>{result.success ? 'Emergency Report Sent' : 'Not Sent'}</Text>
            {result.ticketNumber ? (
              <Text style={styles.ticket}>Ticket: {result.ticketNumber}</Text>
            ) : null}
            <Text style={styles.result}>{result.error || 'Dispatched to live responder.'}</Text>
            <TouchableOpacity style={styles.button} onPress={onCancel}>
              <Text style={styles.buttonText}>OK</Text>
            </TouchableOpacity>
          </View>
        ) : phase === 'sending' ? (
          <View style={styles.card}>
            <ActivityIndicator size="large" color="#dc2626" />
            <Text style={styles.sendingText}>Sending emergency report…</Text>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.countdownText}>{Math.ceil(remaining / 1000)}</Text>
            <Text style={styles.title}>Emergency alert armed</Text>
            <Text style={styles.body}>
              Your report will be sent to the nearest station in {Math.ceil(remaining / 1000)}s.
            </Text>
            <Pressable style={styles.cancel} onPress={onCancel}>
              <Text style={styles.cancelText}>CANCEL</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  card: { width: '100%', backgroundColor: '#fff', borderRadius: 16, padding: SPACING.lg, alignItems: 'center' },
  countdownText: { fontSize: 72, fontWeight: '800', color: '#dc2626', marginBottom: SPACING.sm },
  title: { fontSize: 20, fontWeight: '700', color: '#111', marginBottom: SPACING.sm },
  body: { fontSize: 14, color: '#555', textAlign: 'center', marginBottom: SPACING.lg },
  cancel: { width: '100%', paddingVertical: 14, backgroundColor: '#2dd4bf', borderRadius: 10, alignItems: 'center' },
  cancelText: { color: '#064e3b', fontWeight: '700', fontSize: 16, letterSpacing: 1 },
  sendingText: { marginTop: SPACING.md, color: '#333', fontSize: 15 },
  result: { marginTop: SPACING.sm, color: '#555', fontSize: 14, textAlign: 'center' },
  ticket: { marginTop: SPACING.sm, color: '#111', fontWeight: '600', fontSize: 15 },
  big: { fontSize: 56, marginBottom: SPACING.sm },
  button: { marginTop: SPACING.lg, width: '100%', paddingVertical: 14, backgroundColor: '#dc2626', borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});