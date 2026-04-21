import Airtable from "airtable";

const OBJECTIF_POIDS = 110;
const POIDS_DEPART = 145.5;

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
    const { date, poids_kg, commentaire_max } = req.body || {};

    if (!date || poids_kg === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const poids = Number(poids_kg);

    const existing = await base("Pesees")
      .select({
        sort: [{ field: "date", direction: "desc" }],
        maxRecords: 1,
      })
      .all();

    let variation_vs_precedente = 0;

    if (existing.length > 0) {
      const precedent = Number(existing[0].fields.poids_kg);
      variation_vs_precedente = Number((poids - precedent).toFixed(1));
    }

    const variation_vs_depart = Number((poids - POIDS_DEPART).toFixed(1));
    const reste_jusqu_objectif = Number((poids - OBJECTIF_POIDS).toFixed(1));

    const created = await base("Pesees").create([
      {
        fields: {
          date,
          poids_kg: poids,
          variation_vs_precedente,
          variation_vs_depart,
          reste_jusqu_objectif,
          commentaire_max: commentaire_max || "",
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      pesee_id: created[0].id,
      poids_kg: poids,
      variation_vs_precedente,
      variation_vs_depart,
      reste_jusqu_objectif,
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Internal server error",
    });
  }
}
