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
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

// Fixed jobId for testing — replace with a real job UUID from Supabase.
const DEMO_JOB_ID = "cd05ea67-7935-4b2a-84f0-e7d260393d81";

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
}: {
  stage: Stage;
  candidates: Candidate[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[120px] w-44 flex-shrink-0 flex-col rounded-lg border-2 bg-zinc-100/80 p-2 dark:bg-zinc-800/80 ${
        isOver ? "border-zinc-400 dark:border-zinc-500" : "border-zinc-200 dark:border-zinc-700"
      }`}
    >
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {stage}
      </h3>
      <div className="flex min-h-[4rem] flex-1 flex-col gap-2">
        {candidates.length === 0 ? (
          <p className="py-4 text-center text-xs text-zinc-400 dark:text-zinc-500">
            No candidates
          </p>
        ) : (
          candidates.map((c) => <DraggableCard key={c.id} candidate={c} />)
        )}
      </div>
    </div>
  );
}

function DraggableCard({ candidate }: { candidate: Candidate }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: candidate.id,
    data: { candidate },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`cursor-grab rounded-md border border-zinc-200 bg-white p-3 shadow-sm active:cursor-grabbing dark:border-zinc-600 dark:bg-zinc-900 ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <p className="font-medium text-zinc-900 dark:text-zinc-100">{candidate.name}</p>
      {candidate.linkedin_url ? (
        <a
          href={candidate.linkedin_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 block truncate text-xs text-blue-600 hover:underline dark:text-blue-400"
          onClick={(e) => e.stopPropagation()}
        >
          LinkedIn
        </a>
      ) : null}
    </div>
  );
}

function DragOverlayCard({ candidate }: { candidate: Candidate }) {
  return (
    <div className="w-40 rounded-md border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-600 dark:bg-zinc-900">
      <p className="font-medium text-zinc-900 dark:text-zinc-100">{candidate.name}</p>
      {candidate.linkedin_url ? (
        <span className="mt-1 block truncate text-xs text-blue-600 dark:text-blue-400">
          LinkedIn
        </span>
      ) : null}
    </div>
  );
}

export default function CandidatesPage() {
  const router = useRouter();

  const [jobsList, setJobsList] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>(DEMO_JOB_ID);
  const [job, setJob] = useState<Job | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [newName, setNewName] = useState("");
  const [newLinkedIn, setNewLinkedIn] = useState("");
  const [creating, setCreating] = useState(false);
  const [activeCandidate, setActiveCandidate] = useState<Candidate | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Fetch jobs list for dropdown (user's organization)
  useEffect(() => {
    async function fetchJobsList() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile?.organization_id) return;

      const { data: jobs } = await supabase
        .from("jobs")
        .select("id, title")
        .eq("organization_id", profile.organization_id)
        .order("created_at", { ascending: false });
      const list = jobs ?? [];
      setJobsList(list);
      if (list.length > 0 && !list.some((j) => j.id === DEMO_JOB_ID)) {
        setSelectedJobId(list[0].id);
      }
    }
    fetchJobsList();
  }, [router]);

  // Fetch selected job title and candidates when selectedJobId changes
  useEffect(() => {
    async function fetchJobAndCandidates() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      setLoading(true);
      setError(null);

      const { data: jobData } = await supabase
        .from("jobs")
        .select("id, title")
        .eq("id", selectedJobId)
        .maybeSingle();
      setJob(jobData ?? null);

      const { data: candidatesData, error: candidatesError } = await supabase
        .from("candidates")
        .select("id, job_id, name, linkedin_url, stage, created_at")
        .eq("job_id", selectedJobId)
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
  }, [selectedJobId, router]);

  async function handleCreateCandidate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = newName.trim();
    if (!name || !selectedJobId) return;

    setCreating(true);
    setError(null);
    const linkedin_url = newLinkedIn.trim() || null;

    const { data: inserted, error: insertError } = await supabase
      .from("candidates")
      .insert({ job_id: selectedJobId, name, linkedin_url, stage: "Applied" })
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <p className="text-zinc-500 dark:text-zinc-400">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6 dark:bg-zinc-950 sm:p-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/dashboard"
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
        >
          ← Back to dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Candidates
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {job ? job.title : "Test job — set DEMO_JOB_ID to a job UUID from Supabase"}
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

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name…"
            className="w-56 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-400"
            aria-label="Search candidates by name"
          />
          <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <span>Job:</span>
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              aria-label="Filter by job"
            >
              {jobsList.length === 0 ? (
                <option value={DEMO_JOB_ID}>
                  {job ? job.title : "Loading…"}
                </option>
              ) : (
                jobsList.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title}
                  </option>
                ))
              )}
            </select>
          </label>
        </div>

        <div className="mt-4">
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 overflow-x-auto pb-4">
              {STAGES.map((stage) => (
                <KanbanColumn
                  key={stage}
                  stage={stage}
                  candidates={candidatesByStage[stage]}
                />
              ))}
            </div>
            <DragOverlay>
              {activeCandidate ? <DragOverlayCard candidate={activeCandidate} /> : null}
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
