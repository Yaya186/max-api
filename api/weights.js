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
    const { date_from, date_to } = req.query || {};

    const records = await base("Pesees")
      .select({
        sort: [{ field: "date", direction: "asc" }],
      })
      .all();

    let pesees = records.map((r) => ({
      id: r.id,
      ...r.fields,
    }));

    if (date_from) {
      pesees = pesees.filter((p) => String(p.date || "") >= String(date_from));
    }

    if (date_to) {
      pesees = pesees.filter((p) => String(p.date || "") <= String(date_to));
    }

    return res.status(200).json({
      success: true,
      count: pesees.length,
      pesees,
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Internal server error",
    });
  }
}
