// src/types/qrcode.d.ts
declare module "qrcode" {
  export function toDataURL(
    text: string,
    options?: {
      errorCorrectionLevel?: "L" | "M" | "Q" | "H";
      margin?: number;
      scale?: number;
      width?: number;
      color?: { dark?: string; light?: string };
    }
  ): Promise<string>;
  const _default: {
    toDataURL: typeof toDataURL;
  };
  export default _default;
}
