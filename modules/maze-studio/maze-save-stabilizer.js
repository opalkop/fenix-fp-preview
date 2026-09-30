"use strict";
(() => {
  const $ = (id) => document.getElementById(id);
  const core = typeof FenixCore !== "undefined" ? FenixCore : null;
  const schema = typeof FenixPageSchema !== "undefined" ? FenixPageSchema : null;
  if (!core || !schema) return;

  let saving = false;
  const checkpointIds = Array.from(
    { length: 5 },
    (_, index) => index + 1,
  ).flatMap((index) => [
    `checkpointAsset${index}`,
    `checkpointScale${index}`,
  ]);
  const fieldIds = [
    "title",
    "subtitle",
    "instruction",
    "titleSize",
    "titleY",
    "subtitleSize",
    "instructionSize",
    "ageProfile",
    "difficulty",
    "cols",
    "rows",
    "lineWidth",
    "endpointMode",
    "wallStyle",
    "seed",
    "startAsset",
    "goalAsset",
    ...checkpointIds,
    "hazardAsset",
    "startAssetScale",
    "goalAssetScale",
    "checkpointCount",
    "hazardCount",
    "hazardScale",
    "decoCount",
    "decoScale",
    "sideMargin",
    "topMargin",
    "bottomMargin",
    "mazeScale",
    "solution",
  ];
  const num = (id, fallback) => {
    const value = Number($(id)?.value);
    return Number.isFinite(value) ? value : fallback;
  };
  const clamp = (value, min, max, fallback) =>
    Math.max(min, Math.min(max, Number.isFinite(Number(value)) ? Number(value) : fallback));
  const selectedDeco = () => [
    ...document.querySelectorAll(
      '#decoAssetChoices input[type="checkbox"]:checked',
    ),
  ].map((input) => input.value);
  const packForAsset = (assetRef) => {
    const asset = assetRef ? core.getAsset?.(assetRef) : null;
    return String(asset?.pack || asset?.meta?.pack || "").trim();
  };
  function currentPage() {
    const id = $("pageSelect")?.value;
    return id
      ? (core.getCart() || []).find(
          (page) => page.id === id && page.module === "maze-studio",
        ) || null
      : null;
  }
  function checkpointAssets(existing = {}) {
    const count = clamp(num("checkpointCount", 0), 0, 5, 0);
    return Array.from({ length: count }, (_, index) => {
      const legacy = Array.isArray(existing.checkpointAssets)
        ? existing.checkpointAssets[index]
        : null;
      const assetRef =
        $(`checkpointAsset${index + 1}`)?.value ||
        (typeof legacy === "string" ? legacy : legacy?.assetRef) ||
        (index === 0 ? existing.checkpointAssetRef : null) ||
        null;
      return {
        assetRef,
        scale: clamp(
          num(
            `checkpointScale${index + 1}`,
            typeof legacy === "object"
              ? legacy?.scale
              : existing.checkpointScale || 80,
          ),
          40,
          160,
          80,
        ),
        pack:
          packForAsset(assetRef) ||
          (typeof legacy === "object" ? String(legacy?.pack || "").trim() : ""),
      };
    });
  }
  function settings() {
    const existing = currentPage()?.recipe?.settings || {};
    const difficulty = window.FenixMazeDifficulty?.values?.() || {};
    const checkpoints = checkpointAssets(existing);
    const startAssetRef = $("startAsset")?.value || null;
    const goalAssetRef = $("goalAsset")?.value || null;
    const hazardAssetRef = $("hazardAsset")?.value || null;
    return {
      ageProfile: $("ageProfile")?.value || "4-6",
      difficulty: $("difficulty")?.value || "custom",
      cols: clamp(num("cols", 18), 6, 45, 18),
      rows: clamp(num("rows", 24), 8, 58, 24),
      lineWidth: clamp(num("lineWidth", 5), 2, 12, 5),
      ...difficulty,
      typographyVersion: 2,
      titleSize: clamp(num("titleSize", 112), 72, 160, 112),
      titleY: clamp(num("titleY", 230), 140, 420, 230),
      subtitle: $("subtitle")?.value || "",
      instruction: $("instruction")?.value || "",
      subtitleSize: clamp(num("subtitleSize", 52), 30, 90, 52),
      instructionSize: clamp(num("instructionSize", 44), 30, 90, 44),
      sideMargin: clamp(num("sideMargin", 80), 35, 150, 80),
      topMargin: clamp(num("topMargin", 170), 120, 300, 170),
      bottomMargin: clamp(num("bottomMargin", 90), 55, 180, 90),
      mazeScale: clamp(num("mazeScale", 100), 55, 100, 100),
      endpointMode: $("endpointMode")?.value || "random",
      wallStyle: $("wallStyle")?.value || "clean",
      showSolution: $("solution")?.value === "yes",
      startAssetRef,
      startAssetPack: packForAsset(startAssetRef),
      goalAssetRef,
      goalAssetPack: packForAsset(goalAssetRef),
      checkpointAssets: checkpoints,
      checkpointAssetRef: checkpoints[0]?.assetRef || null,
      checkpointCount: checkpoints.length,
      checkpointScale: checkpoints[0]?.scale || 80,
      hazardAssetRef,
      hazardAssetPack: packForAsset(hazardAssetRef),
      startAssetScale: clamp(num("startAssetScale", 100), 40, 180, 100),
      goalAssetScale: clamp(num("goalAssetScale", 100), 40, 180, 100),
      hazardCount: clamp(num("hazardCount", 0), 0, 8, 0),
      hazardScale: clamp(num("hazardScale", 78), 40, 160, 78),
      decoAssetRefs: selectedDeco(),
      decoCount: clamp(num("decoCount", 0), 0, 10, 0),
      decoScale: clamp(num("decoScale", 80), 30, 160, 80),
      endpoints:
        existing.endpoints ||
        currentPage()?.recipe?.meta?.renderState?.endpoints ||
        null,
      showPageNumber: false,
      pageNumber: 1,
    };
  }
  function payload() {
    const settingsValue = settings();
    const seed = Number($("seed")?.value) || 1;
    const title = $("title")?.value?.trim() || "Find the Way!";
    return schema.normalize({
      module: "maze-studio",
      title,
      seed,
      settings: settingsValue,
      recipe: {
        module: "maze-studio",
        seed,
        title,
        settings: settingsValue,
        meta: {
          createdWith: "FENIX PC",
          desktopEditedAt: new Date().toISOString(),
          renderState: {
            showSolution: settingsValue.showSolution,
            endpoints: settingsValue.endpoints,
          },
        },
      },
      solution: { available: true, imageData: null },
      source: { app: "fenix-desktop", version: "0.40.1", format: "native" },
    });
  }
  function syncDifficulty() {
    const page = currentPage();
    if (page)
      window.FenixMazeDifficulty?.apply?.(
        page.recipe?.settings || page.settings || null,
      );
  }
  function snapshot() {
    return {
      values: Object.fromEntries(
        fieldIds.map((id) => [id, $(id)?.value ?? null]),
      ),
      deco: new Set(selectedDeco()),
    };
  }
  function restore(snapshotValue) {
    for (const [id, value] of Object.entries(snapshotValue.values)) {
      const element = $(id);
      if (element && value !== null) element.value = value;
    }
    document
      .querySelectorAll('#decoAssetChoices input[type="checkbox"]')
      .forEach(
        (input) => (input.checked = snapshotValue.deco.has(input.value)),
      );
  }
  function ensureSelectEntry(savedId) {
    const select = $("pageSelect");
    if (!select || !savedId) return;
    const page = (core.getCart() || []).find((item) => item.id === savedId);
    if (!page) return;
    let option = [...select.options].find((item) => item.value === savedId);
    if (!option) {
      option = document.createElement("option");
      option.value = savedId;
      select.appendChild(option);
    }
    option.textContent = page.title || "Labirynt";
    select.value = savedId;
  }
  function save(copy) {
    const page = currentPage();
    const data = payload();
    const snapshotValue = snapshot();
    saving = true;
    let savedId = null;
    try {
      if (page && !copy) {
        core.updatePage(page.id, data);
        savedId = page.id;
      } else {
        core.addPage(data);
        savedId = core.getCart().at(-1)?.id || null;
      }
    } finally {
      restore(snapshotValue);
      ensureSelectEntry(savedId);
      saving = false;
    }
    const trigger = $("startAssetScale");
    if (trigger) trigger.dispatchEvent(new Event("input", { bubbles: true }));
    return savedId;
  }
  window.addEventListener(
    "fenix-state-change",
    (event) => {
      if (saving) return;
      if (event.detail?.activeProject) setTimeout(syncDifficulty, 0);
    },
    true,
  );
  document.addEventListener(
    "click",
    (event) => {
      const id = event.target?.id;
      if (id !== "saveCart" && id !== "saveCopy") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const savedId = save(id === "saveCopy");
      const status = $("status");
      if (status)
        status.textContent =
          id === "saveCopy"
            ? "Kopia dodana do Stron projektu — podgląd pozostaje bez zmian."
            : "Strona zapisana w Stronach projektu — podgląd pozostaje bez zmian.";
      ensureSelectEntry(savedId);
    },
    true,
  );
  $("pageSelect")?.addEventListener("change", () =>
    setTimeout(syncDifficulty, 0),
  );
  setTimeout(syncDifficulty, 0);
  window.FenixMazeSave = Object.freeze({ payload, settings });
})();
