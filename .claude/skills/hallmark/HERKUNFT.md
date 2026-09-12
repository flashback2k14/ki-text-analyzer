# Herkunft dieser Kopie

Der Skill stammt aus [nutlope/hallmark](https://github.com/nutlope/hallmark), Commit
`13ac0ec7e148655948100b6396439e481361d690` vom 6. August 2026, und steht unter der
MIT-Lizenz (siehe `LICENSE`). Übernommen wurde das Verzeichnis `skills/hallmark/`.

Drei Abweichungen vom Original:

1. `site/css/tokens.css` aus dem Hallmark-Repo liegt hier als `references/tokens.css`.
   Darin stehen die OKLCH-Paletten und Schriftstapel der 21 Katalog-Themes; ohne die
   Datei lässt sich weder ein Theme wählen noch die Diversifizierung prüfen.
2. Alle Verweise auf diese Datei zeigen auf die lokale Kopie.
3. Verweise auf `site/examples/` und `docs/` (Beispielbauten und Lesestoff für Menschen)
   zeigen als Links auf das Upstream-Repo beim oben genannten Commit.

Aktualisieren heißt: Repo neu klonen, `skills/hallmark/` hierher kopieren, die drei
Punkte erneut anwenden, Commit-Hash oben eintragen.
