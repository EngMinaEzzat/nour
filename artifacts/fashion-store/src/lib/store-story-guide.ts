import { SectionType } from "./store-config";
import { ReadinessKey } from "./store-readiness";

export type StoryChapterId = "intro" | "products" | "trust" | "ordering";

export type StoryChapter = {
  id: StoryChapterId;
  titleKey: string;
  assistantKey: string;
  sectionTypes: SectionType[];
  readinessKeys: ReadinessKey[];
};

export const STORY_CHAPTERS: StoryChapter[] = [
  {
    id: "intro",
    titleKey: "storeStoryGuide.chapters.intro.title",
    assistantKey: "storeStoryGuide.chapters.intro.assistant",
    sectionTypes: ["hero", "about", "lookbook", "instagram"],
    readinessKeys: ["identity"],
  },
  {
    id: "products",
    titleKey: "storeStoryGuide.chapters.products.title",
    assistantKey: "storeStoryGuide.chapters.products.assistant",
    sectionTypes: ["new-arrivals", "best-sellers", "categories", "product-catalog"],
    readinessKeys: ["product"],
  },
  {
    id: "trust",
    titleKey: "storeStoryGuide.chapters.trust.title",
    assistantKey: "storeStoryGuide.chapters.trust.assistant",
    sectionTypes: ["trust-strip", "faq", "testimonials"],
    readinessKeys: [],
  },
  {
    id: "ordering",
    titleKey: "storeStoryGuide.chapters.ordering.title",
    assistantKey: "storeStoryGuide.chapters.ordering.assistant",
    sectionTypes: ["whatsapp", "offers", "newsletter"],
    readinessKeys: ["shipping"],
  },
];

export function getChapterForSection(sectionType: SectionType): StoryChapter | undefined {
  return STORY_CHAPTERS.find(chapter => chapter.sectionTypes.includes(sectionType));
}

export function getChapterProgress(chapter: StoryChapter, readiness: Record<ReadinessKey, any>): { total: number; done: number; isComplete: boolean } {
  if (chapter.readinessKeys.length === 0) {
    return { total: 0, done: 0, isComplete: true };
  }
  
  const keys = chapter.readinessKeys;
  const doneCount = keys.filter(k => readiness[k]?.done).length;
  
  return {
    total: keys.length,
    done: doneCount,
    isComplete: doneCount === keys.length
  };
}
