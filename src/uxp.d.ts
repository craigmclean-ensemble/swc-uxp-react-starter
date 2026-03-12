/**
 * UXP extends HTMLDialogElement with uxpShowModal (Photoshop).
 */
interface HTMLDialogElement {
  uxpShowModal?(options: {
    title?: string;
    resize?: "none" | "horizontal" | "vertical" | "both";
    size?: { width: number; height: number };
  }): Promise<string | undefined>;
}

/**
 * Type declarations for the UXP host module (provided at runtime by Photoshop).
 * @see https://developer.adobe.com/photoshop/uxp/2022/guides/uxp_guide/uxp-misc/manifest-v5/
 */
declare module "uxp" {
  export const entrypoints: {
    setup(options: EntrypointsSetupOptions): void;
  } | undefined;

  export const storage: {
    secureStorage: {
      getItem(key: string): Promise<string | null>;
      setItem(key: string, value: string): Promise<void>;
      removeItem(key: string): Promise<void>;
      clear(): Promise<void>;
    };
  };

  export const shell: {
    /** Opens a URL in the default system browser. Requires manifest launchProcess permission (e.g. schemes: ["https"]). */
    openExternal(url: string): Promise<void>;
  };

  export interface PanelCreateContext {
    create?(rootNode: HTMLElement): void;
    show?(rootNode: HTMLElement, data?: unknown): void;
    hide?(rootNode: HTMLElement, data?: unknown): void;
    destroy?(rootNode: HTMLElement): void;
    invokeMenu?(menuId: string): void;
    menuItems?: unknown[];
  }

  export interface EntrypointsSetupOptions {
    panels?: Record<string, PanelCreateContext>;
    plugin?: {
      create?(): void;
      destroy?(): void;
    };
    commands?: Record<string, { run(): void; cancel?(): void } | (() => void)>;
  }

}
