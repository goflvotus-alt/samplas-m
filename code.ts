figma.showUI(__html__, {
  width: 420,
  height: 760,
  themeColors: true
});

type GeneratedCardInput = {
  format?: string;
  imageFocus?: ImageFocus;
  title: string;
  body: string;
  caption: string;
  category?: string;
  backgroundColor?: string;
  overlayOpacity: number;
  imageBytes?: number[];
};

type UiToPluginMessage =
  | {
      type: "load-settings";
    }
  | {
      type: "save-backend-url";
      backendUrl: string;
    }
  | {
      type: "delete-backend-url";
    }
  | {
      type: "load-formats";
    }
  | {
      type: "generate-cards";
      cards: GeneratedCardInput[];
      sharedImageBytes?: number[];
    }
  | {
      type: "apply-image-to-card";
      frameId: string;
      imageBytes: number[];
    }
  | {
      type: "export-selected";
    };

type GeneratedFrameSummary = {
  id: string;
  name: string;
};

type FillableSceneNode = SceneNode & {
  fills: ReadonlyArray<Paint> | typeof figma.mixed;
};

type ImageFocus = "center" | "top" | "bottom" | "left" | "right";

type SizedSceneNode = SceneNode & {
  width: number;
  height: number;
};

const TEMPLATE_NAME = "CARD_TEMPLATE";
const TEMPLATE_PAGE_NAME = "SAMPLAS_TEMPLATES";
const TITLE_LAYER = "TITLE";
const BODY_LAYER = "BODY";
const CAPTION_LAYER = "CAPTION";
const CATEGORY_LAYER = "CATEGORY";
const IMAGE_LAYER = "IMAGE";
const OVERLAY_LAYER = "OVERLAY";
const BACKGROUND_LAYER = "BACKGROUND";
const CARD_SPACING = 80;
const SETTINGS_KEY = "samplasMSettings";

figma.ui.onmessage = async (message: UiToPluginMessage) => {
  try {
    if (message.type === "load-settings") {
      await postSettings();
      return;
    }

    if (message.type === "save-backend-url") {
      await saveBackendUrl(message.backendUrl);
      return;
    }

    if (message.type === "delete-backend-url") {
      await saveBackendUrl("");
      return;
    }

    if (message.type === "load-formats") {
      await postAvailableFormats();
      return;
    }

    if (message.type === "generate-cards") {
      await generateCards(message.cards, message.sharedImageBytes);
      return;
    }

    if (message.type === "apply-image-to-card") {
      await applyImageToGeneratedCard(message.frameId, message.imageBytes);
      return;
    }

    if (message.type === "export-selected") {
      await exportSelectedGeneratedFrames();
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Something went wrong.";
    figma.notify(errorMessage, { error: true });
    figma.ui.postMessage({ type: "error", message: errorMessage });
  }
};

async function postSettings(): Promise<void> {
  const settings = await getSettings();
  figma.ui.postMessage({
    type: "settings-loaded",
    settings
  });
}

async function getSettings(): Promise<{ backendUrl: string }> {
  const storedSettings = await figma.clientStorage.getAsync(SETTINGS_KEY);

  if (!storedSettings || typeof storedSettings !== "object") {
    return { backendUrl: "" };
  }

  const backendUrl = "backendUrl" in storedSettings ? String(storedSettings.backendUrl || "") : "";
  return { backendUrl };
}

async function saveBackendUrl(backendUrl: string): Promise<void> {
  const settings = {
    backendUrl: backendUrl.trim()
  };

  await figma.clientStorage.setAsync(SETTINGS_KEY, settings);
  figma.ui.postMessage({
    type: "settings-loaded",
    settings
  });
}

async function postAvailableFormats(): Promise<void> {
  const templatePage = await getTemplateSearchPage();

  figma.ui.postMessage({
    type: "available-formats",
    formats: getAvailableFormats(templatePage),
    templatePageName: templatePage.name
  });
}

function getAvailableFormats(templatePage: PageNode): Array<{ value: string; label: string; templateName: string }> {
  const templates = templatePage.findAll(
    (node) =>
      node.type === "FRAME" &&
      (node.name === TEMPLATE_NAME || node.name.startsWith(`${TEMPLATE_NAME}_`))
  ) as FrameNode[];

  return templates
    .map((template) => {
      if (template.name === TEMPLATE_NAME) {
        return {
          value: "",
          label: "Default",
          templateName: template.name
        };
      }

      const suffix = template.name.slice(TEMPLATE_NAME.length + 1);
      return {
        value: suffix.toLowerCase(),
        label: toTitleLabel(suffix),
        templateName: template.name
      };
    })
    .sort((a, b) => {
      if (a.value === "") return -1;
      if (b.value === "") return 1;
      return a.label.localeCompare(b.label);
    });
}

async function generateCards(cards: GeneratedCardInput[], sharedImageBytes?: number[]): Promise<void> {
  if (!cards.length) {
    throw new Error("Add at least one card before generating.");
  }

  const outputPage = figma.currentPage;
  const templatePage = await getTemplateSearchPage();
  const templates = cards.map((card) => findTemplateFrame(templatePage, card.format));
  const validatedTemplateIds = new Set<string>();

  for (const template of templates) {
    if (!validatedTemplateIds.has(template.id)) {
      validateTemplateLayers(template);
      validatedTemplateIds.add(template.id);
    }
  }

  const generatedFrames: FrameNode[] = [];
  const placementStart = getOutputPlacementStart(outputPage);
  const startY = placementStart.y;
  let nextX = placementStart.x;

  for (let index = 0; index < cards.length; index += 1) {
    const card = cards[index];
    const template = templates[index];
    const clone = template.clone();
    outputPage.appendChild(clone);
    clone.name = `Generated Card ${String(index + 1).padStart(2, "0")}`;
    clone.x = nextX;
    clone.y = startY;
    nextX += clone.width + CARD_SPACING;

    await fillCard(clone, card, card.imageBytes || sharedImageBytes);
    generatedFrames.push(clone);
  }

  figma.currentPage.selection = generatedFrames;
  figma.viewport.scrollAndZoomIntoView(generatedFrames);

  const frames = generatedFrames.map((frame) => ({
    id: frame.id,
    name: frame.name
  }));

  figma.notify(`Generated ${generatedFrames.length} card${generatedFrames.length === 1 ? "" : "s"}.`);
  figma.ui.postMessage({ type: "generated", frames });
}

async function fillCard(frame: FrameNode, card: GeneratedCardInput, imageBytes?: number[]): Promise<void> {
  const title = getLayer(frame, TITLE_LAYER);
  const body = getOptionalLayer(frame, BODY_LAYER);
  const caption = getOptionalLayer(frame, CAPTION_LAYER);
  const category = getOptionalLayer(frame, CATEGORY_LAYER);
  const image = getLayer(frame, IMAGE_LAYER);
  const overlay = getOptionalLayer(frame, OVERLAY_LAYER);
  const background = getOptionalLayer(frame, BACKGROUND_LAYER);

  await setTextLayer(title, TITLE_LAYER, card.title);

  if (body) {
    await setTextLayer(body, BODY_LAYER, card.body);
  }

  if (caption) {
    await setTextLayer(caption, CAPTION_LAYER, card.caption || card.category || "");
  }

  if (category) {
    await setTextLayer(category, CATEGORY_LAYER, card.category || card.caption || "");
  }

  if (overlay) {
    setLayerOpacity(overlay, card.overlayOpacity);
  }

  if (card.backgroundColor) {
    setBackgroundFill(background || frame, card.backgroundColor);
  }

  if (imageBytes && imageBytes.length > 0) {
    await setImageFill(image, imageBytes, card.imageFocus || "center");
  }
}

async function getTemplateSearchPage(): Promise<PageNode> {
  await ensureAllPagesLoaded();

  const templatePage = figma.root.children.find((page) => page.name === TEMPLATE_PAGE_NAME);

  if (templatePage && hasTemplateFrames(templatePage)) {
    return templatePage;
  }

  return figma.currentPage;
}

async function ensureAllPagesLoaded(): Promise<void> {
  if ("loadAllPagesAsync" in figma) {
    await figma.loadAllPagesAsync();
  }
}

function findTemplateFrame(templatePage: PageNode, format?: string): FrameNode {
  const templateNames = getTemplateNamesForFormat(format);

  for (const templateName of templateNames) {
    const template = templatePage.findOne(
      (node) => node.type === "FRAME" && node.name === templateName
    );

    if (template && template.type === "FRAME") {
      return template;
    }
  }

  throw new Error(`Could not find "${templateNames[0]}" or "${TEMPLATE_NAME}" on "${templatePage.name}".`);
}

function hasTemplateFrames(page: PageNode): boolean {
  return Boolean(
    page.findOne(
      (node) =>
        node.type === "FRAME" &&
        (node.name === TEMPLATE_NAME || node.name.startsWith(`${TEMPLATE_NAME}_`))
    )
  );
}

function getOutputPlacementStart(outputPage: PageNode): { x: number; y: number } {
  const bounds = getNodesBounds(outputPage.selection.length ? outputPage.selection : outputPage.children);

  if (!bounds) {
    return { x: 0, y: 0 };
  }

  return {
    x: bounds.x + bounds.width + CARD_SPACING,
    y: bounds.y
  };
}

function getNodesBounds(nodes: readonly SceneNode[]): { x: number; y: number; width: number; height: number } | null {
  const boxes = nodes
    .map((node) => ("absoluteBoundingBox" in node ? node.absoluteBoundingBox : null))
    .filter((box): box is Rect => Boolean(box));

  if (!boxes.length) {
    return null;
  }

  const minX = Math.min(...boxes.map((box) => box.x));
  const minY = Math.min(...boxes.map((box) => box.y));
  const maxX = Math.max(...boxes.map((box) => box.x + box.width));
  const maxY = Math.max(...boxes.map((box) => box.y + box.height));

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

function validateTemplateLayers(template: FrameNode): void {
  const missingLayers = [TITLE_LAYER, IMAGE_LAYER].filter(
    (layerName) => !template.findOne((node) => node.name === layerName)
  );

  if (missingLayers.length > 0) {
    throw new Error(`${template.name} is missing: ${missingLayers.join(", ")}.`);
  }
}

function getTemplateNamesForFormat(format?: string): string[] {
  const suffix = toTemplateSuffix(format);

  if (!suffix) {
    return [TEMPLATE_NAME];
  }

  return [`${TEMPLATE_NAME}_${suffix}`, TEMPLATE_NAME];
}

function toTemplateSuffix(format?: string): string {
  return String(format || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function toTitleLabel(value: string): string {
  return value
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getLayer(frame: FrameNode, layerName: string): SceneNode {
  const layer = frame.findOne((node) => node.name === layerName);

  if (!layer || !isSceneNode(layer)) {
    throw new Error(`${frame.name} is missing the "${layerName}" layer.`);
  }

  return layer;
}

function getOptionalLayer(frame: FrameNode, layerName: string): SceneNode | null {
  const layer = frame.findOne((node) => node.name === layerName);

  if (!layer) {
    return null;
  }

  if (!isSceneNode(layer)) {
    throw new Error(`"${layerName}" exists but is not a scene layer.`);
  }

  return layer;
}

function isSceneNode(node: BaseNode): node is SceneNode {
  return "visible" in node;
}

async function setTextLayer(node: SceneNode, layerName: string, text: string): Promise<void> {
  if (node.type !== "TEXT") {
    throw new Error(`"${layerName}" must be a text layer.`);
  }

  await loadFontsForTextNode(node);
  node.characters = text || "";
}

async function loadFontsForTextNode(textNode: TextNode): Promise<void> {
  if (textNode.fontName !== figma.mixed) {
    await figma.loadFontAsync(textNode.fontName);
    return;
  }

  const rangeFonts = textNode.characters.length
    ? textNode.getRangeAllFontNames(0, textNode.characters.length)
    : [];

  const uniqueFonts = new Map<string, FontName>();
  for (const font of rangeFonts) {
    uniqueFonts.set(`${font.family}::${font.style}`, font);
  }

  await Promise.all(Array.from(uniqueFonts.values()).map((font) => figma.loadFontAsync(font)));
}

async function setImageFill(node: SceneNode, imageBytes: number[], focus: ImageFocus = "center"): Promise<void> {
  if (!hasFills(node)) {
    throw new Error(`"${IMAGE_LAYER}" must be a rectangle, frame, or another layer type with fills.`);
  }

  const image = figma.createImage(new Uint8Array(imageBytes));
  const imageSize = await image.getSizeAsync();
  let imagePaint: ImagePaint;

  if (focus === "center" || !hasSize(node)) {
    imagePaint = {
      type: "IMAGE",
      scaleMode: "FILL",
      imageHash: image.hash
    };
  } else {
    imagePaint = {
      type: "IMAGE",
      scaleMode: "CROP",
      imageHash: image.hash,
      imageTransform: getImageFocusTransform(
        node.width,
        node.height,
        imageSize.width,
        imageSize.height,
        focus
      )
    };
  }

  node.fills = [imagePaint];
}

function getImageFocusTransform(
  frameWidth: number,
  frameHeight: number,
  imageWidth: number,
  imageHeight: number,
  focus: ImageFocus
): Transform {
  const frameAspect = frameWidth / frameHeight;
  const imageAspect = imageWidth / imageHeight;
  let cropWidth = 1;
  let cropHeight = 1;

  if (imageAspect > frameAspect) {
    cropWidth = frameAspect / imageAspect;
  } else if (imageAspect < frameAspect) {
    cropHeight = imageAspect / frameAspect;
  }

  const focusX = focus === "left" ? 0 : focus === "right" ? 1 : 0.5;
  const focusY = focus === "top" ? 0 : focus === "bottom" ? 1 : 0.5;
  const x = (1 - cropWidth) * focusX;
  const y = (1 - cropHeight) * focusY;

  return [
    [cropWidth, 0, x],
    [0, cropHeight, y]
  ];
}

function setBackgroundFill(node: SceneNode, color: string): void {
  if (!hasFills(node)) {
    throw new Error(`"${BACKGROUND_LAYER}" must be a rectangle, frame, or another layer type with fills.`);
  }

  const rgb = hexToRgb(color);
  if (!rgb) {
    throw new Error("Background color must be a valid hex color, like #F2EEE8.");
  }

  const solidPaint: SolidPaint = {
    type: "SOLID",
    color: rgb
  };

  node.fills = [solidPaint];
}

function hasFills(node: SceneNode): node is FillableSceneNode {
  return "fills" in node;
}

function hasSize(node: SceneNode): node is SizedSceneNode {
  return "width" in node && "height" in node;
}

function hasOpacity(node: SceneNode): node is SceneNode & { opacity: number } {
  return "opacity" in node;
}

function setLayerOpacity(node: SceneNode, opacity: number): void {
  if (!hasOpacity(node)) {
    throw new Error(`"${OVERLAY_LAYER}" must be a layer type that supports opacity.`);
  }

  const safeOpacity = Math.max(0, Math.min(80, Number(opacity) || 0));
  node.opacity = safeOpacity / 100;
}

async function applyImageToGeneratedCard(frameId: string, imageBytes: number[]): Promise<void> {
  const node = figma.getNodeById(frameId);

  if (!node || node.type !== "FRAME") {
    throw new Error("Could not find the generated card frame.");
  }

  const imageLayer = getLayer(node, IMAGE_LAYER);
  await setImageFill(imageLayer, imageBytes);
  figma.notify(`Updated image for ${node.name}.`);
  figma.ui.postMessage({ type: "image-applied", frameId });
}

async function exportSelectedGeneratedFrames(): Promise<void> {
  const selectedFrames = figma.currentPage.selection.filter(
    (node): node is FrameNode => node.type === "FRAME" && node.name.startsWith("Generated Card")
  );

  if (selectedFrames.length === 0) {
    throw new Error("Select one or more generated card frames before exporting.");
  }

  const exports = [];

  for (const frame of selectedFrames) {
    const bytes = await frame.exportAsync({ format: "PNG" });
    exports.push({
      name: `${toSafeFileName(frame.name)}.png`,
      bytes: Array.from(bytes)
    });
  }

  figma.notify(`Exported ${exports.length} PNG file${exports.length === 1 ? "" : "s"}.`);
  figma.ui.postMessage({ type: "export-complete", files: exports });
}

function toSafeFileName(name: string): string {
  return name.trim().replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "") || "generated-card";
}

function hexToRgb(color: string): RGB | null {
  const match = color.trim().match(/^#?([0-9a-f]{6})$/i);

  if (!match) {
    return null;
  }

  const hex = match[1];
  return {
    r: parseInt(hex.slice(0, 2), 16) / 255,
    g: parseInt(hex.slice(2, 4), 16) / 255,
    b: parseInt(hex.slice(4, 6), 16) / 255
  };
}
