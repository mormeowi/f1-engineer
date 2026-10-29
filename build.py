#!/usr/bin/env python3
"""Builds a single self-contained HTML file (dist/f1-engineer.html) from index.html, css/ and js/.

Usage:  python3 build.py
The single file can be opened by double click, e-mailed or hosted anywhere.
"""
import os, re

root = os.path.dirname(os.path.abspath(__file__))
read = lambda p: open(os.path.join(root, p), encoding='utf-8').read()

html = read('index.html')

# inline the stylesheet
html = re.sub(r'<link rel="stylesheet" href="([^"]+)">',
              lambda m: '<style>\n' + read(m.group(1)) + '</style>', html)

# inline all scripts in the order they appear in index.html
scripts = re.findall(r'<script src="([^"]+)"></script>', html)
code = '\n'.join(read(s) for s in scripts)
html = re.sub(r'\s*<script src="[^"]+"></script>', '', html)
html = html.replace('</body>', '<script>\n' + code + '</script>\n</body>')

os.makedirs(os.path.join(root, 'dist'), exist_ok=True)
out = os.path.join(root, 'dist', 'f1-engineer.html')
open(out, 'w', encoding='utf-8').write(html)
print('written', out, len(html), 'bytes')
