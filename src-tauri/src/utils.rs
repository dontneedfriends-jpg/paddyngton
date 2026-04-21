use std::fs;
use std::path::Path;

pub fn chrono_lite_now() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap();
    let secs = now.as_secs();
    let hours = (secs / 3600) % 24;
    let mins = (secs / 60) % 60;
    let s = secs % 60;
    let ms = now.subsec_millis();
    let y = ((secs / 31536000) + 1970) as u16;
    let days_since_epoch = secs / 86400;
    let mut y = y;
    let mut days = days_since_epoch as i64;
    let leap = |y: u16| -> bool { y % 4 == 0 && (y % 100 != 0 || y % 400 == 0) };
    while days > 0 {
        let days_in_year: i64 = if leap(y) { 366 } else { 365 };
        if days >= days_in_year {
            days -= days_in_year;
            y += 1;
        } else {
            break;
        }
    }
    let mut yday = days as u16;
    let is_leap = leap(y);
    let days_in_month: [u16; 12] = if is_leap {
        [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    } else {
        [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    };
    let mut mon: u16 = 0;
    for (i, d) in days_in_month.iter().enumerate() {
        if yday < *d {
            mon = i as u16;
            break;
        }
        yday -= *d;
    }
    let mday = yday + 1;
    let hours = hours as u8;
    let mins = mins as u8;
    let s = s as u8;
    format!("{:04}-{:02}-{:02}T{:02}:{:02}:{:02}.{:03}", y, mon + 1, mday, hours, mins, s, ms)
}

pub fn rand_id() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap();
    format!("{}", now.as_nanos())
}

pub fn walkdir_files(dir: &Path) -> Vec<std::path::PathBuf> {
    let mut results = vec![];
    let mut stack = vec![dir.to_path_buf()];
    while let Some(current) = stack.pop() {
        if let Ok(entries) = fs::read_dir(&current) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    stack.push(path);
                } else {
                    results.push(path);
                }
            }
        }
    }
    results
}
