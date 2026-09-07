import type { Rule } from "./rule";
import { autoritaetRule, floskelnRule, redaktionellRule, werbungRule } from "./floskeln";
import { modewoerterRule } from "./modewoerter";
import { gedankenstricheRule, kopulaRule, parallelismusRule, partizipRule, synonymeRule, trikolonRule, verbindungswoerterRule } from "./satzbau";
import { strukturRule } from "./struktur";
import { formatierungRule } from "./formatierung";
import { artefakteRule } from "./artefakte";
import { dialogRule } from "./dialog";

export const RULES: Rule[] = [
  gedankenstricheRule,
  floskelnRule,
  werbungRule,
  redaktionellRule,
  autoritaetRule,
  modewoerterRule,
  verbindungswoerterRule,
  parallelismusRule,
  kopulaRule,
  synonymeRule,
  trikolonRule,
  partizipRule,
  strukturRule,
  formatierungRule,
  artefakteRule,
  dialogRule,
];

export type { Rule, RuleContext, RawFinding } from "./rule";
