"use strict";

/*
  MBG — Maze Book Generator
  Version: Difficulty Engine + Mask + Deco + B&W Safe
  Page size: 8.5 x 11 in at 300 DPI = 2550 x 3300 px
*/

const MBG = {
  PAGE_W: 2550,
  PAGE_H: 3300,
  assets: {
    start: null,
    goal: null,
    checkpoint: null,
    enemy: null,
    mask: null
  },
  maskAssets: [],
  decoAssets: [],
  lastPreviewMaze: null
};

document.addEventListener("DOMContentLoaded", function () {
  bindMainAssetInputs();
  bindMaskInput();
  bindDecoInput();

  const previewCanvas = document.getElementById("previewCanvas");
  if (previewCanvas) {
    previewCanvas.width = MBG.PAGE_W;
    previewCanvas.height = MBG.PAGE_H;
    generatePreview();
  }
});

/* ============================================================
   BASIC HELPERS
============================================================ */

function el(id) {
  return document.getElementById(id);
}

function getValue(id, fallback = "") {
  const node = el(id);
  if (!node) return fallback;
  return node.value !== undefined ? node.value : fallback;
}

function parseFlexibleNumber(value, fallback = 0) {
  if (value === null || value === undefined) return fallback;

  const normalized = String(value)
    .trim()
    .replace(",", ".");

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getNumber(id, fallback = 0) {
  const node = el(id);
  if (!node) return fallback;
  return parseFlexibleNumber(node.value, fallback);
}

function getBool(id, fallback = false) {
  const node = el(id);
  if (!node) return fallback;

  if (node.type === "checkbox") return !!node.checked;

  const value = String(node.value).toLowerCase().trim();
  return value === "true" || value === "tak" || value === "yes" || value === "1";
}

function setStatus(message) {
  const status = el("statusText");
  if (status) status.textContent = message;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randomItem(arr) {
  if (!arr || !arr.length) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffleArray(arr) {
  const copy = arr.slice();

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }

  return copy;
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function waitFrame() {
  return new Promise(resolve => requestAnimationFrame(resolve));
}

function safeFileName(name) {
  return String(name || "maze-book")
    .toLowerCase()
    .replace(/[^a-z0-9ąćęłńóśźż]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "maze-book";
}

/* ============================================================
   SETTINGS
============================================================ */

function getDifficultyPreset(level) {
  const easyGrid = clamp(getNumber("easyGridSize", 15), 5, 80);
  const mediumGrid = clamp(getNumber("mediumGridSize", 18), 5, 80);
  const hardGrid = clamp(getNumber("hardGridSize", 20), 5, 80);
  const expertGrid = clamp(getNumber("expertGridSize", 25), 5, 80);

  const presets = {
    easy: {
      grid: easyGrid,
      checkpoints: 0,
      enemies: 0,
      extraOpeningsPercent: 35,
      goalDistanceMinPercent: 35,
      goalDistanceMaxPercent: 60,
      wallThicknessPercent: 105
    },
    medium: {
      grid: mediumGrid,
      checkpoints: 1,
      enemies: 0,
      extraOpeningsPercent: 22,
      goalDistanceMinPercent: 55,
      goalDistanceMaxPercent: 75,
      wallThicknessPercent: 115
    },
    hard: {
      grid: hardGrid,
      checkpoints: 2,
      enemies: 1,
      extraOpeningsPercent: 9,
      goalDistanceMinPercent: 70,
      goalDistanceMaxPercent: 90,
      wallThicknessPercent: 125
    },
    expert: {
      grid: expertGrid,
      checkpoints: 3,
      enemies: 2,
      extraOpeningsPercent: 3,
      goalDistanceMinPercent: 80,
      goalDistanceMaxPercent: 100,
      wallThicknessPercent: 135
    }
  };

  return presets[level] || presets.easy;
}

function readSettings() {
  const difficultyLevel = getValue("difficultyLevel", "easy");
  const autoDifficulty = getBool("autoDifficulty", true);
  const difficultyPreset = getDifficultyPreset(difficultyLevel);

  let mazeWidth = clamp(getNumber("mazeWidth", 15), 3, 80);
  let mazeHeight = clamp(getNumber("mazeHeight", 15), 3, 80);
  let checkpointCount = clamp(getNumber("checkpointCount", 0), 0, 12);
  let enemyCount = clamp(getNumber("enemyCount", 0), 0, 12);
  let extraOpeningsPercent = clamp(getNumber("extraOpeningsPercent", 35), 0, 80);
  let goalDistanceMinPercent = clamp(getNumber("goalDistanceMinPercent", 35), 0, 100);
  let goalDistanceMaxPercent = clamp(getNumber("goalDistanceMaxPercent", 60), 0, 100);
  let wallThicknessPercent = clamp(getNumber("wallThicknessPercent", 105), 30, 300);

  if (autoDifficulty) {
    mazeWidth = difficultyPreset.grid;
    mazeHeight = difficultyPreset.grid;
    checkpointCount = difficultyPreset.checkpoints;
    enemyCount = difficultyPreset.enemies;
    extraOpeningsPercent = difficultyPreset.extraOpeningsPercent;
    goalDistanceMinPercent = difficultyPreset.goalDistanceMinPercent;
    goalDistanceMaxPercent = difficultyPreset.goalDistanceMaxPercent;
    wallThicknessPercent = difficultyPreset.wallThicknessPercent;
  }

  if (goalDistanceMaxPercent < goalDistanceMinPercent) {
    const temp = goalDistanceMinPercent;
    goalDistanceMinPercent = goalDistanceMaxPercent;
    goalDistanceMaxPercent = temp;
  }

  const legacyUseEnemy = getBool("useEnemy", false);
  if (!autoDifficulty && legacyUseEnemy && enemyCount < 1) enemyCount = 1;

  const settings = {
    difficultyLevel,
    autoDifficulty,

    bookTitle: getValue("bookTitle", "MAZE BOOK"),
    bookTitleLine2: getValue("bookTitleLine2", "FOR KIDS"),
    bookSubtitle: getValue("bookSubtitle", "Fun Maze Activity Book"),
    bookInfo: getValue("bookInfo", "50 Fun Mazes"),
    missionStartText: getValue("missionStartText", "START YOUR ADVENTURE"),
    screenFreeText: getValue("screenFreeText", "A fun screen-free activity book for kids."),
    bookIntroText: getValue("bookIntroText", ""),

    howToTitle: getValue("howToTitle", "HOW TO PLAY"),
    howToFooter: getValue("howToFooter", "Use a pencil and have fun!"),
    howToLines: getValue("howToLines", ""),
    tipText: getValue("tipText", "Tip: Use a pencil so you can try again!"),

    mazePageTitle: getValue("mazePageTitle", "Maze"),
    mazePageSubtitle: getValue("mazePageSubtitle", "Find your way to the finish!"),
    mazePrefix: getValue("mazePrefix", "Maze"),
    solutionPrefix: getValue("solutionPrefix", "Solution"),
    solutionTitle: getValue("solutionTitle", "Solution"),
    solutionSubtitle: getValue("solutionSubtitle", "Follow the dashed path to check your answer."),

    mazeWidth,
    mazeHeight,
    mazeCount: clamp(getNumber("mazeCount", 50), 1, 150),
    safeMargin: clamp(getNumber("safeMargin", 220), 80, 600),
    mazePadding: clamp(getNumber("mazePadding", 100), 30, 500),
    wallThicknessPercent,
    checkpointCount,
    enemyCount,
    extraOpeningsPercent,
    goalDistanceMinPercent,
    goalDistanceMaxPercent,

    useAssets: getBool("useAssets", true),
    startScale: clamp(getNumber("startScale", 145), 10, 300) / 100,
    goalScale: clamp(getNumber("goalScale", 145), 10, 300) / 100,
    checkpointScale: clamp(getNumber("checkpointScale", 90), 10, 300) / 100,
    enemyScale: clamp(getNumber("enemyScale", 85), 10, 300) / 100,
    globalAssetScale: clamp(getNumber("globalAssetScale", 100), 10, 300) / 100,

    useIntroAssets: getBool("useIntroAssets", true),
    introAssetScale: clamp(getNumber("introAssetScale", 100), 10, 300) / 100,
    useInstructionIcons: getBool("useInstructionIcons", true),
    instructionIconScale: clamp(getNumber("instructionIconScale", 85), 10, 300) / 100,

    startLabel: getValue("startLabel", "START"),
    goalLabel: getValue("goalLabel", "FINISH"),
    checkpointLabel: getValue("checkpointLabel", "CHECK"),
    enemyLabel: getValue("enemyLabel", "AVOID"),

    useMask: getBool("useMask", false),
    maskFitMode: getValue("maskFitMode", "contain"),
    maskMode: getValue("maskMode", "single"),
    maskPaddingPercent: clamp(getNumber("maskPaddingPercent", 6), 0, 30),
    maskThreshold: clamp(getNumber("maskThreshold", 128), 0, 255),
    maskPolarity: getValue("maskPolarity", "auto"),
    maskInvert: getBool("maskInvert", false),
    showMaskGuide: getBool("showMaskGuide", false),
    maskGuideThickness: clamp(getNumber("maskGuideThickness", 6), 1, 40),

    decoEnabled: getBool("decoEnabled", false),
    decoOnIntro: getBool("decoOnIntro", true),
    decoOnMaze: getBool("decoOnMaze", true),
    decoOnSolution: getBool("decoOnSolution", false),
    decoOnCongrats: getBool("decoOnCongrats", true),
    decoPlacement: getValue("decoPlacement", "mixed"),
    decoDensity: clamp(getNumber("decoDensity", 4), 1, 20),
    decoOpacity: clamp(getNumber("decoOpacity", 0.35), 0.02, 1),
    decoScaleMin: clamp(getNumber("decoScaleMin", 0.18), 0.03, 3),
    decoScaleMax: clamp(getNumber("decoScaleMax", 0.35), 0.03, 3),
    decoRandomRotation: getBool("decoRandomRotation", true),
    decoAvoidMazeArea: getBool("decoAvoidMazeArea", true),

    includeCongratsPage: getBool("includeCongratsPage", true),
    congratsTitle: getValue("congratsTitle", "CONGRATULATIONS!"),
    congratsText: getValue("congratsText", ""),
    moreBooksText: getValue("moreBooksText", "Look for more maze adventures by Piotr Opałko."),

    exportFileName: getValue("exportFileName", "maze-book"),
    exportImageFormat: getValue("exportImageFormat", "JPEG"),
    jpegQuality: clamp(getNumber("jpegQuality", 0.92), 0.1, 1),
    includeIntroPages: getBool("includeIntroPages", true),
    includeSolutions: getBool("includeSolutions", true)
  };

  if (settings.decoScaleMax < settings.decoScaleMin) {
    const temp = settings.decoScaleMin;
    settings.decoScaleMin = settings.decoScaleMax;
    settings.decoScaleMax = temp;
  }

  return settings;
}

/* ============================================================
   ASSET LOADING
============================================================ */

function bindMainAssetInputs() {
  bindImageInput("startAsset", img => MBG.assets.start = img, "START");
  bindImageInput("goalAsset", img => MBG.assets.goal = img, "CEL / FINISH");
  bindImageInput("checkpointAsset", img => MBG.assets.checkpoint = img, "CHECKPOINT");
  bindImageInput("enemyAsset", img => MBG.assets.enemy = img, "ZAGROŻENIE");
}

function bindMaskInput() {
  const input = el("maskAsset");
  if (!input) return;

  input.addEventListener("change", async function () {
    const files = Array.from(input.files || []);
    MBG.maskAssets = [];

    for (const file of files) {
      try {
        const img = await fileToImage(file);
        MBG.maskAssets.push({ name: file.name, img });
      } catch (err) {
        console.error("Nie udało się wczytać maski:", file.name, err);
      }
    }

    MBG.assets.mask = MBG.maskAssets.length ? MBG.maskAssets[0].img : null;
    updateMaskCounter();

    if (MBG.maskAssets.length > 1) {
      setStatus("Załadowano maski: " + MBG.maskAssets.length);
    } else if (MBG.maskAssets.length === 1) {
      setStatus("Maska została załadowana.");
    } else {
      setStatus("Nie załadowano masek.");
    }

    generatePreview();
  });
}

function updateMaskCounter() {
  const counter = el("maskAssetCount");
  if (counter) {
    counter.textContent = "Załadowane maski: " + MBG.maskAssets.length;
  }
}

function bindDecoInput() {
  const input = el("decoAssetsInput");
  if (!input) return;

  input.addEventListener("change", async function () {
    const files = Array.from(input.files || []);
    MBG.decoAssets = [];

    for (const file of files) {
      try {
        const img = await fileToImage(file);
        MBG.decoAssets.push({ name: file.name, img });
      } catch (err) {
        console.error("Nie udało się wczytać DECO:", file.name, err);
      }
    }

    updateDecoCounter();
    setStatus("Załadowano assety DECO: " + MBG.decoAssets.length);
    generatePreview();
  });
}

function bindImageInput(inputId, callback, label) {
  const input = el(inputId);
  if (!input) return;

  input.addEventListener("change", async function () {
    const file = input.files && input.files[0];
    if (!file) return;

    try {
      const img = await fileToImage(file);
      callback(img);
      setStatus("Załadowano asset: " + label);
      generatePreview();
    } catch (err) {
      console.error(err);
      setStatus("Błąd ładowania assetu: " + label);
    }
  });
}

function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = function () {
      const img = new Image();
      img.onload = function () {
        resolve(img);
      };
      img.onerror = reject;
      img.src = reader.result;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function updateDecoCounter() {
  const counter = el("decoAssetCount");
  if (counter) {
    counter.textContent = "Załadowane assety DECO: " + MBG.decoAssets.length;
  }
}

function clearDecoAssets() {
  MBG.decoAssets = [];
  updateDecoCounter();
  generatePreview();
}

/* ============================================================
   PREVIEW
============================================================ */

function generatePreview() {
  const canvas = el("previewCanvas");
  if (!canvas) return;

  canvas.width = MBG.PAGE_W;
  canvas.height = MBG.PAGE_H;

  const ctx = canvas.getContext("2d");
  const settings = readSettings();

  const mazeData = createMazeData(settings, 1);
  MBG.lastPreviewMaze = mazeData;

  drawMazePage(ctx, settings, mazeData, false);
  forceCanvasGrayscale(canvas);

  setStatus("Podgląd odświeżony.");
}

function drawPreview() {
  generatePreview();
}

function drawPreviewMaze() {
  generatePreview();
}

/* ============================================================
   PDF EXPORT
============================================================ */

async function generatePDF() {
  const settings = readSettings();

  if (!window.jspdf || !window.jspdf.jsPDF) {
    alert("Nie załadowano jsPDF. Sprawdź połączenie z internetem albo CDN w pliku HTML.");
    return;
  }

  const { jsPDF } = window.jspdf;

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "in",
    format: [8.5, 11],
    compress: true
  });

  let pdfPageCount = 0;

  function addCanvas(canvas) {
    forceCanvasGrayscale(canvas);

    const format = settings.exportImageFormat === "PNG" ? "PNG" : "JPEG";
    const data = format === "PNG"
      ? canvas.toDataURL("image/png")
      : canvas.toDataURL("image/jpeg", settings.jpegQuality);

    if (pdfPageCount > 0) {
      pdf.addPage([8.5, 11], "portrait");
    }

    pdf.addImage(data, format, 0, 0, 8.5, 11);
    pdfPageCount++;
  }

  setStatus("Generowanie PDF...");

  if (settings.includeIntroPages) {
    let canvas = createCanvas();
    drawIntroPage(canvas.getContext("2d"), settings);
    addCanvas(canvas);

    canvas = createCanvas();
    drawHowToPage(canvas.getContext("2d"), settings);
    addCanvas(canvas);
  }

  const mazes = [];

  for (let i = 1; i <= settings.mazeCount; i++) {
    const mazeData = createMazeData(settings, i);
    mazes.push(mazeData);

    const canvas = createCanvas();
    drawMazePage(canvas.getContext("2d"), settings, mazeData, false);
    addCanvas(canvas);

    if (i % 5 === 0) {
      setStatus("Wygenerowano labirynty: " + i + " / " + settings.mazeCount);
      await waitFrame();
    }
  }

  if (settings.includeSolutions) {
    for (let i = 0; i < mazes.length; i++) {
      const canvas = createCanvas();
      drawMazePage(canvas.getContext("2d"), settings, mazes[i], true);
      addCanvas(canvas);

      if ((i + 1) % 5 === 0) {
        setStatus("Wygenerowano rozwiązania: " + (i + 1) + " / " + mazes.length);
        await waitFrame();
      }
    }
  }

  if (settings.includeCongratsPage) {
    const canvas = createCanvas();
    drawCongratsPage(canvas.getContext("2d"), settings);
    addCanvas(canvas);
  }

  const fileName = safeFileName(settings.exportFileName) + ".pdf";
  pdf.save(fileName);

  setStatus("PDF wygenerowany. Liczba stron: " + pdfPageCount);
}

async function generateFullPdf() {
  await generatePDF();
}

function createCanvas() {
  const canvas = document.createElement("canvas");
  canvas.width = MBG.PAGE_W;
  canvas.height = MBG.PAGE_H;
  return canvas;
}

/* ============================================================
   B&W / GRAYSCALE SAFE
============================================================ */

function forceCanvasGrayscale(canvas) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(
      data[i] * 0.299 +
      data[i + 1] * 0.587 +
      data[i + 2] * 0.114
    );

    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }

  ctx.putImageData(imageData, 0, 0);
}

/* ============================================================
   PAGE LAYOUT
============================================================ */

function clearPage(ctx) {
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, MBG.PAGE_W, MBG.PAGE_H);
  ctx.restore();
}

function getMazeLayout(settings) {
  const safe = settings.safeMargin;
  const headerHeight = 360;
  const footerHeight = 220;

  const availableW = MBG.PAGE_W - safe * 2;
  const availableH = MBG.PAGE_H - safe * 2 - headerHeight - footerHeight - settings.mazePadding;

  const cellW = availableW / settings.mazeWidth;
  const cellH = availableH / settings.mazeHeight;
  const cell = Math.min(cellW, cellH);

  const boxW = cell * settings.mazeWidth;
  const boxH = cell * settings.mazeHeight;

  const mazeBox = {
    x: (MBG.PAGE_W - boxW) / 2,
    y: safe + headerHeight + Math.floor(settings.mazePadding * 0.15),
    w: boxW,
    h: boxH
  };

  return {
    safe,
    headerBox: {
      x: safe,
      y: safe,
      w: MBG.PAGE_W - safe * 2,
      h: headerHeight
    },
    mazeBox,
    footerBox: {
      x: safe,
      y: mazeBox.y + mazeBox.h + 60,
      w: MBG.PAGE_W - safe * 2,
      h: footerHeight
    }
  };
}

/* ============================================================
   INTRO / HOW TO / CONGRATS
============================================================ */

function drawIntroPage(ctx, settings) {
  clearPage(ctx);

  drawDecoLayer(ctx, settings, "intro", {
    mazeBox: null,
    headerBox: { x: 180, y: 180, w: MBG.PAGE_W - 360, h: 650 },
    footerBox: { x: 180, y: 2600, w: MBG.PAGE_W - 360, h: 420 }
  });

  ctx.save();
  ctx.textAlign = "center";

  ctx.fillStyle = "#111827";
  fitText(ctx, settings.bookTitle, MBG.PAGE_W / 2, 660, 128, 2000, "Arial", "bold");

  if (settings.bookTitleLine2) {
    fitText(ctx, settings.bookTitleLine2, MBG.PAGE_W / 2, 820, 82, 1900, "Arial", "bold");
  }

  ctx.fillStyle = "#111827";
  ctx.font = "bold 54px Arial";
  wrapText(ctx, settings.bookSubtitle, MBG.PAGE_W / 2, 990, 1800, 68, "center");

  ctx.fillStyle = "#111827";
  ctx.font = "bold 48px Arial";
  wrapText(ctx, settings.bookInfo, MBG.PAGE_W / 2, 1190, 1800, 62, "center");

  ctx.fillStyle = "#111827";
  ctx.font = "bold 48px Arial";
  wrapText(ctx, settings.missionStartText, MBG.PAGE_W / 2, 1480, 1800, 62, "center");

  ctx.fillStyle = "#374151";
  ctx.font = "38px Arial";
  wrapText(ctx, settings.screenFreeText, MBG.PAGE_W / 2, 1660, 1750, 54, "center");

  ctx.fillStyle = "#111827";
  ctx.font = "40px Arial";
  wrapText(ctx, settings.bookIntroText, MBG.PAGE_W / 2, 1930, 1750, 58, "center");

  if (settings.useIntroAssets) {
    drawIntroAssets(ctx, settings);
  }

  ctx.restore();
}

function drawIntroAssets(ctx, settings) {
  /*
    FIX 2026-05:
    Intro assets are now placed as a balanced layout instead of a simple left column.
    This prevents checkpoint/flag assets from stacking under the START asset on title pages.

    Visual logic:
    - START / astronaut: lower left
    - GOAL / planet: lower right
    - CHECKPOINT / flag: smaller, between them, slightly lower
    - ENEMY: optional, lower right/lower middle if used in advanced books

    Important:
    Tall vertical checkpoint assets, such as a flag, receive their own smaller scale.
  */

  const scale = settings.introAssetScale;
  const mainSize = 260 * scale;
  const smallSize = mainSize * 0.58;

  const yMain = 2520;
  const ySmall = 2840;

  drawImageIfExists(ctx, MBG.assets.start, 430, yMain, mainSize);
  drawImageIfExists(ctx, MBG.assets.goal, MBG.PAGE_W - 430, yMain, mainSize);

  if (MBG.assets.checkpoint) {
    drawImageIfExists(ctx, MBG.assets.checkpoint, 650, ySmall, smallSize);
  }

  if (MBG.assets.enemy) {
    drawImageIfExists(ctx, MBG.assets.enemy, MBG.PAGE_W - 650, ySmall, smallSize);
  }
}


function getInstructionIconForLine(line, index) {
  /*
    Smart icon mapping for HOW TO PLAY.
    This keeps instruction icons aligned with the visible gameplay assets.

    Examples:
    - "Find the astronaut." -> START asset
    - "Collect the flag." -> CHECKPOINT asset
    - "Reach the planet." -> GOAL asset

    Fallbacks are kept for older books that still use START / FINISH wording.
  */
  const text = String(line || "").toLowerCase();

  if (
    text.includes("astronaut") ||
    text.includes("start") ||
    text.includes("begin")
  ) {
    return MBG.assets.start;
  }

  if (
    text.includes("flag") ||
    text.includes("checkpoint") ||
    text.includes("collect")
  ) {
    return MBG.assets.checkpoint;
  }

  if (
    text.includes("planet") ||
    text.includes("finish") ||
    text.includes("goal") ||
    text.includes("reach")
  ) {
    return MBG.assets.goal;
  }

  if (
    text.includes("avoid") ||
    text.includes("enemy") ||
    text.includes("danger") ||
    text.includes("threat")
  ) {
    return MBG.assets.enemy;
  }

  // Legacy positional fallback for simple books:
  if (index === 0) return MBG.assets.start;

  return null;
}


function drawHowToPage(ctx, settings) {
  clearPage(ctx);

  drawDecoLayer(ctx, settings, "intro", {
    mazeBox: null,
    headerBox: { x: 180, y: 180, w: MBG.PAGE_W - 360, h: 500 },
    footerBox: { x: 180, y: 2700, w: MBG.PAGE_W - 360, h: 380 }
  });

  ctx.save();
  ctx.textAlign = "center";
  ctx.fillStyle = "#111827";
  fitText(ctx, settings.howToTitle, MBG.PAGE_W / 2, 420, 110, 1900, "Arial", "bold");

  const lines = settings.howToLines
    .split("\n")
    .map(x => x.trim())
    .filter(Boolean);

  const boxX = 350;
  const boxW = MBG.PAGE_W - 700;
  let y = 730;

  for (let i = 0; i < lines.length; i++) {
    ctx.fillStyle = "#f9fafb";
    roundRect(ctx, boxX, y, boxW, 185, 28, true, false);

    ctx.strokeStyle = "#d1d5db";
    ctx.lineWidth = 4;
    roundRect(ctx, boxX, y, boxW, 185, 28, false, true);

    ctx.fillStyle = "#111827";
    ctx.textAlign = "left";
    ctx.font = "bold 52px Arial";
    ctx.fillText(String(i + 1) + ".", boxX + 55, y + 115);

    ctx.font = "42px Arial";
    wrapText(ctx, lines[i], boxX + 145, y + 75, boxW - 210, 54, "left");

    if (settings.useInstructionIcons) {
      const iconSize = 110 * settings.instructionIconScale;
      const iconX = boxX + boxW - 95;
      const iconY = y + 92;

      const iconAsset = getInstructionIconForLine(lines[i], i);

      if (iconAsset) {
        const adjustedSize = iconAsset === MBG.assets.checkpoint
          ? iconSize * 0.78
          : iconSize;

        drawImageIfExists(ctx, iconAsset, iconX, iconY, adjustedSize);
      }
    }

    y += 235;
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "#111827";
  ctx.font = "bold 42px Arial";
  wrapText(ctx, settings.tipText, MBG.PAGE_W / 2, 2530, 1800, 58, "center");

  ctx.fillStyle = "#374151";
  ctx.font = "38px Arial";
  wrapText(ctx, settings.howToFooter, MBG.PAGE_W / 2, 2840, 1800, 54, "center");

  ctx.restore();
}

function drawCongratsPage(ctx, settings) {
  clearPage(ctx);

  drawDecoLayer(ctx, settings, "congrats", {
    mazeBox: null,
    headerBox: { x: 180, y: 180, w: MBG.PAGE_W - 360, h: 600 },
    footerBox: { x: 180, y: 2650, w: MBG.PAGE_W - 360, h: 420 }
  });

  ctx.save();
  ctx.textAlign = "center";

  ctx.fillStyle = "#111827";
  fitText(ctx, settings.congratsTitle, MBG.PAGE_W / 2, 620, 118, 1900, "Arial", "bold");

  ctx.fillStyle = "#374151";
  ctx.font = "46px Arial";
  wrapText(ctx, settings.congratsText, MBG.PAGE_W / 2, 980, 1800, 66, "center");

  ctx.fillStyle = "#111827";
  ctx.font = "bold 42px Arial";
  wrapText(ctx, settings.moreBooksText, MBG.PAGE_W / 2, 2450, 1800, 58, "center");

  ctx.fillStyle = "#6b7280";
  ctx.font = "36px Arial";
  ctx.fillText("Space • Dino • Jungle • Farm • Puppy • Knight", MBG.PAGE_W / 2, 2620);

  ctx.restore();
}

/* ============================================================
   MAZE DATA
============================================================ */

function createMazeData(settings, index) {
  const maskGrid = createMaskGrid(settings, index);
  const activeGrid = normalizeActiveGrid(maskGrid, settings.mazeWidth, settings.mazeHeight);

  const cells = createCells(settings.mazeWidth, settings.mazeHeight, activeGrid);
  const activeCells = getActiveCells(cells);

  if (activeCells.length < 2) {
    return createFallbackRectMaze(settings, index);
  }

  const start = findStartCell(activeCells);
  const goal = findGoalCell(activeCells, start, settings);

  generateMazeOnActiveCells(cells, start);

  openExtraWalls(cells, settings.extraOpeningsPercent);

  const solutionPath = solveMaze(cells, start, goal);

  const checkpoints = pickCheckpoints(solutionPath, settings.checkpointCount);
  const enemies = pickEnemies(cells, solutionPath, start, goal, checkpoints, settings.enemyCount);

  return {
    index,
    width: settings.mazeWidth,
    height: settings.mazeHeight,
    cells,
    activeGrid,
    start,
    goal,
    checkpoints,
    enemies,
    enemy: enemies[0] || null,
    solutionPath
  };
}

function createFallbackRectMaze(settings, index) {
  const activeGrid = createFullActiveGrid(settings.mazeWidth, settings.mazeHeight);
  const cells = createCells(settings.mazeWidth, settings.mazeHeight, activeGrid);

  const activeCells = getActiveCells(cells);
  const start = findStartCell(activeCells);
  const goal = findGoalCell(activeCells, start, settings);

  generateMazeOnActiveCells(cells, start);

  openExtraWalls(cells, settings.extraOpeningsPercent);

  const solutionPath = solveMaze(cells, start, goal);
  const checkpoints = pickCheckpoints(solutionPath, settings.checkpointCount);
  const enemies = pickEnemies(cells, solutionPath, start, goal, checkpoints, settings.enemyCount);

  return {
    index,
    width: settings.mazeWidth,
    height: settings.mazeHeight,
    cells,
    activeGrid,
    start,
    goal,
    checkpoints,
    enemies,
    enemy: enemies[0] || null,
    solutionPath
  };
}

function createCells(width, height, activeGrid) {
  const cells = [];

  for (let y = 0; y < height; y++) {
    const row = [];

    for (let x = 0; x < width; x++) {
      row.push({
        x,
        y,
        active: !!activeGrid[y][x],
        visited: false,
        walls: {
          top: true,
          right: true,
          bottom: true,
          left: true
        }
      });
    }

    cells.push(row);
  }

  return cells;
}

function getActiveCells(cells) {
  const list = [];

  for (const row of cells) {
    for (const cell of row) {
      if (cell.active) list.push(cell);
    }
  }

  return list;
}

function generateMazeOnActiveCells(cells, start) {
  for (const row of cells) {
    for (const cell of row) {
      cell.visited = false;
      cell.walls.top = true;
      cell.walls.right = true;
      cell.walls.bottom = true;
      cell.walls.left = true;
    }
  }

  const stack = [];
  let current = start;
  current.visited = true;

  while (true) {
    const neighbors = getUnvisitedActiveNeighbors(cells, current);

    if (neighbors.length > 0) {
      const next = randomItem(neighbors);
      removeWallBetween(current, next);
      stack.push(current);
      current = next;
      current.visited = true;
    } else if (stack.length > 0) {
      current = stack.pop();
    } else {
      break;
    }
  }
}

function getUnvisitedActiveNeighbors(cells, cell) {
  const result = [];
  const dirs = [
    { dx: 0, dy: -1 },
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 }
  ];

  for (const d of dirs) {
    const nx = cell.x + d.dx;
    const ny = cell.y + d.dy;

    if (cells[ny] && cells[ny][nx]) {
      const n = cells[ny][nx];
      if (n.active && !n.visited) result.push(n);
    }
  }

  return result;
}

function removeWallBetween(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;

  if (dx === 1) {
    a.walls.right = false;
    b.walls.left = false;
  } else if (dx === -1) {
    a.walls.left = false;
    b.walls.right = false;
  } else if (dy === 1) {
    a.walls.bottom = false;
    b.walls.top = false;
  } else if (dy === -1) {
    a.walls.top = false;
    b.walls.bottom = false;
  }
}

function openExtraWalls(cells, percent) {
  const p = clamp(percent, 0, 80) / 100;
  if (p <= 0) return;

  const candidates = [];

  for (let y = 0; y < cells.length; y++) {
    for (let x = 0; x < cells[y].length; x++) {
      const cell = cells[y][x];
      if (!cell.active) continue;

      const right = cells[y][x + 1];
      if (right && right.active && cell.walls.right && right.walls.left) {
        candidates.push({ a: cell, b: right });
      }

      const bottom = cells[y + 1] && cells[y + 1][x];
      if (bottom && bottom.active && cell.walls.bottom && bottom.walls.top) {
        candidates.push({ a: cell, b: bottom });
      }
    }
  }

  const shuffled = shuffleArray(candidates);
  const count = Math.floor(shuffled.length * p);

  for (let i = 0; i < count; i++) {
    removeWallBetween(shuffled[i].a, shuffled[i].b);
  }
}

function solveMaze(cells, start, goal) {
  const queue = [start];
  const visited = new Set([cellKey(start)]);
  const parent = new Map();

  while (queue.length > 0) {
    const current = queue.shift();

    if (current.x === goal.x && current.y === goal.y) break;

    const neighbors = getOpenNeighbors(cells, current);

    for (const n of neighbors) {
      const k = cellKey(n);
      if (!visited.has(k)) {
        visited.add(k);
        parent.set(k, current);
        queue.push(n);
      }
    }
  }

  const path = [];
  let cur = goal;

  while (cur) {
    path.push(cur);

    if (cur.x === start.x && cur.y === start.y) break;

    cur = parent.get(cellKey(cur));
    if (!cur) break;
  }

  return path.reverse();
}

function getOpenNeighbors(cells, cell) {
  const result = [];
  const x = cell.x;
  const y = cell.y;

  if (!cell.walls.top && cells[y - 1] && cells[y - 1][x]) result.push(cells[y - 1][x]);
  if (!cell.walls.right && cells[y] && cells[y][x + 1]) result.push(cells[y][x + 1]);
  if (!cell.walls.bottom && cells[y + 1] && cells[y + 1][x]) result.push(cells[y + 1][x]);
  if (!cell.walls.left && cells[y] && cells[y][x - 1]) result.push(cells[y][x - 1]);

  return result.filter(c => c && c.active);
}

function cellKey(cell) {
  return cell.x + "," + cell.y;
}

/* ============================================================
   RANDOM START / GOAL PLACEMENT WITH DIFFICULTY
============================================================ */

function findStartCell(activeCells) {
  if (!activeCells || activeCells.length === 0) return null;
  if (activeCells.length === 1) return activeCells[0];

  const bounds = getActiveCellBounds(activeCells);
  const width = bounds.maxX - bounds.minX + 1;
  const height = bounds.maxY - bounds.minY + 1;

  const edgeLimit = Math.max(1, Math.floor(Math.min(width, height) * 0.18));

  let candidates = activeCells.filter(cell => {
    const edgeDistance = Math.min(
      cell.x - bounds.minX,
      bounds.maxX - cell.x,
      cell.y - bounds.minY,
      bounds.maxY - cell.y
    );

    return edgeDistance <= edgeLimit;
  });

  if (!candidates.length) {
    candidates = activeCells;
  }

  return randomItem(candidates);
}

function findGoalCell(activeCells, start, settings) {
  if (!activeCells || activeCells.length === 0) return null;
  if (activeCells.length === 1) return activeCells[0];

  const bounds = getActiveCellBounds(activeCells);
  const width = bounds.maxX - bounds.minX + 1;
  const height = bounds.maxY - bounds.minY + 1;

  const edgeLimit = Math.max(1, Math.floor(Math.min(width, height) * 0.18));

  let edgeCandidates = activeCells.filter(cell => {
    if (cell.x === start.x && cell.y === start.y) return false;

    const edgeDistance = Math.min(
      cell.x - bounds.minX,
      bounds.maxX - cell.x,
      cell.y - bounds.minY,
      bounds.maxY - cell.y
    );

    return edgeDistance <= edgeLimit;
  });

  if (!edgeCandidates.length) {
    edgeCandidates = activeCells.filter(cell => !(cell.x === start.x && cell.y === start.y));
  }

  let maxDistance = 0;

  for (const cell of edgeCandidates) {
    const distance = Math.abs(cell.x - start.x) + Math.abs(cell.y - start.y);
    if (distance > maxDistance) maxDistance = distance;
  }

  const minRatio = clamp(settings.goalDistanceMinPercent / 100, 0, 1);
  const maxRatio = clamp(settings.goalDistanceMaxPercent / 100, 0, 1);

  let distanceCandidates = edgeCandidates.filter(cell => {
    const distance = Math.abs(cell.x - start.x) + Math.abs(cell.y - start.y);
    return distance >= maxDistance * minRatio && distance <= maxDistance * maxRatio;
  });

  if (!distanceCandidates.length) {
    distanceCandidates = edgeCandidates.filter(cell => {
      const distance = Math.abs(cell.x - start.x) + Math.abs(cell.y - start.y);
      return distance >= maxDistance * minRatio;
    });
  }

  if (!distanceCandidates.length) {
    distanceCandidates = edgeCandidates;
  }

  return randomItem(distanceCandidates);
}

function getActiveCellBounds(activeCells) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const cell of activeCells) {
    if (cell.x < minX) minX = cell.x;
    if (cell.y < minY) minY = cell.y;
    if (cell.x > maxX) maxX = cell.x;
    if (cell.y > maxY) maxY = cell.y;
  }

  return { minX, minY, maxX, maxY };
}

function pickCheckpoints(path, count) {
  const checkpoints = [];
  if (!path || path.length < 5 || count <= 0) return checkpoints;

  for (let i = 1; i <= count; i++) {
    const t = i / (count + 1);
    const idx = clamp(Math.floor(path.length * t), 1, path.length - 2);
    checkpoints.push(path[idx]);
  }

  return checkpoints;
}

function pickEnemies(cells, path, start, goal, checkpoints, count) {
  const enemies = [];
  const enemyCount = clamp(count, 0, 12);
  if (enemyCount <= 0) return enemies;

  const blocked = new Set();

  for (const p of path || []) blocked.add(cellKey(p));
  blocked.add(cellKey(start));
  blocked.add(cellKey(goal));

  for (const c of checkpoints || []) {
    blocked.add(cellKey(c));
  }

  const candidates = [];

  for (const row of cells) {
    for (const cell of row) {
      if (cell.active && !blocked.has(cellKey(cell))) {
        candidates.push(cell);
      }
    }
  }

  const shuffled = shuffleArray(candidates);

  for (const c of shuffled) {
    if (enemies.length >= enemyCount) break;

    const tooClose = enemies.some(e => {
      return Math.abs(e.x - c.x) + Math.abs(e.y - c.y) < 3;
    });

    if (!tooClose) {
      enemies.push(c);
    }
  }

  return enemies;
}

/* ============================================================
   MASK
   New rule:
   - PNG masks may stay 2000 x 2000 px.
   - MBG detects the real active shape, crops it logically,
     centers it, scales it to the grid, and samples cells.
   - Supports one mask, random masks, and ordered masks.
   - Compatibility:
     maskAsset input can be single or multiple.
     If HTML has no maskMode / maskPaddingPercent / maskPolarity fields,
     safe defaults are used.
============================================================ */

function pickMaskAsset(settings, index) {
  const masks = MBG.maskAssets && MBG.maskAssets.length
    ? MBG.maskAssets
    : (MBG.assets.mask ? [{ name: "mask", img: MBG.assets.mask }] : []);

  if (!masks.length) return null;

  const mode = String(settings.maskMode || "single").toLowerCase();

  if (mode === "random" || mode === "losowo") {
    return randomItem(masks).img;
  }

  if (mode === "ordered" || mode === "sequence" || mode === "po-kolei") {
    const i = Math.max(0, (index || 1) - 1) % masks.length;
    return masks[i].img;
  }

  return masks[0].img;
}

function createMaskGrid(settings, index) {
  const width = settings.mazeWidth;
  const height = settings.mazeHeight;

  if (!settings.useMask) {
    return createFullActiveGrid(width, height);
  }

  const maskImg = pickMaskAsset(settings, index);

  if (!maskImg) {
    return createFullActiveGrid(width, height);
  }

  const options = {
    threshold: settings.maskThreshold,
    paddingPercent: settings.maskPaddingPercent,
    polarity: settings.maskPolarity,
    invert: settings.maskInvert,
    fitMode: settings.maskFitMode
  };

  let grid = buildAutoFitMaskGrid(maskImg, width, height, options);

  grid = normalizeActiveGrid(grid, width, height);

  const activeCount = countActiveCells(grid, width, height);
  const activeRatio = activeCount / Math.max(1, width * height);

  if (activeCount < 4 || activeRatio < 0.08) {
    console.warn("Maska dała zbyt mało aktywnych pól. Użyto zwykłego prostokąta.");
    setStatus("Maska dała zbyt mało aktywnych pól — użyto zwykłego prostokąta.");
    return createFullActiveGrid(width, height);
  }

  return grid;
}

function createFullActiveGrid(width, height) {
  const grid = [];

  for (let y = 0; y < height; y++) {
    const row = [];
    for (let x = 0; x < width; x++) row.push(true);
    grid.push(row);
  }

  return grid;
}

function buildAutoFitMaskGrid(img, cols, rows, options = {}) {
  const threshold = clamp(Number(options.threshold ?? 128), 0, 255);
  const paddingPercent = clamp(Number(options.paddingPercent ?? 6), 0, 30);
  const padding = paddingPercent / 100;
  const fitMode = String(options.fitMode || "contain").toLowerCase();

  const srcCanvas = document.createElement("canvas");
  const srcCtx = srcCanvas.getContext("2d", { willReadFrequently: true });

  srcCanvas.width = img.naturalWidth || img.width;
  srcCanvas.height = img.naturalHeight || img.height;

  srcCtx.clearRect(0, 0, srcCanvas.width, srcCanvas.height);
  srcCtx.drawImage(img, 0, 0, srcCanvas.width, srcCanvas.height);

  const srcImage = srcCtx.getImageData(0, 0, srcCanvas.width, srcCanvas.height);
  const srcData = srcImage.data;

  const polarity = resolveMaskPolarity(srcData, threshold, options);

  const bounds = findMaskActiveBoundsFromData(
    srcData,
    srcCanvas.width,
    srcCanvas.height,
    threshold,
    polarity
  );

  if (!bounds) {
    console.warn("Nie wykryto aktywnego obszaru maski.");
    return createFullActiveGrid(cols, rows);
  }

  const workSize = 2000;
  const workCanvas = document.createElement("canvas");
  const workCtx = workCanvas.getContext("2d", { willReadFrequently: true });

  workCanvas.width = workSize;
  workCanvas.height = workSize;

  workCtx.fillStyle = polarity === "dark" ? "#ffffff" : "#000000";
  workCtx.fillRect(0, 0, workSize, workSize);

  let targetW = workSize * (1 - padding * 2);
  let targetH = workSize * (1 - padding * 2);

  targetW = Math.max(10, targetW);
  targetH = Math.max(10, targetH);

  const sourceRatio = bounds.w / bounds.h;
  const targetRatio = targetW / targetH;

  let drawW;
  let drawH;

  if (fitMode === "stretch") {
    drawW = targetW;
    drawH = targetH;
  } else if (fitMode === "cover") {
    if (sourceRatio > targetRatio) {
      drawH = targetH;
      drawW = targetH * sourceRatio;
    } else {
      drawW = targetW;
      drawH = targetW / sourceRatio;
    }
  } else {
    if (sourceRatio > targetRatio) {
      drawW = targetW;
      drawH = targetW / sourceRatio;
    } else {
      drawH = targetH;
      drawW = targetH * sourceRatio;
    }
  }

  const dx = (workSize - drawW) / 2;
  const dy = (workSize - drawH) / 2;

  workCtx.imageSmoothingEnabled = true;
  workCtx.imageSmoothingQuality = "high";

  workCtx.drawImage(
    srcCanvas,
    bounds.x,
    bounds.y,
    bounds.w,
    bounds.h,
    dx,
    dy,
    drawW,
    drawH
  );

  const workData = workCtx.getImageData(0, 0, workSize, workSize).data;

  const grid = [];
  let activeCount = 0;

  for (let y = 0; y < rows; y++) {
    const row = [];

    for (let x = 0; x < cols; x++) {
      const active = sampleMaskCell(
        workData,
        workSize,
        cols,
        rows,
        x,
        y,
        threshold,
        polarity
      );

      row.push(active);
      if (active) activeCount++;
    }

    grid.push(row);
  }

  const minUseful = Math.max(4, Math.floor(cols * rows * 0.08));

  if (activeCount < minUseful) {
    console.warn("Po próbkowaniu maska ma za mało pól aktywnych.");
    return createFullActiveGrid(cols, rows);
  }

  if (cols <= 24 || rows <= 24) {
    return dilateGrid(grid, cols, rows, 1);
  }

  return grid;
}

function resolveMaskPolarity(data, threshold, options = {}) {
  /*
    WAŻNE — poprawka pod Twoje maski:
    MBG ma traktować FIGURĘ jako aktywny obszar labiryntu, a nie tło.
    Dlatego silnik automatycznie wybiera kolor MNIEJSZOŚCIOWY z pliku maski.

    Przykłady:
    - biała rakieta na czarnym tle  -> aktywna jest biała rakieta
    - czarna rakieta na białym tle  -> aktywna jest czarna rakieta

    Pole "Odwróć maskę" działa dopiero po tym wyborze i odwraca logikę.
  */

  let brightCount = 0;
  let darkCount = 0;
  let visibleCount = 0;

  const step = 4 * 16;

  for (let i = 0; i < data.length; i += step) {
    const a = data[i + 3];
    if (a <= 10) continue;

    visibleCount++;

    const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
    if (brightness >= threshold) brightCount++;
    else darkCount++;
  }

  if (visibleCount === 0) return "bright";

  let polarity = brightCount <= darkCount ? "bright" : "dark";

  if (options.invert === true) {
    polarity = polarity === "bright" ? "dark" : "bright";
  }

  return polarity;
}

function isMaskPixelActive(r, g, b, a, threshold, polarity) {
  if (a <= 10) return false;

  const brightness = (r + g + b) / 3;

  if (polarity === "dark") {
    return brightness < threshold;
  }

  return brightness >= threshold;
}

function findMaskActiveBoundsFromData(data, width, height, threshold, polarity) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      const active = isMaskPixelActive(
        data[idx],
        data[idx + 1],
        data[idx + 2],
        data[idx + 3],
        threshold,
        polarity
      );

      if (active) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    return null;
  }

  const pad = Math.round(Math.min(width, height) * 0.015);

  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(width - 1, maxX + pad);
  maxY = Math.min(height - 1, maxY + pad);

  return {
    x: minX,
    y: minY,
    w: maxX - minX + 1,
    h: maxY - minY + 1
  };
}

function sampleMaskCell(data, workSize, cols, rows, gx, gy, threshold, polarity) {
  const cellX0 = (gx / cols) * workSize;
  const cellY0 = (gy / rows) * workSize;
  const cellW = workSize / cols;
  const cellH = workSize / rows;

  const samplePoints = [
    [0.5, 0.5],
    [0.25, 0.25],
    [0.75, 0.25],
    [0.25, 0.75],
    [0.75, 0.75],
    [0.5, 0.2],
    [0.8, 0.5],
    [0.5, 0.8],
    [0.2, 0.5]
  ];

  let hits = 0;

  for (const [sx, sy] of samplePoints) {
    const px = clamp(Math.floor(cellX0 + cellW * sx), 0, workSize - 1);
    const py = clamp(Math.floor(cellY0 + cellH * sy), 0, workSize - 1);
    const idx = (py * workSize + px) * 4;

    if (isMaskPixelActive(
      data[idx],
      data[idx + 1],
      data[idx + 2],
      data[idx + 3],
      threshold,
      polarity
    )) {
      hits++;
    }
  }

  return hits >= 3;
}

function dilateGrid(grid, width, height, iterations) {
  let current = grid;

  for (let i = 0; i < iterations; i++) {
    const next = [];

    for (let y = 0; y < height; y++) {
      const row = [];

      for (let x = 0; x < width; x++) {
        if (current[y][x]) {
          row.push(true);
          continue;
        }

        let hasActiveNeighbor = false;

        const neighbors = [
          { x: x, y: y - 1 },
          { x: x + 1, y: y },
          { x: x, y: y + 1 },
          { x: x - 1, y: y }
        ];

        for (const n of neighbors) {
          if (
            n.x >= 0 &&
            n.y >= 0 &&
            n.x < width &&
            n.y < height &&
            current[n.y][n.x]
          ) {
            hasActiveNeighbor = true;
            break;
          }
        }

        row.push(hasActiveNeighbor);
      }

      next.push(row);
    }

    current = next;
  }

  return current;
}

function countActiveCells(grid, width, height) {
  let count = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid[y][x]) count++;
    }
  }

  return count;
}

function normalizeActiveGrid(grid, width, height) {
  const largest = findLargestComponent(grid, width, height);

  if (largest.size < 2) return grid;

  const normalized = [];

  for (let y = 0; y < height; y++) {
    const row = [];

    for (let x = 0; x < width; x++) {
      row.push(largest.keys.has(x + "," + y));
    }

    normalized.push(row);
  }

  return normalized;
}

function findLargestComponent(grid, width, height) {
  const seen = new Set();
  let bestKeys = new Set();

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const k = x + "," + y;

      if (!grid[y][x] || seen.has(k)) continue;

      const component = new Set();
      const queue = [{ x, y }];
      seen.add(k);

      while (queue.length) {
        const p = queue.shift();
        component.add(p.x + "," + p.y);

        const dirs = [
          { x: p.x, y: p.y - 1 },
          { x: p.x + 1, y: p.y },
          { x: p.x, y: p.y + 1 },
          { x: p.x - 1, y: p.y }
        ];

        for (const n of dirs) {
          const nk = n.x + "," + n.y;

          if (
            n.x >= 0 &&
            n.y >= 0 &&
            n.x < width &&
            n.y < height &&
            grid[n.y][n.x] &&
            !seen.has(nk)
          ) {
            seen.add(nk);
            queue.push(n);
          }
        }
      }

      if (component.size > bestKeys.size) {
        bestKeys = component;
      }
    }
  }

  return {
    keys: bestKeys,
    size: bestKeys.size
  };
}

/* ============================================================
   MAZE DRAWING
============================================================ */

function drawMazePage(ctx, settings, mazeData, isSolution) {
  clearPage(ctx);

  const layout = getMazeLayout(settings);

  drawDecoLayer(ctx, settings, isSolution ? "solution" : "maze", layout);

  drawMazeHeader(ctx, settings, mazeData, isSolution);
  drawMazeGrid(ctx, settings, mazeData, layout);

  if (settings.showMaskGuide && settings.useMask) {
    drawMaskGuide(ctx, settings, mazeData, layout);
  }

  if (isSolution) {
    drawSolutionPath(ctx, settings, mazeData, layout);
  }

  drawMazeAssets(ctx, settings, mazeData, layout);
  drawMazeFooter(ctx, settings, mazeData, isSolution);
}

function drawMazeHeader(ctx, settings, mazeData, isSolution) {
  ctx.save();
  ctx.textAlign = "center";

  ctx.fillStyle = "#111827";
  ctx.font = "bold 62px Arial";

  const prefix = isSolution ? settings.solutionPrefix : settings.mazePrefix;
  const title = isSolution ? settings.solutionTitle : settings.mazePageTitle;
  const subtitle = isSolution ? settings.solutionSubtitle : settings.mazePageSubtitle;

  ctx.fillText(prefix + " " + mazeData.index, MBG.PAGE_W / 2, settings.safeMargin + 70);

  ctx.font = "bold 48px Arial";
  ctx.fillText(title, MBG.PAGE_W / 2, settings.safeMargin + 145);

  ctx.fillStyle = "#4b5563";
  ctx.font = "34px Arial";
  wrapText(ctx, subtitle, MBG.PAGE_W / 2, settings.safeMargin + 205, 1700, 46, "center");

  ctx.restore();
}

function drawMazeFooter(ctx, settings, mazeData, isSolution) {
  ctx.save();
  ctx.fillStyle = "#6b7280";
  ctx.textAlign = "center";
  ctx.font = "30px Arial";

  const prefix = isSolution ? settings.solutionPrefix : settings.mazePrefix;
  ctx.fillText(prefix + " " + mazeData.index, MBG.PAGE_W / 2, MBG.PAGE_H - settings.safeMargin + 70);

  ctx.restore();
}

function drawMazeGrid(ctx, settings, mazeData, layout) {
  const box = layout.mazeBox;
  const cellW = box.w / mazeData.width;
  const cellH = box.h / mazeData.height;
  const lineW = Math.max(3, Math.min(cellW, cellH) * 0.045 * (settings.wallThicknessPercent / 100));

  ctx.save();
  ctx.strokeStyle = "#111827";
  ctx.lineWidth = lineW;
  ctx.lineCap = "round";

  for (let y = 0; y < mazeData.height; y++) {
    for (let x = 0; x < mazeData.width; x++) {
      const cell = mazeData.cells[y][x];
      if (!cell.active) continue;

      const px = box.x + x * cellW;
      const py = box.y + y * cellH;

      ctx.beginPath();

      if (cell.walls.top || !isActiveCell(mazeData, x, y - 1)) {
        ctx.moveTo(px, py);
        ctx.lineTo(px + cellW, py);
      }

      if (cell.walls.right || !isActiveCell(mazeData, x + 1, y)) {
        ctx.moveTo(px + cellW, py);
        ctx.lineTo(px + cellW, py + cellH);
      }

      if (cell.walls.bottom || !isActiveCell(mazeData, x, y + 1)) {
        ctx.moveTo(px + cellW, py + cellH);
        ctx.lineTo(px, py + cellH);
      }

      if (cell.walls.left || !isActiveCell(mazeData, x - 1, y)) {
        ctx.moveTo(px, py + cellH);
        ctx.lineTo(px, py);
      }

      ctx.stroke();
    }
  }

  ctx.restore();
}

function isActiveCell(mazeData, x, y) {
  return !!(
    mazeData.cells[y] &&
    mazeData.cells[y][x] &&
    mazeData.cells[y][x].active
  );
}

function drawMaskGuide(ctx, settings, mazeData, layout) {
  const box = layout.mazeBox;
  const cellW = box.w / mazeData.width;
  const cellH = box.h / mazeData.height;

  ctx.save();
  ctx.strokeStyle = "#111827";
  ctx.lineWidth = settings.maskGuideThickness;
  ctx.setLineDash([18, 16]);

  for (let y = 0; y < mazeData.height; y++) {
    for (let x = 0; x < mazeData.width; x++) {
      if (!mazeData.activeGrid[y][x]) continue;

      const px = box.x + x * cellW;
      const py = box.y + y * cellH;

      ctx.strokeRect(px, py, cellW, cellH);
    }
  }

  ctx.setLineDash([]);
  ctx.restore();
}

function drawSolutionPath(ctx, settings, mazeData, layout) {
  const path = mazeData.solutionPath;
  if (!path || path.length < 2) return;

  const box = layout.mazeBox;
  const cellW = box.w / mazeData.width;
  const cellH = box.h / mazeData.height;
  const cell = Math.min(cellW, cellH);

  ctx.save();
  ctx.strokeStyle = "#111827";
  ctx.lineWidth = Math.max(7, cell * 0.09);
  ctx.setLineDash([30, 22]);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.beginPath();

  for (let i = 0; i < path.length; i++) {
    const p = path[i];
    const cx = box.x + p.x * cellW + cellW / 2;
    const cy = box.y + p.y * cellH + cellH / 2;

    if (i === 0) ctx.moveTo(cx, cy);
    else ctx.lineTo(cx, cy);
  }

  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawMazeAssets(ctx, settings, mazeData, layout) {
  const box = layout.mazeBox;
  const cellW = box.w / mazeData.width;
  const cellH = box.h / mazeData.height;
  const cell = Math.min(cellW, cellH);

  drawCellAsset(ctx, settings, mazeData.start, MBG.assets.start, settings.startLabel, settings.startScale, box, cellW, cellH, cell);
  drawCellAsset(ctx, settings, mazeData.goal, MBG.assets.goal, settings.goalLabel, settings.goalScale, box, cellW, cellH, cell);

  for (const cp of mazeData.checkpoints || []) {
    drawCellAsset(ctx, settings, cp, MBG.assets.checkpoint, settings.checkpointLabel || "CHECK", settings.checkpointScale, box, cellW, cellH, cell);
  }

  for (const enemy of mazeData.enemies || []) {
    drawCellAsset(ctx, settings, enemy, MBG.assets.enemy, settings.enemyLabel || "AVOID", settings.enemyScale, box, cellW, cellH, cell);
  }
}

function drawCellAsset(ctx, settings, cellPos, img, label, scale, box, cellW, cellH, baseCell) {
  if (!cellPos) return;

  const cx = box.x + cellPos.x * cellW + cellW / 2;
  const cy = box.y + cellPos.y * cellH + cellH / 2;
  const size = baseCell * scale * settings.globalAssetScale;

  ctx.save();

  if (settings.useAssets && img) {
    drawImageCentered(ctx, img, cx, cy, size);
  } else {
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 4;
    roundRect(ctx, cx - cellW * 0.38, cy - cellH * 0.23, cellW * 0.76, cellH * 0.46, 14, true, true);

    ctx.fillStyle = "#111827";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold " + Math.max(15, baseCell * 0.13) + "px Arial";
    ctx.fillText(label, cx, cy);
  }

  ctx.restore();
}

/* ============================================================
   DECO LAYER - NO OVERLAP VERSION
============================================================ */

function drawDecoLayer(ctx, settings, pageType, layout) {
  if (!settings.decoEnabled) return;
  if (!MBG.decoAssets.length) return;

  const allowed =
    (pageType === "intro" && settings.decoOnIntro) ||
    (pageType === "maze" && settings.decoOnMaze) ||
    (pageType === "solution" && settings.decoOnSolution) ||
    (pageType === "congrats" && settings.decoOnCongrats);

  if (!allowed) return;

  const zones = getDecoZones(settings, pageType, layout);
  if (!zones.length) return;

  let count = settings.decoDensity;

  if (pageType === "solution") {
    count = Math.max(1, Math.floor(count * 0.45));
  }

  if (settings.decoPlacement === "background") {
    count = Math.max(1, Math.floor(count * 0.75));
  }

  const placedDecos = [];
  const maxAttemptsPerDeco = 40;

  ctx.save();
  ctx.globalAlpha = settings.decoOpacity;

  for (let i = 0; i < count; i++) {
    let placed = false;

    for (let attempt = 0; attempt < maxAttemptsPerDeco; attempt++) {
      const asset = randomItem(MBG.decoAssets);
      const zone = randomItem(zones);

      if (!asset || !asset.img || !zone) continue;

      const decoData = prepareSingleDeco(asset.img, zone, settings);
      if (!decoData) continue;

      const paddedRect = expandRect(decoData.rect, 35);

      const overlapsExisting = placedDecos.some(existing =>
        rectsOverlap(paddedRect, existing)
      );

      const overlapsMaze =
        settings.decoAvoidMazeArea &&
        layout &&
        layout.mazeBox &&
        rectsOverlap(paddedRect, expandRect(layout.mazeBox, 80));

      if (overlapsExisting || overlapsMaze) {
        continue;
      }

      drawPreparedDeco(ctx, asset.img, decoData);
      placedDecos.push(paddedRect);
      placed = true;
      break;
    }

    if (!placed) {
      console.warn("DECO pominięte - brak miejsca bez nakładania.");
    }
  }

  ctx.restore();
}

function prepareSingleDeco(img, zone, settings) {
  const cx = randomRange(zone.x + zone.w * 0.18, zone.x + zone.w * 0.82);
  const cy = randomRange(zone.y + zone.h * 0.18, zone.y + zone.h * 0.82);

  const base = Math.min(zone.w, zone.h);
  const scale = randomRange(settings.decoScaleMin, settings.decoScaleMax);

  let w = base * scale;
  let h = base * scale;

  const ratio = img.width / img.height;

  if (ratio > 1) {
    h = w / ratio;
  } else {
    w = h * ratio;
  }

  const rotation = settings.decoRandomRotation
    ? randomRange(-24, 24) * Math.PI / 180
    : 0;

  const safety = 1.25;
  const rectW = w * safety;
  const rectH = h * safety;

  return {
    cx,
    cy,
    w,
    h,
    rotation,
    rect: {
      x: cx - rectW / 2,
      y: cy - rectH / 2,
      w: rectW,
      h: rectH
    }
  };
}

function drawPreparedDeco(ctx, img, decoData) {
  ctx.save();
  ctx.translate(decoData.cx, decoData.cy);
  ctx.rotate(decoData.rotation);
  ctx.drawImage(
    img,
    -decoData.w / 2,
    -decoData.h / 2,
    decoData.w,
    decoData.h
  );
  ctx.restore();
}

function getDecoZones(settings, pageType, layout) {
  const margin = 95;
  const corner = 450;

  const corners = [
    { x: margin, y: margin, w: corner, h: corner },
    { x: MBG.PAGE_W - margin - corner, y: margin, w: corner, h: corner },
    { x: margin, y: MBG.PAGE_H - margin - corner, w: corner, h: corner },
    { x: MBG.PAGE_W - margin - corner, y: MBG.PAGE_H - margin - corner, w: corner, h: corner }
  ];

  const headerFooter = [
    { x: 520, y: 105, w: 1510, h: 260 },
    { x: 410, y: 2860, w: 1730, h: 300 },
    { x: 120, y: 520, w: 330, h: 330 },
    { x: MBG.PAGE_W - 450, y: 520, w: 330, h: 330 }
  ];

  const background = [
    { x: 240, y: 720, w: 430, h: 430 },
    { x: 1850, y: 720, w: 430, h: 430 },
    { x: 260, y: 2200, w: 430, h: 430 },
    { x: 1840, y: 2200, w: 430, h: 430 },
    { x: 980, y: 1400, w: 570, h: 570 }
  ];

  let zones = [];

  if (settings.decoPlacement === "corners") {
    zones = corners;
  } else if (settings.decoPlacement === "headerFooter") {
    zones = headerFooter;
  } else if (settings.decoPlacement === "background") {
    zones = background;
  } else {
    zones = [...corners, ...headerFooter, ...background];
  }

  if (settings.decoAvoidMazeArea && layout && layout.mazeBox) {
    zones = zones.filter(z => !rectsOverlap(z, expandRect(layout.mazeBox, 60)));
  }

  return zones;
}

function rectsOverlap(a, b) {
  return !(
    a.x + a.w < b.x ||
    b.x + b.w < a.x ||
    a.y + a.h < b.y ||
    b.y + b.h < a.y
  );
}

function expandRect(r, pad) {
  return {
    x: r.x - pad,
    y: r.y - pad,
    w: r.w + pad * 2,
    h: r.h + pad * 2
  };
}

/* ============================================================
   DRAWING HELPERS
============================================================ */

function drawImageIfExists(ctx, img, x, y, size) {
  if (!img) return;
  drawImageCentered(ctx, img, x, y, size);
}

function drawImageCentered(ctx, img, x, y, size) {
  const ratio = img.width / img.height;
  let w = size;
  let h = size;

  if (ratio > 1) h = w / ratio;
  else w = h * ratio;

  ctx.drawImage(img, x - w / 2, y - h / 2, w, h);
}

function fitText(ctx, text, x, y, maxSize, maxWidth, fontFamily = "Arial", weight = "bold") {
  let size = maxSize;

  while (size > 18) {
    ctx.font = weight + " " + size + "px " + fontFamily;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 4;
  }

  ctx.fillText(text, x, y);
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, align = "left") {
  const paragraphs = String(text || "").split("\n");
  let currentY = y;

  ctx.textAlign = align;

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);

    if (!words.length) {
      currentY += lineHeight;
      continue;
    }

    let line = "";

    for (const word of words) {
      const testLine = line ? line + " " + word : word;
      const width = ctx.measureText(testLine).width;

      if (width > maxWidth && line) {
        ctx.fillText(line, x, currentY);
        line = word;
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }

    if (line) {
      ctx.fillText(line, x, currentY);
      currentY += lineHeight;
    }

    currentY += lineHeight * 0.25;
  }

  return currentY;
}

function roundRect(ctx, x, y, w, h, r, fill, stroke) {
  const radius = Math.min(r, w / 2, h / 2);

  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();

  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

/* ============================================================
   PRESET SAVE / LOAD
============================================================ */

function savePreset() {
  const fields = document.querySelectorAll("input, textarea, select");
  const data = {};

  fields.forEach(field => {
    if (!field.id) return;
    if (field.type === "file") return;
    if (field.type === "checkbox") data[field.id] = field.checked;
    else data[field.id] = field.value;
  });

  const fileName = safeFileName(getValue("presetFileName", "mbg-settings")) + ".json";
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json"
  });

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  a.click();

  URL.revokeObjectURL(a.href);
  setStatus("Ustawienia zapisane: " + fileName);
}

function loadPreset() {
  const input = el("presetFileInput");

  if (!input || !input.files || !input.files[0]) {
    alert("Najpierw wybierz plik JSON w polu: Plik ustawień JSON.");
    return;
  }

  const file = input.files[0];
  const reader = new FileReader();

  reader.onload = function () {
    try {
      const data = JSON.parse(reader.result);

      Object.keys(data).forEach(id => {
        const field = el(id);
        if (!field) return;

        if (field.type === "checkbox") field.checked = !!data[id];
        else field.value = data[id];
      });

      setStatus("Wczytano ustawienia: " + file.name);
      generatePreview();
    } catch (err) {
      console.error(err);
      alert("Nie udało się wczytać pliku ustawień JSON.");
    }
  };

  reader.readAsText(file);
}


