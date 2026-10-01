"use strict";
(() => {
  if (typeof document === "undefined" || typeof FenixCore === "undefined")
    return;
  const ROLES = [
    { assetId: "startAsset", packId: "startAssetPack", label: "Zestaw START" },
    { assetId: "goalAsset", packId: "goalAssetPack", label: "Zestaw META" },
    ...Array.from({ length: 5 }, (_, index) => ({
      assetId: `checkpointAsset${index + 1}`,
      packId: `checkpointAssetPack${index + 1}`,
      label: `Zestaw CHECKPOINT ${index + 1}`,
    })),
    {
      assetId: "hazardAsset",
      packId: "hazardAssetPack",
      label: "Zestaw ZAGROŻENIE",
    },
  ];
  const PREFIX = "__fenix_library__:";
  let busy = false,
    timer = null,
    observer = null;
  const esc = (value) =>
    String(value ?? "").replace(
      /[&<>'\"]/g,
      (ch) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          "'": "&#39;",
          '\"': "&quot;",
        })[ch],
    );
  const refOf = (asset) =>
    String(asset?.libraryRef || asset?.meta?.libraryRef || "").trim();
  const packOf = (asset) =>
    String(asset?.pack || asset?.meta?.pack || "").trim();
  const libraryAssets = (pack) =>
    FenixCore.listLibraryAssets?.({ pack: pack || "" }) || [];
  const libraryPacks = () => FenixCore.listLibraryPacks?.() || [];
  const projectAssets = () => FenixCore.listAssets?.() || [];
  function linkedLocalId(libraryId) {
    const found = projectAssets().find((asset) => refOf(asset) === libraryId);
    return found?.id || "";
  }
  function roleEmptyText(assetId) {
    return assetId === "startAsset"
      ? "Bez assetu — znacznik S"
      : assetId === "goalAsset"
        ? "Bez assetu — znacznik M"
        : "Bez assetu";
  }
  function selectedAssetPack(assetId) {
    const value = document.getElementById(assetId)?.value || "";
    if (!value) return "";
    if (value.startsWith(PREFIX))
      return packOf(
        FenixCore.listLibraryAssets?.().find(
          (a) => a.id === value.slice(PREFIX.length),
        ) || {},
      );
    const local = FenixCore.getAsset?.(value);
    if (local) return packOf(local);
    return "";
  }
  function selectedPageSettings() {
    const selectedId =
      document.getElementById("pageSelect")?.value ||
      new URLSearchParams(location.search).get("id") ||
      "";
    if (!selectedId) return null;
    const page = FenixCore.getCart?.().find((item) => item.id === selectedId);
    return page?.recipe?.settings || page?.settings || null;
  }
  function savedAssetRef(role, settings) {
    if (!settings) return "";
    if (role.assetId === "startAsset") return settings.startAssetRef || "";
    if (role.assetId === "goalAsset") return settings.goalAssetRef || "";
    if (role.assetId === "hazardAsset") return settings.hazardAssetRef || "";
    const index = Number(role.assetId.match(/^checkpointAsset(\d)$/)?.[1] || 0) - 1;
    if (index < 0) return "";
    const item = Array.isArray(settings.checkpointAssets)
      ? settings.checkpointAssets[index]
      : null;
    if (typeof item === "string") return item;
    return item?.assetRef || (index === 0 ? settings.checkpointAssetRef : "") || "";
  }
  function savedPack(role, settings) {
    if (!settings) return "";
    if (role.assetId === "startAsset") return settings.startAssetPack || "";
    if (role.assetId === "goalAsset") return settings.goalAssetPack || "";
    if (role.assetId === "hazardAsset") return settings.hazardAssetPack || "";
    const index = Number(role.assetId.match(/^checkpointAsset(\d)$/)?.[1] || 0) - 1;
    const item =
      index >= 0 && Array.isArray(settings.checkpointAssets)
        ? settings.checkpointAssets[index]
        : null;
    return typeof item === "object" ? String(item?.pack || "").trim() : "";
  }
  function ensureStyle() {
    if (document.getElementById("maze-role-pack-style")) return;
    const style = document.createElement("style");
    style.id = "maze-role-pack-style";
    style.textContent =
      ".maze-role-pack-label{display:grid;gap:5px;margin-top:8px}.maze-role-pack-label select{width:100%;padding:9px 10px;border:1px solid #cbd5e1;border-radius:9px;background:#fff}.maze-role-pack-label small{font-size:11px;color:#64748b}";
    document.head.appendChild(style);
  }
  function ensurePackSelect(role) {
    const assetSelect = document.getElementById(role.assetId);
    if (!assetSelect) return null;
    let packSelect = document.getElementById(role.packId);
    if (packSelect) return packSelect;
    ensureStyle();
    const assetLabel = assetSelect.closest("label");
    if (!assetLabel) return null;
    const label = document.createElement("label");
    label.className = "maze-role-pack-label";
    label.innerHTML = `${esc(role.label)}<select id="${esc(role.packId)}"></select><small>Najpierw wybierz zestaw, potem asset.</small>`;
    assetLabel.parentNode.insertBefore(label, assetLabel);
    packSelect = label.querySelector("select");
    packSelect.addEventListener("change", () => {
      if (busy) return;
      rebuildRole(role, true);
      markDirty(assetSelect);
    });
    return packSelect;
  }
  function setPackOptions(packSelect, desiredPack) {
    const packs = libraryPacks();
    packSelect.innerHTML =
      '<option value="">— wybierz zestaw assetów —</option>' +
      packs
        .map((pack) => `<option value="${esc(pack)}">${esc(pack)}</option>`)
        .join("");
    const canonical =
      packs.find(
        (pack) => pack.toLowerCase() === String(desiredPack || "").toLowerCase(),
      ) || "";
    packSelect.value = canonical;
    return canonical;
  }
  function fillPackOptions(role) {
    const packSelect = ensurePackSelect(role);
    if (!packSelect) return "";
    const current = packSelect.value || selectedAssetPack(role.assetId) || "";
    return setPackOptions(packSelect, current);
  }
  function optionValue(asset) {
    return linkedLocalId(asset.id) || `${PREFIX}${asset.id}`;
  }
  function rebuildRole(role, packChanged = false) {
    const select = document.getElementById(role.assetId);
    if (!select) return;
    const previous = packChanged ? "" : select.value || "";
    const pack = fillPackOptions(role);
    const globals = pack
      ? libraryAssets(pack)
          .slice()
          .sort((a, b) =>
            String(a.name || "").localeCompare(String(b.name || ""), "pl"),
          )
      : [];
    busy = true;
    select.innerHTML =
      `<option value="">${pack ? roleEmptyText(role.assetId) : "Najpierw wybierz zestaw assetów"}</option>` +
      globals
        .map(
          (asset) =>
            `<option value="${esc(optionValue(asset))}">${esc(asset.name || asset.filename || asset.id)}</option>`,
        )
        .join("");
    if (
      previous &&
      [...select.options].some((option) => option.value === previous)
    )
      select.value = previous;
    else if (previous && !previous.startsWith(PREFIX)) {
      const local = FenixCore.getAsset?.(previous),
        libRef = refOf(local);
      if (libRef) {
        const fallback = optionValue(
          FenixCore.listLibraryAssets?.().find((a) => a.id === libRef) || {},
        );
        if ([...select.options].some((option) => option.value === fallback))
          select.value = fallback;
      }
    }
    const checkpointIndex = Number(role.assetId.match(/^checkpointAsset(\d)$/)?.[1] || 0);
    const checkpointCount = Number(
      document.getElementById("checkpointCount")?.value || 0,
    );
    select.disabled = !pack || (checkpointIndex > 0 && checkpointIndex > checkpointCount);
    select.dataset.mazeRolePack = pack;
    busy = false;
  }
  function rebuildAll() {
    ROLES.forEach((role) => rebuildRole(role, false));
    const info = document.getElementById("assetInfo");
    if (info)
      info.textContent = `Wybór etapowy: dla każdej roli wybierz najpierw zestaw assetów, a dopiero potem konkretny asset. Dostępne zestawy: ${libraryPacks().join(" / ") || "brak"}.`;
  }
  function restoreSavedRoles() {
    const settings = selectedPageSettings();
    if (!settings) {
      rebuildAll();
      return;
    }
    for (const role of ROLES) {
      const select = document.getElementById(role.assetId),
        packSelect = ensurePackSelect(role),
        desiredRef = savedAssetRef(role, settings);
      if (!select || !packSelect) continue;
      const desiredPack =
        savedPack(role, settings) ||
        packOf(FenixCore.getAsset?.(desiredRef)) ||
        selectedAssetPack(role.assetId);
      setPackOptions(packSelect, desiredPack);
      if (
        desiredRef &&
        [...select.options].some((option) => option.value === desiredRef)
      )
        select.value = desiredRef;
      rebuildRole(role, false);
      if (
        desiredRef &&
        [...select.options].some((option) => option.value === desiredRef)
      )
        select.value = desiredRef;
    }
  }
  function markDirty(select) {
    select?.dispatchEvent(new Event("input", { bubbles: true }));
    select?.dispatchEvent(new Event("change", { bubbles: true }));
  }
  function onAssetChange(event) {
    const select = event.currentTarget,
      value = String(select.value || "");
    if (!value.startsWith(PREFIX) || busy) return;
    const libraryId = value.slice(PREFIX.length);
    busy = true;
    try {
      const linked = FenixCore.linkLibraryAsset?.(libraryId);
      const localId = linked?.id || linkedLocalId(libraryId);
      const role = ROLES.find((item) => item.assetId === select.id);
      busy = false;
      if (role) rebuildRole(role, false);
      if (localId) {
        select.value = localId;
        select.dispatchEvent(new Event("input", { bubbles: true }));
      }
    } finally {
      busy = false;
    }
  }
  function bind() {
    ROLES.forEach((role) => {
      ensurePackSelect(role);
      const select = document.getElementById(role.assetId);
      if (select && !select.dataset.stagedAssetPicker) {
        select.dataset.stagedAssetPicker = "1";
        select.addEventListener("change", onAssetChange);
      }
    });
    if (observer) return;
    const host = document.querySelector(".asset-maze-grid");
    if (!host) return;
    observer = new MutationObserver(() => {
      if (busy) return;
      for (const role of ROLES) {
        const select = document.getElementById(role.assetId),
          pack = document.getElementById(role.packId)?.value || "";
        const expected = (pack ? libraryAssets(pack).length : 0) + 1;
        if (
          select &&
          (select.dataset.mazeRolePack !== pack ||
            select.options.length !== expected)
        ) {
          schedule(0);
          break;
        }
      }
    });
    observer.observe(host, { childList: true, subtree: true });
  }
  function schedule(delay = 30) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!busy) {
        bind();
        rebuildAll();
      }
    }, delay);
  }
  window.addEventListener("fenix-state-change", (event) => {
    if (
      event.detail?.assets ||
      event.detail?.library ||
      event.detail?.activeProject ||
      event.detail?.storage
    )
      schedule(40);
  });
  window.addEventListener("fenix-storage-ready", () => schedule(0));
  window.addEventListener("fenix-library-change", () => schedule(0));
  window.addEventListener("fenix-assets-change", () => schedule(0));
  document.getElementById("pageSelect")?.addEventListener("change", () => {
    setTimeout(restoreSavedRoles, 0);
    setTimeout(restoreSavedRoles, 120);
  });
  bind();
  rebuildAll();
  Promise.resolve(FenixCore.ready).then(() => {
    setTimeout(restoreSavedRoles, 0);
    setTimeout(restoreSavedRoles, 150);
    setTimeout(restoreSavedRoles, 600);
  });
})();
