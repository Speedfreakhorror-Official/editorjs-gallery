// editorjs-gallery: a gallery block for Editor.js (several pictures, reorder, remove, required alt text).
import type { API, BlockTool, BlockToolConstructorOptions } from '@editorjs/editorjs';
import { el, imageField, isError, normalizeImage, type ImageConfig, type ToolImage } from './image';

export type { ImageConfig, ToolImage } from './image';
export interface GalleryData { images: ToolImage[] }
export interface GalleryConfig extends ImageConfig { max?: number }

/** Fills defaults and drops unknown top-level keys; keeps order and image extras; caps at `max` when given. */
export function normalize(data: unknown, max?: number): GalleryData {
  const o = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  const images = (Array.isArray(o.images) ? o.images : []).map(normalizeImage).filter((i): i is ToolImage => !!i);
  return { images: max !== undefined ? images.slice(0, max) : images };
}

/** True when there is at least one picture and every picture has a description. */
export const isValid = (d: GalleryData) => d.images.length > 0 && d.images.every((i) => i.alt.trim() !== '');
/** True when there are no pictures (the only block `validate` refuses). */
export const isEmpty = (d: GalleryData) => d.images.length === 0;

export default class GalleryTool implements BlockTool {
  private data: GalleryData;
  private root = el('div', 'ejs-gallery');
  private msg = '';
  constructor(private opts: BlockToolConstructorOptions<GalleryData, GalleryConfig>) {
    this.data = normalize(opts.data, opts.config?.max);
  }
  static get toolbox() {
    return { title: 'Gallery', icon: '<svg width="17" height="15" viewBox="0 0 17 15"><rect x="1" y="1" width="7" height="6" rx="1" fill="currentColor"/><rect x="9" y="1" width="7" height="6" rx="1" fill="currentColor"/><rect x="1" y="8" width="7" height="6" rx="1" fill="currentColor"/><rect x="9" y="8" width="7" height="6" rx="1" fill="currentColor"/></svg>' };
  }
  static get isReadOnlySupported() { return true; }

  render(): HTMLElement {
    // typing in an input changes no DOM node, so Editor.js is told
    this.root.addEventListener('input', () => this.opts.block.dispatchChange());
    this.draw();
    return this.root;
  }
  save(): GalleryData { return this.data; }
  // Editor.js drops a block that fails validate from the save: only an empty one, so a half-made one reaches the host
  validate(data: GalleryData) { return !isEmpty(normalize(data)); }

  private get config(): GalleryConfig { return this.opts.config ?? {}; }
  private get readOnly() { return (this.opts.api as API).readOnly.isEnabled; }
  private room() { const m = this.config.max; return m === undefined ? Infinity : m - this.data.images.length; }
  private full() { return `A gallery holds at most ${this.config.max} pictures.`; }

  private move(i: number, by: number) {
    const a = this.data.images, j = i + by;
    if (j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j], a[i]];
    this.draw();
  }

  private draw() {
    const { images } = this.data;
    this.root.replaceChildren();
    const grid = el('div', 'ejs-gallery-grid');
    images.forEach((img, i) => {
      const item = el('div', 'ejs-gallery-item');
      item.append(imageField({
        value: img, config: { uploader: this.config.uploader, actions: this.config.actions }, api: this.opts.api as API,
        // the field's Remove clears the picture: take that item out of the gallery
        onChange: (v) => { if (v) images[i] = v; else { images.splice(i, 1); this.draw(); } },
      }));
      if (!this.readOnly) {
        const bar = el('div', 'ejs-gallery-move');
        for (const [label, by] of [['Move left', -1], ['Move right', 1]] as const) {
          const b = el('button', 'ejs-gallery-btn', label);
          b.type = 'button';
          b.disabled = i + by < 0 || i + by >= images.length;
          b.onclick = () => this.move(i, by);
          bar.append(b);
        }
        item.append(bar);
      }
      grid.append(item);
    });
    this.root.append(grid);
    if (!this.readOnly) this.root.append(this.addBar());
  }

  private addBar() {
    const bar = el('div', 'ejs-gallery-bar');
    const note = el('div', 'ejs-gallery-error', this.msg);
    note.setAttribute('role', 'alert');
    const { uploader, sources, max } = this.config;
    const fail = (e: unknown) => { this.msg = e instanceof Error ? e.message : 'Something went wrong.'; };
    if (uploader) {
      const file = el('input', 'ejs-gallery-file');
      file.type = 'file';
      file.accept = 'image/*';
      file.multiple = true;
      file.hidden = true;
      const btn = el('button', 'ejs-gallery-btn', 'Add pictures');
      btn.type = 'button';
      btn.disabled = this.room() <= 0;
      btn.onclick = () => file.click();
      file.onchange = async () => {
        const files = [...(file.files ?? [])];
        file.value = '';
        btn.disabled = true;
        this.msg = '';
        try {
          for (const f of files.slice(0, Math.max(0, this.room()))) {
            const r = await uploader(f);
            if (isError(r)) { this.msg = r.error; break; }
            this.data.images.push({ ...r, alt: '' });
          }
          if (!this.msg && max !== undefined && files.length > 0 && this.room() <= 0) this.msg = this.full();
        } catch (e) { fail(e); }
        this.draw();
      };
      bar.append(file, btn);
    }
    for (const s of sources ?? []) {
      const b = el('button', 'ejs-gallery-btn', s.label);
      b.type = 'button';
      b.disabled = this.room() <= 0;
      b.onclick = async () => {
        this.msg = '';
        try { const r = await s.pick(); if (r) this.data.images.push({ ...r, alt: r.alt ?? '' }); } catch (e) { fail(e); }
        this.draw();
      };
      bar.append(b);
    }
    if (!this.msg && this.room() <= 0) note.textContent = this.full();
    const wrap = el('div', 'ejs-gallery-add');
    wrap.append(bar, note);
    return wrap;
  }
}
