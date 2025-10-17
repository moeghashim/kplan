import { z } from 'zod';

// Tweet schemas
export const tweetStatusSchema = z.enum(['pending', 'analyzed', 'ready_for_tagging', 'tagged']);
export const userTagSchema = z.enum(['learn', 'repurpose']);

export const tweetAnalysisSchema = z.object({
  summary: z.string().nullable(),
  topics: z.array(z.string()).nullable(),
  suggestedLabels: z.array(z.string()).nullable(),
  confidence: z.number().min(0).max(1).nullable(),
});

export const createTweetSchema = z.object({
  text: z.string().optional(),
  url: z.string().url().optional(),
}).refine(data => data.text || data.url, {
  message: 'Either text or url must be provided',
});

export const tagTweetSchema = z.object({
  userTag: userTagSchema,
});

export const getTweetsQuerySchema = z.object({
  status: tweetStatusSchema.optional(),
  userTag: userTagSchema.optional(),
  labelId: z.string().uuid().optional(),
  pathId: z.string().uuid().optional(),
  q: z.string().optional(),
});

// Learning Path schemas
export const createLearningPathSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
  position: z.number().int().nonnegative().optional(),
});

export const updateLearningPathSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().nullable().optional(),
  position: z.number().int().nonnegative().optional(),
});

// Label schemas
export const createLabelSchema = z.object({
  name: z.string().min(1).max(100),
  learningPathId: z.string().uuid(),
  description: z.string().nullable().optional(),
  position: z.number().int().nonnegative().optional(),
});

export const updateLabelSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().nullable().optional(),
  position: z.number().int().nonnegative().optional(),
  learningPathId: z.string().uuid().optional(),
});

export const attachTweetSchema = z.object({
  tweetId: z.string().uuid(),
  position: z.number().int().nonnegative().optional(),
});

export const detachTweetSchema = z.object({
  tweetId: z.string().uuid(),
});

// Feynman schemas
export const feynmanStageSchema = z.enum(['choose', 'explain', 'gaps', 'simplify', 'complete']);

export const createFeynmanSessionSchema = z.object({
  labelId: z.string().uuid(),
});

export const createExplanationSchema = z.object({
  text: z.string().min(1),
  audience: z.string().nullable().optional(),
});

export const simplifyExplanationSchema = z.object({
  audience: z.string().optional(),
});

export const createGapSchema = z.object({
  description: z.string().min(1),
  tweetIds: z.array(z.string().uuid()).nullable().optional(),
});

export const updateGapSchema = z.object({
  description: z.string().min(1).optional(),
  tweetIds: z.array(z.string().uuid()).nullable().optional(),
  resolved: z.boolean().optional(),
  resolutionNote: z.string().nullable().optional(),
});

// LLM Response schemas
export const llmTweetAnalysisSchema = z.object({
  summary: z.string().max(200),
  topics: z.array(z.string()),
  suggestedLabels: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

export const llmExplanationEvaluationSchema = z.object({
  clarity: z.number().min(0).max(1),
  gradeLevel: z.number().int(),
  complexity: z.enum(['simple', 'ok', 'too complex']),
  keyPoints: z.array(z.string()),
  suggestedGaps: z.array(z.string()),
});

export const llmGapSuggestionsSchema = z.object({
  suggestions: z.array(z.string()),
});
