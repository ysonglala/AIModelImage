import { prisma } from "./db";
import type { ReferenceImages } from "./types";

export type ComboInput = {
  productColorId: string;
  styleId: string;
  poseId: string;
  purpose: "ec_white" | "detail_mood" | "xhs_carousel" | "multi_color";
  imageCount?: number;
  modelRefs?: string[]; // optional override model/style reference images
};

export type BuiltCombo = {
  prompt: string;
  negativePrompt: string;
  aspectRatio: string;
  resolution: string;
  referenceImages: ReferenceImages;
  title: string;
  taskType: string;
  template: string;
  fidelity: string;
  mood: string;
};

const PURPOSE_LABEL: Record<string, string> = {
  ec_white: "白底主图",
  detail_mood: "详情页氛围图",
  xhs_carousel: "小红书穿搭图",
  multi_color: "多色同款展示",
};

const PURPOSE_TASK_MOD: Record<string, string> = {
  ec_white:
    "Generate a clean ecommerce product hero image. The garment must be photo-realistic and identical to the reference in every detail.",
  detail_mood:
    "Generate a lifestyle detail-page mood image. Show the garment's texture and feel in a natural, editorial setting.",
  xhs_carousel:
    "Generate a Xiaohongshu (RED) style fashion photo. Candid, authentic, low-saturation, real-phone-shot aesthetic.",
  multi_color:
    "Generate a consistent outfit shot for a color variant. The garment color in reference image 1 must be reproduced exactly.",
};

const GARMENT_FIDELITY =
  "Reference image 1 is the garment. Reproduce 100%: color (hex-accurate), fabric texture, washes, fading, prints, patterns, neckline, collar, sleeves, hem, cuffs, pockets, buttons, zippers, stitching, labels, logo placement, and overall silhouette. Do NOT alter or stylize any garment detail.";

const MODEL_CONSISTENCY =
  "Reference image 2 defines the model identity, hairstyle, skin tone, pants, shoes, bag and other accessories. Keep them consistent. Only the top garment should change.";

export async function buildComboPrompt(input: ComboInput): Promise<BuiltCombo> {
  const [color, style, pose] = await Promise.all([
    prisma.productColor.findUniqueOrThrow({
      where: { id: input.productColorId },
      include: { product: true },
    }),
    prisma.stylePreset.findUniqueOrThrow({ where: { id: input.styleId } }),
    prisma.posePreset.findUniqueOrThrow({ where: { id: input.poseId } }),
  ]);

  const garmentRefs = (color.garmentRefs as string[]) ?? [];
  const modelRefs = input.modelRefs ?? [];

  const referenceImages: ReferenceImages = {
    garment: garmentRefs[0],
    ...(modelRefs[0] ? { model: modelRefs[0] } : {}),
    ...(modelRefs[1] ? { style: modelRefs[1] } : {}),
  };

  const hasModelRef = !!referenceImages.model;

  const parts: string[] = [
    // Task module
    PURPOSE_TASK_MOD[input.purpose] ?? PURPOSE_TASK_MOD.ec_white,
    // Garment fidelity module
    GARMENT_FIDELITY,
    // Model consistency (only when model reference provided)
    ...(hasModelRef ? [MODEL_CONSISTENCY] : []),
    // Style lock from preset
    style.styleLock,
    // Scene preset
    style.scenePrompt,
    // Pose preset
    pose.posePrompt,
    // Lighting + camera module
    style.lightingPrompt,
  ];

  const prompt = parts.join(" | ");
  const negativePrompt =
    style.negativePrompt ??
    "no logos, no watermark, no text, no distorted hands, no warped fabric";

  const title = `${color.product.name} ${color.colorName} - ${style.label} (${PURPOSE_LABEL[input.purpose] ?? input.purpose})`;

  return {
    prompt,
    negativePrompt,
    aspectRatio: style.defaultAspectRatio,
    resolution: style.defaultResolution,
    referenceImages,
    title,
    taskType: PURPOSE_LABEL[input.purpose] ?? input.purpose,
    template: `${input.styleId} + ${input.poseId}`,
    fidelity: "强保真",
    mood: input.purpose === "ec_white" ? "克制" : "平衡",
  };
}
