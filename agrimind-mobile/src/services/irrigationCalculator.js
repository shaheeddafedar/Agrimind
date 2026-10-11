// Reusable Frontend Utility for AgriMind Mobile Smart Irrigation:
// - Crop threshold lookup (matching backend IRRIGATION_THRESHOLDS)
// - Dynamic soil moisture condition classification (Dry, Optimal, Too Wet)
// - Sensor reading validation and staleness checks
// - Threshold alert state machine (cooldown, duplicate suppression, recovery)
// - Volumetric water deficit & water volume estimation with unit conversions

export const IRRIGATION_THRESHOLDS = {
  apple: 30,
  banana: 40,
  barley: 30,
  blackgram: 30,
  blackpepper: 35,
  brinjal: 35,
  cabbage: 35,
  cardamom: 40,
  cauliflower: 35,
  chickpea: 30,
  coconut: 40,
  coffee: 35,
  coriander: 35,
  cotton: 30,
  garlic: 35,
  grapes: 35,
  horsegram: 30,
  jute: 35,
  kidneybeans: 35,
  lentil: 30,
  maize: 30,
  mango: 30,
  mothbeans: 30,
  mungbean: 30,
  muskmelon: 35,
  okra: 35,
  onion: 35,
  orange: 30,
  papaya: 35,
  pigeonpeas: 30,
  pomegranate: 30,
  potato: 35,
  ragi: 30,
  rapeseed: 30,
  rice: 40,
  sorghum: 30,
  soybean: 35,
  sunflower: 30,
  sweet_potato: 35,
  tomato: 35,
  turmeric: 35,
  watermelon: 35,
  wheat: 30,
};

export const AREA_UNITS = [
  { key: 'hectare', label: 'Hectares (ha)', shortLabel: 'ha', toSqMeters: 10000 },
  { key: 'acre', label: 'Acres (ac)', shortLabel: 'ac', toSqMeters: 4046.8564224 },
  { key: 'gunta', label: 'Guntas (guntha)', shortLabel: 'gunta', toSqMeters: 101.17141056 },
  { key: 'sqm', label: 'Square Metres (m²)', shortLabel: 'm²', toSqMeters: 1 },
];

export const SOIL_DEPTH_PRESETS = [
  { label: 'Shallow (300 mm)', valueMm: 300, desc: 'Leafy greens, onion, garlic' },
  { label: 'Medium (450 mm)', valueMm: 450, desc: 'Vegetables, pulses, potato' },
  { label: 'Deep (600 mm)', valueMm: 600, desc: 'Cereals, cotton, maize, wheat' },
  { label: 'Orchard (900 mm)', valueMm: 900, desc: 'Fruit trees, plantation crops' },
];

export const IRRIGATION_EFFICIENCY_PRESETS = [
  { key: 'none', label: 'Net Only (Unadjusted)', efficiency: null },
  { key: 'drip', label: 'Drip (90%)', efficiency: 90 },
  { key: 'sprinkler', label: 'Sprinkler (75%)', efficiency: 75 },
  { key: 'furrow', label: 'Surface / Furrow (60%)', efficiency: 60 },
];

export const DEFAULT_TARGET_OFFSET = 20;
export const DEFAULT_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes
export const DEFAULT_STALE_MS = 10 * 60 * 1000; // 10 minutes

export const parseValidNumber = (val) => {
  if (val === null || val === undefined || val === '' || typeof val === 'boolean') {
    return null;
  }
  const str = String(val).trim();
  if (str === '') return null;
  const num = Number(str);
  return Number.isFinite(num) ? num : null;
};

/**
 * Retrieve minimum, recommended target, and too-wet moisture thresholds for a crop.
 * Does NOT invent default thresholds when no crop is selected or when the crop is unknown.
 */
export const getCropThresholds = (crop, customMin = null, customTarget = null) => {
  const cropKey = typeof crop === 'string' ? crop.toLowerCase().trim() : '';
  const configuredMin = cropKey ? IRRIGATION_THRESHOLDS[cropKey] : undefined;
  const parsedMin = parseValidNumber(customMin);

  const minThreshold =
    parsedMin !== null && parsedMin >= 5 && parsedMin <= 90
      ? parsedMin
      : configuredMin !== undefined
      ? configuredMin
      : null;

  const hasConfiguredThreshold = minThreshold !== null;

  const recommendedTarget = hasConfiguredThreshold
    ? Math.min(minThreshold + DEFAULT_TARGET_OFFSET, 75)
    : null;

  const parsedTarget = parseValidNumber(customTarget);
  const targetBelowMin =
    parsedTarget !== null && hasConfiguredThreshold && parsedTarget < minThreshold;

  let targetMoisture = recommendedTarget;
  if (parsedTarget !== null && parsedTarget >= 10 && parsedTarget <= 95) {
    targetMoisture = hasConfiguredThreshold
      ? Math.max(minThreshold, parsedTarget)
      : parsedTarget;
  }

  const tooWetThreshold =
    targetMoisture !== null
      ? Math.min(Math.max(targetMoisture + 15, 75), 95)
      : null;

  return {
    cropKey,
    hasConfiguredThreshold,
    minThreshold,
    recommendedTarget,
    targetMoisture,
    tooWetThreshold,
    targetBelowMin,
  };
};

/**
 * Classify current soil moisture into Dry, Optimal, or Too Wet.
 */
export const evaluateMoistureCondition = (
  moistureInput,
  minThreshold = null,
  targetMoisture = null,
  tooWetThreshold = null,
  cropLabel = ''
) => {
  const moisture = parseValidNumber(moistureInput);
  const minVal = parseValidNumber(minThreshold);
  const targetVal = parseValidNumber(targetMoisture);
  const wetVal = parseValidNumber(tooWetThreshold);

  if (moisture === null || moisture < 0 || moisture > 100) {
    return {
      valid: false,
      hasThresholds: minVal !== null,
      moisture: null,
      condition: 'UNKNOWN',
      label: 'Awaiting Reading',
      irrigationRequired: false,
      belowTarget: false,
      deficitToMin: null,
      deficitToTarget: null,
      minThreshold: minVal,
      targetMoisture: targetVal,
      tooWetThreshold: wetVal,
      statusMessage:
        'Enter your current soil moisture percentage or sync your sensor to view soil condition.',
    };
  }

  if (minVal === null || minVal <= 0 || minVal > 100) {
    return {
      valid: true,
      hasThresholds: false,
      moisture,
      condition: 'UNKNOWN',
      label: 'Select Crop',
      irrigationRequired: false,
      belowTarget: false,
      deficitToMin: null,
      deficitToTarget: null,
      minThreshold: null,
      targetMoisture: targetVal,
      tooWetThreshold: null,
      statusMessage: `Current soil moisture is ${moisture}%. Select a crop above to compare this reading with its recommended moisture range.`,
    };
  }

  const safeMin = Math.max(0, Math.min(100, minVal));
  const safeTarget =
    targetVal !== null
      ? Math.max(safeMin, Math.min(100, targetVal))
      : Math.min(safeMin + DEFAULT_TARGET_OFFSET, 75);
  const safeTooWet =
    wetVal !== null
      ? Math.max(safeTarget, Math.min(100, wetVal))
      : Math.min(Math.max(safeTarget + 15, 75), 95);

  const deficitToMin = Math.max(0, Number((safeMin - moisture).toFixed(2)));
  const deficitToTarget = Math.max(0, Number((safeTarget - moisture).toFixed(2)));
  const forCrop = cropLabel ? ` for ${cropLabel}` : '';

  if (moisture < safeMin) {
    return {
      valid: true,
      hasThresholds: true,
      moisture,
      condition: 'DRY',
      label: 'Dry',
      irrigationRequired: true,
      belowTarget: true,
      deficitToMin,
      deficitToTarget,
      minThreshold: safeMin,
      targetMoisture: safeTarget,
      tooWetThreshold: safeTooWet,
      statusMessage: `Your soil moisture is ${moisture}%, below the recommended minimum of ${safeMin}%${forCrop}. Irrigation may be needed.`,
    };
  }

  if (moisture > safeTooWet) {
    return {
      valid: true,
      hasThresholds: true,
      moisture,
      condition: 'TOO_WET',
      label: 'Too Wet',
      irrigationRequired: false,
      belowTarget: false,
      deficitToMin: 0,
      deficitToTarget: 0,
      minThreshold: safeMin,
      targetMoisture: safeTarget,
      tooWetThreshold: safeTooWet,
      statusMessage: `Your soil moisture is ${moisture}%, above the recommended upper level of ${safeTooWet}%${forCrop}. Hold off on irrigation to avoid excess water.`,
    };
  }

  return {
    valid: true,
    hasThresholds: true,
    moisture,
    condition: 'OPTIMAL',
    label: 'Optimal',
    irrigationRequired: false,
    belowTarget: moisture < safeTarget,
    deficitToMin: 0,
    deficitToTarget,
    minThreshold: safeMin,
    targetMoisture: safeTarget,
    tooWetThreshold: safeTooWet,
    statusMessage:
      moisture < safeTarget
        ? `Your soil moisture is ${moisture}%, which meets the recommended minimum of ${safeMin}%${forCrop}. You can optionally irrigate to reach the ${safeTarget}% target.`
        : `Your soil moisture is ${moisture}%, within the recommended range (${safeMin}%–${safeTooWet}%)${forCrop}. No irrigation is needed right now.`,
  };
};

export const convertAreaToSqMeters = (areaInput, unitKey = 'hectare') => {
  const area = parseValidNumber(areaInput);
  if (area === null || area <= 0) {
    return null;
  }

  const unitObj = AREA_UNITS.find((u) => u.key === unitKey);
  if (!unitObj) {
    return null;
  }

  return area * unitObj.toSqMeters;
};

export const calculateWaterRequirement = ({
  currentMoisture,
  targetMoisture,
  fieldArea,
  areaUnit = 'hectare',
  soilDepthMm,
  irrigationEfficiency = null,
  isVolumetricConfirmed = true,
} = {}) => {
  const missingFields = [];

  const currentVal = parseValidNumber(currentMoisture);
  if (currentVal === null || currentVal < 0 || currentVal > 100) {
    missingFields.push('currentMoisture');
  }

  const targetVal = parseValidNumber(targetMoisture);
  if (targetVal === null || targetVal <= 0 || targetVal > 100) {
    missingFields.push('targetMoisture');
  }

  const areaVal = parseValidNumber(fieldArea);
  const areaSqMeters = convertAreaToSqMeters(areaVal, areaUnit);
  if (areaSqMeters === null) {
    missingFields.push('fieldArea');
  }

  const depthVal = parseValidNumber(soilDepthMm);
  if (depthVal === null || depthVal <= 0 || depthVal > 3000) {
    missingFields.push('soilDepthMm');
  }

  if (!isVolumetricConfirmed) {
    missingFields.push('volumetricConfirmation');
  }

  const effVal = parseValidNumber(irrigationEfficiency);
  const hasEfficiency = effVal !== null;
  if (hasEfficiency && (effVal <= 0 || effVal > 100)) {
    missingFields.push('irrigationEfficiency');
  }

  if (missingFields.length > 0) {
    return {
      canCalculate: false,
      missingFields,
      waterDeficitMm: null,
      netWaterLitres: null,
      netWaterCubicMeters: null,
      appliedWaterLitres: null,
      appliedWaterMm: null,
      appliedWaterCubicMeters: null,
      areaSqMeters,
      reason: !isVolumetricConfirmed
        ? 'Confirm that the moisture reading represents volumetric water content (%) to estimate water volume.'
        : 'Select a crop (or enter a target moisture %), field area, and effective root-zone soil depth (mm) to estimate water volume.',
    };
  }

  const currentFraction = currentVal / 100;
  const targetFraction = targetVal / 100;

  const moistureDeficitFraction = Math.max(0, targetFraction - currentFraction);
  const waterDeficitMm = Math.max(0, moistureDeficitFraction * depthVal);
  const netWaterLitres = Math.max(0, waterDeficitMm * areaSqMeters);
  const netWaterCubicMeters = netWaterLitres / 1000;

  let appliedWaterLitres = null;
  let appliedWaterMm = null;
  let appliedWaterCubicMeters = null;

  if (hasEfficiency) {
    const efficiencyFraction = effVal / 100;
    appliedWaterLitres = Math.max(0, netWaterLitres / efficiencyFraction);
    appliedWaterMm = Math.max(0, waterDeficitMm / efficiencyFraction);
    appliedWaterCubicMeters = appliedWaterLitres / 1000;
  }

  return {
    canCalculate: true,
    missingFields: [],
    currentMoisture: currentVal,
    targetMoisture: targetVal,
    moistureDeficitPercent: Number((moistureDeficitFraction * 100).toFixed(2)),
    soilDepthMm: depthVal,
    fieldArea: areaVal,
    areaUnit,
    areaSqMeters: Number(areaSqMeters.toFixed(2)),
    waterDeficitMm: Number(waterDeficitMm.toFixed(2)),
    netWaterLitres: Math.round(netWaterLitres),
    netWaterCubicMeters: Number(netWaterCubicMeters.toFixed(2)),
    irrigationEfficiency: hasEfficiency ? effVal : null,
    appliedWaterLitres: appliedWaterLitres !== null ? Math.round(appliedWaterLitres) : null,
    appliedWaterMm: appliedWaterMm !== null ? Number(appliedWaterMm.toFixed(2)) : null,
    appliedWaterCubicMeters:
      appliedWaterCubicMeters !== null ? Number(appliedWaterCubicMeters.toFixed(2)) : null,
    noWaterNeeded: waterDeficitMm === 0,
  };
};

export const evaluateSensorFreshness = (
  sensorResponse,
  staleThresholdMs = DEFAULT_STALE_MS,
  now = Date.now()
) => {
  if (!sensorResponse || typeof sensorResponse !== 'object') {
    return {
      isLiveAvailable: false,
      isConnected: false,
      isStale: false,
      hasCachedReading: false,
      moisture: null,
      nitrogen: null,
      phosphorus: null,
      potassium: null,
      updatedAt: null,
      ageMinutes: null,
      statusType: 'OFFLINE',
      statusLabel: 'No sensor data available',
    };
  }

  const isConnected = Boolean(sensorResponse.connected && sensorResponse.available);
  const rawData = sensorResponse.data || {};
  const moisture = parseValidNumber(rawData.moisture);
  const isValidMoisture = moisture !== null && moisture >= 0 && moisture <= 100;

  let updatedAtMs = null;
  let ageMinutes = null;
  if (rawData.updatedAt) {
    const parsedDate = new Date(rawData.updatedAt).getTime();
    if (Number.isFinite(parsedDate)) {
      updatedAtMs = parsedDate;
      ageMinutes = Math.max(0, Math.round((now - parsedDate) / 60000));
    }
  }

  const isStale =
    updatedAtMs !== null ? now - updatedAtMs > staleThresholdMs : !isConnected;

  if (isConnected && isValidMoisture && !isStale) {
    return {
      isLiveAvailable: true,
      isConnected: true,
      isStale: false,
      hasCachedReading: true,
      moisture,
      nitrogen: parseValidNumber(rawData.nitrogen),
      phosphorus: parseValidNumber(rawData.phosphorus),
      potassium: parseValidNumber(rawData.potassium),
      updatedAt: rawData.updatedAt || null,
      ageMinutes,
      statusType: 'LIVE',
      statusLabel: 'Sensor connected — live reading',
    };
  }

  if (isConnected && isValidMoisture && isStale) {
    return {
      isLiveAvailable: true,
      isConnected: true,
      isStale: true,
      hasCachedReading: true,
      moisture,
      nitrogen: parseValidNumber(rawData.nitrogen),
      phosphorus: parseValidNumber(rawData.phosphorus),
      potassium: parseValidNumber(rawData.potassium),
      updatedAt: rawData.updatedAt || null,
      ageMinutes,
      statusType: 'STALE',
      statusLabel: 'Sensor reading is stale',
    };
  }

  if (!isConnected && isValidMoisture) {
    return {
      isLiveAvailable: false,
      isConnected: false,
      isStale: true,
      hasCachedReading: true,
      moisture,
      nitrogen: parseValidNumber(rawData.nitrogen),
      phosphorus: parseValidNumber(rawData.phosphorus),
      potassium: parseValidNumber(rawData.potassium),
      updatedAt: rawData.updatedAt || null,
      ageMinutes,
      statusType: 'CACHED_OFFLINE',
      statusLabel: 'Sensor offline — showing the last available reading',
    };
  }

  return {
    isLiveAvailable: false,
    isConnected: false,
    isStale: false,
    hasCachedReading: false,
    moisture: null,
    nitrogen: null,
    phosphorus: null,
    potassium: null,
    updatedAt: null,
    ageMinutes: null,
    statusType: 'OFFLINE',
    statusLabel: 'No sensor data available',
  };
};

export const evaluateThresholdAlertState = (
  prevState = {},
  {
    crop = '',
    cropLabel = '',
    moisture = null,
    threshold = null,
    readingStatus = 'normal',
    notificationsEnabled = true,
    cooldownMs = DEFAULT_COOLDOWN_MS,
    now = Date.now(),
  } = {}
) => {
  const cleanCrop = typeof crop === 'string' ? crop.toLowerCase().trim() : '';
  const moistureVal = parseValidNumber(moisture);
  const thresholdVal = parseValidNumber(threshold);

  if (
    !cleanCrop ||
    moistureVal === null ||
    moistureVal < 0 ||
    moistureVal > 100 ||
    thresholdVal === null ||
    thresholdVal <= 0 ||
    thresholdVal > 100
  ) {
    return {
      activeAlert: false,
      crop: prevState.crop || null,
      lastNotifiedAt: prevState.lastNotifiedAt || null,
      lastAlertMoisture: prevState.lastAlertMoisture ?? null,
      threshold: thresholdVal,
      recoveredAt: prevState.recoveredAt || null,
      bannerType: 'NONE',
      shouldTriggerNotification: false,
      isDuplicateSuppressed: false,
      message: '',
    };
  }

  const isBelowThreshold = moistureVal < thresholdVal;
  const wasActiveForSameCrop =
    Boolean(prevState.activeAlert) && prevState.crop === cleanCrop;
  const sameCropCooldown =
    prevState.crop === cleanCrop &&
    typeof prevState.lastNotifiedAt === 'number' &&
    now - prevState.lastNotifiedAt < cooldownMs;

  const cropDisplay =
    (cropLabel && String(cropLabel).trim()) ||
    cleanCrop.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const statusQualifier =
    readingStatus === 'stale'
      ? ' (from an older sensor reading)'
      : readingStatus === 'simulated'
      ? ' (simulated reading)'
      : '';

  if (isBelowThreshold) {
    const warningMessage = `Your soil moisture is ${moistureVal}%${statusQualifier}, below the recommended minimum of ${thresholdVal}% for ${cropDisplay}. Irrigation may be needed.`;

    if (sameCropCooldown) {
      return {
        activeAlert: true,
        crop: cleanCrop,
        lastNotifiedAt: prevState.lastNotifiedAt,
        lastAlertMoisture: prevState.lastAlertMoisture ?? moistureVal,
        currentMoisture: moistureVal,
        threshold: thresholdVal,
        recoveredAt: null,
        bannerType: 'LOW_MOISTURE_WARNING',
        shouldTriggerNotification: false,
        isDuplicateSuppressed: true,
        message: warningMessage,
      };
    }

    return {
      activeAlert: true,
      crop: cleanCrop,
      lastNotifiedAt: now,
      lastAlertMoisture: moistureVal,
      currentMoisture: moistureVal,
      threshold: thresholdVal,
      recoveredAt: null,
      bannerType: 'LOW_MOISTURE_WARNING',
      shouldTriggerNotification: Boolean(notificationsEnabled),
      isDuplicateSuppressed: false,
      message: warningMessage,
    };
  }

  if (wasActiveForSameCrop) {
    return {
      activeAlert: false,
      crop: cleanCrop,
      lastNotifiedAt: prevState.lastNotifiedAt || null,
      lastAlertMoisture: null,
      currentMoisture: moistureVal,
      threshold: thresholdVal,
      recoveredAt: now,
      bannerType: 'RECOVERED',
      shouldTriggerNotification: false,
      isDuplicateSuppressed: false,
      message: `Your soil moisture for ${cropDisplay} is now ${moistureVal}%${statusQualifier}, which meets the recommended minimum of ${thresholdVal}%.`,
    };
  }

  return {
    activeAlert: false,
    crop: cleanCrop,
    lastNotifiedAt: prevState.lastNotifiedAt || null,
    lastAlertMoisture: null,
    currentMoisture: moistureVal,
    threshold: thresholdVal,
    recoveredAt: prevState.recoveredAt || null,
    bannerType: 'NONE',
    shouldTriggerNotification: false,
    isDuplicateSuppressed: false,
    message: '',
  };
};

export default {
  IRRIGATION_THRESHOLDS,
  AREA_UNITS,
  SOIL_DEPTH_PRESETS,
  IRRIGATION_EFFICIENCY_PRESETS,
  DEFAULT_TARGET_OFFSET,
  DEFAULT_COOLDOWN_MS,
  DEFAULT_STALE_MS,
  parseValidNumber,
  getCropThresholds,
  evaluateMoistureCondition,
  convertAreaToSqMeters,
  calculateWaterRequirement,
  evaluateSensorFreshness,
  evaluateThresholdAlertState,
};
