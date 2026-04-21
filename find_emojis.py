import re, os, json

# Known emojis to check
known_emojis = [
    '📖', '🎉', '✓', '✕', 'ℹ', '🔄', '👤', '📍', '📅', '📦',
    '🗑️', '💾', '🤝', '👨‍👩‍👧', '❤️', '➖', '⚔️', '💀', '🕸️',
    '📚', '✏️', '👁', '🌍', '📝', '📋', '💬', '🔍', '➕', '▶️', '🔧'
]

# Unicode emoji pattern
emoji_pattern = re.compile(
    '[\U0001F600-\U0001F64F\U0001F300-\U0001F5FF\U0001F680-\U0001F6FF\U0001F1E0-\U0001F1FF\U00002702-\U000027B0\U000024C2-\U0001F251\U0001F900-\U0001F9FF\U0001FA00-\U0001FA6F\U00002600-\U000026FF\U00002700-\U000027BF]+'
)

files_to_check = []
for root, dirs, files in os.walk('src'):
    for f in files:
        if f.endswith(('.tsx', '.ts', '.json')):
            files_to_check.append(os.path.join(root, f))

all_emojis = {}
for filepath in files_to_check:
    with open(filepath, 'r', encoding='utf-8') as file:
        content = file.read()
    
    found = set()
    for emoji in known_emojis:
        if emoji in content:
            found.add(emoji)
    
    for match in emoji_pattern.finditer(content):
        found.add(match.group())
    
    if found:
        all_emojis[filepath] = sorted(found)

with open('emoji_report.json', 'w', encoding='utf-8') as f:
    json.dump(all_emojis, f, ensure_ascii=False, indent=2)

print(f'Found emojis in {len(all_emojis)} files')
for filepath, emojis in sorted(all_emojis.items()):
    print(f'{filepath}: {len(emojis)} emojis')
