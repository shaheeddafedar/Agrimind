import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import useTranslation from '../i18n';
import AgriHeader from '../components/common/AgriHeader';
import colors from '../theme/colors';
import { ROUTES } from '../navigation/routes';

export const CropPredictionFactorsScreen = ({ navigation }) => {
  const { t, language } = useTranslation();
  const [selectedParam, setSelectedParam] = useState(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('all'); // 'all' | 'high' | 'low' | 'contextual'

  // Factor Data Grouped by Categories
  const factorData = useMemo(() => {
    return {
      high: {
        key: 'high',
        title: t('cat_high_importance', 'High Importance'),
        color: colors.primary,
        bgColor: '#e8f5ea',
        count: 7,
        percentage: 64, // 7/11 * 100
        description: t(
          'cat_high_desc',
          'Fundamental biochemical and climate variables that directly dictate crop survival, physiological development, and biological yield.'
        ),
        factors: [
          {
            id: 'soil_ph',
            name: t('param_ph_name', 'Soil pH (Acidity / Alkalinity)'),
            shortDesc: t('param_ph_short', 'Measures soil acidity or alkalinity on a scale of 0 to 14.'),
            icon: 'flask',
            description: t(
              'param_ph_desc',
              'Soil pH indicates whether the soil solution is acidic (< 6.0), neutral (6.0 - 7.5), or alkaline (> 7.5). It is the master chemical variable in soil science.'
            ),
            agriImportance: t(
              'param_ph_agri',
              'pH governs the solubility and bioavailability of all primary and secondary nutrients. Extreme pH locks up phosphorus, iron, and zinc.'
            ),
            growthEffect: t(
              'param_ph_growth',
              'Extreme pH damages root hairs, inhibits beneficial soil microbes, and reduces fertilizer uptake efficiency by up to 50%.'
            ),
            selectionRelevance: t(
              'param_ph_why',
              "AgriMind matches each crop's biological pH window. Most staple crops (wheat, maize) prefer 6.0-7.2, while tea thrives in acidic soil (4.5-5.5)."
            ),
            example: t(
              'param_ph_example',
              'A farmer with soil pH 5.2 will be warned against growing alkaline-loving pulses, and recommended acid-tolerant crops or lime application.'
            ),
          },
          {
            id: 'humidity',
            name: t('param_humidity_name', 'Relative Humidity (%)'),
            shortDesc: t('param_humidity_short', 'Atmospheric water vapor influencing transpiration and disease risk.'),
            icon: 'cloud',
            description: t(
              'param_humidity_desc',
              'Relative humidity is the percentage of moisture in the air compared to the maximum amount the air can hold at that temperature.'
            ),
            agriImportance: t(
              'param_humidity_agri',
              'Determines vapor pressure deficit (VPD). High humidity slows plant transpiration and cooling, while very low humidity induces moisture stress.'
            ),
            growthEffect: t(
              'param_humidity_growth',
              'Sustained humidity (>80%) creates an ideal breeding ground for fungal and bacterial pathogens like rusts, blights, and powdery mildew.'
            ),
            selectionRelevance: t(
              'param_humidity_why',
              'AgriMind incorporates humidity to avoid recommending disease-susceptible crops in humid coastal or riverine belts.'
            ),
            example: t(
              'param_humidity_example',
              'Paddy thrives in 70-85% humidity, whereas cumin and coriander suffer devastating blight if humidity exceeds 65%.'
            ),
          },
          {
            id: 'nitrogen',
            name: t('param_n_name', 'Nitrogen (N) Content'),
            shortDesc: t('param_n_short', 'Primary macronutrient driving vegetative leaf growth and green canopy formation.'),
            icon: 'leaf',
            description: t(
              'param_n_desc',
              'Nitrogen is the foundational building block of amino acids, proteins, nucleic acids, and chlorophyll in plant cells.'
            ),
            agriImportance: t(
              'param_n_agri',
              'Promotes vigorous vegetative growth, larger leaf surface area, and maximum sunlight absorption for photosynthesis.'
            ),
            growthEffect: t(
              'param_n_growth',
              'Deficiency causes stunted growth and pale yellowing of older leaves. Excess nitrogen delays flowering and makes plants susceptible to pest lodging.'
            ),
            selectionRelevance: t(
              'param_n_why',
              'AgriMind analyzes available soil nitrogen to recommend crops matching soil reserves or requiring lower nitrogen inputs.'
            ),
            example: t(
              'param_n_example',
              'Maize is a heavy nitrogen feeder requiring fertile soil, whereas leguminous crops like chickpea fix atmospheric nitrogen.'
            ),
          },
          {
            id: 'phosphorus',
            name: t('param_p_name', 'Phosphorus (P) Content'),
            shortDesc: t('param_p_short', 'Essential nutrient for deep root architecture, energy transfer, and early flowering.'),
            icon: 'cubes',
            description: t(
              'param_p_desc',
              'Phosphorus is a component of adenosine triphosphate (ATP), the primary energy currency of all plant biological processes.'
            ),
            agriImportance: t(
              'param_p_agri',
              'Critical during early seedling establishment, root elongation, early uniform flowering, and seed/grain formation.'
            ),
            growthEffect: t(
              'param_p_growth',
              'Deficiency leads to shallow root systems, delayed maturity, purplish foliage, and poorly filled grains or pods.'
            ),
            selectionRelevance: t(
              'param_p_why',
              'AgriMind evaluates phosphorus reserves to ensure root system strength, which is vital for drought tolerance.'
            ),
            example: t(
              'param_p_example',
              'Oilseeds like groundnut and mustard require high phosphorus for optimal pod filling and oil synthesis.'
            ),
          },
          {
            id: 'potassium',
            name: t('param_k_name', 'Potassium (K) Content'),
            shortDesc: t('param_k_short', 'Regulates plant water balance, disease resistance, and grain quality.'),
            icon: 'shield-alt',
            description: t(
              'param_k_desc',
              'Potassium acts as a cellular osmotic regulator and enzyme activator for over 60 plant enzymes.'
            ),
            agriImportance: t(
              'param_k_agri',
              'Controls opening and closing of leaf stomata, reducing transpirational water loss during dry spells and strengthening plant cell walls.'
            ),
            growthEffect: t(
              'param_k_growth',
              'Deficiency causes leaf edge scorching, weak stem lodging, reduced grain weight, and heightened vulnerability to fungal blights.'
            ),
            selectionRelevance: t(
              'param_k_why',
              'AgriMind checks potassium to determine if crops can withstand heat or water fluctuations during critical reproductive stages.'
            ),
            example: t(
              'param_k_example',
              'Cotton and banana have exceptionally high potassium demands for fiber strength and fruit bulk.'
            ),
          },
          {
            id: 'temperature',
            name: t('param_temp_name', 'Temperature (°C)'),
            shortDesc: t('param_temp_short', 'Ambient thermal energy governing germination, metabolic rate, and flowering.'),
            icon: 'temperature-high',
            description: t(
              'param_temp_desc',
              'Temperature controls the enzymatic kinetics of photosynthesis, cellular respiration, and transpiration.'
            ),
            agriImportance: t(
              'param_temp_agri',
              'Each crop species possesses cardinal temperatures: minimum base for germination, optimum for growth, and ceiling before heat shock.'
            ),
            growthEffect: t(
              'param_temp_growth',
              'High temperatures during flowering cause pollen sterility, while low temperatures induce chilling injury and freeze shock.'
            ),
            selectionRelevance: t(
              'param_temp_why',
              'AgriMind aligns seasonal temperature forecasts with crop thermal degree days (GDD) to avoid heat stress during anthesis.'
            ),
            example: t(
              'param_temp_example',
              'Wheat requires cool temperatures (15-20°C) during grain filling; sudden spikes above 30°C cause terminal heat stress.'
            ),
          },
          {
            id: 'season',
            name: t('param_season_name', 'Cropping Season'),
            shortDesc: t('param_season_short', 'Kharif (Monsoon), Rabi (Winter), or Zaid (Summer) calendar window.'),
            icon: 'calendar-alt',
            description: t(
              'param_season_desc',
              'Indicates the agricultural season, which combines photoperiod (day length), solar radiation, and typical weather patterns.'
            ),
            agriImportance: t(
              'param_season_agri',
              'Many crops are photoperiod-sensitive, meaning they will not initiate flowering without the right seasonal light cycle.'
            ),
            growthEffect: t(
              'param_season_growth',
              'Planting out of season causes perpetual vegetative growth without flowering, or premature flowering before adequate biomass forms.'
            ),
            selectionRelevance: t(
              'param_season_why',
              'AgriMind strictly filters candidates by seasonal viability to ensure flowering coincides with favorable conditions.'
            ),
            example: t(
              'param_season_example',
              'Soybean and Rice are primarily Kharif crops, whereas Mustard, Gram, and Wheat are Rabi crops.'
            ),
          },
        ],
      },
      low: {
        key: 'low',
        title: t('cat_low_importance', 'Low Importance'),
        color: colors.secondaryDark || '#d28c50',
        bgColor: '#fff3e0',
        count: 1,
        percentage: 9, // 1/11 * 100
        description: t(
          'cat_low_desc',
          'Natural seasonal water supply. While vital, natural rainfall variations can be managed and supplemented using modern farm irrigation systems.'
        ),
        factors: [
          {
            id: 'rainfall',
            name: t('param_rain_name', 'Annual / Seasonal Rainfall (mm)'),
            shortDesc: t('param_rain_short', 'Cumulative natural precipitation received during the cropping cycle.'),
            icon: 'cloud-rain',
            description: t(
              'param_rain_desc',
              'Rainfall provides the primary natural water supply to replenish root-zone soil moisture and recharge local groundwater tables.'
            ),
            agriImportance: t(
              'param_rain_agri',
              'Water is the solvent that dissolves soil nutrients and carries them through the plant via xylem transpiration stream.'
            ),
            growthEffect: t(
              'param_rain_growth',
              'Water deficit causes stomatal closure, leaf wilting, and reduced photosynthesis. Waterlogging suffocates root respiration.'
            ),
            selectionRelevance: t(
              'param_rain_why',
              'AgriMind treats rainfall as a baseline water source. Low rainfall does NOT disqualify a crop if irrigation facilities exist on the farm.'
            ),
            example: t(
              'param_rain_example',
              'Rice requires >1000 mm of water; if rainfall is only 400 mm, the farmer can bridge the deficit via canal or tube-well irrigation.'
            ),
          },
        ],
      },
      contextual: {
        key: 'contextual',
        title: t('cat_contextual_factors', 'Contextual Factors'),
        color: '#0284c7',
        bgColor: '#e0f2fe',
        count: 3,
        percentage: 27, // 3/11 * 100
        description: t(
          'cat_contextual_desc',
          'Operational and geographic considerations that define farm land scale, machinery feasibility, regional climate zones, and APMC market access.'
        ),
        factors: [
          {
            id: 'area',
            name: t('param_area_name', 'Field Area (Acres / Hectares)'),
            shortDesc: t('param_area_short', 'Total land size available for crop cultivation.'),
            icon: 'vector-square',
            description: t('param_area_desc', 'The physical land parcel size available on the farm.'),
            agriImportance: t(
              'param_area_agri',
              'Directly impacts farm mechanization feasibility, input bulk purchasing, labour allocation, and total production volume.'
            ),
            growthEffect: t(
              'param_area_growth',
              'Land area does not alter plant biology directly, but determines whether high-density horticulture or broad-acre field cropping is financially viable.'
            ),
            selectionRelevance: t(
              'param_area_why',
              'AgriMind uses field area to calculate overall input costs, seed volumes, water requirements, and net profit projections.'
            ),
            example: t(
              'param_area_example',
              'A 0.5-acre plot suits high-value vegetables, while a 10-acre holding can leverage combine harvesters for wheat or soybean.'
            ),
          },
          {
            id: 'city',
            name: t('param_city_name', 'City / District Location'),
            shortDesc: t('param_city_short', 'Identifies microclimate zones and district-level agricultural patterns.'),
            icon: 'city',
            description: t('param_city_desc', 'The local district or municipal jurisdiction where the farm is situated.'),
            agriImportance: t(
              'param_city_agri',
              'Districts correlate with soil orders, local pest pressures, and nearest APMC mandi market centers.'
            ),
            growthEffect: t(
              'param_city_growth',
              'Local geography affects wind patterns, fog frequency, relative elevation, and minimum night temperatures.'
            ),
            selectionRelevance: t(
              'param_city_why',
              'AgriMind uses city data to link regional historical climate patterns and nearby APMC mandi commodity prices.'
            ),
            example: t(
              'param_city_example',
              'Farms near Nashik benefit from established grape/onion cold chains, whereas Dharwad suits pulse and chili varieties.'
            ),
          },
          {
            id: 'state',
            name: t('param_state_name', 'State / Agro-Climatic Zone'),
            shortDesc: t('param_state_short', 'Broader agro-ecological zone and state government agricultural framework.'),
            icon: 'map-marked-alt',
            description: t('param_state_desc', 'The Indian State or Union Territory containing the farm holding.'),
            agriImportance: t(
              'param_state_agri',
              'Defines the overarching agro-climatic zone, state university package of practices (POP), MSP procurement, and subsidies.'
            ),
            growthEffect: t(
              'param_state_growth',
              'Regional climate baselines dictate the onset and withdrawal of the Southwest and Northeast Monsoons.'
            ),
            selectionRelevance: t(
              'param_state_why',
              'AgriMind validates recommended varieties against state agricultural university recommendations and subsidy schemes.'
            ),
            example: t(
              'param_state_example',
              'Punjab and Haryana offer specialized wheat-paddy canal infrastructure, whereas Karnataka and Maharashtra lead in sugarcane and millets.'
            ),
          },
        ],
      },
    };
  }, [t, language]);

  const displayedCategories = useMemo(() => {
    if (activeCategoryFilter === 'all') {
      return [factorData.high, factorData.low, factorData.contextual];
    }
    return [factorData[activeCategoryFilter]];
  }, [factorData, activeCategoryFilter]);

  // 7 Alternative Water / Irrigation Sources
  const alternativeWaterSources = [
    {
      title: t('source_borewell_title', 'Borewells & Tube Wells'),
      icon: 'arrow-down',
      desc: t('source_borewell_desc', 'Taps deep groundwater aquifers. Provides on-demand water supply regardless of seasonal rain delays.'),
    },
    {
      title: t('source_wells_title', 'Open Wells & Aquifer Pits'),
      icon: 'circle-notch',
      desc: t('source_wells_desc', 'Traditional open dug wells revitalized with percolation pits and artificial recharge techniques.'),
    },
    {
      title: t('source_pond_title', 'Farm Ponds & Rain Harvesting'),
      icon: 'water',
      desc: t('source_pond_desc', 'On-farm lined ponds that harvest surplus monsoon runoff, providing critical life-saving irrigation during dry spells.'),
    },
    {
      title: t('source_reservoir_title', 'Reservoirs & Check Dams'),
      icon: 'shield-alt',
      desc: t('source_reservoir_desc', 'Surface water storage facilities and check dams providing gravity or pump irrigation to nearby fields.'),
    },
    {
      title: t('source_canal_title', 'Canal Water Networks'),
      icon: 'stream',
      desc: t('source_canal_desc', 'Regional public irrigation networks carrying surface water from dams and rivers directly to farm command areas.'),
    },
    {
      title: t('source_stored_rain_title', 'Stored Rainwater Systems'),
      icon: 'cloud-rain',
      desc: t('source_stored_rain_desc', 'On-farm rainwater catchment basins and storage tanks collecting surplus runoff for targeted dry-spell watering.'),
    },
    {
      title: t('source_local_title', 'Locally Available Water Sources'),
      icon: 'tint',
      desc: t('source_local_desc', 'Community tanks, seasonal streams, river-lift cooperatives, and spring water sources managed sustainably.'),
    },
  ];

  return (
    <View style={styles.container}>
      <AgriHeader
        title="AgriMind"
        subtitle={t('factors_page_title', 'Crop Prediction Factors')}
        showBack={true}
        onBack={() => navigation?.goBack?.()}
        showLanguage={true}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Page Banner */}
        <View style={styles.bannerCard}>
          <Text style={styles.bannerTitle}>{t('factors_page_title', 'Crop Prediction Factors')}</Text>
          <Text style={styles.bannerSubtitle}>
            {t(
              'factors_page_subtitle',
              'Explore how soil properties, nutrients, environmental conditions, and farm location combine to generate precision crop recommendations.'
            )}
          </Text>
        </View>

        {/* Introduction Section */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.headerIconCircle, { backgroundColor: '#e8f5ea' }]}>
              <FontAwesome5 name="brain" size={20} color={colors.primary} />
            </View>
            <Text style={styles.cardHeading}>{t('how_agrimind_works_title', 'How AgriMind Recommends Crops')}</Text>
          </View>
          <Text style={styles.bodyText}>
            {t(
              'how_agrimind_works_desc1',
              "AgriMind uses trained agricultural machine learning algorithms that evaluate your farm's unique profile across 11 key agronomic parameters. Rather than looking at a single metric in isolation, the AI assesses the biological synergy between all parameters simultaneously."
            )}
          </Text>
          <Text style={[styles.bodyText, { marginTop: 8 }]}>
            {t(
              'how_agrimind_works_desc2',
              'Every crop species has an evolutionary comfort zone: specific pH thresholds, nutrient demands (NPK), thermal degree days, and humidity tolerance. AgriMind matches your field measurements to find crops with the highest probability of high yield.'
            )}
          </Text>

          <View style={styles.pillsRow}>
            <View style={styles.pillItem}>
              <FontAwesome5 name="check-circle" size={12} color={colors.primary} style={{ marginRight: 5 }} />
              <Text style={styles.pillText}>{t('pill_holistic', 'Multi-Variable')}</Text>
            </View>
            <View style={styles.pillItem}>
              <FontAwesome5 name="check-circle" size={12} color={colors.primary} style={{ marginRight: 5 }} />
              <Text style={styles.pillText}>{t('pill_localized', 'Regional Data')}</Text>
            </View>
            <View style={styles.pillItem}>
              <FontAwesome5 name="check-circle" size={12} color={colors.primary} style={{ marginRight: 5 }} />
              <Text style={styles.pillText}>{t('pill_irrigation_aware', 'Irrigation-Adaptive')}</Text>
            </View>
          </View>
        </View>

        {/* MOBILE-FRIENDLY CATEGORICAL VISUALIZATION */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.headerIconCircle, { backgroundColor: '#e0f2fe' }]}>
              <FontAwesome5 name="chart-bar" size={18} color="#0284c7" />
            </View>
            <Text style={styles.cardHeading}>{t('importance_donut_title', 'Distribution of Factors')}</Text>
          </View>
          <Text style={styles.bodyText}>
            {t('importance_donut_sub', '11 agronomic parameters grouped by biological influence and adaptability.')}
          </Text>

          {/* Segmented Proportional Progress Bar */}
          <View style={styles.stackedBarContainer}>
            <View style={[styles.stackedSegment, { width: '64%', backgroundColor: colors.primary }]}>
              <Text style={styles.stackedSegmentText}>7 High</Text>
            </View>
            <View style={[styles.stackedSegment, { width: '9%', backgroundColor: colors.secondaryDark || '#d28c50' }]}>
              <Text style={styles.stackedSegmentText}>1</Text>
            </View>
            <View style={[styles.stackedSegment, { width: '27%', backgroundColor: '#0284c7' }]}>
              <Text style={styles.stackedSegmentText}>3 Context</Text>
            </View>
          </View>

          {/* Interactive Category Chips & Bar Cards */}
          <TouchableOpacity
            style={[styles.catBarCard, activeCategoryFilter === 'high' && styles.catBarCardActive]}
            onPress={() => setActiveCategoryFilter(activeCategoryFilter === 'high' ? 'all' : 'high')}
            activeOpacity={0.7}
          >
            <View style={styles.catBarHeader}>
              <View style={[styles.catDot, { backgroundColor: colors.primary }]} />
              <Text style={styles.catBarTitle}>{factorData.high.title}</Text>
              <Text style={[styles.catBarCountBadge, { backgroundColor: '#e8f5ea', color: colors.primary }]}>
                7 {t('factor_count_suffix', 'Factors')}
              </Text>
            </View>
            <View style={styles.catBarTrack}>
              <View style={[styles.catBarFill, { width: '64%', backgroundColor: colors.primary }]} />
            </View>
            <Text style={styles.catBarDesc}>{factorData.high.description}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.catBarCard, activeCategoryFilter === 'low' && styles.catBarCardActive]}
            onPress={() => setActiveCategoryFilter(activeCategoryFilter === 'low' ? 'all' : 'low')}
            activeOpacity={0.7}
          >
            <View style={styles.catBarHeader}>
              <View style={[styles.catDot, { backgroundColor: colors.secondaryDark || '#d28c50' }]} />
              <Text style={styles.catBarTitle}>{factorData.low.title}</Text>
              <Text style={[styles.catBarCountBadge, { backgroundColor: '#fff3e0', color: colors.secondaryDark || '#d28c50' }]}>
                1 {t('factor_count_suffix', 'Factor')}
              </Text>
            </View>
            <View style={styles.catBarTrack}>
              <View style={[styles.catBarFill, { width: '9%', backgroundColor: colors.secondaryDark || '#d28c50' }]} />
            </View>
            <Text style={styles.catBarDesc}>{factorData.low.description}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.catBarCard, activeCategoryFilter === 'contextual' && styles.catBarCardActive]}
            onPress={() => setActiveCategoryFilter(activeCategoryFilter === 'contextual' ? 'all' : 'contextual')}
            activeOpacity={0.7}
          >
            <View style={styles.catBarHeader}>
              <View style={[styles.catDot, { backgroundColor: '#0284c7' }]} />
              <Text style={styles.catBarTitle}>{factorData.contextual.title}</Text>
              <Text style={[styles.catBarCountBadge, { backgroundColor: '#e0f2fe', color: '#0284c7' }]}>
                3 {t('factor_count_suffix', 'Factors')}
              </Text>
            </View>
            <View style={styles.catBarTrack}>
              <View style={[styles.catBarFill, { width: '27%', backgroundColor: '#0284c7' }]} />
            </View>
            <Text style={styles.catBarDesc}>{factorData.contextual.description}</Text>
          </TouchableOpacity>

          <View style={styles.disclaimerBox}>
            <FontAwesome5 name="info-circle" size={14} color="#854d0e" style={{ marginRight: 8, marginTop: 2 }} />
            <Text style={styles.disclaimerText}>
              {t(
                'chart_accuracy_notice',
                'Data Accuracy Notice: This visualization represents the count of agricultural factors in each category (7 High, 1 Low, 3 Contextual). It is an educational classification and does not represent static SHAP scores or ML model weights.'
              )}
            </Text>
          </View>
        </View>

        {/* 11 Factors Interactive Cards */}
        <View style={styles.factorsListHeader}>
          <Text style={styles.factorsListHeading}>
            {t('category_factors_heading', 'Factors in this Category')}:
          </Text>
          {activeCategoryFilter !== 'all' && (
            <TouchableOpacity onPress={() => setActiveCategoryFilter('all')}>
              <Text style={styles.showAllText}>{t('all_factors_filter', 'Show All (11)')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {displayedCategories.map((cat) => (
          <View key={cat.key} style={styles.categoryContainer}>
            <View style={styles.categoryHeader}>
              <View style={[styles.catDot, { backgroundColor: cat.color }]} />
              <Text style={styles.categoryTitle}>{cat.title}</Text>
              <Text style={[styles.categoryCount, { color: cat.color }]}>({cat.factors.length})</Text>
            </View>

            {cat.factors.map((param) => (
              <TouchableOpacity
                key={param.id}
                style={[styles.paramCard, { borderLeftColor: cat.color, borderLeftWidth: 4 }]}
                onPress={() => setSelectedParam({ ...param, catBadge: cat.title, badgeColor: cat.color, badgeBg: cat.bgColor })}
                activeOpacity={0.75}
              >
                <View style={styles.paramCardTop}>
                  <View style={[styles.paramIconCircle, { backgroundColor: cat.bgColor }]}>
                    <FontAwesome5 name={param.icon} size={16} color={cat.color} />
                  </View>
                  <View style={[styles.paramBadge, { backgroundColor: cat.bgColor }]}>
                    <Text style={[styles.paramBadgeText, { color: cat.color }]}>{cat.title}</Text>
                  </View>
                </View>

                <Text style={styles.paramTitle}>{param.name}</Text>
                <Text style={styles.paramDesc}>{param.shortDesc}</Text>

                <View style={styles.paramFooterRow}>
                  <Text style={[styles.paramTapText, { color: cat.color }]}>
                    {t('click_to_inspect', 'Tap to inspect details')}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={cat.color} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        {/* Rainfall & Alternative Water Sources */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.headerIconCircle, { backgroundColor: '#e0f2fe' }]}>
              <FontAwesome5 name="tint" size={18} color="#0284c7" />
            </View>
            <Text style={styles.cardHeading}>
              {t('rainfall_faq_title', 'Little or No Rainfall in Your Area?')}
            </Text>
          </View>
          <Text style={styles.bodyText}>
            {t(
              'rainfall_faq_lead',
              'A common concern among farmers is whether low seasonal rainfall prevents successful crop production. In modern agriculture, natural rainfall is only one water source. If your soil has balanced nutrients (NPK), healthy pH, and optimal temperature, modern irrigation allows you to bridge rainfall deficits and grow high-yielding crops.'
            )}
          </Text>

          <Text style={[styles.cardHeading, { fontSize: 16, marginTop: 18, marginBottom: 12 }]}>
            {t('alt_sources_title', 'Alternative Water & Irrigation Sources')}
          </Text>

          {alternativeWaterSources.map((source, idx) => (
            <View key={idx} style={styles.waterSourceRow}>
              <View style={styles.waterSourceIcon}>
                <FontAwesome5 name={source.icon} size={15} color="#0284c7" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.waterSourceTitle}>{source.title}</Text>
                <Text style={styles.waterSourceDesc}>{source.desc}</Text>
              </View>
            </View>
          ))}

          {/* Water Math Conversion Box */}
          <View style={styles.waterFormulaCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <FontAwesome5 name="calculator" size={16} color="#38bdf8" style={{ marginRight: 8 }} />
              <Text style={styles.waterFormulaTitle}>
                {t('water_formula_title', 'How Much Water Does a Crop Need?')}
              </Text>
            </View>
            <Text style={styles.waterFormulaDesc}>
              {t(
                'water_formula_intro',
                'Water depth measured in millimetres (mm) converts directly to volume in litres across your farm area:'
              )}
            </Text>

            <View style={styles.formulaBanner}>
              <Text style={styles.formulaBannerMain}>1 mm of Water on 1 Hectare</Text>
              <Text style={styles.formulaBannerEqual}>= 10,000 Litres of Water</Text>
              <Text style={styles.formulaBannerSub}>(On 1 Acre: 1 mm ≈ 4,047 Litres)</Text>
            </View>

            <View style={styles.exampleCalcBox}>
              <Text style={styles.exampleCalcHeading}>
                {t('calc_example_title', 'Illustrative Calculation: 1 Hectare Wheat Crop')}
              </Text>
              <Text style={styles.exampleCalcStep}>• {t('calc_step_1', 'Total Season Crop Water Need: 450 mm')}</Text>
              <Text style={styles.exampleCalcStep}>• {t('calc_step_2', 'Total Water Volume = 450 × 10,000 L = 45 Lakh Litres')}</Text>
              <Text style={styles.exampleCalcStep}>• {t('calc_step_3', 'Suppose Natural Rainfall contributes 150 mm (15 Lakh L)')}</Text>
              <Text style={styles.exampleCalcStep}>• {t('calc_step_4', 'Net Irrigation Deficit = 300 mm = 30 Lakh Litres')}</Text>
              <Text style={styles.exampleCalcResult}>
                {t(
                  'calc_result_note',
                  'With 90% efficient drip irrigation, you pump ~33.3 lakh litres versus ~66.7 lakh litres with flood irrigation, cutting water and energy usage by half!'
                )}
              </Text>
              <Text style={styles.exampleCalcDisclaimer}>
                {t(
                  'water_conversion_disclaimer',
                  'Educational Illustration: This calculation is a sample educational demonstration. Actual farm irrigation needs depend on crop stage, soil type, and climate.'
                )}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.irrigationNavBtn}
              onPress={() => {
                try {
                  navigation?.navigate(ROUTES.SMART_IRRIGATION);
                } catch {
                  navigation?.navigate(ROUTES.IRRIGATION_TAB);
                }
              }}
              activeOpacity={0.8}
            >
              <FontAwesome5 name="faucet" size={15} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.irrigationNavBtnText}>
                {t('visit_smart_irrigation', 'Open Smart Irrigation Dashboard')}
              </Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Modal for Parameter Details */}
      <Modal
        visible={Boolean(selectedParam)}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedParam(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <View style={[styles.modalIconBox, { backgroundColor: selectedParam?.badgeBg || '#e8f5ea' }]}>
                <FontAwesome5
                  name={selectedParam?.icon || 'flask'}
                  size={20}
                  color={selectedParam?.badgeColor || colors.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>{selectedParam?.name}</Text>
                <View style={[styles.paramBadge, { backgroundColor: selectedParam?.badgeBg, alignSelf: 'flex-start', marginTop: 4 }]}>
                  <Text style={[styles.paramBadgeText, { color: selectedParam?.badgeColor }]}>
                    {selectedParam?.catBadge}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setSelectedParam(null)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionLabel}>
                  <FontAwesome5 name="book-open" size={12} color={colors.primary} /> {t('modal_what_is_it', 'What It Is')}
                </Text>
                <Text style={styles.modalSectionText}>{selectedParam?.description}</Text>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionLabel}>
                  <FontAwesome5 name="seedling" size={12} color={colors.primary} /> {t('modal_agri_importance', 'Agricultural Importance')}
                </Text>
                <Text style={styles.modalSectionText}>{selectedParam?.agriImportance}</Text>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionLabel}>
                  <FontAwesome5 name="chart-line" size={12} color={colors.primary} /> {t('modal_growth_effect', 'Effect on Crop Growth')}
                </Text>
                <Text style={styles.modalSectionText}>{selectedParam?.growthEffect}</Text>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionLabel}>
                  <FontAwesome5 name="robot" size={12} color={colors.primary} /> {t('modal_selection_relevance', 'How AgriMind Uses It')}
                </Text>
                <Text style={styles.modalSectionText}>{selectedParam?.selectionRelevance}</Text>
              </View>

              <View style={[styles.modalSection, styles.exampleBox]}>
                <Text style={[styles.modalSectionLabel, { color: '#0284c7' }]}>
                  <FontAwesome5 name="lightbulb" size={12} color="#0284c7" /> {t('modal_real_example', 'Agricultural Example')}
                </Text>
                <Text style={styles.modalSectionText}>{selectedParam?.example}</Text>
              </View>
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
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  bannerCard: {
    backgroundColor: colors.primary,
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
    color: 'rgba(255, 255, 255, 0.92)',
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
  stackedBarContainer: {
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    flexDirection: 'row',
    overflow: 'hidden',
    marginVertical: 14,
  },
  stackedSegment: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackedSegmentText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  catBarCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  catBarCardActive: {
    borderColor: colors.primary,
    backgroundColor: '#FFFFFF',
  },
  catBarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  catDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  catBarTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  catBarCountBadge: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  catBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
    marginVertical: 6,
    overflow: 'hidden',
  },
  catBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  catBarDesc: {
    fontSize: 11.5,
    color: '#64748b',
    lineHeight: 15,
  },
  disclaimerBox: {
    flexDirection: 'row',
    backgroundColor: '#FEFCE8',
    borderColor: '#FEF08A',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    color: '#854D0E',
    lineHeight: 15,
  },
  factorsListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  factorsListHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  showAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  categoryContainer: {
    marginBottom: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    marginRight: 6,
  },
  categoryCount: {
    fontSize: 13,
    fontWeight: '700',
  },
  paramCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  paramCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  paramIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paramBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  paramBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  paramTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  paramDesc: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
    marginBottom: 10,
  },
  paramFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  paramTapText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  waterSourceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  waterSourceIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  waterSourceTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  waterSourceDesc: {
    fontSize: 11.5,
    color: '#64748b',
    lineHeight: 15,
  },
  waterFormulaCard: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  waterFormulaTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#38BDF8',
  },
  waterFormulaDesc: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 16,
    marginBottom: 12,
  },
  formulaBanner: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  formulaBannerMain: {
    fontSize: 13,
    color: '#F8FAFC',
    fontWeight: '700',
  },
  formulaBannerEqual: {
    fontSize: 15,
    color: '#4ADE80',
    fontWeight: '800',
    marginVertical: 2,
  },
  formulaBannerSub: {
    fontSize: 11,
    color: '#CBD5E1',
  },
  exampleCalcBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#38BDF8',
    marginBottom: 14,
  },
  exampleCalcHeading: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#7DD3FC',
    marginBottom: 6,
  },
  exampleCalcStep: {
    fontSize: 11.5,
    color: '#E2E8F0',
    lineHeight: 16,
    marginBottom: 3,
  },
  exampleCalcResult: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#4ADE80',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    lineHeight: 16,
  },
  exampleCalcDisclaimer: {
    fontSize: 10.5,
    color: '#94a3b8',
    marginTop: 6,
    fontStyle: 'italic',
  },
  irrigationNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    borderRadius: 8,
  },
  irrigationNavBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  modalSection: {
    marginBottom: 14,
  },
  modalSectionLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  modalSectionText: {
    fontSize: 12.5,
    color: '#334155',
    lineHeight: 18,
  },
  exampleBox: {
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#0284C7',
  },
});

export default CropPredictionFactorsScreen;
