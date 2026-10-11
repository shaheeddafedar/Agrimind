import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import {
  AREA_UNITS,
  SOIL_DEPTH_PRESETS,
  IRRIGATION_EFFICIENCY_PRESETS,
  getCropThresholds,
  evaluateMoistureCondition,
  calculateWaterRequirement,
  evaluateSensorFreshness,
  evaluateThresholdAlertState,
  polarToCartesian,
  parseValidNumber,
  loadWebPrefs,
  saveWebPrefs,
  loadWebAlertState,
  saveWebAlertState,
  loadWebMoistureHistory,
  appendWebMoistureHistory,
  clearWebMoistureHistory,
} from '../services/irrigationCalculator';
import '../assets/css/smart-irrigation.css';

const CROPS = [
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

const SmartIrrigation = ({ user }) => {
  const { t } = useTranslation();

  // Core Form & API Check State
  const [formData, setFormData] = useState({
    crop: '',
    moisture: '',
    targetMoisture: '',
  });
  const [dataSource, setDataSource] = useState('manual'); // 'sensor' | 'manual'
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Sensor Status State
  const [sensorStatus, setSensorStatus] = useState(() =>
    evaluateSensorFreshness(null)
  );
  const [syncingSensor, setSyncingSensor] = useState(false);

  // Notification & Internal Cooldown Tracking
  // Persisted storage is only used for cooldown deduplication, never to show a static banner on mount.
  const alertMemoryRef = useRef({
    ...loadWebAlertState(),
    activeAlert: false,
    bannerType: 'NONE',
    message: '',
  });
  const [notifPrefs, setNotifPrefs] = useState(() => loadWebPrefs());
  const [alertState, setAlertState] = useState(INITIAL_ALERT_BANNER);
  const [showNotifSettings, setShowNotifSettings] = useState(false);
  const [browserPermission, setBrowserPermission] = useState(() =>
    typeof window !== 'undefined' && 'Notification' in window
      ? window.Notification.permission
      : 'unsupported'
  );

  // Water Requirement Calculator State
  const [fieldArea, setFieldArea] = useState('');
  const [areaUnit, setAreaUnit] = useState('hectare');
  const [areaSourceNote, setAreaSourceNote] = useState('');
  const [soilDepthMm, setSoilDepthMm] = useState('');
  const [efficiencyPreset, setEfficiencyPreset] = useState('none');
  const [customEfficiency, setCustomEfficiency] = useState('');
  const [isVolumetricConfirmed, setIsVolumetricConfirmed] = useState(true);

  // Local Moisture Check History State
  const [historyList, setHistoryList] = useState(() => loadWebMoistureHistory());
  const [historyFilter, setHistoryFilter] = useState('all'); // 'all' | '24h' | '7d'

  const selectedCropObj = CROPS.find((c) => c.value === formData.crop);
  const selectedCropLabel = selectedCropObj ? selectedCropObj.label : '';

  // Compute dynamic thresholds for the selected crop (null when no crop is selected)
  const thresholds = useMemo(() => {
    const apiMinForSameCrop =
      result &&
      result.crop &&
      result.crop.toLowerCase().trim() === formData.crop.toLowerCase().trim()
        ? result.threshold
        : null;

    return getCropThresholds(
      formData.crop,
      apiMinForSameCrop,
      formData.targetMoisture
    );
  }, [formData.crop, result, formData.targetMoisture]);

  // Evaluate current soil moisture condition (Dry, Optimal, Too Wet)
  const moistureEval = useMemo(() => {
    return evaluateMoistureCondition(
      formData.moisture,
      thresholds.minThreshold,
      thresholds.targetMoisture,
      thresholds.tooWetThreshold,
      selectedCropLabel
    );
  }, [formData.moisture, thresholds, selectedCropLabel]);

  // Determine effective irrigation efficiency
  const effectiveEfficiency = useMemo(() => {
    if (efficiencyPreset === 'custom') {
      return parseValidNumber(customEfficiency);
    }
    const found = IRRIGATION_EFFICIENCY_PRESETS.find(
      (p) => p.key === efficiencyPreset
    );
    return found ? found.efficiency : null;
  }, [efficiencyPreset, customEfficiency]);

  // Calculate Water Deficit (mm) and Water Volume (L / m³)
  const waterEstimate = useMemo(() => {
    return calculateWaterRequirement({
      currentMoisture: formData.moisture,
      targetMoisture: thresholds.targetMoisture,
      fieldArea,
      areaUnit,
      soilDepthMm,
      irrigationEfficiency: effectiveEfficiency,
      isVolumetricConfirmed,
    });
  }, [
    formData.moisture,
    thresholds.targetMoisture,
    fieldArea,
    areaUnit,
    soilDepthMm,
    effectiveEfficiency,
    isVolumetricConfirmed,
  ]);

  // Determine reading status for clear alert labeling
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

  // Evaluate threshold alert state dynamically
  const evaluateAlert = useCallback(
    (
      moistureValue,
      minThresh,
      cropKey,
      cropLabelStr,
      readingStatus = 'normal',
      commitSingleDigit = true
    ) => {
      const parsedM = parseValidNumber(moistureValue);
      const parsedT = parseValidNumber(minThresh);

      // Do not show a warning before both a valid reading and a configured crop threshold exist
      if (
        !cropKey ||
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

      // Avoid arming a persistent alert on the first keystroke of a 2-digit number (e.g., typing '4' of '45')
      // unless committed via blur, submit, sensor sync, or a 2-digit reading.
      if (!commitSingleDigit && parsedM > 0 && parsedM < 10 && parsedM < parsedT) {
        const previewState = evaluateThresholdAlertState(
          alertMemoryRef.current,
          {
            crop: cropKey,
            cropLabel: cropLabelStr,
            moisture: parsedM,
            threshold: parsedT,
            readingStatus,
            notificationsEnabled: false,
          }
        );
        setAlertState(previewState);
        return;
      }

      const next = evaluateThresholdAlertState(alertMemoryRef.current, {
        crop: cropKey,
        cropLabel: cropLabelStr,
        moisture: parsedM,
        threshold: parsedT,
        readingStatus,
        notificationsEnabled: notifPrefs.notificationsEnabled,
      });

      alertMemoryRef.current = next;
      setAlertState(next);
      saveWebAlertState({
        crop: next.crop,
        lastNotifiedAt: next.lastNotifiedAt,
        lastAlertMoisture: next.lastAlertMoisture,
      });

      if (
        next.shouldTriggerNotification &&
        notifPrefs.browserNotificationsEnabled &&
        typeof window !== 'undefined' &&
        'Notification' in window &&
        window.Notification.permission === 'granted'
      ) {
        try {
          new window.Notification('Soil Moisture Alert — AgriMind', {
            body: next.message,
          });
        } catch {
          // ignore notification dispatch error
        }
      }
    },
    [notifPrefs]
  );

  // Sync live sensor from existing GET /api/sensor/data
  const syncLiveSensor = useCallback(
    async (applyToInput = false) => {
      setSyncingSensor(true);
      try {
        const res = await api.get('/sensor/data');
        const freshness = evaluateSensorFreshness(res.data);
        setSensorStatus(freshness);

        if (
          freshness.hasCachedReading &&
          freshness.moisture !== null &&
          applyToInput
        ) {
          const liveM = String(freshness.moisture);
          setFormData((prev) => ({
            ...prev,
            moisture: liveM,
          }));
          setDataSource('sensor');

          const cropInfo = getCropThresholds(
            formData.crop,
            null,
            formData.targetMoisture
          );
          const cropReadable =
            CROPS.find((c) => c.value === formData.crop)?.label || '';

          evaluateAlert(
            freshness.moisture,
            cropInfo.minThreshold,
            formData.crop,
            cropReadable,
            freshness.isStale ? 'stale' : 'normal',
            true
          );
        }
      } catch {
        setSensorStatus(evaluateSensorFreshness(null));
      } finally {
        setSyncingSensor(false);
      }
    },
    [formData.crop, formData.targetMoisture, evaluateAlert]
  );

  // Initial load: check live sensor and pre-fill field area if available from recent consultation
  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        const res = await api.get('/sensor/data');
        if (!mounted) return;
        const freshness = evaluateSensorFreshness(res.data);
        setSensorStatus(freshness);

        if (freshness.isLiveAvailable && freshness.moisture !== null) {
          const initialMoisture = String(freshness.moisture);
          setFormData((prev) => ({
            ...prev,
            moisture: prev.moisture || initialMoisture,
          }));
          setDataSource('sensor');
        }
      } catch {
        if (mounted) {
          setSensorStatus(evaluateSensorFreshness(null));
        }
      }

      if (user?._id) {
        try {
          const recRes = await api.get(`/recommend/${user._id}`);
          if (!mounted) return;
          const recs = Array.isArray(recRes.data)
            ? recRes.data
            : Array.isArray(recRes.data?.recommendations)
            ? recRes.data.recommendations
            : [];

          if (recs.length > 0) {
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

    bootstrap();
    return () => {
      mounted = false;
    };
  }, [user?._id]);

  // Handlers
  const handleCropChange = (e) => {
    const nextCrop = e.target.value;
    setFormData((prev) => ({
      ...prev,
      crop: nextCrop,
    }));
    // Clear previous crop's API check result so its threshold does not stick
    setResult(null);
    setErrorMessage('');

    const nextThresh = getCropThresholds(
      nextCrop,
      null,
      formData.targetMoisture
    );
    const nextCropLabel =
      CROPS.find((c) => c.value === nextCrop)?.label || nextCrop;

    evaluateAlert(
      formData.moisture,
      nextThresh.minThreshold,
      nextCrop,
      nextCropLabel,
      getReadingStatus(),
      true
    );
  };

  const handleMoistureChange = (e) => {
    const val = e.target.value;
    setFormData((prev) => ({
      ...prev,
      moisture: val,
    }));
    setDataSource('manual');
    setErrorMessage('');

    evaluateAlert(
      val,
      thresholds.minThreshold,
      formData.crop,
      selectedCropLabel,
      'normal',
      false
    );
  };

  const handleMoistureBlur = () => {
    evaluateAlert(
      formData.moisture,
      thresholds.minThreshold,
      formData.crop,
      selectedCropLabel,
      getReadingStatus(),
      true
    );
  };

  const handleTargetMoistureChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      targetMoisture: e.target.value,
    }));
  };

  // Submit Irrigation Check (preserves existing backend POST /api/irrigation/check)
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.crop) {
      setErrorMessage('Please select a crop to check irrigation status.');
      return;
    }

    setErrorMessage('');
    setLoading(true);
    setResult(null);

    try {
      let moistureToUse = formData.moisture;
      let usedSource = dataSource;
      let latestFreshness = sensorStatus;

      // 1. Try live sensor first if connected
      try {
        const sensorResponse = await api.get('/sensor/data');
        latestFreshness = evaluateSensorFreshness(sensorResponse.data);
        setSensorStatus(latestFreshness);

        if (
          sensorResponse.data?.success &&
          sensorResponse.data?.available &&
          sensorResponse.data?.connected &&
          sensorResponse.data?.data &&
          sensorResponse.data.data.moisture !== undefined &&
          sensorResponse.data.data.moisture !== null
        ) {
          const sensorMoisture = sensorResponse.data.data.moisture;
          setFormData((prev) => ({
            ...prev,
            moisture: String(sensorMoisture),
          }));
          moistureToUse = sensorMoisture;
          usedSource = 'sensor';
          setDataSource('sensor');
        }
      } catch {
        // Live sensor unreachable; proceed with farmer's entered moisture value
      }

      // 2. Validate moisture
      const parsedVal = parseValidNumber(moistureToUse);
      if (parsedVal === null || parsedVal < 0 || parsedVal > 100) {
        setErrorMessage(
          'Please enter a valid soil moisture percentage between 0% and 100%.'
        );
        setLoading(false);
        return;
      }

      // 3. Call existing POST /api/irrigation/check
      let apiData = null;
      try {
        const response = await api.post('/irrigation/check', {
          crop: formData.crop,
          moisture: parsedVal,
        });

        if (
          response.data &&
          typeof response.data === 'object' &&
          response.data.success
        ) {
          apiData = response.data;
        }
      } catch (apiErr) {
        if (apiErr.response?.status === 400 && apiErr.response?.data?.message) {
          throw apiErr;
        }
      }

      // Safe frontend fallback if session redirect returned HTML instead of JSON
      if (!apiData) {
        if (!thresholds.hasConfiguredThreshold) {
          setErrorMessage(
            `Threshold configuration is unavailable for ${selectedCropLabel || formData.crop}.`
          );
          setLoading(false);
          return;
        }
        const fallbackThreshold = thresholds.minThreshold;
        const irrigationRequired = parsedVal < fallbackThreshold;
        apiData = {
          success: true,
          crop: formData.crop,
          soilMoisture: parsedVal,
          threshold: fallbackThreshold,
          irrigationRequired,
          status: irrigationRequired
            ? 'Irrigation Recommended'
            : 'Irrigation Not Needed',
          message: irrigationRequired
            ? `Your soil moisture is ${parsedVal}%, below the recommended minimum of ${fallbackThreshold}% for ${selectedCropLabel || formData.crop}. Irrigation may be needed.`
            : `Your soil moisture is ${parsedVal}%, which meets the recommended minimum of ${fallbackThreshold}% for ${selectedCropLabel || formData.crop}. No irrigation is needed right now.`,
        };
      }

      setResult(apiData);

      const activeMin =
        apiData.threshold !== undefined
          ? Number(apiData.threshold)
          : thresholds.minThreshold;

      const updatedThresholds = getCropThresholds(
        formData.crop,
        activeMin,
        formData.targetMoisture
      );

      const evalRes = evaluateMoistureCondition(
        parsedVal,
        updatedThresholds.minThreshold,
        updatedThresholds.targetMoisture,
        updatedThresholds.tooWetThreshold,
        selectedCropLabel
      );

      evaluateAlert(
        parsedVal,
        updatedThresholds.minThreshold,
        formData.crop,
        selectedCropLabel,
        getReadingStatus(usedSource, latestFreshness),
        true
      );

      const cropReadable = selectedCropLabel || formData.crop;

      const nextHistory = appendWebMoistureHistory({
        crop: formData.crop,
        cropLabel: cropReadable,
        moisture: parsedVal,
        threshold: updatedThresholds.minThreshold,
        targetMoisture: updatedThresholds.targetMoisture,
        condition: evalRes.condition,
        source: usedSource,
      });
      setHistoryList(nextHistory);
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          'Unable to check irrigation status right now.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Notification preference toggles
  const handleTogglePref = (key, checked) => {
    const nextPrefs = saveWebPrefs({
      ...notifPrefs,
      [key]: checked,
    });
    setNotifPrefs(nextPrefs);
  };

  const handleRequestBrowserPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await window.Notification.requestPermission();
        setBrowserPermission(perm);
      } catch {
        setBrowserPermission('denied');
      }
    }
  };

  // Filtered history list
  const filteredHistory = useMemo(() => {
    if (historyFilter === 'all' || historyList.length === 0) return historyList;
    const referenceTime = new Date(historyList[0].timestamp).getTime();
    if (!Number.isFinite(referenceTime)) return historyList;
    return historyList.filter((item) => {
      const ts = new Date(item.timestamp).getTime();
      if (!Number.isFinite(ts)) return false;
      if (historyFilter === '24h')
        return referenceTime - ts <= 24 * 60 * 60 * 1000;
      if (historyFilter === '7d')
        return referenceTime - ts <= 7 * 24 * 60 * 60 * 1000;
      return true;
    });
  }, [historyList, historyFilter]);

  // Circular SVG Gauge Calculations (200x200, cx=100, cy=100, r=76)
  const radius = 76;
  const circumference = 2 * Math.PI * radius;
  const clampedMoisture = moistureEval.valid
    ? Math.max(0, Math.min(100, moistureEval.moisture))
    : 0;
  const strokeDashoffset =
    circumference - (circumference * clampedMoisture) / 100;

  const gaugeColor =
    moistureEval.condition === 'DRY'
      ? '#DC3545'
      : moistureEval.condition === 'OPTIMAL'
      ? '#2E8B57'
      : moistureEval.condition === 'TOO_WET'
      ? '#2878ff'
      : '#64748B';

  const hasCropThresholds =
    thresholds.hasConfiguredThreshold &&
    thresholds.minThreshold !== null &&
    thresholds.targetMoisture !== null &&
    thresholds.tooWetThreshold !== null;

  const minTickInner = hasCropThresholds
    ? polarToCartesian(100, 100, 64, thresholds.minThreshold)
    : null;
  const minTickOuter = hasCropThresholds
    ? polarToCartesian(100, 100, 88, thresholds.minThreshold)
    : null;
  const targetTickInner =
    thresholds.targetMoisture !== null
      ? polarToCartesian(100, 100, 64, thresholds.targetMoisture)
      : null;
  const targetTickOuter =
    thresholds.targetMoisture !== null
      ? polarToCartesian(100, 100, 88, thresholds.targetMoisture)
      : null;

  // Droplet SVG fill geometry
  const dropletFillHeight = moistureEval.valid
    ? Math.max(6, (clampedMoisture / 100) * 84)
    : 0;
  const dropletFillY = 92 - dropletFillHeight;
  const dropletTargetY =
    thresholds.targetMoisture !== null
      ? 92 - (thresholds.targetMoisture / 100) * 84
      : null;

  // Horizontal threshold zone widths (when crop thresholds exist)
  const dryZoneWidth = hasCropThresholds
    ? Math.max(5, Math.min(85, thresholds.minThreshold))
    : 33;
  const optimalZoneWidth = hasCropThresholds
    ? Math.max(
        10,
        Math.min(
          90 - dryZoneWidth,
          thresholds.tooWetThreshold - thresholds.minThreshold
        )
      )
    : 34;
  const wetZoneWidth = Math.max(5, 100 - dryZoneWidth - optimalZoneWidth);

  return (
    <main className="page-content">
      <div className="page-header irrigation-page-header">
        <div className="container">
          <h1>
            <i className="fas fa-tint irrigation-title-icon"></i>{' '}
            {t('irrigation_title', 'Smart Irrigation')}
          </h1>

          <p>
            {t(
              'irrigation_desc',
              'Check your crop soil moisture status, receive low-moisture alerts, and estimate field water needs.'
            )}
          </p>
        </div>
      </div>

      <div className="container irrigation-content">
        {/* 1. DYNAMIC LOW-MOISTURE WARNING & RECOVERY BANNERS */}
        {alertState.bannerType === 'LOW_MOISTURE_WARNING' &&
          alertState.message && (
            <div
              id="low-moisture-alert-banner"
              className="alert-banner alert-warning-banner"
              role="alert"
            >
              <div className="alert-banner-header">
                <i className="fas fa-exclamation-triangle"></i>
                <strong>Low Soil Moisture Alert</strong>
              </div>
              <p>{alertState.message}</p>
            </div>
          )}

        {alertState.bannerType === 'RECOVERED' && alertState.message && (
          <div
            id="moisture-recovery-banner"
            className="alert-banner alert-recovery-banner"
            role="status"
          >
            <div className="alert-banner-header">
              <i className="fas fa-check-circle"></i>
              <strong>Soil Moisture Recovered</strong>
            </div>
            <p>{alertState.message}</p>
          </div>
        )}

        {/* 2. CHECK IRRIGATION FORM & COMPACT SENSOR INDICATOR CARD */}
        <div className="irrigation-card">
          <div className="irrigation-card-header irrigation-header-with-actions">
            <div className="header-left-group">
              <i className="fas fa-water"></i>
              <div>
                <h2>
                  {t('irrigation_check_title', 'Check Irrigation Requirement')}
                </h2>
                <p>
                  {t(
                    'irrigation_check_desc',
                    'Select your crop and enter or sync your current soil moisture reading.'
                  )}
                </p>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-outline-sm"
              onClick={() => setShowNotifSettings((prev) => !prev)}
            >
              <i
                className={`fas ${
                  notifPrefs.notificationsEnabled ? 'fa-bell' : 'fa-bell-slash'
                }`}
              ></i>{' '}
              Alert Settings
            </button>
          </div>

          {/* Compact, Accurate Sensor Status Indicator */}
          <div className="compact-sensor-strip" id="sensor-status-indicator">
            <div className="compact-sensor-left">
              <span
                className={`sensor-dot ${
                  sensorStatus.statusType === 'LIVE'
                    ? 'sensor-dot-live'
                    : sensorStatus.statusType === 'STALE' ||
                      sensorStatus.statusType === 'CACHED_OFFLINE'
                    ? 'sensor-dot-stale'
                    : 'sensor-dot-offline'
                }`}
              ></span>
              <span className="compact-sensor-text">
                <strong>{sensorStatus.statusLabel}</strong>
                {sensorStatus.hasCachedReading &&
                sensorStatus.moisture !== null ? (
                  <span>
                    {' '}
                    ({sensorStatus.moisture}%
                    {sensorStatus.updatedAt
                      ? `, updated ${new Date(
                          sensorStatus.updatedAt
                        ).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}`
                      : ''}
                    )
                  </span>
                ) : null}
              </span>
            </div>

            <button
              type="button"
              className="btn btn-outline-sm"
              onClick={() => syncLiveSensor(true)}
              disabled={syncingSensor}
            >
              <i
                className={`fas fa-sync-alt ${syncingSensor ? 'fa-spin' : ''}`}
              ></i>{' '}
              {syncingSensor ? 'Checking...' : 'Check Sensor'}
            </button>
          </div>

          {showNotifSettings && (
            <div className="notif-settings-panel">
              <h4>
                <i className="fas fa-bell"></i> Soil Moisture Alert Preferences
              </h4>
              <div className="notif-pref-row">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={Boolean(notifPrefs.notificationsEnabled)}
                    onChange={(e) =>
                      handleTogglePref('notificationsEnabled', e.target.checked)
                    }
                  />
                  <span>Show low-moisture alerts on this page</span>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={Boolean(notifPrefs.browserNotificationsEnabled)}
                    onChange={(e) =>
                      handleTogglePref(
                        'browserNotificationsEnabled',
                        e.target.checked
                      )
                    }
                  />
                  <span>Send browser notifications while this page is open</span>
                </label>
              </div>

              {browserPermission !== 'granted' &&
                browserPermission !== 'unsupported' && (
                  <div className="notif-permission-row">
                    <span className="notif-status-tag">
                      Browser notification permission: {browserPermission}
                    </span>
                    <button
                      type="button"
                      className="btn btn-outline-sm"
                      onClick={handleRequestBrowserPermission}
                    >
                      Allow Browser Notifications
                    </button>
                  </div>
                )}

              <p className="notif-limitation-note">
                <i className="fas fa-info-circle"></i> Alerts are checked when
                you enter a reading or sync your sensor while this page is open.
              </p>
            </div>
          )}

          {errorMessage && (
            <div className="irrigation-error-box" role="alert">
              <i className="fas fa-exclamation-circle"></i> {errorMessage}
            </div>
          )}

          <form id="irrigation-form" onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="irrigation-crop">
                <i className="fas fa-seedling"></i> {t('crop', 'Crop')}
              </label>

              <select
                id="irrigation-crop"
                required
                value={formData.crop}
                onChange={handleCropChange}
              >
                <option value="">{t('select_crop', 'Select Crop')}</option>
                {CROPS.map((crop) => (
                  <option key={crop.value} value={crop.value}>
                    {crop.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="soil-moisture">
                <i className="fas fa-tint" style={{ color: '#2196F3' }}></i>{' '}
                {t('soil_moisture', 'Current Soil Moisture (%)')}
              </label>

              <input
                type="number"
                id="soil-moisture"
                min="0"
                max="100"
                step="0.1"
                placeholder={t('soil_moisture_placeholder', 'e.g. 28')}
                value={formData.moisture}
                onChange={handleMoistureChange}
                onBlur={handleMoistureBlur}
              />
            </div>

            <div className="form-group">
              <label htmlFor="target-moisture">
                <i className="fas fa-bullseye"></i> Target Moisture Level (%)
              </label>

              <input
                type="number"
                id="target-moisture"
                min={thresholds.minThreshold ?? 10}
                max="95"
                step="1"
                placeholder={
                  thresholds.recommendedTarget !== null
                    ? `Recommended for ${selectedCropLabel}: ${thresholds.recommendedTarget}%`
                    : 'Select a crop or enter custom target %'
                }
                value={formData.targetMoisture}
                onChange={handleTargetMoistureChange}
              />
              {thresholds.targetBelowMin && (
                <small className="field-warning-note">
                  Target moisture should be at least the minimum recommended
                  level ({thresholds.minThreshold}%). Using{' '}
                  {thresholds.minThreshold}%.
                </small>
              )}
            </div>

            <div className="form-group">
              <label>
                <i className="fas fa-info-circle"></i> Crop Moisture
                Recommendations
              </label>
              {hasCropThresholds ? (
                <div
                  className="threshold-preview-box"
                  id="crop-thresholds-display"
                >
                  <span>
                    Recommended Minimum (Read-only):{' '}
                    <strong className="text-danger">
                      {thresholds.minThreshold}%
                    </strong>
                  </span>
                  <span>
                    Target Moisture:{' '}
                    <strong className="text-success">
                      {thresholds.targetMoisture}%
                    </strong>{' '}
                    <small className="threshold-type-tag">
                      {formData.targetMoisture !== ''
                        ? '(Custom)'
                        : '(Recommended)'}
                    </small>
                  </span>
                </div>
              ) : (
                <div
                  className="threshold-preview-box threshold-preview-empty"
                  id="crop-thresholds-display"
                >
                  <span>
                    {formData.crop
                      ? `Threshold configuration is unavailable for ${selectedCropLabel || formData.crop}.`
                      : 'Select a crop to load its recommended minimum and target moisture levels.'}
                  </span>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="btn irrigation-check-btn"
              id="irrigation-check-btn"
              disabled={loading}
            >
              {loading ? (
                <i className="fas fa-spinner fa-spin"></i>
              ) : (
                <i className="fas fa-search"></i>
              )}{' '}
              {loading
                ? t('checking', 'Checking...')
                : t('check_irrigation', 'Check Irrigation')}
            </button>
          </form>
        </div>

        {/* 3. SOIL MOISTURE DASHBOARD & VISUALIZATION CARD */}
        <div className="irrigation-card">
          <div className="irrigation-card-header">
            <i className="fas fa-tachometer-alt"></i>
            <div>
              <h2>Soil Moisture Dashboard</h2>
              <p>
                Visual moisture gauge, soil condition, and recommended crop
                moisture zones.
              </p>
            </div>
          </div>

          <div className="visual-dashboard-grid">
            {/* Circular SVG Gauge */}
            <div className="gauge-panel">
              <div className="circular-gauge-container">
                <svg
                  width="200"
                  height="200"
                  viewBox="0 0 200 200"
                  className="moisture-gauge-svg"
                >
                  <g transform="rotate(-90 100 100)">
                    <circle
                      cx="100"
                      cy="100"
                      r={radius}
                      fill="none"
                      stroke="#E2E8F0"
                      strokeWidth="18"
                    />
                    <circle
                      id="gauge-progress-circle"
                      cx="100"
                      cy="100"
                      r={radius}
                      fill="none"
                      stroke={gaugeColor}
                      strokeWidth="18"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                    />
                  </g>
                  {/* Min Threshold Tick (only rendered when crop threshold is available) */}
                  {minTickInner && minTickOuter && (
                    <line
                      x1={minTickInner.x}
                      y1={minTickInner.y}
                      x2={minTickOuter.x}
                      y2={minTickOuter.y}
                      stroke="#DC3545"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                  )}
                  {/* Target Level Tick */}
                  {targetTickInner && targetTickOuter && (
                    <line
                      x1={targetTickInner.x}
                      y1={targetTickInner.y}
                      x2={targetTickOuter.x}
                      y2={targetTickOuter.y}
                      stroke="#15803D"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                  )}
                </svg>

                <div className="gauge-center-label">
                  <span
                    className="gauge-big-number"
                    style={{ color: gaugeColor }}
                  >
                    {moistureEval.valid ? `${moistureEval.moisture}%` : '--%'}
                  </span>
                  <span
                    className={`condition-pill ${
                      moistureEval.condition === 'DRY'
                        ? 'condition-dry'
                        : moistureEval.condition === 'OPTIMAL'
                        ? 'condition-optimal'
                        : moistureEval.condition === 'TOO_WET'
                        ? 'condition-wet'
                        : 'condition-unknown'
                    }`}
                  >
                    {moistureEval.label}
                  </span>
                  <small className="gauge-crop-sub">
                    {selectedCropLabel || 'No crop selected'}
                  </small>
                </div>
              </div>

              <div className="gauge-ring-legend">
                <span>
                  <i className="fas fa-minus" style={{ color: '#DC3545' }}></i>{' '}
                  Min:{' '}
                  {thresholds.minThreshold !== null
                    ? `${thresholds.minThreshold}%`
                    : '--%'}
                </span>
                <span>
                  <i className="fas fa-minus" style={{ color: '#15803D' }}></i>{' '}
                  Target:{' '}
                  {thresholds.targetMoisture !== null
                    ? `${thresholds.targetMoisture}%`
                    : '--%'}
                </span>
              </div>
            </div>

            {/* Water Droplet Graphic + KPIs */}
            <div className="droplet-and-kpis-panel">
              <div className="droplet-visual-card">
                <svg
                  width="76"
                  height="96"
                  viewBox="0 0 80 100"
                  className="droplet-svg"
                >
                  <defs>
                    <clipPath id="reactDropletClip">
                      <path d="M40 6 C40 6 10 46 10 68 C10 85 23.4 96 40 96 C56.6 96 70 85 70 68 C70 46 40 6 40 6 Z" />
                    </clipPath>
                  </defs>
                  <path
                    d="M40 6 C40 6 10 46 10 68 C10 85 23.4 96 40 96 C56.6 96 70 85 70 68 C70 46 40 6 40 6 Z"
                    fill="#EFF6FF"
                  />
                  {moistureEval.valid && (
                    <rect
                      x="0"
                      y={dropletFillY}
                      width="80"
                      height={dropletFillHeight + 8}
                      fill="#2878ff"
                      opacity="0.82"
                      clipPath="url(#reactDropletClip)"
                    />
                  )}
                  {dropletTargetY !== null && (
                    <line
                      x1="10"
                      y1={dropletTargetY}
                      x2="70"
                      y2={dropletTargetY}
                      stroke="#15803D"
                      strokeWidth="2"
                      strokeDasharray="4,3"
                      clipPath="url(#reactDropletClip)"
                    />
                  )}
                  <path
                    d="M40 6 C40 6 10 46 10 68 C10 85 23.4 96 40 96 C56.6 96 70 85 70 68 C70 46 40 6 40 6 Z"
                    fill="none"
                    stroke="#2878ff"
                    strokeWidth="3"
                  />
                </svg>

                <div className="droplet-info">
                  <h4>
                    {moistureEval.valid && moistureEval.hasThresholds
                      ? moistureEval.condition === 'DRY'
                        ? 'Dry — Irrigation May Be Needed'
                        : moistureEval.condition === 'TOO_WET'
                        ? 'Too Wet — Avoid Watering'
                        : 'Optimal Soil Moisture'
                      : 'Soil Moisture Guidance'}
                  </h4>
                  <p>{moistureEval.statusMessage}</p>
                  {waterEstimate.canCalculate && (
                    <div className="droplet-volume-pill">
                      {waterEstimate.noWaterNeeded
                        ? 'Estimated Water Requirement: 0 L'
                        : `Estimated Net Water: ${waterEstimate.netWaterLitres.toLocaleString(
                            'en-IN'
                          )} L (${waterEstimate.netWaterCubicMeters} m³)`}
                    </div>
                  )}
                </div>
              </div>

              <div className="dashboard-kpi-grid">
                <div className="kpi-mini-card">
                  <span className="kpi-mini-label">Current Moisture</span>
                  <strong>
                    {moistureEval.valid ? `${moistureEval.moisture}%` : '--%'}
                  </strong>
                </div>
                <div className="kpi-mini-card">
                  <span className="kpi-mini-label">Minimum Threshold</span>
                  <strong className="text-danger">
                    {thresholds.minThreshold !== null
                      ? `${thresholds.minThreshold}%`
                      : '--%'}
                  </strong>
                </div>
                <div className="kpi-mini-card">
                  <span className="kpi-mini-label">Target Moisture</span>
                  <strong className="text-success">
                    {thresholds.targetMoisture !== null
                      ? `${thresholds.targetMoisture}%`
                      : '--%'}
                  </strong>
                </div>
                <div className="kpi-mini-card">
                  <span className="kpi-mini-label">Soil Condition</span>
                  <strong style={{ color: gaugeColor }}>
                    {moistureEval.label}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Horizontal Threshold Spectrum Bar */}
          <div className="threshold-bar-wrapper">
            <div className="threshold-bar-header">
              <strong>Soil Moisture Zones (0% – 100%)</strong>
              <span>
                {hasCropThresholds
                  ? `Zones for ${selectedCropLabel}`
                  : 'Select a crop to view its moisture zones'}
              </span>
            </div>
            <div className="zone-bar-outer">
              <div className="zone-bar-track">
                <div
                  className="zone-segment zone-dry"
                  style={{ width: `${dryZoneWidth}%` }}
                >
                  <span>
                    {hasCropThresholds
                      ? `Dry (<${thresholds.minThreshold}%)`
                      : 'Dry'}
                  </span>
                </div>
                <div
                  className="zone-segment zone-optimal"
                  style={{ width: `${optimalZoneWidth}%` }}
                >
                  <span>
                    {hasCropThresholds
                      ? `Optimal (${thresholds.minThreshold}%–${thresholds.tooWetThreshold}%)`
                      : 'Optimal'}
                  </span>
                </div>
                <div
                  className="zone-segment zone-wet"
                  style={{ width: `${wetZoneWidth}%` }}
                >
                  <span>
                    {hasCropThresholds
                      ? `Too Wet (>${thresholds.tooWetThreshold}%)`
                      : 'Too Wet'}
                  </span>
                </div>
              </div>
              {hasCropThresholds && (
                <div
                  className="bar-pin bar-pin-min"
                  style={{ left: `${thresholds.minThreshold}%` }}
                  title={`Minimum Threshold: ${thresholds.minThreshold}%`}
                />
              )}
              {thresholds.targetMoisture !== null && (
                <div
                  className="bar-pin bar-pin-target"
                  style={{ left: `${thresholds.targetMoisture}%` }}
                  title={`Target Moisture: ${thresholds.targetMoisture}%`}
                />
              )}
              {moistureEval.valid && (
                <div
                  className="bar-pointer-current"
                  style={{
                    left: `${clampedMoisture}%`,
                    backgroundColor: gaugeColor,
                  }}
                  title={`Current Moisture: ${moistureEval.moisture}%`}
                />
              )}
            </div>
            <div className="zone-bar-scale">
              <span>0%</span>
              <span className="text-danger">
                Min:{' '}
                {thresholds.minThreshold !== null
                  ? `${thresholds.minThreshold}%`
                  : '--%'}
              </span>
              <span className="text-success">
                Target:{' '}
                {thresholds.targetMoisture !== null
                  ? `${thresholds.targetMoisture}%`
                  : '--%'}
              </span>
              <span className="text-primary-blue">
                Upper Limit:{' '}
                {thresholds.tooWetThreshold !== null
                  ? `${thresholds.tooWetThreshold}%`
                  : '--%'}
              </span>
              <span>100%</span>
            </div>
          </div>

          {/* Official Backend Check Result */}
          {result && (
            <div
              id="irrigation-result"
              className="irrigation-result-embedded"
            >
              <div
                id="result-status-icon"
                className={`result-status-icon ${
                  result.irrigationRequired
                    ? 'irrigation-required'
                    : 'irrigation-not-required'
                }`}
              >
                <i
                  className={
                    result.irrigationRequired
                      ? 'fas fa-tint'
                      : 'fas fa-check-circle'
                  }
                ></i>
              </div>

              <h2 id="irrigation-status">
                {t('irrigation_status', 'Irrigation Status')}: {result.status}
              </h2>

              <p id="irrigation-message" className="irrigation-message">
                {result.message}
              </p>

              <div className="irrigation-metrics">
                <div className="irrigation-metric">
                  <span className="metric-label">{t('crop', 'Crop')}</span>
                  <strong id="result-crop">
                    {selectedCropLabel ||
                      result.crop.charAt(0).toUpperCase() +
                        result.crop.slice(1)}
                  </strong>
                </div>

                <div className="irrigation-metric">
                  <span className="metric-label">
                    {t('current_moisture', 'Soil Moisture')}
                  </span>
                  <strong>
                    <span id="result-moisture">{result.soilMoisture}</span>%
                  </strong>
                </div>

                <div className="irrigation-metric">
                  <span className="metric-label">
                    {t('required_threshold', 'Recommended Minimum')}
                  </span>
                  <strong>
                    <span id="result-threshold">{result.threshold}</span>%
                  </strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 4. WATER REQUIREMENT ESTIMATION CALCULATOR CARD */}
        <div className="irrigation-card">
          <div className="irrigation-card-header">
            <i className="fas fa-calculator"></i>
            <div>
              <h2>Water Requirement Calculator</h2>
              <p>
                Estimate how much water your field may need to reach the target
                moisture level.
              </p>
            </div>
          </div>

          <div className="calculator-grid">
            <div className="form-group">
              <label htmlFor="calc-field-area">
                <i className="fas fa-vector-square"></i> Field Area
              </label>
              <input
                type="number"
                id="calc-field-area"
                min="0.01"
                step="0.01"
                placeholder="Enter field area (e.g. 1.5)"
                value={fieldArea}
                onChange={(e) => {
                  setFieldArea(e.target.value);
                  setAreaSourceNote('');
                }}
              />
              {areaSourceNote && (
                <small className="field-source-note">{areaSourceNote}</small>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="calc-area-unit">
                <i className="fas fa-ruler-combined"></i> Area Unit
              </label>
              <select
                id="calc-area-unit"
                value={areaUnit}
                onChange={(e) => setAreaUnit(e.target.value)}
              >
                {AREA_UNITS.map((u) => (
                  <option key={u.key} value={u.key}>
                    {u.label}
                  </option>
                ))}
              </select>
              {waterEstimate.areaSqMeters !== null &&
                waterEstimate.areaSqMeters !== undefined && (
                  <small className="helper-note">
                    Area in square metres:{' '}
                    {waterEstimate.areaSqMeters.toLocaleString('en-IN')} m²
                  </small>
                )}
            </div>

            <div className="form-group calculator-full-col">
              <label htmlFor="calc-soil-depth">
                <i className="fas fa-arrows-alt-v"></i> Effective Root-Zone Soil
                Depth (mm)
              </label>
              <div className="preset-chips-row">
                {SOIL_DEPTH_PRESETS.map((preset) => (
                  <button
                    key={preset.valueMm}
                    type="button"
                    className={`preset-chip ${
                      Number(soilDepthMm) === preset.valueMm ? 'active' : ''
                    }`}
                    onClick={() => setSoilDepthMm(String(preset.valueMm))}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <input
                type="number"
                id="calc-soil-depth"
                min="10"
                max="3000"
                step="10"
                placeholder="Choose a root depth above or enter depth in mm (e.g. 450)"
                value={soilDepthMm}
                onChange={(e) => setSoilDepthMm(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="calc-efficiency-preset">
                <i className="fas fa-shower"></i> Irrigation Method / Efficiency
                (Optional)
              </label>
              <select
                id="calc-efficiency-preset"
                value={efficiencyPreset}
                onChange={(e) => setEfficiencyPreset(e.target.value)}
              >
                {IRRIGATION_EFFICIENCY_PRESETS.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {efficiencyPreset === 'custom' && (
              <div className="form-group">
                <label htmlFor="calc-custom-efficiency">
                  <i className="fas fa-percent"></i> Custom Efficiency (%)
                </label>
                <input
                  type="number"
                  id="calc-custom-efficiency"
                  min="1"
                  max="100"
                  step="1"
                  placeholder="e.g. 85"
                  value={customEfficiency}
                  onChange={(e) => setCustomEfficiency(e.target.value)}
                />
              </div>
            )}

            <div className="form-group calculator-full-col">
              <label className="checkbox-label vwc-confirm-box">
                <input
                  type="checkbox"
                  id="calc-vwc-confirm"
                  checked={isVolumetricConfirmed}
                  onChange={(e) => setIsVolumetricConfirmed(e.target.checked)}
                />
                <span>
                  <strong>
                    Confirm moisture reading is Volumetric Water Content (VWC %)
                  </strong>
                  <br />
                  <small>
                    Water volume estimates apply when soil moisture is measured
                    as a volumetric percentage across the root zone.
                  </small>
                </span>
              </label>
            </div>
          </div>

          {waterEstimate.canCalculate ? (
            <div className="calc-results-panel">
              {waterEstimate.noWaterNeeded && (
                <div className="calc-zero-water-notice">
                  <i className="fas fa-check-circle"></i>
                  <span>
                    Your soil moisture ({waterEstimate.currentMoisture}%)
                    already meets or exceeds the target level (
                    {waterEstimate.targetMoisture}%).{' '}
                    <strong>0 Litres</strong> of additional water is needed.
                  </span>
                </div>
              )}

              <div className="calc-output-cards">
                <div className="calc-output-card">
                  <span className="calc-output-label">
                    Moisture Needed to Reach Target
                  </span>
                  <strong>{waterEstimate.moistureDeficitPercent}%</strong>
                  <small>
                    {waterEstimate.currentMoisture}% current vs{' '}
                    {waterEstimate.targetMoisture}% target
                  </small>
                </div>

                <div className="calc-output-card">
                  <span className="calc-output-label">
                    Estimated Water Depth
                  </span>
                  <strong>{waterEstimate.waterDeficitMm} mm</strong>
                  <small>
                    For {waterEstimate.soilDepthMm} mm root-zone depth
                  </small>
                </div>

                <div className="calc-output-card highlight-water-card">
                  <span className="calc-output-label">
                    Estimated Net Water Volume
                  </span>
                  <strong>
                    {waterEstimate.netWaterLitres.toLocaleString('en-IN')} L
                  </strong>
                  <small>
                    {waterEstimate.netWaterCubicMeters} m³ across{' '}
                    {waterEstimate.areaSqMeters.toLocaleString('en-IN')} m²
                  </small>
                </div>
              </div>

              {waterEstimate.appliedWaterLitres !== null && (
                <div className="calc-applied-water-banner">
                  <i className="fas fa-water"></i>
                  <div>
                    <strong>
                      Total Water to Apply (at{' '}
                      {waterEstimate.irrigationEfficiency}% System Efficiency):
                    </strong>
                    <p>
                      {waterEstimate.appliedWaterLitres.toLocaleString('en-IN')}{' '}
                      Litres ({waterEstimate.appliedWaterCubicMeters} m³ |{' '}
                      {waterEstimate.appliedWaterMm} mm depth)
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="calc-missing-prompt">
              <i className="fas fa-info-circle"></i>
              <div>
                <strong>
                  Enter Field Details to Calculate Water Requirement
                </strong>
                <p>{waterEstimate.reason}</p>
              </div>
            </div>
          )}

          <div className="calc-assumptions-box">
            <h4>
              <i className="fas fa-book-open"></i> How This Estimate Is
              Calculated
            </h4>
            <ul>
              <li>
                <strong>Water Deficit (mm)</strong> = max(0, Target Moisture
                Fraction − Current Moisture Fraction) × Effective Soil Depth
                (mm).
              </li>
              <li>
                <strong>Net Water Volume (Litres)</strong> = Water Deficit (mm)
                × Field Area (m²), since 1 mm of water over 1 m² equals 1 Litre.
              </li>
              <li>
                This estimate is a general guide assuming uniform moisture across
                the root zone and does not account for upcoming rainfall or soil
                type variations.
              </li>
            </ul>
          </div>
        </div>

        {/* 5. MOISTURE CHECK HISTORY CARD */}
        <div className="irrigation-card">
          <div className="irrigation-card-header irrigation-header-with-actions">
            <div className="header-left-group">
              <i className="fas fa-history"></i>
              <div>
                <h2>Soil Moisture Check History</h2>
                <p>
                  Recent moisture readings checked in this browser so you can
                  compare changes over time.
                </p>
              </div>
            </div>

            <div className="history-controls">
              <div className="history-filter-tabs">
                {[
                  { key: 'all', label: 'All' },
                  { key: '24h', label: '24 Hours' },
                  { key: '7d', label: '7 Days' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    className={`history-filter-btn ${
                      historyFilter === tab.key ? 'active' : ''
                    }`}
                    onClick={() => setHistoryFilter(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {historyList.length > 0 && (
                <button
                  type="button"
                  className="btn btn-outline-sm btn-danger-outline"
                  onClick={() => setHistoryList(clearWebMoistureHistory())}
                >
                  <i className="fas fa-trash-alt"></i> Clear
                </button>
              )}
            </div>
          </div>

          {filteredHistory.length > 0 ? (
            <div>
              <div className="history-bars-chart">
                {filteredHistory
                  .slice(0, 10)
                  .reverse()
                  .map((item) => {
                    const val = Math.max(
                      0,
                      Math.min(100, Number(item.moisture) || 0)
                    );
                    const isLow = val < (item.threshold || 30);
                    const isWet = val > 80;
                    const barColor = isLow
                      ? '#dc3545'
                      : isWet
                      ? '#2878ff'
                      : '#2e8b57';
                    const d = new Date(item.timestamp);
                    const timeStr = Number.isFinite(d.getTime())
                      ? d.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '';

                    return (
                      <div key={item.id} className="history-bar-col">
                        <span
                          className="history-bar-val"
                          style={{ color: barColor }}
                        >
                          {val}%
                        </span>
                        <div className="history-bar-track">
                          <div
                            className="history-bar-fill"
                            style={{
                              height: `${Math.max(val, 5)}%`,
                              backgroundColor: barColor,
                            }}
                          />
                        </div>
                        <span className="history-bar-time">{timeStr}</span>
                      </div>
                    );
                  })}
              </div>

              <div className="history-table-wrapper">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Crop</th>
                      <th>Moisture</th>
                      <th>Min / Target</th>
                      <th>Condition</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.slice(0, 8).map((item) => (
                      <tr key={item.id}>
                        <td>{new Date(item.timestamp).toLocaleString()}</td>
                        <td>
                          <strong>{item.cropLabel || item.crop}</strong>
                        </td>
                        <td>
                          <strong>{item.moisture}%</strong>
                        </td>
                        <td>
                          {item.threshold}% / {item.targetMoisture}%
                        </td>
                        <td>
                          <span
                            className={`condition-pill ${
                              item.condition === 'DRY'
                                ? 'condition-dry'
                                : item.condition === 'TOO_WET'
                                ? 'condition-wet'
                                : 'condition-optimal'
                            }`}
                          >
                            {item.condition === 'DRY'
                              ? 'Dry'
                              : item.condition === 'TOO_WET'
                              ? 'Too Wet'
                              : 'Optimal'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="history-empty-state">
              <div className="empty-state-icon">
                <i className="fas fa-tint-slash"></i>
              </div>
              <h3>No Moisture Readings Saved Yet</h3>
              <p>
                Check your crop&apos;s irrigation status above to save readings
                in your browser and track soil moisture changes over time.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default SmartIrrigation;