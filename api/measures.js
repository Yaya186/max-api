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
      const { mois_ref } = req.query || {};

      const selectOptions = {
        sort: [{ field: "date", direction: "desc" }],
      };

      if (mois_ref) {
        selectOptions.filterByFormula = `{mois_ref} = "${String(mois_ref).replace(/"/g, '\\"')}"`;
      }

      const records = await base("Mesures").select(selectOptions).all();

      return res.status(200).json({
        success: true,
        mesures: records.map((r) => ({
          id: r.id,
          ...r.fields,
        })),
      });
    }

    if (req.method === "POST") {
      const body = req.body || {};

      if (!body.date || !body.mois_ref) {
        return res.status(400).json({ error: "date and mois_ref are required" });
      }

      const fields = {
        date: body.date,
        mois_ref: body.mois_ref,
      };

      if (body.bras_cm !== undefined) fields.bras_cm = Number(body.bras_cm);
      if (body.cuisse_cm !== undefined) fields.cuisse_cm = Number(body.cuisse_cm);
      if (body.ventre_cm !== undefined) fields.ventre_cm = Number(body.ventre_cm);
      if (body.hanche_cm !== undefined) fields.hanche_cm = Number(body.hanche_cm);
      if (body.commentaire !== undefined) fields.commentaire = body.commentaire;

      const existing = await base("Mesures")
        .select({
          filterByFormula: `{mois_ref} = "${String(body.mois_ref).replace(/"/g, '\\"')}"`,
          maxRecords: 1,
        })
        .all();

      if (existing.length > 0) {
        await base("Mesures").update([
          {
            id: existing[0].id,
            fields,
          },
        ]);

        const updated = await base("Mesures")
          .select({
            filterByFormula: `{mois_ref} = "${String(body.mois_ref).replace(/"/g, '\\"')}"`,
            maxRecords: 1,
          })
          .all();

        return res.status(200).json({
          success: true,
          mode: "updated",
          mesure: {
            id: updated[0].id,
            ...updated[0].fields,
          },
        });
      }

      const created = await base("Mesures").create([{ fields }]);

      return res.status(200).json({
        success: true,
        mode: "created",
        mesure: {
          id: created[0].id,
          ...created[0].fields,
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
