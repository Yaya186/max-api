import Airtable from "airtable";

const base = new Airtable({
  apiKey: process.env.AIRTABLE_TOKEN,
}).base(process.env.AIRTABLE_BASE_ID);

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  cors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const journaux = await base("JournalJour").select().all();
    const pesees = await base("Pesees")
      .select({
        sort: [{ field: "date", direction: "asc" }],
      })
      .all();

    const jours = journaux.map((j) => j.fields);
    const poids = pesees.map((p) => p.fields);

    const nbJours = jours.length;
    const moyenneKcal =
      nbJours > 0
        ? Number(
            (
              jours.reduce((sum, j) => sum + (Number(j.total_kcal_comptees) || 0), 0) / nbJours
            ).toFixed(1)
          )
        : 0;

    const joursBudgetRespecte = jours.filter((j) => j.budget_respecte === true).length;
    const joursAuDessus = jours.filter((j) => Number(j.total_kcal_comptees) > 2200).length;

    return res.status(200).json({
      success: true,
      nb_jours_suivis: nbJours,
      moyenne_kcal: moyenneKcal,
      jours_dans_budget: joursBudgetRespecte,
      jours_au_dessus: joursAuDessus,
      nb_pesees: poids.length,
      derniere_pesee: poids.length ? poids[poids.length - 1] : null,
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Internal server error",
    });
  }
}
