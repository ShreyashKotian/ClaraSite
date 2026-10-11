/**
 * Standalone mock data for the ClaraAI Dashboard Demo.
 * Completely independent of any backend services or databases.
 */

import type {
  AnalyticsCallRow,
  AnalyticsSummary,
  CallAnalysis,
  SavedSuggestion,
  TranscriptSegment,
} from "./conversations";
import type { KnowledgeSource } from "./knowledge";

const NOW = new Date();
const isoDaysAgo = (days: number, hoursOffset = 0) => {
  const d = new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000 - hoursOffset * 60 * 60 * 1000);
  return d.toISOString();
};

export const MOCK_CALLS: AnalyticsCallRow[] = [
  {
    id: "call-001",
    started_at: isoDaysAgo(0, 2),
    duration_sec: 1140, // 19 min
    status: "ended",
    rep_label: "Alex Morgan",
    caller_name: "Rajesh Mehta",
    has_audio: false,
    interest_examples: [
      "We are thinking around two crore, maybe stretch to two point two.",
      "Saturday around ten works for the site visit.",
      "If the sample flat matches, we can discuss token amount on the spot.",
    ],
    concern_examples: [
      "Worried about the maintenance charges.",
      "Comparing with competing developments in the same belt.",
    ],
    interest_score: 88,
    conversion_pct: 76,
    buying_signals: 4,
    objections: 2,
    outcome: "qualified",
    outcome_reason:
      "Prospect confirmed budget of ₹2.2 Cr, requested floor plans, and scheduled site visit for Saturday with token advance ready.",
    outcome_evidence: [
      "Site visit booked for Saturday 10:00 AM",
      "Token amount ready upon sample flat confirmation",
    ],
    question_examples: [
      "What budget range are you comfortable with, and when are you planning to move in?",
      "Would Saturday morning work for a site visit with your wife?",
    ],
    listening_examples: [
      "We want a higher floor, at least fifteenth plus for the western view, and commute to Andheri East matters.",
    ],
    conversion_band: "likely",
    rep_talk_pct: 44,
    rep_questions: 8,
    avg_response_sec: 1.8,
    listening_index: 92,
  },
  {
    id: "call-002",
    started_at: isoDaysAgo(1, 4),
    duration_sec: 840, // 14 min
    status: "ended",
    rep_label: "Alex Morgan",
    caller_name: "Priya Sharma",
    has_audio: false,
    interest_examples: [
      "I love the location near Viviana Mall.",
      "Can we lock in the subvention payment scheme today?",
    ],
    concern_examples: ["Possession date is December 2026, wanted slightly earlier."],
    interest_score: 92,
    conversion_pct: 84,
    buying_signals: 5,
    objections: 1,
    outcome: "qualified",
    outcome_reason:
      "High intent buyer for 2BHK Smart Home. Approved Partner Bank home loan letter ready, requesting booking agreement draft.",
    outcome_evidence: [
      "Pre-approved home loan letter shared",
      "Requested payment milestone breakdown",
    ],
    question_examples: [
      "Are you looking for self-use or an investment return?",
      "Would you like me to send over the Tower C inventory matrix?",
    ],
    listening_examples: [
      "My husband and I already visited the site office last Sunday and liked the clubhouse.",
    ],
    conversion_band: "likely",
    rep_talk_pct: 46,
    rep_questions: 7,
    avg_response_sec: 2.1,
    listening_index: 89,
  },
  {
    id: "call-003",
    started_at: isoDaysAgo(2, 6),
    duration_sec: 720, // 12 min
    status: "ended",
    rep_label: "Alex Morgan",
    caller_name: "Vikram Kapoor",
    has_audio: false,
    interest_examples: [
      "Looking for a 4BHK duplex or penthouse on Pokhran Road.",
      "Budget is flexible up to ₹4.5 Crores.",
    ],
    concern_examples: ["Need 3 covered car parks together, not tandem."],
    interest_score: 85,
    conversion_pct: 79,
    buying_signals: 4,
    objections: 1,
    outcome: "qualified",
    outcome_reason:
      "Ultra-HNI lead with verified liquidity. Reserved a private presentation slot for Sunday afternoon.",
    outcome_evidence: [
      "Private presentation scheduled with sales director",
      "Flexible budget up to ₹4.5 Cr",
    ],
    question_examples: [
      "Do you prefer a private terrace configuration?",
      "Shall I arrange a direct briefing with our chief architect?",
    ],
    listening_examples: [
      "We currently live in Hiranandani Estate and are looking for larger living spaces with lower density.",
    ],
    conversion_band: "likely",
    rep_talk_pct: 48,
    rep_questions: 6,
    avg_response_sec: 2.3,
    listening_index: 87,
  },
  {
    id: "call-004",
    started_at: isoDaysAgo(3, 3),
    duration_sec: 610, // 10 min
    status: "ended",
    rep_label: "Alex Morgan",
    caller_name: "Amit Kulkarni",
    has_audio: false,
    interest_examples: [
      "Interested in the Park Avenue Residences 3BHK garden facing.",
      "Carpet area of 1150 sq.ft fits our requirement.",
    ],
    concern_examples: [
      "Need to sell existing flat in Mulund before closing.",
      "Interest rates seem high this quarter.",
    ],
    interest_score: 68,
    conversion_pct: 58,
    buying_signals: 3,
    objections: 2,
    outcome: "follow_up",
    outcome_reason:
      "Warm lead awaiting buyer for current apartment. Follow-up scheduled in 10 days post valuation.",
    outcome_evidence: ["Contingent on selling current Mulund property"],
    question_examples: [
      "Have you already listed your Mulund property with an agent?",
      "Can we assist you with our developer-assisted resale channel?",
    ],
    listening_examples: [
      "We really like the floor layout but our equity is locked up until next month.",
    ],
    conversion_band: "possible",
    rep_talk_pct: 52,
    rep_questions: 6,
    avg_response_sec: 2.7,
    listening_index: 81,
  },
  {
    id: "call-005",
    started_at: isoDaysAgo(4, 5),
    duration_sec: 980, // 16 min
    status: "ended",
    rep_label: "Alex Morgan",
    caller_name: "Sneha Patel",
    has_audio: false,
    interest_examples: [
      "Need quick possession within 4 months.",
      "Liked the eco-friendly amenities and EV charging setup.",
    ],
    concern_examples: ["Wants higher floor with unobstructed Yeoor hills view."],
    interest_score: 89,
    conversion_pct: 81,
    buying_signals: 4,
    objections: 1,
    outcome: "qualified",
    outcome_reason:
      "Ready buyer with checkbook. Scheduled site inspection this Thursday at 4 PM.",
    outcome_evidence: [
      "Site inspection set for Thursday 4:00 PM",
      "Down payment ready in bank",
    ],
    question_examples: [
      "Which direction of balcony view is most critical for your family?",
      "Would you like our finance manager to be present at the site office?",
    ],
    listening_examples: [
      "My mother has knee issues so walking distance to the club and ground-level greenery is paramount.",
    ],
    conversion_band: "likely",
    rep_talk_pct: 42,
    rep_questions: 9,
    avg_response_sec: 1.9,
    listening_index: 94,
  },
  {
    id: "call-006",
    started_at: isoDaysAgo(5, 1),
    duration_sec: 540, // 9 min
    status: "ended",
    rep_label: "Alex Morgan",
    caller_name: "Rohan Deshmukh",
    has_audio: false,
    interest_examples: [
      "Looking for rental yield in Thane West corridor.",
      "This development has strong tenant pull.",
    ],
    concern_examples: ["Calculates rental yield under 3.5%, wanted 4.5%."],
    interest_score: 62,
    conversion_pct: 52,
    buying_signals: 2,
    objections: 2,
    outcome: "follow_up",
    outcome_reason:
      "Investor analyzing yields against commercial alternatives. Shared comparative appreciation history.",
    outcome_evidence: ["Comparing residential vs commercial yield models"],
    question_examples: ["Are you factoring capital appreciation over a 5-year horizon?"],
    listening_examples: ["I usually buy commercial retail shops, so I am scrutinizing the ROI."],
    conversion_band: "possible",
    rep_talk_pct: 50,
    rep_questions: 5,
    avg_response_sec: 2.9,
    listening_index: 80,
  },
  {
    id: "call-007",
    started_at: isoDaysAgo(6, 2),
    duration_sec: 420, // 7 min
    status: "ended",
    rep_label: "Alex Morgan",
    caller_name: "Neha Gupta",
    has_audio: false,
    interest_examples: ["Asked basic inquiries on 2BHK starting price."],
    concern_examples: [
      "Budget ceiling is strictly ₹1.1 Cr, the project starts at ₹1.45 Cr.",
      "Looking for property in Kalyan or Dombivli instead.",
    ],
    interest_score: 42,
    conversion_pct: 35,
    buying_signals: 1,
    objections: 3,
    outcome: "at_risk",
    outcome_reason:
      "Budget disconnect. Prospect looking in peripheral suburbs rather than Thane West core.",
    outcome_evidence: ["Budget gap of ₹35 Lakhs beyond max stretch capacity"],
    question_examples: ["Is there flexibility to explore 1BHK premium configurations?"],
    listening_examples: ["No, 1BHK is too small for our family, we need 2BHK within 1.1 crore."],
    conversion_band: "unlikely",
    rep_talk_pct: 55,
    rep_questions: 4,
    avg_response_sec: 3.4,
    listening_index: 73,
  },
  {
    id: "call-008",
    started_at: isoDaysAgo(7, 4),
    duration_sec: 780, // 13 min
    status: "ended",
    rep_label: "Alex Morgan",
    caller_name: "Manoj Joshi",
    has_audio: false,
    interest_examples: [
      "Relocating from Pune next quarter.",
      "Referred by colleague who bought in Tower A.",
    ],
    concern_examples: ["Needs school bus pick-up confirmation inside gated community."],
    interest_score: 84,
    conversion_pct: 75,
    buying_signals: 4,
    objections: 1,
    outcome: "qualified",
    outcome_reason:
      "Warm referral with planned Mumbai corporate relocation. Site visit booked for Sunday.",
    outcome_evidence: ["Referred by existing homeowner in Tower A"],
    question_examples: ["Which international schools are you considering for your kids?"],
    listening_examples: ["International school connectivity is our top criterion."],
    conversion_band: "likely",
    rep_talk_pct: 45,
    rep_questions: 7,
    avg_response_sec: 2.2,
    listening_index: 90,
  },
];

export const MOCK_SUMMARY: AnalyticsSummary = {
  range: "30d",
  range_start: isoDaysAgo(30),
  range_end: NOW.toISOString(),
  volume_bucket_unit: "day",
  total_conversations: 28,
  analyzed_conversations: 28,
  analysis_coverage_pct: 100,
  avg_rep_talk_pct: 46,
  avg_duration_sec: 680,
  avg_interest_score: 82,
  avg_conversion_pct: 74,
  suggestion_cache_hit_pct: 72,
  pipeline_outlook: {
    qualified_calls: 16,
    follow_up_calls: 8,
    at_risk_calls: 4,
  },
  conversion_bands: {
    likely: 15,
    possible: 9,
    unlikely: 4,
  },
  signal_balance: {
    buying_signals_total: 86,
    objections_total: 24,
    avg_buying_signals_per_call: 3.1,
    avg_objections_per_call: 0.9,
    net_signal_score: 62,
    buying_themes: [
      { label: "Site visit scheduled", count: 24 },
      { label: "Budget aligned", count: 20 },
      { label: "Floor & view interest", count: 16 },
      { label: "Brochure / payment sheet requested", count: 14 },
      { label: "Ready for token advance", count: 12 },
    ],
    objection_themes: [
      { label: "Maintenance charges concern", count: 9 },
      { label: "Competitor comparison (competing developer/other builders)", count: 7 },
      { label: "Possession date timing", count: 5 },
      { label: "Subvention scheme terms", count: 3 },
    ],
  },
  previous_period: {
    total_conversations: 22,
    qualified_calls: 11,
    follow_up_calls: 7,
    at_risk_calls: 4,
    avg_conversion_pct: 66,
    avg_interest_score: 75,
    avg_rep_talk_pct: 57,
    avg_rep_questions: 5.1,
    listening_index: 76,
    avg_response_sec: 3.6,
  },
  talk_goals: {
    rep_talk_min_pct: 35,
    rep_talk_max_pct: 55,
    listening_min: 80,
    questions_per_call: 6.0,
    response_sec_max: 5.0,
  },
  coaching_snapshot: {
    avg_rep_questions: 6.8,
    talk_balance_label: "balanced",
    listening_index: 88,
    avg_response_sec: 2.2,
  },
  weekly_volume: [
    { label: "Week 1", count: 5, call_ids: ["call-007", "call-008"] },
    { label: "Week 2", count: 7, call_ids: ["call-005", "call-006"] },
    { label: "Week 3", count: 8, call_ids: ["call-003", "call-004"] },
    { label: "Week 4", count: 8, call_ids: ["call-001", "call-002"] },
  ],
  calls: MOCK_CALLS,
};

export const MOCK_TRANSCRIPTS: Record<
  string,
  {
    conversation_id: string;
    segments: TranscriptSegment[];
    suggestions: SavedSuggestion[];
  }
> = {
  "call-001": {
    conversation_id: "call-001",
    segments: [
      {
        speaker_id: 0,
        role: "rep",
        text: "Good afternoon, thank you for calling Grandview Residences. My name is Alex. How can I help you today?",
        start_ms: 0,
        end_ms: 6500,
        word_count: 17,
      },
      {
        speaker_id: 1,
        role: "prospect",
        text: "Hi Alex, I saw your ad for the Goregaon project. We are looking for a three BHK with a sea view if possible.",
        start_ms: 7000,
        end_ms: 14500,
        word_count: 23,
      },
      {
        speaker_id: 0,
        role: "rep",
        text: "Great choice. May I ask what budget range you are comfortable with, and when are you planning to move in?",
        start_ms: 15000,
        end_ms: 21000,
        word_count: 20,
      },
      {
        speaker_id: 1,
        role: "prospect",
        text: "We are thinking around two crore, maybe stretch to two point two. Move-in would be within six months.",
        start_ms: 21500,
        end_ms: 28000,
        word_count: 19,
      },
      {
        speaker_id: 0,
        role: "rep",
        text: "Perfect. We have a three BHK in Tower B facing the western skyline starting at about one point nine five crore. Is Goregaon West your preferred micro-market?",
        start_ms: 28500,
        end_ms: 37000,
        word_count: 28,
      },
      {
        speaker_id: 1,
        role: "prospect",
        text: "Yes, near the station would be ideal. My office is in Andheri East so commute matters.",
        start_ms: 37500,
        end_ms: 43000,
        word_count: 16,
      },
      {
        speaker_id: 0,
        role: "rep",
        text: "Understood. The site is roughly twelve minutes from Goregaon station off the main road. What is your requirement regarding parking?",
        start_ms: 43500,
        end_ms: 50000,
        word_count: 21,
      },
      {
        speaker_id: 1,
        role: "prospect",
        text: "Yes, two covered parking spaces. We also want a higher floor — at least fifteenth plus for the view.",
        start_ms: 50500,
        end_ms: 57000,
        word_count: 18,
      },
      {
        speaker_id: 0,
        role: "rep",
        text: "We still have inventory on floors fifteen through twenty-two in that tower. The premium for a sea-facing unit is roughly eight to twelve lakhs depending on floor.",
        start_ms: 57500,
        end_ms: 66000,
        word_count: 27,
      },
      {
        speaker_id: 1,
        role: "prospect",
        text: "That is within range. What is the carpet area for the three BHK configuration?",
        start_ms: 66500,
        end_ms: 71000,
        word_count: 15,
      },
      {
        speaker_id: 0,
        role: "rep",
        text: "The carpet is approximately nine hundred eighty square feet with an attached deck on the living room.",
        start_ms: 71500,
        end_ms: 77000,
        word_count: 17,
      },
      {
        speaker_id: 1,
        role: "prospect",
        text: "Hmm, one point nine five sounds good but I am worried about the maintenance charges. Last project we saw had very high society fees.",
        start_ms: 77500,
        end_ms: 85000,
        word_count: 24,
      },
      {
        speaker_id: 0,
        role: "rep",
        text: "Fair concern. Maintenance here is roughly twelve rupees per square foot, and we can share the full breakup on email. It is competitive for a branded developer in this micro-market.",
        start_ms: 85500,
        end_ms: 94000,
        word_count: 29,
      },
      {
        speaker_id: 1,
        role: "prospect",
        text: "Saturday around ten works. If the sample flat matches what we discussed, we can discuss token amount on the spot.",
        start_ms: 179500,
        end_ms: 185500,
        word_count: 21,
      },
      {
        speaker_id: 0,
        role: "rep",
        text: "Excellent. I will block ten AM and share the site map and visitor pass. Thank you for your time, Rajesh — speak soon.",
        start_ms: 186000,
        end_ms: 192000,
        word_count: 24,
      },
    ],
    suggestions: [
      {
        generation_id: 101,
        trigger_query: "What is the carpet area for the three BHK configuration?",
        suggestion_text:
          "Carpet area is 980 sq.ft for standard 3BHK (Tower B). Attached sundeck is 62 sq.ft. Mention ceiling height of 10.2 ft.",
        from_cache: false,
        sources: ["Grandview_Master_Brochure.pdf#page=14"],
        latency_ms: 680,
        created_at: isoDaysAgo(0, 2),
      },
      {
        generation_id: 102,
        trigger_query: "Worried about the maintenance charges.",
        suggestion_text:
          "Clarify maintenance is ₹12/sq.ft (approx ₹11,760/mo) covering 50+ amenities, Olympic-sized swimming pool, and 24/7 security.",
        from_cache: true,
        sources: ["Maintenance_Schedule_2026.pdf#page=2"],
        latency_ms: 210,
        created_at: isoDaysAgo(0, 2),
      },
      {
        generation_id: 103,
        trigger_query: "Saturday around ten works... discuss token amount.",
        suggestion_text:
          "Confirm slot with VIP site visit pass. Offer complimentary valet and sample flat tour with Senior Relationship Manager.",
        from_cache: false,
        sources: ["Booking_Policy_Tower.docx#section=token"],
        latency_ms: 740,
        created_at: isoDaysAgo(0, 2),
      },
    ],
  },
};

export const MOCK_ANALYSES: Record<string, CallAnalysis> = {
  "call-001": {
    conversation_id: "call-001",
    status: "completed",
    version: 1,
    model: "gemini-3.5-flash",
    talk_goals: {
      rep_talk_min_pct: 35,
      rep_talk_max_pct: 55,
      listening_min: 80,
      questions_per_call: 6.0,
      response_sec_max: 5.0,
    },
    metrics: {
      rep_talk_pct: 44,
      prospect_talk_pct: 56,
      rep_questions_count: 8,
      avg_response_delay_sec: 1.8,
      listening_score: 92,
    },
    analysis: {
      executive_summary:
        "Rajesh called regarding a 3BHK in Goregaon West with sea view interest. Budget aligned at ₹2.2 Cr. Rep effectively resolved maintenance queries, differentiated against competing developer, and closed a Saturday 10:00 AM site visit with on-spot token willingness.",
      primary_intent: "property_inquiry",
      interest_score: 88,
      conversion_pct: 76,
      conversion_rationale:
        "Buyer confirmed budget ceiling, specified clear move-in timeline, requested pricing dossier, and committed to visit with payment readiness.",
      buying_signals: [
        {
          signal: "Site visit confirmed",
          evidence_quote: "Saturday around ten works",
          confidence: 0.95,
        },
        {
          signal: "Token amount commitment",
          evidence_quote: "we can discuss token amount on the spot",
          confidence: 0.91,
        },
        {
          signal: "Budget verified",
          evidence_quote: "two crore, maybe stretch to two point two",
          confidence: 0.88,
        },
        {
          signal: "Documentation requested",
          evidence_quote: "send the brochure, payment plan, and maintenance sheet",
          confidence: 0.85,
        },
      ],
      objections: [
        {
          objection: "Maintenance cost scrutiny",
          evidence_quote: "worried about the maintenance charges",
          severity: "medium",
        },
        {
          objection: "Competitor comparison",
          evidence_quote: "comparing competing developments in the same belt",
          severity: "low",
        },
      ],
      phases: [
        {
          label: "Start of call",
          score: 78,
          note: "Warm introduction, clear budget discovery established within 60 seconds.",
          quote: "How can I help you today? ... looking for a three BHK",
          judged: true,
        },
        {
          label: "Middle of call",
          score: 84,
          note: "Addressed maintenance fees factually; presented Tower B inventory.",
          quote: "Maintenance here is roughly twelve rupees per square foot",
          judged: true,
        },
        {
          label: "End of call",
          score: 94,
          note: "Strong close: confirmed date, time, and sample flat token discussion.",
          quote: "Saturday around ten works... discuss token on the spot",
          judged: true,
        },
      ],
      sentiment_score: 88,
      blocker: "Maintenance fee clarity",
      blocker_reason: "Prospect experienced unexpected escalation on society charges in previous project.",
      next_action: "Email payment schedule & brochure before Saturday morning site visit.",
      next_action_due: "Friday, 6:00 PM",
      pivotal: [
        {
          start_ms: 21500,
          label: "Budget disclosure",
          quote: "around two crore, maybe stretch to two point two",
          why_it_matters: "Anchored discovery to a high-ticket qualification bracket immediately.",
        },
        {
          start_ms: 85500,
          label: "Maintenance objection handled",
          quote: "roughly twelve rupees per square foot, with full breakup",
          why_it_matters: "Reassured prospect before hesitation could stall the buying process.",
        },
        {
          start_ms: 179500,
          label: "Closing agreement",
          quote: "we can discuss token amount on the spot",
          why_it_matters: "Converted discovery call into a high-probability in-person closing opportunity.",
        },
      ],
      strengths: [
        "Uncovered budget and timeline within the first two turns",
        "Gave concrete numbers for maintenance rather than vague assurances",
        "Directly asked for the weekend site visit",
      ],
      coaching: [
        {
          area: "Bank Subvention",
          recommendation: "Clarify Partner Bank vs National Bank subvention interest rates ahead of the Saturday visit.",
          example_moment_ms: 144000,
        },
      ],
    },
  },
};

export const MOCK_KNOWLEDGE_SOURCES: KnowledgeSource[] = [
  {
    id: "kb-001",
    filename: "Grandview_Master_Brochure.pdf",
    file_type: "pdf",
    file_size: 4210500,
    status: "ready",
    chunk_count: 84,
    error: null,
    created_at: isoDaysAgo(14),
    synced_at: isoDaysAgo(14),
  },
  {
    id: "kb-002",
    filename: "Tower_Habitat_Thane_Price_List_Q3_2026.xlsx",
    file_type: "csv",
    file_size: 154200,
    status: "ready",
    chunk_count: 32,
    error: null,
    created_at: isoDaysAgo(10),
    synced_at: isoDaysAgo(10),
  },
  {
    id: "kb-003",
    filename: "Customer_FAQ_and_Specs.docx",
    file_type: "docx",
    file_size: 890400,
    status: "ready",
    chunk_count: 48,
    error: null,
    created_at: isoDaysAgo(7),
    synced_at: isoDaysAgo(7),
  },
  {
    id: "kb-004",
    filename: "Bank_Loan_Tieups_and_Subvention_Schemes.pdf",
    file_type: "pdf",
    file_size: 1240000,
    status: "ready",
    chunk_count: 20,
    error: null,
    created_at: isoDaysAgo(3),
    synced_at: isoDaysAgo(3),
  },
];
