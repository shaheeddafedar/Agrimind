/**
 * AgriMind Web — Smart Irrigation Frontend Controller
 * Reuses existing backend endpoints:
 *   - GET  /api/sensor/data
 *   - POST /api/irrigation/check
 *   - GET  /api/farm/:farmId
 *   - GET  /api/recommend/:userId
 */

const IRRIGATION_THRESHOLDS = {
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
    wheat: 30
};

const AREA_UNIT_FACTORS = {
    hectare: 10000,
    acre: 4046.8564224,
    gunta: 101.17141056,
    sqm: 1
};

const STORAGE_KEYS = {
    PREFS: 'agrimind_web_irrigation_notif_prefs',
    ALERT_STATE: 'agrimind_web_irrigation_alert_state',
    HISTORY: 'agrimind_web_irrigation_history'
};

const COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes
const STALE_MS = 10 * 60 * 1000; // 10 minutes

function parseValidNumber(val) {
    if (val === null || val === undefined || val === '' || typeof val === 'boolean') {
        return null;
    }
    const str = String(val).trim();
    if (str === '') return null;
    const num = Number(str);
    return Number.isFinite(num) ? num : null;
}

function getCropThresholds(crop, customMin, customTarget) {
    const cropKey = typeof crop === 'string' ? crop.toLowerCase().trim() : '';
    const configuredMin = IRRIGATION_THRESHOLDS[cropKey];
    const parsedMin = parseValidNumber(customMin);

    const minThreshold =
        parsedMin !== null && parsedMin >= 5 && parsedMin <= 90
            ? parsedMin
            : configuredMin !== undefined
            ? configuredMin
            : 35;

    const defaultTarget = Math.min(minThreshold + 20, 75);
    const parsedTarget = parseValidNumber(customTarget);

    const targetMoisture =
        parsedTarget !== null && parsedTarget >= minThreshold && parsedTarget <= 95
            ? parsedTarget
            : defaultTarget;

    const tooWetThreshold = Math.min(Math.max(targetMoisture + 15, 75), 95);

    return {
        cropKey,
        minThreshold,
        targetMoisture,
        tooWetThreshold
    };
}

function evaluateMoistureCondition(moistureInput, minThreshold, targetMoisture, tooWetThreshold) {
    const moisture = parseValidNumber(moistureInput);
    if (moisture === null || moisture < 0 || moisture > 100) {
        return {
            valid: false,
            moisture: null,
            condition: 'UNKNOWN',
            label: 'Awaiting Input',
            irrigationRequired: false,
            belowTarget: false,
            deficitToMin: 0,
            deficitToTarget: 0
        };
    }

    const safeMin = Number(minThreshold) || 35;
    const safeTarget = Math.max(safeMin, Number(targetMoisture) || safeMin + 20);
    const safeWet = Math.max(safeTarget, Number(tooWetThreshold) || 80);

    const deficitToMin = Math.max(0, Number((safeMin - moisture).toFixed(1)));
    const deficitToTarget = Math.max(0, Number((safeTarget - moisture).toFixed(1)));

    if (moisture < safeMin) {
        return {
            valid: true,
            moisture,
            condition: 'DRY',
            label: 'Dry',
            irrigationRequired: true,
            belowTarget: true,
            deficitToMin,
            deficitToTarget
        };
    }

    if (moisture > safeWet) {
        return {
            valid: true,
            moisture,
            condition: 'TOO_WET',
            label: 'Too Wet',
            irrigationRequired: false,
            belowTarget: false,
            deficitToMin: 0,
            deficitToTarget: 0
        };
    }

    return {
        valid: true,
        moisture,
        condition: 'OPTIMAL',
        label: 'Optimal',
        irrigationRequired: false,
        belowTarget: moisture < safeTarget,
        deficitToMin: 0,
        deficitToTarget
    };
}

function calculateWaterRequirement({
    currentMoisture,
    targetMoisture,
    fieldArea,
    areaUnit = 'hectare',
    soilDepthMm,
    irrigationEfficiency = null,
    isVolumetricConfirmed = true
} = {}) {
    const missingFields = [];

    const currentVal = parseValidNumber(currentMoisture);
    if (currentVal === null || currentVal < 0 || currentVal > 100) {
        missingFields.push('current soil moisture (%)');
    }

    const targetVal = parseValidNumber(targetMoisture);
    if (targetVal === null || targetVal <= 0 || targetVal > 100) {
        missingFields.push('target moisture (%)');
    }

    const areaVal = parseValidNumber(fieldArea);
    const factor = AREA_UNIT_FACTORS[areaUnit] || null;
    const areaSqMeters = areaVal !== null && areaVal > 0 && factor ? areaVal * factor : null;
    if (areaSqMeters === null) {
        missingFields.push('field area');
    }

    const depthVal = parseValidNumber(soilDepthMm);
    if (depthVal === null || depthVal <= 0 || depthVal > 3000) {
        missingFields.push('effective root-zone soil depth (mm)');
    }

    if (!isVolumetricConfirmed) {
        missingFields.push('volumetric moisture confirmation');
    }

    const effVal = parseValidNumber(irrigationEfficiency);
    const hasEfficiency = effVal !== null;
    if (hasEfficiency && (effVal <= 0 || effVal > 100)) {
        missingFields.push('valid irrigation efficiency (1–100%)');
    }

    if (missingFields.length > 0) {
        return {
            canCalculate: false,
            missingFields,
            areaSqMeters,
            reason: !isVolumetricConfirmed
                ? 'Confirm volumetric water content (VWC %) above to estimate water deficit and volume.'
                : `Please enter ${missingFields.join(', ')} to calculate water volume.`
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
        const effFraction = effVal / 100;
        appliedWaterLitres = Math.max(0, netWaterLitres / effFraction);
        appliedWaterMm = Math.max(0, waterDeficitMm / effFraction);
        appliedWaterCubicMeters = appliedWaterLitres / 1000;
    }

    return {
        canCalculate: true,
        missingFields: [],
        currentMoisture: currentVal,
        targetMoisture: targetVal,
        moistureDeficitPercent: Number((moistureDeficitFraction * 100).toFixed(1)),
        soilDepthMm: depthVal,
        areaSqMeters: Number(areaSqMeters.toFixed(2)),
        waterDeficitMm: Number(waterDeficitMm.toFixed(2)),
        netWaterLitres: Math.round(netWaterLitres),
        netWaterCubicMeters: Number(netWaterCubicMeters.toFixed(2)),
        irrigationEfficiency: hasEfficiency ? effVal : null,
        appliedWaterLitres: appliedWaterLitres !== null ? Math.round(appliedWaterLitres) : null,
        appliedWaterMm: appliedWaterMm !== null ? Number(appliedWaterMm.toFixed(2)) : null,
        appliedWaterCubicMeters: appliedWaterCubicMeters !== null ? Number(appliedWaterCubicMeters.toFixed(2)) : null,
        noWaterNeeded: waterDeficitMm === 0
    };
}

function evaluateThresholdAlertState(prevState = {}, {
    crop = '',
    moisture = null,
    threshold = null,
    notificationsEnabled = true,
    cooldownMs = COOLDOWN_MS,
    now = Date.now()
} = {}) {
    const cleanCrop = typeof crop === 'string' && crop.trim() ? crop.toLowerCase().trim() : 'general';
    const moistureVal = parseValidNumber(moisture);
    const thresholdVal = parseValidNumber(threshold);

    if (moistureVal === null || moistureVal < 0 || moistureVal > 100 || thresholdVal === null) {
        return {
            activeAlert: Boolean(prevState.activeAlert),
            crop: prevState.crop || null,
            lastNotifiedAt: prevState.lastNotifiedAt || null,
            bannerType: 'NONE',
            shouldTriggerNotification: false,
            isDuplicateSuppressed: false,
            message: ''
        };
    }

    const isBelow = moistureVal < thresholdVal;
    const wasActiveForCrop = Boolean(prevState.activeAlert) && prevState.crop === cleanCrop;

    if (isBelow) {
        const withinCooldown =
            wasActiveForCrop &&
            typeof prevState.lastNotifiedAt === 'number' &&
            now - prevState.lastNotifiedAt < cooldownMs;

        const cropDisplay = cleanCrop.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

        if (wasActiveForCrop && withinCooldown) {
            return {
                activeAlert: true,
                crop: cleanCrop,
                lastNotifiedAt: prevState.lastNotifiedAt,
                bannerType: 'LOW_MOISTURE_WARNING',
                shouldTriggerNotification: false,
                isDuplicateSuppressed: true,
                message: `Soil moisture (${moistureVal}%) is below the ${thresholdVal}% minimum threshold for ${cropDisplay}. Irrigation is recommended.`
            };
        }

        return {
            activeAlert: true,
            crop: cleanCrop,
            lastNotifiedAt: now,
            bannerType: 'LOW_MOISTURE_WARNING',
            shouldTriggerNotification: Boolean(notificationsEnabled),
            isDuplicateSuppressed: false,
            message: `Low soil moisture alert: ${moistureVal}% is below the ${thresholdVal}% minimum threshold for ${cropDisplay}. Please irrigate.`
        };
    }

    if (wasActiveForCrop) {
        const cropDisplay = cleanCrop.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        return {
            activeAlert: false,
            crop: cleanCrop,
            lastNotifiedAt: prevState.lastNotifiedAt || null,
            bannerType: 'RECOVERED',
            shouldTriggerNotification: false,
            isDuplicateSuppressed: false,
            message: `Resolved: Soil moisture for ${cropDisplay} has recovered to ${moistureVal}% (minimum threshold: ${thresholdVal}%).`
        };
    }

    return {
        activeAlert: false,
        crop: cleanCrop,
        lastNotifiedAt: prevState.lastNotifiedAt || null,
        bannerType: 'NONE',
        shouldTriggerNotification: false,
        isDuplicateSuppressed: false,
        message: ''
    };
}

function polarToCartesian(cx, cy, r, pct) {
    const clamped = Math.max(0, Math.min(100, Number(pct) || 0));
    const angleRad = ((clamped / 100) * 360 - 90) * (Math.PI / 180);
    return {
        x: cx + r * Math.cos(angleRad),
        y: cy + r * Math.sin(angleRad)
    };
}

// ==========================================
// BROWSER DOM INITIALIZATION
// ==========================================

if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        const rootEl = document.getElementById('irrigation-page-root');
        const userId = rootEl?.dataset?.userId || '';
        const userName = rootEl?.dataset?.userName || '';
        const userLocation = rootEl?.dataset?.userLocation || '';

        // Form & Result Elements
        const form = document.getElementById('irrigation-form');
        const cropSelect = document.getElementById('irrigation-crop');
        const moistureInput = document.getElementById('soil-moisture');
        const targetMoistureInput = document.getElementById('target-moisture');
        const formMinThresholdEl = document.getElementById('form-min-threshold');
        const formTargetThresholdEl = document.getElementById('form-target-threshold');
        const checkBtn = document.getElementById('irrigation-check-btn');
        const errorBox = document.getElementById('irrigation-error-box');

        const resultCard = document.getElementById('irrigation-result');
        const statusEl = document.getElementById('irrigation-status');
        const messageEl = document.getElementById('irrigation-message');
        const statusIconEl = document.getElementById('result-status-icon');
        const resultCropEl = document.getElementById('result-crop');
        const resultMoistureEl = document.getElementById('result-moisture');
        const resultThresholdEl = document.getElementById('result-threshold');

        // Sensor & Context Elements
        const sensorDot = document.getElementById('sensor-status-dot');
        const sensorTitle = document.getElementById('sensor-status-title');
        const sensorUpdated = document.getElementById('sensor-last-updated');
        const activeSourcePill = document.getElementById('active-source-pill');
        const syncSensorBtn = document.getElementById('sync-sensor-btn');
        const sensorNpkStrip = document.getElementById('sensor-npk-strip');
        const sensorLiveM = document.getElementById('sensor-live-moisture');
        const sensorLiveN = document.getElementById('sensor-live-n');
        const sensorLiveP = document.getElementById('sensor-live-p');
        const sensorLiveK = document.getElementById('sensor-live-k');
        const farmContextBanner = document.getElementById('farm-context-banner');
        const farmContextChips = document.getElementById('farm-context-chips');
        const farmIdInput = document.getElementById('irrigation-farm-id');
        const loadFarmBtn = document.getElementById('load-farm-record-btn');

        // Alert & Notification Elements
        const lowAlertBanner = document.getElementById('low-moisture-alert-banner');
        const lowAlertTitle = document.getElementById('low-moisture-alert-title');
        const lowAlertMessage = document.getElementById('low-moisture-alert-message');
        const lowAlertCooldown = document.getElementById('low-moisture-cooldown-note');
        const recoveryBanner = document.getElementById('moisture-recovery-banner');
        const recoveryMessage = document.getElementById('moisture-recovery-message');
        const toggleNotifBtn = document.getElementById('toggle-notif-settings-btn');
        const notifPanel = document.getElementById('notif-settings-panel');
        const prefEnableAlerts = document.getElementById('pref-enable-alerts');
        const prefEnableBrowserNotif = document.getElementById('pref-enable-browser-notif');
        const browserNotifStatus = document.getElementById('browser-notif-status');
        const requestNotifPermBtn = document.getElementById('request-notif-permission-btn');

        // Visual Gauge & Droplet Elements
        const simulatedBanner = document.getElementById('simulated-data-banner');
        const gaugeProgressCircle = document.getElementById('gauge-progress-circle');
        const gaugeMinTick = document.getElementById('gauge-min-tick');
        const gaugeTargetTick = document.getElementById('gauge-target-tick');
        const gaugeMoistureValue = document.getElementById('gauge-moisture-value');
        const gaugeConditionBadge = document.getElementById('gauge-condition-badge');
        const gaugeCropLabel = document.getElementById('gauge-crop-label');
        const dropletFillRect = document.getElementById('droplet-fill-rect');
        const dropletTargetLine = document.getElementById('droplet-target-line');
        const dropletStatusHeading = document.getElementById('droplet-status-heading');
        const dropletDeficitText = document.getElementById('droplet-deficit-text');
        const dropletVolumePill = document.getElementById('droplet-water-volume-pill');
        const kpiCurrent = document.getElementById('kpi-current-moisture');
        const kpiMin = document.getElementById('kpi-min-moisture');
        const kpiTarget = document.getElementById('kpi-target-moisture');
        const kpiCondition = document.getElementById('kpi-soil-condition');

        // Zone Bar Elements
        const zoneDry = document.getElementById('zone-segment-dry');
        const zoneOptimal = document.getElementById('zone-segment-optimal');
        const zoneWet = document.getElementById('zone-segment-wet');
        const barPinMin = document.getElementById('bar-pin-min');
        const barPinTarget = document.getElementById('bar-pin-target');
        const barPointerCurrent = document.getElementById('bar-pointer-current');
        const scaleMinLabel = document.getElementById('scale-min-label');
        const scaleTargetLabel = document.getElementById('scale-target-label');
        const scaleWetLabel = document.getElementById('scale-wet-label');

        // Calculator Elements
        const calcFieldArea = document.getElementById('calc-field-area');
        const calcAreaUnit = document.getElementById('calc-area-unit');
        const calcAreaSourceNote = document.getElementById('calc-area-source-note');
        const calcConvertedSqm = document.getElementById('calc-converted-sqm');
        const calcSoilDepth = document.getElementById('calc-soil-depth');
        const calcEfficiencyPreset = document.getElementById('calc-efficiency-preset');
        const customEffGroup = document.getElementById('custom-efficiency-group');
        const calcCustomEfficiency = document.getElementById('calc-custom-efficiency');
        const calcVwcConfirm = document.getElementById('calc-vwc-confirm');
        const calcMissingPrompt = document.getElementById('calc-missing-prompt');
        const calcMissingReason = document.getElementById('calc-missing-reason');
        const calcResultsPanel = document.getElementById('calc-results-panel');
        const calcZeroWaterNotice = document.getElementById('calc-zero-water-notice');
        const calcOutDeficitPct = document.getElementById('calc-out-deficit-pct');
        const calcOutMoistureCompare = document.getElementById('calc-out-moisture-compare');
        const calcOutDeficitMm = document.getElementById('calc-out-deficit-mm');
        const calcOutDepthNote = document.getElementById('calc-out-depth-note');
        const calcOutNetLitres = document.getElementById('calc-out-net-litres');
        const calcOutNetM3 = document.getElementById('calc-out-net-m3');
        const calcAppliedBanner = document.getElementById('calc-applied-water-banner');
        const calcAppliedTitle = document.getElementById('calc-applied-title');
        const calcAppliedDetails = document.getElementById('calc-applied-details');

        // History Elements
        const historyContentWrapper = document.getElementById('history-content-wrapper');
        const historyBarsChart = document.getElementById('history-bars-chart');
        const historyTableBody = document.getElementById('history-table-body');
        const historyEmptyState = document.getElementById('history-empty-state');
        const clearHistoryBtn = document.getElementById('clear-history-btn');

        // State
        let currentSource = 'manual'; // 'sensor' | 'farm_record' | 'manual' | 'simulated'
        let loadedFarmLabel = '';
        let backendMinThreshold = null;
        let historyFilter = 'all';
        let contextItems = [];

        if (userName) contextItems.push(`Farmer: ${userName}`);
        if (userLocation && userLocation !== 'Not set') contextItems.push(`Location: ${userLocation}`);

        function showError(msg) {
            if (!errorBox) return;
            if (!msg) {
                errorBox.style.display = 'none';
                errorBox.textContent = '';
            } else {
                errorBox.textContent = msg;
                errorBox.style.display = 'block';
            }
        }

        function loadPrefs() {
            try {
                const raw = localStorage.getItem(STORAGE_KEYS.PREFS);
                if (raw) return { enableAlerts: true, enableBrowserNotif: true, ...JSON.parse(raw) };
            } catch (e) {}
            return { enableAlerts: true, enableBrowserNotif: true };
        }

        function savePrefs(prefs) {
            try {
                localStorage.setItem(STORAGE_KEYS.PREFS, JSON.stringify(prefs));
            } catch (e) {}
        }

        function loadAlertState() {
            try {
                const raw = localStorage.getItem(STORAGE_KEYS.ALERT_STATE);
                if (raw) return JSON.parse(raw);
            } catch (e) {}
            return {};
        }

        function saveAlertState(state) {
            try {
                localStorage.setItem(STORAGE_KEYS.ALERT_STATE, JSON.stringify(state || {}));
            } catch (e) {}
        }

        function loadHistory() {
            try {
                const raw = localStorage.getItem(STORAGE_KEYS.HISTORY);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    return Array.isArray(parsed) ? parsed : [];
                }
            } catch (e) {}
            return [];
        }

        function appendHistory(entry) {
            const list = loadHistory();
            const next = [entry, ...list].slice(0, 30);
            try {
                localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(next));
            } catch (e) {}
            return next;
        }

        function renderContextBanner() {
            if (!farmContextBanner || !farmContextChips) return;
            if (contextItems.length === 0) {
                farmContextBanner.style.display = 'none';
                return;
            }
            farmContextBanner.style.display = 'block';
            farmContextChips.innerHTML = contextItems
                .map(text => `<span class="context-chip">${text}</span>`)
                .join('');
        }

        function updateSourcePill() {
            if (!activeSourcePill) return;
            activeSourcePill.className = 'source-pill';
            if (currentSource === 'sensor') {
                activeSourcePill.textContent = 'Source: Live IoT Sensor';
                activeSourcePill.classList.add('source-live');
            } else if (currentSource === 'farm_record') {
                activeSourcePill.textContent = `Source: Stored Farm (${loadedFarmLabel || 'Record'})`;
            } else if (currentSource === 'simulated') {
                activeSourcePill.textContent = 'Source: Simulated Demo Data';
                activeSourcePill.classList.add('source-simulated');
            } else {
                activeSourcePill.textContent = 'Source: Manual Farmer Entry';
            }

            if (simulatedBanner) {
                simulatedBanner.style.display = currentSource === 'simulated' ? 'flex' : 'none';
            }
        }

        function updateBrowserNotifPermissionUI() {
            if (!browserNotifStatus) return;
            if (!('Notification' in window)) {
                browserNotifStatus.textContent = 'Browser Notifications: Not supported in this browser';
                if (requestNotifPermBtn) requestNotifPermBtn.style.display = 'none';
                return;
            }
            const perm = window.Notification.permission;
            browserNotifStatus.textContent = `Browser Notification Permission: ${perm.toUpperCase()}`;
            if (requestNotifPermBtn) {
                requestNotifPermBtn.style.display = perm === 'granted' ? 'none' : 'inline-flex';
            }
        }

        function triggerThresholdCheck() {
            const crop = cropSelect?.value || '';
            const moistureVal = parseValidNumber(moistureInput?.value);
            const tInfo = getCropThresholds(crop, backendMinThreshold, targetMoistureInput?.value);
            const prefs = loadPrefs();

            if (moistureVal === null || moistureVal < 0 || moistureVal > 100) {
                if (lowAlertBanner) lowAlertBanner.style.display = 'none';
                if (recoveryBanner) recoveryBanner.style.display = 'none';
                return;
            }

            const prevState = loadAlertState();
            const nextState = evaluateThresholdAlertState(prevState, {
                crop: crop || 'general',
                moisture: moistureVal,
                threshold: tInfo.minThreshold,
                notificationsEnabled: prefs.enableAlerts
            });

            saveAlertState(nextState);

            if (nextState.bannerType === 'LOW_MOISTURE_WARNING') {
                if (lowAlertBanner) lowAlertBanner.style.display = 'block';
                if (recoveryBanner) recoveryBanner.style.display = 'none';
                if (lowAlertTitle) {
                    lowAlertTitle.textContent =
                        currentSource === 'simulated'
                            ? 'Low Soil Moisture Warning (Simulated Demo)'
                            : 'Low Soil Moisture Warning';
                }
                if (lowAlertMessage) lowAlertMessage.textContent = nextState.message;
                if (lowAlertCooldown) {
                    lowAlertCooldown.style.display = nextState.isDuplicateSuppressed ? 'block' : 'none';
                }

                if (
                    nextState.shouldTriggerNotification &&
                    prefs.enableBrowserNotif &&
                    'Notification' in window &&
                    window.Notification.permission === 'granted'
                ) {
                    try {
                        const simPrefix = currentSource === 'simulated' ? '[SIMULATED] ' : '';
                        new window.Notification(`${simPrefix}AgriMind Low Soil Moisture Alert`, {
                            body: nextState.message
                        });
                    } catch (e) {}
                }
            } else if (nextState.bannerType === 'RECOVERED') {
                if (lowAlertBanner) lowAlertBanner.style.display = 'none';
                if (recoveryBanner) recoveryBanner.style.display = 'block';
                if (recoveryMessage) recoveryMessage.textContent = nextState.message;
            } else {
                if (lowAlertBanner) lowAlertBanner.style.display = 'none';
                if (recoveryBanner) recoveryBanner.style.display = 'none';
            }
        }

        function updateAllVisualsAndCalculator() {
            const crop = cropSelect?.value || '';
            const cropText = crop
                ? cropSelect.options[cropSelect.selectedIndex]?.text || crop
                : 'Select a crop';

            const tInfo = getCropThresholds(crop, backendMinThreshold, targetMoistureInput?.value);
            const evalRes = evaluateMoistureCondition(
                moistureInput?.value,
                tInfo.minThreshold,
                tInfo.targetMoisture,
                tInfo.tooWetThreshold
            );

            if (targetMoistureInput) {
                targetMoistureInput.placeholder = `Default: ${tInfo.targetMoisture}%`;
            }
            if (formMinThresholdEl) formMinThresholdEl.textContent = `${tInfo.minThreshold}%`;
            if (formTargetThresholdEl) formTargetThresholdEl.textContent = `${tInfo.targetMoisture}%`;

            // 1. Update Circular SVG Gauge (cx=100, cy=100, r=76, circumference=477.52)
            const circumference = 2 * Math.PI * 76;
            const pct = evalRes.valid ? Math.max(0, Math.min(100, evalRes.moisture)) : 0;
            const offset = circumference - (circumference * pct) / 100;

            let strokeColor = '#64748B';
            let pillClass = 'condition-pill condition-unknown';
            if (evalRes.condition === 'DRY') {
                strokeColor = '#DC3545';
                pillClass = 'condition-pill condition-dry';
            } else if (evalRes.condition === 'OPTIMAL') {
                strokeColor = '#2E8B57';
                pillClass = 'condition-pill condition-optimal';
            } else if (evalRes.condition === 'TOO_WET') {
                strokeColor = '#2878ff';
                pillClass = 'condition-pill condition-wet';
            }

            if (gaugeProgressCircle) {
                gaugeProgressCircle.style.strokeDashoffset = String(offset);
                gaugeProgressCircle.style.stroke = strokeColor;
            }

            // Update Min & Target Tick Marks on Circular Ring
            const minInner = polarToCartesian(100, 100, 64, tInfo.minThreshold);
            const minOuter = polarToCartesian(100, 100, 88, tInfo.minThreshold);
            if (gaugeMinTick) {
                gaugeMinTick.setAttribute('x1', String(minInner.x));
                gaugeMinTick.setAttribute('y1', String(minInner.y));
                gaugeMinTick.setAttribute('x2', String(minOuter.x));
                gaugeMinTick.setAttribute('y2', String(minOuter.y));
            }

            const targetInner = polarToCartesian(100, 100, 64, tInfo.targetMoisture);
            const targetOuter = polarToCartesian(100, 100, 88, tInfo.targetMoisture);
            if (gaugeTargetTick) {
                gaugeTargetTick.setAttribute('x1', String(targetInner.x));
                gaugeTargetTick.setAttribute('y1', String(targetInner.y));
                gaugeTargetTick.setAttribute('x2', String(targetOuter.x));
                gaugeTargetTick.setAttribute('y2', String(targetOuter.y));
            }

            if (gaugeMoistureValue) {
                gaugeMoistureValue.textContent = evalRes.valid ? `${evalRes.moisture}%` : '--%';
                gaugeMoistureValue.style.color = strokeColor;
            }
            if (gaugeConditionBadge) {
                gaugeConditionBadge.className = pillClass;
                gaugeConditionBadge.textContent = evalRes.label;
            }
            if (gaugeCropLabel) {
                gaugeCropLabel.textContent = cropText;
            }

            // 2. Update Droplet Graphic & KPIs
            const dropletHeight = evalRes.valid ? Math.max(6, (pct / 100) * 84) : 0;
            const dropletY = 92 - dropletHeight;
            if (dropletFillRect) {
                dropletFillRect.setAttribute('y', String(dropletY));
                dropletFillRect.setAttribute('height', String(evalRes.valid ? dropletHeight + 8 : 0));
            }
            if (dropletTargetLine) {
                const targetLineY = 92 - (tInfo.targetMoisture / 100) * 84;
                dropletTargetLine.setAttribute('y1', String(targetLineY));
                dropletTargetLine.setAttribute('y2', String(targetLineY));
            }

            if (dropletStatusHeading) {
                dropletStatusHeading.textContent = evalRes.valid
                    ? evalRes.condition === 'DRY'
                        ? 'Dry — Irrigation Needed'
                        : evalRes.condition === 'TOO_WET'
                        ? 'Too Wet — Avoid Watering'
                        : 'Optimal Soil Moisture'
                    : 'Soil Water Fill';
            }
            if (dropletDeficitText) {
                dropletDeficitText.textContent = evalRes.valid
                    ? evalRes.irrigationRequired
                        ? `Current reading is ${evalRes.deficitToMin}% below the minimum threshold (${tInfo.minThreshold}%) and ${evalRes.deficitToTarget}% below target (${tInfo.targetMoisture}%).`
                        : evalRes.belowTarget
                        ? `Above minimum threshold (${tInfo.minThreshold}%), with ${evalRes.deficitToTarget}% room to reach the ${tInfo.targetMoisture}% target.`
                        : `Soil moisture meets or exceeds the ${tInfo.targetMoisture}% target level.`
                    : 'Enter or sync a moisture reading to view deficit to minimum and target levels.';
            }

            if (kpiCurrent) kpiCurrent.textContent = evalRes.valid ? `${evalRes.moisture}%` : '--%';
            if (kpiMin) kpiMin.textContent = `${tInfo.minThreshold}%`;
            if (kpiTarget) kpiTarget.textContent = `${tInfo.targetMoisture}%`;
            if (kpiCondition) {
                kpiCondition.textContent = evalRes.label;
                kpiCondition.style.color = strokeColor;
            }

            // 3. Update Horizontal Threshold Bar
            const dryW = Math.max(5, Math.min(85, tInfo.minThreshold));
            const optW = Math.max(10, Math.min(90 - dryW, tInfo.tooWetThreshold - tInfo.minThreshold));
            const wetW = Math.max(5, 100 - dryW - optW);

            if (zoneDry) {
                zoneDry.style.width = `${dryW}%`;
                zoneDry.innerHTML = `<span>Dry (&lt;${tInfo.minThreshold}%)</span>`;
            }
            if (zoneOptimal) {
                zoneOptimal.style.width = `${optW}%`;
                zoneOptimal.innerHTML = `<span>Optimal (${tInfo.minThreshold}–${tInfo.tooWetThreshold}%)</span>`;
            }
            if (zoneWet) {
                zoneWet.style.width = `${wetW}%`;
                zoneWet.innerHTML = `<span>Wet (&gt;${tInfo.tooWetThreshold}%)</span>`;
            }
            if (barPinMin) barPinMin.style.left = `${tInfo.minThreshold}%`;
            if (barPinTarget) barPinTarget.style.left = `${tInfo.targetMoisture}%`;
            if (barPointerCurrent) {
                if (evalRes.valid) {
                    barPointerCurrent.style.display = 'block';
                    barPointerCurrent.style.left = `${pct}%`;
                    barPointerCurrent.style.background = strokeColor;
                } else {
                    barPointerCurrent.style.display = 'none';
                }
            }
            if (scaleMinLabel) scaleMinLabel.textContent = `Min: ${tInfo.minThreshold}%`;
            if (scaleTargetLabel) scaleTargetLabel.textContent = `Target: ${tInfo.targetMoisture}%`;
            if (scaleWetLabel) scaleWetLabel.textContent = `Too Wet: ${tInfo.tooWetThreshold}%`;

            // 4. Update Water Requirement Calculator
            const effChoice = calcEfficiencyPreset?.value || '';
            const effToUse =
                effChoice === 'custom'
                    ? calcCustomEfficiency?.value
                    : effChoice !== ''
                    ? effChoice
                    : null;

            const waterEst = calculateWaterRequirement({
                currentMoisture: moistureInput?.value,
                targetMoisture: tInfo.targetMoisture,
                fieldArea: calcFieldArea?.value,
                areaUnit: calcAreaUnit?.value || 'hectare',
                soilDepthMm: calcSoilDepth?.value,
                irrigationEfficiency: effToUse,
                isVolumetricConfirmed: Boolean(calcVwcConfirm?.checked)
            });

            if (calcConvertedSqm) {
                calcConvertedSqm.textContent =
                    waterEst.areaSqMeters !== null && waterEst.areaSqMeters !== undefined
                        ? `Equivalent area: ${waterEst.areaSqMeters.toLocaleString('en-IN')} m²`
                        : '';
            }

            if (waterEst.canCalculate) {
                if (calcMissingPrompt) calcMissingPrompt.style.display = 'none';
                if (calcResultsPanel) calcResultsPanel.style.display = 'block';
                if (calcZeroWaterNotice) {
                    calcZeroWaterNotice.style.display = waterEst.noWaterNeeded ? 'flex' : 'none';
                }
                if (calcOutDeficitPct) {
                    calcOutDeficitPct.textContent = `${waterEst.moistureDeficitPercent}%`;
                }
                if (calcOutMoistureCompare) {
                    calcOutMoistureCompare.textContent = `${waterEst.currentMoisture}% current vs ${waterEst.targetMoisture}% target`;
                }
                if (calcOutDeficitMm) {
                    calcOutDeficitMm.textContent = `${waterEst.waterDeficitMm} mm`;
                }
                if (calcOutDepthNote) {
                    calcOutDepthNote.textContent = `Over ${waterEst.soilDepthMm} mm root depth`;
                }
                if (calcOutNetLitres) {
                    calcOutNetLitres.textContent = `${waterEst.netWaterLitres.toLocaleString('en-IN')} L`;
                }
                if (calcOutNetM3) {
                    calcOutNetM3.textContent = `${waterEst.netWaterCubicMeters} m³ over ${waterEst.areaSqMeters.toLocaleString('en-IN')} m²`;
                }

                if (waterEst.appliedWaterLitres !== null && calcAppliedBanner) {
                    calcAppliedBanner.style.display = 'flex';
                    if (calcAppliedTitle) {
                        calcAppliedTitle.textContent = `Gross Applied Water (at ${waterEst.irrigationEfficiency}% Irrigation Efficiency):`;
                    }
                    if (calcAppliedDetails) {
                        calcAppliedDetails.textContent = `${waterEst.appliedWaterLitres.toLocaleString('en-IN')} Litres (${waterEst.appliedWaterCubicMeters} m³ | ${waterEst.appliedWaterMm} mm gross depth)`;
                    }
                } else if (calcAppliedBanner) {
                    calcAppliedBanner.style.display = 'none';
                }

                if (dropletVolumePill) {
                    dropletVolumePill.style.display = 'inline-block';
                    dropletVolumePill.textContent = waterEst.noWaterNeeded
                        ? 'Estimated Water Requirement: 0 L'
                        : `Estimated Net Water: ${waterEst.netWaterLitres.toLocaleString('en-IN')} L (${waterEst.netWaterCubicMeters} m³)`;
                }
            } else {
                if (calcMissingPrompt) calcMissingPrompt.style.display = 'flex';
                if (calcMissingReason) calcMissingReason.textContent = waterEst.reason;
                if (calcResultsPanel) calcResultsPanel.style.display = 'none';
                if (dropletVolumePill) dropletVolumePill.style.display = 'none';
            }

            updateSourcePill();
        }

        function renderHistory() {
            const all = loadHistory();
            const now = Date.now();
            const filtered = all.filter(item => {
                if (historyFilter === 'all') return true;
                const ts = new Date(item.timestamp).getTime();
                if (!Number.isFinite(ts)) return false;
                if (historyFilter === '24h') return now - ts <= 24 * 60 * 60 * 1000;
                if (historyFilter === '7d') return now - ts <= 7 * 24 * 60 * 60 * 1000;
                return true;
            });

            if (clearHistoryBtn) {
                clearHistoryBtn.style.display = all.length > 0 ? 'inline-flex' : 'none';
            }

            if (filtered.length === 0) {
                if (historyContentWrapper) historyContentWrapper.style.display = 'none';
                if (historyEmptyState) historyEmptyState.style.display = 'block';
                return;
            }

            if (historyContentWrapper) historyContentWrapper.style.display = 'block';
            if (historyEmptyState) historyEmptyState.style.display = 'none';

            const chartItems = filtered.slice(0, 10).reverse();
            if (historyBarsChart) {
                historyBarsChart.innerHTML = chartItems
                    .map(item => {
                        const val = Math.max(0, Math.min(100, Number(item.moisture) || 0));
                        const isLow = val < (item.threshold || 35);
                        const isWet = val > 80;
                        const color = isLow ? '#dc3545' : isWet ? '#2878ff' : '#2e8b57';
                        const d = new Date(item.timestamp);
                        const timeStr = Number.isFinite(d.getTime())
                            ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : '';

                        return `
                            <div class="history-bar-col">
                                <span class="history-bar-val" style="color: ${color};">${val}%</span>
                                <div class="history-bar-track">
                                    <div class="history-bar-fill" style="height: ${Math.max(val, 5)}%; background: ${color};"></div>
                                </div>
                                <span class="history-bar-time">${timeStr}</span>
                            </div>
                        `;
                    })
                    .join('');
            }

            if (historyTableBody) {
                historyTableBody.innerHTML = filtered
                    .slice(0, 8)
                    .map(item => {
                        const d = new Date(item.timestamp);
                        const dateStr = Number.isFinite(d.getTime()) ? d.toLocaleString() : '-';
                        const condBadge =
                            item.condition === 'DRY'
                                ? '<span class="condition-pill condition-dry">Dry</span>'
                                : item.condition === 'TOO_WET'
                                ? '<span class="condition-pill condition-wet">Too Wet</span>'
                                : '<span class="condition-pill condition-optimal">Optimal</span>';
                        const srcText =
                            item.source === 'simulated'
                                ? 'Simulated Demo'
                                : item.source === 'sensor'
                                ? 'Live Sensor'
                                : item.source === 'farm_record'
                                ? 'Stored Farm'
                                : 'Manual';

                        return `
                            <tr>
                                <td>${dateStr}</td>
                                <td><strong>${item.cropLabel || item.crop}</strong></td>
                                <td><strong>${item.moisture}%</strong></td>
                                <td>${item.threshold}% / ${item.targetMoisture}%</td>
                                <td>${condBadge}</td>
                                <td>${srcText}</td>
                            </tr>
                        `;
                    })
                    .join('');
            }
        }

        async function syncLiveSensor(applyToInput = false) {
            if (syncSensorBtn) {
                syncSensorBtn.disabled = true;
                syncSensorBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Syncing...';
            }

            try {
                const res = await fetch('/api/sensor/data');
                const payload = await res.json();
                const isConnected = Boolean(payload?.connected && payload?.available);
                const data = payload?.data || {};
                const mVal = parseValidNumber(data.moisture);
                const validM = mVal !== null && mVal >= 0 && mVal <= 100;

                let ageMin = null;
                let isStale = false;
                if (data.updatedAt) {
                    const ts = new Date(data.updatedAt).getTime();
                    if (Number.isFinite(ts)) {
                        ageMin = Math.max(0, Math.round((Date.now() - ts) / 60000));
                        isStale = Date.now() - ts > STALE_MS;
                    }
                }

                if (isConnected && validM) {
                    if (sensorDot) {
                        sensorDot.className = isStale
                            ? 'sensor-dot sensor-dot-stale'
                            : 'sensor-dot sensor-dot-live';
                    }
                    if (sensorTitle) {
                        sensorTitle.textContent = isStale
                            ? 'Sensor Connected (Reading Stale)'
                            : 'Live Sensor Bridge Connected';
                    }
                    if (sensorUpdated) {
                        sensorUpdated.textContent = data.updatedAt
                            ? `Last reading: ${new Date(data.updatedAt).toLocaleString()} (${ageMin}m ago)`
                            : 'Live reading available';
                    }
                    if (sensorNpkStrip) {
                        sensorNpkStrip.style.display = 'flex';
                        if (sensorLiveM) sensorLiveM.textContent = String(mVal);
                        if (sensorLiveN) sensorLiveN.textContent = data.nitrogen ?? '-';
                        if (sensorLiveP) sensorLiveP.textContent = data.phosphorus ?? '-';
                        if (sensorLiveK) sensorLiveK.textContent = data.potassium ?? '-';
                    }

                    if (applyToInput || !moistureInput?.value) {
                        if (moistureInput) moistureInput.value = String(mVal);
                        currentSource = 'sensor';
                        updateAllVisualsAndCalculator();
                        triggerThresholdCheck();
                    }
                } else {
                    if (sensorDot) sensorDot.className = 'sensor-dot sensor-dot-offline';
                    if (sensorTitle) {
                        sensorTitle.textContent = validM
                            ? 'Sensor Bridge Offline (Cached Reading Available)'
                            : 'Sensor Bridge Disconnected';
                    }
                    if (sensorUpdated) {
                        sensorUpdated.textContent =
                            payload?.message ||
                            'Hardware sensor is not connected. Enter moisture manually, load a Farm ID, or use a simulated preset below.';
                    }
                    if (sensorNpkStrip) {
                        sensorNpkStrip.style.display = validM ? 'flex' : 'none';
                    }
                }
            } catch (err) {
                if (sensorDot) sensorDot.className = 'sensor-dot sensor-dot-offline';
                if (sensorTitle) sensorTitle.textContent = 'Sensor Bridge Disconnected';
                if (sensorUpdated) {
                    sensorUpdated.textContent = 'Unable to reach /api/sensor/data. Using manual or stored farm input.';
                }
            } finally {
                if (syncSensorBtn) {
                    syncSensorBtn.disabled = false;
                    syncSensorBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Sync Sensor';
                }
            }
        }

        async function loadRecentConsultationContext() {
            renderContextBanner();
            if (!userId || !/^[0-9a-fA-F]{24}$/.test(userId)) return;

            try {
                const res = await fetch(`/api/recommend/${userId}`);
                if (!res.ok) return;
                const recs = await res.json();
                if (Array.isArray(recs) && recs.length > 0) {
                    const latest = recs[0];
                    if (latest.recommendedCrop) {
                        contextItems.push(`Recommended Crop: ${latest.recommendedCrop}`);
                        const normalized = latest.recommendedCrop.toLowerCase().trim().replace(/\s+/g, '_');
                        if (cropSelect && !cropSelect.value) {
                            const optionExists = Array.from(cropSelect.options).some(
                                opt => opt.value === normalized
                            );
                            if (optionExists) {
                                cropSelect.value = normalized;
                            }
                        }
                    }
                    if (latest.area && Number(latest.area) > 0) {
                        contextItems.push(`Field Area: ${latest.area} ha`);
                        if (calcFieldArea && !calcFieldArea.value) {
                            calcFieldArea.value = String(latest.area);
                            if (calcAreaUnit) calcAreaUnit.value = 'hectare';
                            if (calcAreaSourceNote) {
                                calcAreaSourceNote.textContent =
                                    'Pre-filled from your most recent AgriMind crop recommendation.';
                            }
                        }
                    }
                    if (latest.season) {
                        contextItems.push(`Season: ${latest.season}`);
                    }
                    renderContextBanner();
                    updateAllVisualsAndCalculator();
                }
            } catch (err) {
                console.warn('Could not load recent consultation:', err);
            }
        }

        // Initialize Notification Preferences UI
        const initialPrefs = loadPrefs();
        if (prefEnableAlerts) prefEnableAlerts.checked = Boolean(initialPrefs.enableAlerts);
        if (prefEnableBrowserNotif) prefEnableBrowserNotif.checked = Boolean(initialPrefs.enableBrowserNotif);
        updateBrowserNotifPermissionUI();

        if (toggleNotifBtn && notifPanel) {
            toggleNotifBtn.addEventListener('click', () => {
                notifPanel.style.display = notifPanel.style.display === 'none' ? 'block' : 'none';
            });
        }

        if (prefEnableAlerts) {
            prefEnableAlerts.addEventListener('change', () => {
                const p = loadPrefs();
                savePrefs({ ...p, enableAlerts: prefEnableAlerts.checked });
                triggerThresholdCheck();
            });
        }

        if (prefEnableBrowserNotif) {
            prefEnableBrowserNotif.addEventListener('change', () => {
                const p = loadPrefs();
                savePrefs({ ...p, enableBrowserNotif: prefEnableBrowserNotif.checked });
            });
        }

        if (requestNotifPermBtn) {
            requestNotifPermBtn.addEventListener('click', async () => {
                if ('Notification' in window) {
                    try {
                        await window.Notification.requestPermission();
                    } catch (e) {}
                    updateBrowserNotifPermissionUI();
                }
            });
        }

        if (syncSensorBtn) {
            syncSensorBtn.addEventListener('click', () => syncLiveSensor(true));
        }

        // Load Stored Farm Record (GET /api/farm/:farmId)
        if (loadFarmBtn) {
            loadFarmBtn.addEventListener('click', async () => {
                const cleanId = (farmIdInput?.value || '').trim().toUpperCase();
                if (!cleanId) {
                    showError('Please enter a Farm ID (e.g., FARM101) to load stored farm data.');
                    return;
                }
                showError('');
                loadFarmBtn.disabled = true;
                try {
                    const res = await fetch(`/api/farm/${encodeURIComponent(cleanId)}`);
                    const data = await res.json();
                    if (!res.ok) {
                        showError(data.message || `Farm ID ${cleanId} not found. Try FARM101 – FARM808.`);
                        return;
                    }
                    if (data.moisture !== undefined && moistureInput) {
                        moistureInput.value = String(data.moisture);
                        currentSource = 'farm_record';
                        loadedFarmLabel = `${data.farmId} (${data.ownerName})`;
                        if (!contextItems.some(c => c.includes(data.farmId))) {
                            contextItems.push(`${data.farmId}: ${data.ownerName} (pH ${data.soilPh})`);
                            renderContextBanner();
                        }
                        updateAllVisualsAndCalculator();
                        triggerThresholdCheck();
                    }
                } catch (err) {
                    showError('Unable to load stored farm record.');
                } finally {
                    loadFarmBtn.disabled = false;
                }
            });
        }

        // Simulated Demo Buttons
        document.querySelectorAll('.sim-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const simVal = btn.getAttribute('data-sim-moisture');
                if (moistureInput && simVal) {
                    showError('');
                    if (cropSelect && !cropSelect.value) {
                        cropSelect.value = 'wheat';
                    }
                    moistureInput.value = simVal;
                    currentSource = 'simulated';
                    updateAllVisualsAndCalculator();
                    triggerThresholdCheck();
                }
            });
        });

        // Soil Depth Presets
        document.querySelectorAll('.preset-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const mm = chip.getAttribute('data-depth-mm');
                if (calcSoilDepth && mm) {
                    calcSoilDepth.value = mm;
                    document.querySelectorAll('.preset-chip').forEach(c => c.classList.remove('active'));
                    chip.classList.add('active');
                    updateAllVisualsAndCalculator();
                }
            });
        });

        // Input Change Listeners
        if (cropSelect) {
            cropSelect.addEventListener('change', () => {
                backendMinThreshold = null;
                showError('');
                updateAllVisualsAndCalculator();
                triggerThresholdCheck();
            });
        }

        if (moistureInput) {
            moistureInput.addEventListener('input', () => {
                currentSource = 'manual';
                showError('');
                updateAllVisualsAndCalculator();
                triggerThresholdCheck();
            });
        }

        if (targetMoistureInput) {
            targetMoistureInput.addEventListener('input', updateAllVisualsAndCalculator);
        }

        [calcFieldArea, calcAreaUnit, calcSoilDepth, calcCustomEfficiency, calcVwcConfirm].forEach(el => {
            if (el) {
                el.addEventListener('input', updateAllVisualsAndCalculator);
                el.addEventListener('change', updateAllVisualsAndCalculator);
            }
        });

        if (calcEfficiencyPreset) {
            calcEfficiencyPreset.addEventListener('change', () => {
                if (customEffGroup) {
                    customEffGroup.style.display =
                        calcEfficiencyPreset.value === 'custom' ? 'block' : 'none';
                }
                updateAllVisualsAndCalculator();
            });
        }

        // History Filter Buttons
        document.querySelectorAll('.history-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.history-filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                historyFilter = btn.getAttribute('data-filter') || 'all';
                renderHistory();
            });
        });

        if (clearHistoryBtn) {
            clearHistoryBtn.addEventListener('click', () => {
                try {
                    localStorage.removeItem(STORAGE_KEYS.HISTORY);
                } catch (e) {}
                renderHistory();
            });
        }

        // Main Irrigation Check Submit Handler (Preserves existing backend API call)
        if (form) {
            form.addEventListener('submit', async event => {
                event.preventDefault();
                showError('');

                const crop = cropSelect?.value || '';
                if (!crop) {
                    showError('Please select a crop.');
                    return;
                }

                if (checkBtn) {
                    checkBtn.disabled = true;
                    checkBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking...';
                }

                let moisture = null;
                let usedSource = currentSource;

                try {
                    // 1. First Priority: Try live sensor
                    try {
                        const sensorResponse = await fetch('/api/sensor/data');
                        const sensorData = await sensorResponse.json();

                        if (
                            sensorResponse.ok &&
                            sensorData.success &&
                            sensorData.available &&
                            sensorData.data &&
                            sensorData.data.moisture !== undefined &&
                            sensorData.data.moisture !== null
                        ) {
                            moisture = Number(sensorData.data.moisture);
                            if (moistureInput) moistureInput.value = String(moisture);
                            usedSource = 'sensor';
                            currentSource = 'sensor';
                        }
                    } catch (sensorError) {
                        console.warn('Sensor unavailable. Using manual moisture.', sensorError);
                    }

                    // 2. Fallback: Manual / Stored / Simulated Moisture Input
                    if (moisture === null || Number.isNaN(moisture)) {
                        moisture = parseValidNumber(moistureInput?.value);
                        if (moisture === null || moisture < 0 || moisture > 100) {
                            showError('Please enter a valid soil moisture percentage between 0 and 100%.');
                            return;
                        }
                    }

                    // 3. Call existing POST /api/irrigation/check
                    const response = await fetch('/api/irrigation/check', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ crop, moisture })
                    });

                    const data = await response.json();

                    if (!response.ok || !data.success) {
                        throw new Error(data.message || 'Unable to check irrigation.');
                    }

                    backendMinThreshold = Number(data.threshold);

                    // 4. Display Official Result
                    if (resultCard) resultCard.style.display = 'block';
                    const formattedCrop = data.crop
                        .replace(/_/g, ' ')
                        .replace(/\b\w/g, char => char.toUpperCase());

                    if (resultCropEl) resultCropEl.textContent = formattedCrop;
                    if (resultMoistureEl) resultMoistureEl.textContent = data.soilMoisture;
                    if (resultThresholdEl) resultThresholdEl.textContent = data.threshold;
                    if (messageEl) messageEl.textContent = data.message;

                    if (data.irrigationRequired) {
                        if (statusEl) statusEl.textContent = 'Irrigation Required';
                        if (statusIconEl) {
                            statusIconEl.innerHTML = '<i class="fas fa-tint"></i>';
                            statusIconEl.classList.add('irrigation-required');
                            statusIconEl.classList.remove('irrigation-not-required');
                        }
                    } else {
                        if (statusEl) statusEl.textContent = 'Irrigation Not Required';
                        if (statusIconEl) {
                            statusIconEl.innerHTML = '<i class="fas fa-check-circle"></i>';
                            statusIconEl.classList.add('irrigation-not-required');
                            statusIconEl.classList.remove('irrigation-required');
                        }
                    }

                    // 5. Update Gauge, Calculator, Alerts & History
                    const tInfo = getCropThresholds(crop, backendMinThreshold, targetMoistureInput?.value);
                    const evalRes = evaluateMoistureCondition(
                        data.soilMoisture,
                        tInfo.minThreshold,
                        tInfo.targetMoisture,
                        tInfo.tooWetThreshold
                    );

                    updateAllVisualsAndCalculator();
                    triggerThresholdCheck();

                    appendHistory({
                        timestamp: new Date().toISOString(),
                        crop,
                        cropLabel: formattedCrop,
                        moisture: data.soilMoisture,
                        threshold: tInfo.minThreshold,
                        targetMoisture: tInfo.targetMoisture,
                        condition: evalRes.condition,
                        source: usedSource
                    });
                    renderHistory();

                    if (resultCard && typeof resultCard.scrollIntoView === 'function') {
                        resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                } catch (error) {
                    showError(error.message || 'Unable to check irrigation.');
                } finally {
                    if (checkBtn) {
                        checkBtn.disabled = false;
                        checkBtn.innerHTML = '<i class="fas fa-search"></i> Check Irrigation';
                    }
                }
            });
        }

        // Initial Render & Async Fetch
        updateAllVisualsAndCalculator();
        renderHistory();
        syncLiveSensor(true);
        loadRecentConsultationContext();
    });
}

// Export pure functions for Node unit testing without affecting browser execution
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        IRRIGATION_THRESHOLDS,
        getCropThresholds,
        evaluateMoistureCondition,
        calculateWaterRequirement,
        evaluateThresholdAlertState
    };
}