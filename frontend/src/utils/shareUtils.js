/**
 * Utility functions for sharing routes across social networks and native share sheets.
 */

/**
 * Builds standard share metadata for a route.
 * @param {Object} route - The route object.
 * @returns {{ title: string, text: string, url: string }}
 */
export function buildRouteShareData(route) {
  if (!route) {
    return {
      title: "QRuta",
      text: "Descubrí el recorrido de las rutas en QRuta",
      url: "",
    };
  }

  const rawCode = route.code?.trim();
  const rawName = (route.name || "")
    .replace(/^(?:Ruta|Línea|Linea)\s+[^:]+:\s*/iu, "")
    .trim();

  // Prioritize code if defined and not generic 'Ruta'; otherwise fallback to route name
  const routeIdentifier =
    rawCode && rawCode.toLowerCase() !== "ruta"
      ? rawCode
      : rawName || "esta ruta";

  const origin =
    typeof window !== "undefined" && window.location
      ? window.location.origin
      : "";
  const url = route.id ? `${origin}/mapa/ruta/${route.id}` : origin;

  const title = `Recorrido de la ruta ${routeIdentifier} | QRuta`;
  const text = `Mira el recorrido de la ruta ${routeIdentifier} en QRuta`;

  return { title, text, url };
}

/**
 * Checks if the browser environment supports the native Web Share API.
 * @returns {boolean}
 */
export function canUseNativeShare() {
  return (
    typeof navigator !== "undefined" && typeof navigator.share === "function"
  );
}

/**
 * Generates direct sharing links for messaging platforms.
 * @param {{ text: string, url: string }} shareData
 * @returns {{ whatsapp: string, telegram: string }}
 */
export function getShareLinks(shareData) {
  const { text = "", url = "" } = shareData || {};
  const fullText = text ? `${text} ${url}`.trim() : url;

  return {
    whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(fullText)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  };
}

/**
 * Copies the provided string to the clipboard with fallback support.
 * @param {string} textToCopy
 * @returns {Promise<boolean>}
 */
export async function copyToClipboard(textToCopy) {
  if (!textToCopy) return false;

  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(textToCopy);
      return true;
    }
  } catch {
    // Clipboard API may be denied or blocked by permissions policy; fall back below.
  }

  try {
    if (typeof document !== "undefined") {
      const textArea = document.createElement("textarea");
      textArea.value = textToCopy;
      textArea.style.position = "fixed";
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);
      return successful;
    }
  } catch {
    return false;
  }

  return false;
}

/**
 * Initiates the native share dialog or signals that fallback is needed.
 * @param {Object} route
 * @returns {Promise<{ success: boolean, method?: 'native', fallback?: boolean, aborted?: boolean }>}
 */
export async function shareRoute(route) {
  const shareData = buildRouteShareData(route);

  if (canUseNativeShare()) {
    try {
      await navigator.share(shareData);
      return { success: true, method: "native" };
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return { success: false, aborted: true };
      }
      return { success: false, fallback: true };
    }
  }

  return { success: false, fallback: true };
}
