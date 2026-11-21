import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getViewer } from '@/utils/auth'
import { listOwnedInterviews } from '@/utils/queries'
import InterviewList from './_components/InterviewList'

async function Dashboard() {
  const interviews = await listOwnedInterviews(await getViewer())

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-4xl font-bold md:text-5xl">
          <span className="text-gradient">Dashboard</span>
        </h1>
        <p className="mt-3 max-w-xl text-lg text-muted-foreground">
          Create a mock interview for your next role, then review your feedback here.
        </p>
      </header>

      <div className="grid gap-8 md:grid-cols-3">
        <section className="md:col-span-1">
          <div className="glass flex flex-col p-6">
            <div className="mb-4 flex items-center gap-3">
              <Sparkles className="text-primary" size={26} aria-hidden="true" />
              <h2 className="text-xl font-bold">Create a new interview</h2>
            </div>
            <p className="mb-4 text-muted-foreground">
              Pick a role, interview style and difficulty. Upload your resume for questions about your own projects.
            </p>
            <Button asChild variant="gradient" size="lg" className="w-full">
              <Link href="/dashboard/new">
                <Sparkles aria-hidden="true" /> New interview <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </section>

        <section className="md:col-span-2">
          <InterviewList initialInterviews={interviews} />
        </section>
      </div>
    </div>
  )
}

export default Dashboard
