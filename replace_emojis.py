import re, os

# File path
filepath = r'C:\Users\annenskei\Documents\GitHub\Paddyngton\src\App.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# We'll need to add lucide-react imports and replace emojis
# But first, let's create a mapping of what to replace

# Emojis in App.tsx that need Lucide replacements:
# (emoji, lucide_name, replacement_string)
replacements = [
    # Toast icons (these are in conditional expressions)
    ("toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'", 
     "toast.type === 'success' ? <Check size={14} /> : toast.type === 'error' ? <X size={14} /> : <Info size={14} />"),
    
    # Context type icons
    ("'👤 ' + t('context.types.character')", "<User size={12} /> + ' ' + t('context.types.character')"),
    ("'📍 ' + t('context.types.place')", "<MapPin size={12} /> + ' ' + t('context.types.place')"),
    ("'📅 ' + t('context.types.date')", "<Calendar size={12} /> + ' ' + t('context.types.date')"),
    ("'📦 ' + t('context.types.item')", "<Package size={12} /> + ' ' + t('context.types.item')"),
    
    # Wiki/Context editor icons
    ("👤 {state.mindMapEditEntry.name}", "<User size={12} /> {state.mindMapEditEntry.name}"),  # careful, this might not exist
    
    # Settings book save
    ("💾 {t('settings.bookSave')}", "<Save size={14} /> {t('settings.bookSave')}"),
    
    # About panel
    ("<div className=\"about-logo\">📖</div>", "<div className=\"about-logo\"><BookOpen size={32} /></div>"),
    ("🎉 {t('about.updateAvailable')", "<Sparkles size={14} /> {t('about.updateAvailable')"),
    ("✓ {t('about.upToDate')}", "<Check size={14} /> {t('about.upToDate')}"),
    ("🔄 {t('about.updateNow')}", "<Download size={14} /> {t('about.updateNow')}"),
    
    # Context editor header
    (">📚 Wiki</button>", "><Book size={14} /> Wiki</button>"),
    (">🕸️ Map</button>", "><Globe size={14} /> Map</button>"),
    
    # Context type options
    ("<option value=\"character\">👤 {t('context.types.character')}</option>", "<option value=\"character\"><User size={12} /> {t('context.types.character')}</option>"),
    ("<option value=\"place\">📍 {t('context.types.place')}</option>", "<option value=\"place\"><MapPin size={12} /> {t('context.types.place')}</option>"),
    ("<option value=\"date\">📅 {t('context.types.date')}</option>", "<option value=\"date\"><Calendar size={12} /> {t('context.types.date')}</option>"),
    ("<option value=\"item\">📦 {t('context.types.item')}</option>", "<option value=\"item\"><Package size={12} /> {t('context.types.item')}</option>"),
    
    # Context template selector
    ("type === 'character' ? '👤' : type === 'place' ? '📍' : type === 'date' ? '📅' : '📦'",
     "type === 'character' ? <User size={24} /> : type === 'place' ? <MapPin size={24} /> : type === 'date' ? <Calendar size={24} /> : <Package size={24} />"),
    
    # Wiki sidebar items
    ("<span>{item.type === 'character' ? '👤' : item.type === 'place' ? '📍' : item.type === 'date' ? '📅' : '📦'}</span>",
     "<span>{item.type === 'character' ? <User size={12} /> : item.type === 'place' ? <MapPin size={12} /> : item.type === 'date' ? <Calendar size={12} /> : <Package size={12} />}</span>"),
    
    # Wiki entry header icon
    ("{state.wikiSelected.type === 'character' ? '👤' : state.wikiSelected.type === 'place' ? '📍' : state.wikiSelected.type === 'date' ? '📅' : '📦'}",
     "{state.wikiSelected.type === 'character' ? <User size={16} /> : state.wikiSelected.type === 'place' ? <MapPin size={16} /> : state.wikiSelected.type === 'date' ? <Calendar size={16} /> : <Package size={16} />}"),
    
    # Wiki edit/view toggle
    ("{state.wikiEditMode ? '👁 ' + t('context.view') : '✏️ ' + t('context.edit')}",
     "{state.wikiEditMode ? <Eye size={14} /> + ' ' + t('context.view') : <Pencil size={14} /> + ' ' + t('context.edit')}"),
    
    # Wiki relation type icon
    ("{relEntry?.type === 'character' ? '👤' : relEntry?.type === 'place' ? '📍' : '📦'}",
     "{relEntry?.type === 'character' ? <User size={12} /> : relEntry?.type === 'place' ? <MapPin size={12} /> : <Package size={12} />}"),
    
    # Wiki relation options
    ("<option value=\"ally\">🤝 {t('relations.friendly')}</option>", "<option value=\"ally\"><Handshake size={12} /> {t('relations.friendly')}</option>"),
    ("<option value=\"family\">👨‍👩‍👧 {t('relations.family')}</option>", "<option value=\"family\"><Users size={12} /> {t('relations.family')}</option>"),
    ("<option value=\"romantic\">❤️ {t('relations.romantic')}</option>", "<option value=\"romantic\"><Heart size={12} /> {t('relations.romantic')}</option>"),
    ("<option value=\"neutral\">➖ {t('relations.neutral')}</option>", "<option value=\"neutral\"><Minus size={12} /> {t('relations.neutral')}</option>"),
    ("<option value=\"rival\">⚔️ {t('relations.rival')}</option>", "<option value=\"rival\"><Swords size={12} /> {t('relations.rival')}</option>"),
    ("<option value=\"enemy\">💀 {t('relations.hostile')}</option>", "<option value=\"enemy\"><Skull size={12} /> {t('relations.hostile')}</option>"),
    
    # Wiki events
    ("<span style={{ fontSize: '11px', fontWeight: 600 }}>{ev.type === 'timeline' ? '📅' : '🌍'}</span>",
     "<span style={{ fontSize: '11px', fontWeight: 600 }}>{ev.type === 'timeline' ? <Calendar size={12} /> : <Globe size={12} />}</span>"),
    
    # Wiki cross-refs
    ("👤 {e.name}", "<User size={12} /> {e.name}"),
    
    # Wiki open mind map
    (">🕸️ {t('wiki.openMindMap')}</button>", "><Globe size={14} /> {t('wiki.openMindMap')}</button>"),
    
    # Mind map title
    (">🕸️ {t('mindmap.title')}</h2>", "><Globe size={16} /> {t('mindmap.title')}</h2>"),
    
    # Mind map add character
    (">➕ {t('mindmap.addCharacter')}</button>", "><Plus size={14} /> {t('mindmap.addCharacter')}</button>"),
    
    # Notes title
    (">📝 {t('notes.title')}</h2>", "><FileText size={16} /> {t('notes.title')}</h2>"),
    (">➕ {t('notes.addNote')}</button>", "><Plus size={14} /> {t('notes.addNote')}</button>"),
    
    # World title
    (">🌍 {t('world.title')}</h2>", "><Globe size={16} /> {t('world.title')}</h2>"),
    (">➕ {t('world.addEntry')}</button>", "><Plus size={14} /> {t('world.addEntry')}</button>"),
    
    # Kanban title
    (">📋 {t('kanban.title')}</h2>", "><Layout size={16} /> {t('kanban.title')}</h2>"),
    (">➕ {t('kanban.addColumn')}</button>", "><Plus size={14} /> {t('kanban.addColumn')}</button>"),
    (">✏️</button>", "><Pencil size={12} /></button>"),
    (">🗑️</button>", "><Trash2 size={12} /></button>"),
    (">➕ {t('kanban.addCard')}</button>", "><Plus size={14} /> {t('kanban.addCard')}</button>"),
    
    # Book dialog
    ("<h2>📖 {t('bookDialog.open')}</h2>", "<h2><BookOpen size={20} /> {t('bookDialog.open')}</h2>"),
    ("<h2>💾 {t('bookDialog.save')}</h2>", "<h2><Save size={20} /> {t('bookDialog.save')}</h2>"),
    
    # Search
    (">🔍 {t('search.title')}</h2>", "><Search size={16} /> {t('search.title')}</h2>"),
    
    # Versions
    (">📸 {t('versions.title')}</h2>", "><Camera size={16} /> {t('versions.title')}</h2>"),
    
    # Toolbar
    ("className=\"format-btn-preview\">👁</button>", "className=\"format-btn-preview\"><Eye size={14} /></button>"),
    
    # Command palette
    ("<div className=\"command-icon\">{cmd.name[0]}</div>", "<div className=\"command-icon\"><Terminal size={14} /></div>"),
    
    # Status bar
    ("{THEME_ICONS[settings.theme]} {THEME_LABELS[settings.theme]}", "{THEME_ICONS[settings.theme]} {THEME_LABELS[settings.theme]}"),  # keep for now, handle separately
    
    # Sidebar context buttons
    (">👤 {t('sidebar.context')}</button>", "><Users size={14} /> {t('sidebar.context')}</button>"),
    (">📚 {t('sidebar.wiki')}</button>", "><Book size={14} /> {t('sidebar.wiki')}</button>"),
    (">🕸️ {t('sidebar.mindMap')}</button>", "><Globe size={14} /> {t('sidebar.mindMap')}</button>"),
    (">📅 {t('sidebar.timeline')}</button>", "><Calendar size={14} /> {t('sidebar.timeline')}</button>"),
    (">📝 {t('sidebar.notes')}</button>", "><FileText size={14} /> {t('sidebar.notes')}</button>"),
    (">🌍 {t('sidebar.world')}</button>", "><Globe size={14} /> {t('sidebar.world')}</button>"),
    (">📋 {t('sidebar.kanban')}</button>", "><Layout size={14} /> {t('sidebar.kanban')}</button>"),
    
    # Welcome screen
    ("<h1>📖 Paddyngton</h1>", "<h1><BookOpen size={32} /> Paddyngton</h1>"),
    (">📂 {t('welcome.openFolder')}</button>", "><FolderOpen size={14} /> {t('welcome.openFolder')}</button>"),
    (">📦 {t('welcome.importBear')}</button>", "><Package size={14} /> {t('welcome.importBear')}</button>"),
    (">🐻 {t('welcome.newBearBook')}</button>", "><PawPrint size={14} /> {t('welcome.newBearBook')}</button>"),
]

# Actually, doing string replacements for all of these is error-prone.
# Let me do the simpler ones first and handle the rest carefully.

# First, let's add the lucide-react import
old_import = "import { useTranslation } from './i18n'"
new_import = """import { useTranslation } from './i18n'
import {
  BookOpen, Book, Save, Check, X, Info, Sparkles, Download,
  User, MapPin, Calendar, Package, Globe, Eye, Pencil,
  Heart, Minus, Swords, Skull, Handshake, Users, Plus,
  Trash2, FileText, Layout, Search, Camera, FolderOpen,
  PawPrint, Terminal,
} from 'lucide-react'"""

# Only add if not already present
if 'lucide-react' not in content:
    content = content.replace(old_import, new_import)
    print('Added lucide-react import')

# Replace toast icons
content = content.replace(
    "toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'",
    "toast.type === 'success' ? <Check size={14} /> : toast.type === 'error' ? <X size={14} /> : <Info size={14} />"
)
print('Replaced toast icons')

# Replace about panel
content = content.replace(
    '<div className="about-logo">📖</div>',
    '<div className="about-logo"><BookOpen size={32} /></div>'
)
content = content.replace(
    "🎉 {t('about.updateAvailable')",
    "<Sparkles size={14} /> {t('about.updateAvailable')"
)
content = content.replace(
    "✓ {t('about.upToDate')}",
    "<Check size={14} /> {t('about.upToDate')}>"
)
# Fix the extra > I added
content = content.replace(
    "<Check size={14} /> {t('about.upToDate')}>",
    "<Check size={14} /> {t('about.upToDate')}"
)
content = content.replace(
    "🔄 {t('about.updateNow')}",
    "<Download size={14} /> {t('about.updateNow')}"
)
print('Replaced about panel icons')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print('Done with basic replacements')
