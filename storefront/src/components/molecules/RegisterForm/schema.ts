import { z } from 'zod';

const emailField = z
  .string()
  .nonempty('Please enter email')
  .email('Invalid email')
  .max(60, 'Email must contain up to 60 characters');

const passwordField = z
  .string()
  .nonempty('Please enter password')
  .min(8, 'Password must be at least 8 characters long')
  .regex(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/, {
    message:
      'Password must contain at least one uppercase letter, one number and one special character'
  })
  .max(64, 'Password must contain up to 64 characters');

export const registerFormSchema = z
  .object({
    registrationType: z.enum(['b2c', 'b2b_pro']),
    firstName: z.string().max(50).optional().default(''),
    lastName: z.string().max(50).optional().default(''),
    email: emailField,
    password: passwordField,
    phone: z.string().max(20).optional().default(''),
    companyName: z.string().max(200).optional().default(''),
    vatId: z.string().max(28).optional().default(''),
    sdiOrPec: z.string().optional().default('')
  })
  .superRefine((data, ctx) => {
    if (data.registrationType === 'b2c') {
      if (!data.firstName?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please enter first name',
          path: ['firstName']
        });
      }
      if (!data.lastName?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please enter last name',
          path: ['lastName']
        });
      }
      const ph = data.phone?.trim();
      if (ph && (!/^\+?\d+$/.test(ph) || ph.length < 6)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Phone must contain only digits (optional + prefix)',
          path: ['phone']
        });
      }
    } else {
      if (!data.companyName?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please enter company name',
          path: ['companyName']
        });
      }
      const vat = data.vatId?.trim() || '';
      if (vat.length < 8) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please enter VAT number (Partita IVA)',
          path: ['vatId']
        });
      }
      const sdi = data.sdiOrPec?.trim() || '';
      if (!sdi) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Enter SDI code (7 characters) or PEC email',
          path: ['sdiOrPec']
        });
      } else if (sdi.includes('@')) {
        const r = z.string().email().safeParse(sdi);
        if (!r.success) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Use a valid PEC email',
            path: ['sdiOrPec']
          });
        }
      } else if (!/^[A-Z0-9]{7}$/i.test(sdi)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'SDI must be exactly 7 alphanumeric characters',
          path: ['sdiOrPec']
        });
      }
    }
  });

export type RegisterFormData = z.infer<typeof registerFormSchema>;
