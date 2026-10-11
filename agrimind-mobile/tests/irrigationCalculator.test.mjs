import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  IRRIGATION_THRESHOLDS,
  getCropThresholds,
  evaluateMoistureCondition,
  convertAreaToSqMeters,
  calculateWaterRequirement,
  evaluateSensorFreshness,
  evaluateThresholdAlertState,
} from '../src/services/irrigationCalculator.js';
import * as reactCalc from '../../agrimind-frontend/src/services/irrigationCalculator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

console.log('Running AgriMind Smart Irrigation Test Suite (Web + Mobile)...\n');

let passed = 0;
const test = (name, fn) => {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passed += 1;
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
};

// 1. Dynamic Crop Thresholds & No Invented Defaults
test('Matches backend IRRIGATION_THRESHOLDS for all 43 crops and does not invent defaults when crop is empty or unknown', () => {
  assert.equal(Object.keys(IRRIGATION_THRESHOLDS).length, 43);
  assert.equal(Object.keys(reactCalc.IRRIGATION_THRESHOLDS).length, 43);

  // Empty crop -> no invented 35% / 55%
  const emptyCrop = reactCalc.getCropThresholds('');
  assert.equal(emptyCrop.hasConfiguredThreshold, false);
  assert.equal(emptyCrop.minThreshold, null);
  assert.equal(emptyCrop.recommendedTarget, null);
  assert.equal(emptyCrop.targetMoisture, null);

  // Unknown crop -> no invented 35% / 55%
  const unknownCrop = reactCalc.getCropThresholds('dragonfruit');
  assert.equal(unknownCrop.hasConfiguredThreshold, false);
  assert.equal(unknownCrop.minThreshold, null);

  // Known crops update dynamically
  const barley = reactCalc.getCropThresholds('barley');
  assert.equal(barley.hasConfiguredThreshold, true);
  assert.equal(barley.minThreshold, 30);
  assert.equal(barley.targetMoisture, 50);

  const tomato = reactCalc.getCropThresholds('tomato');
  assert.equal(tomato.hasConfiguredThreshold, true);
  assert.equal(tomato.minThreshold, 35);
  assert.equal(tomato.targetMoisture, 55);

  const rice = reactCalc.getCropThresholds('rice');
  assert.equal(rice.hasConfiguredThreshold, true);
  assert.equal(rice.minThreshold, 40);
  assert.equal(rice.targetMoisture, 60);

  // Custom target moisture updates target while keeping minThreshold separate
  const customTomato = reactCalc.getCropThresholds('tomato', null, 65);
  assert.equal(customTomato.minThreshold, 35);
  assert.equal(customTomato.targetMoisture, 65);
});

// 2. Moisture below, equal to, and above threshold
test('Evaluates moisture below, equal to, and above threshold accurately', () => {
  const below = reactCalc.evaluateMoistureCondition(28, 30, 50, 75, 'Barley');
  assert.equal(below.valid, true);
  assert.equal(below.condition, 'DRY');
  assert.equal(below.irrigationRequired, true);
  assert.equal(
    below.statusMessage,
    'Your soil moisture is 28%, below the recommended minimum of 30% for Barley. Irrigation may be needed.'
  );

  // Equal to minimum threshold -> Optimal (not Dry)
  const equalMin = reactCalc.evaluateMoistureCondition(30, 30, 50, 75, 'Barley');
  assert.equal(equalMin.valid, true);
  assert.equal(equalMin.condition, 'OPTIMAL');
  assert.equal(equalMin.irrigationRequired, false);

  // Above minimum threshold and at/above target -> Optimal
  const aboveTarget = reactCalc.evaluateMoistureCondition(52, 30, 50, 75, 'Barley');
  assert.equal(aboveTarget.valid, true);
  assert.equal(aboveTarget.condition, 'OPTIMAL');
  assert.equal(aboveTarget.irrigationRequired, false);

  // Above upper limit -> Too Wet
  const tooWet = reactCalc.evaluateMoistureCondition(85, 30, 50, 75, 'Barley');
  assert.equal(tooWet.valid, true);
  assert.equal(tooWet.condition, 'TOO_WET');
  assert.equal(tooWet.irrigationRequired, false);
});

test('Does not classify condition as Dry/Optimal when crop threshold is missing', () => {
  const noThreshold = reactCalc.evaluateMoistureCondition(28, null, null, null, '');
  assert.equal(noThreshold.valid, true);
  assert.equal(noThreshold.hasThresholds, false);
  assert.equal(noThreshold.condition, 'UNKNOWN');
  assert.equal(noThreshold.irrigationRequired, false);
});

test('Handles missing, negative, >100, and non-numeric readings gracefully', () => {
  assert.equal(reactCalc.evaluateMoistureCondition('', 30, 50, 75).valid, false);
  assert.equal(reactCalc.evaluateMoistureCondition(null, 30, 50, 75).valid, false);
  assert.equal(reactCalc.evaluateMoistureCondition(-5, 30, 50, 75).valid, false);
  assert.equal(reactCalc.evaluateMoistureCondition(105, 30, 50, 75).valid, false);
  assert.equal(reactCalc.evaluateMoistureCondition('abc', 30, 50, 75).valid, false);
});

// 3. Dynamic Alerts, Crop Switching, Cooldown Deduplication, and Recovery
test('Does not show a warning before both a valid reading and crop threshold are available', () => {
  const noCrop = reactCalc.evaluateThresholdAlertState(
    {},
    { crop: '', moisture: 25, threshold: null }
  );
  assert.equal(noCrop.bannerType, 'NONE');
  assert.equal(noCrop.activeAlert, false);
  assert.equal(noCrop.message, '');

  const noMoisture = reactCalc.evaluateThresholdAlertState(
    {},
    { crop: 'barley', cropLabel: 'Barley', moisture: '', threshold: 30 }
  );
  assert.equal(noMoisture.bannerType, 'NONE');
  assert.equal(noMoisture.activeAlert, false);
});

test('Dynamically evaluates same reading (32%) against different crop thresholds (Barley 30% vs Tomato 35%)', () => {
  // 32% for Tomato (min 35%) -> Warning
  const tomatoState = reactCalc.evaluateThresholdAlertState(
    {},
    { crop: 'tomato', cropLabel: 'Tomato', moisture: 32, threshold: 35 }
  );
  assert.equal(tomatoState.bannerType, 'LOW_MOISTURE_WARNING');
  assert.equal(
    tomatoState.message,
    'Your soil moisture is 32%, below the recommended minimum of 35% for Tomato. Irrigation may be needed.'
  );

  // Switch crop to Barley (min 30%) with same 32% reading -> Warning disappears
  const barleyState = reactCalc.evaluateThresholdAlertState(tomatoState, {
    crop: 'barley',
    cropLabel: 'Barley',
    moisture: 32,
    threshold: 30,
  });
  assert.equal(barleyState.bannerType, 'NONE');
  assert.equal(barleyState.activeAlert, false);
  assert.equal(barleyState.message, '');
});

test('Suppresses duplicate notifications during cooldown without technical text and shows recovery on >= threshold', () => {
  const t0 = 1_700_000_000_000;

  // Initial low moisture reading (28% < 30% for Barley)
  const state1 = reactCalc.evaluateThresholdAlertState(
    {},
    {
      crop: 'barley',
      cropLabel: 'Barley',
      moisture: 28,
      threshold: 30,
      notificationsEnabled: true,
      now: t0,
    }
  );
  assert.equal(state1.activeAlert, true);
  assert.equal(state1.bannerType, 'LOW_MOISTURE_WARNING');
  assert.equal(state1.shouldTriggerNotification, true);
  assert.equal(state1.isDuplicateSuppressed, false);
  assert.equal(
    state1.message,
    'Your soil moisture is 28%, below the recommended minimum of 30% for Barley. Irrigation may be needed.'
  );

  // Subsequent low moisture reading (26% < 30%) 5 minutes later -> duplicate notification suppressed, message updated, no technical cooldown text
  const state2 = reactCalc.evaluateThresholdAlertState(state1, {
    crop: 'barley',
    cropLabel: 'Barley',
    moisture: 26,
    threshold: 30,
    notificationsEnabled: true,
    now: t0 + 5 * 60 * 1000,
  });
  assert.equal(state2.activeAlert, true);
  assert.equal(state2.bannerType, 'LOW_MOISTURE_WARNING');
  assert.equal(state2.shouldTriggerNotification, false);
  assert.equal(state2.isDuplicateSuppressed, true);
  assert.ok(!state2.message.toLowerCase().includes('cooldown'));
  assert.equal(
    state2.message,
    'Your soil moisture is 26%, below the recommended minimum of 30% for Barley. Irrigation may be needed.'
  );

  // Reading returns to equal threshold (30% == 30%) -> Recovery banner shown
  const state3 = reactCalc.evaluateThresholdAlertState(state2, {
    crop: 'barley',
    cropLabel: 'Barley',
    moisture: 30,
    threshold: 30,
    notificationsEnabled: true,
    now: t0 + 10 * 60 * 1000,
  });
  assert.equal(state3.activeAlert, false);
  assert.equal(state3.bannerType, 'RECOVERED');
  assert.equal(state3.shouldTriggerNotification, false);
  assert.equal(
    state3.message,
    'Your soil moisture for Barley is now 30%, which meets the recommended minimum of 30%.'
  );
});

test('Clearly labels stale and simulated readings in alerts when applicable', () => {
  const staleAlert = reactCalc.evaluateThresholdAlertState(
    {},
    {
      crop: 'wheat',
      cropLabel: 'Wheat',
      moisture: 24,
      threshold: 30,
      readingStatus: 'stale',
    }
  );
  assert.ok(staleAlert.message.includes('(from an older sensor reading)'));

  const simAlert = reactCalc.evaluateThresholdAlertState(
    {},
    {
      crop: 'wheat',
      cropLabel: 'Wheat',
      moisture: 24,
      threshold: 30,
      readingStatus: 'simulated',
    }
  );
  assert.ok(simAlert.message.includes('(simulated reading)'));
});

// 4. Water Requirement Estimation & Unit Conversions
test('Converts hectares, acres, guntas, and square metres accurately', () => {
  assert.equal(convertAreaToSqMeters(1, 'hectare'), 10000);
  assert.equal(convertAreaToSqMeters(2.5, 'hectare'), 25000);
  assert.equal(Math.round(convertAreaToSqMeters(1, 'acre')), 4047);
  assert.equal(Math.round(convertAreaToSqMeters(10, 'gunta')), 1012);
  assert.equal(convertAreaToSqMeters(500, 'sqm'), 500);
  assert.equal(convertAreaToSqMeters(0, 'hectare'), null);
  assert.equal(convertAreaToSqMeters(-2, 'hectare'), null);
});

test('Calculates exact volumetric water deficit (mm), net volume (L), and efficiency-adjusted volume', () => {
  const res = calculateWaterRequirement({
    currentMoisture: 25,
    targetMoisture: 50,
    fieldArea: 0.5,
    areaUnit: 'hectare',
    soilDepthMm: 400,
    irrigationEfficiency: 80,
    isVolumetricConfirmed: true,
  });

  assert.equal(res.canCalculate, true);
  assert.equal(res.waterDeficitMm, 100);
  assert.equal(res.netWaterLitres, 500000);
  assert.equal(res.netWaterCubicMeters, 500);
  assert.equal(res.appliedWaterLitres, 625000);
  assert.equal(res.appliedWaterMm, 125);
});

test('Never returns negative water requirements when current moisture exceeds target', () => {
  const res = calculateWaterRequirement({
    currentMoisture: 65,
    targetMoisture: 50,
    fieldArea: 1,
    areaUnit: 'hectare',
    soilDepthMm: 450,
    isVolumetricConfirmed: true,
  });

  assert.equal(res.canCalculate, true);
  assert.equal(res.noWaterNeeded, true);
  assert.equal(res.waterDeficitMm, 0);
  assert.equal(res.netWaterLitres, 0);
});

test('Does not invent soil depth, field area, or target moisture when missing', () => {
  const res = calculateWaterRequirement({
    currentMoisture: 28,
    targetMoisture: null,
    fieldArea: '',
    soilDepthMm: '',
    isVolumetricConfirmed: true,
  });

  assert.equal(res.canCalculate, false);
  assert.equal(res.waterDeficitMm, null);
  assert.equal(res.netWaterLitres, null);
  assert.ok(res.missingFields.includes('targetMoisture'));
  assert.ok(res.missingFields.includes('fieldArea'));
  assert.ok(res.missingFields.includes('soilDepthMm'));
});

// 5. Sensor Freshness & Honest Status Messages
test('Detects live, stale, cached-offline, and disconnected sensor states with honest status labels', () => {
  const now = 1_700_000_000_000;

  const live = reactCalc.evaluateSensorFreshness(
    {
      success: true,
      available: true,
      connected: true,
      data: {
        moisture: 38,
        updatedAt: new Date(now - 2 * 60 * 1000).toISOString(),
      },
    },
    10 * 60 * 1000,
    now
  );
  assert.equal(live.statusType, 'LIVE');
  assert.equal(live.statusLabel, 'Sensor connected — live reading');

  const stale = reactCalc.evaluateSensorFreshness(
    {
      success: true,
      available: true,
      connected: true,
      data: {
        moisture: 38,
        updatedAt: new Date(now - 25 * 60 * 1000).toISOString(),
      },
    },
    10 * 60 * 1000,
    now
  );
  assert.equal(stale.statusType, 'STALE');
  assert.equal(stale.statusLabel, 'Sensor reading is stale');

  const cachedOffline = reactCalc.evaluateSensorFreshness(
    {
      success: true,
      available: true,
      connected: false,
      data: {
        moisture: 41,
        updatedAt: new Date(now - 15 * 60 * 1000).toISOString(),
      },
    },
    10 * 60 * 1000,
    now
  );
  assert.equal(cachedOffline.statusType, 'CACHED_OFFLINE');
  assert.equal(
    cachedOffline.statusLabel,
    'Sensor offline — showing the last available reading'
  );

  const disconnected = reactCalc.evaluateSensorFreshness(
    {
      success: true,
      available: false,
      connected: false,
      data: { moisture: null, updatedAt: null },
    },
    10 * 60 * 1000,
    now
  );
  assert.equal(disconnected.statusType, 'OFFLINE');
  assert.equal(disconnected.statusLabel, 'No sensor data available');
});

// 6. Verify Static & Demo Sections Are Removed from Web and Mobile UI
test('Verifies unwanted static, debug, and demo sections are removed from agrimind-frontend/src/pages/SmartIrrigation.jsx', () => {
  const jsxPath = path.join(
    rootDir,
    'agrimind-frontend/src/pages/SmartIrrigation.jsx'
  );
  const jsxContent = fs.readFileSync(jsxPath, 'utf8');

  // Verify unwanted sections are removed
  assert.ok(!jsxContent.includes('Load Stored Farm Record'));
  assert.ok(!jsxContent.includes('FARM101'));
  assert.ok(!jsxContent.includes('Simulated Demo Scenarios'));
  assert.ok(!jsxContent.includes('Dry Demo (22%)'));
  assert.ok(!jsxContent.includes('Optimal Demo (48%)'));
  assert.ok(!jsxContent.includes('Too Wet Demo (85%)'));
  assert.ok(!jsxContent.includes('Duplicate alert suppressed'));
  assert.ok(!jsxContent.includes('Farmer: {user.name}'));
  assert.ok(!jsxContent.includes('Manual Farmer Entry'));

  // Verify essential dynamic features remain
  assert.ok(jsxContent.includes('id="low-moisture-alert-banner"'));
  assert.ok(jsxContent.includes('id="moisture-recovery-banner"'));
  assert.ok(jsxContent.includes('id="sensor-status-indicator"'));
  assert.ok(jsxContent.includes('id="crop-thresholds-display"'));
  assert.ok(jsxContent.includes('id="gauge-progress-circle"'));
  assert.ok(jsxContent.includes('id="calc-field-area"'));
  assert.ok(jsxContent.includes('id="irrigation-result"'));
});

test('Verifies unwanted static, debug, and demo sections are removed from agrimind-mobile/src/screens/SmartIrrigationScreen.jsx', () => {
  const mobilePath = path.join(
    rootDir,
    'agrimind-mobile/src/screens/SmartIrrigationScreen.jsx'
  );
  const mobileContent = fs.readFileSync(mobilePath, 'utf8');

  assert.ok(!mobileContent.includes('FARM101'));
  assert.ok(!mobileContent.includes('Simulated Demo:'));
  assert.ok(!mobileContent.includes('Dry (22%)'));
  assert.ok(!mobileContent.includes('Duplicate alert suppressed'));
  assert.ok(!mobileContent.includes('Farmer: {user.name}'));
  assert.ok(!mobileContent.includes('Manual Farmer Entry'));
  assert.ok(mobileContent.includes('Low Soil Moisture Alert'));
  assert.ok(mobileContent.includes('Soil Moisture Recovered'));
});

console.log(`\nAll ${passed} test suites (Web + Mobile) passed successfully!`);
