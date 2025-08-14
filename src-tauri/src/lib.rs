use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf};
use base64::Engine as _;
// use tauri::Manager; // not used

// Basic theme pack model stored as JSON in app data dir
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThemePack {
    pub id: String,
    pub name: String,
    pub wallpaper_path: String,
    pub system_theme: String, // "light" | "dark"
}

fn data_dir() -> PathBuf {
    if let Some(mut dir) = dirs::data_dir() {
        dir.push("Dayflow");
        let _ = fs::create_dir_all(&dir);
        return dir;
    }
    PathBuf::from("./.dayflow")
}

fn packs_file() -> PathBuf {
    let mut path = data_dir();
    path.push("theme_packs.json");
    path
}

fn wallpapers_dir() -> PathBuf {
    let mut path = data_dir();
    path.push("wallpapers");
    let _ = fs::create_dir_all(&path);
    path
}

fn read_packs() -> Vec<ThemePack> {
    let path = packs_file();
    if let Ok(bytes) = fs::read(&path) {
        if let Ok(list) = serde_json::from_slice::<Vec<ThemePack>>(&bytes) {
            return list;
        }
    }
    Vec::new()
}

fn write_packs(packs: &[ThemePack]) -> Result<(), String> {
    let path = packs_file();
    let json = serde_json::to_vec_pretty(packs).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())
}

#[tauri::command]
fn list_theme_packs(_app: tauri::AppHandle) -> Vec<ThemePack> {
    read_packs()
}

#[derive(Deserialize)]
struct CreatePackArgs {
    name: String,
    #[serde(alias = "wallpaperPath", alias = "wallpaper_path")]
    wallpaper_path: String,
    #[serde(alias = "systemTheme", alias = "system_theme")]
    system_theme: String,
}

#[tauri::command]
fn create_theme_pack(_app: tauri::AppHandle, args: CreatePackArgs) -> Result<ThemePack, String> {
    if args.system_theme != "light" && args.system_theme != "dark" {
        return Err("system_theme must be 'light' or 'dark'".into());
    }
    let mut packs = read_packs();
    let id = format!("{}-{}", args.name, nanoid::nanoid!(8));
    let pack = ThemePack {
        id: id.clone(),
        name: args.name,
        wallpaper_path: args.wallpaper_path,
        system_theme: args.system_theme,
    };
    packs.push(pack.clone());
    write_packs(&packs)?;
    Ok(pack)
}

#[derive(Deserialize)]
struct UpdatePackArgs {
    id: String,
    name: String,
    #[serde(alias = "wallpaperPath", alias = "wallpaper_path")]
    wallpaper_path: String,
    #[serde(alias = "systemTheme", alias = "system_theme")]
    system_theme: String,
}

#[tauri::command]
fn update_theme_pack(_app: tauri::AppHandle, args: UpdatePackArgs) -> Result<ThemePack, String> {
    if args.system_theme != "light" && args.system_theme != "dark" {
        return Err("system_theme must be 'light' or 'dark'".into());
    }
    let mut packs = read_packs();
    if let Some(pos) = packs.iter().position(|p| p.id == args.id) {
        packs[pos] = ThemePack {
            id: packs[pos].id.clone(),
            name: args.name,
            wallpaper_path: args.wallpaper_path,
            system_theme: args.system_theme,
        };
        let out = packs[pos].clone();
        write_packs(&packs)?;
        return Ok(out);
    }
    Err("Theme pack not found".into())
}

#[tauri::command]
fn delete_theme_pack(_app: tauri::AppHandle, id: String) -> Result<(), String> {
    let mut packs = read_packs();
    let original_len = packs.len();
    packs.retain(|p| p.id != id);
    if packs.len() == original_len { return Err("Theme pack not found".into()); }
    write_packs(&packs)
}

#[tauri::command]
fn apply_theme_pack(_app: tauri::AppHandle, id: String) -> Result<(), String> {
    let packs = read_packs();
    let Some(pack) = packs.into_iter().find(|p| p.id == id) else { return Err("Theme pack not found".into()); };
    // macOS-specific: set wallpaper and system appearance
    #[cfg(target_os = "macos")]
    {
        set_macos_wallpaper(&pack.wallpaper_path).map_err(|e| e.to_string())?;
        set_macos_appearance(&pack.system_theme).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[derive(Deserialize)]
struct ImportArgs {
    #[serde(alias = "sourcePath", alias = "source_path")]
    source_path: String,
}

#[tauri::command]
fn import_wallpaper(_app: tauri::AppHandle, args: ImportArgs) -> Result<String, String> {
    use std::path::Path;
    // Normalize potential file:// URL into a filesystem path
    let normalized = args
        .source_path
        .strip_prefix("file://")
        .map(|s| s.to_string())
        .unwrap_or(args.source_path);
    let src = Path::new(&normalized);
    if !src.exists() { return Err("Source file does not exist".into()); }
    let ext = src.extension().and_then(|e| e.to_str()).unwrap_or("jpg");
    let filename = format!("{}.{ext}", nanoid::nanoid!(10));
    let mut dest = wallpapers_dir();
    dest.push(filename);
    fs::copy(src, &dest).map_err(|e| e.to_string())?;
    dest.canonicalize().or(Ok(dest)).map(|p| p.to_string_lossy().to_string())
}

#[cfg(target_os = "macos")]
fn set_macos_wallpaper(path: &str) -> anyhow::Result<()> {
    use std::process::Command;
    // Follow the canonical structure: tell System Events → tell every desktop → set picture
    let escaped = path.replace('"', "\\\"");
    let script = format!(
        r#"tell application "System Events"
tell every desktop
    set picture to "{}"
end tell
end tell"#,
        escaped
    );
    let status = Command::new("osascript").arg("-e").arg(script).status()?;
    if !status.success() { anyhow::bail!("Failed to set wallpaper"); }
    Ok(())
}

#[cfg(target_os = "macos")]
fn set_macos_appearance(theme: &str) -> anyhow::Result<()> {
    use std::process::Command;
    let dark = theme == "dark";
    let script = format!(
        "tell application \"System Events\" to tell appearance preferences to set dark mode to {}",
        if dark { "true" } else { "false" }
    );
    let status = Command::new("osascript").arg("-e").arg(script).status()?;
    if !status.success() { anyhow::bail!("Failed to set appearance"); }
    Ok(())
}

#[tauri::command]
fn load_wallpaper_data(_app: tauri::AppHandle, path: String) -> Result<String, String> {
    let normalized = path
        .strip_prefix("file://")
        .map(|s| s.to_string())
        .unwrap_or(path);
    let bytes = fs::read(&normalized).map_err(|e| e.to_string())?;
    let mime = infer::get(&bytes)
        .map(|t| t.mime_type())
        .unwrap_or("image/jpeg");
    let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
    Ok(format!("data:{};base64,{}", mime, b64))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            use tauri::menu::{Menu, MenuItemBuilder};
            use tauri::tray::TrayIconBuilder;
            // Build menu from current packs
            let menu = Menu::new(app)?;
            for pack in list_theme_packs(app.handle().clone()) {
                let item = MenuItemBuilder::with_id(pack.id.clone(), pack.name.clone()).build(app)?;
                menu.append(&item)?;
            }
            // Create tray with static menu; clicks handled via on_menu_event
            // Embed tray icon PNG to ensure availability
            let tray_png: &[u8] = include_bytes!("../icons/icon.png");
            let tray_image = {
                let img = image::load_from_memory(tray_png).expect("invalid tray icon PNG");
                let rgba = img.to_rgba8();
                tauri::image::Image::new_owned(rgba.to_vec(), rgba.width(), rgba.height())
            };

            let _tray = TrayIconBuilder::new()
                .menu(&menu)
                .icon(tray_image)
                .build(app)?;
            app.on_menu_event(|app, event| {
                let id = event.id().as_ref().to_owned();
                let _ = apply_theme_pack(app.clone(), id);
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            list_theme_packs,
            create_theme_pack,
            update_theme_pack,
            delete_theme_pack,
            apply_theme_pack,
            import_wallpaper,
            load_wallpaper_data
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
