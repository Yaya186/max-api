import Airtable from "airtable";

const base = new Airtable({
  apiKey: process.env.AIRTABLE_TOKEN,
}).base(process.env.AIRTABLE_BASE_ID);

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  cors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      date,
      heure,
      repas_type,
      description,
      aliments_gratuits,
      kcal_comptees,
      estimation,
      commentaire_max,
      jour_id,
    } = req.body || {};

    if (!date || !description || kcal_comptees === undefined || !repas_type || !estimation || !jour_id) {
      return res.status(400).json({
        error: "Missing required fields",
      });
    }

    const created = await base("Repas").create([
      {
        fields: {
          date,
          heure: heure || "",
          repas_type,
          description,
          aliments_gratuits: aliments_gratuits || "",
          kcal_comptees: Number(kcal_comptees),
          estimation,
          commentaire_max: commentaire_max || "",
          jour_id,
        },
      },
    ]);

    const repasDuJour = await base("Repas")
      .select({
        filterByFormula: `{jour_id} = "${jour_id}"`,
      })
      .all();

    const total = repasDuJour.reduce((sum, r) => {
      return sum + (Number(r.fields.kcal_comptees) || 0);
    }, 0);

    const reste = 2200 - total;
    const budgetRespecte = total <= 2200;

    const journal = await base("JournalJour")
      .select({
        filterByFormula: `{jour_id} = "${jour_id}"`,
      })
      .all();

    if (journal.length > 0) {
      await base("JournalJour").update([
        {
          id: journal[0].id,
          fields: {
            date,
            jour_id,
            total_kcal_comptees: total,
            budget_kcal: 2200,
            reste_kcal: reste,
            budget_respecte: budgetRespecte,
            nb_entrees: repasDuJour.length,
          },
        },
      ]);
    } else {
      await base("JournalJour").create([
        {
          fields: {
            date,
            jour_id,
            total_kcal_comptees: total,
            budget_kcal: 2200,
            reste_kcal: reste,
            budget_respecte: budgetRespecte,
            craquage: false,
            nb_entrees: repasDuJour.length,
          },
        },
      ]);
    }

    return res.status(200).json({
      success: true,
      repas_id: created[0].id,
      total_kcal_comptees: total,
      reste_kcal: reste,
      budget_respecte: budgetRespecte,
      nb_entrees: repasDuJour.length,
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Internal server error",
    });
  }
}
