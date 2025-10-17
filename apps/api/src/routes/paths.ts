import { FastifyInstance } from 'fastify';
import { createLearningPathSchema, updateLearningPathSchema } from '@kplan/shared';

export default async function pathsRoutes(fastify: FastifyInstance) {
  // POST /learning-paths - Create a learning path
  fastify.post('/', async (request, reply) => {
    const body = createLearningPathSchema.parse(request.body);

    const { data: path, error } = await request.supabase
      .from('learning_paths')
      .insert({
        user_id: request.userId,
        title: body.title,
        description: body.description || null,
        position: body.position || 0,
      })
      .select()
      .single();

    if (error) {
      return reply.status(500).send({ error: error.message });
    }

    return reply.status(201).send(path);
  });

  // GET /learning-paths - List all learning paths
  fastify.get('/', async (request, reply) => {
    const { data: paths, error } = await request.supabase
      .from('learning_paths')
      .select('*')
      .order('position', { ascending: true });

    if (error) {
      return reply.status(500).send({ error: error.message });
    }

    return reply.send(paths);
  });

  // GET /learning-paths/:id - Get a learning path with details
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const { data: path, error: pathError } = await request.supabase
      .from('learning_paths')
      .select('*')
      .eq('id', id)
      .single();

    if (pathError || !path) {
      return reply.status(404).send({ error: 'Learning path not found' });
    }

    const { data: labels } = await request.supabase
      .from('labels')
      .select('*')
      .eq('learning_path_id', id)
      .order('position');

    return reply.send({ ...path, labels: labels || [] });
  });

  // PATCH /learning-paths/:id - Update a learning path
  fastify.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateLearningPathSchema.parse(request.body);

    const { data: path, error } = await request.supabase
      .from('learning_paths')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error || !path) {
      return reply.status(404).send({ error: 'Learning path not found' });
    }

    return reply.send(path);
  });

  // DELETE /learning-paths/:id - Delete a learning path
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const { error } = await request.supabase
      .from('learning_paths')
      .delete()
      .eq('id', id);

    if (error) {
      return reply.status(500).send({ error: error.message });
    }

    return reply.status(204).send();
  });
}
