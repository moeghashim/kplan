import { FastifyInstance } from 'fastify';
import { createLabelSchema, updateLabelSchema, attachTweetSchema, detachTweetSchema } from '@kplan/shared';

export default async function labelsRoutes(fastify: FastifyInstance) {
  // POST /labels - Create a label
  fastify.post('/', async (request, reply) => {
    const body = createLabelSchema.parse(request.body);

    const { data: label, error } = await request.supabase
      .from('labels')
      .insert({
        user_id: request.userId,
        name: body.name,
        description: body.description || null,
        learning_path_id: body.learningPathId,
        position: body.position || 0,
      })
      .select()
      .single();

    if (error) {
      return reply.status(500).send({ error: error.message });
    }

    return reply.status(201).send(label);
  });

  // GET /labels - List labels (with optional filter by learning path)
  fastify.get('/', async (request, reply) => {
    const { learningPathId } = request.query as { learningPathId?: string };

    let query = request.supabase
      .from('labels')
      .select('*')
      .order('position');

    if (learningPathId) {
      query = query.eq('learning_path_id', learningPathId);
    }

    const { data: labels, error } = await query;

    if (error) {
      return reply.status(500).send({ error: error.message });
    }

    return reply.send(labels);
  });

  // PATCH /labels/:id - Update a label
  fastify.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateLabelSchema.parse(request.body);

    const { data: label, error } = await request.supabase
      .from('labels')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error || !label) {
      return reply.status(404).send({ error: 'Label not found' });
    }

    return reply.send(label);
  });

  // POST /labels/:labelId/attach-tweet - Attach tweet to label
  fastify.post('/:labelId/attach-tweet', async (request, reply) => {
    const { labelId } = request.params as { labelId: string };
    const body = attachTweetSchema.parse(request.body);

    const { data: tweetLabel, error } = await request.supabase
      .from('tweet_labels')
      .insert({
        user_id: request.userId,
        tweet_id: body.tweetId,
        label_id: labelId,
        position: body.position || 0,
      })
      .select()
      .single();

    if (error) {
      return reply.status(500).send({ error: error.message });
    }

    return reply.status(201).send(tweetLabel);
  });

  // POST /labels/:labelId/detach-tweet - Detach tweet from label
  fastify.post('/:labelId/detach-tweet', async (request, reply) => {
    const { labelId } = request.params as { labelId: string };
    const body = detachTweetSchema.parse(request.body);

    const { error } = await request.supabase
      .from('tweet_labels')
      .delete()
      .eq('label_id', labelId)
      .eq('tweet_id', body.tweetId);

    if (error) {
      return reply.status(500).send({ error: error.message });
    }

    return reply.send({ ok: true });
  });
}
