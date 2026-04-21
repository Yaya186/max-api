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
      const { nom_produit, categorie, actif } = req.query || {};

      let filterParts = [];

      if (nom_produit) {
        filterParts.push(`FIND(LOWER("${String(nom_produit).replace(/"/g, '\\"')}"), LOWER({nom_produit}))`);
      }

      if (categorie) {
        filterParts.push(`{categorie} = "${String(categorie).replace(/"/g, '\\"')}"`);
      }

      if (actif === "true") {
        filterParts.push(`{actif} = 1`);
      }

      let filterByFormula = undefined;
      if (filterParts.length === 1) {
        filterByFormula = filterParts[0];
      } else if (filterParts.length > 1) {
        filterByFormula = `AND(${filterParts.join(",")})`;
      }

      const records = await base("ProduitsHabituels")
        .select({
          filterByFormula,
          sort: [{ field: "nom_produit", direction: "asc" }],
        })
        .all();

      return res.status(200).json({
        success: true,
        produits: records.map((r) => ({
          id: r.id,
          ...r.fields,
        })),
      });
    }

    if (req.method === "POST") {
      const body = req.body || {};

      if (!body.nom_produit) {
        return res.status(400).json({ error: "nom_produit is required" });
      }

      const allowedFields = [
        "nom_produit",
        "categorie",
        "marque",
        "description",
        "portion_reference",
        "poids_portion_g",
        "kcal_pour_100g",
        "kcal_portion",
        "repere_maison",
        "usage_habituel",
        "photo_produit",
        "actif",
        "commentaire_max",
      ];

      const fields = {};
      for (const key of allowedFields) {
        if (body[key] !== undefined) {
          fields[key] = body[key];
        }
      }

      const existing = await base("ProduitsHabituels")
        .select({
          filterByFormula: `{nom_produit} = "${String(body.nom_produit).replace(/"/g, '\\"')}"`,
          maxRecords: 1,
        })
        .all();

      if (existing.length > 0) {
        await base("ProduitsHabituels").update([
          {
            id: existing[0].id,
            fields,
          },
        ]);

        const updated = await base("ProduitsHabituels")
          .select({
            filterByFormula: `{nom_produit} = "${String(body.nom_produit).replace(/"/g, '\\"')}"`,
            maxRecords: 1,
          })
          .all();

        return res.status(200).json({
          success: true,
          mode: "updated",
          produit: {
            id: updated[0].id,
            ...updated[0].fields,
          },
        });
      }

      const created = await base("ProduitsHabituels").create([
        {
          fields,
        },
      ]);

      return res.status(200).json({
        success: true,
        mode: "created",
        produit: {
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
