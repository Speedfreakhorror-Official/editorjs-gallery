# editorjs-gallery

A gallery block for Editor.js: several pictures at once, reorder, remove, required alt text.

## Install

```
npm i github:Speedfreakhorror-Official/editorjs-gallery
```

Import the tool and its stylesheet:

```ts
import GalleryTool from 'editorjs-gallery';
import 'editorjs-gallery/style.css';
```

## Usage

```ts
new EditorJS({ tools: { gallery: { class: GalleryTool, config: { uploader, max: 24 } } } });
```

The stylesheet reads these CSS variables, with light and dark defaults on `:root`; override them on any parent element:
`--ejs-ink`, `--ejs-muted`, `--ejs-line`, `--ejs-surface`, `--ejs-accent`, `--ejs-danger`.

## Data

```json
{ "images": [ { "url": "...", "width": 800, "height": 600, "alt": "..." } ] }
```

`max` caps the number of pictures.

`ImageConfig` (all optional, passed as the tool's `config`):

- `uploader(file)` resolves `{ url, width, height }` or `{ error }`; without it there is no upload button.
- `sources` adds buttons that pick a picture some other way: `{ label, pick() }`.
- `actions` adds buttons shown for a picture: `{ label, show(img), run(img) }`.

Every picture needs a description (`alt`): `isValid` checks it and everything else the block needs. `validate` refuses only an empty block, so Editor.js never drops a half-made one from a save; check `isValid` before you publish. Extra fields on a picture object are kept.

The module also exports a pure `normalize(data)` that fills defaults and drops unknown top-level keys.

## Credits

Built as part of [PrintCut](https://printcut.app), a browser studio for designing laser-cut boxes, puzzles, keychains and signs from templates. Made and owned by [ibrahim-jaber.com](https://ibrahim-jaber.com).
