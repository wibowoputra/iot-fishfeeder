import { z } from 'zod';
import { insertScheduleSchema, insertFeedLogSchema, schedules, feedLogs } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  schedules: {
    list: {
      method: 'GET' as const,
      path: '/api/schedules',
      responses: {
        200: z.array(z.custom<typeof schedules.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/schedules',
      input: insertScheduleSchema,
      responses: {
        201: z.custom<typeof schedules.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/schedules/:id',
      input: insertScheduleSchema.partial(),
      responses: {
        200: z.custom<typeof schedules.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/schedules/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  feedLogs: {
    list: {
      method: 'GET' as const,
      path: '/api/feed-logs',
      responses: {
        200: z.array(z.custom<typeof feedLogs.$inferSelect>()),
      },
    },
    create: { // For manual feeding or testing
      method: 'POST' as const,
      path: '/api/feed-logs',
      input: insertFeedLogSchema,
      responses: {
        201: z.custom<typeof feedLogs.$inferSelect>(),
      },
    },
  },
  device: {
    status: {
      method: 'GET' as const,
      path: '/api/device/status',
      responses: {
        200: z.object({
          online: z.boolean(),
          lastSeen: z.string().optional(),
          mqttConnected: z.boolean(),
        }),
      },
    },
    feed: { // Trigger manual feed
      method: 'POST' as const,
      path: '/api/device/feed',
      responses: {
        200: z.object({ success: z.boolean(), message: z.string() }),
      },
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
