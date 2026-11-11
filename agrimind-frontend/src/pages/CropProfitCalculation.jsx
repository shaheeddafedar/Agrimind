import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import '../assets/css/crop-profit.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const CropProfitCalculation = () => {
  const { t, i18n } = useTranslation();

  // Interactive scenario state (Default: 1 Acre Wheat scenario)
  const [simArea, setSimArea] = useState(1);
  const [simYield, setSimYield] = useState(20);
  const [simPrice, setSimPrice] = useState(2500);
  const [simCostPerAcre, setSimCostPerAcre] = useState(30000);

  // Dynamic calculations
  const simTotalRevenue = Math.max(0, simArea * simYield * simPrice);
  const simTotalCost = Math.max(0, simArea * simCostPerAcre);
  const simNetProfit = simTotalRevenue - simTotalCost;
  const simRoi = simTotalCost > 0 ? ((simNetProfit / simTotalCost) * 100).toFixed(1) : 0;
  const simProfitPerAcre = simArea > 0 ? Math.round(simNetProfit / simArea) : 0;
  const expensePercent = simTotalRevenue > 0 ? Math.min(100, Math.round((simTotalCost / simTotalRevenue) * 100)) : 60;
  const profitPercent = Math.max(0, 100 - expensePercent);

  // Bar Chart Data & Configuration
  const barChartData = useMemo(() => {
    return {
      labels: [
        t('chart_lbl_revenue', 'Total Revenue'),
        t('chart_lbl_costs', 'Cultivation Cost'),
        t('chart_lbl_profit', 'Net Profit'),
      ],
      datasets: [
        {
          label: t('chart_profit_comparison_title', 'Amount in ₹ INR'),
          data: [simTotalRevenue, simTotalCost, simNetProfit],
          backgroundColor: [
            '#0284c7', // Blue for Revenue
            '#ea580c', // Orange for Cost
            simNetProfit >= 0 ? '#2E8B57' : '#dc2626', // Green or Red for Net Profit
          ],
          borderColor: [
            '#0369a1',
            '#c2410c',
            simNetProfit >= 0 ? '#1b5e20' : '#b91c1c',
          ],
          borderWidth: 2,
          borderRadius: 8,
          barThickness: 48,
        },
      ],
    };
  }, [simTotalRevenue, simTotalCost, simNetProfit, t, i18n.language]);

  const barChartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: '#0f172a',
          titleFont: { size: 13, weight: 'bold' },
          bodyFont: { size: 13 },
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: (context) => {
              const val = context.raw || 0;
              return ` ${context.label}: ₹${val.toLocaleString('en-IN')}`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (val) => `₹${val.toLocaleString('en-IN')}`,
            font: { size: 11 },
          },
          grid: {
            color: '#f1f5f9',
          },
        },
        x: {
          ticks: {
            font: { size: 12, weight: 'bold' },
            color: '#334155',
          },
          grid: {
            display: false,
          },
        },
      },
    };
  }, []);

  // 9 Cultivation Expense Categories
  const expenseCategories = [
    {
      title: t('exp_cat_seeds', '1. Seeds'),
      icon: 'fas fa-seedling',
      desc: t('exp_cat_seeds_desc', 'Certified high-yielding seeds, hybrid varieties, and seed treatment chemicals.'),
    },
    {
      title: t('exp_cat_fertilizers', '2. Fertilizers'),
      icon: 'fas fa-flask',
      desc: t('exp_cat_fertilizers_desc', 'Chemical fertilizers (Urea, DAP, MOP), micronutrient sprays, and organic manure.'),
    },
    {
      title: t('exp_cat_pesticides', '3. Pesticides'),
      icon: 'fas fa-shield-virus',
      desc: t('exp_cat_pesticides_desc', 'Herbicides, insecticides, fungicides, and biological pest control agents.'),
    },
    {
      title: t('exp_cat_labour', '4. Labour'),
      icon: 'fas fa-users',
      desc: t('exp_cat_labour_desc', 'Wages for manual land clearing, sowing, transplanting, weeding, and harvesting.'),
    },
    {
      title: t('exp_cat_irrigation', '5. Irrigation'),
      icon: 'fas fa-tint',
      desc: t('exp_cat_irrigation_desc', 'Borewell electricity, pump diesel fuel, canal cess, and drip maintenance.'),
    },
    {
      title: t('exp_cat_machinery', '6. Machinery'),
      icon: 'fas fa-tractor',
      desc: t('exp_cat_machinery_desc', 'Tractor hiring fees for ploughing, rotavator, harrowing, and threshing.'),
    },
    {
      title: t('exp_cat_transportation', '7. Transportation'),
      icon: 'fas fa-truck-moving',
      desc: t('exp_cat_transportation_desc', 'Freight to transport produce from field gate to the APMC mandi market.'),
    },
    {
      title: t('exp_cat_land_prep', '8. Land Preparation'),
      icon: 'fas fa-mountain',
      desc: t('exp_cat_land_prep_desc', 'Field bunding, leveling, deep tilling, and furrow preparation before sowing.'),
    },
    {
      title: t('exp_cat_other', '9. Other Expenses'),
      icon: 'fas fa-coins',
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
    <main className="profit-page">
      {/* Header */}
      <div className="profit-header">
        <div className="container">
          <div className="back-nav-container">
            <Link to="/about" className="back-link">
              <i className="fas fa-arrow-left"></i> {t('back_to_about', 'Back to About AgriMind')}
            </Link>
          </div>

          <h1>{t('profit_page_title', 'How Crop Profit Is Calculated')}</h1>
          <p>
            {t(
              'profit_page_subtitle',
              'Understand the financial formulas, itemized cultivation expenses, and market factors AgriMind uses to estimate your farm returns.'
            )}
          </p>
        </div>
      </div>

      <div className="container">
        {/* Introduction Overview Card */}
        <section className="intro-overview-card" style={{ borderTopColor: '#d28c50' }}>
          <h2>
            <i className="fas fa-chart-line" style={{ color: '#d28c50' }}></i>
            {t('profit_intro_title', 'Transparent Farm Economics')}
          </h2>
          <p>
            {t(
              'profit_intro_p1',
              'A successful crop recommendation is not just biologically viable—it must be financially profitable. AgriMind bridges agronomic science with real-world farm economics by forecasting expected yield, evaluating APMC mandi price trends, and itemizing the complete cost of cultivation.'
            )}
          </p>
          <p>
            {t(
              'profit_intro_p2',
              'Before purchasing seeds or preparing the land, farmers can evaluate projected revenue, input costs, and net return per acre to make informed, confident financial commitments.'
            )}
          </p>

          <div className="highlights-pill-row">
            <div className="highlight-pill">
              <i className="fas fa-check-circle" style={{ color: '#d28c50' }}></i>
              APMC Mandi Price Benchmarking
            </div>
            <div className="highlight-pill">
              <i className="fas fa-check-circle" style={{ color: '#d28c50' }}></i>
              Comprehensive 9-Cost Tracking
            </div>
            <div className="highlight-pill">
              <i className="fas fa-check-circle" style={{ color: '#d28c50' }}></i>
              Net Profit & ROI Analysis
            </div>
          </div>
        </section>

        {/* SECTION 1: VISUAL PROFIT CALCULATION FLOW */}
        <section className="profit-flow-section">
          <div className="section-header-box">
            <span className="section-pill-tag" style={{ background: '#fff7ed', color: '#ea580c' }}>
              <i className="fas fa-project-diagram"></i> Step-by-Step Economic Flow
            </span>
            <h2>{t('profit_flow_title', 'Visual Profit Calculation Flow')}</h2>
            <p>{t('profit_flow_sub', 'How agricultural inputs, yield, and market rates connect step-by-step into final net farm income.')}</p>
          </div>

          <div className="flow-diagram-container">
            {/* Step 1: Crop Yield */}
            <div className="flow-step-card">
              <div className="flow-step-icon yield-icon">
                <i className="fas fa-seedling"></i>
              </div>
              <span className="flow-step-tag">Step 1</span>
              <h4>{t('flow_step1_title', '1. Crop Yield')}</h4>
              <p>{t('flow_step1_desc', 'Harvest volume produced per acre (quintals or tonnes).')}</p>
            </div>

            <div className="flow-arrow-connector">
              <i className="fas fa-times"></i>
            </div>

            {/* Step 2: Selling Price */}
            <div className="flow-step-card">
              <div className="flow-step-icon price-icon">
                <i className="fas fa-tag"></i>
              </div>
              <span className="flow-step-tag">Step 2</span>
              <h4>{t('flow_step2_title', '2. Selling Price')}</h4>
              <p>{t('flow_step2_desc', 'Current APMC mandi market price per quintal received at harvest.')}</p>
            </div>

            <div className="flow-arrow-connector">
              <i className="fas fa-equals"></i>
            </div>

            {/* Step 3: Gross Revenue */}
            <div className="flow-step-card highlight-revenue">
              <div className="flow-step-icon revenue-icon">
                <i className="fas fa-coins"></i>
              </div>
              <span className="flow-step-tag">Step 3</span>
              <h4>{t('flow_step3_title', '3. Gross Revenue')}</h4>
              <p>{t('flow_step3_desc', 'Total value from sales: Crop Yield × Selling Price.')}</p>
            </div>

            <div className="flow-arrow-connector">
              <i className="fas fa-minus"></i>
            </div>

            {/* Step 4: Cultivation Expenses */}
            <div className="flow-step-card highlight-expense">
              <div className="flow-step-icon cost-icon">
                <i className="fas fa-receipt"></i>
              </div>
              <span className="flow-step-tag">Step 4</span>
              <h4>{t('flow_step4_title', '4. Cultivation Expenses')}</h4>
              <p>{t('flow_step4_desc', 'Sum of all 9 agricultural operational and input costs.')}</p>
            </div>

            <div className="flow-arrow-connector">
              <i className="fas fa-equals"></i>
            </div>

            {/* Step 5: Net Profit */}
            <div className="flow-step-card highlight-profit">
              <div className="flow-step-icon profit-icon">
                <i className="fas fa-hand-holding-usd"></i>
              </div>
              <span className="flow-step-tag">Step 5</span>
              <h4>{t('flow_step5_title', '5. Net Profit')}</h4>
              <p>{t('flow_step5_desc', 'Actual take-home profit: Gross Revenue − Cultivation Expenses.')}</p>
            </div>
          </div>
        </section>

        {/* SECTION 2: THE 4 CORE FINANCIAL FORMULAS */}
        <section className="formulas-section">
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>
            <i className="fas fa-calculator" style={{ color: '#2E8B57', marginRight: '10px' }}></i>
            {t('core_formulas_title', 'The 4 Core Financial Formulas')}
          </h2>
          <p style={{ color: '#64748b', marginBottom: '24px', fontSize: '1rem' }}>
            {t('core_formulas_lead', 'Standard agronomic accounting principles used to project farm business earnings.')}
          </p>

          <div className="formulas-grid">
            <div className="formula-card card-revenue">
              <div className="formula-header">
                <i className="fas fa-coins"></i>
                <h3>{t('formula_revenue_title', 'Total Gross Revenue')}</h3>
              </div>
              <div className="formula-expression">{t('formula_revenue_math', 'Revenue (₹) = Crop Yield (q) × Selling Price (₹/q)')}</div>
              <p className="formula-explanation">{t('formula_revenue_desc', 'The gross monetary value realized from selling the total harvested produce at mandi market rates.')}</p>
            </div>

            <div className="formula-card">
              <div className="formula-header">
                <i className="fas fa-receipt"></i>
                <h3>{t('formula_cost_title', 'Total Cultivation Cost')}</h3>
              </div>
              <div className="formula-expression">{t('formula_cost_math', 'Total Cost (₹) = Sum of All 9 Cultivation Expenses')}</div>
              <p className="formula-explanation">{t('formula_cost_desc', 'The comprehensive expenditure required to cultivate the crop from land tilling to mandi gate delivery.')}</p>
            </div>

            <div className="formula-card card-net-profit">
              <div className="formula-header">
                <i className="fas fa-hand-holding-usd"></i>
                <h3>{t('formula_net_profit_title', 'Estimated Net Profit')}</h3>
              </div>
              <div className="formula-expression">{t('formula_net_profit_math', 'Net Profit (₹) = Total Revenue − Total Cultivation Cost')}</div>
              <p className="formula-explanation">{t('formula_net_profit_desc', 'The actual take-home earnings remaining with the farmer after recovering all working capital investments.')}</p>
            </div>

            <div className="formula-card">
              <div className="formula-header">
                <i className="fas fa-percentage"></i>
                <h3>{t('formula_per_acre_title', 'Profit per Acre & ROI')}</h3>
              </div>
              <div className="formula-expression">{t('formula_per_acre_math', 'Profit/Acre = Net Profit ÷ Area | ROI = (Net Profit ÷ Cost) × 100')}</div>
              <p className="formula-explanation">{t('formula_per_acre_desc', 'Standardizes returns on a per-acre basis, allowing easy comparison between different crop alternatives.')}</p>
            </div>
          </div>
        </section>

        {/* SECTION 3: INTERACTIVE PROFIT GRAPH & SIMULATOR */}
        <section className="profit-graph-section">
          <div className="section-header-box">
            <span className="section-pill-tag" style={{ background: '#e0f2fe', color: '#0284c7' }}>
              <i className="fas fa-chart-bar"></i> Dynamic Comparison
            </span>
            <h2>{t('profit_chart_title', 'Financial Comparison: Revenue, Costs & Net Profit')}</h2>
            <p>{t('profit_chart_sub', 'Interactive visual comparison updated dynamically by the calculator below.')}</p>
          </div>

          <div className="graph-calculator-wrapper">
            {/* The Bar Chart */}
            <div className="chart-container-card">
              <div className="chart-canvas-box">
                <Bar data={barChartData} options={barChartOptions} />
              </div>

              <div className="chart-legend-strip">
                <div className="legend-chip">
                  <span className="chip-dot" style={{ backgroundColor: '#0284c7' }}></span>
                  <span>{t('chart_lbl_revenue', 'Revenue')}: <strong>₹{simTotalRevenue.toLocaleString('en-IN')}</strong></span>
                </div>
                <div className="legend-chip">
                  <span className="chip-dot" style={{ backgroundColor: '#ea580c' }}></span>
                  <span>{t('chart_lbl_costs', 'Costs')}: <strong>₹{simTotalCost.toLocaleString('en-IN')}</strong></span>
                </div>
                <div className="legend-chip">
                  <span className="chip-dot" style={{ backgroundColor: simNetProfit >= 0 ? '#2E8B57' : '#dc2626' }}></span>
                  <span>{t('chart_lbl_profit', 'Profit')}: <strong>₹{simNetProfit.toLocaleString('en-IN')}</strong></span>
                </div>
              </div>
            </div>

            {/* Interactive Scenario Calculator */}
            <div className="simulator-box">
              <h3>
                <i className="fas fa-sliders-h" style={{ color: '#d28c50' }}></i>
                {t('sim_title', 'Interactive Farm Profit Calculator')}
              </h3>
              <p className="sub">{t('sim_sub', 'Adjust the acreage, expected yield, mandi price, and input costs to test custom scenarios.')}</p>

              <div className="sim-inputs-grid">
                <div className="sim-input-group">
                  <label>{t('sim_lbl_area', 'Farm Area (Acres)')}</label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={simArea}
                    onChange={(e) => setSimArea(Number(e.target.value) || 0)}
                  />
                </div>

                <div className="sim-input-group">
                  <label>{t('sim_lbl_yield', 'Yield (Quintals/Acre)')}</label>
                  <input
                    type="number"
                    min="1"
                    value={simYield}
                    onChange={(e) => setSimYield(Number(e.target.value) || 0)}
                  />
                </div>

                <div className="sim-input-group">
                  <label>{t('sim_lbl_price', 'Mandi Price (₹/Quintal)')}</label>
                  <input
                    type="number"
                    min="100"
                    step="50"
                    value={simPrice}
                    onChange={(e) => setSimPrice(Number(e.target.value) || 0)}
                  />
                </div>

                <div className="sim-input-group">
                  <label>{t('sim_lbl_cost', 'Expense (₹/Acre)')}</label>
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    value={simCostPerAcre}
                    onChange={(e) => setSimCostPerAcre(Number(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="sim-results-strip">
                <div className="sim-res-item">
                  <div className="sim-res-label">{t('sim_res_rev', 'Projected Revenue')}</div>
                  <div className="sim-res-value" style={{ color: '#0284c7' }}>
                    ₹{simTotalRevenue.toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="sim-res-item">
                  <div className="sim-res-label">{t('sim_res_cost', 'Projected Cost')}</div>
                  <div className="sim-res-value" style={{ color: '#ea580c' }}>
                    ₹{simTotalCost.toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="sim-res-item highlight">
                  <div className="sim-res-label">{t('sim_res_profit', 'Projected Net Profit')}</div>
                  <div className="sim-res-value" style={{ color: simNetProfit >= 0 ? '#2E8B57' : '#dc2626' }}>
                    ₹{simNetProfit.toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="sim-res-item">
                  <div className="sim-res-label">{t('sim_res_roi', 'Expected ROI')}</div>
                  <div className="sim-res-value">{simRoi}%</div>
                </div>
              </div>

              <div style={{ marginTop: '16px' }}>
                <div className="bar-track">
                  <div className="bar-segment-expense" style={{ width: `${expensePercent}%` }}>
                    {expensePercent}% {t('bar_expenses_label', 'Cost')}
                  </div>
                  <div
                    className="bar-segment-profit"
                    style={{
                      width: `${profitPercent}%`,
                      backgroundColor: simNetProfit >= 0 ? '#2E8B57' : '#dc2626',
                    }}
                  >
                    {profitPercent}% {t('bar_profit_label', 'Profit')}
                  </div>
                </div>
              </div>

              <div className="calc-disclaimer-note" style={{ marginTop: '14px', color: '#64748b' }}>
                <i className="fas fa-info-circle"></i>{' '}
                {t(
                  'calc_illustrative_note',
                  'Educational Illustration: The sample values above illustrate the calculation workflow and do not guarantee specific crop yields or market prices.'
                )}
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: THE 9 CULTIVATION EXPENSE CATEGORIES */}
        <section className="expenses-section">
          <h2>
            <i className="fas fa-list-ol" style={{ color: '#d28c50', marginRight: '10px' }}></i>
            {t('expenses_breakdown_title', 'The 9 Cultivation Expense Categories')}
          </h2>
          <p className="expenses-lead">
            {t(
              'expenses_breakdown_lead',
              'AgriMind accounts for all direct operational and input expenses so that farmers are not surprised by hidden costs.'
            )}
          </p>

          <div className="expenses-grid">
            {expenseCategories.map((exp, idx) => (
              <div key={idx} className="expense-card">
                <div className="expense-icon-box">
                  <i className={exp.icon}></i>
                </div>
                <div className="expense-info">
                  <h4>{exp.title}</h4>
                  <p>{exp.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 5: STEP-BY-STEP ILLUSTRATIVE EXAMPLE */}
        <section className="example-section">
          <span className="example-badge">{t('badge_illustrative', 'Step-by-Step Illustrative Scenario')}</span>
          <h2>
            <i className="fas fa-file-invoice-dollar" style={{ color: '#2E8B57', marginRight: '10px' }}></i>
            {t('example_wheat_title', 'Illustrative Calculation: 1 Acre Wheat Cultivation')}
          </h2>
          <p className="example-lead">
            {t(
              'example_wheat_lead',
              'Below is a realistic sample calculation demonstrating how AgriMind applies the formulas for an illustrative 1-acre wheat crop.'
            )}
          </p>

          <div className="example-scenario-box">
            <div className="scenario-params-row">
              <div className="param-item">
                <div className="param-label">{t('param_crop_type', 'Target Crop')}</div>
                <div className="param-val">Wheat (PBW 550)</div>
              </div>
              <div className="param-item">
                <div className="param-label">{t('param_farm_size', 'Farm Size')}</div>
                <div className="param-val">1.0 Acre</div>
              </div>
              <div className="param-item">
                <div className="param-label">{t('param_est_yield', 'Estimated Yield')}</div>
                <div className="param-val">20 Quintals / Acre</div>
              </div>
              <div className="param-item">
                <div className="param-label">{t('param_mandi_rate', 'Expected APMC Rate')}</div>
                <div className="param-val">₹2,500 / Quintal</div>
              </div>
            </div>

            <div className="calculation-steps-list">
              <div className="calc-step-row">
                <span className="calc-step-label">
                  <strong>Step 1: Gross Revenue Calculation</strong> (20 Quintals × ₹2,500/q)
                </span>
                <span className="calc-step-math" style={{ color: '#0284c7' }}>
                  ₹50,000
                </span>
              </div>

              <div className="calc-step-row">
                <span className="calc-step-label">
                  <strong>Step 2: Itemized Cultivation Expenses (9 categories):</strong>
                  <br />
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    Seeds (₹2,500) + Fertilizers (₹5,500) + Protection (₹2,000) + Irrigation (₹3,000) + Labour (₹9,000) +
                    Machinery (₹4,500) + Transport (₹2,000) + Land Prep (₹1,000) + Misc (₹500)
                  </span>
                </span>
                <span className="calc-step-math" style={{ color: '#ea580c' }}>
                  ₹30,000
                </span>
              </div>

              <div className="calc-step-row total-step">
                <span className="calc-step-label">
                  <strong>Step 3: Estimated Net Profit (Revenue - Total Expenses)</strong>
                  <br />
                  <span style={{ fontSize: '0.85rem', color: '#2E8B57' }}>
                    ₹50,000 - ₹30,000 = Return on Investment (ROI): 66.7%
                  </span>
                </span>
                <span className="calc-step-math">₹20,000 / Acre</span>
              </div>
            </div>
          </div>

          <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1e293b', marginBottom: '16px' }}>
            {t('visual_breakdown_title', 'Visual Profit Distribution')}
          </h3>

          <div className="breakdown-summary-grid">
            <div className="metric-card revenue">
              <div className="metric-title">{t('metric_gross_rev', 'Gross Revenue')}</div>
              <div className="metric-value">₹50,000</div>
              <div className="metric-sub">{t('metric_rev_basis', '20 q @ ₹2,500/q')}</div>
            </div>

            <div className="metric-card expenses">
              <div className="metric-title">{t('metric_total_cost', 'Cultivation Cost')}</div>
              <div className="metric-value">₹30,000</div>
              <div className="metric-sub">{t('metric_cost_share', '60% of total revenue')}</div>
            </div>

            <div className="metric-card profit">
              <div className="metric-title">{t('metric_net_profit', 'Net Profit')}</div>
              <div className="metric-value">₹20,000</div>
              <div className="metric-sub">{t('metric_profit_share', '40% net margin (66.7% ROI)')}</div>
            </div>
          </div>
        </section>

        {/* SECTION 6: FACTORS INFLUENCING REAL FARM PROFIT */}
        <section className="risk-factors-section">
          <h2>
            <i className="fas fa-balance-scale" style={{ color: '#f59e0b', marginRight: '10px' }}></i>
            {t('risk_section_title', 'Factors Influencing Real Farm Profit')}
          </h2>
          <p className="risk-factors-lead">
            {t(
              'risk_section_lead',
              'While AgriMind provides data-backed projections, on-ground farm income is subject to real-world agricultural dynamics. Keeping these factors in mind helps farmers maximize profitability.'
            )}
          </p>

          <div className="risk-grid">
            {riskFactors.map((factor, idx) => (
              <div key={idx} className="risk-card">
                <h4>
                  <i className="fas fa-exclamation-circle"></i>
                  {factor.title}
                </h4>
                <p>{factor.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
};

export default CropProfitCalculation;
