"use client";

import { useEffect, useMemo, useState } from "react";

interface Pet {
  id: string;
  petName: string | null;
  breed: string | null;
  color: string | null;
  weight: string | null;
  sex: string | null;
  spayedNeutered: boolean;
  medicalIssues: string | null;
  allergies: string | null;
  vetName: string | null;
  vetPhone: string | null;
  rabiesCurrent: boolean;
  rabiesExpiration: string | null;
  behavior: string | null;
  groomingNotes: string | null;
  lastGroomed: string | null;
}

interface Lead {
  id: string;
  fullName: string | null;
  phone: string;
  projectType: string | null;
  projectDetails: string | null;
  leadTemperature: string | null;
  summary: string | null;
  appointmentStart: string | null;
  updatedAt: string;
  pets: Pet[];
}

interface DashboardData {
  todayAppointments: Lead[];
  recentCalls: Lead[];
  allPets: Lead[];
}

type Tab = "today" | "recent" | "pets";

// ─── helpers ────────────────────────────────────────────────────────────────

function fmtTime(dt: string | null): string {
  if (!dt) return "—";
  return new Date(dt).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function timeAgo(dt: string): string {
  const m = Math.floor((Date.now() - new Date(dt).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function fmtDate(dt: string | null): string | null {
  if (!dt) return null;
  return new Date(dt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── tiny components ─────────────────────────────────────────────────────────

function TempBadge({ temp }: { temp: string | null }) {
  if (temp === "hot")
    return (
      <span className="bg-red-100 text-red-700 text-sm font-semibold px-3 py-1 rounded-full whitespace-nowrap">
        🔥 Hot
      </span>
    );
  if (temp === "warm")
    return (
      <span className="bg-amber-100 text-amber-700 text-sm font-semibold px-3 py-1 rounded-full whitespace-nowrap">
        ☀️ Warm
      </span>
    );
  return (
    <span className="bg-gray-100 text-gray-500 text-sm font-semibold px-3 py-1 rounded-full whitespace-nowrap">
      ❄️ Cold
    </span>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div className="flex gap-2 text-base leading-snug">
      <span className="text-gray-400 shrink-0 w-28 text-sm pt-0.5">{label}</span>
      <span className="text-gray-800">{value}</span>
    </div>
  );
}

// ─── section: today ───────────────────────────────────────────────────────────

function TodaySection({ leads }: { leads: Lead[] }) {
  if (leads.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400 text-lg">
        No appointments today 🎉
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {leads.map((lead) => {
        const pet = lead.pets[0];
        return (
          <div
            key={lead.id}
            className="bg-white rounded-2xl shadow-sm border border-green-100 border-l-4 border-l-green-600 p-5"
          >
            <div className="text-4xl font-bold text-green-700 mb-2 tabular-nums">
              {fmtTime(lead.appointmentStart)}
            </div>

            <div className="text-xl font-semibold text-gray-900 mb-0.5">
              {pet?.petName ?? "—"}
              {pet?.breed && (
                <span className="text-gray-400 font-normal text-base ml-2">
                  {pet.breed}
                </span>
              )}
            </div>

            <div className="text-base text-gray-600 mb-1">
              Owner: <span className="font-medium text-gray-800">{lead.fullName ?? "Unknown"}</span>
            </div>

            {lead.projectType && (
              <div className="text-base text-gray-600 mb-3">
                Service: <span className="font-medium text-gray-800">{lead.projectType}</span>
              </div>
            )}

            <a
              href={`tel:${lead.phone}`}
              className="inline-flex items-center gap-2 bg-green-50 text-green-700 font-semibold text-base px-4 py-2.5 rounded-xl active:bg-green-100 transition-colors"
            >
              📞 {lead.phone}
            </a>
          </div>
        );
      })}
    </div>
  );
}

// ─── section: recent calls ────────────────────────────────────────────────────

function RecentSection({ leads }: { leads: Lead[] }) {
  if (leads.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400 text-lg">
        No recent calls yet
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {leads.map((lead) => {
        const pet = lead.pets[0];
        const dogLine = [pet?.petName, pet?.breed]
          .filter(Boolean)
          .join(" · ");
        return (
          <div
            key={lead.id}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="text-lg font-semibold text-gray-900 leading-tight">
                {lead.fullName ?? "Unknown"}
              </div>
              <TempBadge temp={lead.leadTemperature} />
            </div>

            <a
              href={`tel:${lead.phone}`}
              className="text-green-700 font-medium text-base block mb-2"
            >
              📞 {lead.phone}
            </a>

            {(dogLine || lead.projectDetails) && (
              <div className="text-base text-gray-600 mb-2">
                🐶 {dogLine || lead.projectDetails}
              </div>
            )}

            {lead.summary && (
              <p className="text-base text-gray-700 bg-gray-50 rounded-xl px-4 py-3 mt-2 leading-relaxed">
                {lead.summary}
              </p>
            )}

            <div className="text-sm text-gray-400 mt-3">
              Updated {timeAgo(lead.updatedAt)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── section: all pets ────────────────────────────────────────────────────────

function PetCard({ lead }: { lead: Lead }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-5">
      <div className="text-base text-green-700 font-medium mb-3">
        {lead.fullName ?? "Unknown owner"} ·{" "}
        <a href={`tel:${lead.phone}`} className="underline underline-offset-2">
          {lead.phone}
        </a>
      </div>

      {lead.pets.map((pet, i) => (
        <div
          key={pet.id}
          className={i > 0 ? "mt-4 pt-4 border-t border-green-50" : ""}
        >
          <div className="text-xl font-bold text-gray-900 mb-3">
            🐾 {pet.petName ?? "Unnamed"}
          </div>
          <div className="space-y-2">
            <InfoRow label="Breed" value={pet.breed} />
            <InfoRow label="Weight" value={pet.weight} />
            <InfoRow
              label="Sex"
              value={
                pet.sex
                  ? `${pet.sex}${pet.spayedNeutered ? " · spayed/neutered" : ""}`
                  : pet.spayedNeutered
                  ? "Spayed/neutered"
                  : null
              }
            />
            <InfoRow label="Color" value={pet.color} />
            <InfoRow label="Behavior" value={pet.behavior} />
            <InfoRow label="Medical" value={pet.medicalIssues} />
            <InfoRow label="Allergies" value={pet.allergies} />
            <InfoRow
              label="Vet"
              value={
                pet.vetName
                  ? `${pet.vetName}${pet.vetPhone ? ` · ${pet.vetPhone}` : ""}`
                  : null
              }
            />
            <InfoRow
              label="Rabies"
              value={
                pet.rabiesCurrent
                  ? `✅ Current${pet.rabiesExpiration ? ` · exp. ${pet.rabiesExpiration}` : ""}`
                  : "❌ Not current"
              }
            />
            <InfoRow label="Last groomed" value={fmtDate(pet.lastGroomed)} />
            <InfoRow label="Notes" value={pet.groomingNotes} />
          </div>
        </div>
      ))}
    </div>
  );
}

function PetsSection({ leads }: { leads: Lead[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return leads;
    return leads.filter(
      (l) =>
        l.fullName?.toLowerCase().includes(q) ||
        l.pets.some((p) => p.petName?.toLowerCase().includes(q))
    );
  }, [leads, search]);

  return (
    <div>
      <div className="mb-4">
        <input
          type="search"
          placeholder="Search by owner or dog name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-green-200 rounded-2xl px-4 py-3.5 text-base bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-lg">
          {search ? "No matches found" : "No pets in the system yet"}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((lead) => (
            <PetCard key={lead.id} lead={lead} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<Tab>("today");

  useEffect(() => {
    fetch("/api/dashboard/leads")
      .then((r) => {
        if (!r.ok) throw new Error("Failed");
        return r.json() as Promise<DashboardData>;
      })
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const tabs: { id: Tab; label: string; count: number | undefined }[] = [
    { id: "today", label: "Today", count: data?.todayAppointments.length },
    { id: "recent", label: "Recent", count: data?.recentCalls.length },
    { id: "pets", label: "Pets", count: data?.allPets.length },
  ];

  return (
    <div className="min-h-screen bg-green-50">
      {/* header */}
      <div className="bg-green-700 text-white px-4 pb-4 pt-6">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-bold">🐾 Angela&apos;s Dashboard</h1>
          <p className="text-green-300 text-sm mt-0.5">Emily AI · Live data</p>
        </div>
      </div>

      {/* tab bar */}
      <div className="bg-white border-b border-green-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-lg mx-auto flex">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-4 text-base font-semibold transition-colors ${
                tab === t.id
                  ? "text-green-700 border-b-2 border-green-700"
                  : "text-gray-400"
              }`}
            >
              {t.label}
              {!!t.count && (
                <span
                  className={`ml-1.5 text-xs rounded-full px-1.5 py-0.5 ${
                    tab === t.id
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* content */}
      <div className="max-w-lg mx-auto px-4 py-5 pb-20">
        {loading && (
          <div className="text-center py-24 text-gray-400 text-lg animate-pulse">
            Loading…
          </div>
        )}
        {error && (
          <div className="text-center py-24 text-red-500 text-base">
            Couldn&apos;t load data — please refresh.
          </div>
        )}
        {data && tab === "today" && (
          <TodaySection leads={data.todayAppointments} />
        )}
        {data && tab === "recent" && (
          <RecentSection leads={data.recentCalls} />
        )}
        {data && tab === "pets" && <PetsSection leads={data.allPets} />}
      </div>
    </div>
  );
}
