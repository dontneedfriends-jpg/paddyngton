import re

filepath = r'C:\Users\annenskei\Documents\GitHub\Paddyngton\src\App.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Count actual emoji occurrences before replacement
emoji_counts = {}

replacements = [
    # Context type icons in tooltip
    ("'👤 ' + t('context.types.character')", "'[C] ' + t('context.types.character')"),
    ("'📍 ' + t('context.types.place')", "'[P] ' + t('context.types.place')"),
    ("'📅 ' + t('context.types.date')", "'[D] ' + t('context.types.date')"),
    ("'📦 ' + t('context.types.item')", "'[I] ' + t('context.types.item')"),
    
    # Settings save button
    ("💾 {t('settings.bookSave')}", "[Save] {t('settings.bookSave')}"),
    
    # About panel (if not already replaced)
    ("🎉 {t('about.updateAvailable')", "[New] {t('about.updateAvailable')"),
    
    # Context editor header
    (">📚 Wiki</button>", ">[Wiki]</button>"),
    (">🕸️ Map</button>", ">[Map]</button>"),
    
    # Context type select options
    ("<option value=\"character\">👤 {t('context.types.character')}</option>", "<option value=\"character\">[C] {t('context.types.character')}</option>"),
    ("<option value=\"place\">📍 {t('context.types.place')}</option>", "<option value=\"place\">[P] {t('context.types.place')}</option>"),
    ("<option value=\"date\">📅 {t('context.types.date')}</option>", "<option value=\"date\">[D] {t('context.types.date')}</option>"),
    ("<option value=\"item\">📦 {t('context.types.item')}</option>", "<option value=\"item\">[I] {t('context.types.item')}</option>"),
    
    # Template selector
    ("type === 'character' ? '👤' : type === 'place' ? '📍' : type === 'date' ? '📅' : '📦'",
     "type === 'character' ? '[C]' : type === 'place' ? '[P]' : type === 'date' ? '[D]' : '[I]'"),
    
    # Wiki sidebar
    ("<span>{item.type === 'character' ? '👤' : item.type === 'place' ? '📍' : item.type === 'date' ? '📅' : '📦'}</span>",
     "<span>{item.type === 'character' ? '[C]' : item.type === 'place' ? '[P]' : item.type === 'date' ? '[D]' : '[I]'}</span>"),
    
    # Wiki entry header
    ("{state.wikiSelected.type === 'character' ? '👤' : state.wikiSelected.type === 'place' ? '📍' : state.wikiSelected.type === 'date' ? '📅' : '📦'}",
     "{state.wikiSelected.type === 'character' ? '[C]' : state.wikiSelected.type === 'place' ? '[P]' : state.wikiSelected.type === 'date' ? '[D]' : '[I]'}"),
    
    # Wiki edit/view toggle
    ("{state.wikiEditMode ? '👁 ' + t('context.view') : '✏️ ' + t('context.edit')}",
     "{state.wikiEditMode ? '[View] ' + t('context.view') : '[Edit] ' + t('context.edit')}"),
    
    # Wiki relation entry icon
    ("{relEntry?.type === 'character' ? '👤' : relEntry?.type === 'place' ? '📍' : '📦'}",
     "{relEntry?.type === 'character' ? '[C]' : relEntry?.type === 'place' ? '[P]' : '[I]'}"),
    
    # Wiki relation options
    ("<option value=\"ally\">🤝 {t('relations.friendly')}</option>", "<option value=\"ally\">[Ally] {t('relations.friendly')}</option>"),
    ("<option value=\"family\">👨‍👩‍👧 {t('relations.family')}</option>", "<option value=\"family\">[Family] {t('relations.family')}</option>"),
    ("<option value=\"romantic\">❤️ {t('relations.romantic')}</option>", "<option value=\"romantic\">[Love] {t('relations.romantic')}</option>"),
    ("<option value=\"neutral\">➖ {t('relations.neutral')}</option>", "<option value=\"neutral\">[Neutral] {t('relations.neutral')}</option>"),
    ("<option value=\"rival\">⚔️ {t('relations.rival')}</option>", "<option value=\"rival\">[Rival] {t('relations.rival')}</option>"),
    ("<option value=\"enemy\">💀 {t('relations.hostile')}</option>", "<option value=\"enemy\">[Enemy] {t('relations.hostile')}</option>"),
    
    # Wiki events
    ("<span style={{ fontSize: '11px', fontWeight: 600 }}>{ev.type === 'timeline' ? '📅' : '🌍'}</span>",
     "<span style={{ fontSize: '11px', fontWeight: 600 }}>{ev.type === 'timeline' ? '[D]' : '[W]'}</span>"),
    
    # Wiki cross refs
    ("👤 {e.name}", "[C] {e.name}"),
    
    # Wiki open mind map
    (">🕸️ {t('wiki.openMindMap')}</button>", ">[Map] {t('wiki.openMindMap')}</button>"),
    
    # Mind map title
    (">🕸️ {t('mindmap.title')}</h2>", ">[Map] {t('mindmap.title')}</h2>"),
    
    # Mind map add character
    (">➕ {t('mindmap.addCharacter')}</button>", ">[+] {t('mindmap.addCharacter')}</button>"),
    
    # Notes title
    (">📝 {t('notes.title')}</h2>", ">[Notes] {t('notes.title')}</h2>"),
    (">➕ {t('notes.addNote')}</button>", ">[+] {t('notes.addNote')}</button>"),
    
    # World title
    (">🌍 {t('world.title')}</h2>", ">[World] {t('world.title')}</h2>"),
    (">➕ {t('world.addEntry')}</button>", ">[+] {t('world.addEntry')}</button>"),
    
    # Kanban title
    (">📋 {t('kanban.title')}</h2>", ">[Board] {t('kanban.title')}</h2>"),
    (">➕ {t('kanban.addColumn')}</button>", ">[+] {t('kanban.addColumn')}</button>"),
    (">✏️</button>", ">[E]</button>"),
    (">🗑️</button>", ">[D]</button>"),
    (">➕ {t('kanban.addCard')}</button>", ">[+] {t('kanban.addCard')}</button>"),
    
    # Book dialog
    ("<h2>📖 {t('bookDialog.open')}</h2>", "<h2>[Open] {t('bookDialog.open')}</h2>"),
    ("<h2>💾 {t('bookDialog.save')}</h2>", "<h2>[Save] {t('bookDialog.save')}</h2>"),
    
    # Search
    (">🔍 {t('search.title')}</h2>", ">[Search] {t('search.title')}</h2>"),
    
    # Versions
    (">📸 {t('versions.title')}</h2>", ">[Versions] {t('versions.title')}</h2>"),
    
    # Toolbar preview
    ("className=\"format-btn-preview\">👁</button>", "className=\"format-btn-preview\">[Eye]</button>"),
    
    # Sidebar buttons
    (">👤 {t('sidebar.context')}</button>", ">[Ctx] {t('sidebar.context')}</button>"),
    (">📚 {t('sidebar.wiki')}</button>", ">[Wiki] {t('sidebar.wiki')}</button>"),
    (">🕸️ {t('sidebar.mindMap')}</button>", ">[Map] {t('sidebar.mindMap')}</button>"),
    (">📅 {t('sidebar.timeline')}</button>", ">[Time] {t('sidebar.timeline')}</button>"),
    (">📝 {t('sidebar.notes')}</button>", ">[Note] {t('sidebar.notes')}</button>"),
    (">🌍 {t('sidebar.world')}</button>", ">[World] {t('sidebar.world')}</button>"),
    (">📋 {t('sidebar.kanban')}</button>", ">[Board] {t('sidebar.kanban')}</button>"),
    
    # Welcome screen
    ("<h1>📖 Paddyngton</h1>", "<h1>Paddyngton</h1>"),
    (">📂 {t('welcome.openFolder')}</button>", ">[Open] {t('welcome.openFolder')}</button>"),
    (">📦 {t('welcome.importBear')}</button>", ">[Import] {t('welcome.importBear')}</button>"),
    (">🐻 {t('welcome.newBearBook')}</button>", ">[Bear] {t('welcome.newBearBook')}</button>"),
    
    # Save/export buttons
    ("💾 {t('context.save')}", "[Save] {t('context.save')}"),
    (">📄 DOCX</button>", ">[DOCX]</button>"),
    (">📑 PDF</button>", ">[PDF]</button>"),
    
    # Status bar
    ("{activeBook.isModified && <span className=\"modified-dot\">●</span>}", "{activeBook.isModified && <span className=\"modified-dot\">*</span>}"),
    
    # Relations in context editor
    ("👤 {rel.name}", "[C] {rel.name}"),
    (">+ Rel</button>", ">[+] Rel</button>"),
]

count = 0
for old, new in replacements:
    if old in content:
        content = content.replace(old, new)
        count += 1

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print(f'Total replacements: {count}')
