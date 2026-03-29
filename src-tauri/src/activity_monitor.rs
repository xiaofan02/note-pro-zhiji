//! Foreground window sampling (Windows): Cursor + browsers first.
//! Low footprint: one thread, configurable sleep, append-only JSONL.

use serde::{Deserialize, Serialize};
use std::fs::OpenOptions;
use std::io::Write;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread::JoinHandle;
use tauri::{AppHandle, Manager};

pub const DEFAULT_INTERVAL_SEC: u64 = 10;
pub const MIN_INTERVAL_SEC: u64 = 5;
pub const MAX_INTERVAL_SEC: u64 = 120;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityConfig {
    #[serde(default)]
    pub enabled: bool,
    #[serde(default = "default_interval")]
    pub interval_sec: u64,
}

fn default_interval() -> u64 {
    DEFAULT_INTERVAL_SEC
}

impl Default for ActivityConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            interval_sec: DEFAULT_INTERVAL_SEC,
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityStatus {
    pub supported: bool,
    pub enabled: bool,
    pub interval_sec: u64,
    pub log_path: String,
    pub running: bool,
}

pub struct ActivityState {
    pub cfg: Arc<Mutex<ActivityConfig>>,
    stop: Arc<AtomicBool>,
    handle: Mutex<Option<JoinHandle<()>>>,
}

impl ActivityState {
    pub fn new(cfg: ActivityConfig) -> Self {
        Self {
            cfg: Arc::new(Mutex::new(cfg)),
            stop: Arc::new(AtomicBool::new(false)),
            handle: Mutex::new(None),
        }
    }

    pub fn running(&self) -> bool {
        self.handle.lock().map(|g| g.is_some()).unwrap_or(false)
    }
}

fn config_path(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|d| d.join("activity_config.json"))
        .map_err(|e| e.to_string())
}

fn log_path(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|d| d.join("activity_log.jsonl"))
        .map_err(|e| e.to_string())
}

pub fn load_config(app: &AppHandle) -> ActivityConfig {
    let path = match config_path(app) {
        Ok(p) => p,
        Err(_) => return ActivityConfig::default(),
    };
    std::fs::read_to_string(&path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

pub fn save_config(app: &AppHandle, cfg: &ActivityConfig) -> Result<(), String> {
    let path = config_path(app)?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let data = serde_json::to_string_pretty(cfg).map_err(|e| e.to_string())?;
    std::fs::write(&path, data).map_err(|e| e.to_string())
}

#[cfg(windows)]
mod win_sample {
    use std::ffi::OsString;
    use std::os::windows::ffi::OsStringExt;
    use sysinfo::{Pid, ProcessRefreshKind, ProcessesToUpdate, System, UpdateKind};
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::WindowsAndMessaging::{GetForegroundWindow, GetWindowTextW, GetWindowThreadProcessId};

    pub struct Sample {
        pub title: String,
        pub pid: u32,
        pub exe_path: String,
        pub category: String,
    }

    fn classify_exe(exe_path: &str) -> &'static str {
        let lower = exe_path.to_lowercase();
        let basename = std::path::Path::new(&lower)
            .file_name()
            .and_then(|s| s.to_str())
            .unwrap_or("");
        if basename == "cursor.exe" {
            "cursor"
        } else if matches!(
            basename,
            "chrome.exe"
                | "msedge.exe"
                | "firefox.exe"
                | "brave.exe"
                | "opera.exe"
                | "vivaldi.exe"
                | "arc.exe"
                | "zen.exe"
                | "chromium.exe"
        ) {
            "browser"
        } else {
            "other"
        }
    }

    fn classify_fallback(title: &str) -> &'static str {
        let t = title.to_lowercase();
        if t.contains("cursor") {
            "cursor"
        } else if t.contains("chrome")
            || t.contains("edge")
            || t.contains("firefox")
            || t.contains("brave")
        {
            "browser"
        } else {
            "other"
        }
    }

    fn exe_for_pid(pid: u32) -> String {
        let mut sys = System::new();
        let p = Pid::from_u32(pid);
        sys.refresh_processes_specifics(
            ProcessesToUpdate::Some(std::slice::from_ref(&p)),
            false,
            ProcessRefreshKind::nothing().with_exe(UpdateKind::OnlyIfNotSet),
        );
        sys.process(p)
            .and_then(|proc| proc.exe().map(|e| e.to_string_lossy().into_owned()))
            .unwrap_or_default()
    }

    pub fn sample_foreground() -> Option<Sample> {
        unsafe {
            let hwnd: HWND = GetForegroundWindow();
            if hwnd.0.is_null() {
                return None;
            }

            let mut title_buf = vec![0u16; 512];
            let len = GetWindowTextW(hwnd, &mut title_buf);
            let title = if len <= 0 {
                String::new()
            } else {
                OsString::from_wide(&title_buf[..len as usize])
                    .to_string_lossy()
                    .into_owned()
            };

            let mut pid: u32 = 0;
            GetWindowThreadProcessId(hwnd, Some(&mut pid));
            if pid == 0 {
                return None;
            }

            let exe_path = exe_for_pid(pid);

            let category = if exe_path.is_empty() {
                classify_fallback(&title).to_string()
            } else {
                classify_exe(&exe_path).to_string()
            };

            Some(Sample {
                title,
                pid,
                exe_path,
                category,
            })
        }
    }
}

#[cfg(not(windows))]
mod win_sample {
    pub struct Sample {
        pub title: String,
        pub pid: u32,
        pub exe_path: String,
        pub category: String,
    }
    pub fn sample_foreground() -> Option<Sample> {
        None
    }
}

fn append_line(app: &AppHandle, line: &str) -> Result<(), String> {
    let path = log_path(app)?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let mut f = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)
        .map_err(|e| e.to_string())?;
    writeln!(f, "{}", line).map_err(|e| e.to_string())?;
    Ok(())
}

fn log_event(app: &AppHandle, sample: &win_sample::Sample) -> Result<(), String> {
    // Only persist cursor / browser / other for OpenClaw filtering; always include category.
    let ts = chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
    let obj = serde_json::json!({
        "ts": ts,
        "category": sample.category,
        "pid": sample.pid,
        "exe": sample.exe_path,
        "title": sample.title,
    });
    append_line(app, &obj.to_string())
}

pub fn start_monitor(state: &ActivityState, app: &AppHandle) -> Result<(), String> {
    #[cfg(not(windows))]
    {
        let _ = (state, app);
        return Err("当前系统仅支持 Windows 前台活动记录".to_string());
    }

    #[cfg(windows)]
    {
        let mut guard = state.handle.lock().map_err(|e| e.to_string())?;
        if guard.is_some() {
            return Ok(());
        }
        state.stop.store(false, Ordering::SeqCst);
        let stop = state.stop.clone();
        let cfg = state.cfg.clone();
        let app = app.clone();

        let handle = std::thread::spawn(move || {
            let mut last_key: Option<(String, String)> = None;
            loop {
                if stop.load(Ordering::SeqCst) {
                    break;
                }
                let interval_sec = cfg
                    .lock()
                    .map(|c| c.interval_sec.clamp(MIN_INTERVAL_SEC, MAX_INTERVAL_SEC))
                    .unwrap_or(DEFAULT_INTERVAL_SEC);
                std::thread::sleep(std::time::Duration::from_secs(interval_sec));

                if stop.load(Ordering::SeqCst) {
                    break;
                }

                if let Some(s) = win_sample::sample_foreground() {
                    let key = (s.exe_path.clone(), s.title.clone());
                    if last_key.as_ref() != Some(&key) {
                        if let Err(e) = log_event(&app, &s) {
                            eprintln!("[activity_monitor] log failed: {}", e);
                        }
                        last_key = Some(key);
                    }
                }
            }
        });

        *guard = Some(handle);
        Ok(())
    }
}

pub fn stop_monitor(state: &ActivityState) -> Result<(), String> {
    state.stop.store(true, Ordering::SeqCst);
    let mut guard = state.handle.lock().map_err(|e| e.to_string())?;
    if let Some(h) = guard.take() {
        let _ = h.join();
    }
    Ok(())
}

#[tauri::command]
pub fn activity_get_status(app: AppHandle, state: tauri::State<'_, ActivityState>) -> Result<ActivityStatus, String> {
    let cfg = state.cfg.lock().map_err(|e| e.to_string())?;
    let path = log_path(&app).unwrap_or_else(|_| PathBuf::from(""));
    Ok(ActivityStatus {
        supported: cfg!(windows),
        enabled: cfg.enabled,
        interval_sec: cfg.interval_sec,
        log_path: path.to_string_lossy().to_string(),
        running: state.running(),
    })
}

#[tauri::command]
pub fn activity_set_config(
    app: AppHandle,
    state: tauri::State<'_, ActivityState>,
    enabled: bool,
    interval_sec: u64,
) -> Result<(), String> {
    let interval = interval_sec.clamp(MIN_INTERVAL_SEC, MAX_INTERVAL_SEC);
    {
        let mut cfg = state.cfg.lock().map_err(|e| e.to_string())?;
        cfg.enabled = enabled;
        cfg.interval_sec = interval;
    }
    let snapshot = state.cfg.lock().map_err(|e| e.to_string())?.clone();
    save_config(&app, &snapshot)?;

    if enabled {
        stop_monitor(&state)?;
        start_monitor(&state, &app)?;
    } else {
        stop_monitor(&state)?;
    }
    Ok(())
}

#[tauri::command]
pub fn activity_read_log_tail(app: AppHandle, max_lines: usize) -> Result<String, String> {
    let path = log_path(&app)?;
    let max_lines = max_lines.clamp(1, 500);
    let data = std::fs::read_to_string(&path).unwrap_or_default();
    let lines: Vec<&str> = data.lines().collect();
    let start = lines.len().saturating_sub(max_lines);
    Ok(lines[start..].join("\n"))
}
