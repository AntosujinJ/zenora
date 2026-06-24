import { useEffect, useState } from "react";
import Logo from "../components/Logo.jsx";
import {
  clearAuth,
  fileUrl,
  doctorAddRecord,
  doctorAppointments,
  doctorComplete,
  doctorMe,
  doctorPatientDetail,
  doctorPatients,
  doctorUpdateAvailability,
  getStaffUser,
} from "../api.js";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WRAP = "max-w-[1600px] mx-auto px-6 lg:px-10";

function StatusBadge({ status }) {
  const map = {
    confirmed: "bg-green-100 text-green-700",
    completed: "bg-sky-100 text-sky-700",
    cancelled: "bg-slate-200 text-slate-500",
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${map[status] || "bg-slate-100 text-slate-600"}`}>{status}</span>;
}

export default function DoctorDashboard({ onLogout }) {
  const [tab, setTab] = useState("schedule");
  const [selPatient, setSelPatient] = useState(null);
  const [me, setMe] = useState(null);

  useEffect(() => { doctorMe().then(setMe).catch(() => {}); }, []);
  const logout = () => { clearAuth(); onLogout(); };
  const openPatient = (pid) => { setSelPatient(pid); setTab("patients"); };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className={`${WRAP} h-16 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <Logo />
            <span className="hidden sm:inline text-sm font-semibold text-slate-400 border-l border-slate-200 pl-3">Doctor Portal</span>
          </div>
          <div className="flex items-center gap-3">
            {me && (
              <span className="hidden sm:flex flex-col items-end leading-tight">
                <span className="text-sm font-semibold text-ink-900">Dr. {me.name}</span>
                <span className="text-xs text-slate-400">{me.specialty}</span>
              </span>
            )}
            <button onClick={logout} className="btn-ghost !px-4 !py-2 text-sm">Log out</button>
          </div>
        </div>
      </header>

      <main className={`${WRAP} py-8`}>
        <div className="flex gap-1 mb-6 bg-white border border-slate-200 rounded-xl p-1 w-fit">
          {[["schedule", "My schedule"], ["availability", "Availability"], ["patients", "My patients"]].map(([t, l]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${tab === t ? "bg-brand-600 text-white" : "text-slate-500 hover:text-brand-600"}`}>
              {l}
            </button>
          ))}
        </div>

        {tab === "schedule" && <Schedule onOpenPatient={openPatient} />}
        {tab === "availability" && <Availability me={me} onSaved={setMe} />}
        {tab === "patients" && <Patients initialPatient={selPatient} />}
      </main>
    </div>
  );
}

/* ---------------- Schedule ---------------- */
function Schedule({ onOpenPatient }) {
  const [scope, setScope] = useState("upcoming");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    doctorAppointments(scope).then(setRows).catch(() => setRows([])).finally(() => setLoading(false));
  };
  useEffect(load, [scope]);

  const complete = async (id) => {
    await doctorComplete(id);
    load();
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-ink-900">My appointments</h3>
        <select value={scope} onChange={(e) => setScope(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white">
          <option value="upcoming">Upcoming</option>
          <option value="today">Today</option>
          <option value="all">All</option>
        </select>
      </div>
      <table className="w-full text-sm">
        <thead className="text-xs uppercase tracking-wide text-slate-400">
          <tr>{["When", "Patient", "Contact", "Reason", "Status", ""].map((h) => <th key={h} className="text-left font-semibold py-2">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {loading && <tr><td colSpan={6} className="py-8 text-center text-slate-400">Loading…</td></tr>}
          {!loading && rows.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-slate-400">No appointments.</td></tr>}
          {!loading && rows.map((a) => (
            <tr key={a.id} className={a.status === "cancelled" ? "opacity-50" : ""}>
              <td className="py-3"><div className="font-semibold text-ink-900">{a.date}</div><div className="text-slate-400">{a.time}</div></td>
              <td className="py-3">
                <button onClick={() => onOpenPatient(a.patient_id)} className="font-medium text-brand-700 hover:underline">{a.patient_name}</button>
                <span className="text-xs font-mono text-brand-600 ml-1">{a.patient_id}</span>
              </td>
              <td className="py-3 text-slate-500">{a.patient_phone}</td>
              <td className="py-3 text-slate-500 max-w-[220px] truncate">{a.reason || "—"}</td>
              <td className="py-3"><StatusBadge status={a.status} /></td>
              <td className="py-3 text-right">
                {a.status === "confirmed" && (
                  <button onClick={() => complete(a.id)} className="text-sky-600 hover:text-sky-700 font-semibold text-xs">Mark completed</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- Availability ---------------- */
function Availability({ me, onSaved }) {
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (me) setForm({
      work_start: me.work_start || "09:00", work_end: me.work_end || "17:00",
      slot_minutes: me.slot_minutes || 30, work_days: me.work_days || [0, 1, 2, 3, 4, 5], bio: me.bio || "",
    });
  }, [me]);
  if (!form) return <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-400">Loading…</div>;

  const toggleDay = (i) => setForm((f) => ({ ...f, work_days: f.work_days.includes(i) ? f.work_days.filter((d) => d !== i) : [...f.work_days, i].sort() }));
  const save = async () => {
    setBusy(true); setMsg("");
    try { onSaved(await doctorUpdateAvailability(form)); setMsg("Saved! Your availability now reflects in patient booking."); }
    catch { setMsg("Could not save. Please try again."); } finally { setBusy(false); }
  };

  return (
    <div className="max-w-xl bg-white rounded-2xl border border-slate-200 p-6">
      <h3 className="font-semibold text-ink-900">My availability</h3>
      <p className="text-sm text-slate-500 mt-1">Changes here instantly update the slots patients can book.</p>
      <div className="mt-5 grid grid-cols-2 gap-4">
        <label className="text-sm"><span className="text-slate-600 font-medium">Start time</span>
          <input type="time" value={form.work_start} onChange={(e) => setForm({ ...form, work_start: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" /></label>
        <label className="text-sm"><span className="text-slate-600 font-medium">End time</span>
          <input type="time" value={form.work_end} onChange={(e) => setForm({ ...form, work_end: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" /></label>
      </div>
      <label className="block mt-4 text-sm"><span className="text-slate-600 font-medium">Appointment length (minutes)</span>
        <select value={form.slot_minutes} onChange={(e) => setForm({ ...form, slot_minutes: Number(e.target.value) })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 bg-white">
          {[15, 20, 30, 40, 45, 60].map((m) => <option key={m} value={m}>{m} min</option>)}
        </select></label>
      <div className="mt-4"><span className="text-sm text-slate-600 font-medium">Working days</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {DAYS.map((d, i) => (
            <button key={d} type="button" onClick={() => toggleDay(i)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${form.work_days.includes(i) ? "bg-brand-600 text-white border-brand-600" : "border-slate-200 text-slate-500 hover:border-brand-300"}`}>{d}</button>
          ))}
        </div>
      </div>
      <label className="block mt-4 text-sm"><span className="text-slate-600 font-medium">Bio (shown on the website)</span>
        <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 h-20 resize-none" /></label>
      {msg && <p className="mt-3 text-sm text-green-600">{msg}</p>}
      <button onClick={save} disabled={busy} className="btn-primary mt-5">{busy ? "Saving…" : "Save availability"}</button>
    </div>
  );
}

/* ---------------- Patients ---------------- */
function Patients({ initialPatient }) {
  const [list, setList] = useState([]);
  const [sel, setSel] = useState(initialPatient || null);
  useEffect(() => { doctorPatients().then(setList).catch(() => {}); }, []);
  useEffect(() => { if (initialPatient) setSel(initialPatient); }, [initialPatient]);

  return (
    <div className="grid lg:grid-cols-[320px_1fr] gap-5">
      <div className="bg-white rounded-2xl border border-slate-200 p-4 h-fit">
        <h3 className="font-semibold text-ink-900 mb-2">My patients ({list.length})</h3>
        <div className="space-y-1 max-h-[70vh] overflow-auto">
          {list.length === 0 && <p className="text-sm text-slate-400 p-2">No patients yet.</p>}
          {list.map((p) => (
            <button key={p.patient_id} onClick={() => setSel(p.patient_id)}
              className={`w-full text-left rounded-xl px-3 py-2 transition ${sel === p.patient_id ? "bg-brand-50 border border-brand-300" : "hover:bg-slate-50 border border-transparent"}`}>
              <div className="flex justify-between"><span className="font-semibold text-ink-900">{p.name}</span><span className="text-xs font-mono text-brand-600">{p.patient_id}</span></div>
              <div className="text-xs text-slate-400">{p.visits} visit(s) · last {p.last_date}</div>
            </button>
          ))}
        </div>
      </div>
      <div>
        {sel ? <PatientDetail patientId={sel} /> :
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-400">Select a patient to view their records.</div>}
      </div>
    </div>
  );
}

function PatientDetail({ patientId }) {
  const [data, setData] = useState(null);
  const [note, setNote] = useState("");
  const [apptId, setApptId] = useState("");
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);

  const load = () => doctorPatientDetail(patientId).then(setData).catch(() => setData(null));
  useEffect(() => { setData(null); setNote(""); setFiles([]); setApptId(""); load(); }, [patientId]);

  const save = async () => {
    if (!note.trim() && files.length === 0) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("note", note);
      if (apptId) fd.append("appointment_id", apptId);
      [...files].forEach((f) => fd.append("files", f));
      await doctorAddRecord(patientId, fd);
      setNote(""); setFiles([]); setApptId("");
      load();
    } finally { setSaving(false); }
  };

  if (!data) return <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-400">Loading…</div>;
  const { patient, appointments, records } = data;

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-display text-xl font-extrabold text-ink-900">{patient.name}</h2>
          <p className="text-sm text-slate-500">{patient.phone} {patient.email ? `· ${patient.email}` : ""}</p>
        </div>
        <span className="font-mono text-sm bg-brand-600 text-white px-3 py-1.5 rounded-lg">{patient.patient_id}</span>
      </div>

      {/* Add notes / attachments (saved under this doctor) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="font-semibold text-ink-900">Add notes / attachments</h3>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Consultation notes…"
          className="mt-3 w-full border border-slate-200 rounded-xl px-3 py-2 h-24 resize-none focus:border-brand-400 outline-none" />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <select value={apptId} onChange={(e) => setApptId(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white">
            <option value="">Link to a visit (optional)</option>
            {appointments.map((a) => <option key={a.id} value={a.id}>{a.date} {a.time}</option>)}
          </select>
          <label className="text-sm font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-2 rounded-xl cursor-pointer">
            📎 Attach images
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => setFiles(e.target.files)} />
          </label>
          {files.length > 0 && <span className="text-xs text-slate-500">{files.length} file(s)</span>}
          <button onClick={save} disabled={saving || (!note.trim() && files.length === 0)} className="btn-primary !py-2 ml-auto">{saving ? "Saving…" : "Save record"}</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="font-semibold text-ink-900 mb-3">Records ({records.length})</h3>
        {records.length === 0 && <p className="text-sm text-slate-400">No records yet.</p>}
        <div className="space-y-3">
          {records.map((r) => (
            <div key={r.id} className="border border-slate-100 rounded-xl p-4">
              <div className="text-xs text-slate-400">{new Date(r.created_at).toLocaleString()}{r.created_by ? ` · by ${r.created_by}` : ""}</div>
              {r.note && <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{r.note}</p>}
              {r.attachments?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.attachments.map((a) => (
                    <a key={a.url} href={fileUrl(a.url)} target="_blank" rel="noreferrer">
                      <img src={fileUrl(a.url)} alt={a.filename} className="w-24 h-24 object-cover rounded-lg border border-slate-200" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="font-semibold text-ink-900 mb-3">Visits with me ({appointments.length})</h3>
        <div className="space-y-2">
          {appointments.map((a) => (
            <div key={a.id} className="flex items-center justify-between text-sm border-b border-slate-50 pb-2">
              <span className="text-ink-900 font-medium">{a.date} · {a.time}</span>
              <span className="text-slate-400 max-w-[240px] truncate">{a.reason}</span>
              <StatusBadge status={a.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
