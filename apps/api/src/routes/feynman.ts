import { FastifyInstance } from 'fastify';
import {
  createFeynmanSessionSchema,
  createExplanationSchema,
  simplifyExplanationSchema,
  createGapSchema,
  updateGapSchema,
} from '@kplan/shared';
import { analysisService } from '../services/analysis.js';

export default async function feynmanRoutes(fastify: FastifyInstance) {
  // POST /feynman/sessions - Create or get active session
  fastify.post('/sessions', async (request, reply) => {
    const body = createFeynmanSessionSchema.parse(request.body);

    // Check for existing active session
    const { data: existing } = await request.supabase
      .from('feynman_sessions')
      .select('*')
      .eq('label_id', body.labelId)
      .eq('is_active', true)
      .single();

    if (existing) {
      return reply.send(existing);
    }

    // Create new session
    const { data: session, error } = await request.supabase
      .from('feynman_sessions')
      .insert({
        user_id: request.userId,
        label_id: body.labelId,
        stage: 'choose',
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return reply.status(500).send({ error: error.message });
    }

    return reply.status(201).send(session);
  });

  // GET /feynman/sessions/:id - Get session with details
  fastify.get('/sessions/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const { data: session, error: sessionError } = await request.supabase
      .from('feynman_sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (sessionError || !session) {
      return reply.status(404).send({ error: 'Session not found' });
    }

    const { data: explanations } = await request.supabase
      .from('explanations')
      .select('*')
      .eq('session_id', id)
      .order('version', { ascending: false });

    const { data: gaps } = await request.supabase
      .from('gaps')
      .select('*')
      .eq('session_id', id)
      .order('created_at', { ascending: false });

    return reply.send({
      ...session,
      explanations: explanations || [],
      gaps: gaps || [],
    });
  });

  // POST /feynman/sessions/:id/advance - Advance to next stage
  fastify.post('/sessions/:id/advance', async (request, reply) => {
    const { id } = request.params as { id: string };

    const { data: session, error: fetchError } = await request.supabase
      .from('feynman_sessions')
      .select('stage')
      .eq('id', id)
      .single();

    if (fetchError || !session) {
      return reply.status(404).send({ error: 'Session not found' });
    }

    const stageOrder = ['choose', 'explain', 'gaps', 'simplify', 'complete'];
    const currentIndex = stageOrder.indexOf(session.stage);
    const nextStage = stageOrder[currentIndex + 1] || 'complete';

    const { data: updated, error } = await request.supabase
      .from('feynman_sessions')
      .update({ stage: nextStage })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return reply.status(500).send({ error: error.message });
    }

    return reply.send(updated);
  });

  // POST /feynman/sessions/:id/explanations - Create explanation
  fastify.post('/sessions/:id/explanations', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = createExplanationSchema.parse(request.body);

    // Get current max version
    const { data: existing } = await request.supabase
      .from('explanations')
      .select('version')
      .eq('session_id', id)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    const nextVersion = (existing?.version || 0) + 1;

    const { data: explanation, error } = await request.supabase
      .from('explanations')
      .insert({
        user_id: request.userId,
        session_id: id,
        version: nextVersion,
        text: body.text,
        audience: body.audience || null,
      })
      .select()
      .single();

    if (error) {
      return reply.status(500).send({ error: error.message });
    }

    return reply.status(201).send(explanation);
  });

  // POST /feynman/explanations/:id/evaluate - Evaluate explanation
  fastify.post('/explanations/:id/evaluate', async (request, reply) => {
    const { id } = request.params as { id: string };

    const { data: explanation, error: fetchError } = await request.supabase
      .from('explanations')
      .select('text, audience')
      .eq('id', id)
      .single();

    if (fetchError || !explanation) {
      return reply.status(404).send({ error: 'Explanation not found' });
    }

    const evaluation = await analysisService.evaluateExplanation(
      explanation.text,
      explanation.audience,
      []
    );

    const { data: updated, error } = await request.supabase
      .from('explanations')
      .update({ llm_evaluation: evaluation })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return reply.status(500).send({ error: error.message });
    }

    return reply.send(updated);
  });

  // POST /feynman/explanations/:id/simplify - Simplify explanation
  fastify.post('/explanations/:id/simplify', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = simplifyExplanationSchema.parse(request.body);

    const { data: explanation, error: fetchError } = await request.supabase
      .from('explanations')
      .select('text')
      .eq('id', id)
      .single();

    if (fetchError || !explanation) {
      return reply.status(404).send({ error: 'Explanation not found' });
    }

    const result = await analysisService.simplifyExplanation(
      explanation.text,
      body.audience || 'general audience'
    );

    return reply.send(result);
  });

  // POST /feynman/sessions/:id/gaps - Create gap
  fastify.post('/sessions/:id/gaps', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = createGapSchema.parse(request.body);

    const { data: gap, error } = await request.supabase
      .from('gaps')
      .insert({
        user_id: request.userId,
        session_id: id,
        description: body.description,
        tweet_ids: body.tweetIds || null,
      })
      .select()
      .single();

    if (error) {
      return reply.status(500).send({ error: error.message });
    }

    return reply.status(201).send(gap);
  });

  // POST /feynman/sessions/:id/suggest-gaps - Suggest gaps from latest explanation
  fastify.post('/sessions/:id/suggest-gaps', async (request, reply) => {
    const { id } = request.params as { id: string };

    const { data: latest } = await request.supabase
      .from('explanations')
      .select('text')
      .eq('session_id', id)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (!latest) {
      return reply.status(404).send({ error: 'No explanations found' });
    }

    const suggestions = await analysisService.suggestGaps(
      latest.text,
      'concept',
      []
    );

    return reply.send({ suggestions });
  });

  // PATCH /feynman/gaps/:id - Update gap
  fastify.patch('/gaps/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateGapSchema.parse(request.body);

    const updateData: any = { ...body };
    if (body.resolved && !body.resolvedAt) {
      updateData.resolved_at = new Date().toISOString();
    }

    const { data: gap, error } = await request.supabase
      .from('gaps')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !gap) {
      return reply.status(404).send({ error: 'Gap not found' });
    }

    return reply.send(gap);
  });
}
