"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CircleCheck,
  CodeXml,
  FileText,
  HeartHandshake,
  Info,
  LoaderCircle,
  Network,
  Shuffle,
  Sparkles,
  Upload,
  Users,
  X,
} from "lucide-react";

import { createInterview } from "@/actions/interview";
import { startNavigationProgress } from "@/components/site/NavigationProgress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { actionErrorMessage, classifyActionError, toastActionError } from "@/lib/action-error";
import { useDraft, writeDraft } from "@/lib/drafts";
import { cn } from "@/lib/utils";
import {
  DIFFICULTIES,
  INTERVIEW_TYPES,
  QUESTION_COUNT,
  TEMPLATES,
  isDifficulty,
  isInterviewType,
  parseInterviewSettings,
} from "@/utils/interview-options";
import { RESUME_MAX_BYTES } from "@/utils/resume";

const TYPE_ICONS = {
  technical: CodeXml,
  behavioral: Users,
  "system-design": Network,
  hr: HeartHandshake,
  mixed: Shuffle,
};

const DRAFT_KEY = "new-interview";

/**
 * The saved draft's fields that are still valid, so an old or edited draft can
 * never put the form in a state it can't show (the server validates again).
 */
function validDraft(draft) {
  if (!draft || typeof draft !== "object") return {};
  const fields = {};
  for (const name of ["jobPosition", "company", "techStacks", "jobDescription", "jobExperience"]) {
    if (typeof draft[name] === "string") fields[name] = draft[name];
  }
  if (isInterviewType(draft.interviewType)) fields.interviewType = draft.interviewType;
  if (isDifficulty(draft.difficulty)) fields.difficulty = draft.difficulty;
  const count = Number(draft.questionCount);
  if (Number.isInteger(count) && count >= QUESTION_COUNT.min && count <= QUESTION_COUNT.max) fields.questionCount = count;
  return fields;
}

function formatBytes(bytes) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** A numbered card of the form. */
function Section({ step, title, description, children }) {
  return (
    <section className="surface p-6 sm:p-8">
      <div className="mb-7 flex items-start gap-4">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-[#0c0c0f] font-mono text-sm font-medium text-ember-2 shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]">
          {step}
        </span>
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({ id, label, hint, optional, children }) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="flex items-baseline justify-between gap-2 text-sm font-medium">
        <span>
          {label}
          {optional && <span className="ml-1.5 font-normal text-muted-foreground">(optional)</span>}
        </span>
        {hint && <span className="font-mono text-[11px] font-normal text-muted-foreground">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

/** Messages shown in turn while the interview is being generated. */
function progressMessages(values, hasResume) {
  return [
    hasResume ? "Reading your resume…" : "Studying the role…",
    `Writing ${INTERVIEW_TYPES[values.interviewType].label.toLowerCase()} questions…`,
    "Adding model answers and tips…",
    "Almost ready…",
  ];
}

/**
 * The new-interview form. What's typed is kept as a draft (lib/drafts.js), so
 * a reload or a discarded tab doesn't lose a pasted job description.
 * `requestedType` comes from a ?type= link and wins over the draft's type.
 */
export default function NewInterviewForm({ defaultQuestionCount, requestedType = null, remainingToday }) {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const draft = useDraft(DRAFT_KEY);
  // null = untouched: show the defaults with the saved draft on top.
  const [edited, setEdited] = useState(null);
  const values = edited ?? {
    jobPosition: "",
    company: "",
    techStacks: "",
    jobDescription: "",
    jobExperience: "",
    interviewType: "technical",
    difficulty: "medium",
    questionCount: defaultQuestionCount,
    ...validDraft(draft),
    ...(requestedType ? { interviewType: requestedType } : {}),
  };
  const setValues = (changes) => setEdited((current) => ({ ...(current ?? values), ...changes }));
  const [resume, setResume] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const type = INTERVIEW_TYPES[values.interviewType];
  const outOfInterviews = remainingToday === 0;

  // Cycle through the progress messages while waiting for the AI.
  useEffect(() => {
    if (!submitting) return;
    const timer = setInterval(() => setProgress((step) => Math.min(step + 1, 3)), 3500);
    return () => clearInterval(timer);
  }, [submitting]);

  // Keep the form as a draft once something has been changed.
  useEffect(() => {
    if (edited) writeDraft(DRAFT_KEY, edited);
  }, [edited]);

  const update = (name) => (event) => setValues({ [name]: event.target.value });

  const applyTemplate = (template) => {
    const { name, ...fields } = template;
    setValues(fields);
    setError("");
    toast.success(`Filled in "${name}". Adjust anything you like.`);
  };

  const chooseResume = (file) => {
    if (!file) return;
    if (file.type && file.type !== "application/pdf") {
      toast.error("Please choose a PDF file.");
      return;
    }
    if (file.size > RESUME_MAX_BYTES) {
      toast.error("Your resume must be under 4 MB.");
      return;
    }
    setResume(file);
  };

  const removeResume = () => {
    setResume(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");

    // The same rules the server applies, checked here first for instant feedback.
    const check = parseInterviewSettings(values);
    if (!check.ok) {
      setError(check.error);
      return;
    }

    const formData = new FormData();
    for (const [name, value] of Object.entries(check.values)) formData.set(name, String(value));
    if (resume) formData.set("resume", resume);

    setProgress(0);
    setSubmitting(true);
    try {
      const result = await createInterview(formData);
      if (result?.success) {
        writeDraft(DRAFT_KEY, null);
        toast.success("Your interview is ready.");
        startNavigationProgress();
        router.push(`/dashboard/interview/${result.mockId}`);
        return; // keep the loading state until the next page loads
      }
      setError(result?.error ?? "Could not create the interview. Please try again.");
    } catch (submitError) {
      console.error("Failed to create interview:", submitError);
      // An out-of-date page also gets a Reload button; the form comes back from the draft.
      if (classifyActionError(submitError) === "stale") toastActionError(submitError);
      setError(actionErrorMessage(submitError, "Something went wrong. Check your connection and try again."));
    }
    setSubmitting(false);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {/* Templates */}
      <div className="pb-4">
        <p className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4 text-ember-2" aria-hidden="true" /> Start from a template
        </p>
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map((template) => (
            <button
              key={template.name}
              type="button"
              onClick={() => applyTemplate(template)}
              disabled={submitting}
              className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-[13px] text-foreground/85 transition-colors duration-300 hover:border-primary/40 hover:bg-primary/[0.07] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 disabled:opacity-50"
            >
              {template.name}
            </button>
          ))}
        </div>
      </div>

      <Section step={1} title="The role" description="The more detail you give, the more realistic the questions.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="jobPosition" label="Job title">
            <Input
              id="jobPosition"
              value={values.jobPosition}
              onChange={update("jobPosition")}
              placeholder="e.g. Frontend Developer"
              maxLength={120}
              required
            />
          </Field>
          <Field id="company" label="Company" optional>
            <Input id="company" value={values.company} onChange={update("company")} placeholder="e.g. Atlassian" maxLength={120} />
          </Field>
          <Field id="jobExperience" label="Years of experience">
            <Input
              id="jobExperience"
              type="number"
              inputMode="numeric"
              min={0}
              max={50}
              value={values.jobExperience}
              onChange={update("jobExperience")}
              placeholder="0–50"
              required
            />
          </Field>
          <Field id="techStacks" label="Tech stack or key skills" optional={!type.needsTechStack}>
            <Input
              id="techStacks"
              value={values.techStacks}
              onChange={update("techStacks")}
              placeholder={type.needsTechStack ? "e.g. React, Node.js, PostgreSQL" : "e.g. stakeholder management, roadmaps"}
              maxLength={500}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field id="jobDescription" label="Job description" optional hint={`${values.jobDescription.length}/5000`}>
              <Textarea
                id="jobDescription"
                value={values.jobDescription}
                onChange={update("jobDescription")}
                placeholder="Paste the job posting, or describe the responsibilities."
                maxLength={5000}
                className="min-h-[132px]"
              />
            </Field>
          </div>
        </div>
      </Section>

      <Section step={2} title="Interview style" description="Pick the kind of round you want to rehearse.">
        <fieldset>
          <legend className="sr-only">Interview type</legend>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(INTERVIEW_TYPES).map(([id, option]) => {
              const Icon = TYPE_ICONS[id];
              const selected = values.interviewType === id;
              return (
                <label
                  key={id}
                  className={cn(
                    "relative flex cursor-pointer gap-3.5 rounded-xl border border-white/[0.08] bg-black/20 p-4 transition-[border-color,background-color,transform] duration-300 ease-out-expo hover:-translate-y-0.5 hover:border-white/15 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/70",
                    selected && "border-primary/50 bg-primary/[0.07] hover:border-primary/50"
                  )}
                >
                  <input
                    type="radio"
                    name="interviewType"
                    value={id}
                    checked={selected}
                    onChange={update("interviewType")}
                    className="sr-only"
                  />
                  <span
                    className={cn(
                      "grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white/[0.05] text-muted-foreground transition-colors duration-300",
                      selected && "bg-primary/15 text-ember-2"
                    )}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="pr-4">
                    <span className="block font-medium">{option.label}</span>
                    <span className="mt-0.5 block text-sm leading-snug text-muted-foreground">{option.description}</span>
                  </span>
                  {selected && <CircleCheck className="absolute right-3 top-3 h-4 w-4 text-ember-2" aria-hidden="true" />}
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-9 grid gap-8 md:grid-cols-2">
          <fieldset>
            <legend className="mb-3 text-sm font-medium">Difficulty</legend>
            <div className="grid grid-cols-3 gap-1 rounded-full border border-white/[0.08] bg-black/20 p-1">
              {Object.entries(DIFFICULTIES).map(([id, option]) => (
                <label
                  key={id}
                  title={option.description}
                  className={cn(
                    "cursor-pointer rounded-full px-3 py-2 text-center text-sm font-medium text-muted-foreground transition-[background-color,color,box-shadow] duration-300 ease-out-expo hover:text-foreground has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/70",
                    values.difficulty === id && "bg-white/[0.09] text-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.08)]"
                  )}
                >
                  <input
                    type="radio"
                    name="difficulty"
                    value={id}
                    checked={values.difficulty === id}
                    onChange={update("difficulty")}
                    className="sr-only"
                  />
                  {option.label}
                </label>
              ))}
            </div>
            <p className="mt-2.5 text-xs text-muted-foreground">{DIFFICULTIES[values.difficulty].description}</p>
          </fieldset>

          <div>
            <label htmlFor="questionCount" className="mb-3 flex items-baseline justify-between text-sm font-medium">
              <span>Number of questions</span>
              <span className="font-serif text-2xl italic text-ember-2">{values.questionCount}</span>
            </label>
            <input
              id="questionCount"
              type="range"
              min={QUESTION_COUNT.min}
              max={QUESTION_COUNT.max}
              step={1}
              value={values.questionCount}
              onChange={update("questionCount")}
              className="w-full rounded-full accent-[#ff813d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-4 focus-visible:ring-offset-card"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              About {Math.round(Number(values.questionCount) * 2.5)} minutes if you answer each in two to three minutes.
            </p>
          </div>
        </div>
      </Section>

      <Section
        step={3}
        title="Tailor it to your resume"
        description="Optional. The interviewer will ask about your real projects and experience."
      >
        {resume ? (
          <div className="flex items-center gap-4 rounded-xl border border-emerald-400/25 bg-emerald-400/[0.06] p-4">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-400/15 text-emerald-300">
              <FileText className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{resume.name}</p>
              <p className="text-sm text-muted-foreground">{formatBytes(resume.size)} · ready to use</p>
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={removeResume} disabled={submitting} aria-label="Remove resume">
              <X />
            </Button>
          </div>
        ) : (
          <label
            htmlFor="resume"
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              chooseResume(event.dataTransfer.files?.[0]);
            }}
            className={cn(
              "group flex cursor-pointer flex-col items-center justify-center gap-2.5 rounded-xl border border-dashed border-white/15 bg-black/20 px-6 py-12 text-center transition-colors duration-300 hover:border-primary/40 hover:bg-primary/[0.04] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/70",
              dragging && "border-primary/60 bg-primary/[0.08]"
            )}
          >
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-ember-2 transition-transform duration-500 ease-out-expo group-hover:-translate-y-0.5">
              <Upload className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="font-medium">
              Drop your resume here or <span className="text-ember-1 underline decoration-ember-2/50 underline-offset-4">browse</span>
            </span>
            <span className="text-sm text-muted-foreground">PDF, up to 4 MB</span>
            <input
              ref={fileInputRef}
              id="resume"
              type="file"
              accept="application/pdf,.pdf"
              className="sr-only"
              onChange={(event) => chooseResume(event.target.files?.[0])}
            />
          </label>
        )}
        <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Your resume is sent to Google Gemini only to write these questions. It is never stored.
        </p>
      </Section>

      {error && (
        <p role="alert" className="rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse items-center justify-between gap-4 pt-4 sm:flex-row">
        <p className="text-sm text-muted-foreground">
          {remainingToday === null
            ? "Generation takes about 10 seconds."
            : outOfInterviews
              ? "You've used today's interviews. Come back tomorrow!"
              : `${remainingToday} new ${remainingToday === 1 ? "interview" : "interviews"} left today.`}
        </p>
        <Button type="submit" variant="gradient" size="xl" disabled={submitting || outOfInterviews} className="w-full sm:w-auto">
          {submitting ? (
            <>
              <LoaderCircle className="animate-spin" aria-hidden="true" />
              <span aria-live="polite">{progressMessages(values, Boolean(resume))[progress]}</span>
            </>
          ) : (
            <>
              <Sparkles aria-hidden="true" /> Generate my interview
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
