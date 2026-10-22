/**
 * Copy for each achievement, keyed by the codes my_achievements() returns
 * (targets live in that SQL function). A DB test checks the two stay in sync.
 */
export type AchievementArea =
  | "tasks"
  | "reflection"
  | "habits"
  | "focus"
  | "workouts"
  | "goals"
  | "journal"
  | "languages"
  | "finance"

export type AchievementCopy = {
  title: string
  description: string
  area: AchievementArea
}

export const ACHIEVEMENTS: Record<string, AchievementCopy> = {
  first_task: {
    title: "First step",
    description: "Finish your first task.",
    area: "tasks",
  },
  tasks_25: {
    title: "Getting things done",
    description: "Finish 25 tasks.",
    area: "tasks",
  },
  tasks_100: {
    title: "Hundred club",
    description: "Finish 100 tasks.",
    area: "tasks",
  },
  first_reflection: {
    title: "Looking back",
    description: "Reflect on a day for the first time.",
    area: "reflection",
  },
  reflections_30: {
    title: "A month of moments",
    description: "Reflect on 30 days.",
    area: "reflection",
  },
  checkins_30: {
    title: "Taking root",
    description: "Check in on your habits 30 times.",
    area: "habits",
  },
  checkins_100: {
    title: "Second nature",
    description: "Check in on your habits 100 times.",
    area: "habits",
  },
  first_focus: {
    title: "In the zone",
    description: "Start your first focus session.",
    area: "focus",
  },
  focus_10h: {
    title: "Deep worker",
    description: "Focus for 10 hours in total.",
    area: "focus",
  },
  first_workout: {
    title: "On the move",
    description: "Log your first workout.",
    area: "workouts",
  },
  workouts_25: {
    title: "Keeping active",
    description: "Log 25 workouts.",
    area: "workouts",
  },
  first_goal: {
    title: "Goal getter",
    description: "Achieve your first goal.",
    area: "goals",
  },
  goals_5: {
    title: "High achiever",
    description: "Achieve 5 goals.",
    area: "goals",
  },
  first_entry: {
    title: "Dear diary",
    description: "Write your first journal entry.",
    area: "journal",
  },
  entries_30: {
    title: "Storyteller",
    description: "Write 30 journal entries.",
    area: "journal",
  },
  words_25: {
    title: "Word collector",
    description: "Learn 25 words.",
    area: "languages",
  },
  practice_10h: {
    title: "Dedicated learner",
    description: "Practise a language for 10 hours in total.",
    area: "languages",
  },
  first_budget: {
    title: "Planner",
    description: "Set your first budget.",
    area: "finance",
  },
  transactions_100: {
    title: "Money mindful",
    description: "Log 100 income or expense entries.",
    area: "finance",
  },
}
