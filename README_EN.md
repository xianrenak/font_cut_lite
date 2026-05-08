# FontCutLite

English | [Simplified Chinese](README.md)

FontCutLite is a local HTML5 bitmap font slicing tool. It converts fixed-grid bitmap font images into AngelCode `.fnt` or XML descriptor files for workflows in Godot and other game engines.

[![GitHub license](https://img.shields.io/github/license/xianrenak/font_cut_lite)](https://github.com/xianrenak/font_cut_lite/blob/main/LICENSE)

![FontCutLite screenshot](docs/images/font-cut-lite-screenshot.png)

## Use Cases

In game development, TTF vector fonts are not always the right fit for every UI style, especially for icon fonts, decorative lettering, pixel fonts, and AI-generated special character assets. FontCutLite focuses on the conversion step from an existing bitmap font image to an engine-readable font descriptor.

You can generate a fixed-grid character image with an AI image tool, pixel editor, or design app, then use FontCutLite to configure character size, padding, and glyph text before exporting a `.fnt` or XML file.

## Features

- Runs fully in the local browser with no asset uploads.
- Loads fixed-grid bitmap font images.
- Supports custom character width, character height, and four-direction padding.
- Supports custom glyph lists, including CJK characters, emoji, and icon glyphs.
- Previews individual glyph slices.
- Provides a text preview for checking overall layout.
- Exports AngelCode `.fnt` text format.
- Exports XML format.
- Saves editor state automatically so work can continue after refreshing the page.

## Running Locally

There is no build step. You can open `index.html` directly:

```sh
open index.html
```

If browser local-file restrictions affect image loading, start a local static server:

```sh
python3 -m http.server 8000
```

Then visit:

```text
http://localhost:8000/
```

You can also auto-load a specific image through a URL parameter:

```text
http://localhost:8000/?image=tests/assets/comic_font_img.png
```

To clear saved browser editor state before loading a test image, add `reset=1`:

```text
http://localhost:8000/?reset=1&image=tests/assets/comic_font_img.png
```

## Workflow

1. Prepare a bitmap font image arranged on a fixed grid.
2. Open FontCutLite and click `Open an image` to import the image.
3. Set character width, character height, and padding in `Font Settings`.
4. Enter the matching glyph list in `List of glyphs`.
5. Switch to `Preview` to check each glyph slice.
6. Use the text preview panel to inspect practical text layout.
7. Switch to `Output` and copy the generated `.fnt` or XML content.

## Godot Integration

1. Create a `.fnt` file in your Godot project.
2. Copy the generated `.fnt` content from FontCutLite into that file.
3. Put the bitmap font image and the `.fnt` file in the same directory.
4. Make sure the image filename matches the `page file` field in the `.fnt` file.
5. If you update the image or descriptor file, reimport the asset in Godot.

## Image Asset Tips

- Characters should be arranged on a fixed-width and fixed-height grid.
- Each cell should contain one character or icon.
- Effects such as outline, shadow, glow, or bold should be pre-rendered into the image.
- If the target engine has limited support for colored bitmap fonts, test with a small glyph set first.
- Transparent backgrounds are supported. If you use a solid-color background, confirm the import settings in the target engine.

## Automatic Kerning

FontCutLite generates conservative kerning pairs based on the current average `xadvance`. The rules are:

```text
strong = -round(avg_xadvance * 0.14)
medium = -round(avg_xadvance * 0.10)
light  = -round(avg_xadvance * 0.06)
```

Only pairs whose characters exist in the current glyph list are written to the export output.

## Test Asset

The repository includes a sample bitmap font image:

```text
tests/assets/comic_font_img.png
```

Suggested settings:

```text
Char Width: 160
Char Height: 196
```

Paste the following content into `List of glyphs` for testing. The number row includes a trailing space character:

```text
ABCDEFGHIJKLM
NOPQRSTUVWXYZ
abcdefghijklm
nopqrstuvwxyz
0123456789 
!@#$%^&*()?
+-=_|/\<>~
[]{};:'"`,.
⚔️🗡️🏹🛡️🪄🎯💥💀▲▼◀▶↑↓←→
```

## Known Limitations

- Does not dynamically generate bold, italic, outline, or shadow effects.
- Does not automatically detect character bounds in non-grid images.
- The `.fnt` format has limited complex text layout support and is not a replacement for a full text shaping system.
- Colored images may be affected by font materials or transparency handling in some engines, so test in the target engine.

## Project Structure

```text
.
├── index.html          # App entry point
├── js/fontcutter.js    # Main logic, preview, and export generation
├── css/custom.css      # Local styles
├── js/                 # Vendored browser libraries
├── css/                # Bootstrap styles
└── fonts/              # Bootstrap font assets
```

## Links

- Original project: based on FontCutter
- Godot: <https://godotengine.org/>

Developed by [xianrenak](https://github.com/xianrenak).
Follow [X/Twitter](https://x.com/xianrenak) for Godot development and AI workflow notes.
