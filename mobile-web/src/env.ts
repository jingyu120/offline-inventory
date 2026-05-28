import { z } from 'zod';

const EnvSchema = z.object({
  SYNC_API_URL: z.string().optional(),
  EXPO_PUBLIC_SYNC_API_URL: z.string().optional(),
});

const _parsed = EnvSchema.safeParse(process.env);
if (!_parsed.success) {
  console.error(
    '❌ Invalid environment variables:',
    JSON.stringify(_parsed.error.format(), null, 2),
  );
  throw new Error('Invalid environment variables');
}

export const env = _parsed.data;
