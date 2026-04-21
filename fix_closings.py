import re

filepath = r'C:\Users\annenskei\Documents\GitHub\Paddyngton\src\App.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix specific closing brace issues
# Pattern: }}) followed by newline and }} ) -> should be }}}) and }}})
content = content.replace('                                  }})\n                                }} )', '                                  }})\n                                }} )')

# Let me use a more targeted approach - find all lines ending with }} ) that come after setUI({ inputDialog:
lines = content.split('\n')
fixed_lines = []
for i, line in enumerate(lines):
    stripped = line.strip()
    if stripped.endswith('}} )') and 'setUI' not in stripped:
        # Count spaces before }}
        spaces = len(line) - len(line.lstrip())
        fixed_lines.append(' ' * spaces + '}}})')
    elif stripped == '}})' and i > 0 and 'setUI({ inputDialog:' in lines[i-1]:
        # Inner setUI closing on same line as previous open
        spaces = len(line) - len(line.lstrip())
        fixed_lines.append(' ' * spaces + '}}})')
    else:
        fixed_lines.append(line)

content = '\n'.join(fixed_lines)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed remaining closings')
