const ZIP_FRAME = "sa-zip-download";

export class ExportError extends Error {}

function fileNameFrom(disposition: string | null, fallback: string): string {
  if (!disposition) return fallback;
  const star = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  if (star) {
    try {
      return decodeURIComponent(star[1]);
    } catch {
      // fall through to the plain filename
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(disposition);
  return plain?.[1] ?? fallback;
}

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

function sessionExpired() {
  window.location.assign(`/admin/login?next=${encodeURIComponent(window.location.pathname)}`);
}

/** Downloads the Excel workbook. Without ids, every response is exported. */
export async function downloadExcel(ids?: string[]): Promise<void> {
  let response: Response;
  try {
    response = await fetch("/api/admin/export/excel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ids ? { ids } : {}),
    });
  } catch {
    throw new ExportError("Network error while preparing the Excel file.");
  }
  if (response.status === 401) {
    sessionExpired();
    throw new ExportError("Your session expired. Please sign in again.");
  }
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new ExportError(typeof data?.error === "string" ? data.error : "Could not create the Excel file.");
  }
  const blob = await response.blob();
  saveBlob(blob, fileNameFrom(response.headers.get("Content-Disposition"), "Student-Activity-Data.xlsx"));
}

/**
 * Starts the ZIP download with a plain form post into a hidden frame, so the browser streams the
 * (possibly very large) archive straight to disk instead of holding it in memory.
 */
export function downloadZip(ids: string[] | undefined, onError: (message: string) => void): void {
  let frame = document.querySelector<HTMLIFrameElement>(`iframe[name="${ZIP_FRAME}"]`);
  if (!frame) {
    frame = document.createElement("iframe");
    frame.name = ZIP_FRAME;
    frame.hidden = true;
    document.body.appendChild(frame);
  }
  frame.onload = () => {
    // A download never fires `load`; a rendered document means the server answered with an error.
    try {
      const text = frame?.contentDocument?.body?.textContent ?? "";
      if (!text) return;
      const data = JSON.parse(text) as { error?: string };
      if (text.includes("expired")) return sessionExpired();
      onError(data.error ?? "Could not create the ZIP file.");
    } catch {
      onError("Could not create the ZIP file.");
    }
  };

  const form = document.createElement("form");
  form.method = "POST";
  form.action = "/api/admin/export/zip";
  form.target = ZIP_FRAME;
  form.hidden = true;
  if (ids) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = "ids";
    input.value = JSON.stringify(ids);
    form.appendChild(input);
  } else {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = "scope";
    input.value = "all";
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
  form.remove();
}
