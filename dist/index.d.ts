import type { BlockTool, BlockToolConstructorOptions } from '@editorjs/editorjs';
import { type ImageConfig, type ToolImage } from './image';
export type { ImageConfig, ToolImage } from './image';
export interface GalleryData {
    images: ToolImage[];
}
export interface GalleryConfig extends ImageConfig {
    max?: number;
}
/** Fills defaults and drops unknown top-level keys; keeps order and image extras; caps at `max` when given. */
export declare function normalize(data: unknown, max?: number): GalleryData;
/** True when there is at least one picture and every picture has a description. */
export declare const isValid: (d: GalleryData) => boolean;
/** True when there are no pictures (the only block `validate` refuses). */
export declare const isEmpty: (d: GalleryData) => boolean;
export default class GalleryTool implements BlockTool {
    private opts;
    private data;
    private root;
    private msg;
    constructor(opts: BlockToolConstructorOptions<GalleryData, GalleryConfig>);
    static get toolbox(): {
        title: string;
        icon: string;
    };
    static get isReadOnlySupported(): boolean;
    render(): HTMLElement;
    save(): GalleryData;
    validate(data: GalleryData): boolean;
    private get config();
    private get readOnly();
    private room;
    private full;
    private move;
    private draw;
    private addBar;
}
