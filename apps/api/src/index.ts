import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { authMiddleware } from './plugins/auth.js';
import tweetsRoutes from './routes/tweets.js';
import pathsRoutes from './routes/paths.js';
import labelsRoutes from './routes/labels.js';
import feynmanRoutes from './routes/feynman.js';

const PORT = Number(process.env.PORT) || 3000;

async function start() {
  const fastify = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    },
  });

  // Register CORS
  await fastify.register(cors, {
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.WEB_URL 
      : true,
    credentials: true,
  });

  // Health check (no auth required)
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Register routes with auth middleware
  await fastify.register(async (instance) => {
    instance.addHook('onRequest', authMiddleware);
    
    await instance.register(tweetsRoutes, { prefix: '/tweets' });
    await instance.register(pathsRoutes, { prefix: '/learning-paths' });
    await instance.register(labelsRoutes, { prefix: '/labels' });
    await instance.register(feynmanRoutes, { prefix: '/feynman' });
  });

  // Error handler
  fastify.setErrorHandler((error, request, reply) => {
    fastify.log.error(error);
    
    reply.status(error.statusCode || 500).send({
      error: error.message || 'Internal Server Error',
      statusCode: error.statusCode || 500,
    });
  });

  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    fastify.log.info(`Server listening on port ${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
