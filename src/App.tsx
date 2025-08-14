import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
// @ts-ignore - plugin provides runtime API; local shim declared in src/types
import { open } from "@tauri-apps/plugin-dialog";
import "./App.css";

type ThemePack = {
  id: string;
  name: string;
  wallpaper_path: string;
  system_theme: "light" | "dark";
};

function App() {
  const [packs, setPacks] = useState<ThemePack[]>([]);
  const [editing, setEditing] = useState<ThemePack | null>(null);
  const [name, setName] = useState("");
  const [wallpaperPath, setWallpaperPath] = useState("");
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">("light");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    try {
      const list = await invoke<ThemePack[]>("list_theme_packs");
      setPacks(list);
    } catch (e) {
      console.error("Failed to load theme packs", e);
    }
  }

  function startCreate() {
    setEditing(null);
    setName("");
    setWallpaperPath("");
    setSystemTheme("light");
    setModalOpen(true);
  }

  function startEdit(pack: ThemePack) {
    setEditing(pack);
    setName(pack.name);
    setWallpaperPath(pack.wallpaper_path);
    setSystemTheme(pack.system_theme);
    setModalOpen(true);
  }

  async function pickWallpaper() {
    const picked = await open({ multiple: false, directory: false, filters: [{ name: "Images", extensions: ["png","jpg","jpeg","heic","webp","bmp"] }] });
    let selected: unknown = Array.isArray(picked) ? picked[0] : picked;
    if (selected && typeof selected === "object" && (selected as any).path) {
      selected = (selected as any).path as string;
    }
    if (typeof selected !== "string" || !selected) return;
    try {
      const imported = await invoke<string>("import_wallpaper", { args: { sourcePath: selected } });
      setWallpaperPath(imported);
    } catch (err) {
      console.error("Failed to import wallpaper", err);
      setWallpaperPath(selected as string);
    }
  }

  async function savePack() {
    setStatus(null);
    if (!name || !wallpaperPath) {
      setStatus("Please choose a name and wallpaper");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await invoke("update_theme_pack", {
          args: {
            id: editing.id,
            name,
            wallpaperPath: wallpaperPath,
            systemTheme: systemTheme,
          },
        });
        setStatus("Saved changes");
      } else {
        await invoke("create_theme_pack", {
          args: {
            name,
            wallpaperPath: wallpaperPath,
            systemTheme: systemTheme,
          },
        });
        setStatus("Theme created");
      }
      await refresh();
      setModalOpen(false);
      startCreate();
    } catch (e) {
      console.error("Failed to save theme pack", e);
      setStatus("Failed to save theme. See console for details.");
    } finally {
      setSaving(false);
    }
  }

  async function removePack(id: string) {
    await invoke("delete_theme_pack", { id });
    await refresh();
  }

  async function applyPack(id: string) {
    await invoke("apply_theme_pack", { id });
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return packs;
    return packs.filter((p) => p.name.toLowerCase().includes(q));
  }, [packs, search]);

  const [previewData, setPreviewData] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      if (!wallpaperPath) { setPreviewData(null); return; }
      try {
        const dataUrl = await invoke<string>("load_wallpaper_data", { path: wallpaperPath });
        setPreviewData(dataUrl);
      } catch {
        setPreviewData(null);
      }
    })();
  }, [wallpaperPath]);

  return (
    <div className="app-root">
      <header className="toolbar">
        <div className="brand">Dayflow</div>
        <div className="spacer" />
        <input
          className="search"
          placeholder="Search themes"
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
        />
        <button className="primary" onClick={startCreate}>New Theme</button>
      </header>

      <main className="content">
        <section className="gallery">
          <div className="section-title">Gallery</div>
          <div className="grid">
            {filtered.map((p) => (
              <div key={p.id} className="card">
                <GalleryThumb path={p.wallpaper_path} name={p.name} />
                <div className="card-body">
                  <div className="title-row">
                    <div className="title">{p.name}</div>
                    <span className={"badge " + p.system_theme}>{p.system_theme}</span>
                  </div>
                  <div className="actions">
                    <button onClick={() => applyPack(p.id)} className="primary">Apply</button>
                    <button onClick={() => startEdit(p)}>Edit</button>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="empty">No themes yet.</div>
            )}
          </div>
        </section>
      </main>

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="modal-header">
              <div className="modal-title">{editing ? "Edit Theme" : "Create Theme"}</div>
            </div>
            <button className="modal-close" onClick={() => setModalOpen(false)} aria-label="Close">✕</button>
            <div className="modal-body">
              <div className="form-row">
                <label>Name</label>
                <input value={name} onChange={(e) => setName(e.currentTarget.value)} placeholder="My Theme" />
              </div>
              <div className="form-row">
                <label>Wallpaper</label>
                <div className="wallpaper-row">
                  <div className="file-pill" title={wallpaperPath || "No file chosen"}>
                    {previewData ? (
                      <>
                        <img className="file-thumb" src={previewData} alt="preview" />
                        <div className="file-name">{wallpaperPath.split("/").pop()}</div>
                      </>
                    ) : (
                      <div className="file-name muted">No file chosen</div>
                    )}
                  </div>
                  <button onClick={pickWallpaper} type="button">Choose…</button>
                </div>
              </div>
              <div className="form-row">
                <label>System Theme</label>
                <div className="segmented">
                  <button
                    className={systemTheme === "light" ? "seg active" : "seg"}
                    onClick={() => setSystemTheme("light")}
                    type="button"
                  >
                    Light
                  </button>
                  <button
                    className={systemTheme === "dark" ? "seg active" : "seg"}
                    onClick={() => setSystemTheme("dark")}
                    type="button"
                  >
                    Dark
                  </button>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              {editing && (
                <button className="danger" onClick={() => removePack(editing.id)} type="button">Delete</button>
              )}
              <div className="spacer" />
              <button onClick={savePack} className="primary" disabled={!name || !wallpaperPath || saving} type="button">
                {saving ? (editing ? "Saving…" : "Creating…") : (editing ? "Save Changes" : "Create")}
              </button>
            </div>
            {status && <div className="hint" style={{ marginTop: 8 }}>{status}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

function GalleryThumb({ path, name }: { path: string; name: string }) {
  const [data, setData] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const d = await invoke<string>("load_wallpaper_data", { path });
        setData(d);
      } catch {
        setData(null);
      }
    })();
  }, [path]);
  return (
    <div className="thumb">
      {data ? <img className="thumb-img" src={data} alt={name} /> : null}
    </div>
  );
}
