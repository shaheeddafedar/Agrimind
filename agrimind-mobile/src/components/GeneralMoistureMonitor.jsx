
import React, { useCallback, useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { useAuth } from '../context/AuthContext';
import farmService from '../services/farmService';
import { navigationRef } from '../navigation/navigationRef';
import { ROUTES } from '../navigation/routes';

import {
  loadNotificationPreferences,
  loadGeneralMoistureAlertState,
  saveGeneralMoistureAlertState,
  dispatchGeneralMoistureNotification,
} from '../services/irrigationNotifications';

const GENERAL_MOISTURE_THRESHOLD = 30;
const POLLING_INTERVAL = 30000;
const MAX_READING_AGE = 5 * 60 * 1000;

export default function GeneralMoistureMonitor() {
  const { user, loading } = useAuth();

  const isChecking = useRef(false);
  const alertStateRef = useRef({
    isLow: false,
    lastNotifiedAt: null,
  });

  const mountedRef = useRef(true);

  const checkSensorMoisture = useCallback(async () => {
    if (!user || loading || isChecking.current) return;

    isChecking.current = true;

    try {
      const response = await farmService.getSensorData();

      if (!response?.success || !response?.available || !response?.connected) {
        return;
      }

      const sensorData = response.data;

      if (!sensorData) return;

      const moisture = Number(sensorData.moisture);

      if (!Number.isFinite(moisture) || moisture < 0 || moisture > 100) {
        return;
      }

      const updatedAt = new Date(sensorData.updatedAt).getTime();

      if (!Number.isFinite(updatedAt)) return;

      const readingAge = Date.now() - updatedAt;

      if (readingAge < 0 || readingAge > MAX_READING_AGE) {
        return;
      }

      const prefs = await loadNotificationPreferences();

      if (moisture < GENERAL_MOISTURE_THRESHOLD) {
        if (
          alertStateRef.current.isLow ||
          !prefs.notificationsEnabled
        ) {
          return;
        }

        if (Platform.OS === 'android' || Platform.OS === 'ios') {
          const permission = await Notifications.getPermissionsAsync();

          if (!permission.granted) return;
        }

        if (
          Platform.OS === 'web' &&
          typeof window !== 'undefined' &&
          'Notification' in window &&
          window.Notification.permission !== 'granted'
        ) {
          return;
        }

        const result = await dispatchGeneralMoistureNotification({
          moisture,
          prefs,
        });

        if (result.dispatched) {
          const newState = {
            isLow: true,
            lastNotifiedAt: new Date().toISOString(),
          };

          alertStateRef.current = newState;
          await saveGeneralMoistureAlertState(newState);
        }
      } else if (alertStateRef.current.isLow) {
        const resetState = {
          isLow: false,
          lastNotifiedAt: null,
        };

        alertStateRef.current = resetState;
        await saveGeneralMoistureAlertState(resetState);
      }
    } catch (error) {
      console.warn('General moisture monitoring error:', error.message);
    } finally {
      isChecking.current = false;
    }
  }, [user, loading]);

  useEffect(() => {
    mountedRef.current = true;

    const initializeMonitor = async () => {
      const savedState = await loadGeneralMoistureAlertState();

      if (!mountedRef.current) return;

      alertStateRef.current = {
        isLow: Boolean(savedState?.isLow),
        lastNotifiedAt: savedState?.lastNotifiedAt || null,
      };

      if (user && !loading) {
        checkSensorMoisture();
      }
    };

    initializeMonitor();

    return () => {
      mountedRef.current = false;
    };
  }, [user, loading, checkSensorMoisture]);

  useEffect(() => {
    if (!user || loading) return;

    const interval = setInterval(() => {
      if (AppState.currentState === 'active') {
        checkSensorMoisture();
      }
    }, POLLING_INTERVAL);

    const appStateSubscription = AppState.addEventListener(
      'change',
      (nextState) => {
        if (nextState === 'active') {
          checkSensorMoisture();
        }
      }
    );

    return () => {
      clearInterval(interval);
      appStateSubscription.remove();
    };
  }, [user, loading, checkSensorMoisture]);

  useEffect(() => {
    const handleNotificationResponse = (notificationResponse) => {
      const destination =
        notificationResponse?.notification?.request?.content?.data?.destination;

      if (destination !== 'SMART_IRRIGATION') return;

      if (navigationRef.isReady()) {
        navigationRef.navigate(ROUTES.SMART_IRRIGATION);
      }
    };

    const subscription =
      Notifications.addNotificationResponseReceivedListener(
        handleNotificationResponse
      );

    const checkLastResponse = async () => {
      try {
        const lastResponse =
          await Notifications.getLastNotificationResponseAsync();

        if (lastResponse) {
          handleNotificationResponse(lastResponse);

          await Notifications.clearLastNotificationResponseAsync();
        }
      } catch (error) {
        console.warn('Notification response handling error:', error.message);
      }
    };

    checkLastResponse();

    return () => {
      subscription.remove();
    };
  }, []);

  return null;
}
