# Product & Design Steering: Expense & Finance Tracker

## App Vision & Purpose
This application is a personal finance management tool designed to help users track expenses/loans quickly and gain clear insights through monthly metrics and visual analytics.

---

## 1. Core UI/UX Standards & Principles

### A. Effortless Data Entry (Speed & Precision)
- **Low Friction:** Adding an expense or income entry must require the absolute minimum number of clicks/taps.
- **Form Controls:** 
  - Never use plain text inputs for dates; always use intuitive **Date Pickers**.
  - Use searchable **Dropdowns/Comboboxes** for category selections when options exceed 5 items.
  - Category items must retain their distinctive **Emojis/Icons** for quick visual recognition across forms, lists, and charts.
- **Modal Behavior:**
  - Modals must be dismissible. Always include a visible "X" close button in the top-right corner.
  - Support closing via `Escape` key and clicking outside the backdrop.

### B. Visual Hierarchy & Micro-Interactions
- **Centered Alignment:** Ensure all action icons (e.g., `+`, edit, delete, close) are perfectly centered vertically and horizontally inside their touch/click targets (`flex items-center justify-center`).
- **Interactive Feedback:** All buttons and interactive cards must include clear hover, active, and focus states (micro-animations, smooth color transitions).
- **Responsive Layouts:** Mobile-first approach. Modals, forms, and charts must adapt seamlessly to narrow screens.

### C. Financial Metrics & Data Visualization
- **At-a-Glance Dashboard:** Primary KPIs (Total Spent, Remaining Budget, Monthly Change) must be displayed prominently at the top of the main view.
- **Chart Best Practices:**
  - Use clean visual charts (donut/pie for breakdown by category, bar/line for monthly trends).
  - Use accessible color palettes for charts with distinct contrast.
  - Tooltips on charts must show formatted currency values (e.g., `$1,250.00`) and percentages.
- **Filtering System:**
  - Filter controls (Date ranges, categories) must use interactive pickers and provide real-time updates to dashboard metrics.

---

## 2. Technical & Formatting Guidelines

- **Currency Formatting:** Always format monetary amounts according to the user's local currency format with proper separators and symbols.
- **Accessibility (a11y):** Form fields must have associated labels, touch targets must be at least 44x44px, and contrast ratios must satisfy WCAG AA standards.
- **State Management:** Keep form state localized when drafting, but propagate updates instantly to visual charts upon submission or deletion.