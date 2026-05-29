import React, { act, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import i18n from "@/lib/i18n";
import { EditorialLookbook } from "./EditorialLookbook";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      initial,
      animate,
      whileInView,
      viewport,
      transition,
      whileHover,
      ...props
    }: any) => <div {...props}>{children}</div>,
  },
}));

describe("EditorialLookbook", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeAll(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(async () => {
    await i18n.changeLanguage("en");
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (root) {
      act(() => root.unmount());
    }
    container.remove();
    vi.restoreAllMocks();
  });

  function renderLookbook(props: Partial<ComponentProps<typeof EditorialLookbook>> = {}) {
    const defaultProps = {
      primaryColor: "#8B1A35",
      onScrollToProducts: vi.fn(),
    };

    root = createRoot(container);
    act(() => {
      root.render(<EditorialLookbook {...defaultProps} {...props} />);
    });

    return defaultProps;
  }

  it("renders default panels when custom panels are not provided", () => {
    renderLookbook();

    expect(container.textContent).toContain("Fashion");
    expect(container.textContent).toContain("Spring 2025");
    expect(container.textContent).toContain("Beauty");
    expect(container.querySelectorAll("img")).toHaveLength(3);
  });

  it("renders custom panels with their text and image", () => {
    renderLookbook({
      content: {
        items: [
          {
            imageUrl: "https://example.com/linen-set.jpg",
            title: "Linen Set",
            desc: "Weekend-ready layers",
            tag: "Summer Edit",
          },
        ],
      },
    });

    const image = container.querySelector<HTMLImageElement>('img[alt="Linen Set"]');

    expect(container.textContent).toContain("Linen Set");
    expect(container.textContent).toContain("Weekend-ready layers");
    expect(container.textContent).toContain("Summer Edit");
    expect(image?.src).toBe("https://example.com/linen-set.jpg");
  });

  it("calls onScrollToProducts when clicking a panel without a category id", () => {
    const onScrollToProducts = vi.fn();
    renderLookbook({
      onScrollToProducts,
      content: {
        items: [
          {
            imageUrl: "https://example.com/dress.jpg",
            title: "Evening Dress",
          },
        ],
      },
    });

    const panel = container.querySelector('img[alt="Evening Dress"]')?.closest(".cursor-pointer") as HTMLElement;
    act(() => panel.click());

    expect(onScrollToProducts).toHaveBeenCalledTimes(1);
  });

  it("selects the linked category and schedules scrolling when clicking a categorized panel", () => {
    const onCategorySelect = vi.fn();
    const onScrollToProducts = vi.fn();
    const requestAnimationFrame = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((callback: FrameRequestCallback) => {
        callback(0);
        return 1;
      });

    renderLookbook({
      onCategorySelect,
      onScrollToProducts,
      content: {
        items: [
          {
            imageUrl: "https://example.com/bags.jpg",
            title: "Statement Bag",
            categoryId: "42",
          },
        ],
      },
    });

    const panel = container.querySelector('img[alt="Statement Bag"]')?.closest(".cursor-pointer") as HTMLElement;
    act(() => panel.click());

    expect(onCategorySelect).toHaveBeenCalledWith(42);
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
    expect(onScrollToProducts).toHaveBeenCalledTimes(1);
  });
});
