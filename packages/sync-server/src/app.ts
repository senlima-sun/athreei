import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import authRoutes from './routes/auth';
import devicesRoutes from './routes/devices';
import syncRoutes from './routes/sync';
import tracesRoutes from './routes/traces';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use(
  '*',
  cors({
    origin: (origin) => {
      // Allow all origins in development
      if (process.env.NODE_ENV === 'development') {
        return origin;
      }
      // In production, configure allowed origins
      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
      return allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
    },
    credentials: true,
  })
);

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.route('/auth', authRoutes);
app.route('/devices', devicesRoutes);
app.route('/sync', syncRoutes);
app.route('/api/traces', tracesRoutes);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Server error:', err);
  return c.json(
    {
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    },
    500
  );
});

export default app;
