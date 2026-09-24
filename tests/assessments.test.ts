import { describe, expect, it } from "vitest";
import { createUser } from "@/lib/auth/users";
import { recordUsage } from "@/lib/costs/usage";
import { EMPTY_USAGE } from "@/lib/costs/types";
import { openDatabase } from "@/lib/db";
import { deleteAssessment, getAssessment, listAssessments, saveAssessment } from "@/lib/llm/assessments";

const sample = {
  einschaetzung: "Formelhafte Textbausteine neben individuellen Fehlern.",
  wahrscheinlichkeit: "mittel" as const,
  auffaelligkeiten: ["Pro-Contra-Schema", "Lehrbuchhaftes Beispiel"],
  staerken: ["Konkrete Seitenangaben"],
  truncated: false,
};

function setup() {
  const db = openDatabase(":memory:");
  const a = createUser(db, "a@example.org", "hash");
  const b = createUser(db, "b@example.org", "hash");
  return { db, a, b };
}

describe("Einschätzungen", () => {
  it("speichert und liest eine Einschätzung samt Listen", () => {
    const { db, a } = setup();
    const usageId = recordUsage(db, { userId: a.id, model: "claude-sonnet-5", purpose: "assess", usage: { ...EMPTY_USAGE, requests: 1 }, costUsd: 0.01 });
    const id = saveAssessment(db, { userId: a.id, usageId, model: "claude-sonnet-5", fileName: "hausarbeit.docx", assessment: sample, createdAt: 1000 });
    expect(getAssessment(db, a.id, id)).toEqual({ id, createdAt: 1000, model: "claude-sonnet-5", fileName: "hausarbeit.docx", ...sample });
  });

  it("listet absteigend nach Zeit und nur für den eigenen User", () => {
    const { db, a, b } = setup();
    saveAssessment(db, { userId: a.id, usageId: null, model: "m", assessment: sample, createdAt: 1 });
    saveAssessment(db, { userId: a.id, usageId: null, model: "m", assessment: { ...sample, truncated: true }, createdAt: 2 });
    const foreign = saveAssessment(db, { userId: b.id, usageId: null, model: "m", assessment: sample, createdAt: 3 });
    const list = listAssessments(db, a.id);
    expect(list.map((x) => x.createdAt)).toEqual([2, 1]);
    expect(list[0].truncated).toBe(true);
    expect(list[0].fileName).toBeNull();
    expect(getAssessment(db, a.id, foreign)).toBeNull();
    expect(listAssessments(db, a.id, 1)).toHaveLength(1);
  });

  it("löscht nur eigene Einträge", () => {
    const { db, a, b } = setup();
    const id = saveAssessment(db, { userId: a.id, usageId: null, model: "m", assessment: sample });
    expect(deleteAssessment(db, b.id, id)).toBe(false);
    expect(getAssessment(db, a.id, id)).not.toBeNull();
    expect(deleteAssessment(db, a.id, id)).toBe(true);
    expect(getAssessment(db, a.id, id)).toBeNull();
  });
});
