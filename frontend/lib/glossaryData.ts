export interface GlossaryTerm {
  id: string;
  name: string;
  shortLabel: string;
  category: "Revenue & Top-Line" | "Profitability & Margins" | "Cash Flow & Runway" | "Retention & Cohorts" | "Payments & Risk";
  definition: string;
  formula?: string;
  whyItMatters: string;
  benchmark?: string;
}

export const GLOSSARY_CATEGORIES = [
  "All",
  "Revenue & Top-Line",
  "Profitability & Margins",
  "Cash Flow & Runway",
  "Retention & Cohorts",
  "Payments & Risk"
] as const;

export const GLOSSARY_TERMS: GlossaryTerm[] = [
  // --- Category: Revenue & Top-Line ---
  {
    id: "gross-revenue",
    name: "Gross Revenue (GMV)",
    shortLabel: "Gross Revenue",
    category: "Revenue & Top-Line",
    definition: "The total dollar volume of completed sales transactions before deducting refunds, chargebacks, payment processor fees, discounts, or operating costs.",
    formula: "Sum of all completed customer transactions",
    whyItMatters: "Measures overall commercial volume and transaction velocity across your PayPal accounts, though it overstates actual retained capital.",
    benchmark: "Track quarter-over-quarter growth velocity."
  },
  {
    id: "net-revenue",
    name: "Net Revenue",
    shortLabel: "Net Revenue",
    category: "Revenue & Top-Line",
    definition: "Actual realized revenue retained by the merchant after subtracting customer refunds, disputed chargebacks, credit allowances, and promotional coupons.",
    formula: "Gross Revenue - (Refunds + Chargebacks + Discounts)",
    whyItMatters: "Represents the real top-line income available to pay suppliers, server infrastructure, and team payroll.",
    benchmark: "Should stay within 93-98% of Gross Revenue for healthy accounts."
  },
  {
    id: "mrr",
    name: "MRR (Monthly Recurring Revenue)",
    shortLabel: "MRR",
    category: "Revenue & Top-Line",
    definition: "Predictable, normalized contract revenue generated every 30 days from active recurring subscription plans and tiers.",
    formula: "Active Subscribers x Average Revenue Per User (ARPU)",
    whyItMatters: "The bedrock valuation and solvency metric for subscription businesses, determining baseline payroll coverage and forward runway.",
    benchmark: "10-20% month-over-month growth for early-stage SaaS; 3-5% for mature businesses."
  },
  {
    id: "arr",
    name: "ARR (Annual Recurring Revenue)",
    shortLabel: "ARR",
    category: "Revenue & Top-Line",
    definition: "The annualized projection of recurring subscription income, assuming zero net change in active plans.",
    formula: "MRR x 12",
    whyItMatters: "Primary scale metric used by lenders, equity investors, and credit lines to appraise business valuation and loan covenants.",
    benchmark: "Standard milestone multiples are evaluated at $1M, $5M, and $10M ARR."
  },
  {
    id: "ttm-revenue",
    name: "TTM (Trailing Twelve Months)",
    shortLabel: "TTM",
    category: "Revenue & Top-Line",
    definition: "Total financial metric or revenue accumulated across the preceding 12 consecutive calendar months up to the current date.",
    formula: "Sum of Net Revenue over the past 12 months",
    whyItMatters: "Eliminates monthly seasonality anomalies (e.g. holiday spikes or summer dips), providing a reliable gauge of sustained run-rate.",
    benchmark: "Used in annual audits and banking credit applications."
  },
  {
    id: "arpu",
    name: "ARPU (Average Revenue Per User)",
    shortLabel: "ARPU",
    category: "Revenue & Top-Line",
    definition: "The average revenue produced by each active customer or subscriber account over a specific timeframe.",
    formula: "Total Period Revenue / Total Active Accounts",
    whyItMatters: "Reveals whether your expansion is driven by upselling higher-tier plans or relying solely on new customer acquisition.",
    benchmark: "Expanding ARPU indicates strong pricing power and product-market fit."
  },

  // --- Category: Profitability & Margins ---
  {
    id: "gross-margin",
    name: "Gross Margin (%)",
    shortLabel: "Gross Margin",
    category: "Profitability & Margins",
    definition: "The percentage of revenue retained after subtracting direct Cost of Goods Sold (COGS), cloud hosting, and merchant transaction processing fees.",
    formula: "((Net Revenue - COGS) / Net Revenue) x 100",
    whyItMatters: "Measures core product delivery efficiency before administrative salaries and marketing outlays.",
    benchmark: "SaaS / Digital: 70% – 85%+; E-commerce: 40% – 60%."
  },
  {
    id: "operating-margin",
    name: "Operating Margin (EBIT Margin)",
    shortLabel: "Operating Margin",
    category: "Profitability & Margins",
    definition: "The percentage of revenue remaining after covering all operating expenses (SG&A, engineering payroll, marketing, and office rent) before interest and taxes.",
    formula: "(Operating Income / Net Revenue) x 100",
    whyItMatters: "Shows whether business operations are structurally profitable and possess economies of scale as volume multiplies.",
    benchmark: "Healthy operating margins range from 15% to 30%+."
  },
  {
    id: "net-profit-margin",
    name: "Net Profit Margin (%)",
    shortLabel: "Net Profit Margin",
    category: "Profitability & Margins",
    definition: "The bottom-line percentage of total revenue remaining after deducting every expense: COGS, operating overhead, debt interest, taxes, and depreciation.",
    formula: "(Net Income / Net Revenue) x 100",
    whyItMatters: "The definitive measure of financial sustainability and pure earnings generation.",
    benchmark: "10% – 20%+ is considered strong across technology and digital services."
  },
  {
    id: "contribution-margin",
    name: "Contribution Margin",
    shortLabel: "Contribution Margin",
    category: "Profitability & Margins",
    definition: "The dollar amount or percentage remaining from each unit sold after subtracting direct variable production and shipping/processing expenses.",
    formula: "Unit Sale Price - Variable Cost Per Unit",
    whyItMatters: "Determines how much marginal sales directly contribute toward paying fixed recurring monthly bills.",
    benchmark: "Should always remain comfortably positive across every SKU or plan tier."
  },

  // --- Category: Cash Flow & Runway ---
  {
    id: "ocf",
    name: "Operating Cash Flow (OCF)",
    shortLabel: "Operating Cash Flow",
    category: "Cash Flow & Runway",
    definition: "Actual net liquid cash generated or consumed directly by core day-to-day business transactions, excluding external financing or debt.",
    formula: "Net Income + Non-Cash Adjustments ± Changes in Working Capital",
    whyItMatters: "Accounting accrual profit is not cash; positive OCF confirms customers are genuinely paying on time to fund the company.",
    benchmark: "Should match or exceed Net Income over rolling 6-month windows."
  },
  {
    id: "fcf",
    name: "Free Cash Flow (FCF)",
    shortLabel: "Free Cash Flow",
    category: "Cash Flow & Runway",
    definition: "Cash generated through ongoing business activities after subtracting capital expenditures (CapEx) on servers, equipment, or physical assets.",
    formula: "Operating Cash Flow - Capital Expenditures (CapEx)",
    whyItMatters: "Surplus cash available for reinvestment, dividends, debt clearance, or cash reserves.",
    benchmark: "A benchmark FCF margin of 15-25% indicates a high-cash generative model."
  },
  {
    id: "cash-runway",
    name: "Cash Runway (Months)",
    shortLabel: "Cash Runway",
    category: "Cash Flow & Runway",
    definition: "The estimated number of months the company can sustain operations before depleting existing bank balances at current net spending velocity.",
    formula: "Current Liquid Cash Balance / Monthly Net Burn Rate",
    whyItMatters: "Direct indicator of operational safety, dictating when hiring freezes or capital raises must take place.",
    benchmark: "Minimum 12 to 18 months of runway is recommended for venture/growth companies."
  },
  {
    id: "burn-rate",
    name: "Burn Rate (Gross vs. Net)",
    shortLabel: "Burn Rate",
    category: "Cash Flow & Runway",
    definition: "Gross Burn is total monthly cash spent. Net Burn is the actual monthly deficit (Cash Outflows minus Cash Inflows).",
    formula: "Monthly Cash Inflows - Monthly Cash Outflows",
    whyItMatters: "Determines the slope of your cash runway drawdown curve.",
    benchmark: "Keep Net Burn under 20% of liquid reserves per quarter."
  },
  {
    id: "dso",
    name: "DSO (Days Sales Outstanding)",
    shortLabel: "DSO",
    category: "Cash Flow & Runway",
    definition: "The average number of days required to collect payment from customers after invoices have been dispatched.",
    formula: "(Accounts Receivable / Total Credit Sales) x Days in Period",
    whyItMatters: "High DSO ties up crucial cash in unpaid receivables, increasing default risks and choking working capital.",
    benchmark: "Optimal DSO is under 30 to 45 days. Anything over 60 days requires immediate 1-click reminders."
  },
  {
    id: "working-capital",
    name: "Working Capital",
    shortLabel: "Working Capital",
    category: "Cash Flow & Runway",
    definition: "The difference between current short-term operating assets (cash, receivables) and short-term liabilities (unpaid bills, upcoming refunds).",
    formula: "Current Assets - Current Liabilities",
    whyItMatters: "Ensures the merchant can withstand short-term revenue interruptions without defaulting on obligations.",
    benchmark: "Working capital ratio (Assets / Liabilities) between 1.5 and 2.0 is ideal."
  },

  // --- Category: Retention & Cohorts ---
  {
    id: "churn-rate",
    name: "Customer Churn Rate (%)",
    shortLabel: "Churn Rate",
    category: "Retention & Cohorts",
    definition: "The percentage of subscribers or customers who cancel or fail to renew their subscription during a given billing cycle.",
    formula: "(Lost Subscribers / Total Starting Subscribers) x 100",
    whyItMatters: "Churn represents lost recurring income; high churn forces expensive customer acquisition just to stay even.",
    benchmark: "B2B SaaS: < 1-2% monthly; B2C / Consumer: < 3-5% monthly."
  },
  {
    id: "revenue-churn",
    name: "Revenue Churn (Gross vs. Net)",
    shortLabel: "Revenue Churn",
    category: "Retention & Cohorts",
    definition: "Gross churn tracks revenue lost strictly from cancellations. Net churn factors in plan expansion and upgrades from remaining clients.",
    formula: "((Lost MRR - Expansion MRR) / Starting MRR) x 100",
    whyItMatters: "Negative Net Revenue Churn is the holy grail: existing customers spend more over time than churn takes away.",
    benchmark: "Target negative net revenue churn (-1% to -2% monthly)."
  },
  {
    id: "ltv",
    name: "LTV (Customer Lifetime Value)",
    shortLabel: "LTV",
    category: "Retention & Cohorts",
    definition: "The aggregate net revenue or profit anticipated from a customer across their entire relationship with your business.",
    formula: "(ARPU x Gross Margin %) / Churn Rate",
    whyItMatters: "Establishes the rational upper bound of how much marketing budget can be invested to acquire a new customer.",
    benchmark: "LTV should continuously grow as retention and pricing improve."
  },
  {
    id: "cac",
    name: "CAC (Customer Acquisition Cost)",
    shortLabel: "CAC",
    category: "Retention & Cohorts",
    definition: "The total sales, marketing, advertising, and campaign expenses needed to convince a single customer to buy.",
    formula: "Total Acquisition Spend / Number of New Customers Acquired",
    whyItMatters: "Uncontrolled CAC is the primary cause of startup failure. Must be quickly paid back by customer revenues.",
    benchmark: "Target a CAC Payback Period of less than 12 months."
  },
  {
    id: "ltv-cac",
    name: "LTV:CAC Ratio",
    shortLabel: "LTV:CAC",
    category: "Retention & Cohorts",
    definition: "The multiple comparing customer lifetime value to the acquisition cost required to sign them.",
    formula: "LTV / CAC",
    whyItMatters: "Validates business model sustainability. < 1.0x destroys value; 3.0x is standard; > 5.0x signals room to invest more in sales.",
    benchmark: "3.0x or higher is the gold standard."
  },
  {
    id: "ndr",
    name: "NDR / NRR (Net Dollar Retention)",
    shortLabel: "NDR / NRR",
    category: "Retention & Cohorts",
    definition: "Percentage of recurring revenue retained from existing subscriber cohorts over 12 months, accounting for expansions, downgrades, and churn.",
    formula: "((Beginning MRR + Upgrades - Downgrades - Churn) / Beginning MRR) x 100",
    whyItMatters: "High NDR drives compound revenue expansion without incremental marketing costs.",
    benchmark: "Top quartile SaaS achieves > 115% - 125%."
  },

  // --- Category: Payments & Risk ---
  {
    id: "dispute-ratio",
    name: "Dispute & Chargeback Ratio",
    shortLabel: "Dispute Ratio",
    category: "Payments & Risk",
    definition: "The percentage of completed customer transactions contested through card issuers or PayPal buyer protection disputes.",
    formula: "(Total Disputed Transactions / Total Completed Transactions) x 100",
    whyItMatters: "PayPal and Visa/Mastercard enforce strict thresholds; exceeding 1.0% triggers rolling reserve holdbacks, fines, or merchant restrictions.",
    benchmark: "Must remain strictly below 1.0%; best-in-class merchants maintain < 0.3%."
  },
  {
    id: "receivables-at-risk",
    name: "Receivables at Risk",
    shortLabel: "Receivables at Risk",
    category: "Payments & Risk",
    definition: "The cumulative dollar value of sent invoices past their due date, aging beyond 30+ days, or associated with uncollected accounts.",
    formula: "Sum of past-due unpaid invoice balances",
    whyItMatters: "Uncollected receivables directly depress cash flow and distort forward runway projections.",
    benchmark: "Aim to keep overdue invoices under 5% of monthly billing volume."
  },
  {
    id: "processing-fees",
    name: "Blended Processing Fee Rate",
    shortLabel: "Processing Fees",
    category: "Payments & Risk",
    definition: "The effective overall percentage deducted by PayPal, credit card networks, and interchange systems across all gross transaction volume.",
    formula: "(Total Payment Fees / Gross Transaction Volume) x 100",
    whyItMatters: "Small percentage optimizations in international conversions, micro-pricing tiers, or ACH routing flow directly to the bottom line.",
    benchmark: "Domestic PayPal standard ~2.9% + $0.30; high volume tiers negotiate ~1.9 - 2.2%."
  }
];
