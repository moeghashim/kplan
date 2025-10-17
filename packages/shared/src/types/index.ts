// Tweet types
export type TweetStatus = 'pending' | 'analyzed' | 'ready_for_tagging' | 'tagged';
export type UserTag = 'learn' | 'repurpose';

export interface TweetAnalysis {
  summary: string | null;
  topics: string[] | null;
  suggestedLabels: string[] | null;
  confidence: number | null;
}

export interface Tweet {
  id: string;
  userId: string;
  tweetId: string | null;
  url: string | null;
  authorHandle: string | null;
  text: string;
  createdAt: string;
  collectedAt: string;
  status: TweetStatus;
  userTag: UserTag | null;
  analysis: TweetAnalysis | null;
}

// Learning Path types
export interface LearningPath {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}

// Label types
export interface Label {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  learningPathId: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

// Tweet-Label join
export interface TweetLabel {
  id: string;
  userId: string;
  tweetId: string;
  labelId: string;
  position: number;
  createdAt: string;
}

// Feynman types
export type FeynmanStage = 'choose' | 'explain' | 'gaps' | 'simplify' | 'complete';

export interface FeynmanSession {
  id: string;
  userId: string;
  labelId: string;
  stage: FeynmanStage;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ExplanationComplexity = 'simple' | 'ok' | 'too complex';

export interface LLMEvaluation {
  clarity: number | null;
  gradeLevel: number | null;
  complexity: ExplanationComplexity | null;
  keyPoints: string[] | null;
  suggestedGaps: string[] | null;
}

export interface Explanation {
  id: string;
  userId: string;
  sessionId: string;
  version: number;
  audience: string | null;
  text: string;
  llmEvaluation: LLMEvaluation | null;
  createdAt: string;
}

export interface Gap {
  id: string;
  userId: string;
  sessionId: string;
  explanationVersion: number | null;
  description: string;
  tweetIds: string[] | null;
  resolved: boolean;
  resolutionNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

// Response types
export interface LearningPathWithDetails extends LearningPath {
  labels: Label[];
  tweetsByLabel: Record<string, Tweet[]>;
}

export interface FeynmanSessionWithDetails extends FeynmanSession {
  explanations: Explanation[];
  gaps: Gap[];
}
