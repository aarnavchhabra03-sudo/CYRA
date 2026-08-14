import type { RelationshipType } from '@/lib/adaptive/knowledge-graph';

export type SourceType = 'arxiv' | 'academic' | 'web' | 'course';

export type EvidenceLevel = 'primary' | 'academic' | 'secondary' | 'general';

export type ResearchIntent =
  | 'definition'
  | 'explanation'
  | 'comparison'
  | 'implementation'
  | 'historical'
  | 'current_research'
  | 'troubleshooting'
  | 'literature_review'
  | 'general';

export interface ResearchSource {
  id: string;
  title: string;
  url: string;
  description: string;
  snippet?: string;
  fullText?: string;
  authors?: string[];
  publishedAt?: string;
  source: string;
  domain: string;
  relevanceScore: number; // Bounded 0-100
  authorityScore?: number; // Bounded 0-100
  recencyScore?: number;
  overallScore?: number;
  sourceType: SourceType;
  evidenceLevel: EvidenceLevel;
  whySourceReasons: string[]; // 1-2 subtle signals
  arxivId?: string;
  categories?: string[];
}

export interface ResearchCitation {
  id: string;
  index: number;
  sourceId: string;
  title: string;
  source: string;
  domain: string;
  url: string;
  authors?: string[];
  publishedAt?: string;
}

export interface ResearchFinding {
  title: string;
  explanation: string;
  citationIds: string[];
}

export interface ResearchSourceAgreement {
  statement: string;
  citationIds: string[];
}

export interface ResearchSourceDisagreement {
  statement: string;
  citationIds: string[];
}

export interface ResearchBrief {
  title: string;
  executiveSummary: string;
  keyFindings: ResearchFinding[];
  sourceAgreement: ResearchSourceAgreement[];
  sourceDifferences: ResearchSourceDisagreement[];
  practicalTakeaways: string[];
  suggestedLearningTopics: string[];
  citations: ResearchCitation[];
  generatedAt: string;
}

export interface ResearchSearchRequest {
  query: string;
  filter?: 'all' | 'academic' | 'arxiv' | 'web';
  sortBy?: 'relevance' | 'newest';
}

export interface ProviderStatus {
  arxiv: 'ok' | 'failed' | 'rate_limited';
  tavily: 'ok' | 'failed' | 'disabled';
}

export interface ResearchSearchResponse {
  query: string;
  intent: ResearchIntent;
  results: ResearchSource[];
  sources: {
    arxiv: number;
    academic: number;
    web: number;
  };
  providerStatus: ProviderStatus;
  totalCount: number;
}

export interface ResearchSynthesisRequest {
  query: string;
  sources: ResearchSource[];
}

export interface ResearchSynthesisResponse {
  success: boolean;
  data?: ResearchBrief;
  error?: string;
  code?: string;
}

export interface SavedResearchLearningStatus {
  learningPathId: string;
  learningPathTitle: string;
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
  hasDecay: boolean;
  lastActivityAt: string | null;
}

export interface SavedResearchDocument {
  id: string;
  userId: string;
  title: string;
  query: string;
  intent: ResearchIntent;
  brief: ResearchBrief;
  learningPathId: string | null;
  learningStatus?: SavedResearchLearningStatus | null;
  createdAt: string;
  updatedAt: string;
  annotationCount?: number;
}

// Stage 14.2 Research Intelligence Models
export type ResearchRecommendationType =
  | 'MASTERY_GAP'
  | 'MEMORY_DECAY'
  | 'BLOCKED_PREREQUISITE'
  | 'NEXT_LESSON'
  | 'RESEARCH_FOLLOWUP'
  | 'RESEARCH_DEPTH'
  | 'RELATED_TOPIC'
  | 'LITERATURE_REVIEW';

export interface ResearchKnowledgeGap {
  concept: string;
  masteryScore: number;
  effectiveMasteryScore: number;
  hasDecay: boolean;
  isBlocked: boolean;
  reason: string;
  lessonId?: string;
  learningPathId?: string;
}

export interface ResearchRecommendation {
  id: string;
  topic: string;
  searchQuery: string;
  reason: string;
  reasonsList: string[];
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  score: number; // Bounded 0-100
  recommendationType: ResearchRecommendationType;
  relatedConcept?: string;
  relatedLearningPathId?: string;
  relatedLearningPathTitle?: string;
  relatedLessonId?: string;
  relatedLessonTitle?: string;
}

export interface ResearchActivityItem {
  id: string;
  title: string;
  query: string;
  intent: ResearchIntent;
  citationCount: number;
  savedAt: string;
  learningPathId?: string | null;
}

export interface ResearchLearningConnection {
  learningPathId: string;
  learningPathTitle: string;
  progressPercent: number;
  exploredTopicsCount: number;
  linkedBriefsCount: number;
  knowledgeGapsCount: number;
  topRecommendation?: ResearchRecommendation | null;
}

export interface ResearchIntelligenceData {
  hasLearningHistory: boolean;
  currentLearningPath?: {
    id: string;
    title: string;
    currentModuleTitle?: string;
    currentLessonTitle?: string;
    progressPercent: number;
    completedLessons: number;
    totalLessons: number;
  } | null;
  knowledgeGaps: ResearchKnowledgeGap[];
  recommendations: ResearchRecommendation[];
  recentActivity: ResearchActivityItem[];
  learningConnections: ResearchLearningConnection[];
}

export interface ResearchIntelligenceResponse {
  success: boolean;
  data?: ResearchIntelligenceData;
  error?: string;
  code?: string;
}

// Stage 14.3 Multi-Source Literature Review Models
export interface LiteratureTheme {
  id: string;
  theme: string;
  explanation: string;
  citationIds: string[];
}

export interface LiteratureAgreement {
  id: string;
  claim: string;
  supportingSummary: string;
  citationIds: string[];
}

export interface LiteratureDisagreement {
  id: string;
  topic: string;
  perspectiveA: string;
  perspectiveB: string;
  citationIds: string[];
}

export interface LiteratureResearchGap {
  id: string;
  statement: string;
  supportingCitationIds: string[];
}

export interface LiteratureOpenQuestion {
  id: string;
  question: string;
  motivation: string;
  supportingCitationIds: string[];
}

export interface LiteratureCitation {
  id: string;
  index: number; // 1, 2, 3...
  title: string;
  url: string;
  domain: string;
  snippet?: string;
  authors?: string[];
  publishedDate?: string;
  sourceType: SourceType;
  authorityScore?: number;
}

export interface LiteratureReview {
  id?: string;
  title: string;
  researchQuestion: string;
  executiveSummary: string;
  scope: 'comparative' | 'thematic' | 'general';
  themes: LiteratureTheme[];
  agreements: LiteratureAgreement[];
  disagreements: LiteratureDisagreement[];
  researchGaps: LiteratureResearchGap[];
  openQuestions: LiteratureOpenQuestion[];
  learningRecommendations: string[];
  citations: LiteratureCitation[];
  sourceDocumentIds: string[];
  generatedAt: string;
}

export interface LiteratureReviewRequest {
  researchDocumentIds: string[];
  researchQuestion?: string;
  scope?: 'comparative' | 'thematic' | 'general';
  maxSources?: number;
}

export interface LiteratureReviewResponse {
  success: boolean;
  data?: LiteratureReview;
  error?: string;
  code?: string;
}

// Stage 14.4 Research Export & Citation Workstation Models
export type ResearchExportFormat = 'pdf' | 'markdown' | 'bibtex' | 'ris';
export type ResearchCitationStyle = 'apa' | 'mla' | 'chicago' | 'plain';
export type ResearchExportDocumentType = 'research_brief' | 'literature_review' | 'bulk_citations';

export interface ResearchExportRequest {
  documentType: ResearchExportDocumentType;
  documentId?: string;
  documentIds?: string[];
  format: ResearchExportFormat;
  citationStyle?: ResearchCitationStyle;
}

export interface ResearchExportResponse {
  success: boolean;
  content?: string;
  filename?: string;
  contentType?: string;
  error?: string;
  code?: string;
}

// Stage 14.5 Personal Research Notes & Citation Annotation Models
export type ResearchAnnotationType = 'note' | 'highlight' | 'evidence';

export interface ResearchAnnotation {
  id: string;
  userId: string;
  researchDocumentId: string;
  citationId?: string | null;
  annotationType: ResearchAnnotationType;
  selectedText?: string | null;
  note: string;
  sourceUrl?: string | null;
  sourceTitle?: string | null;
  positionStart?: number | null;
  positionEnd?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ResearchAnnotationCreateRequest {
  researchDocumentId: string;
  citationId?: string | null;
  annotationType?: ResearchAnnotationType;
  selectedText?: string | null;
  note: string;
  sourceUrl?: string | null;
  sourceTitle?: string | null;
  positionStart?: number | null;
  positionEnd?: number | null;
}

export interface ResearchAnnotationUpdateRequest {
  note?: string;
  annotationType?: ResearchAnnotationType;
  selectedText?: string | null;
}

export interface ResearchAnnotationResponse {
  success: boolean;
  data?: ResearchAnnotation;
  alreadyExists?: boolean;
  error?: string;
  code?: string;
}

export interface ResearchAnnotationsResponse {
  success: boolean;
  data?: ResearchAnnotation[];
  count?: number;
  error?: string;
  code?: string;
}

// Stage 14.6 Research Evidence -> Knowledge Graph Models
export type KnowledgeNodeType =
  | 'existing_concept'
  | 'new_concept'
  | 'matched_concept';

export type KnowledgeMatchStatus =
  | 'exact_match'
  | 'fuzzy_match'
  | 'unmatched';

export type KnowledgeMapStatus =
  | 'pending'
  | 'approved'
  | 'rejected';

export interface ResearchKnowledgeNode {
  id: string;
  label: string;
  normalizedLabel: string;
  nodeType: KnowledgeNodeType;
  matchStatus: KnowledgeMatchStatus;
  matchedExistingConcept: string | null;
  confidence: number;
  evidence: string;
  citationIds: string[];
  masteryScore: number | null;
  effectiveMasteryScore: number | null;
  isApproved: boolean;
}

export interface ResearchKnowledgeEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationshipType: RelationshipType;
  strength: number;
  confidence: number;
  evidence: string;
  citationIds: string[];
  isApproved: boolean;
}

export interface ResearchKnowledgeMap {
  id: string;
  userId: string;
  researchDocumentId: string;
  title: string;
  status: KnowledgeMapStatus;
  nodes: ResearchKnowledgeNode[];
  edges: ResearchKnowledgeEdge[];
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProposeKnowledgeMapRequest {
  researchDocumentId: string;
}

export interface ApproveKnowledgeMapRequest {
  approvedNodeIds?: string[];
  approvedEdgeIds?: string[];
}









