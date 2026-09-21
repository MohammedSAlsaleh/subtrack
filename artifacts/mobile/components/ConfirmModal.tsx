import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColors';

export interface ConfirmConfig {
  title: string;
  message?: string;
  confirmLabel?: string;
  /** Omit to show a single "OK" button (info mode) */
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
}

interface Props {
  config: ConfirmConfig | null;
  onClose: () => void;
}

export function ConfirmModal({ config, onClose }: Props) {
  const colors = useColors();

  if (!config) return null;

  const {
    title,
    message,
    confirmLabel = 'OK',
    cancelLabel,
    destructive,
    onConfirm,
  } = config;

  const handleConfirm = async () => {
    onClose();
    await onConfirm();
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: (colors.radius ?? 12) + 4,
            },
          ]}
        >
          <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
          {message ? (
            <Text style={[styles.message, { color: colors.mutedForeground }]}>
              {message}
            </Text>
          ) : (
            <View style={{ height: 16 }} />
          )}

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {cancelLabel ? (
            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.btn, { borderRightWidth: 1, borderRightColor: colors.border }]}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={[styles.btnText, { color: colors.foreground }]}>
                  {cancelLabel}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btn} onPress={handleConfirm} activeOpacity={0.7}>
                <Text
                  style={[
                    styles.btnText,
                    styles.btnBold,
                    { color: destructive ? colors.destructive : colors.primary },
                  ]}
                >
                  {confirmLabel}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.btnFull} onPress={handleConfirm} activeOpacity={0.7}>
              <Text style={[styles.btnText, styles.btnBold, { color: colors.primary }]}>
                {confirmLabel}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  sheet: {
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
    overflow: 'hidden',
  },
  title: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  message: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 16,
    lineHeight: 19,
  },
  divider: { height: 1 },
  row: { flexDirection: 'row' },
  btn: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnFull: {
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
  btnBold: {
    fontFamily: 'Inter_700Bold',
  },
});
