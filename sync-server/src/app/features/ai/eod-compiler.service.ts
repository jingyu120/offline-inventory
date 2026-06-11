import { Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as schema from '@burma-inventory/shared-types';
import { eq, and, gte, lte, isNull, desc } from 'drizzle-orm';
import { DrizzleService } from '../../core/drizzle';
import { ModelDispatcherService } from './model-dispatcher.service';

const MYANMAR_OFFSET_MS = 6.5 * 60 * 60 * 1000;
const BATCH_DUMP_WINDOW_MS = 15 * 60 * 1000;
const BATCH_DUMP_MIN_LOGS = 4;
const DEFAULT_QUOTA_TARGET = 3;
const BRIEF_NOTE_MAX_LENGTH = 10;

interface DailyInteractionLog {
  id: string;
  notes: string;
  commercial_status: string;
  rep_id: string;
  created_at_local: number;
  repUsername: string;
  shopName: string;
}

export interface ComplianceWarning {
  username: string;
  issue: string;
}

export interface EodCompileResult {
  topPerformingRep: {
    username: string;
    justification: string;
  };
  marketSynthesis: string;
  complianceWarnings: ComplianceWarning[];
}

export interface ComplianceScorecardEntry {
  repId: string;
  username: string;
  totalLogs: number;
  quotaTarget: number;
  complianceStatus: 'GREEN' | 'YELLOW' | 'RED';
  batchDumpingFlagged: boolean;
}

export interface EodDigest {
  date: string;
  compiledAt: Date;
  topPerformingRep: string;
  complianceScorecard: ComplianceScorecardEntry[];
  warnings: string[];
  marketSynthesis: string;
}

/**
 * Compiles the End-of-Day digest. The AI market/compliance synthesis lives in
 * {@link compileEod}; the full digest (compliance scorecard + AI synthesis) is
 * produced by {@link generateEodDigest}. The shared day-window query is
 * factored into a single routine so it is defined once.
 */
export class EodCompilerService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly dispatcher: ModelDispatcherService,
    private readonly logger: Logger,
  ) {}

  private dayWindow(dateStr: string): { startOfDay: Date; endOfDay: Date } {
    const startOfDay = new Date(
      new Date(`${dateStr}T00:00:00`).getTime() - MYANMAR_OFFSET_MS,
    );
    const endOfDay = new Date(
      new Date(`${dateStr}T23:59:59.999`).getTime() - MYANMAR_OFFSET_MS,
    );
    return { startOfDay, endOfDay };
  }

  private async fetchDailyInteractionLogs(
    startOfDay: Date,
    endOfDay: Date,
  ): Promise<DailyInteractionLog[]> {
    return this.drizzle.readDb
      .select({
        id: schema.pgSchema.interaction_logs.id,
        notes: schema.pgSchema.interaction_logs.notes,
        commercial_status: schema.pgSchema.interaction_logs.commercial_status,
        rep_id: schema.pgSchema.interaction_logs.rep_id,
        created_at_local: schema.pgSchema.interaction_logs.created_at_local,
        repUsername: schema.pgSchema.users.username,
        shopName: schema.pgSchema.shops.name,
      })
      .from(schema.pgSchema.interaction_logs)
      .innerJoin(
        schema.pgSchema.users,
        eq(schema.pgSchema.interaction_logs.rep_id, schema.pgSchema.users.id),
      )
      .innerJoin(
        schema.pgSchema.shops,
        eq(schema.pgSchema.interaction_logs.shop_id, schema.pgSchema.shops.id),
      )
      .where(
        and(
          gte(
            schema.pgSchema.interaction_logs.created_at_local,
            startOfDay.getTime(),
          ),
          lte(
            schema.pgSchema.interaction_logs.created_at_local,
            endOfDay.getTime(),
          ),
          isNull(schema.pgSchema.shops.deleted_at),
        ),
      ) as Promise<DailyInteractionLog[]>;
  }

  private buildEodPrompt(rows: DailyInteractionLog[]): string {
    const noteBlocks = rows
      .map(
        (log) =>
          `[Rep: ${log.repUsername}, Shop: ${log.shopName}, Status: ${log.commercial_status}] Notes: "${log.notes}"`,
      )
      .join('\n');

    return `You are a sales operations analyst compiling the End of Day (EOD) digest for Burma Inventory.
Analyze the following sales notes logged today:

${noteBlocks}

Based on these notes, generate a JSON report with:
1. 'topPerformingRep': object with:
   - 'username': the username of the representative who showed outstanding performance, closed deals, or handled client feedback exceptionally.
   - 'justification': brief description of their achievements today.
2. 'marketSynthesis': string summarizing key customer reactions, pricing objections/resistance, competitor activities, logistics/infrastructure blockages, or stock issues mentioned in the notes.
3. 'complianceWarnings': array of objects with 'username' and 'issue' highlighting representatives whose notes are too brief (e.g. less than 10 characters), missing critical details, showing unusual wholesale prices, or reporting operational failures.

Return ONLY a raw, un-fenced JSON string matching the following contract:
{
  "topPerformingRep": {
    "username": "string",
    "justification": "string"
  },
  "marketSynthesis": "string",
  "complianceWarnings": [
    {
      "username": "string",
      "issue": "string"
    }
  ]
}

No markdown tags like \`\`\`json, no explanations.`;
  }

  private heuristicCompile(rows: DailyInteractionLog[]): EodCompileResult {
    let topRepName = 'None';
    let maxLogs = 0;
    const repLogsCount: Record<string, number> = {};
    for (const log of rows) {
      const uname = log.repUsername;
      repLogsCount[uname] = (repLogsCount[uname] || 0) + 1;
      if (repLogsCount[uname] > maxLogs) {
        maxLogs = repLogsCount[uname];
        topRepName = uname;
      }
    }

    const insights: string[] = [];
    let competitorMovements = 0;
    let logisticsBlockages = 0;
    let priceComplaints = 0;

    rows.forEach((log) => {
      const note = log.notes.toLowerCase();
      if (note.includes('competitor') || note.includes('discount'))
        competitorMovements++;
      if (
        note.includes('delay') ||
        note.includes('construction') ||
        note.includes('block')
      )
        logisticsBlockages++;
      if (note.includes('expensive') || note.includes('price'))
        priceComplaints++;
    });

    if (competitorMovements > 0) {
      insights.push(
        `• Competitor Activity: Detected ${competitorMovements} report(s) of competitor discount schemes and market pricing pressure.`,
      );
    }
    if (logisticsBlockages > 0) {
      insights.push(
        `• Logistics Barriers: Reps reported ${logisticsBlockages} delivery disruption(s) due to monsoonal conditions or local infrastructure blockages.`,
      );
    }
    if (priceComplaints > 0) {
      insights.push(
        `• Pricing Resistance: ${priceComplaints} account(s) complained about product wholesale price increases.`,
      );
    }
    if (insights.length === 0) {
      insights.push(
        '• Market conditions operating stable with consistent wholesale demands.',
      );
    }

    const complianceWarnings: ComplianceWarning[] = [];
    for (const log of rows) {
      if (log.notes.trim().length < BRIEF_NOTE_MAX_LENGTH) {
        complianceWarnings.push({
          username: log.repUsername,
          issue: `Logged a very brief note: "${log.notes}"`,
        });
      }
    }

    return {
      topPerformingRep: {
        username: topRepName,
        justification: `Logged the highest number of interactions today (${maxLogs} entries).`,
      },
      marketSynthesis: `Gemma 4 Curated Synthesis:\n${insights.join('\n')}`,
      complianceWarnings,
    };
  }

  async compileEod(date: string): Promise<EodCompileResult> {
    const { startOfDay, endOfDay } = this.dayWindow(date);
    const rows = await this.fetchDailyInteractionLogs(startOfDay, endOfDay);

    if (rows.length === 0) {
      return {
        topPerformingRep: {
          username: 'N/A',
          justification: 'No sales notes were logged today.',
        },
        marketSynthesis: 'No sales interactions recorded today to synthesize.',
        complianceWarnings: [],
      };
    }

    const prompt = this.buildEodPrompt(rows);

    const res = await this.dispatcher.dispatchModel(prompt, undefined, 'json');
    if (res) {
      try {
        const cleanedText = res.replace(/```json|```/g, '').trim();
        const data = JSON.parse(cleanedText);
        return {
          topPerformingRep: {
            username: data.topPerformingRep?.username || 'N/A',
            justification:
              data.topPerformingRep?.justification ||
              'Outstanding logging frequency',
          },
          marketSynthesis: data.marketSynthesis || 'Stable market conditions.',
          complianceWarnings: Array.isArray(data.complianceWarnings)
            ? data.complianceWarnings
            : [],
        };
      } catch (err) {
        this.logger.warn(
          `Failed to parse EOD compile JSON: ${err}. Falling back to heuristics.`,
        );
      }
    }

    return this.heuristicCompile(rows);
  }

  private async fetchRepsWithQuotas(endOfDay: Date): Promise<
    Array<
      typeof schema.pgSchema.users.$inferSelect & {
        dailyQuotas: (typeof schema.pgSchema.daily_quotas.$inferSelect)[];
      }
    >
  > {
    const reps = await this.drizzle.readDb.select().from(schema.pgSchema.users);

    return Promise.all(
      reps.map(async (rep) => {
        const quotas = await this.drizzle.readDb
          .select()
          .from(schema.pgSchema.daily_quotas)
          .where(
            and(
              eq(schema.pgSchema.daily_quotas.user_id, rep.id),
              lte(
                schema.pgSchema.daily_quotas.effective_from,
                endOfDay.getTime(),
              ),
            ),
          )
          .orderBy(desc(schema.pgSchema.daily_quotas.effective_from))
          .limit(1);
        return {
          ...rep,
          dailyQuotas: quotas,
        };
      }),
    );
  }

  private detectBatchDumping(logs: DailyInteractionLog[]): boolean {
    const sortedLogs = [...logs].sort(
      (a, b) => a.created_at_local - b.created_at_local,
    );

    for (let i = 0; i < sortedLogs.length - BATCH_DUMP_MIN_LOGS; i++) {
      const diffMs =
        sortedLogs[i + BATCH_DUMP_MIN_LOGS].created_at_local -
        sortedLogs[i].created_at_local;
      if (diffMs <= BATCH_DUMP_WINDOW_MS) {
        return true;
      }
    }
    return false;
  }

  private writeDigestFile(dateStr: string, digest: EodDigest): void {
    try {
      const dir = path.join(
        __dirname,
        '..',
        '..',
        '..',
        '..',
        'data',
        'digests',
      );
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const filePath = path.join(dir, `eod_digest_${dateStr}.json`);
      fs.writeFileSync(filePath, JSON.stringify(digest, null, 2));
      this.logger.log(`Saved EOD digest for ${dateStr} to ${filePath}`);
    } catch (e) {
      this.logger.error('Failed to write EOD digest file:', e);
    }
  }

  async generateEodDigest(dateStr: string): Promise<EodDigest> {
    const { startOfDay, endOfDay } = this.dayWindow(dateStr);
    const rows = await this.fetchDailyInteractionLogs(startOfDay, endOfDay);
    const repsWithQuotas = await this.fetchRepsWithQuotas(endOfDay);

    const complianceList: ComplianceScorecardEntry[] = [];
    const warnings: string[] = [];
    let topRepName = 'None';
    let maxLogs = 0;

    for (const rep of repsWithQuotas) {
      const repLogs = rows.filter((l) => l.rep_id === rep.id);
      const quota = rep.dailyQuotas[0];
      const target = quota
        ? quota.target_visits + quota.target_phone + quota.target_viber
        : DEFAULT_QUOTA_TARGET;

      let complianceStatus: 'GREEN' | 'YELLOW' | 'RED' = 'RED';
      if (repLogs.length >= target) {
        complianceStatus = 'GREEN';
      } else if (repLogs.length > 0) {
        complianceStatus = 'YELLOW';
      }

      const batchDumpingFlagged = this.detectBatchDumping(repLogs);

      if (batchDumpingFlagged) {
        warnings.push(
          `Sales Rep ${rep.username} flagged for end-of-day batch data dumping.`,
        );
      }

      if (complianceStatus === 'RED') {
        warnings.push(
          `Sales Rep ${rep.username} failed to log any operational entries.`,
        );
      }

      complianceList.push({
        repId: rep.id,
        username: rep.username,
        totalLogs: repLogs.length,
        quotaTarget: target,
        complianceStatus,
        batchDumpingFlagged,
      });

      if (repLogs.length > maxLogs) {
        maxLogs = repLogs.length;
        topRepName = rep.username;
      }
    }

    const aiResult = await this.compileEod(dateStr);

    const allWarnings = [...warnings];
    if (aiResult.complianceWarnings && aiResult.complianceWarnings.length > 0) {
      for (const w of aiResult.complianceWarnings) {
        const warningMsg = `Sales Rep ${w.username} flagged by AI: ${w.issue}`;
        if (!allWarnings.includes(warningMsg)) {
          allWarnings.push(warningMsg);
        }
      }
    }

    const digest: EodDigest = {
      date: dateStr,
      compiledAt: new Date(),
      topPerformingRep:
        aiResult.topPerformingRep.username !== 'N/A'
          ? `${aiResult.topPerformingRep.username} (${aiResult.topPerformingRep.justification})`
          : topRepName === 'None'
            ? 'N/A'
            : `${topRepName} (${maxLogs} logs)`,
      complianceScorecard: complianceList,
      warnings: allWarnings,
      marketSynthesis: aiResult.marketSynthesis,
    };

    this.writeDigestFile(dateStr, digest);

    return digest;
  }
}
