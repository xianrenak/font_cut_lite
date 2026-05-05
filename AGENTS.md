# Repository Guidelines

## Project Structure & Module Organization

FontCutter is a static HTML5 tool for generating AngelCode bitmap font descriptors from an existing bitmap sheet. The entry point is `index.html`. Application logic lives in `js/fontcutter.js`, which defines the AngularJS module, canvas rendering, preview generation, and FNT/XML output generation. Third-party browser libraries are vendored in `js/` (`jquery`, `bootstrap`, `bootstrap-filestyle`) and `css/` (`bootstrap`). Local styling is in `css/custom.css`. Bootstrap glyph font assets are in `fonts/`. There is currently no dedicated `test/` directory or package manifest.

## Build, Test, and Development Commands

This repository has no build step. Open `index.html` directly in a browser for normal use:

```sh
open index.html
```

If browser security settings interfere with file loading, serve the directory locally:

```sh
python3 -m http.server 8000
```

Then visit `http://localhost:8000/`. Use manual browser testing after changes: load a bitmap font image, adjust character dimensions and padding, check the Preview tab, and verify both FNT and XML output.

## Coding Style & Naming Conventions

Keep changes compatible with the existing legacy stack: plain HTML, CSS, JavaScript, AngularJS 1.x, jQuery, and Bootstrap 3. Use two-space indentation in `js/fontcutter.js` and keep semicolon usage consistent with nearby code. Prefer clear camelCase names for JavaScript variables and functions, such as `generateOutput` and `refreshCanvas`. Use lowercase or hyphenated IDs/classes in HTML and CSS, such as `canvas-container` and `preview-canvas`.

Avoid introducing package managers, transpilers, or new frameworks unless the change explicitly requires modernization.

## Testing Guidelines

No automated test framework is configured. For behavioral changes, document the manual test path in your PR or handoff notes. At minimum, verify image loading, grid drawing, preview canvases, and descriptor output. When changing output generation, compare representative generated FNT/XML text before and after the change.

## Commit & Pull Request Guidelines

This checkout does not include Git history, so no project-specific commit convention can be inferred. Use short, imperative commit messages, for example `Fix XML padding order` or `Update preview canvas sizing`. Pull requests should include a focused description, manual test steps, affected browser(s), and screenshots when UI layout or preview behavior changes.

## Agent-Specific Instructions

Keep edits narrowly scoped. Do not reformat vendored Bootstrap, jQuery, or font assets. Treat `js/fontcutter.js`, `index.html`, and `css/custom.css` as the primary editable files unless a requested change clearly touches assets.
