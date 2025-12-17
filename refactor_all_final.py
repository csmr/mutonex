
import re
import os

file_path = 'res/docs/project/design-doc-html/Design-Doc.html'

with open(file_path, 'r', encoding='utf-8') as f:
    html = f.read()

# --- 1. Fix Cover Page ---
cover_para_match = re.search(r'<p[^>]*style="[^"]*page-break-before: always[^"]*"[^>]*>[\s\S]*?</p>', html)
if cover_para_match:
    cover_para_html = cover_para_match.group(0)
    base64_match = re.search(r'url\("data:image/jpeg;base64,[^"]*"\)', cover_para_html)
    if base64_match:
        base64_url = base64_match.group(0)
        new_cover_html = f'''
<style>
#cover {{
    background-image: {base64_url};
    background-size: cover;
    background-position: left;
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    text-align: center;
    max-width: 1024px;
}}
#cover h1 {{
    color: white;
    font-size: 48pt;
    font-family: "Gentium Book Basic", serif;
    text-shadow: 2px 2px 8px #000;
}}
</style>
<div id="cover">
    <h1>Mutonex Design Document</h1>
</div>
'''
        html = html.replace(cover_para_html, new_cover_html)

# --- 2. Standardize Feature Cards ---
feature_card_regex = re.compile(r'<table[^>]*cellpadding="8"[^>]*>[\s\S]*?<\/table>')
matches = feature_card_regex.finditer(html)
for match in matches:
    table_html = match.group(0)
    new_table_html = re.sub(r'width="\d+"', 'width="540"', table_html)
    # Apply vertical-align to the td, not the p
    new_table_html = new_table_html.replace('<td ', '<td style="vertical-align: middle;" ')
    html = html.replace(table_html, new_table_html)

# --- 3. Format Illustration Images ---
style_addition = "<style>img { max-width: 1024px; }</style>"
html = html.replace('</head>', style_addition + '</head>')

# --- 4. Normalize Font Sizes ---
style_regex = re.compile(r'<style type="text/css">[\s\S]*?<\/style>')
style_block_match = style_regex.search(html)
if style_block_match:
    style_block = style_block_match.group(0)
    # More targeted font size normalization
    new_style_block = style_block.replace('p.western { font-family: "Gentium Book Basic"; font-size: 16pt }', 'p.western { font-family: "Gentium Book Basic"; font-size: 16pt } body { font-size: 16pt; }')
    html = html.replace(style_block, new_style_block)

# --- 5. Style UTF Character Illustrations ---
utf_chars = ["⭜⅋⬬", "🎛👈", "🚀🌏", "🧝🐣", "🚧🏗️", "🙋🎭"]
style_addition = """
<style>
    .utf-illustration {{
        border: 1px solid black;
        padding: 10px;
        font-size: 256px;
        display: inline-block;
    }}
</style>
"""
html = html.replace('</head>', style_addition + '</head>')
for char in utf_chars:
    html = html.replace(char, f'<span class="utf-illustration">{char}</span>')

# --- 6. Adjust Whitespace ---
html = re.sub(r'<p class="western"><br/>\s*<br/>\s*</p>', '', html)
html = re.sub(r'<p class="perustyyli-western"><br/>\s*<br/>\s*</p>', '', html)
html = re.sub(r'<p class="western" align="left" style="line-height: 100%; margin-bottom: 0mm; page-break-before: auto">\s*<br/>\s*</p>', '', html)


with open(file_path, 'w', encoding='utf-8') as f:
    f.write(html)

print("Successfully applied all refactoring changes.")
