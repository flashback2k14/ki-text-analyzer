import { getRegistrationCode } from "../env";
import { safeEqual } from "./password";

export function isRegistrationOpen(env: Record<string, string | undefined> = process.env): boolean {
  return getRegistrationCode(env) !== null;
}

export function checkInviteCode(code: string, env: Record<string, string | undefined> = process.env): boolean {
  const expected = getRegistrationCode(env);
  if (!expected) return false;
  return safeEqual(code.trim(), expected);
}
