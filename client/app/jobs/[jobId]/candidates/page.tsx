"use client";

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Navbar } from "@/app/components/Navbar";

const STAGES = ["Applied", "Screening", "Interview", "Offer", "Hired"] as const;
type Stage = (typeof STAGES)[number];

type Candidate = {
  id: string;
  job_id: string;
  name: string;
  linkedin_url: string | null;
  stage: Stage;
  created_at: string;
};

type Job = {
  id: string;
  title: string;
};

function isStage(s: string): s is Stage {
  return STAGES.includes(s as Stage);
}

function KanbanColumn({
  stage,
  candidates,
  jobTitle,
}: {
  stage: Stage;
  candidates: Candidate[];
  jobTitle: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[80px] w-52 flex-shrink-0 flex-col rounded-md border bg-zinc-100/90 px-1.5 py-1.5 dark:bg-zinc-800/90 ${
        isOver ? "border-zinc-400 dark:border-zinc-500" : "border-zinc-200 dark:border-zinc-700"
      }`}
    >
      <h3 className="mb-1.5 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {stage}
      </h3>
      <div className="flex min-h-[3rem] flex-1 flex-col gap-1.5 overflow-y-auto">
        {candidates.length === 0 ? (
          <p className="py-2 text-center text-[11px] text-zinc-400 dark:text-zinc-500">
            —
          </p>
        ) : (
          candidates.map((c) => (
            <DraggableCard key={c.id} candidate={c} jobTitle={jobTitle} />
          ))
        )}
      </div>
    </div>
  );
}

function DraggableCard({ candidate, jobTitle }: { candidate: Candidate; jobTitle: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: candidate.id,
    data: { candidate },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`cursor-grab rounded border border-zinc-200 bg-white p-2 shadow-sm active:cursor-grabbing dark:border-zinc-600 dark:bg-zinc-900 ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
        {candidate.name}
      </p>
      {jobTitle ? (
        <p className="mt-0.5 truncate text-[11px] text-zinc-500 dark:text-zinc-400">
          {jobTitle}
        </p>
      ) : null}
      {candidate.linkedin_url ? (
        <a
          href={candidate.linkedin_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-0.5 flex items-center gap-1 text-[11px] text-blue-600 hover:underline dark:text-blue-400"
          onClick={(e) => e.stopPropagation()}
        >
          <LinkedInIcon />
          LinkedIn
        </a>
      ) : null}
    </div>
  );
}

function LinkedInIcon() {
  return (
    <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function DragOverlayCard({
  candidate,
  jobTitle,
}: {
  candidate: Candidate;
  jobTitle: string;
}) {
  return (
    <div className="w-48 rounded border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-600 dark:bg-zinc-900">
      <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
        {candidate.name}
      </p>
      {jobTitle ? (
        <p className="mt-0.5 truncate text-[11px] text-zinc-500 dark:text-zinc-400">
          {jobTitle}
        </p>
      ) : null}
      {candidate.linkedin_url ? (
        <span className="mt-0.5 flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400">
          <LinkedInIcon />
          LinkedIn
        </span>
      ) : null}
    </div>
  );
}

export default function JobCandidatesPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.jobId as string;

  const [job, setJob] = useState<Job | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("customer");
  const [searchQuery, setSearchQuery] = useState("");
  const [newName, setNewName] = useState("");
  const [newLinkedIn, setNewLinkedIn] = useState("");
  const [creating, setCreating] = useState(false);
  const [activeCandidate, setActiveCandidate] = useState<Candidate | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  useEffect(() => {
    if (!jobId) return;

    async function fetchJobAndCandidates() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      setUserEmail(user.email ?? "");
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      setUserRole(profile?.role ?? "customer");

      setLoading(true);
      setError(null);

      const { data: jobData } = await supabase
        .from("jobs")
        .select("id, title")
        .eq("id", jobId)
        .maybeSingle();
      setJob(jobData ?? null);

      const { data: candidatesData, error: candidatesError } = await supabase
        .from("candidates")
        .select("id, job_id, name, linkedin_url, stage, created_at")
        .eq("job_id", jobId)
        .order("created_at", { ascending: true });

      if (candidatesError) {
        setError(candidatesError.message);
        setCandidates([]);
      } else {
        setError(null);
        setCandidates((candidatesData ?? []) as Candidate[]);
      }
      setLoading(false);
    }
    fetchJobAndCandidates();
  }, [jobId, router]);

  async function handleCreateCandidate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = newName.trim();
    if (!name || !jobId) return;

    setCreating(true);
    setError(null);
    const linkedin_url = newLinkedIn.trim() || null;

    const { data: inserted, error: insertError } = await supabase
      .from("candidates")
      .insert({ job_id: jobId, name, linkedin_url, stage: "Applied" })
      .select("id, job_id, name, linkedin_url, stage, created_at")
      .single();

    setCreating(false);
    setNewName("");
    setNewLinkedIn("");

    if (insertError) {
      setError(insertError.message);
      return;
    }
    if (inserted) {
      setCandidates((prev) => [...prev, inserted as Candidate]);
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const c = candidates.find((x) => x.id === event.active.id);
    if (c) setActiveCandidate(c);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveCandidate(null);
    if (!over || active.id === over.id) return;

    const newStage = over.id as string;
    if (!isStage(newStage)) return;

    const candidate = candidates.find((c) => c.id === active.id);
    if (!candidate || candidate.stage === newStage) return;

    setCandidates((prev) =>
      prev.map((c) => (c.id === active.id ? { ...c, stage: newStage } : c))
    );

    const { error: updateError } = await supabase
      .from("candidates")
      .update({ stage: newStage })
      .eq("id", active.id);

    if (updateError) {
      setError(updateError.message);
      setCandidates((prev) =>
        prev.map((c) => (c.id === active.id ? { ...c, stage: candidate.stage } : c))
      );
    }
  }

  const searchLower = searchQuery.trim().toLowerCase();
  const filteredCandidates =
    searchLower === ""
      ? candidates
      : candidates.filter((c) => c.name.toLowerCase().includes(searchLower));

  const candidatesByStage = STAGES.reduce(
    (acc, stage) => ({
      ...acc,
      [stage]: filteredCandidates.filter((c) => c.stage === stage),
    }),
    {} as Record<Stage, Candidate[]>
  );

  if (!jobId) {
    return (
      <div className="min-h-screen bg-zinc-50 p-6 dark:bg-zinc-950 sm:p-8">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300">
          ← Till startsidan
        </Link>
        <p className="mt-4 text-red-600 dark:text-red-400">Missing job ID.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <p className="text-zinc-500 dark:text-zinc-400">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Navbar email={userEmail} role={userRole} />
      <div className="mx-auto max-w-5xl p-6 sm:p-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
        >
          ← Tillbaka till dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Candidates
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {job ? job.title : "Job not found"}
        </p>

        <form
          onSubmit={handleCreateCandidate}
          className="mt-6 flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
        >
          <div className="min-w-[140px] flex-1">
            <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Name
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Candidate name"
              disabled={creating}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
              LinkedIn URL
            </label>
            <input
              type="url"
              value={newLinkedIn}
              onChange={(e) => setNewLinkedIn(e.target.value)}
              placeholder="https://linkedin.com/in/..."
              disabled={creating}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>
          <button
            type="submit"
            disabled={creating || !newName.trim()}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {creating ? "Adding…" : "Add candidate"}
          </button>
        </form>

        {error && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="mt-6">
          <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Search candidates
          </label>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by name…"
            className="w-full max-w-xs rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-400"
            aria-label="Search candidates by name"
          />
        </div>

        <div className="mt-4">
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-2 overflow-x-auto pb-4">
              {STAGES.map((stage) => (
                <KanbanColumn
                  key={stage}
                  stage={stage}
                  candidates={candidatesByStage[stage]}
                  jobTitle={job?.title ?? ""}
                />
              ))}
            </div>
            <DragOverlay>
              {activeCandidate ? (
                <DragOverlayCard
                  candidate={activeCandidate}
                  jobTitle={job?.title ?? ""}
                />
              ) : null}
            </DragOverlay>
          </DndContext>
          {candidates.length === 0 && (
            <p className="mt-3 text-center text-sm text-zinc-500 dark:text-zinc-400">
              Add a candidate above — they will appear in Applied.
            </p>
          )}
          {candidates.length > 0 && filteredCandidates.length === 0 && (
            <p className="mt-3 text-center text-sm text-zinc-500 dark:text-zinc-400">
              No candidates match your search.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
