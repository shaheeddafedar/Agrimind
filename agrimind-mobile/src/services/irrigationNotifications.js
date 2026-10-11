import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Alert } from 'react-native';

const PREFS_STORAGE_KEY = '@agrimind_irrigation_notif_prefs';
const ALERT_STATE_STORAGE_KEY = '@agrimind_irrigation_alert_state';
const LOCAL_HISTORY_STORAGE_KEY = '@agrimind_irrigation_local_checks';

const DEFAULT_PREFS = {
  notificationsEnabled: true,
  popupAlertEnabled: true,
};

/**
 * Check notification capabilities in the current runtime.
 * - On Web: uses the standard Web Notification API while the page is open.
 * - On Mobile (Android/iOS): uses in-app warning banners and native Alert dialogs while the app is open.
 *   Background and closed-app push notifications require `expo-notifications`, a custom development build,
 *   and a backend push notification service, which are not installed in this project.
 */
export const getLocalNotificationCapability = () => {
  if (
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    'Notification' in window
  ) {
    return {
      osNotificationsSupported: true,
      channel: 'web_notification_api',
      permission: window.Notification.permission,
      limitationNote:
        'Alerts and browser notifications work while AgriMind is open.',
    };
  }

  return {
    osNotificationsSupported: false,
    channel: 'in_app_foreground',
    permission: 'in_app_only',
    limitationNote:
      'In-app warning banners and alert popups work while you are using the app. Background or closed-app notifications are not available without a push notification service.',
  };
};

export const requestLocalNotificationPermission = async () => {
  if (
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    'Notification' in window
  ) {
    try {
      const result = await window.Notification.requestPermission();
      return result;
    } catch {
      return 'denied';
    }
  }
  return 'in_app_only';
};

export const loadNotificationPreferences = async () => {
  try {
    const raw = await AsyncStorage.getItem(PREFS_STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
    }
  } catch (err) {
    console.warn('Unable to load irrigation notification preferences:', err);
  }
  return { ...DEFAULT_PREFS };
};

export const saveNotificationPreferences = async (prefs) => {
  const merged = { ...DEFAULT_PREFS, ...prefs };
  try {
    await AsyncStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(merged));
  } catch (err) {
    console.warn('Unable to save irrigation notification preferences:', err);
  }
  return merged;
};

export const loadPersistedAlertState = async () => {
  try {
    const raw = await AsyncStorage.getItem(ALERT_STATE_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Unable to load persisted alert state:', err);
  }
  return {};
};

export const savePersistedAlertState = async (state) => {
  try {
    await AsyncStorage.setItem(ALERT_STATE_STORAGE_KEY, JSON.stringify(state || {}));
  } catch (err) {
    console.warn('Unable to save persisted alert state:', err);
  }
};

export const dispatchLowMoistureNotification = ({
  cropLabel,
  moisture,
  threshold,
  readingStatus = 'normal',
  prefs = DEFAULT_PREFS,
}) => {
  if (!prefs.notificationsEnabled) {
    return { dispatched: false, method: 'disabled_by_user' };
  }

  const statusQualifier =
    readingStatus === 'stale'
      ? ' (from an older sensor reading)'
      : readingStatus === 'simulated'
      ? ' (simulated reading)'
      : '';

  const title = 'Low Soil Moisture Alert';
  const body = `Your soil moisture is ${moisture}%${statusQualifier}, below the recommended minimum of ${threshold}% for ${
    cropLabel || 'your crop'
  }. Irrigation may be needed.`;

  // 1. If running on web with granted Notification permission, fire browser notification
  if (
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    'Notification' in window &&
    window.Notification.permission === 'granted'
  ) {
    try {
      new window.Notification(title, { body });
      return { dispatched: true, method: 'web_notification' };
    } catch (err) {
      console.warn('Web notification dispatch fallback:', err);
    }
  }

  // 2. If popup alerts are enabled, trigger native Alert dialog on mobile while app is running
  if (prefs.popupAlertEnabled && Platform.OS !== 'web') {
    Alert.alert(title, body, [{ text: 'OK' }]);
    return { dispatched: true, method: 'native_alert_dialog' };
  }

  return { dispatched: true, method: 'in_app_banner' };
};

export const loadLocalMoistureHistory = async () => {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_HISTORY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (err) {
    console.warn('Unable to load local moisture history:', err);
  }
  return [];
};

export const appendLocalMoistureReading = async (entry) => {
  try {
    const current = await loadLocalMoistureHistory();
    const newEntry = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: entry.timestamp || new Date().toISOString(),
      crop: entry.crop || '',
      cropLabel: entry.cropLabel || 'Crop',
      moisture: Number(entry.moisture),
      threshold: Number(entry.threshold),
      targetMoisture: Number(entry.targetMoisture),
      condition: entry.condition || 'OPTIMAL',
      source: entry.source || 'manual',
    };

    const updated = [newEntry, ...current].slice(0, 30);
    await AsyncStorage.setItem(LOCAL_HISTORY_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn('Unable to append local moisture reading:', err);
    return [];
  }
};

export const clearLocalMoistureHistory = async () => {
  try {
    await AsyncStorage.removeItem(LOCAL_HISTORY_STORAGE_KEY);
  } catch (err) {
    console.warn('Unable to clear local moisture history:', err);
  }
  return [];
};

export default {
  getLocalNotificationCapability,
  requestLocalNotificationPermission,
  loadNotificationPreferences,
  saveNotificationPreferences,
  loadPersistedAlertState,
  savePersistedAlertState,
  dispatchLowMoistureNotification,
  loadLocalMoistureHistory,
  appendLocalMoistureReading,
  clearLocalMoistureHistory,
};
