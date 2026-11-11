import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import useTranslation from '../i18n';
import AgriHeader from '../components/common/AgriHeader';
import colors from '../theme/colors';
import { ROUTES } from '../navigation/routes';

export const AboutScreen = ({ navigation }) => {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <AgriHeader
        title="AgriMind"
        subtitle={t('about_title', 'About AgriMind')}
        showBack={navigation?.canGoBack?.() || false}
        onBack={() => navigation?.goBack?.()}
        showLanguage={true}
      />
      {/* Web Page Header Banner with 3 floating decoration icons */}
      <View style={styles.pageHeader}>
        <Text style={styles.pageHeaderTitle}>{t('about_title', 'About AgriMind')}</Text>
        <Text style={styles.pageHeaderSubtitle}>
          {t('about_subtitle', 'Empowering farmers with data and artificial intelligence')}
        </Text>

        <View style={styles.headerDecorationRow}>
          <View style={styles.decorationCircle}>
            <FontAwesome5 name="seedling" size={20} color="#FFFFFF" />
          </View>
          <View style={styles.decorationCircle}>
            <FontAwesome5 name="brain" size={20} color="#FFFFFF" />
          </View>
          <View style={styles.decorationCircle}>
            <FontAwesome5 name="chart-line" size={20} color="#FFFFFF" />
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Section 1: Problem Statement */}
        <View style={styles.aboutSection}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconCircle}>
              <FontAwesome5 name="exclamation-triangle" size={22} color={colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>{t('problem_title', 'Problem Statement')}</Text>
          </View>

          <Text style={styles.sectionDesc}>
            {t(
              'problem_desc',
              'Farmers in India often rely on traditional farming practices, which can lead to suboptimal crop selection, lower yields, and financial instability. They face challenges accessing localized soil and climate information.'
            )}
          </Text>

          <View style={styles.problemStatsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>60%</Text>
              <Text style={styles.statLabel}>{t('problem_stat_1', 'Rely on traditional methods')}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>40%</Text>
              <Text style={styles.statLabel}>{t('problem_stat_2', 'Experience crop selection issues')}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>30%</Text>
              <Text style={styles.statLabel}>{t('problem_stat_3', 'Face financial instability')}</Text>
            </View>
          </View>
        </View>

        {/* Section 2: Our Mission */}
        <View style={styles.aboutSection}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconCircle}>
              <FontAwesome5 name="bullseye" size={22} color={colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>{t('mission_title', 'Our Mission')}</Text>
          </View>

          <Text style={styles.sectionDesc}>
            {t(
              'mission_desc',
              'AgriMind aims to bridge this information gap by providing a simple, accessible, and data-driven tool. Our AI engine analyzes soil health, weather patterns, and APMC market prices to suggest profitable and sustainable crops.'
            )}
          </Text>

          <View style={styles.featuresList}>
            <View style={styles.featureCard}>
              <FontAwesome5 name="robot" size={22} color={colors.primary} style={{ marginBottom: 6 }} />
              <Text style={styles.featureTitle}>{t('mission_ai_title', 'AI-Powered')}</Text>
              <Text style={styles.featureDesc}>
                {t('mission_ai_desc', 'Advanced machine learning models for precision recommendations.')}
              </Text>
            </View>

            <View style={styles.featureCard}>
              <FontAwesome5 name="database" size={22} color={colors.primary} style={{ marginBottom: 6 }} />
              <Text style={styles.featureTitle}>{t('mission_data_title', 'Data-Driven')}</Text>
              <Text style={styles.featureDesc}>
                {t('mission_data_desc', 'Based on real-time soil, rainfall, and APMC market data.')}
              </Text>
            </View>

            <View style={styles.featureCard}>
              <FontAwesome5 name="leaf" size={22} color={colors.primary} style={{ marginBottom: 6 }} />
              <Text style={styles.featureTitle}>{t('mission_sustainable_title', 'Sustainable')}</Text>
              <Text style={styles.featureDesc}>
                {t('mission_sustainable_desc', 'Fostering long-term soil health and resource conservation.')}
              </Text>
            </View>
          </View>
        </View>

        {/* Section 3: How AgriMind Helps Farmers */}
        <View style={styles.aboutSection}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconCircle}>
              <FontAwesome5 name="lightbulb" size={22} color={colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>{t('helps_title', 'How AgriMind Helps Farmers')}</Text>
          </View>

          <Text style={styles.sectionDesc}>
            {t(
              'helps_desc',
              'We combine modern technology with agricultural science to provide end-to-end support for your farming decisions.'
            )}
          </Text>

          <View style={styles.benefitsContainer}>
            <View style={styles.benefitItem}>
              <FontAwesome5 name="seedling" size={18} color={colors.primary} style={styles.benefitIcon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.benefitTitle}>{t('benefit_crop_title', 'Optimal Crop Selection')}</Text>
                <Text style={styles.benefitDesc}>{t('benefit_crop_desc', 'Choose the right crops tailored to your soil.')}</Text>
              </View>
            </View>

            <View style={styles.benefitItem}>
              <FontAwesome5 name="cloud-sun" size={18} color={colors.primary} style={styles.benefitIcon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.benefitTitle}>{t('benefit_weather_title', 'Weather & Climate Resilience')}</Text>
                <Text style={styles.benefitDesc}>{t('benefit_weather_desc', 'Stay informed with seasonal forecasts and rainfall trends.')}</Text>
              </View>
            </View>

            <View style={styles.benefitItem}>
              <FontAwesome5 name="chart-line" size={18} color={colors.primary} style={styles.benefitIcon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.benefitTitle}>{t('benefit_productivity_title', 'Higher Productivity')}</Text>
                <Text style={styles.benefitDesc}>{t('benefit_productivity_desc', 'Maximize your farm yield and market profitability.')}</Text>
              </View>
            </View>

            <View style={styles.benefitItem}>
              <FontAwesome5 name="language" size={18} color={colors.primary} style={styles.benefitIcon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.benefitTitle}>{t('benefit_accessible_title', 'Multilingual & Simple')}</Text>
                <Text style={styles.benefitDesc}>{t('benefit_accessible_desc', 'Available in English, Hindi, and Kannada.')}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Interactive Feature Cards: Crop Prediction Factors & Crop Profit Calculation */}
        <View style={styles.interactiveCardsContainer}>
          <View style={styles.interactiveHeaderRow}>
            <View style={styles.interactiveBadge}>
              <FontAwesome5 name="graduation-cap" size={12} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.interactiveBadgeText}>{t('explore_intelligence', 'Interactive Farm Intelligence')}</Text>
            </View>
            <Text style={styles.interactiveTitle}>{t('about_explore_title', 'Understand AgriMind Technology')}</Text>
            <Text style={styles.interactiveSubtitle}>
              {t('about_explore_subtitle', 'Dive deeper into the data science and farm economics driving our recommendations.')}
            </Text>
          </View>

          {/* Card 1: Factors Behind Crop Prediction */}
          <TouchableOpacity
            style={[styles.featureActionCard, styles.factorActionCard]}
            onPress={() => navigation.navigate(ROUTES.CROP_FACTORS)}
            activeOpacity={0.8}
          >
            <View style={styles.cardHeaderRow}>
              <View style={[styles.cardIconCircle, { backgroundColor: '#e8f5ea' }]}>
                <FontAwesome5 name="seedling" size={20} color={colors.primary} />
              </View>
              <View style={styles.cardTag}>
                <Text style={styles.cardTagText}>{t('tag_prediction_factors', 'Core AI Factors')}</Text>
              </View>
            </View>

            <Text style={styles.cardMainTitle}>
              {t('factors_card_title', 'Factors Behind Crop Prediction')}
            </Text>

            <Text style={styles.cardMainDesc}>
              {t(
                'factors_card_desc',
                "Understand how soil properties, nutrients, environmental conditions, and agricultural information influence AgriMind's crop recommendations."
              )}
            </Text>

            <View style={styles.cardActionFooter}>
              <Text style={[styles.cardActionText, { color: colors.primary }]}>
                {t('explore_factors_btn', 'Explore Crop Prediction Factors')}
              </Text>
              <Ionicons name="arrow-forward" size={16} color={colors.primary} />
            </View>
          </TouchableOpacity>

          {/* Card 2: Crop Profit Calculation */}
          <TouchableOpacity
            style={[styles.featureActionCard, styles.profitActionCard]}
            onPress={() => navigation.navigate(ROUTES.CROP_PROFIT)}
            activeOpacity={0.8}
          >
            <View style={styles.cardHeaderRow}>
              <View style={[styles.cardIconCircle, { backgroundColor: '#fff3e0' }]}>
                <FontAwesome5 name="calculator" size={20} color={colors.secondaryDark || '#d28c50'} />
              </View>
              <View style={styles.cardTag}>
                <Text style={styles.cardTagText}>{t('tag_profit_calc', 'Farm Economics')}</Text>
              </View>
            </View>

            <Text style={styles.cardMainTitle}>
              {t('profit_card_title', 'Crop Profit Calculation')}
            </Text>

            <Text style={styles.cardMainDesc}>
              {t(
                'profit_card_desc',
                'Understand how AgriMind estimates crop revenue, cultivation expenses, and potential profit.'
              )}
            </Text>

            <View style={styles.cardActionFooter}>
              <Text style={[styles.cardActionText, { color: colors.secondaryDark || '#d28c50' }]}>
                {t('explore_profit_btn', 'Learn How Profit Is Calculated')}
              </Text>
              <Ionicons name="arrow-forward" size={16} color={colors.secondaryDark || '#d28c50'} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Section 4: Our Vision */}
        <View style={[styles.aboutSection, styles.visionSection]}>
          <Text style={styles.visionTitle}>{t('vision_title', 'Our Vision')}</Text>
          <Text style={styles.visionDesc}>
            {t(
              'vision_desc',
              'We envision a future where every farmer has access to actionable, AI-powered agricultural intelligence, transforming farming into a sustainable and prosperous endeavor for generations to come.'
            )}
          </Text>
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
  pageHeader: {
    backgroundColor: colors.primary,
    paddingTop: 24,
    paddingBottom: 22,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  pageHeaderTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
    textAlign: 'center',
  },
  pageHeaderSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  headerDecorationRow: {
    flexDirection: 'row',
    gap: 16,
  },
  decorationCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  aboutSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 3,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(46, 139, 87, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  sectionDesc: {
    fontSize: 13,
    color: '#555555',
    lineHeight: 19,
    marginBottom: 14,
  },
  problemStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(46, 139, 87, 0.06)',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    color: '#555555',
    textAlign: 'center',
    lineHeight: 14,
  },
  featuresList: {
    flexDirection: 'column',
    gap: 10,
  },
  featureCard: {
    backgroundColor: '#F8F9FA',
    padding: 14,
    borderRadius: 8,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 12,
    color: '#666666',
    lineHeight: 16,
  },
  benefitsContainer: {
    flexDirection: 'column',
    gap: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
  },
  benefitIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  benefitTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  benefitDesc: {
    fontSize: 12,
    color: '#666666',
    lineHeight: 16,
  },
  visionSection: {
    backgroundColor: colors.successLight,
    borderLeftColor: colors.primary,
  },
  visionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  visionDesc: {
    fontSize: 13,
    color: '#444444',
    lineHeight: 20,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  interactiveCardsContainer: {
    marginBottom: 20,
  },
  interactiveHeaderRow: {
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  interactiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5ea',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(46, 139, 87, 0.25)',
    marginBottom: 8,
  },
  interactiveBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  interactiveTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  interactiveSubtitle: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 17,
  },
  featureActionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    borderLeftWidth: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  factorActionCard: {
    borderLeftColor: colors.primary,
  },
  profitActionCard: {
    borderLeftColor: colors.secondaryDark || '#d28c50',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  cardTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
  },
  cardMainTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  cardMainDesc: {
    fontSize: 12.5,
    color: '#555555',
    lineHeight: 18,
    marginBottom: 14,
  },
  cardActionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
  },
  cardActionText: {
    fontSize: 13,
    fontWeight: '700',
  },
});

export default AboutScreen;
