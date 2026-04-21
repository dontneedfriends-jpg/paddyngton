use crate::models::ChapterData;
use printpdf::*;
use std::fs;

#[tauri::command]
pub fn generate_pdf(path: String, title: String, chapters_json: String) -> Result<(), String> {
    let chapters: Vec<ChapterData> =
        serde_json::from_str(&chapters_json).map_err(|e| e.to_string())?;

    let (doc, page1, layer1) = PdfDocument::new(&title, Mm(210.0), Mm(297.0), "Layer 1");
    let font = doc.add_builtin_font(BuiltinFont::Helvetica).map_err(|e| e.to_string())?;

    let current_layer = doc.get_page(page1).get_layer(layer1);
    current_layer.use_text(&title, 24.0, Mm(20.0), Mm(280.0), &font);
    current_layer.use_text("Оглавление", 16.0, Mm(20.0), Mm(260.0), &font);

    let mut y_pos = 250.0;
    for (i, ch) in chapters.iter().enumerate() {
        y_pos -= 7.0;
        current_layer.use_text(&format!("{}. {}", i + 1, ch.name), 12.0, Mm(25.0), Mm(y_pos), &font);
    }

    y_pos -= 20.0;
    current_layer.use_text("Главы", 16.0, Mm(20.0), Mm(y_pos), &font);
    y_pos -= 15.0;

    for ch in &chapters {
        if y_pos < 30.0 {
            break;
        }
        current_layer.use_text(&ch.name, 14.0, Mm(20.0), Mm(y_pos), &font);
        y_pos -= 10.0;

        let clean: String = ch.code.chars().take(500).collect();
        for line in clean.lines().take(15) {
            if y_pos < 20.0 {
                break;
            }
            current_layer.use_text(line, 10.0, Mm(20.0), Mm(y_pos), &font);
            y_pos -= 5.0;
        }
        y_pos -= 10.0;
    }

    doc.save(&mut std::io::BufWriter::new(
        fs::File::create(&path).map_err(|e| e.to_string())?,
    ))
    .map_err(|e| e.to_string())
}
