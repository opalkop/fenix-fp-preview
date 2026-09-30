"use strict";
(async () => {
  const out = document.getElementById("out"),
    lines = [];
  let failed = 0;
  const check = (name, ok, detail = "") => {
    lines.push(`${ok ? "✓" : "×"} ${name}${detail ? ` — ${detail}` : ""}`);
    if (!ok) failed++;
  };
  const fake = (w = 240, h = 180) => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const x = c.getContext("2d");
    x.fillStyle = "#fff";
    x.fillRect(0, 0, w, h);
    x.strokeStyle = "#111";
    x.lineWidth = 8;
    x.strokeRect(12, 12, w - 24, h - 24);
    return c;
  };
  const page = {
    module: "maze-studio",
    title: "Regression Maze",
    seed: 17,
    recipe: {
      module: "maze-studio",
      seed: 17,
      title: "Regression Maze",
      settings: {
        ageProfile: "4-6",
        difficulty: "custom",
        cols: 12,
        rows: 16,
        lineWidth: 2,
        pathTarget: 42,
        wallOpenings: 22,
        deadEnds: 30,
        twistiness: 40,
        endpointMode: "random",
        wallStyle: "clean",
        mazeScale: 92,
        sideMargin: 80,
        topMargin: 170,
        bottomMargin: 90,
        startAssetRef: "start",
        goalAssetRef: "goal",
        checkpointAssets: [
          { assetRef: "checkpoint-a", scale: 70 },
          { assetRef: "checkpoint-b", scale: 90 },
          { assetRef: "checkpoint-c", scale: 110 },
        ],
        checkpointAssetRef: "checkpoint-a",
        hazardAssetRef: "hazard",
        startAssetScale: 180,
        goalAssetScale: 140,
        checkpointCount: 3,
        checkpointScale: 70,
        hazardCount: 2,
        hazardScale: 160,
        showSolution: true,
      },
    },
    solution: { available: true },
  };
  const normalized = FenixPageSchema.normalize(page),
    s = normalized.recipe.settings;
  check(
    "Schema preserves 12×16",
    s.cols === 12 && s.rows === 16,
    `${s.cols}×${s.rows}`,
  );
  check(
    "Schema preserves wall width",
    s.lineWidth === 2,
    `lineWidth=${s.lineWidth}`,
  );
  const assets = {
    start: fake(260, 180),
    goal: fake(180, 180),
    "checkpoint-a": fake(150, 150),
    "checkpoint-b": fake(180, 120),
    "checkpoint-c": fake(120, 180),
    hazard: fake(260, 150),
  };
  const a = FenixMaze.render(normalized, {
    solution: true,
    width: 850,
    height: 1100,
    assetImages: assets,
  });
  const b = FenixMaze.render(normalized, {
    solution: true,
    width: 2550,
    height: 3300,
    assetImages: assets,
  });
  check(
    "Renderer version",
    a.rendererVersion === "0.40.0" && b.rendererVersion === "0.40.0",
    `${a.rendererVersion}/${b.rendererVersion}`,
  );
  check(
    "Asset-first engine version",
    a.engineVersion === "0.40.0" && b.engineVersion === "0.40.0",
    `${a.engineVersion}/${b.engineVersion}`,
  );
  check(
    "Cleanup pad exceeds wall width",
    a.cleanupPad > 2 && b.cleanupPad > 6,
    `${a.cleanupPad}/${b.cleanupPad}`,
  );
  const sig = (r) =>
    JSON.stringify({
      start: r.maze.start,
      end: r.maze.end,
      zones: (r.assetZones || []).map((z) => ({
        role: z.role,
        x: z.x,
        y: z.y,
        w: z.w,
        h: z.h,
      })),
      checkpoints: r.checkpoints,
      hazards: r.hazards,
      solution: r.solutionPath,
    });
  check("Preview and print geometry identical", sig(a) === sig(b));
  const zones = a.assetZones || [],
    roles = zones.map((z) => z.role);
  check("START room exists", roles.includes("start"));
  check("META room exists", roles.includes("goal"));
  check(
    "Three checkpoint rooms exist",
    roles.filter((role) => role === "checkpoint").length === 3,
  );
  const checkpointZones = zones.filter((zone) => zone.role === "checkpoint");
  check(
    "Checkpoint assets preserve route order",
    checkpointZones.map((zone) => zone.assetRef).join(",") ===
      "checkpoint-a,checkpoint-b,checkpoint-c",
  );
  check(
    "Checkpoint scales are individual",
    checkpointZones.map((zone) => zone.assetScale).join(",") === "70,90,110",
  );
  check(
    "Two hazard rooms exist",
    roles.filter((x) => x === "hazard").length === 2,
  );
  const roomRects = a.assetRoomRects || [],
    startRect = roomRects.find((z) => z.role === "start"),
    goalRect = roomRects.find((z) => z.role === "goal");
  check("START rendered as clean bay", startRect?.cleanBay === true);
  check("META rendered as clean bay", goalRect?.cleanBay === true);
  const pkey = ([x, y]) => `${x},${y}`,
    solution = new Set((a.solutionPath || []).map(pkey)),
    hazards = new Set((a.hazards || []).map(pkey));
  check("Solution exists", (a.solutionPath || []).length > 1);
  check(
    "Solution visits checkpoint",
    (a.checkpoints || []).every((p) => solution.has(pkey(p))),
  );
  check(
    "Solution avoids hazards",
    [...hazards].every((k) => !solution.has(k)),
  );
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  function fullCycle(mobile) {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = () => ({
      matches: mobile,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
    });
    try {
      const source = FenixPageSchema.normalize(
        JSON.parse(JSON.stringify(page)),
      );
      const generated = FenixMaze.render(source, {
        solution: true,
        width: 850,
        height: 1100,
        assetImages: assets,
      });
      const saved = FenixPageSchema.normalize({
        ...source,
        seed: generated.effectiveSeed,
        recipe: {
          ...source.recipe,
          seed: generated.effectiveSeed,
          settings: {
            ...source.recipe.settings,
            endpoints: generated.endpoints,
          },
          meta: {
            ...(source.recipe.meta || {}),
            renderState: {
              effectiveSeed: generated.effectiveSeed,
              endpoints: generated.endpoints,
              showSolution: true,
            },
          },
        },
      });
      const loaded = FenixPageSchema.normalize(
        JSON.parse(JSON.stringify(saved)),
      );
      const rendered = FenixMaze.render(loaded, {
        solution: true,
        width: 850,
        height: 1100,
        assetImages: assets,
      });
      const mode = mobile ? "mobile" : "desktop";
      check(
        `Full cycle ${mode}: effectiveSeed`,
        rendered.effectiveSeed === generated.effectiveSeed,
      );
      check(
        `Full cycle ${mode}: maze.cells`,
        same(rendered.maze.cells, generated.maze.cells),
      );
      check(
        `Full cycle ${mode}: START`,
        same(rendered.maze.start, generated.maze.start),
      );
      check(
        `Full cycle ${mode}: META`,
        same(rendered.maze.end, generated.maze.end),
      );
      check(
        `Full cycle ${mode}: checkpoints`,
        same(rendered.checkpoints, generated.checkpoints),
      );
      check(
        `Full cycle ${mode}: hazards`,
        same(rendered.hazards, generated.hazards),
      );
      check(
        `Full cycle ${mode}: solutionPath`,
        same(rendered.solutionPath, generated.solutionPath),
      );
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  }
  fullCycle(false);
  fullCycle(true);
  const legacy = FenixPageSchema.normalize(JSON.parse(JSON.stringify(page)));
  delete legacy.recipe.settings.checkpointAssets;
  legacy.recipe.settings.checkpointAssetRef = "checkpoint-a";
  legacy.recipe.settings.checkpointCount = 2;
  legacy.recipe.settings.checkpointScale = 85;
  const legacyResult = FenixMaze.render(legacy, {
    width: 850,
    height: 1100,
    assetImages: assets,
  });
  const legacyZones = legacyResult.assetZones.filter(
    (zone) => zone.role === "checkpoint",
  );
  check("Legacy checkpoint count remains supported", legacyZones.length === 2);
  check(
    "Legacy checkpoint asset is repeated",
    legacyZones.every(
      (zone) => zone.assetRef === "checkpoint-a" && zone.assetScale === 85,
    ),
  );
  const modernFallback = FenixPageSchema.normalize(
    JSON.parse(JSON.stringify(page)),
  );
  modernFallback.recipe.settings.checkpointAssets[1].assetRef = null;
  const modernFallbackResult = FenixMaze.render(modernFallback, {
    width: 850,
    height: 1100,
    assetImages: assets,
  });
  check(
    "Modern empty slot stays a fallback marker",
    modernFallbackResult.assetZones.filter(
      (zone) => zone.role === "checkpoint",
    )[1]?.assetRef === null,
  );
  check(
    "Legacy page without effectiveSeed keeps generator fallback",
    Number.isFinite(a.effectiveSeed) &&
      !page.recipe?.meta?.renderState?.effectiveSeed,
  );
  out.className = failed ? "fail" : "ok";
  out.textContent = `Maze regression ${failed ? "FAIL" : "PASS"}\nRenderer: ${FenixMaze.version || "?"}\n\n${lines.join("\n")}`;
  document.documentElement.dataset.mazeRegression = failed ? "fail" : "pass";
})();
