import { prisma } from "../db";

type StyleSeed = {
  id: string;
  label: string;
  category: "EC" | "XHS";
  scenePrompt: string;
  lightingPrompt: string;
  styleLock: string;
  negativePrompt?: string;
  defaultAspectRatio?: string;
};

type PoseSeed = {
  id: string;
  label: string;
  posePrompt: string;
};

const NEGATIVE_BASE =
  "no logos, no watermark, no text, no extra accessories blocking the garment, no distorted hands, no warped fabric, no plastic skin, no oversaturated colors";

const stylePresets: StyleSeed[] = [
  {
    id: "EC-A1",
    label: "白底验收 - 正面站姿",
    category: "EC",
    scenePrompt:
      "studio shoot on a seamless pure white background, ecommerce product hero shot, clean and minimal",
    lightingPrompt:
      "even soft daylight from front and slightly above, low contrast, no harsh shadows, color accurate",
    styleLock:
      "garment must be 100% faithful to reference image 1 in color, fabric texture, washes, prints, neckline, sleeve, hem, pockets, stitching and silhouette; framing is full body, frontal",
    defaultAspectRatio: "3:4",
  },
  {
    id: "EC-A2",
    label: "浅灰棚拍 - 微侧身",
    category: "EC",
    scenePrompt:
      "studio shoot on a seamless light gray paper background, premium ecommerce catalog",
    lightingPrompt:
      "soft key light from camera-left, subtle fill, gentle floor shadow, color accurate",
    styleLock:
      "garment is 100% faithful to reference image 1; model is slightly turned 15 degrees, full body",
    defaultAspectRatio: "3:4",
  },
  {
    id: "XHS-A1",
    label: "灰水泥墙街拍 - 微侧身",
    category: "XHS",
    scenePrompt:
      "outdoor candid shot in front of a raw gray concrete wall, Korean street style buyer-store look, 9:16 vertical, slight high-angle, close mid to full body framing",
    lightingPrompt:
      "soft natural daylight, slightly overcast, low saturation gray/beige/brown palette, true-to-life iPhone-like snapshot quality",
    styleLock:
      "garment is 100% faithful to reference image 1; model identity, pants, shoes, accessories and overall styling follow reference image 2; no eye contact with camera, slightly turned away",
    defaultAspectRatio: "9:16",
  },
  {
    id: "XHS-A2",
    label: "灰水泥墙街拍 - 双手插袋",
    category: "XHS",
    scenePrompt:
      "outdoor candid in front of a raw gray concrete wall, buyer-store street style, 9:16 vertical, slight high-angle",
    lightingPrompt:
      "soft natural daylight, low saturation gray/beige/brown palette, iPhone-like candid snapshot",
    styleLock:
      "garment 100% faithful to reference image 1; model & accessories follow reference image 2; both hands relaxed in pockets, half body to full body",
    defaultAspectRatio: "9:16",
  },
  {
    id: "XHS-B1",
    label: "奶油白买手店 - 微侧身",
    category: "XHS",
    scenePrompt:
      "inside a quiet cream-white buyer store with soft wooden floor and warm racks, premium boutique feel, 9:16 vertical",
    lightingPrompt:
      "warm indoor ambient light + soft window light from camera-left, low saturation, milky tones",
    styleLock:
      "garment 100% faithful to reference image 1; model & accessories follow reference image 2; mid body to full body, slightly turned",
    defaultAspectRatio: "9:16",
  },
  {
    id: "XHS-B2",
    label: "奶油白买手店 - 活泼站姿",
    category: "XHS",
    scenePrompt:
      "inside a cream-white buyer store, premium boutique, lively casual feel, 9:16 vertical",
    lightingPrompt:
      "warm indoor ambient + soft window light, low saturation milky palette",
    styleLock:
      "garment 100% faithful to reference image 1; model & accessories follow reference image 2; lively standing pose, mid body to full body",
    defaultAspectRatio: "9:16",
  },
  {
    id: "XHS-C1",
    label: "金属感咖啡店 - 手拿咖啡",
    category: "XHS",
    scenePrompt:
      "inside an industrial metal-and-wood specialty coffee shop, blurred bokeh background, 9:16 vertical",
    lightingPrompt:
      "warm pendant lighting + soft window backlight, low saturation, slight film grain",
    styleLock:
      "garment 100% faithful to reference image 1; model & accessories follow reference image 2; holding a takeaway coffee cup, looking aside, mid body framing",
    defaultAspectRatio: "9:16",
  },
  {
    id: "XHS-D1",
    label: "室内长椅 - 坐姿",
    category: "XHS",
    scenePrompt:
      "minimal indoor scene with a long wooden bench against a beige wall, magazine-like editorial feel, 9:16 vertical",
    lightingPrompt:
      "soft directional window light, gentle shadows, low saturation",
    styleLock:
      "garment 100% faithful to reference image 1; model & accessories follow reference image 2; seated on the bench, relaxed posture, full body in frame",
    defaultAspectRatio: "9:16",
  },
];

const posePresets: PoseSeed[] = [
  {
    id: "POSE_ANGLE_STAND",
    label: "微侧身站姿",
    posePrompt:
      "standing, body slightly turned 15-20 degrees from camera, weight on one leg, arms relaxed, natural everyday posture",
  },
  {
    id: "POSE_INSERT_POCKET",
    label: "双手插袋",
    posePrompt:
      "standing relaxed, both hands gently inserted into the pockets, head slightly tilted, natural breathing pose",
  },
  {
    id: "POSE_HOLD_COFFEE",
    label: "手拿咖啡",
    posePrompt:
      "standing, one hand holding a paper takeaway coffee cup near the chest level, the other arm relaxed, head turned aside",
  },
  {
    id: "POSE_SIT",
    label: "坐姿",
    posePrompt:
      "seated on a bench with knees together, hands relaxed on lap or beside the body, slight forward lean, calm expression",
  },
  {
    id: "POSE_FRONTAL_STAND",
    label: "正面站姿",
    posePrompt:
      "standing fully facing the camera, both arms relaxed beside the body, neutral posture, suitable for ecommerce hero shot",
  },
  {
    id: "POSE_LIVELY",
    label: "活泼站姿",
    posePrompt:
      "standing with a lively step pose, one foot slightly forward, hand brushing through hair or gesturing, friendly mood",
  },
];

export async function seedPresets() {
  for (const s of stylePresets) {
    await prisma.stylePreset.upsert({
      where: { id: s.id },
      update: {
        label: s.label,
        category: s.category,
        scenePrompt: s.scenePrompt,
        lightingPrompt: s.lightingPrompt,
        styleLock: s.styleLock,
        negativePrompt: s.negativePrompt ?? NEGATIVE_BASE,
        defaultAspectRatio: s.defaultAspectRatio ?? "9:16",
      },
      create: {
        id: s.id,
        label: s.label,
        category: s.category,
        scenePrompt: s.scenePrompt,
        lightingPrompt: s.lightingPrompt,
        styleLock: s.styleLock,
        negativePrompt: s.negativePrompt ?? NEGATIVE_BASE,
        defaultAspectRatio: s.defaultAspectRatio ?? "9:16",
      },
    });
  }

  for (const p of posePresets) {
    await prisma.posePreset.upsert({
      where: { id: p.id },
      update: { label: p.label, posePrompt: p.posePrompt },
      create: { id: p.id, label: p.label, posePrompt: p.posePrompt },
    });
  }
}
