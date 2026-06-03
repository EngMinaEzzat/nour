## 2024-11-20 - Keyboard Accessibility for File Upload Dropzones
**Learning:** Using `display: none` (`hidden` in Tailwind) on an `<input type="file">` within a custom dropzone label removes the input from the document's tab order, making it impossible for keyboard users to interact with.
**Action:** Always use `.sr-only` (screen-reader only) instead of `.hidden` on hidden file inputs, and use `:has(:focus-visible)` on the parent wrapper/label to show a focus ring when the invisible input receives keyboard focus.
