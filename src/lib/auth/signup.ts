import { z } from "zod";

export const signupSchema = z.object({
  fullName: z.string().min(3),
  email: z.email(),
  matricNumber: z.string().min(5),
  departmentName: z.string().min(2),
  currentLevel: z.coerce.number().int().min(100).max(500),
  password: z.string().min(8),
});

export type SignupInput = z.infer<typeof signupSchema>;
