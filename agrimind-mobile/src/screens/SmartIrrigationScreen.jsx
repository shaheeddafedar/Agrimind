
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Switch,
} from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';

import AgriHeader from '../components/common/AgriHeader';
import AgriButton from '../components/common/AgriButton';
import AgriInput from '../components/common/AgriInput';
import ErrorMessage from '../components/common/ErrorMessage';
import EmptyState from '../components/common/EmptyState';

import {
  MoistureVisualizer,
  MoistureHistoryChart,
} from '../components/charts/MoistureVisualizer';

import farmService from '../services/farmService';

import {
  AREA_UNITS,
  SOIL_DEPTH_PRESETS,
  IRRIGATION_EFFICIENCY_PRESETS,
  getCropThresholds,
  evaluateMoistureCondition,
  calculateWaterRequirement,
  evaluateSensorFreshness,
  evaluateThresholdAlertState,
  parseValidNumber,
} from '../services/irrigationCalculator';

import {
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
} from '../services/irrigationNotifications';

import { useAuth } from '../context/AuthContext';
import colors from '../theme/colors';
import { useTranslation } from '../i18n';

const CROPS_LIST = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'barley', label: 'Barley' },
  { value: 'blackgram', label: 'Blackgram' },
  { value: 'blackpepper', label: 'Black Pepper' },
  { value: 'brinjal', label: 'Brinjal' },
  { value: 'cabbage', label: 'Cabbage' },
  { value: 'cardamom', label: 'Cardamom' },
  { value: 'cauliflower', label: 'Cauliflower' },
  { value: 'chickpea', label: 'Chickpea' },
  { value: 'coconut', label: 'Coconut' },
  { value: 'coffee', label: 'Coffee' },
  { value: 'coriander', label: 'Coriander' },
  { value: 'cotton', label: 'Cotton' },
  { value: 'garlic', label: 'Garlic' },
  { value: 'grapes', label: 'Grapes' },
  { value: 'horsegram', label: 'Horsegram' },
  { value: 'jute', label: 'Jute' },
  { value: 'kidneybeans', label: 'Kidney Beans' },
  { value: 'lentil', label: 'Lentil' },
  { value: 'maize', label: 'Maize' },
  { value: 'mango', label: 'Mango' },
  { value: 'mothbeans', label: 'Moth Beans' },
  { value: 'mungbean', label: 'Mung Bean' },
  { value: 'muskmelon', label: 'Muskmelon' },
  { value: 'okra', label: 'Okra' },
  { value: 'onion', label: 'Onion' },
  { value: 'orange', label: 'Orange' },
  { value: 'papaya', label: 'Papaya' },
  { value: 'pigeonpeas', label: 'Pigeon Peas' },
  { value: 'pomegranate', label: 'Pomegranate' },
  { value: 'potato', label: 'Potato' },
  { value: 'ragi', label: 'Ragi' },
  { value: 'rapeseed', label: 'Rapeseed' },
  { value: 'rice', label: 'Rice' },
  { value: 'sorghum', label: 'Sorghum' },
  { value: 'soybean', label: 'Soybean' },
  { value: 'sunflower', label: 'Sunflower' },
  { value: 'sweet_potato', label: 'Sweet Potato' },
  { value: 'tomato', label: 'Tomato' },
  { value: 'turmeric', label: 'Turmeric' },
  { value: 'watermelon', label: 'Watermelon' },
  { value: 'wheat', label: 'Wheat' },
];

const INITIAL_ALERT_BANNER = {
  activeAlert: false,
  bannerType: 'NONE',
  shouldTriggerNotification: false,
  isDuplicateSuppressed: false,
  message: '',
};

export const SmartIrrigationScreen = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  // Core irrigation state
  const [selectedCrop, setSelectedCrop] = useState('');
  const [moisture, setMoisture] = useState('');
  const [dataSource, setDataSource] = useState('manual');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [cropModalVisible, setCropModalVisible] = useState(false);

  // Sensor state
  const [sensorStatus, setSensorStatus] = useState(() =>
    evaluateSensorFreshness(null)
  );
  const [refreshingSensor, setRefreshingSensor] = useState(false);

  // Water calculator state
  const [customTargetMoisture, setCustomTargetMoisture] = useState('');
  const [fieldArea, setFieldArea] = useState('');
  const [areaUnit, setAreaUnit] = useState('hectare');
  const [areaSourceNote, setAreaSourceNote] = useState('');
  const [soilDepthMm, setSoilDepthMm] = useState('');
  const [efficiencyPreset, setEfficiencyPreset] = useState('none');
  const [customEfficiency, setCustomEfficiency] = useState('');
  const [isVolumetricConfirmed, setIsVolumetricConfirmed] = useState(true);

  // Notification state
  const alertMemoryRef = useRef({
    activeAlert: false,
    bannerType: 'NONE',
    message: '',
  });

  const [notifPrefs, setNotifPrefs] = useState({
    notificationsEnabled: true,
    popupAlertEnabled: true,
  });

  const [notifCapability, setNotifCapability] = useState(() =>
    getLocalNotificationCapability()
  );

  const [alertState, setAlertState] = useState(INITIAL_ALERT_BANNER);
  const [showNotifSettings, setShowNotifSettings] = useState(false);

  // Local moisture history
  const [localHistory, setLocalHistory] = useState([]);
  const [historyFilter, setHistoryFilter] = useState('all');

  const selectedCropObj = CROPS_LIST.find(
    (crop) => crop.value === selectedCrop
  );

  const selectedCropLabel = selectedCropObj
    ? selectedCropObj.label
    : '';

  // Crop thresholds
  const thresholds = useMemo(() => {
    const backendMinForSameCrop =
      result?.crop &&
      result.crop.toLowerCase().trim() ===
        selectedCrop.toLowerCase().trim()
        ? result.threshold
        : null;

    return getCropThresholds(
      selectedCrop,
      backendMinForSameCrop,
      customTargetMoisture
    );
  }, [selectedCrop, result, customTargetMoisture]);

  // Current moisture condition
  const moistureEvaluation = useMemo(
    () =>
      evaluateMoistureCondition(
        moisture,
        thresholds.minThreshold,
        thresholds.targetMoisture,
        thresholds.tooWetThreshold,
        selectedCropLabel
      ),
    [moisture, thresholds, selectedCropLabel]
  );

  // Effective irrigation efficiency
  const effectiveEfficiency = useMemo(() => {
    if (customEfficiency.trim() !== '') {
      return parseValidNumber(customEfficiency);
    }

    const preset = IRRIGATION_EFFICIENCY_PRESETS.find(
      (item) => item.key === efficiencyPreset
    );

    return preset ? preset.efficiency : null;
  }, [efficiencyPreset, customEfficiency]);

  // Estimated water requirement
  const waterEstimate = useMemo(
    () =>
      calculateWaterRequirement({
        currentMoisture: moisture,
        targetMoisture: thresholds.targetMoisture,
        fieldArea,
        areaUnit,
        soilDepthMm,
        irrigationEfficiency: effectiveEfficiency,
        isVolumetricConfirmed,
      }),
    [
      moisture,
      thresholds.targetMoisture,
      fieldArea,
      areaUnit,
      soilDepthMm,
      effectiveEfficiency,
      isVolumetricConfirmed,
    ]
  );

  const getReadingStatus = useCallback(
    (sourceOverride = dataSource, freshnessOverride = sensorStatus) => {
      if (
        sourceOverride === 'sensor' &&
        (
          freshnessOverride?.isStale ||
          freshnessOverride?.statusType === 'STALE' ||
          freshnessOverride?.statusType === 'CACHED_OFFLINE'
        )
      ) {
        return 'stale';
      }

      return 'normal';
    },
    [dataSource, sensorStatus]
  );

  // Threshold alert and notification handling
  const runThresholdAlertCheck = useCallback(
    async (
      moistureVal,
      minThresh,
      cropVal,
      cropReadable,
      readingStatus = 'normal',
      commitSingleDigit = true
    ) => {
      const parsedM = parseValidNumber(moistureVal);
      const parsedT = parseValidNumber(minThresh);

      if (
        !cropVal ||
        parsedM === null ||
        parsedM < 0 ||
        parsedM > 100 ||
        parsedT === null ||
        parsedT <= 0 ||
        parsedT > 100
      ) {
        alertMemoryRef.current = {
          ...alertMemoryRef.current,
          activeAlert: false,
          bannerType: 'NONE',
          message: '',
        };

        setAlertState(INITIAL_ALERT_BANNER);
        return;
      }

      // Avoid committing transient single-digit input values.
      if (
        !commitSingleDigit &&
        parsedM > 0 &&
        parsedM < 10 &&
        parsedM < parsedT
      ) {
        const preview = evaluateThresholdAlertState(
          alertMemoryRef.current,
          {
            crop: cropVal,
            cropLabel: cropReadable,
            moisture: parsedM,
            threshold: parsedT,
            readingStatus,
            notificationsEnabled: false,
          }
        );

        setAlertState(preview);
        return;
      }

      const nextState = evaluateThresholdAlertState(
        alertMemoryRef.current,
        {
          crop: cropVal,
          cropLabel: cropReadable,
          moisture: parsedM,
          threshold: parsedT,
          readingStatus,
          notificationsEnabled: notifPrefs.notificationsEnabled,
        }
      );

      alertMemoryRef.current = nextState;
      setAlertState(nextState);

      try {
        await savePersistedAlertState({
          crop: nextState.crop,
          lastNotifiedAt: nextState.lastNotifiedAt,
          lastAlertMoisture: nextState.lastAlertMoisture,
        });
      } catch (err) {
        console.warn('Unable to persist alert state:', err);
      }

      if (nextState.shouldTriggerNotification) {
        try {
          await dispatchLowMoistureNotification({
            cropLabel: cropReadable,
            moisture: parsedM,
            threshold: parsedT,
            readingStatus,
            prefs: notifPrefs,
          });
        } catch (err) {
          console.warn('Unable to dispatch moisture notification:', err);
        }
      }
    },
    [notifPrefs]
  );

  // Refresh sensor status and optionally apply its reading.
  const pollSensorData = useCallback(
    async (applyToInput = false) => {
      if (refreshingSensor) return null;

      setRefreshingSensor(true);

      try {
        const sensorRes = await farmService.getSensorData();
        const freshness = evaluateSensorFreshness(sensorRes);

        setSensorStatus(freshness);

        if (
          freshness.hasCachedReading &&
          freshness.moisture !== null &&
          applyToInput
        ) {
          const liveStr = String(freshness.moisture);

          setMoisture(liveStr);
          setDataSource('sensor');

          const cropInfo = getCropThresholds(
            selectedCrop,
            null,
            customTargetMoisture
          );

          await runThresholdAlertCheck(
            freshness.moisture,
            cropInfo.minThreshold,
            selectedCrop,
            selectedCropLabel,
            freshness.isStale ? 'stale' : 'normal',
            true
          );
        }

        return sensorRes;
      } catch (err) {
        console.warn('Unable to refresh sensor data:', err);
        setSensorStatus(evaluateSensorFreshness(null));
        return null;
      } finally {
        setRefreshingSensor(false);
      }
    },
    [
      refreshingSensor,
      selectedCrop,
      selectedCropLabel,
      customTargetMoisture,
      runThresholdAlertCheck,
    ]
  );

  // Initial screen setup
  useEffect(() => {
    let isMounted = true;

    const initScreen = async () => {
      try {
        const [prefs, savedAlert, savedHistory] = await Promise.all([
          loadNotificationPreferences(),
          loadPersistedAlertState(),
          loadLocalMoistureHistory(),
        ]);

        if (!isMounted) return;

        setNotifPrefs(prefs);
        alertMemoryRef.current = {
          ...savedAlert,
          activeAlert: false,
          bannerType: 'NONE',
          message: '',
        };

        setLocalHistory(
          Array.isArray(savedHistory) ? savedHistory : []
        );

        setNotifCapability(getLocalNotificationCapability());
      } catch (err) {
        console.warn('Unable to initialize irrigation preferences:', err);
      }

      if (!isMounted) return;

      // Fetch current sensor status.
      try {
        const sensorRes = await farmService.getSensorData();

        if (!isMounted) return;

        const freshness = evaluateSensorFreshness(sensorRes);
        setSensorStatus(freshness);

        if (
          freshness.isLiveAvailable &&
          freshness.moisture !== null
        ) {
          setMoisture((previous) =>
            previous || String(freshness.moisture)
          );

          setDataSource((previous) =>
            previous === 'manual' && !moisture
              ? 'sensor'
              : previous
          );
        }
      } catch (err) {
        if (isMounted) {
          setSensorStatus(evaluateSensorFreshness(null));
        }
      }

      // Pre-fill area from the latest crop recommendation.
      if (user?._id) {
        try {
          const recommendations =
            await farmService.getRecentRecommendations(user._id);

          if (
            !isMounted ||
            !Array.isArray(recommendations) ||
            recommendations.length === 0
          ) {
            return;
          }

          const latest = recommendations[0];

          if (latest.area && Number(latest.area) > 0) {
            setFieldArea((previous) => {
              if (previous) return previous;

              setAreaUnit('hectare');
              setAreaSourceNote(
                'Loaded from your recent crop recommendation'
              );

              return String(latest.area);
            });
          }
        } catch (err) {
          console.warn('Unable to load recent recommendations:', err);
        }
      }
    };

    initScreen();

    return () => {
      isMounted = false;
    };
  }, [user?._id]);

  // Crop selection
  const handleSelectCrop = (cropValue) => {
    setSelectedCrop(cropValue);
    setResult(null);
    setCropModalVisible(false);

    if (error) setError('');

    const nextThresholds = getCropThresholds(
      cropValue,
      null,
      customTargetMoisture
    );

    const cropLabel =
      CROPS_LIST.find((crop) => crop.value === cropValue)?.label ||
      cropValue;

    runThresholdAlertCheck(
      moisture,
      nextThresholds.minThreshold,
      cropValue,
      cropLabel,
      getReadingStatus(),
      true
    );
  };

  // Main irrigation check
  const handleCheck = async () => {
    if (!selectedCrop) {
      setError(t('validation_crop_name') || 'Please select a crop.');
      return;
    }

    setError('');
    setLoading(true);
    setResult(null);

    try {
      let moistureToUse = moisture;
      let usedSource = dataSource;
      let latestFreshness = sensorStatus;

      // Prefer a live sensor reading when the endpoint confirms it.
      try {
        const sensor = await farmService.getSensorData();

        latestFreshness = evaluateSensorFreshness(sensor);
        setSensorStatus(latestFreshness);

        if (
          sensor?.success &&
          sensor?.available &&
          sensor?.connected &&
          sensor?.data?.moisture !== undefined &&
          sensor?.data?.moisture !== null
        ) {
          moistureToUse = String(sensor.data.moisture);

          setMoisture(moistureToUse);
          usedSource = 'sensor';
          setDataSource('sensor');
        }
      } catch (err) {
        // Fall back to the entered value if the sensor is unavailable.
        console.warn('Sensor unavailable; using entered moisture:', err);
      }

      const val = parseValidNumber(moistureToUse);

      if (val === null || val < 0 || val > 100) {
        setError(
          'Please enter a valid soil moisture percentage between 0% and 100%.'
        );
        return;
      }

      // Existing backend endpoint and service contract.
      const data = await farmService.checkIrrigation(selectedCrop, val);

      if (!data?.success) {
        setError(
          data?.message || 'Unable to check irrigation status.'
        );
        return;
      }

      setResult(data);

      const activeMinThreshold =
        data.threshold !== undefined
          ? Number(data.threshold)
          : thresholds.minThreshold;

      const updatedThresholds = getCropThresholds(
        selectedCrop,
        activeMinThreshold,
        customTargetMoisture
      );

      const evalResult = evaluateMoistureCondition(
        val,
        updatedThresholds.minThreshold,
        updatedThresholds.targetMoisture,
        updatedThresholds.tooWetThreshold,
        selectedCropLabel
      );

      await runThresholdAlertCheck(
        val,
        updatedThresholds.minThreshold,
        selectedCrop,
        selectedCropLabel,
        getReadingStatus(usedSource, latestFreshness),
        true
      );

      // Persist the reading in local device history.
      try {
        const updatedLog = await appendLocalMoistureReading({
          crop: selectedCrop,
          cropLabel: selectedCropLabel,
          moisture: val,
          threshold: updatedThresholds.minThreshold,
          targetMoisture: updatedThresholds.targetMoisture,
          condition: evalResult.condition,
          source: usedSource,
        });

        setLocalHistory(
          Array.isArray(updatedLog) ? updatedLog : []
        );
      } catch (historyError) {
        console.warn('Unable to save moisture history:', historyError);
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Unable to check irrigation status.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Notification preference changes
  const handleToggleNotifPref = async (key, value) => {
    const previousPrefs = notifPrefs;

    const updatedPrefs = {
      ...previousPrefs,
      [key]: value,
    };

    setNotifPrefs(updatedPrefs);

    try {
      const savedPrefs = await saveNotificationPreferences(updatedPrefs);
      setNotifPrefs(savedPrefs);
    } catch (err) {
      console.warn('Unable to save notification preferences:', err);
      setNotifPrefs(previousPrefs);
    }
  };

  // Request notification permission
  const handleRequestBrowserPermission = async () => {
    try {
      await requestLocalNotificationPermission();
    } catch (err) {
      console.warn('Notification permission request failed:', err);
    } finally {
      setNotifCapability(getLocalNotificationCapability());
    }
  };

  // History filters are calculated relative to the current time.
  const filteredHistory = useMemo(() => {
    if (historyFilter === 'all') {
      return localHistory;
    }

    const now = Date.now();

    const windowMs =
      historyFilter === 'today'
        ? 24 * 60 * 60 * 1000
        : 7 * 24 * 60 * 60 * 1000;

    return localHistory.filter((item) => {
      const timestamp = new Date(item.timestamp).getTime();

      return (
        Number.isFinite(timestamp) &&
        timestamp <= now &&
        now - timestamp <= windowMs
      );
    });
  }, [localHistory, historyFilter]);

  const formatTimestamp = (isoStr) => {
    if (!isoStr) return '';

    const date = new Date(isoStr);

    if (!Number.isFinite(date.getTime())) return '';

    return date.toLocaleString();
  };

  return (
    <View style={styles.container}>
      <AgriHeader
        title="AgriMind"
        subtitle={t('irrigation_title')}
        showLanguage
      />

      <View style={styles.pageHeader}>
        <View style={styles.titleRow}>
          <FontAwesome5
            name="tint"
            size={22}
            color="#2878ff"
            style={{ marginRight: 10 }}
          />
          <Text style={styles.pageHeaderTitle}>
            {t('irrigation_title')}
          </Text>
        </View>

        <Text style={styles.pageHeaderSubtitle}>
          {t('irrigation_desc')}
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Moisture alerts */}
        {alertState?.bannerType === 'LOW_MOISTURE_WARNING' &&
        alertState.message ? (
          <View style={styles.warningAlertBanner}>
            <View style={styles.alertBannerHeader}>
              <FontAwesome5
                name="exclamation-triangle"
                size={18}
                color="#B91C1C"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.warningAlertTitle}>
                Low Soil Moisture Alert
              </Text>
            </View>

            <Text style={styles.warningAlertBody}>
              {alertState.message}
            </Text>
          </View>
        ) : null}

        {alertState?.bannerType === 'RECOVERED' &&
        alertState.message ? (
          <View style={styles.recoveryAlertBanner}>
            <View style={styles.alertBannerHeader}>
              <FontAwesome5
                name="check-circle"
                size={18}
                color="#15803D"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.recoveryAlertTitle}>
                Soil Moisture Recovered
              </Text>
            </View>

            <Text style={styles.recoveryAlertBody}>
              {alertState.message}
            </Text>
          </View>
        ) : null}

        {/* Irrigation check form */}
        <View style={styles.irrigationCard}>
          <View style={styles.cardHeader}>
            <FontAwesome5
              name="water"
              size={22}
              color={colors.primary}
              style={{ marginRight: 12 }}
            />

            <View style={{ flex: 1 }}>
              <Text style={styles.cardHeaderTitle}>
                {t('irrigation_check_title')}
              </Text>
              <Text style={styles.cardHeaderSubtitle}>
                {t('irrigation_check_desc')}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.notifGearBtn}
              onPress={() =>
                setShowNotifSettings((previous) => !previous)
              }
              accessibilityRole="button"
              accessibilityLabel="Notification settings"
            >
              <Ionicons
                name={
                  notifPrefs.notificationsEnabled
                    ? 'notifications'
                    : 'notifications-off-outline'
                }
                size={20}
                color={colors.primary}
              />
            </TouchableOpacity>
          </View>

          {/* Sensor status */}
          <View style={styles.compactSensorStrip}>
            <View style={styles.sensorBadgeRow}>
              <View
                style={[
                  styles.statusDot,
                  sensorStatus.statusType === 'LIVE'
                    ? { backgroundColor: '#2E8B57' }
                    : sensorStatus.statusType === 'STALE' ||
                      sensorStatus.statusType === 'CACHED_OFFLINE'
                    ? { backgroundColor: '#F59E0B' }
                    : { backgroundColor: '#94A3B8' },
                ]}
              />

              <View style={{ flex: 1 }}>
                <Text style={styles.sensorStatusTitle}>
                  {sensorStatus.statusLabel}
                  {sensorStatus.hasCachedReading &&
                  sensorStatus.moisture !== null
                    ? ` (${sensorStatus.moisture}%)`
                    : ''}
                </Text>

                {sensorStatus.updatedAt ? (
                  <Text style={styles.sensorTimestampText}>
                    Updated: {formatTimestamp(sensorStatus.updatedAt)}
                  </Text>
                ) : null}
              </View>

              <TouchableOpacity
                style={styles.refreshSensorBtn}
                onPress={() => pollSensorData(true)}
                disabled={refreshingSensor}
                accessibilityRole="button"
              >
                <Ionicons
                  name="refresh"
                  size={15}
                  color={colors.primary}
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.refreshSensorBtnText}>
                  {refreshingSensor ? 'Checking...' : 'Check Sensor'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Notification settings */}
          {showNotifSettings && (
            <View style={styles.notifSettingsBox}>
              <Text style={styles.notifSettingsTitle}>
                Soil Moisture Alert Settings
              </Text>

              <View style={styles.notifToggleRow}>
                <Text style={styles.notifToggleLabel}>
                  Show low-moisture alerts
                </Text>

                <Switch
                  value={notifPrefs.notificationsEnabled}
                  onValueChange={(value) =>
                    handleToggleNotifPref('notificationsEnabled', value)
                  }
                  trackColor={{
                    false: '#CBD5E1',
                    true: colors.primaryLight,
                  }}
                  thumbColor={
                    notifPrefs.notificationsEnabled
                      ? colors.primary
                      : '#F8FAFC'
                  }
                />
              </View>

              <View style={styles.notifToggleRow}>
                <Text style={styles.notifToggleLabel}>
                  Show alert dialog while app is open
                </Text>

                <Switch
                  value={notifPrefs.popupAlertEnabled}
                  onValueChange={(value) =>
                    handleToggleNotifPref('popupAlertEnabled', value)
                  }
                  trackColor={{
                    false: '#CBD5E1',
                    true: colors.primaryLight,
                  }}
                  thumbColor={
                    notifPrefs.popupAlertEnabled
                      ? colors.primary
                      : '#F8FAFC'
                  }
                />
              </View>

              {notifCapability.osNotificationsSupported &&
              notifCapability.permission !== 'granted' ? (
                <TouchableOpacity
                  style={styles.permissionBtn}
                  onPress={handleRequestBrowserPermission}
                >
                  <Text style={styles.permissionBtnText}>
                    Allow Notifications
                  </Text>
                </TouchableOpacity>
              ) : null}

              <Text style={styles.notifLimitationNote}>
                {notifCapability.limitationNote}
              </Text>
            </View>
          )}

          <ErrorMessage message={error} />

          {/* Crop selector */}
          <View style={styles.formGroup}>
            <View style={styles.labelRow}>
              <FontAwesome5
                name="seedling"
                size={14}
                color={colors.primary}
                style={{ marginRight: 6 }}
              />
              <Text style={styles.formLabel}>{t('crop')}</Text>
            </View>

            <TouchableOpacity
              style={styles.selectBox}
              onPress={() => setCropModalVisible(true)}
              accessibilityRole="button"
            >
              <Text
                style={
                  selectedCrop
                    ? styles.selectedCropText
                    : styles.placeholderCropText
                }
              >
                {selectedCrop ? selectedCropLabel : t('select_crop')}
              </Text>

              <Ionicons
                name="chevron-down"
                size={18}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          </View>

          {/* Moisture and target */}
          <View style={styles.twoColInputs}>
            <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
              <View style={styles.labelRow}>
                <FontAwesome5
                  name="tint"
                  size={14}
                  color="#2878ff"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.formLabel}>
                  {t('soil_moisture')}
                </Text>
              </View>

              <AgriInput
                placeholder={t('soil_moisture_placeholder')}
                value={moisture}
                onChangeText={(value) => {
                  setMoisture(value);
                  setDataSource('manual');

                  if (error) setError('');

                  runThresholdAlertCheck(
                    value,
                    thresholds.minThreshold,
                    selectedCrop,
                    selectedCropLabel,
                    'normal',
                    false
                  );
                }}
                keyboardType="decimal-pad"
                style={{ marginBottom: 0 }}
              />
            </View>

            <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
              <View style={styles.labelRow}>
                <FontAwesome5
                  name="bullseye"
                  size={14}
                  color={colors.primary}
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.formLabel}>
                  Target Moisture (%)
                </Text>
              </View>

              <AgriInput
                placeholder={
                  thresholds.recommendedTarget !== null
                    ? `Recommended: ${thresholds.recommendedTarget}%`
                    : 'Select crop first'
                }
                value={customTargetMoisture}
                onChangeText={setCustomTargetMoisture}
                keyboardType="decimal-pad"
                style={{ marginBottom: 0 }}
              />
            </View>
          </View>

          {thresholds.hasConfiguredThreshold ? (
            <Text style={styles.thresholdHintText}>
              Recommended Minimum for{' '}
              <Text style={{ fontWeight: '700' }}>
                {selectedCropLabel}
              </Text>
              :{' '}
              <Text style={{ color: '#DC3545', fontWeight: '700' }}>
                {thresholds.minThreshold}%
              </Text>{' '}
              (Read-only) | Target:{' '}
              <Text style={{ color: '#15803D', fontWeight: '700' }}>
                {thresholds.targetMoisture}%
              </Text>
            </Text>
          ) : (
            <Text style={styles.thresholdHintText}>
              Select a crop above to load its recommended minimum and
              target moisture levels.
            </Text>
          )}

          <AgriButton
            title={loading ? t('checking') : t('check_irrigation')}
            onPress={handleCheck}
            loading={loading}
            icon={
              !loading ? (
                <FontAwesome5
                  name="search"
                  size={14}
                  color="#FFFFFF"
                />
              ) : undefined
            }
            style={{ marginTop: 10 }}
          />
        </View>

        {/* Moisture dashboard */}
        <View style={styles.irrigationCard}>
          <View style={styles.cardHeader}>
            <FontAwesome5
              name="tachometer-alt"
              size={20}
              color="#2878ff"
              style={{ marginRight: 10 }}
            />

            <View style={{ flex: 1 }}>
              <Text style={styles.cardHeaderTitle}>
                Soil Moisture Dashboard
              </Text>
              <Text style={styles.cardHeaderSubtitle}>
                Visual moisture gauge, crop threshold zones, and soil
                condition
              </Text>
            </View>
          </View>

          <MoistureVisualizer
            evaluation={moistureEvaluation}
            minThreshold={thresholds.minThreshold}
            targetMoisture={thresholds.targetMoisture}
            tooWetThreshold={thresholds.tooWetThreshold}
            waterEstimate={waterEstimate}
            cropLabel={selectedCrop ? selectedCropLabel : ''}
          />

          {result ? (
            <View style={styles.backendVerifiedBox}>
              <View style={styles.backendVerifiedHeader}>
                <FontAwesome5
                  name={
                    result.irrigationRequired ? 'tint' : 'check-circle'
                  }
                  size={16}
                  color={
                    result.irrigationRequired ? '#2878ff' : '#2e8b57'
                  }
                  style={{ marginRight: 8 }}
                />

                <Text style={styles.backendVerifiedTitle}>
                  {t('irrigation_status')}: {result.status}
                </Text>
              </View>

              <Text style={styles.backendVerifiedMessage}>
                {result.message}
              </Text>
            </View>
          ) : null}
        </View>

  

        {/* Moisture history */}
        <View style={styles.irrigationCard}>
          <View style={styles.cardHeader}>
            <FontAwesome5
              name="history"
              size={18}
              color={colors.primary}
              style={{ marginRight: 10 }}
            />

            <View style={{ flex: 1 }}>
              <Text style={styles.cardHeaderTitle}>
                Moisture Check History
              </Text>

              <Text style={styles.cardHeaderSubtitle}>
                Recent checks saved on this device
              </Text>
            </View>

            {localHistory.length > 0 ? (
              <TouchableOpacity
                onPress={async () => {
                  try {
                    await clearLocalMoistureHistory();
                    setLocalHistory([]);
                  } catch (err) {
                    console.warn('Unable to clear history:', err);
                    setError('Unable to clear moisture history.');
                  }
                }}
              >
                <Text style={styles.clearHistoryText}>Clear</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.filterTabsRow}>
            {[
              { key: 'all', label: 'All Checks' },
              { key: 'today', label: 'Last 24 Hours' },
              { key: '7d', label: 'Last 7 Days' },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.filterTab,
                  historyFilter === tab.key &&
                    styles.filterTabActive,
                ]}
                onPress={() => setHistoryFilter(tab.key)}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    historyFilter === tab.key &&
                      styles.filterTabTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {filteredHistory.length > 0 ? (
            <>
              <MoistureHistoryChart
                readings={filteredHistory}
                minThreshold={thresholds.minThreshold}
              />

              <View style={styles.historyListContainer}>
                {filteredHistory.slice(0, 5).map((item) => (
                  <View
                    key={item.id}
                    style={styles.historyRowItem}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyRowCrop}>
                        {item.cropLabel}
                      </Text>

                      <Text style={styles.historyRowTime}>
                        {formatTimestamp(item.timestamp)}
                      </Text>
                    </View>

                    <View style={styles.historyRowRight}>
                      <Text
                        style={[
                          styles.historyRowMoisture,
                          item.moisture < item.threshold
                            ? { color: '#DC3545' }
                            : { color: '#2E8B57' },
                        ]}
                      >
                        {item.moisture}%
                      </Text>

                      <Text style={styles.historyRowMin}>
                        Min: {item.threshold}%
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <EmptyState
              icon="tint"
              title="No Moisture Readings Saved Yet"
              description="Check your crop's irrigation status above to save readings on this device and compare them over time."
            />
          )}
        </View>
      </ScrollView>

      {/* Crop selection modal */}
      <Modal
        visible={cropModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCropModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {t('select_crop')}
              </Text>

              <TouchableOpacity
                onPress={() => setCropModalVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Close crop selector"
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={colors.textPrimary}
                />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }}>
              {CROPS_LIST.map((crop) => (
                <TouchableOpacity
                  key={crop.value}
                  style={[
                    styles.cropListItem,
                    selectedCrop === crop.value &&
                      styles.cropListItemActive,
                  ]}
                  onPress={() => handleSelectCrop(crop.value)}
                >
                  <Text
                    style={[
                      styles.cropListText,
                      selectedCrop === crop.value &&
                        styles.cropListTextActive,
                    ]}
                  >
                    {crop.label}
                  </Text>

                  {selectedCrop === crop.value ? (
                    <Ionicons
                      name="checkmark"
                      size={18}
                      color={colors.primary}
                    />
                  ) : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  pageHeader: {
    backgroundColor: '#FFFFFF',
    paddingTop: 16,
    paddingBottom: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  pageHeaderTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  pageHeaderSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  warningAlertBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#DC3545',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  recoveryAlertBanner: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#16A34A',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  alertBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  warningAlertTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#991B1B',
  },
  warningAlertBody: {
    fontSize: 13,
    color: '#7F1D1D',
    lineHeight: 18,
  },
  recoveryAlertTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#166534',
  },
  recoveryAlertBody: {
    fontSize: 13,
    color: '#14532D',
    lineHeight: 18,
  },
  irrigationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 18,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },
  compactSensorStrip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  sensorBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  sensorStatusTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sensorTimestampText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  refreshSensorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  refreshSensorBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardHeaderTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cardHeaderSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  notifGearBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  notifSettingsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  notifSettingsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  notifToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  notifToggleLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },
  permissionBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  permissionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  notifLimitationNote: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 8,
    lineHeight: 15,
  },
  formGroup: {
    marginBottom: 14,
  },
  twoColInputs: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  selectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#CED4DA',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectedCropText: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  placeholderCropText: {
    fontSize: 15,
    color: colors.textMuted,
  },
  thresholdHintText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
    lineHeight: 17,
  },
  backendVerifiedBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  backendVerifiedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  backendVerifiedTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  backendVerifiedMessage: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  moistureCompareStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  compareCell: {
    alignItems: 'center',
    flex: 1,
  },
  compareLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 2,
  },
  compareValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  fieldSourceNote: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: 4,
  },
  helperSubtext: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: 6,
  },
  unitChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  unitChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  unitChipActive: {
    backgroundColor: colors.successLight,
    borderColor: colors.primary,
  },
  unitChipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  unitChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  volumetricConfirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  volumetricConfirmTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  volumetricConfirmDesc: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  calcOutputBox: {
    marginTop: 4,
    marginBottom: 14,
  },
  zeroWaterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  zeroWaterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#166534',
    flex: 1,
  },
  calcMetricsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  calcMetricCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
  },
  calcMetricLabel: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
    marginBottom: 4,
  },
  calcMetricValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  calcMetricSub: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  appliedWaterBox: {
    backgroundColor: '#EBF8FF',
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#90CDF4',
  },
  appliedWaterTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2B6CB0',
  },
  appliedWaterValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A365D',
    marginTop: 2,
  },
  missingCalcPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 14,
  },
  missingCalcTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
  },
  missingCalcDesc: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 2,
    lineHeight: 16,
  },
  assumptionsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  assumptionsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  assumptionsItem: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
    marginBottom: 4,
  },
  clearHistoryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC3545',
  },
  filterTabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: colors.primary,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  historyListContainer: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  historyRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  historyRowCrop: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  historyRowTime: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  historyRowRight: {
    alignItems: 'flex-end',
  },
  historyRowMoisture: {
    fontSize: 14,
    fontWeight: '800',
  },
  historyRowMin: {
    fontSize: 11,
    color: colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cropListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  cropListItemActive: {
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
  },
  cropListText: {
    fontSize: 15,
    color: colors.textPrimary,
  },
  cropListTextActive: {
    fontWeight: '700',
    color: colors.primary,
  },
});

export default SmartIrrigationScreen;
