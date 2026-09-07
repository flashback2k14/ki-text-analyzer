"use server";

import { redirect } from "next/navigation";
import { getDb } from "../db";
import { clearSessionCookie, readSessionToken } from "./cookies";
import { deleteSession } from "./session";

export async function logout(): Promise<void> {
  const token = await readSessionToken();
  if (token) deleteSession(getDb(), token);
  await clearSessionCookie();
  redirect("/anmelden");
}
