// src/image.ts
var P = "ejs-gallery";
var isError = (r) => typeof r.error === "string";
function normalizeImage(v) {
  if (!v || typeof v !== "object" || Array.isArray(v))
    return null;
  const o = v;
  if (typeof o.url !== "string" || !o.url || typeof o.width !== "number" || typeof o.height !== "number")
    return null;
  return { ...o, url: o.url, width: o.width, height: o.height, alt: typeof o.alt === "string" ? o.alt : "" };
}
function el(tag, cls, text) {
  const e = document.createElement(tag);
  e.className = cls;
  if (text !== undefined)
    e.textContent = text;
  return e;
}
function imageField(opts) {
  const { config, api, onChange } = opts;
  let img = opts.value;
  const root = el("div", `${P}-field`);
  const note = el("div", `${P}-error`);
  note.setAttribute("role", "alert");
  const fail = (m) => {
    note.textContent = m;
  };
  const set = (v) => {
    img = v;
    onChange(v);
    draw();
  };
  const run = async (btn, job) => {
    btn.disabled = true;
    try {
      await job();
    } catch (e) {
      fail(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      btn.disabled = false;
    }
  };
  const button = (label, onClick) => {
    const b = el("button", `${P}-btn`, label);
    b.type = "button";
    b.onclick = () => onClick(b);
    return b;
  };
  function draw() {
    root.replaceChildren();
    if (img) {
      const pic = el("img", `${P}-img`);
      pic.src = img.url;
      pic.alt = img.alt;
      root.append(pic);
    } else
      root.append(el("div", `${P}-empty`, "No picture yet"));
    const bar = el("div", `${P}-bar`);
    if (!api.readOnly.isEnabled) {
      if (config.uploader) {
        const up = config.uploader;
        const file = el("input", `${P}-file`);
        file.type = "file";
        file.accept = "image/*";
        file.hidden = true;
        file.onchange = () => {
          const f = file.files?.[0];
          file.value = "";
          if (f)
            run(pick, async () => {
              const r = await up(f);
              if (isError(r))
                return fail(r.error);
              set({ ...r, alt: img?.alt ?? "" });
            });
        };
        const pick = button(img ? "Replace picture" : "Upload picture", () => file.click());
        bar.append(file, pick);
      }
      for (const s of config.sources ?? []) {
        bar.append(button(s.label, (b) => void run(b, async () => {
          const r = await s.pick();
          if (r)
            set({ ...r, alt: r.alt ?? img?.alt ?? "" });
        })));
      }
      if (img) {
        for (const a of config.actions ?? []) {
          if (!a.show(img))
            continue;
          bar.append(button(a.label, (b) => void run(b, async () => {
            const r = await a.run(img);
            if (isError(r))
              return fail(r.error);
            set(r);
          })));
        }
        bar.append(button("Remove", () => set(null)));
      }
    }
    root.append(bar);
    if (img) {
      const label = el("label", `${P}-label`, "Description (alt text, required)");
      const alt = el("input", `${P}-input`);
      alt.type = "text";
      alt.value = img.alt;
      alt.required = true;
      alt.disabled = api.readOnly.isEnabled;
      alt.setAttribute("aria-invalid", String(!img.alt.trim()));
      alt.oninput = () => {
        img = { ...img, alt: alt.value };
        alt.setAttribute("aria-invalid", String(!alt.value.trim()));
        onChange(img);
      };
      label.append(alt);
      root.append(label);
    }
    root.append(note);
  }
  draw();
  return root;
}

// src/index.ts
function normalize(data, max) {
  const o = data && typeof data === "object" ? data : {};
  const images = (Array.isArray(o.images) ? o.images : []).map(normalizeImage).filter((i) => !!i);
  return { images: max !== undefined ? images.slice(0, max) : images };
}
var isValid = (d) => d.images.length > 0 && d.images.every((i) => i.alt.trim() !== "");
var isEmpty = (d) => d.images.length === 0;

class GalleryTool {
  opts;
  data;
  root = el("div", "ejs-gallery");
  msg = "";
  constructor(opts) {
    this.opts = opts;
    this.data = normalize(opts.data, opts.config?.max);
  }
  static get toolbox() {
    return { title: "Gallery", icon: '<svg width="17" height="15" viewBox="0 0 17 15"><rect x="1" y="1" width="7" height="6" rx="1" fill="currentColor"/><rect x="9" y="1" width="7" height="6" rx="1" fill="currentColor"/><rect x="1" y="8" width="7" height="6" rx="1" fill="currentColor"/><rect x="9" y="8" width="7" height="6" rx="1" fill="currentColor"/></svg>' };
  }
  static get isReadOnlySupported() {
    return true;
  }
  render() {
    this.root.addEventListener("input", () => this.opts.block.dispatchChange());
    this.draw();
    return this.root;
  }
  save() {
    return this.data;
  }
  validate(data) {
    return !isEmpty(normalize(data));
  }
  get config() {
    return this.opts.config ?? {};
  }
  get readOnly() {
    return this.opts.api.readOnly.isEnabled;
  }
  room() {
    const m = this.config.max;
    return m === undefined ? Infinity : m - this.data.images.length;
  }
  full() {
    return `A gallery holds at most ${this.config.max} pictures.`;
  }
  move(i, by) {
    const a = this.data.images, j = i + by;
    if (j < 0 || j >= a.length)
      return;
    [a[i], a[j]] = [a[j], a[i]];
    this.draw();
  }
  draw() {
    const { images } = this.data;
    this.root.replaceChildren();
    const grid = el("div", "ejs-gallery-grid");
    images.forEach((img, i) => {
      const item = el("div", "ejs-gallery-item");
      item.append(imageField({
        value: img,
        config: { uploader: this.config.uploader, actions: this.config.actions },
        api: this.opts.api,
        onChange: (v) => {
          if (v)
            images[i] = v;
          else {
            images.splice(i, 1);
            this.draw();
          }
        }
      }));
      if (!this.readOnly) {
        const bar = el("div", "ejs-gallery-move");
        for (const [label, by] of [["Move left", -1], ["Move right", 1]]) {
          const b = el("button", "ejs-gallery-btn", label);
          b.type = "button";
          b.disabled = i + by < 0 || i + by >= images.length;
          b.onclick = () => this.move(i, by);
          bar.append(b);
        }
        item.append(bar);
      }
      grid.append(item);
    });
    this.root.append(grid);
    if (!this.readOnly)
      this.root.append(this.addBar());
  }
  addBar() {
    const bar = el("div", "ejs-gallery-bar");
    const note = el("div", "ejs-gallery-error", this.msg);
    note.setAttribute("role", "alert");
    const { uploader, sources, max } = this.config;
    const fail = (e) => {
      this.msg = e instanceof Error ? e.message : "Something went wrong.";
    };
    if (uploader) {
      const file = el("input", "ejs-gallery-file");
      file.type = "file";
      file.accept = "image/*";
      file.multiple = true;
      file.hidden = true;
      const btn = el("button", "ejs-gallery-btn", "Add pictures");
      btn.type = "button";
      btn.disabled = this.room() <= 0;
      btn.onclick = () => file.click();
      file.onchange = async () => {
        const files = [...file.files ?? []];
        file.value = "";
        btn.disabled = true;
        this.msg = "";
        try {
          for (const f of files.slice(0, Math.max(0, this.room()))) {
            const r = await uploader(f);
            if (isError(r)) {
              this.msg = r.error;
              break;
            }
            this.data.images.push({ ...r, alt: "" });
          }
          if (!this.msg && max !== undefined && files.length > 0 && this.room() <= 0)
            this.msg = this.full();
        } catch (e) {
          fail(e);
        }
        this.draw();
      };
      bar.append(file, btn);
    }
    for (const s of sources ?? []) {
      const b = el("button", "ejs-gallery-btn", s.label);
      b.type = "button";
      b.disabled = this.room() <= 0;
      b.onclick = async () => {
        this.msg = "";
        try {
          const r = await s.pick();
          if (r)
            this.data.images.push({ ...r, alt: r.alt ?? "" });
        } catch (e) {
          fail(e);
        }
        this.draw();
      };
      bar.append(b);
    }
    if (!this.msg && this.room() <= 0)
      note.textContent = this.full();
    const wrap = el("div", "ejs-gallery-add");
    wrap.append(bar, note);
    return wrap;
  }
}
export {
  GalleryTool as default,
  isEmpty,
  isValid,
  normalize
};
