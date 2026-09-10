import { z } from 'zod';

export const upsertCardTemplateSchema = z.object({
  backgroundImage: z.string().optional(),
  title: z.string().max(200).optional(),
  subtitle: z.string().max(200).optional(),
  primaryColor: z.string().max(20).optional(),
  secondaryColor: z.string().max(20).optional(),
  showName: z.boolean().optional(),
  showEnrollment: z.boolean().optional(),
  showGrade: z.boolean().optional(),
  qrSize: z.number().int().min(80).max(300).optional(),
});

export type UpsertCardTemplateInput = z.infer<typeof upsertCardTemplateSchema>;
