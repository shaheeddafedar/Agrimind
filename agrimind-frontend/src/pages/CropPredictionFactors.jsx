import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import '../assets/css/crop-factors.css';

ChartJS.register(ArcElement, Tooltip, Legend);

const CropPredictionFactors = () => {
  const { t, i18n } = useTranslation();
  const [selectedParam, setSelectedParam] = useState(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('all'); // 'all' | 'high' | 'low' | 'contextual'
  const [hoveredCategory, setHoveredCategory] = useState(null);

  // 11 Agricultural Parameters Categorized
  const factorData = useMemo(() => {
    return {
      high: {
        key: 'high',
        title: t('cat_high_importance', 'High Importance'),
        color: '#2E8B57',
        hoverColor: '#246e45',
        badgeBg: '#e8f5ea',
        badgeType: 'badge-high',
        description: t(
          'cat_high_desc',
          'Fundamental biochemical and climate variables that directly dictate crop survival, physiological development, and biological yield.'
        ),
        factors: [
          {
            id: 'soil_ph',
            name: t('param_ph_name', 'Soil pH (Acidity / Alkalinity)'),
            shortDesc: t('param_ph_short', 'Measures soil acidity or alkalinity on a scale of 0 to 14.'),
            icon: 'fas fa-flask',
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
              'Extreme pH inhibits beneficial soil microbes, damages root hair membranes, and reduces fertilizer uptake efficiency by up to 50%.'
            ),
            selectionRelevance: t(
              'param_ph_why',
              "AgriMind matches each crop's biological tolerance window. Most staple crops (wheat, maize) prefer 6.0-7.2, while tea thrives in acidic soil (4.5-5.5)."
            ),
            example: t(
              'param_ph_example',
              'A farmer with soil pH 5.2 will be warned against growing alkaline-loving pulses like chickpea, and recommended acid-tolerant crops or lime application.'
            ),
          },
          {
            id: 'humidity',
            name: t('param_humidity_name', 'Relative Humidity (%)'),
            shortDesc: t('param_humidity_short', 'Atmospheric water vapor influencing transpiration and disease risk.'),
            icon: 'fas fa-cloud',
            description: t(
              'param_humidity_desc',
              'Relative humidity is the percentage of moisture in the air compared to the maximum amount the air can hold at that temperature.'
            ),
            agriImportance: t(
              'param_humidity_agri',
              'Determines the vapor pressure deficit (VPD). High humidity slows plant transpiration and cooling, while very low humidity induces moisture stress.'
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
            icon: 'fas fa-leaf',
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
              'Deficiency causes stunted growth and pale yellowing of older leaves (chlorosis). Excess nitrogen delays flowering and increases lodging risk.'
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
            icon: 'fas fa-cubes',
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
            icon: 'fas fa-shield-alt',
            description: t(
              'param_k_desc',
              'Potassium acts as a cellular osmotic regulator and enzyme activator for over 60 plant enzymes.'
            ),
            agriImportance: t(
              'param_k_agri',
              'Controls the opening and closing of leaf stomata, reducing transpirational water loss during dry spells and strengthening plant cell walls.'
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
            icon: 'fas fa-thermometer-half',
            description: t(
              'param_temp_desc',
              'Temperature controls the enzymatic kinetics of photosynthesis, cellular respiration, and transpiration.'
            ),
            agriImportance: t(
              'param_temp_agri',
              'Each crop species possesses cardinal temperatures: minimum base for germination, optimum for vegetative growth, and ceiling before heat shock.'
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
            icon: 'fas fa-calendar-alt',
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
        color: '#F4A460',
        hoverColor: '#d28c50',
        badgeBg: '#fff3e0',
        badgeType: 'badge-low',
        description: t(
          'cat_low_desc',
          'Natural seasonal water supply. While vital, natural rainfall variations can be managed and supplemented using modern farm irrigation systems.'
        ),
        factors: [
          {
            id: 'rainfall',
            name: t('param_rain_name', 'Annual / Seasonal Rainfall (mm)'),
            shortDesc: t('param_rain_short', 'Cumulative natural precipitation received during the cropping cycle.'),
            icon: 'fas fa-cloud-showers-heavy',
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
        hoverColor: '#0369a1',
        badgeBg: '#e0f2fe',
        badgeType: 'badge-context',
        description: t(
          'cat_contextual_desc',
          'Operational and geographic considerations that define farm land scale, machinery feasibility, regional climate zones, and APMC market access.'
        ),
        factors: [
          {
            id: 'area',
            name: t('param_area_name', 'Field Area (Acres / Hectares)'),
            shortDesc: t('param_area_short', 'Total land size available for crop cultivation.'),
            icon: 'fas fa-vector-square',
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
            icon: 'fas fa-city',
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
            icon: 'fas fa-map-marked-alt',
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
  }, [t, i18n.language]);

  // Donut Chart Data & Configuration
  const categoryKeys = ['high', 'low', 'contextual'];
  const chartData = useMemo(() => {
    return {
      labels: [
        `${factorData.high.title} (7 ${t('factor_count_suffix', 'Factors')})`,
        `${factorData.low.title} (1 ${t('factor_count_suffix', 'Factor')})`,
        `${factorData.contextual.title} (3 ${t('factor_count_suffix', 'Factors')})`,
      ],
      datasets: [
        {
          data: [
            factorData.high.factors.length,
            factorData.low.factors.length,
            factorData.contextual.factors.length,
          ],
          backgroundColor: [
            factorData.high.color,
            factorData.low.color,
            factorData.contextual.color,
          ],
          hoverBackgroundColor: [
            factorData.high.hoverColor,
            factorData.low.hoverColor,
            factorData.contextual.hoverColor,
          ],
          borderColor: '#ffffff',
          borderWidth: 3,
          hoverOffset: 12,
        },
      ],
    };
  }, [factorData, t]);

  const chartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            font: {
              size: 13,
              family: 'inherit',
              weight: 'bold',
            },
            padding: 18,
            boxWidth: 16,
            boxHeight: 16,
            usePointStyle: true,
            pointStyle: 'circle',
          },
        },
        tooltip: {
          backgroundColor: '#0f172a',
          titleFont: { size: 14, weight: 'bold' },
          bodyFont: { size: 12 },
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: (context) => {
              const catKey = categoryKeys[context.dataIndex];
              const cat = factorData[catKey];
              const factorNames = cat.factors.map((f) => f.name.split(' (')[0]).join(', ');
              return [
                ` ${cat.factors.length} ${t('factor_count_suffix', 'Factors')}`,
                ` Included: ${factorNames}`,
              ];
            },
          },
        },
      },
      onClick: (event, elements) => {
        if (elements && elements.length > 0) {
          const index = elements[0].index;
          const clickedKey = categoryKeys[index];
          setActiveCategoryFilter((prev) => (prev === clickedKey ? 'all' : clickedKey));
        }
      },
      onHover: (event, elements) => {
        if (elements && elements.length > 0) {
          const index = elements[0].index;
          setHoveredCategory(categoryKeys[index]);
        } else {
          setHoveredCategory(null);
        }
      },
    };
  }, [factorData, t]);

  // Filtered factors to display
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
      icon: 'fas fa-arrow-down',
      desc: t(
        'source_borewell_desc',
        'Taps deep groundwater aquifers. Provides on-demand water supply regardless of seasonal rain delays.'
      ),
    },
    {
      title: t('source_wells_title', 'Open Wells & Aquifer Pits'),
      icon: 'fas fa-circle-notch',
      desc: t(
        'source_wells_desc',
        'Traditional open dug wells revitalized with percolation pits and artificial recharge techniques.'
      ),
    },
    {
      title: t('source_pond_title', 'Farm Ponds & Rain Harvesting'),
      icon: 'fas fa-water',
      desc: t(
        'source_pond_desc',
        'On-farm lined ponds that harvest surplus monsoon runoff, providing critical life-saving irrigation during dry spells.'
      ),
    },
    {
      title: t('source_reservoir_title', 'Reservoirs & Check Dams'),
      icon: 'fas fa-shield-alt',
      desc: t(
        'source_reservoir_desc',
        'Surface water storage facilities and check dams providing gravity or pump irrigation to nearby fields.'
      ),
    },
    {
      title: t('source_canal_title', 'Canal Water Networks'),
      icon: 'fas fa-stream',
      desc: t(
        'source_canal_desc',
        'Regional public irrigation networks carrying surface water from dams and rivers directly to farm command areas.'
      ),
    },
    {
      title: t('source_stored_rain_title', 'Stored Rainwater Systems'),
      icon: 'fas fa-cloud-rain',
      desc: t(
        'source_stored_rain_desc',
        'On-farm rainwater catchment basins and storage tanks collecting surplus runoff for targeted dry-spell watering.'
      ),
    },
    {
      title: t('source_local_title', 'Locally Available Water Sources'),
      icon: 'fas fa-tint',
      desc: t(
        'source_local_desc',
        'Community tanks, seasonal streams, river-lift cooperatives, and spring water sources managed sustainably.'
      ),
    },
  ];

  return (
    <main className="factors-page">
      {/* Header */}
      <div className="factors-header">
        <div className="container">
          <div className="back-nav-container">
            <Link to="/about" className="back-link">
              <i className="fas fa-arrow-left"></i> {t('back_to_about', 'Back to About AgriMind')}
            </Link>
          </div>

          <h1>{t('factors_page_title', 'Crop Prediction Factors')}</h1>
          <p>
            {t(
              'factors_page_subtitle',
              'Explore how soil properties, nutrients, environmental conditions, and farm location combine to generate precision crop recommendations.'
            )}
          </p>
        </div>
      </div>

      <div className="container">
        {/* Introduction Overview Card */}
        <section className="intro-overview-card">
          <h2>
            <i className="fas fa-brain" style={{ color: '#2E8B57' }}></i>
            {t('how_agrimind_works_title', 'How AgriMind Recommends Crops')}
          </h2>
          <p>
            {t(
              'how_agrimind_works_desc1',
              "AgriMind uses trained agricultural machine learning algorithms that evaluate your farm's unique profile across 11 key agronomic parameters. Rather than looking at a single metric in isolation, the AI assesses the biological synergy between all parameters simultaneously."
            )}
          </p>
          <p>
            {t(
              'how_agrimind_works_desc2',
              'Every crop species has an evolutionary comfort zone: specific pH thresholds, nutrient demands (NPK), thermal degree days, and humidity tolerance. AgriMind matches your field measurements to find crops with the highest probability of high yield, pest resilience, and market profitability.'
            )}
          </p>

          <div className="highlights-pill-row">
            <div className="highlight-pill">
              <i className="fas fa-check-circle"></i>
              {t('pill_holistic', 'Multi-Variable Optimization')}
            </div>
            <div className="highlight-pill">
              <i className="fas fa-check-circle"></i>
              {t('pill_localized', 'Regionally Calibrated')}
            </div>
            <div className="highlight-pill">
              <i className="fas fa-check-circle"></i>
              {t('pill_irrigation_aware', 'Irrigation-Adaptive')}
            </div>
            <div className="highlight-pill">
              <i className="fas fa-check-circle"></i>
              {t('pill_farmer_centric', 'Farmer-Centric Support')}
            </div>
          </div>
        </section>

        {/* SECTION 1: CIRCULAR DONUT CHART SECTION */}
        <section className="donut-visualization-section">
          <div className="section-header-box">
            <span className="section-pill-tag">
              <i className="fas fa-chart-pie"></i> Visual Factor Distribution
            </span>
            <h2>{t('importance_donut_title', 'Distribution of Crop Prediction Factors')}</h2>
            <p>{t('importance_donut_sub', '11 agronomic parameters grouped by biological influence and adaptability.')}</p>
          </div>

          <div className="donut-showcase-card">
            <div className="donut-chart-column">
              <div className="donut-canvas-wrapper">
                <Doughnut data={chartData} options={chartOptions} />
                <div className="donut-center-stat">
                  <span className="donut-stat-number">
                    {hoveredCategory
                      ? factorData[hoveredCategory].factors.length
                      : activeCategoryFilter !== 'all'
                      ? factorData[activeCategoryFilter].factors.length
                      : '11'}
                  </span>
                  <span className="donut-stat-label">
                    {hoveredCategory
                      ? factorData[hoveredCategory].title
                      : activeCategoryFilter !== 'all'
                      ? factorData[activeCategoryFilter].title
                      : t('factor_count_suffix', 'Factors')}
                  </span>
                </div>
              </div>
              <p className="donut-interaction-hint">
                <i className="fas fa-mouse-pointer"></i> {t('click_segment_hint', 'Click or tap a category segment to highlight its factors')}
              </p>
            </div>

            <div className="donut-categories-details-column">
              <h3>{t('category_factors_heading', 'Categories Overview')}</h3>

              <div
                className={`category-summary-card high ${activeCategoryFilter === 'high' ? 'active-filter' : ''}`}
                onClick={() => setActiveCategoryFilter(activeCategoryFilter === 'high' ? 'all' : 'high')}
                role="button"
                tabIndex={0}
              >
                <div className="cat-card-header">
                  <div className="cat-dot high"></div>
                  <strong className="cat-card-title">{factorData.high.title}</strong>
                  <span className="cat-card-count">7 {t('factor_count_suffix', 'Factors')}</span>
                </div>
                <p className="cat-card-desc">{factorData.high.description}</p>
                <div className="cat-tags-row">
                  {factorData.high.factors.map((f) => (
                    <span key={f.id} className="cat-factor-pill">
                      {f.name.split(' (')[0]}
                    </span>
                  ))}
                </div>
              </div>

              <div
                className={`category-summary-card low ${activeCategoryFilter === 'low' ? 'active-filter' : ''}`}
                onClick={() => setActiveCategoryFilter(activeCategoryFilter === 'low' ? 'all' : 'low')}
                role="button"
                tabIndex={0}
              >
                <div className="cat-card-header">
                  <div className="cat-dot low"></div>
                  <strong className="cat-card-title">{factorData.low.title}</strong>
                  <span className="cat-card-count">1 {t('factor_count_suffix', 'Factor')}</span>
                </div>
                <p className="cat-card-desc">{factorData.low.description}</p>
                <div className="cat-tags-row">
                  {factorData.low.factors.map((f) => (
                    <span key={f.id} className="cat-factor-pill">
                      {f.name.split(' (')[0]}
                    </span>
                  ))}
                </div>
              </div>

              <div
                className={`category-summary-card contextual ${activeCategoryFilter === 'contextual' ? 'active-filter' : ''}`}
                onClick={() => setActiveCategoryFilter(activeCategoryFilter === 'contextual' ? 'all' : 'contextual')}
                role="button"
                tabIndex={0}
              >
                <div className="cat-card-header">
                  <div className="cat-dot contextual"></div>
                  <strong className="cat-card-title">{factorData.contextual.title}</strong>
                  <span className="cat-card-count">3 {t('factor_count_suffix', 'Factors')}</span>
                </div>
                <p className="cat-card-desc">{factorData.contextual.description}</p>
                <div className="cat-tags-row">
                  {factorData.contextual.factors.map((f) => (
                    <span key={f.id} className="cat-factor-pill">
                      {f.name.split(' (')[0]}
                    </span>
                  ))}
                </div>
              </div>

              <div className="chart-accuracy-box">
                <i className="fas fa-info-circle"></i>
                <span>{t('chart_accuracy_notice', 'Data Accuracy Notice: This circular chart represents the count of agricultural factors in each category (7 High, 1 Low, 3 Contextual). It is an educational classification and does not represent static SHAP scores or ML model weights.')}</span>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: THE 11 FACTORS DETAILED GRID */}
        <section className="factors-detailed-section">
          <div className="factors-filter-bar">
            <span className="filter-title">{t('category_factors_heading', 'Factors List')}:</span>
            <div className="filter-buttons-group">
              <button
                type="button"
                className={`filter-btn ${activeCategoryFilter === 'all' ? 'active' : ''}`}
                onClick={() => setActiveCategoryFilter('all')}
              >
                {t('all_factors_filter', 'All Factors (11)')}
              </button>
              <button
                type="button"
                className={`filter-btn high ${activeCategoryFilter === 'high' ? 'active' : ''}`}
                onClick={() => setActiveCategoryFilter('high')}
              >
                {factorData.high.title} (7)
              </button>
              <button
                type="button"
                className={`filter-btn low ${activeCategoryFilter === 'low' ? 'active' : ''}`}
                onClick={() => setActiveCategoryFilter('low')}
              >
                {factorData.low.title} (1)
              </button>
              <button
                type="button"
                className={`filter-btn contextual ${activeCategoryFilter === 'contextual' ? 'active' : ''}`}
                onClick={() => setActiveCategoryFilter('contextual')}
              >
                {factorData.contextual.title} (3)
              </button>
            </div>
          </div>

          {displayedCategories.map((cat) => (
            <div key={cat.key} className="factor-category-group">
              <div className="category-group-header">
                <div className="group-title-row">
                  <div className={`cat-indicator-dot ${cat.key}`}></div>
                  <h3>{cat.title}</h3>
                  <span className={`cat-badge ${cat.badgeType}`}>{cat.factors.length} {t('factor_count_suffix', 'Factors')}</span>
                </div>
                <p className="group-subtitle">{cat.description}</p>
              </div>

              <div className="parameters-grid">
                {cat.factors.map((param) => (
                  <div
                    key={param.id}
                    className="parameter-card"
                    onClick={() => setSelectedParam({ ...param, catBadge: cat.title, badgeType: cat.badgeType, badgeBg: cat.badgeBg, color: cat.color })}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        setSelectedParam({ ...param, catBadge: cat.title, badgeType: cat.badgeType, badgeBg: cat.badgeBg, color: cat.color });
                      }
                    }}
                  >
                    <div className="param-card-header">
                      <div className="param-icon-box" style={{ color: cat.color, backgroundColor: cat.badgeBg }}>
                        <i className={param.icon}></i>
                      </div>
                      <span className={`param-badge ${cat.badgeType}`}>{cat.title}</span>
                    </div>

                    <h3>{param.name}</h3>
                    <p className="param-summary">{param.shortDesc}</p>

                    <div className="param-click-prompt" style={{ color: cat.color }}>
                      <span>{t('click_to_inspect', 'Tap to inspect details')}</span>
                      <i className="fas fa-chevron-right"></i>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* SECTION 3: RAINFALL AND WATER AVAILABILITY EXPLANATION */}
        <section className="rainfall-section">
          <h2>
            <i className="fas fa-tint" style={{ color: '#0284c7', marginRight: '10px' }}></i>
            {t('rainfall_faq_title', 'What If There Is Little or No Rainfall in My Area?')}
          </h2>
          <p className="rainfall-lead">
            {t(
              'rainfall_faq_lead',
              'A common concern among farmers is whether low seasonal rainfall prevents successful crop production. In modern agriculture, natural rainfall is only one water source. If your soil has balanced nutrients (NPK), healthy pH, and optimal temperature, modern irrigation allows you to bridge rainfall deficits and grow high-yielding crops.'
            )}
          </p>

          <h3 style={{ fontSize: '1.3rem', fontWeight: '800', color: '#1e293b', marginBottom: '16px' }}>
            {t('alt_sources_title', 'Alternative Water & Irrigation Sources')}
          </h3>

          <div className="water-sources-grid">
            {alternativeWaterSources.map((source, idx) => (
              <div key={idx} className="water-source-card">
                <div className="source-icon">
                  <i className={source.icon}></i>
                </div>
                <h4>{source.title}</h4>
                <p>{source.desc}</p>
              </div>
            ))}
          </div>

          {/* How Much Water Does a Crop Need? Formula Box */}
          <div className="water-formula-box">
            <h3>
              <i className="fas fa-calculator" style={{ marginRight: '8px' }}></i>
              {t('water_formula_title', 'How Much Water Does a Crop Need?')}
            </h3>
            <p style={{ color: '#cbd5e1', fontSize: '0.98rem', lineHeight: '1.6' }}>
              {t(
                'water_formula_intro',
                'Water depth measured in millimetres (mm) converts directly to volume in litres across your farm area using standard agronomic physics:'
              )}
            </p>

            <div className="formula-display-banner">
              {t('water_conversion_banner', '1 mm of Water on 1 Hectare = 10,000 Litres of Water')}
            </div>
            <div className="formula-subtext" style={{ textAlign: 'center' }}>
              {t('water_conversion_sub', '(On 1 Acre [0.4047 Hectare]: 1 mm of Water ≈ 4,047 Litres)')}
            </div>

            <div className="example-calculation-card">
              <h4>
                <i className="fas fa-lightbulb" style={{ marginRight: '6px' }}></i>
                {t('calc_example_title', 'Illustrative Calculation: 1 Hectare Wheat Crop')}
              </h4>
              <div className="calc-step">• {t('calc_step_1', 'Total Season Crop Water Need: 450 mm')}</div>
              <div className="calc-step">
                • {t('calc_step_2', 'Total Water Volume = 450 mm × 10,000 L/ha = 4,500,000 Litres (45 Lakh Litres)')}
              </div>
              <div className="calc-step">• {t('calc_step_3', 'Suppose Natural Rainfall contributes 150 mm = 1,500,000 Litres')}</div>
              <div className="calc-step">• {t('calc_step_4', 'Net Irrigation Deficit to provide = 300 mm = 3,000,000 Litres (30 Lakh Litres)')}</div>
              <div className="calc-result">
                {t(
                  'calc_result_note',
                  'With 90% efficient drip irrigation, you pump ~33.3 lakh litres versus ~66.7 lakh litres with flood irrigation, cutting energy and groundwater usage by half!'
                )}
              </div>
              <div className="calc-disclaimer-note">
                <i className="fas fa-exclamation-circle"></i>{' '}
                {t(
                  'water_conversion_disclaimer',
                  'Educational Illustration: This calculation is a sample educational demonstration. Actual farm irrigation needs depend on crop stage, soil type, and climate.'
                )}
              </div>
            </div>

            <div className="water-cta-row">
              <Link to="/irrigation" className="water-cta-btn">
                <i className="fas fa-faucet"></i> {t('visit_smart_irrigation', 'Open Smart Irrigation Dashboard')}
              </Link>
            </div>
          </div>
        </section>
      </div>

      {/* Modal for Parameter Details */}
      {selectedParam && (
        <div className="modal-overlay" onClick={() => setSelectedParam(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setSelectedParam(null)} aria-label="Close">
              <i className="fas fa-times"></i>
            </button>

            <div className="modal-header-section">
              <div className="modal-icon-box" style={{ color: selectedParam.color, backgroundColor: selectedParam.badgeBg }}>
                <i className={selectedParam.icon}></i>
              </div>
              <div className="modal-header-text">
                <span className={`param-badge ${selectedParam.badgeType}`}>{selectedParam.catBadge}</span>
                <h3>{selectedParam.name}</h3>
              </div>
            </div>

            <div className="modal-info-block">
              <h4>
                <i className="fas fa-book-open"></i> {t('modal_what_is_it', 'What It Is')}
              </h4>
              <p>{selectedParam.description}</p>
            </div>

            <div className="modal-info-block">
              <h4>
                <i className="fas fa-seedling"></i> {t('modal_agri_importance', 'Agricultural Importance')}
              </h4>
              <p>{selectedParam.agriImportance}</p>
            </div>

            <div className="modal-info-block">
              <h4>
                <i className="fas fa-chart-line"></i> {t('modal_growth_effect', 'Effect on Crop Growth')}
              </h4>
              <p>{selectedParam.growthEffect}</p>
            </div>

            <div className="modal-info-block">
              <h4>
                <i className="fas fa-robot"></i> {t('modal_selection_relevance', 'How AgriMind Uses It in Crop Selection')}
              </h4>
              <p>{selectedParam.selectionRelevance}</p>
            </div>

            <div className="modal-info-block">
              <h4>
                <i className="fas fa-lightbulb"></i> {t('modal_real_example', 'Real-World Agricultural Example')}
              </h4>
              <div className="example-box">
                <p>{selectedParam.example}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default CropPredictionFactors;
