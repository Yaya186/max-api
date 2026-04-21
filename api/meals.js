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
    const { jour_id } = req.query;

    if (!jour_id) {
      return res.status(400).json({ error: "jour_id is required" });
    }

    const records = await base("Repas")
      .select({
        filterByFormula: `{jour_id} = "${jour_id}"`,
      })
      .all();

    const repas = records.map((r) => ({
      id: r.id,
      ...r.fields,
    }));

    const total = repas.reduce((sum, r) => sum + (Number(r.kcal_comptees) || 0), 0);

    return res.status(200).json({
      success: true,
      jour_id,
      total_kcal_comptees: total,
      nb_entrees: repas.length,
      repas,
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Internal server error",
    });
  }
}
