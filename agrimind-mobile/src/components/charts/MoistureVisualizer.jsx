import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, {
  Circle,
  G,
  Path,
  Rect,
  Line,
  Defs,
  ClipPath,
} from 'react-native-svg';
import { FontAwesome5 } from '@expo/vector-icons';
import colors from '../../theme/colors';

const CONDITION_THEME = {
  DRY: {
    color: '#D97706',
    strongColor: '#DC3545',
    bg: '#FEF3C7',
    border: '#F59E0B',
    icon: 'exclamation-triangle',
    title: 'Dry — Irrigation May Be Needed',
  },
  OPTIMAL: {
    color: '#2E8B57',
    strongColor: '#2E8B57',
    bg: '#E8F5E9',
    border: '#2E8B57',
    icon: 'check-circle',
    title: 'Optimal Soil Moisture',
  },
  TOO_WET: {
    color: '#2878ff',
    strongColor: '#1D4ED8',
    bg: '#E6EFFF',
    border: '#2878ff',
    icon: 'water',
    title: 'Too Wet — Avoid Watering',
  },
  UNKNOWN: {
    color: '#64748B',
    strongColor: '#64748B',
    bg: '#F1F5F9',
    border: '#CBD5E1',
    icon: 'question-circle',
    title: 'Soil Moisture Guidance',
  },
};

const polarToCartesian = (cx, cy, r, pct) => {
  const clamped = Math.max(0, Math.min(100, Number(pct) || 0));
  const angleRad = ((clamped / 100) * 360 - 90) * (Math.PI / 180);
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
};

export const MoistureVisualizer = ({
  evaluation,
  minThreshold = null,
  targetMoisture = null,
  tooWetThreshold = null,
  waterEstimate = null,
  cropLabel = '',
}) => {
  const valid = Boolean(evaluation?.valid);
  const moisture = valid ? Number(evaluation.moisture) : 0;
  const conditionKey = evaluation?.condition || 'UNKNOWN';
  const theme = CONDITION_THEME[conditionKey] || CONDITION_THEME.UNKNOWN;

  const hasThresholds =
    minThreshold !== null &&
    minThreshold !== undefined &&
    targetMoisture !== null &&
    targetMoisture !== undefined &&
    tooWetThreshold !== null &&
    tooWetThreshold !== undefined;

  // Circular Gauge geometry
  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 68;
  const strokeWidth = 16;
  const circumference = 2 * Math.PI * radius;
  const clampedMoisture = Math.max(0, Math.min(100, moisture));
  const strokeDashoffset =
    circumference - (circumference * (valid ? clampedMoisture : 0)) / 100;

  // Marker coordinates on gauge ring for Min and Target (only when thresholds exist)
  const minMarkerInner = hasThresholds
    ? polarToCartesian(cx, cy, radius - 11, minThreshold)
    : null;
  const minMarkerOuter = hasThresholds
    ? polarToCartesian(cx, cy, radius + 11, minThreshold)
    : null;
  const targetMarkerInner =
    targetMoisture !== null && targetMoisture !== undefined
      ? polarToCartesian(cx, cy, radius - 11, targetMoisture)
      : null;
  const targetMarkerOuter =
    targetMoisture !== null && targetMoisture !== undefined
      ? polarToCartesian(cx, cy, radius + 11, targetMoisture)
      : null;

  // Droplet fill geometry (viewBox 0 0 80 100)
  const dropletFillHeight = valid
    ? Math.max(6, (clampedMoisture / 100) * 84)
    : 0;
  const dropletFillY = 92 - dropletFillHeight;

  // Horizontal threshold bar segment widths
  const dryWidthPct = hasThresholds
    ? Math.max(5, Math.min(85, minThreshold))
    : 33;
  const optimalWidthPct = hasThresholds
    ? Math.max(10, Math.min(90 - dryWidthPct, tooWetThreshold - minThreshold))
    : 34;
  const wetWidthPct = Math.max(5, 100 - dryWidthPct - optimalWidthPct);

  return (
    <View style={styles.container}>
      {/* Top Row: Circular Gauge + Droplet & Key Levels */}
      <View style={styles.topVisualRow}>
        {/* Large Circular Moisture Gauge */}
        <View style={styles.gaugeWrapper}>
          <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <G rotation="-90" origin={`${cx}, ${cy}`}>
              {/* Track Ring */}
              <Circle
                cx={cx}
                cy={cy}
                r={radius}
                stroke="#E2E8F0"
                strokeWidth={strokeWidth}
                fill="none"
              />
              {/* Active Moisture Ring */}
              {valid && (
                <Circle
                  cx={cx}
                  cy={cy}
                  r={radius}
                  stroke={theme.strongColor}
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="none"
                />
              )}
            </G>

            {/* Min Threshold Tick Marker on Ring */}
            {minMarkerInner && minMarkerOuter && (
              <Line
                x1={minMarkerInner.x}
                y1={minMarkerInner.y}
                x2={minMarkerOuter.x}
                y2={minMarkerOuter.y}
                stroke="#DC3545"
                strokeWidth="3"
                strokeLinecap="round"
              />
            )}

            {/* Target Moisture Tick Marker on Ring */}
            {targetMarkerInner && targetMarkerOuter && (
              <Line
                x1={targetMarkerInner.x}
                y1={targetMarkerInner.y}
                x2={targetMarkerOuter.x}
                y2={targetMarkerOuter.y}
                stroke="#15803D"
                strokeWidth="3"
                strokeLinecap="round"
              />
            )}
          </Svg>

          {/* Gauge Center Label */}
          <View style={styles.gaugeCenter}>
            <Text style={[styles.gaugeValueText, { color: theme.strongColor }]}>
              {valid ? `${moisture}%` : '--%'}
            </Text>
            <View
              style={[
                styles.conditionBadge,
                { backgroundColor: theme.bg, borderColor: theme.border },
              ]}
            >
              <Text
                style={[styles.conditionBadgeText, { color: theme.strongColor }]}
              >
                {evaluation?.label || 'Awaiting Reading'}
              </Text>
            </View>
            <Text style={styles.gaugeCropSubtext} numberOfLines={1}>
              {cropLabel || 'No crop selected'}
            </Text>
          </View>
        </View>

        {/* Right Side: Water Droplet Graphic + Threshold Metrics */}
        <View style={styles.dropletAndStatsCol}>
          <View style={styles.dropletBox}>
            <Svg width={60} height={76} viewBox="0 0 80 100">
              <Defs>
                <ClipPath id="dropletClip">
                  <Path d="M40 6 C40 6 10 46 10 68 C10 85 23.4 96 40 96 C56.6 96 70 85 70 68 C70 46 40 6 40 6 Z" />
                </ClipPath>
              </Defs>
              {/* Background Droplet Fill */}
              <Path
                d="M40 6 C40 6 10 46 10 68 C10 85 23.4 96 40 96 C56.6 96 70 85 70 68 C70 46 40 6 40 6 Z"
                fill="#EFF6FF"
              />
              {/* Rising Water Level inside Droplet */}
              {valid && (
                <Rect
                  x="0"
                  y={dropletFillY}
                  width="80"
                  height={dropletFillHeight + 10}
                  fill="#2878ff"
                  opacity={0.82}
                  clipPath="url(#dropletClip)"
                />
              )}
              {/* Target Line across Droplet */}
              {targetMoisture !== null && targetMoisture !== undefined && (
                <Line
                  x1="12"
                  y1={92 - (targetMoisture / 100) * 84}
                  x2="68"
                  y2={92 - (targetMoisture / 100) * 84}
                  stroke="#15803D"
                  strokeWidth="2"
                  strokeDasharray="3,3"
                  clipPath="url(#dropletClip)"
                />
              )}
              {/* Droplet Outline */}
              <Path
                d="M40 6 C40 6 10 46 10 68 C10 85 23.4 96 40 96 C56.6 96 70 85 70 68 C70 46 40 6 40 6 Z"
                fill="none"
                stroke="#2878ff"
                strokeWidth="3"
              />
            </Svg>
            <View style={styles.dropletTextCol}>
              <Text style={styles.dropletHeading}>Soil Water Level</Text>
              <Text style={styles.dropletSub}>
                {valid && hasThresholds
                  ? evaluation.irrigationRequired
                    ? `${evaluation.deficitToMin}% below minimum`
                    : evaluation.belowTarget
                    ? `${evaluation.deficitToTarget}% below target`
                    : 'At or above target'
                  : valid
                  ? 'Select a crop'
                  : 'Enter reading'}
              </Text>
            </View>
          </View>

          {/* Compact Level Pills */}
          <View style={styles.levelSummaryList}>
            <View style={styles.levelRow}>
              <View style={[styles.levelDot, { backgroundColor: '#DC3545' }]} />
              <Text style={styles.levelName}>Minimum Level:</Text>
              <Text style={styles.levelVal}>
                {minThreshold !== null && minThreshold !== undefined
                  ? `${minThreshold}%`
                  : '--%'}
              </Text>
            </View>
            <View style={styles.levelRow}>
              <View style={[styles.levelDot, { backgroundColor: '#15803D' }]} />
              <Text style={styles.levelName}>Target Level:</Text>
              <Text style={styles.levelVal}>
                {targetMoisture !== null && targetMoisture !== undefined
                  ? `${targetMoisture}%`
                  : '--%'}
              </Text>
            </View>
            <View style={styles.levelRow}>
              <View style={[styles.levelDot, { backgroundColor: '#2878ff' }]} />
              <Text style={styles.levelName}>Upper Limit:</Text>
              <Text style={styles.levelVal}>
                {tooWetThreshold !== null && tooWetThreshold !== undefined
                  ? `${tooWetThreshold}%`
                  : '--%'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Horizontal Threshold Bar */}
      <View style={styles.thresholdBarSection}>
        <View style={styles.thresholdBarHeader}>
          <Text style={styles.thresholdBarTitle}>
            Soil Moisture Zones (0% – 100%)
          </Text>
          {valid && (
            <Text
              style={[styles.thresholdCurrentTag, { color: theme.strongColor }]}
            >
              Current: {moisture}% ({evaluation.label})
            </Text>
          )}
        </View>

        <View style={styles.barOuterWrapper}>
          {/* Segmented Zone Track */}
          <View style={styles.zoneTrack}>
            <View
              style={[
                styles.zoneSegment,
                {
                  width: `${dryWidthPct}%`,
                  backgroundColor: '#FEE2E2',
                  borderTopColor: '#DC3545',
                },
              ]}
            >
              <Text
                style={[styles.zoneText, { color: '#991B1B' }]}
                numberOfLines={1}
              >
                {hasThresholds ? `Dry (<${minThreshold}%)` : 'Dry'}
              </Text>
            </View>
            <View
              style={[
                styles.zoneSegment,
                {
                  width: `${optimalWidthPct}%`,
                  backgroundColor: '#DCFCE7',
                  borderTopColor: '#2E8B57',
                },
              ]}
            >
              <Text
                style={[styles.zoneText, { color: '#166534' }]}
                numberOfLines={1}
              >
                {hasThresholds
                  ? `Optimal (${minThreshold}%–${tooWetThreshold}%)`
                  : 'Optimal'}
              </Text>
            </View>
            <View
              style={[
                styles.zoneSegment,
                {
                  width: `${wetWidthPct}%`,
                  backgroundColor: '#DBEAFE',
                  borderTopColor: '#2878ff',
                },
              ]}
            >
              <Text
                style={[styles.zoneText, { color: '#1E40AF' }]}
                numberOfLines={1}
              >
                {hasThresholds ? `Too Wet` : 'Too Wet'}
              </Text>
            </View>
          </View>

          {/* Threshold Vertical Pins */}
          {hasThresholds && (
            <View
              style={[
                styles.pinMarker,
                {
                  left: `${Math.min(96, Math.max(2, minThreshold))}%`,
                  borderColor: '#DC3545',
                },
              ]}
            />
          )}
          {targetMoisture !== null && targetMoisture !== undefined && (
            <View
              style={[
                styles.pinMarker,
                {
                  left: `${Math.min(96, Math.max(2, targetMoisture))}%`,
                  borderColor: '#15803D',
                },
              ]}
            />
          )}

          {/* Current Reading Pointer */}
          {valid && (
            <View
              style={[
                styles.currentPointer,
                {
                  left: `${Math.min(96, Math.max(3, clampedMoisture))}%`,
                  backgroundColor: theme.strongColor,
                },
              ]}
            />
          )}
        </View>

        <View style={styles.barScaleFooter}>
          <Text style={styles.scaleLabel}>0%</Text>
          <Text
            style={[styles.scaleLabel, { color: '#DC3545', fontWeight: '700' }]}
          >
            Min:{' '}
            {minThreshold !== null && minThreshold !== undefined
              ? `${minThreshold}%`
              : '--%'}
          </Text>
          <Text
            style={[styles.scaleLabel, { color: '#15803D', fontWeight: '700' }]}
          >
            Target:{' '}
            {targetMoisture !== null && targetMoisture !== undefined
              ? `${targetMoisture}%`
              : '--%'}
          </Text>
          <Text style={styles.scaleLabel}>100%</Text>
        </View>
      </View>

      {/* Action Status & Estimated Water Summary Strip */}
      <View
        style={[
          styles.summaryBanner,
          { backgroundColor: theme.bg, borderColor: theme.border },
        ]}
      >
        <View style={styles.summaryTitleRow}>
          <FontAwesome5
            name={theme.icon}
            size={18}
            color={theme.strongColor}
            style={{ marginRight: 8 }}
          />
          <Text style={[styles.summaryTitle, { color: theme.strongColor }]}>
            {theme.title}
          </Text>
        </View>
        <Text style={styles.summaryDesc}>{evaluation?.statusMessage}</Text>

        {waterEstimate?.canCalculate && (
          <View style={styles.waterQuickBadge}>
            <FontAwesome5
              name="tint"
              size={14}
              color="#2878ff"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.waterQuickText}>
              {waterEstimate.noWaterNeeded
                ? 'Estimated Water Requirement: 0 L (At or above target moisture)'
                : `Estimated Net Water: ${waterEstimate.netWaterLitres.toLocaleString(
                    'en-IN'
                  )} L (${waterEstimate.netWaterCubicMeters} m³) | Deficit: ${
                    waterEstimate.waterDeficitMm
                  } mm`}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

export const MoistureHistoryChart = ({ readings = [], minThreshold = null }) => {
  if (!Array.isArray(readings) || readings.length === 0) {
    return null;
  }

  const items = readings.slice(0, 10).reverse();
  const effectiveLineThreshold =
    minThreshold !== null && minThreshold !== undefined ? minThreshold : null;

  return (
    <View style={styles.historyChartBox}>
      {effectiveLineThreshold !== null && (
        <View style={styles.historyThresholdNote}>
          <View style={[styles.levelDot, { backgroundColor: '#DC3545' }]} />
          <Text style={styles.historyLegendText}>
            Red dashed line shows recommended minimum ({effectiveLineThreshold}
            %)
          </Text>
        </View>
      )}

      <View style={styles.barsContainer}>
        {effectiveLineThreshold !== null && (
          <View
            style={[
              styles.thresholdLineOverlay,
              {
                bottom: `${Math.min(95, Math.max(5, effectiveLineThreshold))}%`,
              },
            ]}
          />
        )}

        {items.map((item, idx) => {
          const val = Math.max(0, Math.min(100, Number(item.moisture) || 0));
          const itemMin = item.threshold ?? effectiveLineThreshold ?? 30;
          const isLow = val < itemMin;
          const isWet = val > 80;
          const barColor = isLow ? '#DC3545' : isWet ? '#2878ff' : '#2E8B57';
          const dateObj = new Date(item.timestamp);
          const timeLabel = Number.isFinite(dateObj.getTime())
            ? `${String(dateObj.getHours()).padStart(2, '0')}:${String(
                dateObj.getMinutes()
              ).padStart(2, '0')}`
            : `#${idx + 1}`;

          return (
            <View key={item.id || idx} style={styles.barColumn}>
              <Text style={[styles.barTopVal, { color: barColor }]}>{val}%</Text>
              <View style={styles.barTrackVertical}>
                <View
                  style={[
                    styles.barFillVertical,
                    {
                      height: `${Math.max(val, 4)}%`,
                      backgroundColor: barColor,
                    },
                  ]}
                />
              </View>
              <Text style={styles.barTimeLabel} numberOfLines={1}>
                {timeLabel}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  topVisualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  gaugeWrapper: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    alignSelf: 'center',
  },
  gaugeCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  gaugeValueText: {
    fontSize: 28,
    fontWeight: '800',
  },
  conditionBadge: {
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  conditionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  gaugeCropSubtext: {
    marginTop: 4,
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
    maxWidth: 110,
  },
  dropletAndStatsCol: {
    flex: 1,
    minWidth: 155,
    paddingLeft: 10,
    justifyContent: 'center',
  },
  dropletBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  dropletTextCol: {
    flex: 1,
    marginLeft: 8,
  },
  dropletHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  dropletSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
  levelSummaryList: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 3,
  },
  levelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  levelName: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
  },
  levelVal: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  thresholdBarSection: {
    marginTop: 4,
    marginBottom: 16,
  },
  thresholdBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  thresholdBarTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  thresholdCurrentTag: {
    fontSize: 12,
    fontWeight: '700',
  },
  barOuterWrapper: {
    position: 'relative',
    height: 30,
    justifyContent: 'center',
  },
  zoneTrack: {
    flexDirection: 'row',
    height: 24,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  zoneSegment: {
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 3,
    paddingHorizontal: 2,
  },
  zoneText: {
    fontSize: 10,
    fontWeight: '700',
  },
  pinMarker: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 0,
    borderLeftWidth: 2,
  },
  currentPointer: {
    position: 'absolute',
    top: -2,
    width: 12,
    height: 34,
    marginLeft: -6,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 3,
  },
  barScaleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  scaleLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  summaryBanner: {
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
  },
  summaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  summaryDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  waterQuickBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  waterQuickText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  historyChartBox: {
    marginTop: 8,
    paddingTop: 8,
  },
  historyThresholdNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  historyLegendText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 140,
    paddingTop: 18,
    paddingBottom: 4,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  thresholdLineOverlay: {
    position: 'absolute',
    left: 8,
    right: 8,
    borderTopWidth: 1.5,
    borderColor: '#DC3545',
    borderStyle: 'dashed',
    zIndex: 1,
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  barTopVal: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 3,
  },
  barTrackVertical: {
    width: 14,
    height: 85,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFillVertical: {
    width: '100%',
    borderRadius: 4,
  },
  barTimeLabel: {
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 4,
  },
});

export default MoistureVisualizer;
