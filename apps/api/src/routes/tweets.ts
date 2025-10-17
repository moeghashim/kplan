import { FastifyInstance } from 'fastify';
import { createTweetSchema, tagTweetSchema, getTweetsQuerySchema } from '@kplan/shared';
import { jobQueue } from '../queue/inmemory.js';

export default async function tweetsRoutes(fastify: FastifyInstance) {
  // POST /tweets - Create a new tweet
  fastify.post('/', async (request, reply) => {
    const body = createTweetSchema.parse(request.body);
    const userId = request.userId;

    const tweetData = {
      user_id: userId,
      text: body.text || '',
      url: body.url || null,
      status: 'pending',
      collected_at: new Date().toISOString(),
    };

    const { data: tweet, error } = await request.supabase
      .from('tweets')
      .insert(tweetData)
      .select()
      .single();

    if (error) {
      return reply.status(500).send({ error: error.message });
    }

    // Enqueue analysis job
    await jobQueue.enqueue({
      type: 'analyze_tweet',
      tweetId: tweet.id,
      userId: userId,
      text: tweet.text,
    });

    return reply.status(201).send(tweet);
  });

  // GET /tweets - List tweets with filters
  fastify.get('/', async (request, reply) => {
    const query = getTweetsQuerySchema.parse(request.query);

    let queryBuilder = request.supabase
      .from('tweets')
      .select('*')
      .order('collected_at', { ascending: false });

    if (query.status) {
      queryBuilder = queryBuilder.eq('status', query.status);
    }

    if (query.userTag) {
      queryBuilder = queryBuilder.eq('user_tag', query.userTag);
    }

    if (query.q) {
      queryBuilder = queryBuilder.or(`text.ilike.%${query.q}%,analysis->>summary.ilike.%${query.q}%`);
    }

    const { data: tweets, error } = await queryBuilder;

    if (error) {
      return reply.status(500).send({ error: error.message });
    }

    return reply.send(tweets);
  });

  // GET /tweets/:id - Get single tweet
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const { data: tweet, error } = await request.supabase
      .from('tweets')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !tweet) {
      return reply.status(404).send({ error: 'Tweet not found' });
    }

    return reply.send(tweet);
  });

  // POST /tweets/:id/tag - Tag a tweet
  fastify.post('/:id/tag', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = tagTweetSchema.parse(request.body);

    const { data: tweet, error } = await request.supabase
      .from('tweets')
      .update({
        user_tag: body.userTag,
        status: 'tagged',
      })
      .eq('id', id)
      .select()
      .single();

    if (error || !tweet) {
      return reply.status(404).send({ error: 'Tweet not found' });
    }

    return reply.send(tweet);
  });

  // POST /tweets/:id/reanalyze - Re-analyze a tweet
  fastify.post('/:id/reanalyze', async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.userId;

    const { data: tweet, error } = await request.supabase
      .from('tweets')
      .select('text')
      .eq('id', id)
      .single();

    if (error || !tweet) {
      return reply.status(404).send({ error: 'Tweet not found' });
    }

    // Update status and enqueue
    await request.supabase
      .from('tweets')
      .update({ status: 'pending' })
      .eq('id', id);

    await jobQueue.enqueue({
      type: 'analyze_tweet',
      tweetId: id,
      userId: userId,
      text: tweet.text,
    });

    return reply.send({ message: 'Tweet queued for re-analysis' });
  });
}
