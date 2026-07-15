// Rendert eine teilbare Ergebnis-Grafik (PNG) rein auf dem Canvas – ohne
// externe Abhängigkeiten. Wird von der Siegerehrung aller Spiele genutzt.

export type ShareStanding = {
  rank: number;
  name: string;
  color: string;
  score: string;
  detail?: string;
};

export type ShareCardData = {
  gameLabel: string; // z.B. "BINOKEL"
  title: string; // z.B. "Marius gewinnt!"
  accentColor: string; // Sieger-/Akzentfarbe
  accent2Color: string;
  standings: ShareStanding[];
  footer: string; // z.B. "ScoreForge · Code ABCD"
  isTie?: boolean;
  // Link zum Spiel — wird zusätzlich mit ins Bild gedruckt, damit er auch
  // erhalten bleibt, wenn nur das Bild (ohne Begleittext) weitergeleitet wird.
  url?: string;
};

const WIDTH = 1080;
const HEIGHT = 1350;

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function truncate(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  if (ctx.measureText(text).width <= maxWidth) {
    return text;
  }

  let result = text;
  while (
    result.length > 1 &&
    ctx.measureText(`${result}…`).width > maxWidth
  ) {
    result = result.slice(0, -1);
  }
  return `${result}…`;
}

const FONT = "Arial, 'Segoe UI', Helvetica, sans-serif";

function loadLogo(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    // Gleiche Origin -> kein Canvas-Tainting.
    img.src = "/Logo.png";
  });
}

export async function renderShareCard(data: ShareCardData): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Canvas 2D context not available");
  }

  // Hintergrund
  ctx.fillStyle = "#0b131a";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const glow = ctx.createRadialGradient(
    WIDTH / 2,
    360,
    40,
    WIDTH / 2,
    360,
    720,
  );
  glow.addColorStop(0, `${data.accentColor}44`);
  glow.addColorStop(1, "#0b131a00");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Akzentbalken oben
  const bar = ctx.createLinearGradient(0, 0, WIDTH, 0);
  bar.addColorStop(0, data.accentColor);
  bar.addColorStop(1, data.accent2Color);
  ctx.fillStyle = bar;
  ctx.fillRect(0, 0, WIDTH, 12);

  // Logo + Wortmarke
  const logo = await loadLogo();
  const headerY = 70;
  if (logo) {
    roundRect(ctx, 72, headerY, 88, 88, 20);
    ctx.save();
    ctx.clip();
    ctx.drawImage(logo, 72, headerY, 88, 88);
    ctx.restore();
  }
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillStyle = "#fff4c7";
  ctx.font = `800 40px ${FONT}`;
  ctx.fillText("ScoreForge", logo ? 180 : 72, headerY + 30);
  ctx.fillStyle = data.accent2Color;
  ctx.font = `700 26px ${FONT}`;
  ctx.fillText(
    data.gameLabel.toUpperCase(),
    logo ? 180 : 72,
    headerY + 66,
  );

  // Pokal
  ctx.textAlign = "center";
  ctx.font = `160px ${FONT}`;
  ctx.fillText(data.isTie ? "🤝" : "🏆", WIDTH / 2, 400);

  // Titel (ggf. auf zwei Zeilen umbrechen)
  ctx.fillStyle = "#ffffff";
  ctx.font = `900 76px ${FONT}`;
  const titleMax = WIDTH - 160;
  const words = data.title.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > titleMax && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);

  let titleY = 540;
  for (const l of lines.slice(0, 2)) {
    ctx.fillText(truncate(ctx, l, titleMax), WIDTH / 2, titleY);
    titleY += 90;
  }

  // Endstand-Karte
  const listTop = titleY + 30;
  const listX = 72;
  const listW = WIDTH - 144;
  const rowH = 108;
  const shown = data.standings.slice(0, 6);
  const listH = 96 + shown.length * rowH;

  ctx.fillStyle = "#14222b";
  roundRect(ctx, listX, listTop, listW, listH, 32);
  ctx.fill();
  ctx.strokeStyle = "#ffffff14";
  ctx.lineWidth = 2;
  roundRect(ctx, listX, listTop, listW, listH, 32);
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.fillStyle = "#9fc9d5";
  ctx.font = `700 28px ${FONT}`;
  ctx.fillText(data.footer.split(" · ")[0] ?? "ScoreForge", listX + 44, listTop + 50);

  const medals = ["🥇", "🥈", "🥉"];
  shown.forEach((entry, index) => {
    const rowY = listTop + 96 + index * rowH;
    if (index > 0) {
      ctx.strokeStyle = "#ffffff10";
      ctx.beginPath();
      ctx.moveTo(listX + 40, rowY);
      ctx.lineTo(listX + listW - 40, rowY);
      ctx.stroke();
    }

    const centerY = rowY + rowH / 2;

    // Rang / Medaille
    ctx.textAlign = "center";
    ctx.fillStyle = "#d8d3bd";
    if (entry.rank <= 3) {
      ctx.font = `54px ${FONT}`;
      ctx.fillText(medals[entry.rank - 1], listX + 76, centerY);
    } else {
      ctx.font = `800 40px ${FONT}`;
      ctx.fillText(String(entry.rank), listX + 76, centerY);
    }

    // Farbpunkt
    ctx.fillStyle = entry.color;
    ctx.beginPath();
    ctx.arc(listX + 148, centerY, 16, 0, Math.PI * 2);
    ctx.fill();

    // Name
    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffff";
    ctx.font = `800 44px ${FONT}`;
    const nameX = listX + 180;
    const scoreW = 220;
    ctx.fillText(
      truncate(ctx, entry.name, listW - (nameX - listX) - scoreW),
      nameX,
      entry.detail ? centerY - 16 : centerY,
    );
    if (entry.detail) {
      ctx.fillStyle = "#9fc9d5";
      ctx.font = `600 26px ${FONT}`;
      ctx.fillText(entry.detail, nameX, centerY + 22);
    }

    // Score
    ctx.textAlign = "right";
    ctx.fillStyle = data.accentColor;
    ctx.font = `900 48px ${FONT}`;
    ctx.fillText(entry.score, listX + listW - 44, centerY);
  });

  // Footer
  ctx.textAlign = "center";
  ctx.fillStyle = "#5f7f92";
  ctx.font = `600 28px ${FONT}`;
  ctx.fillText(data.footer, WIDTH / 2, data.url ? HEIGHT - 76 : HEIGHT - 48);

  // Link zum Spiel — bleibt so auch am Bild selbst erhalten.
  if (data.url) {
    ctx.fillStyle = data.accent2Color;
    ctx.font = `700 26px ${FONT}`;
    ctx.fillText(truncate(ctx, data.url, WIDTH - 160), WIDTH / 2, HEIGHT - 38);
  }

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Failed to create image blob"));
      }
    }, "image/png");
  });
}

// Teilt das Bild über die Web-Share-API oder lädt es als Fallback herunter.
// Gibt true zurück, wenn geteilt wurde, false wenn heruntergeladen.
// url wird zusätzlich zum Bild mitgegeben (falls die Ziel-App das Feld
// nutzt); im Fließtext (shareText) sollte der Link zur Sicherheit trotzdem
// enthalten sein, da viele Apps beim Teilen von Dateien die URL ignorieren.
export async function shareOrDownloadImage(
  blob: Blob,
  fileName: string,
  shareTitle: string,
  shareText: string,
  shareUrl?: string,
): Promise<boolean> {
  const file = new File([blob], fileName, { type: "image/png" });

  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
  };

  if (
    typeof nav.canShare === "function" &&
    nav.canShare({ files: [file] }) &&
    typeof navigator.share === "function"
  ) {
    try {
      await navigator.share({
        files: [file],
        title: shareTitle,
        text: shareText,
        ...(shareUrl ? { url: shareUrl } : {}),
      });
      return true;
    } catch (error) {
      // Abbruch durch den Nutzer -> nicht als Fehler behandeln, kein Download.
      if (error instanceof DOMException && error.name === "AbortError") {
        return false;
      }
      // Sonst: auf Download zurückfallen.
    }
  }

  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  return false;
}
