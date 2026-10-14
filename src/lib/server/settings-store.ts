import { normalizeSettings, type FormSettings } from "@/lib/settings";
import { getRepository } from "./db";

const SETTINGS_KEY = "form";

export async function getSettings(): Promise<FormSettings> {
  try {
    const repo = await getRepository();
    return normalizeSettings(await repo.getSetting(SETTINGS_KEY));
  } catch (error) {
    console.error("[settings] falling back to defaults:", error);
    return normalizeSettings(null);
  }
}

export async function saveSettings(settings: FormSettings): Promise<void> {
  const repo = await getRepository();
  await repo.setSetting(SETTINGS_KEY, settings);
}
