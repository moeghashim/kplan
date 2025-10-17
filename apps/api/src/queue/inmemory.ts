import PQueue from 'p-queue';
import { supabaseAdmin } from '../db/supabaseAdmin.js';
import { analysisService } from '../services/analysis.js';

interface AnalyzeTweetJob {
  type: 'analyze_tweet';
  tweetId: string;
  userId: string;
  text: string;
}

type Job = AnalyzeTweetJob;

class JobQueue {
  private queue: PQueue;

  constructor() {
    this.queue = new PQueue({ concurrency: 5 });
    this.startWorker();
  }

  async enqueue(job: Job): Promise<void> {
    await this.queue.add(() => this.processJob(job));
  }

  private startWorker(): void {
    console.log('Job queue worker started');
  }

  private async processJob(job: Job): Promise<void> {
    try {
      switch (job.type) {
        case 'analyze_tweet':
          await this.analyzeTweet(job);
          break;
        default:
          console.error('Unknown job type:', (job as any).type);
      }
    } catch (error) {
      console.error('Error processing job:', error);
    }
  }

  private async analyzeTweet(job: AnalyzeTweetJob): Promise<void> {
    console.log(`Analyzing tweet ${job.tweetId}`);

    const analysis = await analysisService.analyzeTweet(job.text);

    const { error } = await supabaseAdmin
      .from('tweets')
      .update({
        analysis,
        status: 'ready_for_tagging',
      })
      .eq('id', job.tweetId)
      .eq('user_id', job.userId);

    if (error) {
      console.error('Error updating tweet analysis:', error);
      throw error;
    }

    console.log(`Tweet ${job.tweetId} analyzed successfully`);
  }

  async getQueueSize(): Promise<number> {
    return this.queue.size + this.queue.pending;
  }
}

export const jobQueue = new JobQueue();
