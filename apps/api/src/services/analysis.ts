import OpenAI from 'openai';
import { llmTweetAnalysisSchema, llmExplanationEvaluationSchema, llmGapSuggestionsSchema } from '@kplan/shared';
import type { TweetAnalysis, LLMEvaluation } from '@kplan/shared';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class AnalysisService {
  async analyzeTweet(text: string): Promise<TweetAnalysis> {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a classifier that summarizes tweets and proposes 1-3 short labels for learning path organization.',
          },
          {
            role: 'user',
            content: `Tweet: ${text}. Respond with JSON: { summary: string (<= 200 chars), topics: string[], suggestedLabels: string[] (short, kebab/snake case), confidence: 0..1 }`,
          },
        ],
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const parsed = JSON.parse(content);
      const validated = llmTweetAnalysisSchema.parse(parsed);

      return validated;
    } catch (error) {
      console.error('Error analyzing tweet:', error);
      return {
        summary: null,
        topics: null,
        suggestedLabels: null,
        confidence: null,
      };
    }
  }

  async evaluateExplanation(
    explanation: string,
    audience: string | null,
    contextTweets: string[]
  ): Promise<LLMEvaluation> {
    try {
      const contextBullets = contextTweets.length > 0
        ? `Context tweets:\n${contextTweets.map(t => `- ${t}`).join('\n')}\n\n`
        : '';

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a clear, strict evaluator of explanations. Be concise and concrete.',
          },
          {
            role: 'user',
            content: `${contextBullets}Explanation (audience=${audience || 'general'}): ${explanation}. Output JSON: { clarity: 0..1, gradeLevel: int, complexity: 'simple' | 'ok' | 'too complex', keyPoints: string[], suggestedGaps: string[] }`,
          },
        ],
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const parsed = JSON.parse(content);
      const validated = llmExplanationEvaluationSchema.parse(parsed);

      return validated;
    } catch (error) {
      console.error('Error evaluating explanation:', error);
      return {
        clarity: null,
        gradeLevel: null,
        complexity: null,
        keyPoints: null,
        suggestedGaps: null,
      };
    }
  }

  async suggestGaps(
    explanation: string,
    labelName: string,
    tweetSummaries: string[]
  ): Promise<string[]> {
    try {
      const context = tweetSummaries.length > 0
        ? `Tweet summaries:\n${tweetSummaries.map(s => `- ${s}`).join('\n')}\n\n`
        : '';

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You identify missing knowledge and assumptions in an explanation.',
          },
          {
            role: 'user',
            content: `${context}Topic: ${labelName}\n\nExplanation: ${explanation}\n\nList specific knowledge gaps and unstated assumptions the learner should research. Output JSON: { suggestions: string[] }`,
          },
        ],
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const parsed = JSON.parse(content);
      const validated = llmGapSuggestionsSchema.parse(parsed);

      return validated.suggestions;
    } catch (error) {
      console.error('Error suggesting gaps:', error);
      return [];
    }
  }

  async simplifyExplanation(
    explanation: string,
    audience: string
  ): Promise<{ draftText: string; notes: string[] }> {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You rewrite content for a specified audience with maximum simplicity and fidelity.',
          },
          {
            role: 'user',
            content: `Explanation: ${explanation}\n\nAudience: ${audience}\n\nRewrite it in simpler terms while preserving correctness. Output plain text plus 3 bullets: what changed, any lost nuance, suggested analogy.`,
          },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const lines = content.split('\n').filter(l => l.trim());
      const draftText = lines[0] || explanation;
      const notes = lines.slice(1).map(l => l.replace(/^[-•*]\s*/, ''));

      return { draftText, notes };
    } catch (error) {
      console.error('Error simplifying explanation:', error);
      return {
        draftText: explanation,
        notes: ['Error during simplification'],
      };
    }
  }
}

export const analysisService = new AnalysisService();
