/**
 * Interview settings: types, difficulty levels, question counts, quick-start
 * templates, and validation of the "new interview" form.
 *
 * Shared by the form (browser) and the server action, so both apply the same
 * rules. Pure module, covered by unit tests.
 */

export const INTERVIEW_TYPES = {
  technical: {
    label: "Technical",
    description: "Concepts, problem solving and hands-on experience with your stack.",
    prompt: "technical questions on core concepts, problem solving, debugging and hands-on experience with the tech stack",
    needsTechStack: true,
  },
  behavioral: {
    label: "Behavioral",
    description: "Teamwork, conflict, ownership and impact. Best answered with STAR.",
    prompt:
      "behavioral questions about real past situations (teamwork, conflict, ownership, failure, influence, impact). Each model answer follows the STAR method: Situation, Task, Action, Result",
    needsTechStack: false,
  },
  "system-design": {
    label: "System design",
    description: "Architecture, data modeling, scaling and trade-offs.",
    prompt:
      "system design questions: design a service or feature end to end, covering requirements, architecture, data model, APIs, scaling, reliability and trade-offs",
    needsTechStack: true,
  },
  hr: {
    label: "HR & culture fit",
    description: "Motivation, career goals, strengths and working style.",
    prompt:
      "HR and culture-fit questions: motivation for this role and company, career goals, strengths and weaknesses, working style, handling feedback and pressure, and expectations",
    needsTechStack: false,
  },
  mixed: {
    label: "Mixed",
    description: "A realistic first round: technical plus behavioral.",
    prompt: "a realistic first-round mix: about half technical questions on the stack, the rest behavioral (STAR) and motivation questions",
    needsTechStack: true,
  },
};

export const DIFFICULTIES = {
  easy: {
    label: "Warm-up",
    description: "Fundamentals, to build confidence.",
    prompt: "easier than usual for this experience level; focus on fundamentals",
  },
  medium: {
    label: "Standard",
    description: "What a typical interview at your level asks.",
    prompt: "typical for this experience level",
  },
  hard: {
    label: "Challenging",
    description: "Deeper probing, edge cases and trade-offs.",
    prompt: "harder than usual for this experience level; probe depth, edge cases and trade-offs",
  },
};

export const QUESTION_COUNT = { min: 3, max: 10, default: 5 };

export const DEFAULT_SETTINGS = {
  interviewType: "technical",
  difficulty: "medium",
  questionCount: QUESTION_COUNT.default,
};

/** Display label for a stored type, including interviews created before types existed. */
export function interviewTypeLabel(type) {
  return INTERVIEW_TYPES[type]?.label ?? INTERVIEW_TYPES.technical.label;
}

export function difficultyLabel(difficulty) {
  return DIFFICULTIES[difficulty]?.label ?? DIFFICULTIES.medium.label;
}

/** One-click presets for the new interview form. */
export const TEMPLATES = [
  {
    name: "Frontend developer",
    jobPosition: "Frontend Developer",
    techStacks: "React, TypeScript, Next.js, CSS",
    jobDescription: "Build accessible, fast user interfaces with React and TypeScript, work closely with designers, and own frontend performance.",
    jobExperience: "2",
    interviewType: "technical",
  },
  {
    name: "Backend engineer",
    jobPosition: "Backend Engineer",
    techStacks: "Node.js, PostgreSQL, REST APIs, Docker",
    jobDescription: "Design and run APIs and data stores, write reliable services, and take part in on-call.",
    jobExperience: "3",
    interviewType: "technical",
  },
  {
    name: "Data analyst",
    jobPosition: "Data Analyst",
    techStacks: "SQL, Python, Excel, Power BI",
    jobDescription: "Turn business questions into analyses and dashboards, and present findings to stakeholders.",
    jobExperience: "1",
    interviewType: "mixed",
  },
  {
    name: "Product manager",
    jobPosition: "Product Manager",
    techStacks: "",
    jobDescription: "Own a product area end to end: discovery, prioritization, roadmaps and working with engineering and design.",
    jobExperience: "3",
    interviewType: "behavioral",
  },
  {
    name: "System design round",
    jobPosition: "Senior Software Engineer",
    techStacks: "Distributed systems, databases, caching, queues",
    jobDescription: "Design scalable backend systems and lead technical decisions across teams.",
    jobExperience: "6",
    interviewType: "system-design",
  },
  {
    name: "Graduate / internship",
    jobPosition: "Software Engineering Intern",
    techStacks: "Data structures, algorithms, one programming language",
    jobDescription: "Entry-level role for students and recent graduates: coding fundamentals, learning quickly and teamwork.",
    jobExperience: "0",
    interviewType: "mixed",
  },
];

const LIMITS = { jobPosition: 120, company: 120, techStacks: 500, jobDescription: 5000 };

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Validates the new interview form. Accepts a plain object or anything with a
 * `get(name)` method (such as FormData). Returns `{ ok: true, values }` or
 * `{ ok: false, error }` with a message for the user.
 */
export function parseInterviewSettings(input) {
  const get = (name) => (typeof input?.get === "function" ? input.get(name) : input?.[name]);

  const jobPosition = text(get("jobPosition"));
  const company = text(get("company"));
  const techStacks = text(get("techStacks"));
  const jobDescription = text(get("jobDescription"));
  const interviewType = text(get("interviewType")) || DEFAULT_SETTINGS.interviewType;
  const difficulty = text(get("difficulty")) || DEFAULT_SETTINGS.difficulty;
  const experienceText = text(String(get("jobExperience") ?? ""));
  const countText = text(String(get("questionCount") ?? ""));

  if (jobPosition.length < 2) return { ok: false, error: "Enter the job title you're preparing for." };
  if (jobPosition.length > LIMITS.jobPosition) return { ok: false, error: `Keep the job title under ${LIMITS.jobPosition} characters.` };
  if (company.length > LIMITS.company) return { ok: false, error: `Keep the company name under ${LIMITS.company} characters.` };
  if (techStacks.length > LIMITS.techStacks) return { ok: false, error: `Keep the tech stack under ${LIMITS.techStacks} characters.` };
  if (jobDescription.length > LIMITS.jobDescription) {
    return { ok: false, error: `Keep the job description under ${LIMITS.jobDescription} characters.` };
  }

  if (!(interviewType in INTERVIEW_TYPES)) return { ok: false, error: "Choose an interview type." };
  if (!(difficulty in DIFFICULTIES)) return { ok: false, error: "Choose a difficulty." };

  if (INTERVIEW_TYPES[interviewType].needsTechStack && techStacks.length === 0) {
    return { ok: false, error: `Add the tech stack or skills for a ${INTERVIEW_TYPES[interviewType].label.toLowerCase()} interview.` };
  }

  const years = Number(experienceText);
  if (experienceText === "" || !Number.isInteger(years) || years < 0 || years > 50) {
    return { ok: false, error: "Years of experience must be a whole number from 0 to 50." };
  }

  const questionCount = countText === "" ? QUESTION_COUNT.default : Number(countText);
  if (!Number.isInteger(questionCount) || questionCount < QUESTION_COUNT.min || questionCount > QUESTION_COUNT.max) {
    return { ok: false, error: `Choose between ${QUESTION_COUNT.min} and ${QUESTION_COUNT.max} questions.` };
  }

  return {
    ok: true,
    values: {
      jobPosition,
      company,
      techStacks,
      jobDescription,
      jobExperience: String(years),
      interviewType,
      difficulty,
      questionCount,
    },
  };
}

/** Advice shown before and during the interview, by interview type. */
export const INTERVIEW_TIPS = {
  technical: [
    "Think out loud: interviewers score your reasoning, not just the final answer.",
    "Start with a short direct answer, then add detail and an example from your work.",
    "Mention trade-offs and when you would choose a different approach.",
  ],
  behavioral: [
    "Use STAR: the Situation, your Task, the Actions you took, and the Result.",
    "Say \"I\", not \"we\". The interviewer wants your personal contribution.",
    "End with a measurable result and what you learned.",
  ],
  "system-design": [
    "Clarify requirements and scale first (users, traffic, data size).",
    "Sketch the high-level design, then go deep on one or two components.",
    "Call out bottlenecks, failure modes and the trade-offs you are making.",
  ],
  hr: [
    "Be specific and honest. Concrete examples beat general claims.",
    "Connect your answers to this role and company.",
    "Keep answers to one or two minutes.",
  ],
  mixed: [
    "For technical questions, think out loud and mention trade-offs.",
    "For behavioral questions, use STAR: Situation, Task, Action, Result.",
    "Keep each answer to one to three minutes.",
  ],
};

export function interviewTips(type) {
  return INTERVIEW_TIPS[type] ?? INTERVIEW_TIPS.technical;
}
