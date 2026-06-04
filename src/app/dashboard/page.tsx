"use client";

import { useEffect, useMemo, useState } from "react";

// ─── types ────────────────────────────────────────────────────────────────────

interface Pet {
  id: string;
  leadId: string;
  petName: string | null;
  breed: string | null;
  color: string | null;
  weight: string | null;
  dateOfBirth: string | null;
  sex: string | null;
  spayedNeutered: boolean;
  medicalIssues: string | null;
  allergies: string | null;
  vetName: string | null;
  vetPhone: string | null;
  rabiesCurrent: boolean;
  rabiesExpiration: string | null;
  vaccinationsCurrent: boolean;
  temperament: string | null;
  behavior: string | null;
  groomingNotes: string | null;
  lastGroomed: string | null;
}

interface Lead {
  id: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  phone: string;
  secondaryPhone: string | null;
  email: string | null;
  address: string | null;
  projectType: string | null;
  projectDetails: string | null;
  leadTemperature: string | null;
  summary: string | null;
  appointmentBooked: boolean;
  appointmentStart: string | null;
  updatedAt: string;
  pets: Pet[];
}

interface DashboardData {
  todayAppointments: Lead[];
  recentCalls: Lead[];
  allCustomers: Lead[];
}

type Tab = "today" | "recent" | "customers";

type ModalState =
  | { type: "add-customer" }
  | { type: "edit-customer"; lead: Lead }
  | { type: "add-pet"; leadId: string }
  | { type: "edit-pet"; pet: Pet };

// ─── helpers ──────────────────────────────────────────────────────────────────

function ownerName(l: Lead) {
  if (l.firstName || l.lastName) return [l.firstName, l.lastName].filter(Boolean).join(" ");
  return l.fullName ?? l.phone;
}

function fmtTime(dt: string | null) {
  if (!dt) return "—";
  return new Date(dt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function fmtDate(dt: string | null) {
  if (!dt) return null;
  try { return new Date(dt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return dt; }
}

function timeAgo(dt: string) {
  const m = Math.floor((Date.now() - new Date(dt).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── ui primitives ────────────────────────────────────────────────────────────

const inputCls =
  "w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-400 bg-white";

function Field({
  label, value, onChange, type = "text", placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={type} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
      />
    </div>
  );
}

function TextArea({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
      <textarea
        value={value} placeholder={placeholder} rows={3}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls + " resize-none"}
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function CheckField({ label, checked, onChange }: {
  label: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 py-1 cursor-pointer select-none">
      <input
        type="checkbox" checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-5 h-5 accent-green-600 rounded"
      />
      <span className="text-base text-gray-700">{label}</span>
    </label>
  );
}

function TempBadge({ temp }: { temp: string | null }) {
  const styles: Record<string, string> = {
    hot: "bg-red-100 text-red-700", warm: "bg-amber-100 text-amber-700", cold: "bg-gray-100 text-gray-500",
  };
  const labels: Record<string, string> = { hot: "🔥 Hot", warm: "☀️ Warm", cold: "❄️ Cold" };
  const t = temp ?? "cold";
  return (
    <span className={`text-sm font-semibold px-3 py-1 rounded-full whitespace-nowrap ${styles[t] ?? styles.cold}`}>
      {labels[t] ?? labels.cold}
    </span>
  );
}

function TemperamentBadge({ t }: { t: string | null }) {
  if (!t) return null;
  const s: Record<string, string> = {
    Easy: "bg-green-100 text-green-700", Fair: "bg-blue-100 text-blue-700",
    Difficult: "bg-red-100 text-red-700", Nervous: "bg-orange-100 text-orange-700",
    Hyper: "bg-yellow-100 text-yellow-700", Lazy: "bg-gray-100 text-gray-500",
    Other: "bg-purple-100 text-purple-700",
  };
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s[t] ?? "bg-gray-100 text-gray-500"}`}>{t}</span>;
}

// ─── modal wrapper ────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: {
  title: string; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 overflow-y-auto p-4" onClick={onClose}>
      <div className="mx-auto max-w-lg bg-white rounded-2xl p-6 my-8 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-gray-800">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-3xl leading-none w-10 h-10 flex items-center justify-center">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── customer form ────────────────────────────────────────────────────────────

interface CustF { firstName: string; lastName: string; phone: string; secondaryPhone: string; email: string; address: string; }

function CustomerForm({ initial, onSave, onCancel, saving }: {
  initial?: Partial<CustF>; onSave: (f: CustF) => void; onCancel: () => void; saving: boolean;
}) {
  const [f, setF] = useState<CustF>({
    firstName: initial?.firstName ?? "", lastName: initial?.lastName ?? "",
    phone: initial?.phone ?? "", secondaryPhone: initial?.secondaryPhone ?? "",
    email: initial?.email ?? "", address: initial?.address ?? "",
  });
  const upd = (k: keyof CustF) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="First Name" value={f.firstName} onChange={upd("firstName")} />
        <Field label="Last Name" value={f.lastName} onChange={upd("lastName")} />
      </div>
      <Field label="Primary Phone *" value={f.phone} onChange={upd("phone")} type="tel" placeholder="+1 (555) 000-0000" />
      <Field label="Secondary Phone" value={f.secondaryPhone} onChange={upd("secondaryPhone")} type="tel" />
      <Field label="Email" value={f.email} onChange={upd("email")} type="email" />
      <Field label="Address" value={f.address} onChange={upd("address")} />
      <div className="flex gap-3 pt-2">
        <button onClick={() => onSave(f)} disabled={saving || !f.phone.trim()}
          className="flex-1 bg-green-700 text-white font-bold text-base py-4 rounded-xl disabled:opacity-50 active:bg-green-800">
          {saving ? "Saving…" : "Save Customer"}
        </button>
        <button onClick={onCancel}
          className="flex-1 border border-gray-200 text-gray-600 font-semibold text-base py-4 rounded-xl">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── pet form ─────────────────────────────────────────────────────────────────

interface PetF {
  petName: string; breed: string; color: string; weight: string; dateOfBirth: string;
  sex: string; spayedNeutered: boolean; medicalIssues: string; allergies: string;
  vetName: string; vetPhone: string; rabiesCurrent: boolean; rabiesExpiration: string;
  vaccinationsCurrent: boolean; temperament: string; groomingNotes: string; lastGroomed: string;
}

const TEMPERAMENTS = [
  { value: "", label: "— Select temperament —" },
  ...["Easy", "Fair", "Difficult", "Nervous", "Hyper", "Lazy", "Other"].map((v) => ({ value: v, label: v })),
];

const SEX_OPTS = [{ value: "", label: "— Select —" }, { value: "Male", label: "Male" }, { value: "Female", label: "Female" }];

function PetForm({ initial, onSave, onCancel, saving }: {
  initial?: Partial<PetF>; onSave: (f: PetF) => void; onCancel: () => void; saving: boolean;
}) {
  const [f, setF] = useState<PetF>({
    petName: initial?.petName ?? "", breed: initial?.breed ?? "",
    color: initial?.color ?? "", weight: initial?.weight ?? "",
    dateOfBirth: initial?.dateOfBirth ?? "", sex: initial?.sex ?? "",
    spayedNeutered: initial?.spayedNeutered ?? false,
    medicalIssues: initial?.medicalIssues ?? "", allergies: initial?.allergies ?? "",
    vetName: initial?.vetName ?? "", vetPhone: initial?.vetPhone ?? "",
    rabiesCurrent: initial?.rabiesCurrent ?? false,
    rabiesExpiration: initial?.rabiesExpiration ?? "",
    vaccinationsCurrent: initial?.vaccinationsCurrent ?? false,
    temperament: initial?.temperament ?? "", groomingNotes: initial?.groomingNotes ?? "",
    lastGroomed: initial?.lastGroomed ?? "",
  });
  const s = (k: keyof PetF) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const b = (k: keyof PetF) => (v: boolean) => setF((p) => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Pet Name" value={f.petName} onChange={s("petName")} />
        <Field label="Breed" value={f.breed} onChange={s("breed")} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <SelectField label="Sex" value={f.sex} onChange={s("sex")} options={SEX_OPTS} />
        <Field label="Color" value={f.color} onChange={s("color")} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Weight (lbs)" value={f.weight} onChange={s("weight")} placeholder="e.g. 45" />
        <Field label="Date of Birth" value={f.dateOfBirth} onChange={s("dateOfBirth")} type="date" />
      </div>
      <SelectField label="Temperament" value={f.temperament} onChange={s("temperament")} options={TEMPERAMENTS} />
      <TextArea label="Medical Issues" value={f.medicalIssues} onChange={s("medicalIssues")} placeholder="None" />
      <TextArea label="Allergies" value={f.allergies} onChange={s("allergies")} placeholder="None" />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Vet Name" value={f.vetName} onChange={s("vetName")} />
        <Field label="Vet Phone" value={f.vetPhone} onChange={s("vetPhone")} type="tel" />
      </div>
      <div className="border border-gray-100 rounded-xl p-4 space-y-1">
        <p className="text-sm font-semibold text-gray-500 mb-2">Health Status</p>
        <CheckField label="Spayed / Neutered" checked={f.spayedNeutered} onChange={b("spayedNeutered")} />
        <CheckField label="Rabies Vaccination Current" checked={f.rabiesCurrent} onChange={b("rabiesCurrent")} />
        {f.rabiesCurrent && (
          <div className="pl-8">
            <Field label="Rabies Expiration" value={f.rabiesExpiration} onChange={s("rabiesExpiration")} placeholder="e.g. 12/2026" />
          </div>
        )}
        <CheckField label="All Vaccinations Current" checked={f.vaccinationsCurrent} onChange={b("vaccinationsCurrent")} />
      </div>
      <TextArea label="Grooming Notes" value={f.groomingNotes} onChange={s("groomingNotes")} placeholder="Any special instructions…" />
      <Field label="Last Groomed" value={f.lastGroomed} onChange={s("lastGroomed")} type="date" />
      <div className="flex gap-3 pt-2">
        <button onClick={() => onSave(f)} disabled={saving}
          className="flex-1 bg-green-700 text-white font-bold text-base py-4 rounded-xl disabled:opacity-50 active:bg-green-800">
          {saving ? "Saving…" : "Save Pet"}
        </button>
        <button onClick={onCancel}
          className="flex-1 border border-gray-200 text-gray-600 font-semibold text-base py-4 rounded-xl">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── today section ────────────────────────────────────────────────────────────

function TodaySection({ leads }: { leads: Lead[] }) {
  if (!leads.length)
    return <div className="text-center py-20 text-gray-400 text-lg">No appointments today 🎉</div>;
  return (
    <div className="space-y-4">
      {leads.map((lead) => {
        const pet = lead.pets[0];
        return (
          <div key={lead.id} className="bg-white rounded-2xl border-l-4 border-l-green-600 border border-green-100 shadow-sm p-5">
            <div className="text-4xl font-bold text-green-700 mb-2 tabular-nums">{fmtTime(lead.appointmentStart)}</div>
            <div className="text-xl font-semibold text-gray-900">
              {pet?.petName ?? "—"}
              {pet?.breed && <span className="text-gray-400 font-normal text-base ml-2">{pet.breed}</span>}
            </div>
            <div className="text-base text-gray-600 mt-1">Owner: <span className="font-medium text-gray-800">{ownerName(lead)}</span></div>
            {lead.projectType && <div className="text-base text-gray-600">Service: <span className="font-medium">{lead.projectType}</span></div>}
            {lead.summary && <p className="mt-2 text-base text-gray-700 bg-gray-50 rounded-xl px-4 py-3 leading-relaxed">{lead.summary}</p>}
            <a href={`tel:${lead.phone}`} className="mt-3 inline-flex items-center gap-2 bg-green-50 text-green-700 font-semibold text-base px-4 py-2.5 rounded-xl">
              📞 {lead.phone}
            </a>
          </div>
        );
      })}
    </div>
  );
}

// ─── recent section ───────────────────────────────────────────────────────────

function RecentSection({ leads }: { leads: Lead[] }) {
  if (!leads.length)
    return <div className="text-center py-20 text-gray-400 text-lg">No recent calls yet</div>;
  return (
    <div className="space-y-4">
      {leads.map((lead) => {
        const pet = lead.pets[0];
        const dogLine = [pet?.petName, pet?.breed].filter(Boolean).join(" · ");
        return (
          <div key={lead.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="text-lg font-semibold text-gray-900">{ownerName(lead)}</div>
              <TempBadge temp={lead.leadTemperature} />
            </div>
            <a href={`tel:${lead.phone}`} className="text-green-700 font-medium text-base block mb-2">📞 {lead.phone}</a>
            {(dogLine || lead.projectDetails) && (
              <div className="text-base text-gray-600 mb-2">🐶 {dogLine || lead.projectDetails}</div>
            )}
            {lead.appointmentBooked && lead.appointmentStart && (
              <div className="text-base text-green-700 font-medium mb-2">
                📅 {fmtDate(lead.appointmentStart)} at {fmtTime(lead.appointmentStart)}
              </div>
            )}
            {lead.summary && (
              <p className="text-base text-gray-700 bg-gray-50 rounded-xl px-4 py-3 mt-2 leading-relaxed">{lead.summary}</p>
            )}
            <div className="text-sm text-gray-400 mt-3">Updated {timeAgo(lead.updatedAt)}</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── pet mini-card ────────────────────────────────────────────────────────────

function PetCard({ pet, onEdit }: { pet: Pet; onEdit: () => void }) {
  const info = [
    pet.breed,
    pet.color,
    pet.weight ? `${pet.weight} lbs` : null,
    pet.sex ? (pet.spayedNeutered ? `${pet.sex} · spayed/neutered` : pet.sex) : (pet.spayedNeutered ? "Spayed/neutered" : null),
  ].filter(Boolean).join(" · ");

  return (
    <div className="bg-green-50 rounded-xl p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="text-base font-bold text-gray-800">🐾 {pet.petName ?? "Unnamed"}</div>
        <button onClick={onEdit} className="text-sm text-green-700 font-semibold border border-green-200 bg-white rounded-lg px-3 py-1.5">
          Edit
        </button>
      </div>
      {info && <div className="text-sm text-gray-600 mb-1">{info}</div>}
      {pet.temperament && <div className="mb-1"><TemperamentBadge t={pet.temperament} /></div>}
      {pet.medicalIssues && <div className="text-sm text-orange-600 mb-1">⚠️ {pet.medicalIssues}</div>}
      {pet.allergies && <div className="text-sm text-orange-600 mb-1">🚫 Allergies: {pet.allergies}</div>}
      {pet.groomingNotes && <div className="text-sm text-gray-500 mb-1">✂️ {pet.groomingNotes}</div>}
      <div className="flex flex-wrap gap-3 mt-1 text-sm">
        <span className={pet.rabiesCurrent ? "text-green-700" : "text-red-500"}>
          {pet.rabiesCurrent ? "✅ Rabies" : "❌ Rabies"}
          {pet.rabiesCurrent && pet.rabiesExpiration ? ` (exp. ${pet.rabiesExpiration})` : ""}
        </span>
        <span className={pet.vaccinationsCurrent ? "text-green-700" : "text-red-500"}>
          {pet.vaccinationsCurrent ? "✅ Vaccines" : "❌ Vaccines"}
        </span>
      </div>
      {pet.lastGroomed && <div className="text-xs text-gray-400 mt-1">Last groomed: {fmtDate(pet.lastGroomed)}</div>}
    </div>
  );
}

// ─── customer card ────────────────────────────────────────────────────────────

function CustomerCard({ lead, onEditOwner, onEditPet, onAddPet }: {
  lead: Lead;
  onEditOwner: () => void;
  onEditPet: (pet: Pet) => void;
  onAddPet: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-green-100 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-green-50">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xl font-bold text-gray-900 truncate">{ownerName(lead)}</div>
            <a href={`tel:${lead.phone}`} className="text-green-700 font-medium text-base">📞 {lead.phone}</a>
            {lead.secondaryPhone && (
              <div className="text-sm text-gray-500">Alt: <a href={`tel:${lead.secondaryPhone}`} className="text-green-600">{lead.secondaryPhone}</a></div>
            )}
            {lead.email && <div className="text-sm text-gray-500 truncate">✉️ {lead.email}</div>}
            {lead.address && <div className="text-sm text-gray-500">🏠 {lead.address}</div>}
          </div>
          <button onClick={onEditOwner}
            className="shrink-0 text-sm text-green-700 font-semibold border border-green-200 rounded-lg px-3 py-2">
            Edit
          </button>
        </div>
      </div>
      {lead.pets.length > 0 && (
        <div className="p-5 space-y-3 border-b border-green-50">
          {lead.pets.map((pet) => (
            <PetCard key={pet.id} pet={pet} onEdit={() => onEditPet(pet)} />
          ))}
        </div>
      )}
      <div className="p-4">
        <button onClick={onAddPet}
          className="w-full border-2 border-dashed border-green-200 text-green-700 font-semibold text-base py-3 rounded-xl active:bg-green-50">
          + Add Pet
        </button>
      </div>
    </div>
  );
}

// ─── customers section ────────────────────────────────────────────────────────

function CustomersSection({ leads, onAddCustomer, onEditOwner, onEditPet, onAddPet }: {
  leads: Lead[];
  onAddCustomer: () => void;
  onEditOwner: (lead: Lead) => void;
  onEditPet: (pet: Pet) => void;
  onAddPet: (leadId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const q = search.toLowerCase().trim();

  const filtered = useMemo(() =>
    !q ? leads : leads.filter((l) =>
      ownerName(l).toLowerCase().includes(q) ||
      l.phone.includes(q) ||
      (l.secondaryPhone ?? "").includes(q) ||
      (l.email ?? "").toLowerCase().includes(q) ||
      l.pets.some((p) => (p.petName ?? "").toLowerCase().includes(q))
    ),
    [leads, q]
  );

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <input
          type="search"
          placeholder="Search by name, phone, or dog…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-green-200 rounded-2xl px-4 py-3.5 text-base bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
        />
        <button onClick={onAddCustomer}
          className="bg-green-700 text-white font-bold text-base px-5 py-3 rounded-2xl whitespace-nowrap active:bg-green-800">
          + Add
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-lg">
          {q ? "No matches found" : "No customers yet — add one!"}
        </div>
      ) : (
        <div className="space-y-5">
          {filtered.map((lead) => (
            <CustomerCard
              key={lead.id}
              lead={lead}
              onEditOwner={() => onEditOwner(lead)}
              onEditPet={(pet) => onEditPet(pet)}
              onAddPet={() => onAddPet(lead.id)}
            />
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
  const [modal, setModal] = useState<ModalState | null>(null);
  const [saving, setSaving] = useState(false);

  const reload = async () => {
    try {
      const r = await fetch("/api/dashboard/leads");
      if (!r.ok) throw new Error();
      setData(await r.json());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, []);

  const saveCustomer = async (f: CustF) => {
    setSaving(true);
    try {
      const isEdit = modal?.type === "edit-customer";
      await fetch(
        isEdit ? `/api/dashboard/leads/${modal.lead.id}` : "/api/dashboard/leads",
        { method: isEdit ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) }
      );
      setModal(null);
      await reload();
    } finally {
      setSaving(false);
    }
  };

  const savePet = async (f: PetF) => {
    setSaving(true);
    try {
      const isEdit = modal?.type === "edit-pet";
      const url = isEdit ? `/api/dashboard/pets/${modal.pet.id}` : "/api/dashboard/pets";
      const body = isEdit ? f : { ...f, leadId: (modal as Extract<ModalState, { type: "add-pet" }>).leadId };
      await fetch(url, { method: isEdit ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      setModal(null);
      await reload();
    } finally {
      setSaving(false);
    }
  };

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "today", label: "Today", count: data?.todayAppointments.length },
    { id: "recent", label: "Recent", count: data?.recentCalls.length },
    { id: "customers", label: "Customers", count: data?.allCustomers.length },
  ];

  const editPetInitial = (pet: Pet): Partial<PetF> => ({
    petName: pet.petName ?? "", breed: pet.breed ?? "", color: pet.color ?? "",
    weight: pet.weight ?? "", dateOfBirth: pet.dateOfBirth ?? "", sex: pet.sex ?? "",
    spayedNeutered: pet.spayedNeutered, medicalIssues: pet.medicalIssues ?? "",
    allergies: pet.allergies ?? "", vetName: pet.vetName ?? "", vetPhone: pet.vetPhone ?? "",
    rabiesCurrent: pet.rabiesCurrent, rabiesExpiration: pet.rabiesExpiration ?? "",
    vaccinationsCurrent: pet.vaccinationsCurrent, temperament: pet.temperament ?? "",
    groomingNotes: pet.groomingNotes ?? "",
    lastGroomed: pet.lastGroomed ? new Date(pet.lastGroomed).toISOString().split("T")[0] : "",
  });

  return (
    <div className="min-h-screen bg-green-50">
      <div className="bg-green-700 text-white px-4 pb-4 pt-6">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-bold">🐾 Angela&apos;s Dashboard</h1>
          <p className="text-green-300 text-sm mt-0.5">Heads &amp; Tails Grooming</p>
        </div>
      </div>

      <div className="bg-white border-b border-green-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-lg mx-auto flex">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-4 text-base font-semibold transition-colors ${tab === t.id ? "text-green-700 border-b-2 border-green-700" : "text-gray-400"}`}>
              {t.label}
              {!!t.count && (
                <span className={`ml-1.5 text-xs rounded-full px-1.5 py-0.5 ${tab === t.id ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 pb-24">
        {loading && <div className="text-center py-24 text-gray-400 text-lg animate-pulse">Loading…</div>}
        {error && <div className="text-center py-24 text-red-500 text-base">Couldn&apos;t load — please refresh.</div>}
        {data && tab === "today" && <TodaySection leads={data.todayAppointments} />}
        {data && tab === "recent" && <RecentSection leads={data.recentCalls} />}
        {data && tab === "customers" && (
          <CustomersSection
            leads={data.allCustomers}
            onAddCustomer={() => setModal({ type: "add-customer" })}
            onEditOwner={(lead) => setModal({ type: "edit-customer", lead })}
            onEditPet={(pet) => setModal({ type: "edit-pet", pet })}
            onAddPet={(leadId) => setModal({ type: "add-pet", leadId })}
          />
        )}
      </div>

      {modal?.type === "add-customer" && (
        <Modal title="New Customer" onClose={() => setModal(null)}>
          <CustomerForm onSave={saveCustomer} onCancel={() => setModal(null)} saving={saving} />
        </Modal>
      )}
      {modal?.type === "edit-customer" && (
        <Modal title="Edit Customer" onClose={() => setModal(null)}>
          <CustomerForm
            initial={{ firstName: modal.lead.firstName ?? "", lastName: modal.lead.lastName ?? "",
              phone: modal.lead.phone, secondaryPhone: modal.lead.secondaryPhone ?? "",
              email: modal.lead.email ?? "", address: modal.lead.address ?? "" }}
            onSave={saveCustomer} onCancel={() => setModal(null)} saving={saving}
          />
        </Modal>
      )}
      {modal?.type === "add-pet" && (
        <Modal title="Add Pet" onClose={() => setModal(null)}>
          <PetForm onSave={savePet} onCancel={() => setModal(null)} saving={saving} />
        </Modal>
      )}
      {modal?.type === "edit-pet" && (
        <Modal title="Edit Pet" onClose={() => setModal(null)}>
          <PetForm initial={editPetInitial(modal.pet)} onSave={savePet} onCancel={() => setModal(null)} saving={saving} />
        </Modal>
      )}
    </div>
  );
}
