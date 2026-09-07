import { z } from "zod";
import { MODEL_ID_PATTERN } from "@/lib/llm/models";

export interface FormState {
  ok?: boolean;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  values?: Record<string, string>;
}

const EmailSchema = z.email({ error: "Bitte eine gültige E-Mail-Adresse angeben." }).max(254, "Die E-Mail-Adresse ist zu lang.");
const NewPasswordSchema = z.string().min(8, "Mindestens 8 Zeichen.").max(200, "Höchstens 200 Zeichen.");

export const LoginSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, "Bitte das Passwort eingeben."),
});

export const RegisterSchema = z
  .object({
    email: EmailSchema,
    password: NewPasswordSchema,
    passwordRepeat: z.string(),
    inviteCode: z.string().trim().min(1, "Bitte den Einladungscode eingeben."),
  })
  .refine((v) => v.password === v.passwordRepeat, { path: ["passwordRepeat"], error: "Die Passwörter stimmen nicht überein." });

export const ApiKeySchema = z.object({
  apiKey: z
    .string()
    .trim()
    .min(20, "Der Key ist zu kurz.")
    .max(500, "Der Key ist zu lang.")
    .regex(/^sk-ant-/, "Anthropic-Keys beginnen mit „sk-ant-“."),
});

export const ModelSchema = z.object({
  model: z
    .string()
    .trim()
    .max(100, "Die Modell-ID ist zu lang.")
    .refine((v) => v === "" || MODEL_ID_PATTERN.test(v), "Ungültige Modell-ID. Erwartet wird z. B. „claude-sonnet-5“."),
});

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Bitte das aktuelle Passwort eingeben."),
    password: NewPasswordSchema,
    passwordRepeat: z.string(),
  })
  .refine((v) => v.password === v.passwordRepeat, { path: ["passwordRepeat"], error: "Die Passwörter stimmen nicht überein." });

export function fieldErrorsOf(error: z.ZodError): Record<string, string[] | undefined> {
  return z.flattenError(error).fieldErrors as Record<string, string[] | undefined>;
}

export function formString(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}
