## Dayflow

Dayflow is a tiny macOS desktop app (Tauri + React) for creating and switching between wallpaper + appearance “theme packs”.

- Create theme packs with a name, wallpaper, and system appearance (light/dark)
- Preview wallpapers instantly (no file URLs) via base64 previews
- Apply a theme to set the macOS wallpaper on all desktops and toggle light/dark
- Edit or delete theme packs
- Menu bar tray: click the icon to choose a theme from a quick list


### Stack

- Frontend: React + Vite
- Desktop: Tauri 2.x (Rust)
- Plugins: `@tauri-apps/plugin-dialog` for file picking


## Quick start

Prerequisites:
- macOS (tested on Apple Silicon)
- Node.js + npm
- Rust toolchain (`rustup`, `rustc`, `cargo`)
- Tauri CLI: `npm i -D @tauri-apps/cli`

Install deps:

```bash
npm i
```

Dev run (starts Vite on 1420 and the Tauri app):

```bash
npm run tauri dev
```

Build a release bundle (signed/notarization not covered):

```bash
npm run tauri build
```


## How it works

### Theme packs

Each theme pack is stored as JSON in the Dayflow app data directory with fields:

```json
{
  "id": "<generated>",
  "name": "My Theme",
  "wallpaper_path": "/absolute/path/inside/appdata/wallpapers/<file>",
  "system_theme": "light" | "dark"
}
```

App data location (macOS): `~/Library/Application Support/Dayflow`

- `theme_packs.json` contains all packs
- `/wallpapers` contains copied wallpaper images

When you pick a wallpaper, Dayflow copies it into the wallpapers folder so your themes remain portable and robust if the original file moves.

### Live previews (no file://)

Previews are returned as base64 data URLs from a Rust command to avoid file URL or permission issues:

- Frontend calls `load_wallpaper_data(path)`
- Backend reads the file, infers MIME, base64-encodes it, and returns `data:<mime>;base64,<...>`

### Applying a theme (macOS)

Dayflow uses AppleScript via `osascript` to:

- Set the wallpaper on every desktop (Space)
- Toggle light/dark mode using System Events appearance preferences

You may be prompted to grant permissions the first time.

### Menu bar tray

Dayflow adds a tray icon (no text). Clicking the tray opens a menu listing your saved themes; selecting one applies it immediately.


## Commands (Rust API)

All commands are invoked from the frontend with a single `args` object (Tauri 2.x convention). Aliases allow camelCase or snake_case keys.

- `list_theme_packs()` → `ThemePack[]`
- `create_theme_pack({ args: { name, wallpaperPath|wallpaper_path, systemTheme|system_theme } })` → `ThemePack`
- `update_theme_pack({ args: { id, name, wallpaperPath|wallpaper_path, systemTheme|system_theme } })` → `ThemePack`
- `delete_theme_pack({ id })` → `void`
- `apply_theme_pack({ id })` → `void`
- `import_wallpaper({ args: { sourcePath|source_path } })` → `string`
  - Copies the source file into the app data `wallpapers` directory and returns the absolute destination path
- `load_wallpaper_data({ path })` → `string`
  - Returns a base64 data URL for previewing the image in the UI


## Development

Scripts:

```json
{
  "dev": "vite --port 1420 --strictPort",
  "tauri": "tauri",
  "build": "tsc && vite build",
  "icons": "node ./tools/generate-icons.mjs"
}
```

Run dev app:

```bash
npm run tauri dev
```

Generate icons:

```bash
npm run icons
```

This will:
- Render app icons from `src-tauri/icons/dayflow.svg` to `src-tauri/icons/` (sizes used by the bundle)
- Render tray icon from `src-tauri/icons/tray-dayflow.svg` to `public/tray-dayflow.png`

Tray icon
- The tray icon is embedded at compile time (PNG bytes) for reliability
- To change it, replace `src-tauri/icons/icon.png` or update the embed to use your generated `public/tray-dayflow.png`


## Troubleshooting

- Vite port conflicts: the app expects Vite on `1420`. Either stop other dev servers or change the port in `package.json` and `tauri.conf.json` together.
- esbuild EPIPE during dev: Dayflow pins modern `esbuild` in devDependencies. Reinstall deps (`npm i`) if you see esbuild runtime issues.
- Wallpaper apply errors: If AppleScript fails, ensure Dayflow has necessary permissions under System Settings → Privacy & Security, and try again.
- Icons while bundling: Ensure required icon files exist in `src-tauri/icons/` (run `npm run icons`).


## Project layout

Key files:

- `src/App.tsx` – UI (gallery, modal create/edit, file picker)
- `src-tauri/src/lib.rs` – Tauri commands, theme storage, preview+apply logic, tray menu
- `src-tauri/tauri.conf.json` – Tauri configuration and bundle icon list
- `tools/generate-icons.mjs` – Icon generation script (Sharp)


## License

MIT

# Tauri + React + Typescript

This template should help get you started developing with Tauri, React and Typescript in Vite.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
