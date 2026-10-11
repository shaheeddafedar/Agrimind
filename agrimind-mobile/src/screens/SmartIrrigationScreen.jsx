import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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

  // Core Irrigation Check State
  const [selectedCrop, setSelectedCrop] = useState('');
  const [moisture, setMoisture] = useState('');
  const [dataSource, setDataSource] = useState('manual'); // 'sensor' | 'manual'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [cropModalVisible, setCropModalVisible] = useState(false);

  // Compact Sensor Status State
  const [sensorStatus, setSensorStatus] = useState(() =>
    evaluateSensorFreshness(null)
  );
  const [refreshingSensor, setRefreshingSensor] = useState(false);

  // Threshold & Water Calculator State
  const [customTargetMoisture, setCustomTargetMoisture] = useState('');
  const [fieldArea, setFieldArea] = useState('');
  const [areaUnit, setAreaUnit] = useState('hectare');
  const [areaSourceNote, setAreaSourceNote] = useState('');
  const [soilDepthMm, setSoilDepthMm] = useState('');
  const [efficiencyPreset, setEfficiencyPreset] = useState('none');
  const [customEfficiency, setCustomEfficiency] = useState('');
  const [isVolumetricConfirmed, setIsVolumetricConfirmed] = useState(true);

  // Notifications & Internal Cooldown Tracking
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

  // Local Moisture History State
  const [localHistory, setLocalHistory] = useState([]);
  const [historyFilter, setHistoryFilter] = useState('all'); // 'all' | 'today' | '7d'

  const selectedCropObj = CROPS_LIST.find((c) => c.value === selectedCrop);
  const selectedCropLabel = selectedCropObj ? selectedCropObj.label : '';

  // Compute dynamic thresholds for the selected crop (null when no crop is selected)
  const thresholds = useMemo(() => {
    const backendMinForSameCrop =
      result &&
      result.crop &&
      result.crop.toLowerCase().trim() === selectedCrop.toLowerCase().trim()
        ? result.threshold
        : null;

    return getCropThresholds(
      selectedCrop,
      backendMinForSameCrop,
      customTargetMoisture
    );
  }, [selectedCrop, result, customTargetMoisture]);

  // Evaluate current moisture reading (Dry, Optimal, Too Wet)
  const moistureEvaluation = useMemo(() => {
    return evaluateMoistureCondition(
      moisture,
      thresholds.minThreshold,
      thresholds.targetMoisture,
      thresholds.tooWetThreshold,
      selectedCropLabel
    );
  }, [moisture, thresholds, selectedCropLabel]);

  // Determine effective irrigation efficiency
  const effectiveEfficiency = useMemo(() => {
    if (customEfficiency !== '') {
      return parseValidNumber(customEfficiency);
    }
    const preset = IRRIGATION_EFFICIENCY_PRESETS.find(
      (p) => p.key === efficiencyPreset
    );
    return preset ? preset.efficiency : null;
  }, [efficiencyPreset, customEfficiency]);

  // Calculate Water Deficit (mm) and Water Volume (L / m³)
  const waterEstimate = useMemo(() => {
    return calculateWaterRequirement({
      currentMoisture: moisture,
      targetMoisture: thresholds.targetMoisture,
      fieldArea,
      areaUnit,
      soilDepthMm,
      irrigationEfficiency: effectiveEfficiency,
      isVolumetricConfirmed,
    });
  }, [
    moisture,
    thresholds.targetMoisture,
    fieldArea,
    areaUnit,
    soilDepthMm,
    effectiveEfficiency,
    isVolumetricConfirmed,
  ]);

  const getReadingStatus = useCallback(
    (sourceOverride = dataSource, freshnessOverride = sensorStatus) => {
      if (
        sourceOverride === 'sensor' &&
        (freshnessOverride.isStale ||
          freshnessOverride.statusType === 'STALE' ||
          freshnessOverride.statusType === 'CACHED_OFFLINE')
      ) {
        return 'stale';
      }
      return 'normal';
    },
    [dataSource, sensorStatus]
  );

  // Evaluate threshold notification state dynamically
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

      if (
        !commitSingleDigit &&
        parsedM > 0 &&
        parsedM < 10 &&
        parsedM < parsedT
      ) {
        const preview = evaluateThresholdAlertState(alertMemoryRef.current, {
          crop: cropVal,
          cropLabel: cropReadable,
          moisture: parsedM,
          threshold: parsedT,
          readingStatus,
          notificationsEnabled: false,
        });
        setAlertState(preview);
        return;
      }

      const nextState = evaluateThresholdAlertState(alertMemoryRef.current, {
        crop: cropVal,
        cropLabel: cropReadable,
        moisture: parsedM,
        threshold: parsedT,
        readingStatus,
        notificationsEnabled: notifPrefs.notificationsEnabled,
      });

      alertMemoryRef.current = nextState;
      setAlertState(nextState);
      await savePersistedAlertState({
        crop: nextState.crop,
        lastNotifiedAt: nextState.lastNotifiedAt,
        lastAlertMoisture: nextState.lastAlertMoisture,
      });

      if (nextState.shouldTriggerNotification) {
        dispatchLowMoistureNotification({
          cropLabel: cropReadable,
          moisture: parsedM,
          threshold: parsedT,
          readingStatus,
          prefs: notifPrefs,
        });
      }
    },
    [notifPrefs]
  );

  // Fetch live sensor status from existing /api/sensor/data endpoint
  const pollSensorData = useCallback(
    async (applyToInput = false) => {
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
      } catch {
        setSensorStatus(evaluateSensorFreshness(null));
        return null;
      } finally {
        setRefreshingSensor(false);
      }
    },
    [
      selectedCrop,
      selectedCropLabel,
      customTargetMoisture,
      runThresholdAlertCheck,
    ]
  );

  // Initial bootstrap: load preferences, cooldown memory, local history, and sensor status
  useEffect(() => {
    let isMounted = true;

    const initScreen = async () => {
      const [prefs, savedAlert, savedHistory] = await Promise.all([
        loadNotificationPreferences(),
        loadPersistedAlertState(),
        loadLocalMoistureHistory(),
      ]);

      if (!isMounted) return;
      setNotifPrefs(prefs);
      // Only restore cooldown timestamp memory, never display a static banner on mount
      alertMemoryRef.current = {
        ...savedAlert,
        activeAlert: false,
        bannerType: 'NONE',
        message: '',
      };
      setLocalHistory(savedHistory);
      setNotifCapability(getLocalNotificationCapability());

      // Check sensor status on screen open
      try {
        const sensorRes = await farmService.getSensorData();
        if (!isMounted) return;
        const freshness = evaluateSensorFreshness(sensorRes);
        setSensorStatus(freshness);
        if (freshness.isLiveAvailable && freshness.moisture !== null) {
          setMoisture((prev) => prev || String(freshness.moisture));
          setDataSource('sensor');
        }
      } catch {
        if (isMounted) {
          setSensorStatus(evaluateSensorFreshness(null));
        }
      }

      // Pre-fill field area if available from recent consultation
      if (user?._id) {
        try {
          const recs = await farmService.getRecentRecommendations(user._id);
          if (isMounted && Array.isArray(recs) && recs.length > 0) {
            const latest = recs[0];
            if (latest.area && Number(latest.area) > 0) {
              setFieldArea((prev) => {
                if (!prev) {
                  setAreaUnit('hectare');
                  setAreaSourceNote(
                    'Loaded from your recent crop recommendation'
                  );
                  return String(latest.area);
                }
                return prev;
              });
            }
          }
        } catch {
          // ignore consultation fetch error
        }
      }
    };

    initScreen();
    return () => {
      isMounted = false;
    };
  }, [user?._id]);

  // Handle crop selection and dynamically update thresholds & alert state
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
      CROPS_LIST.find((c) => c.value === cropValue)?.label || cropValue;

    runThresholdAlertCheck(
      moisture,
      nextThresholds.minThreshold,
      cropValue,
      cropLabel,
      getReadingStatus(),
      true
    );
  };

  // Main "Check Irrigation" handler — preserves existing API flow & contracts
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

      // 1. Try to get live sensor moisture first
      try {
        const sensor = await farmService.getSensorData();
        latestFreshness = evaluateSensorFreshness(sensor);
        setSensorStatus(latestFreshness);

        if (
          sensor?.success &&
          sensor?.available &&
          sensor?.connected &&
          sensor?.data &&
          sensor.data.moisture !== undefined &&
          sensor.data.moisture !== null
        ) {
          moistureToUse = String(sensor.data.moisture);
          setMoisture(moistureToUse);
          usedSource = 'sensor';
          setDataSource('sensor');
        }
      } catch {
        // Sensor unavailable; proceed with entered moisture
      }

      // 2. Validate the moisture value
      const val = parseValidNumber(moistureToUse);

      if (val === null || val < 0 || val > 100) {
        setError(
          'Please enter a valid soil moisture percentage between 0% and 100%.'
        );
        return;
      }

      // 3. Check irrigation using existing POST /api/irrigation/check endpoint
      const data = await farmService.checkIrrigation(selectedCrop, val);

      if (data && data.success) {
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

        // 4. Evaluate threshold notification with cooldown & recovery
        await runThresholdAlertCheck(
          val,
          updatedThresholds.minThreshold,
          selectedCrop,
          selectedCropLabel,
          getReadingStatus(usedSource, latestFreshness),
          true
        );

        // 5. Log reading in local device history
        const updatedLog = await appendLocalMoistureReading({
          crop: selectedCrop,
          cropLabel: selectedCropLabel,
          moisture: val,
          threshold: updatedThresholds.minThreshold,
          targetMoisture: updatedThresholds.targetMoisture,
          condition: evalResult.condition,
          source: usedSource,
        });
        setLocalHistory(updatedLog);
      } else {
        setError(data?.message || 'Unable to check irrigation status.');
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Unable to check irrigation status.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Toggle user notification preferences
  const handleToggleNotifPref = async (key, value) => {
    const updated = await saveNotificationPreferences({
      ...notifPrefs,
      [key]: value,
    });
    setNotifPrefs(updated);
  };

  const handleRequestBrowserPermission = async () => {
    await requestLocalNotificationPermission();
    setNotifCapability(getLocalNotificationCapability());
  };

  // Filter local moisture history by time window
  const filteredHistory = useMemo(() => {
    if (historyFilter === 'all' || localHistory.length === 0) {
      return localHistory;
    }
    const referenceTime = new Date(localHistory[0].timestamp).getTime();
    if (!Number.isFinite(referenceTime)) return localHistory;
    return localHistory.filter((item) => {
      const ts = new Date(item.timestamp).getTime();
      if (!Number.isFinite(ts)) return false;
      if (historyFilter === 'today') {
        return referenceTime - ts <= 24 * 60 * 60 * 1000;
      }
      if (historyFilter === '7d') {
        return referenceTime - ts <= 7 * 24 * 60 * 60 * 1000;
      }
      return true;
    });
  }, [localHistory, historyFilter]);

  const formatTimestamp = (isoStr) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    if (!Number.isFinite(d.getTime())) return '';
    return d.toLocaleString();
  };

  return (
    <View style={styles.container}>
      <AgriHeader
        title="AgriMind"
        subtitle={t('irrigation_title')}
        showLanguage={true}
      />

      {/* Page Header Banner */}
      <View style={styles.pageHeader}>
        <View style={styles.titleRow}>
          <FontAwesome5
            name="tint"
            size={22}
            color="#2878ff"
            style={{ marginRight: 10 }}
          />
          <Text style={styles.pageHeaderTitle}>{t('irrigation_title')}</Text>
        </View>
        <Text style={styles.pageHeaderSubtitle}>{t('irrigation_desc')}</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 1. DYNAMIC THRESHOLD ALERT / RECOVERY BANNER */}
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
              <Text style={styles.warningAlertBody}>{alertState.message}</Text>
            </View>
          ) : null}

        {alertState?.bannerType === 'RECOVERED' && alertState.message ? (
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
            <Text style={styles.recoveryAlertBody}>{alertState.message}</Text>
          </View>
        ) : null}

        {/* 2. IRRIGATION CHECK FORM & COMPACT SENSOR STATUS */}
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
              onPress={() => setShowNotifSettings((prev) => !prev)}
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

          {/* Compact Sensor Status Strip */}
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

          {/* Collapsible Notification Preferences Panel */}
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
                  onValueChange={(v) =>
                    handleToggleNotifPref('notificationsEnabled', v)
                  }
                  trackColor={{ false: '#CBD5E1', true: colors.primaryLight }}
                  thumbColor={
                    notifPrefs.notificationsEnabled ? colors.primary : '#F8FAFC'
                  }
                />
              </View>
              <View style={styles.notifToggleRow}>
                <Text style={styles.notifToggleLabel}>
                  Show alert dialog while app is open
                </Text>
                <Switch
                  value={notifPrefs.popupAlertEnabled}
                  onValueChange={(v) =>
                    handleToggleNotifPref('popupAlertEnabled', v)
                  }
                  trackColor={{ false: '#CBD5E1', true: colors.primaryLight }}
                  thumbColor={
                    notifPrefs.popupAlertEnabled ? colors.primary : '#F8FAFC'
                  }
                />
              </View>
              {notifCapability.osNotificationsSupported &&
                notifCapability.permission !== 'granted' && (
                  <TouchableOpacity
                    style={styles.permissionBtn}
                    onPress={handleRequestBrowserPermission}
                  >
                    <Text style={styles.permissionBtnText}>
                      Allow Browser Notifications
                    </Text>
                  </TouchableOpacity>
                )}
              <Text style={styles.notifLimitationNote}>
                {notifCapability.limitationNote}
              </Text>
            </div>
          )}

          <ErrorMessage message={error} />

          {/* Crop Selector */}
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

          {/* Soil Moisture Input + Target Moisture Input */}
          <View style={styles.twoColInputs}>
            <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
              <View style={styles.labelRow}>
                <FontAwesome5
                  name="tint"
                  size={14}
                  color="#2878ff"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.formLabel}>{t('soil_moisture')}</Text>
              </View>
              <AgriInput
                placeholder={t('soil_moisture_placeholder')}
                value={moisture}
                onChangeText={(text) => {
                  setMoisture(text);
                  setDataSource('manual');
                  if (error) setError('');
                  runThresholdAlertCheck(
                    text,
                    thresholds.minThreshold,
                    selectedCrop,
                    selectedCropLabel,
                    'normal',
                    false
                  );
                }}
                keyboardType="numeric"
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
                <Text style={styles.formLabel}>Target Moisture (%)</Text>
              </View>
              <AgriInput
                placeholder={
                  thresholds.recommendedTarget !== null
                    ? `Recommended: ${thresholds.recommendedTarget}%`
                    : 'Select crop first'
                }
                value={customTargetMoisture}
                onChangeText={setCustomTargetMoisture}
                keyboardType="numeric"
                style={{ marginBottom: 0 }}
              />
            </View>
          </View>

          {thresholds.hasConfiguredThreshold ? (
            <Text style={styles.thresholdHintText}>
              Recommended Minimum for{' '}
              <Text style={{ fontWeight: '700' }}>{selectedCropLabel}</Text>:{' '}
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
              Select a crop above to load its recommended minimum and target
              moisture levels.
            </Text>
          )}

          <AgriButton
            title={loading ? t('checking') : t('check_irrigation')}
            onPress={handleCheck}
            loading={loading}
            icon={
              !loading ? (
                <FontAwesome5 name="search" size={14} color="#FFFFFF" />
              ) : undefined
            }
            style={{ marginTop: 10 }}
          />
        </View>

        {/* 3. FARMER-FRIENDLY MOISTURE VISUALIZATION CARD */}
        <View style={styles.irrigationCard}>
          <View style={styles.cardHeader}>
            <FontAwesome5
              name="tachometer-alt"
              size={20}
              color="#2878ff"
              style={{ marginRight: 10 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.cardHeaderTitle}>Soil Moisture Dashboard</Text>
              <Text style={styles.cardHeaderSubtitle}>
                Visual moisture gauge, crop threshold zones, and soil condition
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

          {/* Official Backend Irrigation Check Result Summary (when checked) */}
          {result && (
            <View style={styles.backendVerifiedBox}>
              <View style={styles.backendVerifiedHeader}>
                <FontAwesome5
                  name={result.irrigationRequired ? 'tint' : 'check-circle'}
                  size={16}
                  color={result.irrigationRequired ? '#2878ff' : '#2e8b57'}
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.backendVerifiedTitle}>
                  {t('irrigation_status')}: {result.status}
                </Text>
              </View>
              <Text style={styles.backendVerifiedMessage}>{result.message}</Text>
            </View>
          )}
        </View>

        {/* 4. WATER REQUIREMENT ESTIMATION CALCULATOR CARD */}
        <View style={styles.irrigationCard}>
          <View style={styles.cardHeader}>
            <FontAwesome5
              name="calculator"
              size={20}
              color={colors.primary}
              style={{ marginRight: 10 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.cardHeaderTitle}>
                Water Requirement Calculator
              </Text>
              <Text style={styles.cardHeaderSubtitle}>
                Estimate water depth (mm) and volume (litres) for your field
              </Text>
            </View>
          </View>

          {/* Current vs Target Moisture Comparison Row */}
          <View style={styles.moistureCompareStrip}>
            <View style={styles.compareCell}>
              <Text style={styles.compareLabel}>Current Moisture</Text>
              <Text style={styles.compareValue}>
                {moistureEvaluation.valid
                  ? `${moistureEvaluation.moisture}%`
                  : '--%'}
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color={colors.textMuted} />
            <View style={styles.compareCell}>
              <Text style={styles.compareLabel}>Min Threshold</Text>
              <Text style={[styles.compareValue, { color: '#DC3545' }]}>
                {thresholds.minThreshold !== null
                  ? `${thresholds.minThreshold}%`
                  : '--%'}
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color={colors.textMuted} />
            <View style={styles.compareCell}>
              <Text style={styles.compareLabel}>Target Moisture</Text>
              <Text style={[styles.compareValue, { color: '#15803D' }]}>
                {thresholds.targetMoisture !== null
                  ? `${thresholds.targetMoisture}%`
                  : '--%'}
              </Text>
            </View>
          </View>

          {/* Field Area & Unit Selection */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Field Area & Unit</Text>
            {areaSourceNote ? (
              <Text style={styles.fieldSourceNote}>{areaSourceNote}</Text>
            ) : null}
            <AgriInput
              placeholder="Enter field area (e.g. 1.5)"
              value={fieldArea}
              onChangeText={(val) => {
                setFieldArea(val);
                setAreaSourceNote('');
              }}
              keyboardType="numeric"
              style={{ marginBottom: 8 }}
            />
            <View style={styles.unitChipsRow}>
              {AREA_UNITS.map((u) => (
                <TouchableOpacity
                  key={u.key}
                  style={[
                    styles.unitChip,
                    areaUnit === u.key && styles.unitChipActive,
                  ]}
                  onPress={() => setAreaUnit(u.key)}
                >
                  <Text
                    style={[
                      styles.unitChipText,
                      areaUnit === u.key && styles.unitChipTextActive,
                    ]}
                  >
                    {u.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Effective Soil Depth (mm) */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>
              Effective Root-Zone Soil Depth (mm)
            </Text>
            <Text style={styles.helperSubtext}>
              Select a typical root depth for your crop or enter your soil depth:
            </Text>
            <View style={styles.unitChipsRow}>
              {SOIL_DEPTH_PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset.valueMm}
                  style={[
                    styles.unitChip,
                    Number(soilDepthMm) === preset.valueMm &&
                      styles.unitChipActive,
                  ]}
                  onPress={() => setSoilDepthMm(String(preset.valueMm))}
                >
                  <Text
                    style={[
                      styles.unitChipText,
                      Number(soilDepthMm) === preset.valueMm &&
                        styles.unitChipTextActive,
                    ]}
                  >
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <AgriInput
              placeholder="Enter effective soil depth in mm (e.g. 450)"
              value={soilDepthMm}
              onChangeText={setSoilDepthMm}
              keyboardType="numeric"
              style={{ marginTop: 8, marginBottom: 0 }}
            />
          </View>

          {/* Optional Irrigation System Efficiency */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>
              Irrigation Efficiency (Optional)
            </Text>
            <View style={styles.unitChipsRow}>
              {IRRIGATION_EFFICIENCY_PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset.key}
                  style={[
                    styles.unitChip,
                    efficiencyPreset === preset.key &&
                      customEfficiency === '' &&
                      styles.unitChipActive,
                  ]}
                  onPress={() => {
                    setEfficiencyPreset(preset.key);
                    setCustomEfficiency('');
                  }}
                >
                  <Text
                    style={[
                      styles.unitChipText,
                      efficiencyPreset === preset.key &&
                        customEfficiency === '' &&
                        styles.unitChipTextActive,
                    ]}
                  >
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <AgriInput
              placeholder="Or enter custom efficiency % (e.g. 85)"
              value={customEfficiency}
              onChangeText={setCustomEfficiency}
              keyboardType="numeric"
              style={{ marginTop: 8, marginBottom: 0 }}
            />
          </View>

          {/* Volumetric Moisture Confirmation Toggle */}
          <View style={styles.volumetricConfirmRow}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.volumetricConfirmTitle}>
                Volumetric Soil Moisture (VWC %)
              </Text>
              <Text style={styles.volumetricConfirmDesc}>
                Water volume estimates apply when soil moisture is measured as
                volumetric percentage.
              </Text>
            </View>
            <Switch
              value={isVolumetricConfirmed}
              onValueChange={setIsVolumetricConfirmed}
              trackColor={{ false: '#CBD5E1', true: colors.primaryLight }}
              thumbColor={isVolumetricConfirmed ? colors.primary : '#F8FAFC'}
            />
          </View>

          {/* Calculation Output or Missing Data Prompt */}
          {waterEstimate.canCalculate ? (
            <View style={styles.calcOutputBox}>
              {waterEstimate.noWaterNeeded ? (
                <View style={styles.zeroWaterBanner}>
                  <FontAwesome5
                    name="check-circle"
                    size={18}
                    color="#15803D"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.zeroWaterText}>
                    Your soil moisture ({waterEstimate.currentMoisture}%)
                    already meets or exceeds the target (
                    {waterEstimate.targetMoisture}%). 0 Litres of additional
                    water is needed.
                  </Text>
                </View>
              ) : null}

              <View style={styles.calcMetricsGrid}>
                <View style={styles.calcMetricCard}>
                  <Text style={styles.calcMetricLabel}>Water Deficit</Text>
                  <Text style={styles.calcMetricValue}>
                    {waterEstimate.waterDeficitMm} mm
                  </Text>
                  <Text style={styles.calcMetricSub}>
                    ({waterEstimate.moistureDeficitPercent}% deficit ×{' '}
                    {waterEstimate.soilDepthMm} mm depth)
                  </Text>
                </View>

                <View style={styles.calcMetricCard}>
                  <Text style={styles.calcMetricLabel}>Net Water Volume</Text>
                  <Text style={[styles.calcMetricValue, { color: '#2878ff' }]}>
                    {waterEstimate.netWaterLitres.toLocaleString('en-IN')} L
                  </Text>
                  <Text style={styles.calcMetricSub}>
                    {waterEstimate.netWaterCubicMeters} m³ over{' '}
                    {waterEstimate.areaSqMeters.toLocaleString('en-IN')} m²
                  </Text>
                </View>
              </View>

              {waterEstimate.appliedWaterLitres !== null && (
                <View style={styles.appliedWaterBox}>
                  <Text style={styles.appliedWaterTitle}>
                    Total Water to Apply (at {waterEstimate.irrigationEfficiency}
                    % Efficiency):
                  </Text>
                  <Text style={styles.appliedWaterValue}>
                    {waterEstimate.appliedWaterLitres.toLocaleString('en-IN')}{' '}
                    Litres ({waterEstimate.appliedWaterCubicMeters} m³ |{' '}
                    {waterEstimate.appliedWaterMm} mm depth)
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.missingCalcPrompt}>
              <Ionicons
                name="information-circle-outline"
                size={20}
                color="#B45309"
                style={{ marginRight: 8 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.missingCalcTitle}>
                  Enter Field Details to Calculate Water Volume
                </Text>
                <Text style={styles.missingCalcDesc}>
                  {waterEstimate.reason}
                </Text>
              </View>
            </View>
          )}

          {/* Assumptions & Formula Explanation */}
          <View style={styles.assumptionsBox}>
            <Text style={styles.assumptionsTitle}>
              How This Estimate Is Calculated
            </Text>
            <Text style={styles.assumptionsItem}>
              • Water Deficit (mm) = max(0, Target Fraction − Current Fraction)
              × Effective Root Depth (mm).
            </Text>
            <Text style={styles.assumptionsItem}>
              • Net Water Volume (L) = Water Deficit (mm) × Field Area (m²),
              since 1 mm over 1 m² = 1 Litre.
            </Text>
            <Text style={styles.assumptionsItem}>
              • This estimate is a general guide assuming uniform moisture across
              the root zone and does not account for upcoming rainfall.
            </Text>
          </View>
        </View>

        {/* 5. MOISTURE HISTORY SECTION */}
        <View style={styles.irrigationCard}>
          <View style={styles.cardHeader}>
            <FontAwesome5
              name="history"
              size={18}
              color={colors.primary}
              style={{ marginRight: 10 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.cardHeaderTitle}>Moisture Check History</Text>
              <Text style={styles.cardHeaderSubtitle}>
                Recent checks saved on this device
              </Text>
            </View>
            {localHistory.length > 0 && (
              <TouchableOpacity
                onPress={async () => {
                  await clearLocalMoistureHistory();
                  setLocalHistory([]);
                }}
              >
                <Text style={styles.clearHistoryText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Time Filters */}
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
                  historyFilter === tab.key && styles.filterTabActive,
                ]}
                onPress={() => setHistoryFilter(tab.key)}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    historyFilter === tab.key && styles.filterTabTextActive,
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
                  <View key={item.id} style={styles.historyRowItem}>
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

      {/* Crop Selection Modal */}
      <Modal visible={cropModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('select_crop')}</Text>
              <TouchableOpacity onPress={() => setCropModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 420 }}>
              {CROPS_LIST.map((c) => (
                <TouchableOpacity
                  key={c.value}
                  style={[
                    styles.cropListItem,
                    selectedCrop === c.value && styles.cropListItemActive,
                  ]}
                  onPress={() => handleSelectCrop(c.value)}
                >
                  <Text
                    style={[
                      styles.cropListText,
                      selectedCrop === c.value && styles.cropListTextActive,
                    ]}
                  >
                    {c.label}
                  </Text>
                  {selectedCrop === c.value && (
                    <Ionicons
                      name="checkmark"
                      size={18}
                      color={colors.primary}
                    />
                  )}
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
