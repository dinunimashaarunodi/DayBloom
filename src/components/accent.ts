/**
 * Module accents from the design system. Use them only to mark which module
 * something belongs to (icon chips, small highlights), never as page themes.
 * - sage: planner, tasks, habits
 * - peach: expenses
 * - lavender: study, languages
 * - mint: workouts, wellness, reflection
 * - rose: achievements (with restrained gold)
 */
export type Accent = "sage" | "peach" | "lavender" | "mint" | "rose"

/** Background + readable text colour for an accent chip. */
export const ACCENT_CHIP: Record<Accent, string> = {
  sage: "bg-sage text-sage-ink",
  peach: "bg-peach text-foreground",
  lavender: "bg-lavender text-foreground",
  mint: "bg-mint text-foreground",
  rose: "bg-rose text-foreground",
}
