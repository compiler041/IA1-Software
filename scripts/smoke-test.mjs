// End-to-end API check: node scripts/smoke-test.mjs [baseUrl] [adminPassword]
const base = process.argv[2] ?? "http://localhost:3000";
const password = process.argv[3] ?? process.env.ADMIN_PASSWORD;

const pdf = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n" +
    "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n" +
    "4 0 obj<</Length 60>>stream\nBT /F1 28 Tf 72 760 Td (Certificate of Participation) Tj ET\nendstream endobj\n" +
    "5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n",
);

const check = (cond, msg) => {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`ok - ${msg}`);
};

const ticket = await (
  await fetch(`${base}/api/uploads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: "certificate.pdf", fileSize: pdf.length, contentType: "application/pdf" }),
  })
).json();
check(ticket.key && ticket.url, "upload ticket issued");

const put = await fetch(new URL(ticket.url, base), { method: "PUT", headers: ticket.headers, body: pdf });
check(put.ok, `PDF uploaded (${put.status})`);

const values = {
  name: "Aarav Mehta",
  rollNo: "16010122001",
  email: "aarav.mehta@somaiya.edu",
  mobile: "9876543210",
  year: "LY",
  branch: "EXCP",
  isLyExcp: "Yes",
  activityCategory: "Awards/Prize/Recognition",
  organiserParticipantName: "IEEE Mumbai Section",
  activityName: "Smart India Hackathon 2025",
  activityDetails: "Won first prize in the hardware edition as team lead.",
  activityLevel: "National",
  startDate: "12-09-2025",
  endDate: "14-09-2025",
};
const bad = await fetch(`${base}/api/submissions`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ values: { ...values, email: "a@gmail.com" }, file: { key: ticket.key, name: "c.pdf" } }),
});
check(bad.status === 422, "non-somaiya email rejected");

const sub = await fetch(`${base}/api/submissions`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ values, file: { key: ticket.key, name: "certificate.pdf" } }),
});
const saved = await sub.json();
check(sub.status === 201, `submission saved as ${saved.ref}`);

check((await fetch(`${base}/api/admin/files/${saved.id}`, { redirect: "manual" })).status === 303, "file is protected");

const login = await fetch(`${base}/api/admin/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ password }),
});
check(login.ok, "admin login");
const cookie = login.headers.get("set-cookie").split(";")[0];

const file = await fetch(`${base}/api/admin/files/${saved.id}`, { headers: { cookie } });
check(file.ok && file.headers.get("content-type") === "application/pdf", "PDF served inline to admin");

const xlsx = await fetch(`${base}/api/admin/export/excel`, { headers: { cookie } });
check(xlsx.ok && (await xlsx.arrayBuffer()).byteLength > 5000, "Excel export");

const zip = await fetch(`${base}/api/admin/export/zip`, { headers: { cookie } });
const zipBytes = Buffer.from(await zip.arrayBuffer());
check(zip.ok && zipBytes.subarray(0, 2).toString() === "PK", `ZIP export (${zipBytes.length} bytes)`);

for (const p of ["/", "/admin", "/admin/responses", "/admin/students", "/admin/settings"]) {
  const r = await fetch(`${base}${p}`, { headers: { cookie } });
  check(r.ok, `page ${p} renders`);
}
console.log("\nAll checks passed.");
