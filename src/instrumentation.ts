/** Läuft einmal beim Start des Servers: bricht ohne APP_SECRET sofort ab und öffnet die Datenbank. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { getAppSecret } = await import("./lib/env");
  const { getDb } = await import("./lib/db");
  getAppSecret();
  getDb();
}
