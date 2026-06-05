import { PreviewSectionProps } from "./types";
import { EditorialLookbook } from "@/components/storefront/EditorialLookbook";

export function LookbookPreview({ section, p, wrap }: PreviewSectionProps) {
  return wrap(
    <EditorialLookbook
      primaryColor={p}
      onScrollToProducts={() => undefined}
      content={section.content}
    />,
  );
}
