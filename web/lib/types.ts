export type ImageFocus = "center" | "top" | "bottom" | "left" | "right";

export interface PageInput {
  pageNumber: number;
  format: string;
  category: string;
  title: string;
  text: string;
  imageFocus: ImageFocus;
  hasImage: boolean;
  imageName: string;
}

export interface NormalizedRequest {
  mode: "pages" | "topic";
  postCaption: string;
  mood: string;
  cardCount: number;
  pages: PageInput[];
  topic?: string;
  tone?: string;
  references?: string;
}

export interface GeneratedCard {
  format: string;
  title: string;
  body: string;
  caption: string;
  category: string;
  backgroundColor: string;
  overlayOpacity: number;
}

export interface GenerateCardNewsResponse {
  postCaption: string;
  cards: GeneratedCard[];
}
