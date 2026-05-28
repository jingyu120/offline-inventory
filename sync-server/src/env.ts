import { z } from 'zod';

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL must be set'),
  GEMMA_API_URL: z.string().default('http://localhost:11434'),
  SYNC_SERVER_PORT: z.coerce.number().int().default(3000),
  SYNC_SERVER_PREFIX: z.string().default('api'),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
});

const _parsed = EnvSchema.safeParse(process.env);
if (!_parsed.success) {
  console.error(
    '❌ Invalid environment variables:',
    JSON.stringify(_parsed.error.format(), null, 2),
  );
  process.exit(1);
}

export const env = _parsed.data;
