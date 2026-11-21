import { A, H2, List, P, PageTitle } from "@/components/site/Prose";
import { SITE } from "@/utils/site";

export const metadata = {
  title: "Privacy policy",
  description: "What AI Mock Interview stores, what it never stores, and how to export or delete your data.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <article>
      <PageTitle title="Privacy policy" updated="22 November 2026" />

      <P>
        AI Mock Interview is a free, open-source tool for practicing job interviews. This page explains what data the app handles, why, and the
        choices you have. It describes the app as built in its <A href={SITE.repoUrl}>public source code</A>.
      </P>

      <H2>What we store</H2>
      <List>
        <li>
          <strong>Your account.</strong> Sign-up and sign-in are handled by Clerk, which stores your name, email address and sign-in details (or the
          profile from Google or Facebook if you sign in with them). The app uses your user ID, first name and email address to show you your own
          interviews.
        </li>
        <li>
          <strong>Your interviews.</strong> The job title, company, job description, tech stack and experience you enter, the settings you choose,
          and the generated questions and model answers.
        </li>
        <li>
          <strong>Your answers.</strong> The text of each answer (typed, or transcribed by your browser), the AI scores and feedback, and delivery
          statistics such as speaking time and words per minute.
        </li>
        <li>
          <strong>Usage counters.</strong> How many AI requests your account made each day, to enforce the daily limits.
        </li>
      </List>

      <H2>What we never store</H2>
      <List>
        <li>
          <strong>Video or audio.</strong> The camera preview stays in your browser and is never uploaded. Your voice never reaches our servers:
          your browser turns speech into text. In Chrome and Edge, the browser&apos;s built-in speech recognition sends audio to Google&apos;s or
          Microsoft&apos;s speech service to do this, under their own privacy terms.
        </li>
        <li>
          <strong>Your resume file.</strong> A resume you upload is sent to Google Gemini once, to write your questions, and is then discarded. We
          only record that a resume was used.
        </li>
      </List>

      <H2>How AI is used</H2>
      <P>
        Questions, answer reviews and reports are generated with the Google Gemini API. The text you enter, your answers and any resume you upload
        are sent to Google for this, and Google processes them under the{" "}
        <A href="https://ai.google.dev/gemini-api/terms">Gemini API terms</A>. When the free Gemini tier is used, Google may use submitted content
        to improve its products, and human reviewers may read it. Don&apos;t include information you wouldn&apos;t want processed this way, such as
        passwords or ID numbers.
      </P>

      <H2>Service providers</H2>
      <List>
        <li>
          <strong>Clerk</strong>: accounts and sign-in.
        </li>
        <li>
          <strong>Neon</strong>: the Postgres database, hosted on AWS in the United States.
        </li>
        <li>
          <strong>Google</strong>: the Gemini API, for questions, feedback and reports.
        </li>
        <li>
          <strong>Vercel</strong>: hosting. Vercel Web Analytics and Speed Insights record anonymous page views and performance data without
          cookies.
        </li>
      </List>

      <H2>Cookies</H2>
      <P>The app only uses the essential cookies Clerk sets to keep you signed in. There are no advertising or tracking cookies.</P>

      <H2>Keeping and deleting your data</H2>
      <P>Your data is kept until you delete it. You can:</P>
      <List>
        <li>delete any single interview from your dashboard,</li>
        <li>download all of your data as a JSON file from Settings,</li>
        <li>delete all of your interviews, answers and usage records from Settings,</li>
        <li>delete your account from Settings, under Manage account.</li>
      </List>
      <P>
        Deleting your account doesn&apos;t delete your interviews automatically, so delete your data in Settings first if you want everything
        gone.
      </P>

      <H2>Security</H2>
      <P>
        Database and AI credentials never leave the server, every request checks that you own the data it touches, and all traffic uses HTTPS. To
        report a security problem, please use a <A href={`${SITE.repoUrl}/security/advisories/new`}>private security advisory</A>.
      </P>

      <H2>Children</H2>
      <P>The app isn&apos;t intended for children under 16.</P>

      <H2>Copies run by others</H2>
      <P>
        Because the code is open source, anyone can run their own copy. This policy covers this deployment only. Whoever runs another copy is
        responsible for it and its data.
      </P>

      <H2>Changes and contact</H2>
      <P>
        If this policy changes, the new version is posted here with a new date. For questions, open an issue on{" "}
        <A href={`${SITE.repoUrl}/issues`}>GitHub</A>.
      </P>
    </article>
  );
}
