import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import useTranslation from '../i18n';
import farmService from '../services/farmService';
import AgriHeader from '../components/common/AgriHeader';
import AgriCard from '../components/common/AgriCard';
import AgriButton from '../components/common/AgriButton';
import AgriInput from '../components/common/AgriInput';
import ErrorMessage from '../components/common/ErrorMessage';
import ChatAssistantWidget from '../components/ChatAssistantWidget';
import colors from '../theme/colors';
import statesCitiesData from '../../assets/data/indian-states-cities.json';

export const DashboardScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { t } = useTranslation();

  const [mode, setMode] = useState('crop');
  const [farmIdInput, setFarmIdInput] = useState('');
  const [isFetchingFarm, setIsFetchingFarm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    farmId: '',
    soilPh: '',
    humidity: '',
    nitrogen: '',
    phosphorus: '',
    potassium: '',
    temperature: '',
    rainfall: '',
    area: '',
    city: '',
    state: '',
    season: '',
    pastCrop: '',
    fertilizerCrop: '',
  });

  const [availableCities, setAvailableCities] = useState([]);
  const [recentRecommendations, setRecentRecommendations] = useState([]);

  const [stateModalVisible, setStateModalVisible] = useState(false);
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [seasonModalVisible, setSeasonModalVisible] = useState(false);

  const seasonsList = [
    {
      value: 'Kharif',
      label: t('kharif', 'Kharif (Monsoon Season)'),
    },
    {
      value: 'Rabi',
      label: t('rabi', 'Rabi (Winter Season)'),
    },
    {
      value: 'Zaid',
      label: t('zaid', 'Zaid (Short Summer Season)'),
    },
  ];

  const fetchRecent = async () => {
    if (
      !user?._id ||
      user._id === 'temp_user_id' ||
      !/^[0-9a-fA-F]{24}$/.test(user._id)
    ) {
      return;
    }

    try {
      const data = await farmService.getRecentRecommendations(user._id);
      setRecentRecommendations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Recent recommendations fetch error:', err);
    }
  };

  useEffect(() => {
    fetchRecent();
  }, [user?._id]);

  const handleSelectState = (selectedState) => {
    const stateObj = statesCitiesData.find(
      (loc) => loc.state === selectedState
    );

    setFormData((prev) => ({
      ...prev,
      state: selectedState,
      city: '',
      temperature: '',
      humidity: '',
      rainfall: '',
    }));

    setAvailableCities(stateObj ? stateObj.cities : []);
    setStateModalVisible(false);
  };

  const { state, city, season } = formData;

  useEffect(() => {
    const fetchWeather = async () => {
      if (!state || !city || !season) return;

      try {
        const [tempRes, humRes, rainRes] = await Promise.all([
          farmService.getSeasonalTemperature(state, city, season),
          farmService.getSeasonalHumidity(state, city, season),
          farmService.getHistoricalRainfall(state, city, season),
        ]);

        setFormData((prev) => ({
          ...prev,
          temperature:
            tempRes?.success && tempRes.temperature !== undefined
              ? String(tempRes.temperature)
              : prev.temperature,
          humidity:
            humRes?.success && humRes.humidity !== undefined
              ? String(humRes.humidity)
              : prev.humidity,
          rainfall:
            rainRes?.success && rainRes.rainfall !== undefined
              ? String(rainRes.rainfall)
              : prev.rainfall,
        }));
      } catch (err) {
        console.warn('Weather auto-fetch error:', err);
      }
    };

    fetchWeather();
  }, [state, city, season]);

  // Generate a simulated pH value from 6.0 to 8.0 in 0.1 increments.
  const generateRandomPH = () =>
    Number((Math.random() * 2 + 6).toFixed(1));

  const handleFetchFarm = async () => {
    console.log('Fetch button pressed');

    setIsFetchingFarm(true);

    // Update pH every time Fetch is pressed, even if sensor data is unavailable.
    const randomPH = generateRandomPH();
    setFormData((prev) => ({
      ...prev,
      soilPh: String(randomPH),
    }));

    try {
      try {
        const sensor = await farmService.getSensorData();

        console.log('Sensor response:', sensor);

        if (
          sensor?.success &&
          sensor?.available &&
          sensor?.data
        ) {
          const {
            nitrogen,
            phosphorus,
            potassium,
          } = sensor.data;

          setFormData((prev) => ({
            ...prev,
            soilPh: String(randomPH),
            nitrogen:
              nitrogen !== undefined && nitrogen !== null
                ? String(nitrogen)
                : prev.nitrogen,
            phosphorus:
              phosphorus !== undefined && phosphorus !== null
                ? String(phosphorus)
                : prev.phosphorus,
            potassium:
              potassium !== undefined && potassium !== null
                ? String(potassium)
                : prev.potassium,
          }));

          Alert.alert(
            'Sensor Data Loaded',
            'Live sensor values for N, P and K have been filled.'
          );

          return;
        }

        console.log('No live sensor data available');
      } catch (sensorError) {
        console.log(
          'Sensor request failed:',
          sensorError?.message
        );
      }

      const cleanId = farmIdInput.trim().toUpperCase();

      if (!cleanId) {
        Alert.alert(
          'Sensor Unavailable',
          'No live sensor data is available. Please enter a Farm ID to use stored farm data.'
        );
        return;
      }

      const data = await farmService.getFarmById(cleanId);

      if (data) {
        setFormData((prev) => ({
          ...prev,
          farmId: cleanId,
          soilPh: String(randomPH),
          nitrogen:
            data.nitrogen !== undefined
              ? String(data.nitrogen)
              : prev.nitrogen,
          phosphorus:
            data.phosphorus !== undefined
              ? String(data.phosphorus)
              : prev.phosphorus,
          potassium:
            data.potassium !== undefined
              ? String(data.potassium)
              : prev.potassium,
        }));

        Alert.alert(
          'Sensor Unavailable',
          `Live sensor data is unavailable. Farm ID ${cleanId} data has been loaded instead.`
        );
      }
    } catch (err) {
      console.log('Farm fetch error:', err);

      if (err.response?.status === 404) {
        Alert.alert(
          'Not Found',
          'Farm ID not found. Please check and try again.'
        );
      } else {
        Alert.alert(
          'Error',
          'Unable to fetch farm details.'
        );
      }
    } finally {
      setIsFetchingFarm(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert(
        t('error', 'Error'),
        t(
          'validation_login_required',
          'Please login to submit recommendations.'
        )
      );

      navigation.navigate('Login');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      if (mode === 'fertilizer') {
        if (!formData.fertilizerCrop.trim()) {
          setError(
            t(
              'validation_crop_name',
              'Please enter the crop name.'
            )
          );

          setIsSubmitting(false);
          return;
        }

        const payload = {
          crop: formData.fertilizerCrop.trim(),
          nitrogen: Number(formData.nitrogen) || 0,
          phosphorus: Number(formData.phosphorus) || 0,
          potassium: Number(formData.potassium) || 0,
        };

        const result =
          await farmService.getFertilizerRecommendation(payload);

        if (result && result.success) {
          navigation.navigate('FertilizerResult', { result });
        } else {
          setError(
            result?.message ||
              'Failed to get fertilizer recommendation.'
          );
        }
      } else {
        if (
          !formData.soilPh ||
          !formData.nitrogen ||
          !formData.phosphorus ||
          !formData.potassium ||
          !formData.area ||
          !formData.state ||
          !formData.city ||
          !formData.season
        ) {
          setError(
            t(
              'validation_required_fields',
              'Please fill in all required fields marked with *.'
            )
          );

          setIsSubmitting(false);
          return;
        }

        if (
          !user?._id ||
          user._id === 'temp_user_id'
        ) {
          setError(
            'Please log in to submit a crop recommendation request.'
          );

          setIsSubmitting(false);
          return;
        }

        const payload = {
          userId: user._id,
          soilPh: Number(formData.soilPh),
          humidity: Number(formData.humidity) || 50,
          nitrogen: Number(formData.nitrogen),
          phosphorus: Number(formData.phosphorus),
          potassium: Number(formData.potassium),
          temperature: Number(formData.temperature) || 25,
          area: Number(formData.area),
          rainfall: Number(formData.rainfall) || 200,
          season: formData.season,
          state: formData.state,
          city: formData.city,
          pastCrop: formData.pastCrop || '',
        };

        const result =
          await farmService.getRecommendation(payload);

        if (result && result.recommendedCrop) {
          fetchRecent();
          navigation.navigate('Recommendation', { result });
        } else {
          setError(
            'Failed to get a recommendation. Please check your inputs.'
          );
        }
      }
    } catch (err) {
      console.error('Submission error:', err);

      setError(
        err.response?.data?.message ||
          err.message ||
          'An error occurred. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <AgriHeader
        title={t('nav_dashboard', 'Dashboard')}
        subtitle={t(
          'dashboard_crop_mode_desc',
          'AI Crop & Fertilizer Advisory'
        )}
        showLanguage={true}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.recommendationHeader}>
          <View style={styles.headerIcon}>
            <Ionicons
              name="sparkles"
              size={18}
              color={colors.primary}
            />
          </View>

          <View style={styles.headerTextContainer}>
            <Text style={styles.recommendationTitle}>
              {t(
                'recommendation_type',
                'Choose Recommendation'
              )}
            </Text>

            <Text style={styles.recommendationSubtitle}>
              {t(
                'recommendation_type_desc',
                'Select the AI service you want to use'
              )}
            </Text>
          </View>
        </View>

        <View style={styles.modeContainer}>
          <TouchableOpacity
            style={[
              styles.modeButton,
              mode === 'crop' && styles.modeButtonActive,
            ]}
            onPress={() => setMode('crop')}
            activeOpacity={0.85}
          >
            <View
              style={[
                styles.modeIconBox,
                mode === 'crop' &&
                  styles.modeIconBoxActive,
              ]}
            >
              <Text style={styles.modeIcon}>🌾</Text>
            </View>

            <View style={styles.modeTextCol}>
              <Text
                style={[
                  styles.modeTitle,
                  mode === 'crop' &&
                    styles.modeTitleActive,
                ]}
                numberOfLines={2}
              >
                {t(
                  'dashboard_crop_mode',
                  'Crop Recommendation'
                )}
              </Text>

              <Text
                style={[
                  styles.modeSubtitle,
                  mode === 'crop' &&
                    styles.modeSubtitleActive,
                ]}
                numberOfLines={2}
              >
                {t(
                  'dashboard_crop_mode_desc',
                  'Find the best crop for your farm'
                )}
              </Text>
            </View>

            {mode === 'crop' && (
              <View style={styles.selectedCheck}>
                <Ionicons
                  name="checkmark"
                  size={13}
                  color="#FFFFFF"
                />
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeButton,
              mode === 'fertilizer' &&
                styles.modeButtonActive,
            ]}
            onPress={() => setMode('fertilizer')}
            activeOpacity={0.85}
          >
            <View
              style={[
                styles.modeIconBox,
                mode === 'fertilizer' &&
                  styles.modeIconBoxActive,
              ]}
            >
              <Text style={styles.modeIcon}>🧪</Text>
            </View>

            <View style={styles.modeTextCol}>
              <Text
                style={[
                  styles.modeTitle,
                  mode === 'fertilizer' &&
                    styles.modeTitleActive,
                ]}
                numberOfLines={2}
              >
                {t(
                  'dashboard_fertilizer_mode',
                  'Fertilizer Recommendation'
                )}
              </Text>

              <Text
                style={[
                  styles.modeSubtitle,
                  mode === 'fertilizer' &&
                    styles.modeSubtitleActive,
                ]}
                numberOfLines={2}
              >
                {t(
                  'dashboard_fertilizer_mode_desc',
                  'Find the right fertilizer for your crop'
                )}
              </Text>
            </View>

            {mode === 'fertilizer' && (
              <View style={styles.selectedCheck}>
                <Ionicons
                  name="checkmark"
                  size={13}
                  color="#FFFFFF"
                />
              </View>
            )}
          </TouchableOpacity>
        </View>

        <AgriCard style={styles.formCard}>
          <View style={styles.formHeader}>
            <View
              style={[
                styles.formHeaderIcon,
                mode === 'fertilizer' &&
                  styles.formHeaderIconFertilizer,
              ]}
            >
              <FontAwesome5
                name={
                  mode === 'crop'
                    ? 'seedling'
                    : 'flask'
                }
                size={19}
                color={colors.primary}
              />
            </View>

            <View style={styles.formHeaderText}>
              <Text style={styles.sectionHeading}>
                {mode === 'crop'
                  ? t(
                      'dashboard_crop_title',
                      'Get a New Crop Recommendation'
                    )
                  : t(
                      'dashboard_fertilizer_title',
                      'Get a New Fertilizer Recommendation'
                    )}
              </Text>

              <Text style={styles.sectionSubheading}>
                {mode === 'crop'
                  ? t(
                      'dashboard_crop_desc',
                      'Fill in the details below to get an AI-powered crop suggestion.'
                    )
                  : t(
                      'dashboard_fertilizer_desc',
                      'Enter your crop and soil nutrient values to get a customized fertilizer plan.'
                    )}
              </Text>
            </View>
          </View>

          <ErrorMessage message={error} />

          <View style={styles.farmFetchBlock}>
            <View style={styles.fetchHeader}>
              <View style={styles.fetchIcon}>
                <Ionicons
                  name="hardware-chip-outline"
                  size={17}
                  color={colors.primary}
                />
              </View>

              <View style={styles.fetchHeaderText}>
                <Text style={styles.fetchLabel}>
                  {t(
                    'farm_id_fetch',
                    'Have a Farm Land ID? Fetch Details'
                  )}
                </Text>

                <Text style={styles.fetchHint}>
                  Live sensor data will be used first
                </Text>
              </View>
            </View>

            <View style={styles.fetchRow}>
              <AgriInput
                placeholder={t(
                  'farm_id_placeholder',
                  'e.g., FARM101'
                )}
                value={farmIdInput}
                onChangeText={setFarmIdInput}
                autoCapitalize="characters"
                style={styles.farmInput}
              />

              <AgriButton
                title={t('fetch', 'Fetch')}
                variant="secondary"
                onPress={handleFetchFarm}
                loading={isFetchingFarm}
                style={styles.fetchBtn}
              />
            </View>
          </View>

          {mode === 'fertilizer' && (
            <AgriInput
              label={`${t(
                'fertilizer_crop',
                'Crop'
              )} `}
              placeholder={t(
                'fertilizer_crop_placeholder',
                'e.g., Tomato'
              )}
              value={formData.fertilizerCrop}
              onChangeText={(text) =>
                setFormData({
                  ...formData,
                  fertilizerCrop: text,
                })
              }
              icon={
                <FontAwesome5
                  name="seedling"
                  size={16}
                  color={colors.textMuted}
                />
              }
            />
          )}

          <View style={styles.formRow}>
            <AgriInput
              label={`${t(
                'nitrogen',
                'Nitrogen'
              )} `}
              placeholder="e.g. 90"
              value={formData.nitrogen}
              onChangeText={(text) =>
                setFormData({
                  ...formData,
                  nitrogen: text,
                })
              }
              keyboardType="numeric"
              style={{
                flex: 1,
                marginRight: 8,
              }}
            />

            <AgriInput
              label={`${t(
                'phosphorus',
                'Phosphorus'
              )} `}
              placeholder="e.g. 42"
              value={formData.phosphorus}
              onChangeText={(text) =>
                setFormData({
                  ...formData,
                  phosphorus: text,
                })
              }
              keyboardType="numeric"
              style={{
                flex: 1,
              }}
            />
          </View>

          <View style={styles.formRow}>
            <AgriInput
              label={`${t(
                'potassium',
                'Potassium '
              )} `}
              placeholder="e.g. 43"
              value={formData.potassium}
              onChangeText={(text) =>
                setFormData({
                  ...formData,
                  potassium: text,
                })
              }
              keyboardType="numeric"
              style={{
                flex: 1,
                marginRight: 8,
              }}
            />

            {mode === 'crop' && (
              <AgriInput
                label={`${t(
                  'soil_ph',
                  'Soil pH (0-14)'
                )} `}
                placeholder="e.g. 6.5"
                value={formData.soilPh}
                onChangeText={(text) =>
                  setFormData({
                    ...formData,
                    soilPh: text,
                  })
                }
                keyboardType="numeric"
                style={{
                  flex: 1,
                }}
              />
            )}
          </View>

          {mode === 'crop' && (
            <>
              <View style={styles.formRow}>
                <View
                  style={{
                    flex: 1,
                    marginRight: 8,
                    marginBottom: 16,
                  }}
                >
                  <Text style={styles.selectorLabel}>
                    {t('state', 'State')} 
                  </Text>

                  <TouchableOpacity
                    style={styles.pickerBox}
                    onPress={() =>
                      setStateModalVisible(true)
                    }
                    activeOpacity={0.8}
                  >
                    <View style={styles.pickerLeft}>
                      <Ionicons
                        name="location-outline"
                        size={17}
                        color={
                          formData.state
                            ? colors.primary
                            : colors.textMuted
                        }
                        style={{
                          marginRight: 7,
                        }}
                      />

                      <Text
                        style={
                          formData.state
                            ? styles.pickerSelectedText
                            : styles.pickerPlaceholderText
                        }
                        numberOfLines={1}
                      >
                        {formData.state ||
                          t(
                            'select_state',
                            'Select State'
                          )}
                      </Text>
                    </View>

                    <Ionicons
                      name="chevron-down"
                      size={16}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>

                <View
                  style={{
                    flex: 1,
                    marginBottom: 16,
                  }}
                >
                  <Text style={styles.selectorLabel}>
                    {t('city', 'City')} 
                  </Text>

                  <TouchableOpacity
                    style={[
                      styles.pickerBox,
                      !formData.state &&
                        styles.pickerDisabled,
                    ]}
                    onPress={() =>
                      formData.state &&
                      setCityModalVisible(true)
                    }
                    disabled={!formData.state}
                    activeOpacity={0.8}
                  >
                    <View style={styles.pickerLeft}>
                      <Ionicons
                        name="business-outline"
                        size={16}
                        color={
                          formData.city
                            ? colors.primary
                            : colors.textMuted
                        }
                        style={{
                          marginRight: 7,
                        }}
                      />

                      <Text
                        style={
                          formData.city
                            ? styles.pickerSelectedText
                            : styles.pickerPlaceholderText
                        }
                        numberOfLines={1}
                      >
                        {formData.city ||
                          t(
                            'select_city',
                            'Select City'
                          )}
                      </Text>
                    </View>

                    <Ionicons
                      name="chevron-down"
                      size={16}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formRow}>
                <View
                  style={{
                    flex: 1,
                    marginRight: 8,
                    marginBottom: 16,
                  }}
                >
                  <Text style={styles.selectorLabel}>
                    {t('season', 'Season')} 
                  </Text>

                  <TouchableOpacity
                    style={styles.pickerBox}
                    onPress={() =>
                      setSeasonModalVisible(true)
                    }
                    activeOpacity={0.8}
                  >
                    <View style={styles.pickerLeft}>
                      <Ionicons
                        name="calendar-outline"
                        size={16}
                        color={
                          formData.season
                            ? colors.primary
                            : colors.textMuted
                        }
                        style={{
                          marginRight: 7,
                        }}
                      />

                      <Text
                        style={
                          formData.season
                            ? styles.pickerSelectedText
                            : styles.pickerPlaceholderText
                        }
                        numberOfLines={1}
                      >
                        {formData.season
                          ? seasonsList.find(
                              (s) =>
                                s.value ===
                                formData.season
                            )?.label ||
                            formData.season
                          : t(
                              'select_season',
                              'Select Season'
                            )}
                      </Text>
                    </View>

                    <Ionicons
                      name="chevron-down"
                      size={16}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>

                <AgriInput
                  label={`${t(
                    'area',
                    'Area (hectares)'
                  )} `}
                  placeholder="e.g. 2.5"
                  value={formData.area}
                  onChangeText={(text) =>
                    setFormData({
                      ...formData,
                      area: text,
                    })
                  }
                  keyboardType="numeric"
                  style={{
                    flex: 1,
                  }}
                />
              </View>

              <View style={styles.weatherInfoBanner}>
                <View style={styles.weatherIconCircle}>
                  <Ionicons
                    name="cloud-outline"
                    size={16}
                    color={colors.info}
                  />
                </View>

                <Text style={styles.weatherBannerText}>
                  Weather values auto-fill when State,
                  City, and Season are picked.
                </Text>
              </View>

              <View style={styles.formRow}>
                <AgriInput
                  label={t(
                    'temperature',
                    'Temperature (°C)'
                  )}
                  placeholder="Auto / Manual"
                  value={formData.temperature}
                  onChangeText={(text) =>
                    setFormData({
                      ...formData,
                      temperature: text,
                    })
                  }
                  keyboardType="numeric"
                  style={{
                    flex: 1,
                    marginRight: 8,
                  }}
                />

                <AgriInput
                  label={t(
                    'humidity',
                    'Humidity (%)'
                  )}
                  placeholder="Auto / Manual"
                  value={formData.humidity}
                  onChangeText={(text) =>
                    setFormData({
                      ...formData,
                      humidity: text,
                    })
                  }
                  keyboardType="numeric"
                  style={{
                    flex: 1,
                  }}
                />
              </View>

              <View style={styles.formRow}>
                <AgriInput
                  label={t(
                    'rainfall',
                    'Annual Rainfall (0-5000 mm)'
                  )}
                  placeholder="Auto / Manual"
                  value={formData.rainfall}
                  onChangeText={(text) =>
                    setFormData({
                      ...formData,
                      rainfall: text,
                    })
                  }
                  keyboardType="numeric"
                  style={{
                    flex: 1,
                    marginRight: 8,
                  }}
                />

                <AgriInput
                  label={t(
                    'past_crop',
                    'Past Crop Grown                           '
                  )}
                  placeholder={t(
                    'past_crop_placeholder',
                    'e.g., Wheat'
                  )}
                  value={formData.pastCrop}
                  onChangeText={(text) =>
                    setFormData({
                      ...formData,
                      pastCrop: text,
                    })
                  }
                  style={{
                    flex: 1,
                  }}
                />
              </View>
            </>
          )}

          <View style={styles.submitContainer}>
            <View
              style={[
                styles.submitIconCircle,
                mode === 'fertilizer' &&
                  styles.submitIconCircleFertilizer,
              ]}
            >
              <FontAwesome5
                name={
                  mode === 'crop'
                    ? 'brain'
                    : 'flask'
                }
                size={15}
                color={colors.primary}
              />
            </View>

            <View style={styles.submitTextContainer}>
              <Text style={styles.submitHint}>
                {mode === 'crop'
                  ? 'Ready to find the best crop?'
                  : 'Ready to optimize your fertilizer?'}
              </Text>
            </View>
          </View>

          <AgriButton
            title={
              isSubmitting
                ? t(
                    'processing',
                    'Processing...'
                  )
                : mode === 'crop'
                ? t(
                    'get_crop_recommendation',
                    'Get Crop Recommendation'
                  )
                : t(
                    'get_fertilizer_recommendation',
                    'Get Fertilizer Recommendation'
                  )
            }
            onPress={handleSubmit}
            loading={isSubmitting}
            icon={
              <FontAwesome5
                name={
                  mode === 'crop'
                    ? 'brain'
                    : 'flask'
                }
                size={15}
                color="#FFFFFF"
              />
            }
            style={styles.recommendationButton}
          />
        </AgriCard>

        <AgriCard style={styles.historyCard}>
          <View style={styles.historyCardHeader}>
            <View style={styles.historyIconCircle}>
              <FontAwesome5
                name="history"
                size={14}
                color={colors.primary}
              />
            </View>

            <Text style={styles.historyTitle}>
              {t(
                'recent_recommendations',
                'Recent Recommendations'
              )}
            </Text>

            {recentRecommendations.length > 0 && (
              <View style={styles.historyCount}>
                <Text style={styles.historyCountText}>
                  {recentRecommendations.length}
                </Text>
              </View>
            )}
          </View>

          {recentRecommendations.length > 0 ? (
            recentRecommendations.map((rec) => (
              <TouchableOpacity
                key={rec._id}
                style={styles.recItem}
                onPress={() =>
                  navigation.navigate(
                    'HistoryDetail',
                    {
                      recId: rec._id,
                    }
                  )
                }
                activeOpacity={0.75}
              >
                <View style={styles.recLeft}>
                  <View style={styles.recCropIcon}>
                    <FontAwesome5
                      name="seedling"
                      size={14}
                      color={colors.primary}
                    />
                  </View>

                  <View>
                    <Text style={styles.recCropName}>
                      {rec.recommendedCrop
                        ? rec.recommendedCrop
                            .charAt(0)
                            .toUpperCase() +
                          rec.recommendedCrop
                            .slice(1)
                            .toLowerCase()
                        : 'Crop'}
                    </Text>

                    <Text style={styles.recDateText}>
                      {new Date(
                        rec.createdAt
                      ).toLocaleDateString(
                        'en-IN',
                        {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        }
                      )}
                    </Text>
                  </View>
                </View>

                <View style={styles.recRight}>
                  <View style={styles.recPhBadge}>
                    <Text style={styles.recPhText}>
                      pH {rec.soilPh || 'N/A'}
                    </Text>
                  </View>

                  <View style={styles.recArrow}>
                    <Ionicons
                      name="chevron-forward"
                      size={15}
                      color={colors.primary}
                    />
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyHistory}>
              <View style={styles.emptyHistoryIcon}>
                <FontAwesome5
                  name="seedling"
                  size={18}
                  color={colors.textMuted}
                />
              </View>

              <Text style={styles.emptyHistoryText}>
                {t(
                  'no_recent_history',
                  'No recent history found.'
                )}
              </Text>

              <Text style={styles.emptyHistorySubtext}>
                Your recommendations will appear here.
              </Text>
            </View>
          )}
        </AgriCard>

        <ChatAssistantWidget />
      </ScrollView>

      <Modal
        visible={stateModalVisible}
        transparent
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {t(
                    'select_state',
                    'Select State'
                  )}
                </Text>

                <Text style={styles.modalSubtitle}>
                  Choose your farming location
                </Text>
              </View>

              <TouchableOpacity
                style={styles.modalClose}
                onPress={() =>
                  setStateModalVisible(false)
                }
              >
                <Ionicons
                  name="close"
                  size={21}
                  color={colors.textPrimary}
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScroll}
              showsVerticalScrollIndicator={false}
            >
              {statesCitiesData.map((item) => (
                <TouchableOpacity
                  key={item.state}
                  style={[
                    styles.modalListItem,
                    formData.state === item.state &&
                      styles.modalListItemActive,
                  ]}
                  onPress={() =>
                    handleSelectState(
                      item.state
                    )
                  }
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.modalListText,
                      formData.state ===
                        item.state &&
                        styles.modalListTextActive,
                    ]}
                  >
                    {item.state}
                  </Text>

                  {formData.state ===
                    item.state && (
                    <Ionicons
                      name="checkmark-circle"
                      size={19}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={cityModalVisible}
        transparent
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {t(
                    'select_city',
                    'Select City'
                  )}
                </Text>

                {formData.state && (
                  <Text style={styles.modalSubtitle}>
                    {formData.state}
                  </Text>
                )}
              </View>

              <TouchableOpacity
                style={styles.modalClose}
                onPress={() =>
                  setCityModalVisible(false)
                }
              >
                <Ionicons
                  name="close"
                  size={21}
                  color={colors.textPrimary}
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScroll}
              showsVerticalScrollIndicator={false}
            >
              {availableCities.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.modalListItem,
                    formData.city === c &&
                      styles.modalListItemActive,
                  ]}
                  onPress={() => {
                    setFormData({
                      ...formData,
                      city: c,
                    });

                    setCityModalVisible(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.modalListText,
                      formData.city === c &&
                        styles.modalListTextActive,
                    ]}
                  >
                    {c}
                  </Text>

                  {formData.city === c && (
                    <Ionicons
                      name="checkmark-circle"
                      size={19}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={seasonModalVisible}
        transparent
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {t(
                    'select_season',
                    'Select Season'
                  )}
                </Text>

                <Text style={styles.modalSubtitle}>
                  Select your farming season
                </Text>
              </View>

              <TouchableOpacity
                style={styles.modalClose}
                onPress={() =>
                  setSeasonModalVisible(false)
                }
              >
                <Ionicons
                  name="close"
                  size={21}
                  color={colors.textPrimary}
                />
              </TouchableOpacity>
            </View>

            {seasonsList.map((s) => (
              <TouchableOpacity
                key={s.value}
                style={[
                  styles.modalListItem,
                  formData.season ===
                    s.value &&
                    styles.modalListItemActive,
                ]}
                onPress={() => {
                  setFormData({
                    ...formData,
                    season: s.value,
                  });

                  setSeasonModalVisible(false);
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.modalListText,
                    formData.season ===
                      s.value &&
                      styles.modalListTextActive,
                  ]}
                >
                  {s.label}
                </Text>

                {formData.season ===
                  s.value && (
                  <Ionicons
                    name="checkmark-circle"
                    size={19}
                    color={colors.primary}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 2,
  },

  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#E8F5EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  headerTextContainer: {
    flex: 1,
  },

  recommendationTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },

  recommendationSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },

  modeContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },

  modeButton: {
    flex: 1,
    minHeight: 118,
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    padding: 13,
    borderWidth: 1.5,
    borderColor: '#E2E9E3',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 7,
    elevation: 2,
    position: 'relative',
  },

  modeButtonActive: {
    backgroundColor: '#F0F9F1',
    borderColor: colors.primary,
    borderWidth: 2,
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.14,
    shadowRadius: 9,
    elevation: 4,
  },

  modeIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#F4F7F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
  },

  modeIconBoxActive: {
    backgroundColor: '#DDF1DF',
  },

  modeIcon: {
    fontSize: 23,
  },

  modeTextCol: {
    flex: 1,
    paddingRight: 4,
  },

  modeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#263326',
    lineHeight: 17,
  },

  modeTitleActive: {
    color: '#197331',
  },

  modeSubtitle: {
    fontSize: 10.5,
    color: '#7A887A',
    lineHeight: 14,
    marginTop: 4,
  },

  modeSubtitleActive: {
    color: '#4A704F',
  },

  selectedCheck: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 23,
    height: 23,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  formCard: {
    padding: 20,
    borderRadius: 16,
  },

  formHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 18,
  },

  formHeaderIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#E8F5EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  formHeaderIconFertilizer: {
    backgroundColor: '#EDF7E9',
  },

  formHeaderText: {
    flex: 1,
  },

  sectionHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
    lineHeight: 23,
    marginBottom: 4,
  },

  sectionSubheading: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },

  farmFetchBlock: {
    backgroundColor: '#F7FAF8',
    borderRadius: 13,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2ECE4',
    marginBottom: 19,
  },

  fetchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 11,
  },

  fetchIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#E6F3E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },

  fetchHeaderText: {
    flex: 1,
  },

  fetchLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },

  fetchHint: {
    fontSize: 10.5,
    color: colors.textMuted,
    marginTop: 2,
  },

  fetchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  farmInput: {
    flex: 1,
    marginBottom: 0,
  },

  fetchBtn: {
    minWidth: 76,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },

  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  selectorLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },

  pickerBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 10,
    paddingHorizontal: 11,
    height: 47,
  },

  pickerDisabled: {
    backgroundColor: '#F1F5F9',
    opacity: 0.75,
  },

  pickerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  pickerSelectedText: {
    fontSize: 12.5,
    color: colors.textPrimary,
    fontWeight: '600',
    flex: 1,
  },

  pickerPlaceholderText: {
    fontSize: 12.5,
    color: '#94A3B8',
    flex: 1,
  },

  weatherInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },

  weatherIconCircle: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },

  weatherBannerText: {
    fontSize: 10.5,
    color: '#1E40AF',
    flex: 1,
    lineHeight: 15,
  },

  submitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 9,
    paddingHorizontal: 2,
  },

  submitIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#E8F5EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },

  submitIconCircleFertilizer: {
    backgroundColor: '#EDF7E9',
  },

  submitTextContainer: {
    flex: 1,
  },

  submitHint: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },

  recommendationButton: {
    marginTop: 2,
    minHeight: 52,
  },

  historyCard: {
    padding: 18,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 16,
  },

  historyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E7EFE8',
  },

  historyIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#E8F5EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },

  historyTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },

  historyCount: {
    minWidth: 25,
    height: 25,
    paddingHorizontal: 7,
    borderRadius: 13,
    backgroundColor: '#E8F5EA',
    alignItems: 'center',
    justifyContent: 'center',
  },

  historyCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
  },

  recItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FAFCFA',
    borderWidth: 1,
    borderColor: '#E5ECE6',
    borderRadius: 12,
    padding: 11,
    marginBottom: 9,
  },

  recLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  recCropIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: '#E8F5EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  recCropName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 3,
  },

  recDateText: {
    fontSize: 11,
    color: '#777777',
  },

  recRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  recPhBadge: {
    backgroundColor: '#F1F5F2',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 7,
  },

  recPhText: {
    fontSize: 10.5,
    color: colors.textSecondary,
    fontWeight: '700',
  },

  recArrow: {
    width: 27,
    height: 27,
    borderRadius: 9,
    backgroundColor: '#E8F5EA',
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 18,
  },

  emptyHistoryIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#F1F5F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
  },

  emptyHistoryText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },

  emptyHistorySubtext: {
    fontSize: 10.5,
    color: '#A0AAA2',
    marginTop: 3,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 18, 0.55)',
    justifyContent: 'flex-end',
  },

  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 28,
    maxHeight: '82%',
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },

  modalSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 3,
  },

  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F1F5F2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalScroll: {
    maxHeight: 380,
  },

  modalListItem: {
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    borderRadius: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },

  modalListItemActive: {
    backgroundColor: '#EAF6EC',
  },

  modalListText: {
    fontSize: 13,
    color: colors.textPrimary,
  },

  modalListTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },
});

export default DashboardScreen;