# -*- coding: utf-8 -*-
with open("scripts/start.js", "r", encoding="utf-8") as f:
    data = f.read()

# Fix 1: Add R key handling in askPrompt
old1 = "} else if (key === 'q' || key === '\\x03') {"
new1 = "} else if (key === 'r') { cleanup(); write('\\n' + CY + '  R 键重启...' + R + '\\n'); } else if (key === 'q' || key === '\\x03') {"
data = data.replace(old1, new1)

# Fix 2: Update prompt text
old2 = "WT + 'Enter   ' + D + '重启服务' + R,"
new2 = "WT + 'Enter/R ' + D + '重启服务' + R,"
data = data.replace(old2, new2)

with open("scripts/start.js", "w", encoding="utf-8") as f:
    f.write(data)
print("OK")
