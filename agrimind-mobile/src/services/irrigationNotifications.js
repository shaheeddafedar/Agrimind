import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';

const PREFS_STORAGE_KEY = '@agrimind_irrigation_notif_prefs';
const ALERT_STATE_STORAGE_KEY = '@agrimind_irrigation_alert_state';
const LOCAL_HISTORY_STORAGE_KEY = '@agrimind_irrigation_local_checks';
const GENERAL_ALERT_STATE_KEY = '@agrimind_general_moisture_alert_state';

const DEFAULT_PREFS = {
  notificationsEnabled: true,
  popupAlertEnabled: true,
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

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
      limitationNote: 'Browser notifications work while AgriMind is open.',
    };
  }

  if (Platform.OS === 'android' || Platform.OS === 'ios') {
    return {
      osNotificationsSupported: true,
      channel: 'expo_notifications',
      permission: 'requestable',
      limitationNote:
        'Native notifications are available while the app is running. Background and closed-app alerts require backend push notifications.',
    };
  }

  return {
    osNotificationsSupported: false,
    channel: 'in_app_foreground',
    permission: 'unavailable',
    limitationNote: 'Notifications are not supported in this runtime.',
  };
};

export const requestLocalNotificationPermission = async () => {
  if (
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    'Notification' in window
  ) {
    try {
      return await window.Notification.requestPermission();
    } catch {
      return 'denied';
    }
  }

  if (Platform.OS === 'android' || Platform.OS === 'ios') {
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('soil-moisture', {
          name: 'Soil Moisture Alerts',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          sound: 'default',
        });
      }

      const current = await Notifications.getPermissionsAsync();

      if (current.granted) return 'granted';

      const requested = await Notifications.requestPermissionsAsync();
      return requested.granted ? 'granted' : 'denied';
    } catch (err) {
      console.warn('Unable to request native notification permission:', err);
      return 'denied';
    }
  }

  return 'unavailable';
};

export const loadNotificationPreferences = async () => {
  try {
    const raw = await AsyncStorage.getItem(PREFS_STORAGE_KEY);
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
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
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn('Unable to load persisted alert state:', err);
  }
  return {};
};

export const savePersistedAlertState = async (state) => {
  try {
    await AsyncStorage.setItem(
      ALERT_STATE_STORAGE_KEY,
      JSON.stringify(state || {})
    );
  } catch (err) {
    console.warn('Unable to save persisted alert state:', err);
  }
};

export const loadGeneralMoistureAlertState = async () => {
  try {
    const raw = await AsyncStorage.getItem(GENERAL_ALERT_STATE_KEY);
    return raw ? JSON.parse(raw) : { isLow: false, lastNotifiedAt: null };
  } catch (err) {
    console.warn('Unable to load general moisture alert state:', err);
    return { isLow: false, lastNotifiedAt: null };
  }
};

export const saveGeneralMoistureAlertState = async (state) => {
  try {
    await AsyncStorage.setItem(
      GENERAL_ALERT_STATE_KEY,
      JSON.stringify(state)
    );
  } catch (err) {
    console.warn('Unable to save general moisture alert state:', err);
  }
};

export const dispatchGeneralMoistureNotification = async ({
  moisture,
  prefs = DEFAULT_PREFS,
}) => {
  if (!prefs.notificationsEnabled) {
    return { dispatched: false, method: 'disabled_by_user' };
  }

  const title = 'Low Soil Moisture Alert';
  const body = `Your soil moisture is ${moisture}%. It has dropped below the general alert level of 30%. Please check your soil and irrigation needs.`;

  if (
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    'Notification' in window &&
    window.Notification.permission === 'granted'
  ) {
    try {
      new window.Notification(title, {
        body,
        tag: 'agrimind-general-moisture',
      });
      return { dispatched: true, method: 'web_notification' };
    } catch (err) {
      console.warn('Web notification dispatch failed:', err);
    }
  }

  if (Platform.OS === 'android' || Platform.OS === 'ios') {
    try {
      const permission = await Notifications.getPermissionsAsync();

      if (!permission.granted) {
        return { dispatched: false, method: 'permission_not_granted' };
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
          data: { destination: 'SMART_IRRIGATION' },
        },
        trigger: null,
      });

      return { dispatched: true, method: 'expo_local_notification' };
    } catch (err) {
      console.warn('Native notification dispatch failed:', err);
      return { dispatched: false, method: 'native_notification_error' };
    }
  }

  return { dispatched: false, method: 'unsupported' };
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

  if (
    (Platform.OS === 'android' || Platform.OS === 'ios') &&
    prefs.popupAlertEnabled
  ) {
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
  loadGeneralMoistureAlertState,
  saveGeneralMoistureAlertState,
  dispatchGeneralMoistureNotification,
  dispatchLowMoistureNotification,
  loadLocalMoistureHistory,
  appendLocalMoistureReading,
  clearLocalMoistureHistory,
};