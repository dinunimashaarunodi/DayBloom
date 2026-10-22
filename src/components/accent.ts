/**
 * Module accents from the design system. Use them to mark which module
 * something belongs to (icon chips, small highlights), never as page themes.
 * - sage (teal-green): planner, tasks, habits
 * - peach (amber): expenses
 * - lavender (violet): study, focus, languages
 * - mint (sky): workouts, wellness, reflection
 * - rose: achievements (with restrained gold)
 */
export type Accent = "sage" | "peach" | "lavender" | "mint" | "rose"

/** Tinted background + readable ink for an accent chip. */
export const ACCENT_CHIP: Record<Accent, string> = {
  sage: "bg-sage text-sage-ink",
  peach: "bg-peach text-peach-ink",
  lavender: "bg-lavender text-lavender-ink",
  mint: "bg-mint text-mint-ink",
  rose: "bg-rose text-rose-ink",
}
