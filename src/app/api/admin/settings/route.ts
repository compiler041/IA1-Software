import { requireAdmin } from "@/lib/server/auth";
import { jsonError, readJson } from "@/lib/server/http";
import { saveSettings } from "@/lib/server/settings-store";
import { validateSettings } from "@/lib/settings";

export async function PUT(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const result = validateSettings(await readJson(request));
  if (!result.ok) {
    return Response.json({ error: "Please fix the highlighted settings.", errors: result.errors }, { status: 422 });
  }

  try {
    await saveSettings(result.settings);
    return Response.json({ settings: result.settings });
  } catch (error) {
    console.error("[settings] save failed:", error);
    return jsonError("Could not save settings. Please try again.", 500);
  }
}
