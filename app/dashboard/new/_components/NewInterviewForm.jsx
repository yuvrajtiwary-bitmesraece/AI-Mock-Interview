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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  DIFFICULTIES,
  INTERVIEW_TYPES,
  QUESTION_COUNT,
  TEMPLATES,
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

const fieldClass = "bg-white/[0.04] border-white/10 placeholder:text-muted-foreground/70 focus-visible:ring-primary";

function formatBytes(bytes) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function Section({ step, title, description, children }) {
  return (
    <section className="glass p-6 sm:p-8">
      <div className="mb-6 flex items-start gap-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 font-mono text-sm font-semibold text-primary">
          {step}
        </span>
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
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
        {hint && <span className="text-xs font-normal text-muted-foreground">{hint}</span>}
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

export default function NewInterviewForm({ defaultQuestionCount, defaultType = "technical", remainingToday }) {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [values, setValues] = useState({
    jobPosition: "",
    company: "",
    techStacks: "",
    jobDescription: "",
    jobExperience: "",
    interviewType: defaultType,
    difficulty: "medium",
    questionCount: defaultQuestionCount,
  });
  const [resume, setResume] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const type = INTERVIEW_TYPES[values.interviewType];
  const outOfInterviews = remainingToday === 0;

  // Cycle through progress messages while waiting for the AI.
  useEffect(() => {
    if (!submitting) return;
    const timer = setInterval(() => setProgress((step) => Math.min(step + 1, 3)), 3500);
    return () => clearInterval(timer);
  }, [submitting]);

  const update = (name) => (event) => setValues((current) => ({ ...current, [name]: event.target.value }));

  const applyTemplate = (template) => {
    const { name, ...fields } = template;
    setValues((current) => ({ ...current, ...fields }));
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

    // Same rules the server applies, checked here first for instant feedback.
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
        toast.success("Your interview is ready.");
        router.push(`/dashboard/interview/${result.mockId}`);
        return; // keep the loading state until the next page loads
      }
      setError(result?.error ?? "Could not create the interview. Please try again.");
    } catch (submitError) {
      console.error("Failed to create interview:", submitError);
      setError("Something went wrong. Check your connection and try again.");
    }
    setSubmitting(false);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      {/* Templates */}
      <div>
        <p className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" /> Start from a template
        </p>
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map((template) => (
            <button
              key={template.name}
              type="button"
              onClick={() => applyTemplate(template)}
              disabled={submitting}
              className="rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-sm text-foreground/90 transition-colors hover:border-primary/50 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
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
              className={fieldClass}
            />
          </Field>
          <Field id="company" label="Company" optional>
            <Input
              id="company"
              value={values.company}
              onChange={update("company")}
              placeholder="e.g. Atlassian"
              maxLength={120}
              className={fieldClass}
            />
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
              className={fieldClass}
            />
          </Field>
          <Field id="techStacks" label="Tech stack or key skills" optional={!type.needsTechStack}>
            <Input
              id="techStacks"
              value={values.techStacks}
              onChange={update("techStacks")}
              placeholder={type.needsTechStack ? "e.g. React, Node.js, PostgreSQL" : "e.g. stakeholder management, roadmaps"}
              maxLength={500}
              className={fieldClass}
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
                className={cn(fieldClass, "min-h-[120px]")}
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
                    "relative flex cursor-pointer gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4 transition-colors hover:border-white/20 hover:bg-white/[0.05] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                    selected && "border-primary/60 bg-primary/10 hover:border-primary/60 hover:bg-primary/10"
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
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/5 text-muted-foreground",
                      selected && "bg-primary/20 text-primary"
                    )}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block font-semibold">{option.label}</span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">{option.description}</span>
                  </span>
                  {selected && <CircleCheck className="absolute right-3 top-3 h-4 w-4 text-primary" aria-hidden="true" />}
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <fieldset>
            <legend className="mb-3 text-sm font-medium">Difficulty</legend>
            <div className="grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-white/[0.02] p-1">
              {Object.entries(DIFFICULTIES).map(([id, option]) => (
                <label
                  key={id}
                  title={option.description}
                  className={cn(
                    "cursor-pointer rounded-lg px-3 py-2 text-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                    values.difficulty === id && "bg-primary/15 text-foreground"
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
            <p className="mt-2 text-xs text-muted-foreground">{DIFFICULTIES[values.difficulty].description}</p>
          </fieldset>

          <div>
            <label htmlFor="questionCount" className="mb-3 flex items-baseline justify-between text-sm font-medium">
              <span>Number of questions</span>
              <span className="font-mono text-lg font-semibold text-primary">{values.questionCount}</span>
            </label>
            <input
              id="questionCount"
              type="range"
              min={QUESTION_COUNT.min}
              max={QUESTION_COUNT.max}
              step={1}
              value={values.questionCount}
              onChange={update("questionCount")}
              className="w-full accent-cyan-400"
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
          <div className="flex items-center gap-4 rounded-xl border border-emerald-400/30 bg-emerald-400/[0.06] p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-400/15 text-emerald-300">
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
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-10 text-center transition-colors hover:border-primary/50 hover:bg-primary/[0.04] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
              dragging && "border-primary/70 bg-primary/10"
            )}
          >
            <Upload className="h-6 w-6 text-primary" aria-hidden="true" />
            <span className="font-medium">
              Drop your resume here or <span className="text-primary underline underline-offset-4">browse</span>
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
        <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse items-center justify-between gap-4 sm:flex-row">
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
