/**
 * Comprehensive GST SAC / HSN Master Catalog for Indian SaaS & IT Services.
 *
 * Statutory reference database conforming to CBIC (Central Board of Indirect Taxes and Customs)
 * classification of services for information technology, software, and electronic data interchange.
 */

export const GST_SAC_MASTER_CATALOG = Object.freeze([
  {
    sacCode: '998311',
    category: 'IT_CONSULTING',
    description: 'Information technology consulting and advisory services',
    applicableGstRate: '18.00',
    cgstRate: '9.00',
    sgstRate: '9.00',
    igstRate: '18.00',
    rcmApplicable: false,
    exemptionNotification: null,
    effectiveFrom: '2017-07-01'
  },
  {
    sacCode: '998312',
    category: 'SYSTEM_DESIGN',
    description: 'Business and technical computer systems design and architecture services',
    applicableGstRate: '18.00',
    cgstRate: '9.00',
    sgstRate: '9.00',
    igstRate: '18.00',
    rcmApplicable: false,
    exemptionNotification: null,
    effectiveFrom: '2017-07-01'
  },
  {
    sacCode: '998313',
    category: 'NETWORK_MANAGEMENT',
    description: 'Information technology infrastructure and network management services',
    applicableGstRate: '18.00',
    cgstRate: '9.00',
    sgstRate: '9.00',
    igstRate: '18.00',
    rcmApplicable: false,
    exemptionNotification: null,
    effectiveFrom: '2017-07-01'
  },
  {
    sacCode: '998314',
    category: 'TECH_SUPPORT',
    description: 'Information technology technical support and trouble-shooting services',
    applicableGstRate: '18.00',
    cgstRate: '9.00',
    sgstRate: '9.00',
    igstRate: '18.00',
    rcmApplicable: false,
    exemptionNotification: null,
    effectiveFrom: '2017-07-01'
  },
  {
    sacCode: '998315',
    category: 'HOSTING_SAAS',
    description: 'Website hosting, application service provisioning (ASP), and SaaS subscriptions',
    applicableGstRate: '18.00',
    cgstRate: '9.00',
    sgstRate: '9.00',
    igstRate: '18.00',
    rcmApplicable: false,
    exemptionNotification: null,
    effectiveFrom: '2017-07-01'
  },
  {
    sacCode: '998316',
    category: 'DATA_STORAGE',
    description: 'Cloud data storage, database infrastructure, and electronic data backup services',
    applicableGstRate: '18.00',
    cgstRate: '9.00',
    sgstRate: '9.00',
    igstRate: '18.00',
    rcmApplicable: false,
    exemptionNotification: null,
    effectiveFrom: '2017-07-01'
  },
  {
    sacCode: '998319',
    category: 'OTHER_IT',
    description: 'Other information technology and telecommunications support services n.e.c.',
    applicableGstRate: '18.00',
    cgstRate: '9.00',
    sgstRate: '9.00',
    igstRate: '18.00',
    rcmApplicable: false,
    exemptionNotification: null,
    effectiveFrom: '2017-07-01'
  },
  {
    sacCode: '998413',
    category: 'TELECOMMUNICATION',
    description: 'Data transmission services over wired or wireless broadband networks',
    applicableGstRate: '18.00',
    cgstRate: '9.00',
    sgstRate: '9.00',
    igstRate: '18.00',
    rcmApplicable: false,
    exemptionNotification: null,
    effectiveFrom: '2017-07-01'
  },
  {
    sacCode: '999293',
    category: 'VOCATIONAL_TRAINING',
    description: 'Commercial software development coaching and engineer onboarding training',
    applicableGstRate: '18.00',
    cgstRate: '9.00',
    sgstRate: '9.00',
    igstRate: '18.00',
    rcmApplicable: false,
    exemptionNotification: null,
    effectiveFrom: '2017-07-01'
  },
  {
    sacCode: '998365',
    category: 'SECURITY_AUDIT',
    description: 'Cybersecurity penetration testing, vulnerability scanning, and code audit',
    applicableGstRate: '18.00',
    cgstRate: '9.00',
    sgstRate: '9.00',
    igstRate: '18.00',
    rcmApplicable: false,
    exemptionNotification: null,
    effectiveFrom: '2017-07-01'
  }
]);

/**
 * Looks up SAC code definition from statutory catalog.
 * @param {string} code
 */
export function lookupSacCode(code) {
  return GST_SAC_MASTER_CATALOG.find((entry) => entry.sacCode === code) || null;
}

/**
 * Validates whether a SAC code is recognized under Indian GST schedules.
 * @param {string} code
 */
export function isValidSacCode(code) {
  return lookupSacCode(code) !== null;
}
