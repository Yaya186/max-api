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
      const { jour_id, phase_cycle } = req.query || {};

      const filterParts = [];

      if (jour_id) {
        filterParts.push(`{jour_id} = "${String(jour_id).replace(/"/g, '\\"')}"`);
      }

      if (phase_cycle) {
        filterParts.push(`{phase_cycle} = "${String(phase_cycle).replace(/"/g, '\\"')}"`);
      }

      const selectOptions = {
        sort: [{ field: "date", direction: "desc" }],
      };

      if (filterParts.length === 1) {
        selectOptions.filterByFormula = filterParts[0];
      } else if (filterParts.length > 1) {
        selectOptions.filterByFormula = `AND(${filterParts.join(",")})`;
      }

      const records = await base("CycleFeminin").select(selectOptions).all();

      return res.status(200).json({
        success: true,
        cycles: records.map((r) => ({
          id: r.id,
          ...r.fields,
        })),
      });
    }

    if (req.method === "POST") {
      const body = req.body || {};

      if (!body.date || !body.jour_id) {
        return res.status(400).json({
          error: "date and jour_id are required",
        });
      }

      const allowedFields = [
        "date",
        "jour_id",
        "phase_cycle",
        "debut_regles",
        "fin_regles",
        "flux",
        "douleurs",
        "retention_eau",
        "appetit",
        "pulsions_alimentaires",
        "humeur",
        "fatigue",
        "symptomes_associes",
        "impact_sur_poids",
        "impact_sur_alimentation",
        "commentaire_max",
      ];

      const fields = {};
      for (const key of allowedFields) {
        if (body[key] !== undefined) {
          fields[key] = body[key];
        }
      }

      const existing = await base("CycleFeminin")
        .select({
          filterByFormula: `{jour_id} = "${String(body.jour_id).replace(/"/g, '\\"')}"`,
          maxRecords: 1,
        })
        .all();

      if (existing.length > 0) {
        await base("CycleFeminin").update([
          {
            id: existing[0].id,
            fields,
          },
        ]);

        const updated = await base("CycleFeminin")
          .select({
            filterByFormula: `{jour_id} = "${String(body.jour_id).replace(/"/g, '\\"')}"`,
            maxRecords: 1,
          })
          .all();

        return res.status(200).json({
          success: true,
          mode: "updated",
          cycle: {
            id: updated[0].id,
            ...updated[0].fields,
          },
        });
      }

      const created = await base("CycleFeminin").create([{ fields }]);

      return res.status(200).json({
        success: true,
        mode: "created",
        cycle: {
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
