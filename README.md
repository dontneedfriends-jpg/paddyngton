# 📖 Paddyngton

### Кроссплатформенный редактор для написания книг

---

*"Потому что писать должно быть красиво. Или хотя бы функционально."*

---

<img width="1202" height="802" alt="{6185871F-8D3A-45D7-B9C3-425D22F762C9}" src="https://github.com/user-attachments/assets/0a0a2e20-987d-434f-8bf5-fd1e33c914a9" />


## Возможности

### ✍️ Markdown Editor
- **CodeMirror 6** — с подсветкой синтаксиса
- Кнопки форматирования — для тех, кто не помнит все горячие клавиши
- **Line numbers** — включить/выключить, потому что можно
- **Auto-save** — сохраняет ваши труды каждые 60 секунд
- **Подсветка markdown-маркеров** — faded-стиль для `**`, `*`, `#`

  <img width="1202" height="802" alt="{2BEBBB46-0641-4CAF-A0CF-9D5AE4FF03DC}" src="https://github.com/user-attachments/assets/b118b77a-e318-4bd6-b37c-7f9f8f5fb9bb" />


### 🗂️ Context System (Персонажи, Места, Даты, Предметы)

<img width="1202" height="802" alt="{5DA7185A-5373-4FB4-BCFB-111AFCAD0E0B}" src="https://github.com/user-attachments/assets/eb0ae9d0-b7a1-4e31-a487-03b0d7eed01b" />


| Тип | Описание |
|------|----------|
| character | Ваши персонажи (те, кого вы ещё не убили в сюжете) |
| place | Локации мира (куда герои никогда не доберутся) |
| date | Важные даты (которые вы потом замените на "некоторое время спустя") |
| item | Предметы и артефакты (полезные, пока не забыли, зачем они нужны) |

Каждая запись содержит **details**, **relations**, **group** и **notes**. Всё как в реальной жизни, только без бюрократии.

### 🕸️ Mind Map

<img width="1202" height="802" alt="{B0398D4F-8D24-4D4B-963A-A802037B42BF}" src="https://github.com/user-attachments/assets/156e0bbd-91ac-41bf-b8e7-e6d39cb2d3a1" />


Визуальная карта отношений между персонажами. Потому что в голове уже не помещается.

- Перетаскивайте персонажей по холсту — терапия для перфекционистов
- Соединяйте линиями — кто кого предаст в третьем акте
- **Группы**: персонажи объединяются в группы с полупрозрачными фонами и подписями
- **Граница ноды**: линии рисуются до края карточки, а не до центра
- Панорамирование и зум колёсиком мыши
- Цвета по типу отношений:
  - **ally** — союзник (пока не предал)
  - **enemy** — враг (пока не стал союзником)
  - **family** — семья (непредсказуемо)
  - **neutral** — нейтрально (автор ещё не решил)
  - **romantic** — романтика (драма гарантирована)
  - **rival** — соперник (кто-то точно умрёт)

### 📚 Wiki View

<img width="1202" height="802" alt="{60238812-8FAB-4C74-A895-04664BA50DBA}" src="https://github.com/user-attachments/assets/56996668-84f4-4496-acdc-3d1cfd3c40d9" />


Просмотр и редактирование деталей персонажей, мест, дат и предметов. Всё, что вы забудете через месяц.

- Редактирование свойств inline
- Управление relations с цветовыми бейджами
- Timeline events & world connections
- Перекрёстные ссылки между персонажами

### ⏱️ Timeline

<img width="1202" height="802" alt="{72F87504-6421-4182-8523-CE0BC57893BE}" src="https://github.com/user-attachments/assets/0a2ee6bf-e7b6-4243-a3d7-93510ab22e6b" />

Хронологические события с датами, цветом и заметками. Чтобы сюжет не развалился. Хотя обычно разваливается.

### 📝 Notes

Быстрые заметки. Для идей, которые вы потом точно не реализуете.

### 🌍 World Building

Записи о мире с категориями. Место для всего, что не влезло в основной сюжет.

### 📋 Kanban Board

<img width="1202" height="802" alt="{F2DA0166-FD0C-4C2F-819B-37FD912C1AE7}" src="https://github.com/user-attachments/assets/5ec48e9f-f420-4a16-baca-3d1b684ca339" />

Доска с карточками: "Идеи", "В работе", "Готово". Реальность: "Идеи", "Идеи", "Идеи".


### 🔍 Поиск

<img width="1202" height="802" alt="{D41968EE-1AED-4257-8C57-C698D380B300}" src="https://github.com/user-attachments/assets/98d6cfdc-1c85-465c-a759-a66fb2801653" />


Ctrl+Shift+F — ищите по всем главам и контексту. Результаты с подсветкой. Потому что grep — слишком сложно для нормальных людей.

### 📸 Версионирование

<img width="1202" height="802" alt="{2BB4B44E-C47B-422E-847B-197526B133A6}" src="https://github.com/user-attachments/assets/1848cc3d-016a-4689-8f4d-33109c9aaeff" />

- **Save snapshot** — сохраняйте версии с меткой ("финальная", "нет, теперь финальная", "серьёзно, последняя")
- **Auto-snapshots** — по таймеру (настраивается в Settings)
- **Word count, char count, chapter count** — для параноиков и перфекционистов
- **Restore** — восстанавливайте предыдущие версии. На случай "а давайте удалим всё"

### 🐻 Bear Import/Export

Импорт/экспорт в формате Bear app (zip-архивы с note-сниппетами). Потому что миграция должна быть больной. Но хотя бы работает.

### 🌐 i18n

3 языка: English, Español, Русский. Все UI-строки через `t('key')` — никаких хардкодных строк. Переводы в `/translations/`.

---

## Структура

```
paddyngton/
├── src/                       # React frontend
│   ├── App.tsx                # ~331 строк — чистая композиция
│   ├── index.css              # 1785 строк — темы и глобальные стили
│   ├── i18n.tsx               # Интернационализация — 3 языка
│   ├── main.tsx               # Точка входа
│   ├── types/                 # TS-типы и константы
│   │   └── index.ts
│   ├── constants/             # FORMAT_BUTTONS, MARKER_CLOSERS
│   │   └── formatButtons.ts
│   ├── store/                 # Zustand stores (все подключены)
│   │   ├── useBookStore.ts    # Состояние книг
│   │   ├── useUIStore.ts      # Состояние UI (модалки, тосты, цвета)
│   │   ├── useSettingsStore.ts # Настройки + localStorage
│   │   └── index.ts
│   ├── hooks/                 # Кастомные хуки (все подключены)
│   │   ├── useBookManager.ts
│   │   ├── useEditor.ts
│   │   ├── useMindMap.ts
│   │   ├── useKeyboardShortcuts.ts
│   │   ├── useAutoSave.ts
│   │   ├── useVersions.ts
│   │   ├── useWindowControls.ts
│   │   └── useSettings.ts     # Утилиты localStorage (устаревает)
│   ├── lib/                   # Чистые функции (все подключены)
│   │   ├── markdownRender.ts
│   │   ├── contextHelpers.ts
│   │   ├── formatEditor.ts
│   │   └── bookIO.ts
│   ├── components/            # Компоненты
│   │   ├── dialogs/           # Toast, ConfirmDialog, InputDialog,
│   │   │                      # CommandPalette, BookDialog
│   │   ├── panels/            # TimelinePanel, SearchPanel, NotesPanel,
│   │   │                      # WorldPanel, KanbanPanel, SettingsPanel,
│   │   │                      # ContextEditor, WikiPanel, MindMapCanvas,
│   │   │                      # VersionsPanel
│   │   ├── layout/            # TitleBar, Header, Sidebar, StatusBar,
│   │   │                      # WelcomeScreen
│   │   └── editor/            # FormatToolbar
│   └── translations/          # en.json, es.json, ru.json
├── src-tauri/                 # Rust backend
│   ├── src/
│   │   ├── lib.rs             # ~55 строк — регистрация плагинов
│   │   ├── models.rs          # Структуры данных
│   │   ├── utils.rs           # Утилиты (chrono_lite_now, rand_id)
│   │   └── commands/          # Модули команд
│   │       ├── window.rs
│   │       ├── version.rs
│   │       ├── fs.rs
│   │       ├── snapshot.rs
│   │       ├── bear.rs
│   │       └── pdf.rs
│   └── tauri.conf.json
├── package.json
├── context-template.json      # Шаблон контекста
└── book-template.json         # Шаблон книги
```

---

## Формат файлов

### `.book.json`
```json
{
  "title": "Книга",
  "author": "Автор",
  "genre": "Жанр",
  "bookType": "Novel",
  "description": "Описание",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "chapters": [{"id": "uuid", "name": "Глава 1", "file": "Глава 1.md"}]
}
```

### `.context.json`
```json
{
  "context": [
    {
      "name": "Герой",
      "type": "character",
      "details": {"Age": "30", "Gender": "мужской"},
      "relations": [{"name": "Союзник", "type": "ally"}],
      "group": "Протагонисты",
      "notes": "",
      "_x": 100,
      "_y": 200
    }
  ],
  "timelineData": [],
  "notes": [],
  "worldData": [],
  "kanbanData": {"columns": []}
}
```

---

## Установка

```bash
npm install
npm run tauri build
```

Или скачайте установщик из GitHub Releases. Там хотя бы версия актуальная.

---

## Горячие клавиши

| Клавиша | Действие |
|--------|----------|
| Ctrl+N | Новая глава |
| Ctrl+Shift+N | Новая книга |
| Ctrl+O | Открыть папку |
| Ctrl+S | Сохранить главу |
| Ctrl+K | Command palette |
| Ctrl+B | Показать/скрыть сайдбар |
| Ctrl+T | Сменить тему |
| Ctrl+Shift+F | Поиск |
| Ctrl+Z / Ctrl+Y | Отмена/повтор |
| Ctrl+, | Настройки |
| Escape | Закрыть всё — паника |

---

## Зачем это нужно?

~~Word~~ — слишком много кнопок  
~~Google Docs~~ — требует интернет (а интернет — это обязательно что-то сломается)  
~~Scrivener~~ — стоит денег  
~~Notion~~ — для стартапов, не для книг (хотя маркетологи очень стараются)

**Paddyngton** — бесплатно, локально, с картой персонажей и 7 темами. Остальное — ваша работа. Удачи.

---

## Contributing

Pull requests приветствуются. Особенно те, что делают приложение лучше и не ломают существующий функционал.

См. `TODO.md` и `IMPROVEMENT_PLAN.md` для текущего плана рефакторинга.

---

## Лицензия

MIT. Делайте что хотите. Мы не можем вам помешать.

---

*"Paddyngton — потому что писать должно быть красиво. Или хотя бы не больно."*
