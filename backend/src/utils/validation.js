
import { z } from 'zod';

// Email validation
export const emailSchema = z
  .string()
  .trim()
  .email('Please provide a valid email address')
  .max(254, 'Email address is too long')
  .transform(value => value.toLowerCase());

// Strong password validation
export const passwordSchema = z
  .string()
  .min(10, 'Password must contain at least 10 characters')
  .max(72, 'Password must not exceed 72 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(
    /[^A-Za-z0-9\s]/,
    'Password must contain at least one special character'
  )
  .refine(
    value => Buffer.byteLength(value, 'utf8') <= 72,
    'Password must not exceed 72 bytes'
  );

// Campaign validation
export const campaignSchema = z.object({
  campaignName: z.string().trim().min(1).max(120),
  subject: z.string().trim().min(1).max(200),
  body: z.string().min(1).max(100000),
  recipients: z
    .array(emailSchema)
    .min(1)
    .max(Number(process.env.MAX_CAMPAIGN_RECIPIENTS || 250))
}).strict();
