export type UploadKind = "garment" | "model" | "style";

export type UploadResult = {
  ok: true;
  kind: string;
  filename: string;
  url: string;
  size: number;
  mimeType: string;
};
