// Semaine de données Finary : la tâche planifiée écrit les tables Airtable le dimanche vers 6 h, heure de Paris.
// On bascule sur la nouvelle semaine le dimanche à 7 h pour lui laisser le temps de finir.
const HEURE_BASCULE = 7;
const JOUR_MS = 24 * 60 * 60 * 1000;

// Date (AAAA-MM-JJ) du dimanche qui ouvre la semaine de données en cours.
export function semaineDeDonnees(now = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Paris",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((x) => [x.type, x.value])
  );
  // Heure de Paris écrite comme une heure UTC, décalée de l'heure de bascule.
  const paris = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - HEURE_BASCULE * 3600 * 1000;
  const dimanche = paris - new Date(paris).getUTCDay() * JOUR_MS;
  return new Date(dimanche).toISOString().slice(0, 10);
}
