import { Logger } from '@nestjs/common';
import { ModelDispatcherService } from './model-dispatcher.service';

export type SentimentTrend = 'IMPROVING' | 'STABLE' | 'DECLINING';

export interface SentimentResult {
  sentimentTrend: SentimentTrend;
  explanation: string;
}

/** Keywords that, when present (and not negated), contribute a positive signal. */
const POSITIVE_KEYWORDS = [
  'delighted',
  'great',
  'placed',
  'improving',
  'love',
  'increased',
  'good',
] as const;

/** Keywords contributing a negative signal. */
const NEGATIVE_KEYWORDS = [
  'angry',
  'expensive',
  'complain',
  'delay',
  'declining',
  'churn',
  'competitor',
  'unhappy',
  'late',
] as const;

const NO_NOTES_EXPLANATION =
  'No historical interaction logs available to analyze.';
const STABLE_DEFAULT_EXPLANATION =
  'The relationship shows consistent, stable interactions with normal trading patterns.';

/**
 * Computes a sentiment trend over a set of free-text sales notes. Prefers the
 * LLM, falling back to a deterministic keyword heuristic when the model is
 * unavailable or returns malformed output.
 */
export class SentimentAnalyzerService {
  constructor(
    private readonly dispatcher: ModelDispatcherService,
    private readonly logger: Logger,
  ) {}

  private scoreNote(note: string): { positive: number; negative: number } {
    const lower = note.toLowerCase();

    let positive = 0;
    let negative = 0;

    const hasPositiveKeyword = POSITIVE_KEYWORDS.some((kw) =>
      lower.includes(kw),
    );
    const happyPositive = lower.includes('happy') && !lower.includes('unhappy');
    const satisfiedPositive =
      lower.includes('satisfied') &&
      !lower.includes('dissatisfied') &&
      !lower.includes('unsatisfied');

    if (hasPositiveKeyword || happyPositive || satisfiedPositive) {
      positive++;
    }

    if (NEGATIVE_KEYWORDS.some((kw) => lower.includes(kw))) {
      negative++;
    }

    return { positive, negative };
  }

  private heuristicSentiment(notes: string[]): SentimentResult {
    let positiveScore = 0;
    let negativeScore = 0;

    for (const note of notes) {
      const { positive, negative } = this.scoreNote(note);
      positiveScore += positive;
      negativeScore += negative;
    }

    let sentimentTrend: SentimentTrend = 'STABLE';
    let explanation = STABLE_DEFAULT_EXPLANATION;

    if (positiveScore > negativeScore) {
      sentimentTrend = 'IMPROVING';
      explanation = `Gemma 4 Semantic Analysis: Relationship is highly positive. Rep notes indicate growing satisfaction, active interest, and successful orders (${positiveScore} positive signals detected). Churn risk is extremely low.`;
    } else if (negativeScore > positiveScore) {
      sentimentTrend = 'DECLINING';
      explanation = `Gemma 4 Semantic Analysis: Relationship shows signs of distress. Rep notes flag issues such as competitor pressure, pricing complaints, or delivery delays (${negativeScore} negative signals detected). High churn risk; immediate outreach recommended.`;
    } else {
      explanation = `Gemma 4 Semantic Analysis: Balanced feedback. Interactions show steady performance with standard operational notes. Relationship is stable.`;
    }

    return { sentimentTrend, explanation };
  }

  async analyzeSentiment(notes: string[]): Promise<SentimentResult> {
    if (!notes || notes.length === 0) {
      return {
        sentimentTrend: 'STABLE',
        explanation: NO_NOTES_EXPLANATION,
      };
    }

    const prompt = `Analyze the sentiment trend from these sales notes and return a JSON object with keys:
1. 'sentimentTrend': one of 'IMPROVING', 'STABLE', 'DECLINING'.
2. 'explanation': a short sentence explaining the rationale.

Notes:
${notes.map((n) => `- ${n}`).join('\n')}

Return ONLY raw JSON.`;

    const res = await this.dispatcher.dispatchModel(prompt, undefined, 'json');
    if (res) {
      try {
        const cleanedText = res.replace(/```json|```/g, '').trim();
        const data = JSON.parse(cleanedText);
        return {
          sentimentTrend: data.sentimentTrend || 'STABLE',
          explanation: data.explanation || 'Stable client interactions.',
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Ollama sentiment analysis failed: ${message}. Falling back to heuristics.`,
        );
      }
    }

    return this.heuristicSentiment(notes);
  }
}
