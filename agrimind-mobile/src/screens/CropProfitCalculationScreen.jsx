import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import useTranslation from '../i18n';
import AgriHeader from '../components/common/AgriHeader';
import colors from '../theme/colors';

export const CropProfitCalculationScreen = ({ navigation }) => {
  const { t } = useTranslation();

  // Interactive scenario state
  const [simArea, setSimArea] = useState('1');
  const [simYield, setSimYield] = useState('20');
  const [simPrice, setSimPrice] = useState('2500');
  const [simCostPerAcre, setSimCostPerAcre] = useState('30000');

  // Parse numerical values
  const areaVal = parseFloat(simArea) || 0;
  const yieldVal = parseFloat(simYield) || 0;
  const priceVal = parseFloat(simPrice) || 0;
  const costVal = parseFloat(simCostPerAcre) || 0;

  const simTotalRevenue = Math.max(0, areaVal * yieldVal * priceVal);
  const simTotalCost = Math.max(0, areaVal * costVal);
  const simNetProfit = simTotalRevenue - simTotalCost;
  const simRoi = simTotalCost > 0 ? ((simNetProfit / simTotalCost) * 100).toFixed(1) : 0;
  const simProfitPerAcre = areaVal > 0 ? Math.round(simNetProfit / areaVal) : 0;

  // Maximum value for proportional visual bar scaling
  const maxBarValue = Math.max(simTotalRevenue, simTotalCost, Math.abs(simNetProfit), 1);
  const revenueBarHeight = Math.max(10, Math.round((simTotalRevenue / maxBarValue) * 120));
  const costBarHeight = Math.max(10, Math.round((simTotalCost / maxBarValue) * 120));
  const profitBarHeight = Math.max(10, Math.round((Math.abs(simNetProfit) / maxBarValue) * 120));

  const expensePercent = simTotalRevenue > 0 ? Math.min(100, Math.round((simTotalCost / simTotalRevenue) * 100)) : 60;
  const profitPercent = Math.max(0, 100 - expensePercent);

  // 9 Cultivation Expense Categories
  const expenseCategories = [
    {
      title: t('exp_cat_seeds', '1. Seeds'),
      icon: 'seedling',
      desc: t('exp_cat_seeds_desc', 'Certified high-yielding seeds, hybrid varieties, and seed treatment chemicals.'),
    },
    {
      title: t('exp_cat_fertilizers', '2. Fertilizers'),
      icon: 'flask',
      desc: t('exp_cat_fertilizers_desc', 'Chemical fertilizers (Urea, DAP, MOP), micronutrient sprays, and organic manure.'),
    },
    {
      title: t('exp_cat_pesticides', '3. Pesticides'),
      icon: 'shield-virus',
      desc: t('exp_cat_pesticides_desc', 'Herbicides, insecticides, fungicides, and biological pest control agents.'),
    },
    {
      title: t('exp_cat_labour', '4. Labour'),
      icon: 'users',
      desc: t('exp_cat_labour_desc', 'Wages for manual land clearing, sowing, transplanting, weeding, and harvesting.'),
    },
    {
      title: t('exp_cat_irrigation', '5. Irrigation'),
      icon: 'tint',
      desc: t('exp_cat_irrigation_desc', 'Borewell electricity, pump diesel fuel, canal cess, and drip maintenance.'),
    },
    {
      title: t('exp_cat_machinery', '6. Machinery'),
      icon: 'tractor',
      desc: t('exp_cat_machinery_desc', 'Tractor hiring fees for ploughing, rotavator, harrowing, and threshing.'),
    },
    {
      title: t('exp_cat_transportation', '7. Transportation'),
      icon: 'truck-moving',
      desc: t('exp_cat_transportation_desc', 'Freight to transport produce from field gate to the APMC mandi market.'),
    },
    {
      title: t('exp_cat_land_prep', '8. Land Preparation'),
      icon: 'mountain',
      desc: t('exp_cat_land_prep_desc', 'Field bunding, leveling, deep tilling, and furrow preparation before sowing.'),
    },
    {
      title: t('exp_cat_other', '9. Other Expenses'),
      icon: 'coins',
      desc: t('exp_cat_other_desc', 'Burlap packaging bags, tool repairs, crop insurance, and contingency costs.'),
    },
  ];

  // Factors affecting actual farm profit
  const riskFactors = [
    {
      title: t('risk_weather_title', 'Weather & Climate Anomalies'),
      desc: t(
        'risk_weather_desc',
        'Unseasonal rainfall during harvest, prolonged dry spells, heatwaves, or hailstorms can impact final yield quantity and grain luster.'
      ),
    },
    {
      title: t('risk_mandi_title', 'APMC Mandi Price Fluctuations'),
      desc: t(
        'risk_mandi_desc',
        'Market supply-demand dynamics shift rapidly. Peak harvest arrivals can depress spot prices, while off-season holding yields higher rates.'
      ),
    },
    {
      title: t('risk_pest_title', 'Pest & Disease Pressures'),
      desc: t(
        'risk_pest_desc',
        'Sudden pest attacks require timely intervention; delayed spraying increases damage and chemical costs.'
      ),
    },
    {
      title: t('risk_input_title', 'Input & Labour Cost Variations'),
      desc: t(
        'risk_input_desc',
        'Seasonal spikes in diesel prices, fertilizer shortages, or local harvest labour scarcity can increase operational expenses.'
      ),
    },
    {
      title: t('risk_irrigation_title', 'Irrigation Reliability'),
      desc: t(
        'risk_irrigation_desc',
        'Dependable irrigation at critical moisture stages ensures full yield potential, whereas water shortages during grain filling reduce weight.'
      ),
    },
    {
      title: t('risk_storage_title', 'Post-Harvest Storage Quality'),
      desc: t(
        'risk_storage_desc',
        'Proper drying and moisture control prevents post-harvest fungal spoilage, allowing farmers to store produce and avoid panic selling.'
      ),
    },
  ];

  return (
    <View style={styles.container}>
      <AgriHeader
        title="AgriMind"
        subtitle={t('profit_page_title', 'How Crop Profit Is Calculated')}
        showBack={true}
        onBack={() => navigation?.goBack?.()}
        showLanguage={true}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Page Banner */}
        <View style={styles.bannerCard}>
          <Text style={styles.bannerTitle}>{t('profit_page_title', 'How Crop Profit Is Calculated')}</Text>
          <Text style={styles.bannerSubtitle}>
            {t(
              'profit_page_subtitle',
              'Understand the financial formulas, itemized cultivation expenses, and market factors AgriMind uses to estimate your farm returns.'
            )}
          </Text>
        </View>

        {/* Introduction Section */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.headerIconCircle, { backgroundColor: '#fff3e0' }]}>
              <FontAwesome5 name="chart-line" size={18} color={colors.secondaryDark || '#d28c50'} />
            </View>
            <Text style={styles.cardHeading}>{t('profit_intro_title', 'Transparent Farm Economics')}</Text>
          </View>
          <Text style={styles.bodyText}>
            {t(
              'profit_intro_p1',
              'A successful crop recommendation is not just biologically viable—it must be financially profitable. AgriMind bridges agronomic science with real-world farm economics by forecasting expected yield, evaluating APMC mandi price trends, and itemizing the complete cost of cultivation.'
            )}
          </Text>
          <Text style={[styles.bodyText, { marginTop: 8 }]}>
            {t(
              'profit_intro_p2',
              'Before purchasing seeds or preparing the land, farmers can evaluate projected revenue, input costs, and net return per acre to make informed, confident financial commitments.'
            )}
          </Text>

          <View style={styles.pillsRow}>
            <View style={styles.pillItem}>
              <FontAwesome5 name="check-circle" size={12} color={colors.secondaryDark || '#d28c50'} style={{ marginRight: 5 }} />
              <Text style={styles.pillText}>Mandi Prices</Text>
            </View>
            <View style={styles.pillItem}>
              <FontAwesome5 name="check-circle" size={12} color={colors.secondaryDark || '#d28c50'} style={{ marginRight: 5 }} />
              <Text style={styles.pillText}>9-Cost Breakdown</Text>
            </View>
            <View style={styles.pillItem}>
              <FontAwesome5 name="check-circle" size={12} color={colors.secondaryDark || '#d28c50'} style={{ marginRight: 5 }} />
              <Text style={styles.pillText}>Net Profit & ROI</Text>
            </View>
          </View>
        </View>

        {/* STEP-BY-STEP VISUAL PROFIT CALCULATION FLOW */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.headerIconCircle, { backgroundColor: '#fff7ed' }]}>
              <FontAwesome5 name="project-diagram" size={16} color="#ea580c" />
            </View>
            <Text style={styles.cardHeading}>{t('profit_flow_title', 'Visual Profit Calculation Flow')}</Text>
          </View>
          <Text style={styles.bodyText}>
            {t('profit_flow_sub', 'How agricultural inputs, yield, and market rates connect step-by-step into final net farm income.')}
          </Text>

          <View style={styles.flowList}>
            {/* Step 1 */}
            <View style={styles.flowItem}>
              <View style={[styles.flowItemIcon, { backgroundColor: '#e8f5ea' }]}>
                <FontAwesome5 name="seedling" size={16} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.flowItemTag}>Step 1</Text>
                <Text style={styles.flowItemTitle}>{t('flow_step1_title', '1. Crop Yield')}</Text>
                <Text style={styles.flowItemDesc}>{t('flow_step1_desc', 'Harvest volume produced per acre (quintals or tonnes).')}</Text>
              </View>
            </View>

            <View style={styles.flowDivider}>
              <Ionicons name="close" size={16} color="#64748b" />
            </View>

            {/* Step 2 */}
            <View style={styles.flowItem}>
              <View style={[styles.flowItemIcon, { backgroundColor: '#fef3c7' }]}>
                <FontAwesome5 name="tag" size={15} color="#d97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.flowItemTag}>Step 2</Text>
                <Text style={styles.flowItemTitle}>{t('flow_step2_title', '2. Selling Price')}</Text>
                <Text style={styles.flowItemDesc}>{t('flow_step2_desc', 'Current APMC mandi market price per quintal received at harvest.')}</Text>
              </View>
            </View>

            <View style={styles.flowDivider}>
              <Ionicons name="pause-outline" size={16} color="#64748b" style={{ transform: [{ rotate: '90deg' }] }} />
            </View>

            {/* Step 3 */}
            <View style={[styles.flowItem, { borderColor: '#0284c7' }]}>
              <View style={[styles.flowItemIcon, { backgroundColor: '#e0f2fe' }]}>
                <FontAwesome5 name="coins" size={15} color="#0284c7" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.flowItemTag, { color: '#0284c7' }]}>Step 3: Gross Income</Text>
                <Text style={styles.flowItemTitle}>{t('flow_step3_title', '3. Gross Revenue')}</Text>
                <Text style={styles.flowItemDesc}>{t('flow_step3_desc', 'Total value from sales: Crop Yield × Selling Price.')}</Text>
              </View>
            </View>

            <View style={styles.flowDivider}>
              <Ionicons name="remove" size={16} color="#64748b" />
            </View>

            {/* Step 4 */}
            <View style={[styles.flowItem, { borderColor: '#ea580c' }]}>
              <View style={[styles.flowItemIcon, { backgroundColor: '#fff7ed' }]}>
                <FontAwesome5 name="receipt" size={15} color="#ea580c" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.flowItemTag, { color: '#ea580c' }]}>Step 4: Total Expenses</Text>
                <Text style={styles.flowItemTitle}>{t('flow_step4_title', '4. Cultivation Expenses')}</Text>
                <Text style={styles.flowItemDesc}>{t('flow_step4_desc', 'Sum of all 9 agricultural operational and input costs.')}</Text>
              </View>
            </View>

            <View style={styles.flowDivider}>
              <Ionicons name="pause-outline" size={16} color="#64748b" style={{ transform: [{ rotate: '90deg' }] }} />
            </View>

            {/* Step 5 */}
            <View style={[styles.flowItem, { borderColor: colors.primary, backgroundColor: '#f0fdf4' }]}>
              <View style={[styles.flowItemIcon, { backgroundColor: '#dcfce7' }]}>
                <FontAwesome5 name="hand-holding-usd" size={16} color="#16a34a" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.flowItemTag, { color: colors.primary }]}>Step 5: Farmer Take-Home</Text>
                <Text style={[styles.flowItemTitle, { color: colors.primary }]}>{t('flow_step5_title', '5. Net Profit')}</Text>
                <Text style={styles.flowItemDesc}>{t('flow_step5_desc', 'Actual take-home profit: Gross Revenue − Cultivation Expenses.')}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 4 Core Financial Formulas */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.headerIconCircle, { backgroundColor: '#e8f5ea' }]}>
              <FontAwesome5 name="calculator" size={18} color={colors.primary} />
            </View>
            <Text style={styles.cardHeading}>{t('core_formulas_title', 'The 4 Core Financial Formulas')}</Text>
          </View>
          <Text style={styles.bodyText}>
            {t('core_formulas_lead', 'Standard agronomic accounting principles used to project farm business earnings.')}
          </Text>

          <View style={[styles.formulaBox, { borderTopColor: '#0284c7' }]}>
            <View style={styles.formulaHeaderRow}>
              <FontAwesome5 name="coins" size={15} color="#0284c7" style={{ marginRight: 8 }} />
              <Text style={styles.formulaTitle}>{t('formula_revenue_title', 'Total Gross Revenue')}</Text>
            </View>
            <View style={styles.formulaMathBadge}>
              <Text style={styles.formulaMathText}>{t('formula_revenue_math', 'Revenue (₹) = Crop Yield (q) × Selling Price (₹/q)')}</Text>
            </View>
            <Text style={styles.formulaDesc}>{t('formula_revenue_desc', 'The gross monetary value realized from selling the harvested produce at market rates.')}</Text>
          </View>

          <View style={[styles.formulaBox, { borderTopColor: colors.secondaryDark || '#d28c50' }]}>
            <View style={styles.formulaHeaderRow}>
              <FontAwesome5 name="receipt" size={15} color={colors.secondaryDark || '#d28c50'} style={{ marginRight: 8 }} />
              <Text style={styles.formulaTitle}>{t('formula_cost_title', 'Total Cultivation Cost')}</Text>
            </View>
            <View style={styles.formulaMathBadge}>
              <Text style={styles.formulaMathText}>{t('formula_cost_math', 'Total Cost (₹) = Sum of All 9 Cultivation Expenses')}</Text>
            </View>
            <Text style={styles.formulaDesc}>{t('formula_cost_desc', 'The comprehensive expenditure required to cultivate the crop from land tilling to mandi gate delivery.')}</Text>
          </View>

          <View style={[styles.formulaBox, { borderTopColor: colors.primary }]}>
            <View style={styles.formulaHeaderRow}>
              <FontAwesome5 name="hand-holding-usd" size={15} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.formulaTitle}>{t('formula_net_profit_title', 'Estimated Net Profit')}</Text>
            </View>
            <View style={styles.formulaMathBadge}>
              <Text style={styles.formulaMathText}>{t('formula_net_profit_math', 'Net Profit (₹) = Total Revenue − Total Cultivation Cost')}</Text>
            </View>
            <Text style={styles.formulaDesc}>{t('formula_net_profit_desc', 'The actual take-home earnings remaining with the farmer after recovering all working capital investments.')}</Text>
          </View>

          <View style={[styles.formulaBox, { borderTopColor: '#6366f1' }]}>
            <View style={styles.formulaHeaderRow}>
              <FontAwesome5 name="percentage" size={15} color="#6366f1" style={{ marginRight: 8 }} />
              <Text style={styles.formulaTitle}>{t('formula_per_acre_title', 'Profit per Acre & ROI')}</Text>
            </View>
            <View style={styles.formulaMathBadge}>
              <Text style={styles.formulaMathText}>{t('formula_per_acre_math', 'Profit/Acre = Net Profit ÷ Area | ROI = (Net Profit ÷ Cost) × 100')}</Text>
            </View>
            <Text style={styles.formulaDesc}>{t('formula_per_acre_desc', 'Standardizes returns on a per-acre basis, allowing easy comparison between different crop alternatives.')}</Text>
          </View>
        </View>

        {/* DYNAMIC PROFIT VISUALIZATION & SIMULATOR */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.headerIconCircle, { backgroundColor: '#e0f2fe' }]}>
              <FontAwesome5 name="chart-bar" size={18} color="#0284c7" />
            </View>
            <Text style={styles.cardHeading}>{t('profit_chart_title', 'Revenue vs Costs vs Net Profit')}</Text>
          </View>
          <Text style={styles.bodyText}>
            {t('profit_chart_sub', 'Interactive visual comparison updated dynamically by the calculator below.')}
          </Text>

          {/* Visual Comparative Column Chart */}
          <View style={styles.mobileChartCard}>
            <View style={styles.chartBarsRow}>
              {/* Revenue Column */}
              <View style={styles.chartColWrapper}>
                <Text style={styles.colValueText}>₹{simTotalRevenue.toLocaleString('en-IN')}</Text>
                <View style={styles.colTrack}>
                  <View style={[styles.colFill, { height: revenueBarHeight, backgroundColor: '#0284c7' }]} />
                </View>
                <Text style={styles.colLabelText}>{t('chart_lbl_revenue', 'Revenue')}</Text>
              </View>

              {/* Cost Column */}
              <View style={styles.chartColWrapper}>
                <Text style={styles.colValueText}>₹{simTotalCost.toLocaleString('en-IN')}</Text>
                <View style={styles.colTrack}>
                  <View style={[styles.colFill, { height: costBarHeight, backgroundColor: '#ea580c' }]} />
                </View>
                <Text style={styles.colLabelText}>{t('chart_lbl_costs', 'Cost')}</Text>
              </View>

              {/* Profit Column */}
              <View style={styles.chartColWrapper}>
                <Text style={[styles.colValueText, { color: simNetProfit >= 0 ? colors.primary : '#dc2626' }]}>
                  ₹{simNetProfit.toLocaleString('en-IN')}
                </Text>
                <View style={styles.colTrack}>
                  <View
                    style={[
                      styles.colFill,
                      {
                        height: profitBarHeight,
                        backgroundColor: simNetProfit >= 0 ? colors.primary : '#dc2626',
                      },
                    ]}
                  />
                </View>
                <Text style={styles.colLabelText}>{t('chart_lbl_profit', 'Profit')}</Text>
              </View>
            </View>
          </View>

          {/* Interactive Farm Profit Simulator */}
          <View style={styles.simCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <FontAwesome5 name="sliders-h" size={15} color={colors.secondaryDark || '#d28c50'} style={{ marginRight: 8 }} />
              <Text style={styles.simCardTitle}>{t('sim_title', 'Interactive Farm Profit Calculator')}</Text>
            </View>
            <Text style={styles.simCardSub}>
              {t('sim_sub', 'Adjust the acreage, expected yield, mandi price, and input costs to test custom scenarios.')}
            </Text>

            <View style={styles.simInputsRow}>
              <View style={styles.simInputGroup}>
                <Text style={styles.simInputLabel}>{t('sim_lbl_area', 'Area (Acres)')}</Text>
                <TextInput
                  style={styles.simInput}
                  keyboardType="numeric"
                  value={simArea}
                  onChangeText={setSimArea}
                />
              </View>
              <View style={styles.simInputGroup}>
                <Text style={styles.simInputLabel}>{t('sim_lbl_yield', 'Yield (q/Acre)')}</Text>
                <TextInput
                  style={styles.simInput}
                  keyboardType="numeric"
                  value={simYield}
                  onChangeText={setSimYield}
                />
              </View>
            </View>

            <View style={styles.simInputsRow}>
              <View style={styles.simInputGroup}>
                <Text style={styles.simInputLabel}>{t('sim_lbl_price', 'Price (₹/Quintal)')}</Text>
                <TextInput
                  style={styles.simInput}
                  keyboardType="numeric"
                  value={simPrice}
                  onChangeText={setSimPrice}
                />
              </View>
              <View style={styles.simInputGroup}>
                <Text style={styles.simInputLabel}>{t('sim_lbl_cost', 'Cost (₹/Acre)')}</Text>
                <TextInput
                  style={styles.simInput}
                  keyboardType="numeric"
                  value={simCostPerAcre}
                  onChangeText={setSimCostPerAcre}
                />
              </View>
            </View>

            <View style={styles.simResultsBox}>
              <View style={styles.simResultItem}>
                <Text style={styles.simResultLabel}>{t('sim_res_rev', 'Revenue')}</Text>
                <Text style={[styles.simResultVal, { color: '#0284c7' }]}>
                  ₹{simTotalRevenue.toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={styles.simResultItem}>
                <Text style={styles.simResultLabel}>{t('sim_res_cost', 'Cost')}</Text>
                <Text style={[styles.simResultVal, { color: '#ea580c' }]}>
                  ₹{simTotalCost.toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={styles.simResultItem}>
                <Text style={styles.simResultLabel}>{t('sim_res_profit', 'Net Profit')}</Text>
                <Text style={[styles.simResultVal, { color: simNetProfit >= 0 ? colors.primary : '#dc2626' }]}>
                  ₹{simNetProfit.toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={styles.simResultItem}>
                <Text style={styles.simResultLabel}>{t('sim_res_roi', 'ROI')}</Text>
                <Text style={styles.simResultVal}>{simRoi}%</Text>
              </View>
            </View>

            <View style={[styles.barTrack, { marginTop: 12 }]}>
              <View style={[styles.barSegment, { width: `${expensePercent}%`, backgroundColor: '#f97316' }]}>
                <Text style={styles.barSegmentText}>{expensePercent}% Cost</Text>
              </View>
              <View
                style={[
                  styles.barSegment,
                  {
                    width: `${profitPercent}%`,
                    backgroundColor: simNetProfit >= 0 ? colors.primary : '#dc2626',
                  },
                ]}
              >
                <Text style={styles.barSegmentText}>{profitPercent}% Profit</Text>
              </View>
            </View>

            <Text style={styles.calcDisclaimerText}>
              <FontAwesome5 name="info-circle" size={11} color="#64748b" />{' '}
              {t(
                'calc_illustrative_note',
                'Educational Illustration: The sample values above illustrate the calculation workflow and do not guarantee specific crop yields or market prices.'
              )}
            </Text>
          </View>
        </View>

        {/* 9 Cultivation Expense Categories */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.headerIconCircle, { backgroundColor: '#fff7ed' }]}>
              <FontAwesome5 name="list-ol" size={18} color="#ea580c" />
            </View>
            <Text style={styles.cardHeading}>{t('expenses_breakdown_title', '9 Cultivation Expense Categories')}</Text>
          </View>
          <Text style={styles.bodyText}>
            {t(
              'expenses_breakdown_lead',
              'AgriMind accounts for all direct operational and input expenses so that farmers are not surprised by hidden costs.'
            )}
          </Text>

          <View style={{ marginTop: 12 }}>
            {expenseCategories.map((exp, idx) => (
              <View key={idx} style={styles.expenseRow}>
                <View style={styles.expenseIcon}>
                  <FontAwesome5 name={exp.icon} size={15} color="#ea580c" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.expenseTitle}>{exp.title}</Text>
                  <Text style={styles.expenseDesc}>{exp.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Step-by-Step Illustrative Example */}
        <View style={styles.card}>
          <View style={styles.exampleBadge}>
            <Text style={styles.exampleBadgeText}>{t('badge_illustrative', 'Illustrative Sample Scenario')}</Text>
          </View>
          <Text style={[styles.cardHeading, { marginTop: 4, marginBottom: 6 }]}>
            {t('example_wheat_title', 'Illustrative Example: 1 Acre Wheat Cultivation')}
          </Text>
          <Text style={styles.bodyText}>
            {t(
              'example_wheat_lead',
              'Below is a realistic sample calculation demonstrating how AgriMind applies the formulas for an illustrative 1-acre wheat crop.'
            )}
          </Text>

          <View style={styles.scenarioGrid}>
            <View style={styles.scenarioItem}>
              <Text style={styles.scenarioLabel}>{t('param_crop_type', 'Target Crop')}</Text>
              <Text style={styles.scenarioVal}>Wheat (PBW 550)</Text>
            </View>
            <View style={styles.scenarioItem}>
              <Text style={styles.scenarioLabel}>{t('param_farm_size', 'Farm Size')}</Text>
              <Text style={styles.scenarioVal}>1.0 Acre</Text>
            </View>
            <View style={styles.scenarioItem}>
              <Text style={styles.scenarioLabel}>{t('param_est_yield', 'Estimated Yield')}</Text>
              <Text style={styles.scenarioVal}>20 Quintals</Text>
            </View>
            <View style={styles.scenarioItem}>
              <Text style={styles.scenarioLabel}>{t('param_mandi_rate', 'Expected APMC Rate')}</Text>
              <Text style={styles.scenarioVal}>₹2,500 / q</Text>
            </View>
          </View>

          <View style={styles.calcStepContainer}>
            <View style={styles.calcStepRow}>
              <Text style={styles.calcStepTitle}>Step 1: Gross Revenue (20 q × ₹2,500/q)</Text>
              <Text style={[styles.calcStepValue, { color: '#0284c7' }]}>₹50,000</Text>
            </View>

            <View style={styles.calcStepRow}>
              <Text style={styles.calcStepTitle}>Step 2: Total Cultivation Cost (9 inputs)</Text>
              <Text style={[styles.calcStepValue, { color: '#ea580c' }]}>₹30,000</Text>
            </View>

            <View style={[styles.calcStepRow, styles.calcStepHighlight]}>
              <View>
                <Text style={styles.calcStepHighlightTitle}>Step 3: Net Profit (Revenue - Cost)</Text>
                <Text style={styles.calcStepHighlightSub}>Return on Investment (ROI): 66.7%</Text>
              </View>
              <Text style={styles.calcStepHighlightValue}>₹20,000 / Acre</Text>
            </View>
          </View>
        </View>

        {/* Factors Affecting Actual Profit */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.headerIconCircle, { backgroundColor: '#fef3c7' }]}>
              <FontAwesome5 name="balance-scale" size={18} color="#d97706" />
            </View>
            <Text style={styles.cardHeading}>{t('risk_section_title', 'Factors Influencing Real Profit')}</Text>
          </View>
          <Text style={styles.bodyText}>
            {t(
              'risk_section_lead',
              'While AgriMind provides data-backed projections, on-ground farm income is subject to real-world agricultural dynamics. Keeping these factors in mind helps farmers maximize profitability.'
            )}
          </Text>

          <View style={{ marginTop: 12 }}>
            {riskFactors.map((risk, idx) => (
              <View key={idx} style={styles.riskCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <FontAwesome5 name="exclamation-circle" size={13} color="#d97706" style={{ marginRight: 6 }} />
                  <Text style={styles.riskTitle}>{risk.title}</Text>
                </View>
                <Text style={styles.riskDesc}>{risk.desc}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  bannerCard: {
    backgroundColor: colors.secondaryDark || '#d28c50',
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
  },
  bannerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  bannerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.95)',
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardHeading: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
    flex: 1,
  },
  bodyText: {
    fontSize: 13,
    color: '#555555',
    lineHeight: 19,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  pillItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  flowList: {
    marginTop: 14,
  },
  flowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  flowItemIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  flowItemTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  flowItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  flowItemDesc: {
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 15,
  },
  flowDivider: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  formulaBox: {
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    padding: 14,
    marginTop: 12,
    borderTopWidth: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  formulaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  formulaTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  formulaMathBadge: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
  },
  formulaMathText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  formulaDesc: {
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 16,
  },
  mobileChartCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chartBarsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 160,
    paddingBottom: 4,
  },
  chartColWrapper: {
    alignItems: 'center',
    width: '28%',
  },
  colValueText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  colTrack: {
    width: 38,
    height: 120,
    backgroundColor: '#E2E8F0',
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  colFill: {
    width: '100%',
    borderRadius: 6,
  },
  colLabelText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
    marginTop: 8,
    textAlign: 'center',
  },
  simCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginTop: 14,
  },
  simCardTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  simCardSub: {
    fontSize: 11.5,
    color: '#64748B',
    marginBottom: 12,
    lineHeight: 16,
  },
  simInputsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  simInputGroup: {
    flex: 1,
  },
  simInputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  simInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  simResultsBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  simResultItem: {
    alignItems: 'center',
  },
  simResultLabel: {
    fontSize: 9.5,
    color: '#64748B',
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  simResultVal: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  barTrack: {
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E2E8F0',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  barSegment: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  barSegmentText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  calcDisclaimerText: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 10,
    lineHeight: 14,
    fontStyle: 'italic',
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  expenseIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  expenseTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  expenseDesc: {
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 16,
  },
  exampleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  exampleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369A1',
    textTransform: 'uppercase',
  },
  scenarioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 14,
  },
  scenarioItem: {
    width: '48%',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  scenarioLabel: {
    fontSize: 10.5,
    color: '#64748B',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  scenarioVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  calcStepContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  calcStepRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  calcStepTitle: {
    fontSize: 12,
    color: '#334155',
    flex: 1,
  },
  calcStepValue: {
    fontSize: 13.5,
    fontWeight: '700',
    marginLeft: 8,
  },
  calcStepHighlight: {
    borderBottomWidth: 0,
    backgroundColor: '#E8F5EA',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginTop: 6,
  },
  calcStepHighlightTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.primary,
  },
  calcStepHighlightSub: {
    fontSize: 10.5,
    color: '#256D45',
  },
  calcStepHighlightValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
  },
  riskCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  riskTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  riskDesc: {
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 16,
  },
});

export default CropProfitCalculationScreen;
