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
      const { active, categorie, cle } = req.query || {};

      const filterParts = [];

      if (active === "true") {
        filterParts.push(`{active} = 1`);
      }

      if (categorie) {
        filterParts.push(`{categorie} = "${String(categorie).replace(/"/g, '\\"')}"`);
      }

      if (cle) {
        filterParts.push(`{cle} = "${String(cle).replace(/"/g, '\\"')}"`);
      }

      const selectOptions = {
        sort: [{ field: "priorite", direction: "asc" }],
      };

      if (filterParts.length === 1) {
        selectOptions.filterByFormula = filterParts[0];
      } else if (filterParts.length > 1) {
        selectOptions.filterByFormula = `AND(${filterParts.join(",")})`;
      }

      const records = await base("ReglesMax").select(selectOptions).all();

      return res.status(200).json({
        success: true,
        regles: records.map((r) => ({
          id: r.id,
          ...r.fields,
        })),
      });
    }

    if (req.method === "POST") {
      const body = req.body || {};

      if (!body.cle || !body.categorie || !body.regle) {
        return res.status(400).json({
          error: "cle, categorie and regle are required",
        });
      }

      const fields = {
        cle: body.cle,
        categorie: body.categorie,
        regle: body.regle,
      };

      if (body.active !== undefined) fields.active = !!body.active;
      if (body.priorite !== undefined) fields.priorite = Number(body.priorite);
      if (body.commentaire !== undefined) fields.commentaire = body.commentaire;

      const existing = await base("ReglesMax")
        .select({
          filterByFormula: `{cle} = "${String(body.cle).replace(/"/g, '\\"')}"`,
          maxRecords: 1,
        })
        .all();

      if (existing.length > 0) {
        await base("ReglesMax").update([
          {
            id: existing[0].id,
            fields,
          },
        ]);

        const updated = await base("ReglesMax")
          .select({
            filterByFormula: `{cle} = "${String(body.cle).replace(/"/g, '\\"')}"`,
            maxRecords: 1,
          })
          .all();

        return res.status(200).json({
          success: true,
          mode: "updated",
          regle: {
            id: updated[0].id,
            ...updated[0].fields,
          },
        });
      }

      const created = await base("ReglesMax").create([{ fields }]);

      return res.status(200).json({
        success: true,
        mode: "created",
        regle: {
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
