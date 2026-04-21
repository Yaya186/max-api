import Airtable from "airtable";

const base = new Airtable({
  apiKey: process.env.AIRTABLE_TOKEN,
}).base(process.env.AIRTABLE_BASE_ID);

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  cors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    if (req.method === "GET") {
      const records = await base("Profil")
        .select({
          filterByFormula: `{cle} = "principal"`,
          maxRecords: 1,
        })
        .all();

      if (!records.length) {
        return res.status(404).json({ error: "Profil introuvable" });
      }

      return res.status(200).json({
        success: true,
        profil: {
          id: records[0].id,
          ...records[0].fields,
        },
      });
    }

    if (req.method === "POST") {
      const body = req.body || {};

      const records = await base("Profil")
        .select({
          filterByFormula: `{cle} = "principal"`,
          maxRecords: 1,
        })
        .all();

      if (!records.length) {
        return res.status(404).json({ error: "Profil introuvable" });
      }

      const allowedFields = [
        "prenom",
        "age",
        "taille_cm",
        "poids_depart",
        "objectif_poids",
        "budget_kcal",
        "profil_medical",
        "traitements_actuels",
        "date_maj_medicale",
        "style_attendu",
        "ce_que_jaime",
        "ce_que_je_naime_pas",
        "declencheurs",
        "aides_utiles",
        "habitudes_recurrentes",
        "contexte_familial",
        "rythme_pesee",
        "notes_partenaires",
      ];

      const fields = {};
      for (const key of allowedFields) {
        if (body[key] !== undefined) {
          fields[key] = body[key];
        }
      }

      await base("Profil").update([
        {
          id: records[0].id,
          fields,
        },
      ]);

      const updated = await base("Profil")
        .select({
          filterByFormula: `{cle} = "principal"`,
          maxRecords: 1,
        })
        .all();

      return res.status(200).json({
        success: true,
        profil: {
          id: updated[0].id,
          ...updated[0].fields,
        },
      });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Internal server error",
    });
  }
}
