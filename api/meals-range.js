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
    const { date_from, date_to, repas_type } = req.query || {};

    const records = await base("Repas")
      .select({
        sort: [
          { field: "date", direction: "asc" },
          { field: "heure", direction: "asc" },
        ],
      })
      .all();

    let repas = records.map((r) => ({
      id: r.id,
      ...r.fields,
    }));

    if (date_from) {
      repas = repas.filter((x) => String(x.date || "") >= String(date_from));
    }

    if (date_to) {
      repas = repas.filter((x) => String(x.date || "") <= String(date_to));
    }

    if (repas_type) {
      repas = repas.filter((x) => String(x.repas_type || "") === String(repas_type));
    }

    return res.status(200).json({
      success: true,
      count: repas.length,
      repas,
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Internal server error",
    });
  }
}
