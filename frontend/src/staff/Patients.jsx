import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { adminAddRecord, adminCreatePatient, adminPatientDetail, adminPatients, fileUrl, getDoctors } from "../api.js";
import BookingModal from "../components/BookingModal.jsx";

export default function Patients({ initialPatient = null }) {
  const [query, setQuery] = useState("");
  const [list, setList] = useState([]);
  const [selected, setSelected] = useState(initialPatient);
  const [loading, setLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => { if (initialPatient) setSelected(initialPatient); }, [initialPatient]);

  const search = async (q) => {
    setLoading(true);
    try {
      setList(await adminPatients(q));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    search("");
  }, []);

  const onCreated = (patient) => {
    setShowNew(false);
    search("");
    setSelected(patient.patient_id);
  };

  return (
    <div className="grid lg:grid-cols-[340px_1fr] gap-5">
      {/* List */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 h-fit">
        <button
          onClick={() => setShowNew(true)}
          className="btn-primary w-full !py-2 text-sm mb-3"
        >
          + New patient
        </button>
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search(query)}
            placeholder="Search ID, name, phone, email…"
            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 outline-none"
          />
          <button onClick={() => search(query)} className="px-3 rounded-xl bg-brand-600 text-white text-sm font-semibold">
            Search
          </button>
        </div>
        <div className="mt-3 space-y-1 max-h-[70vh] overflow-auto">
          {loading && <p className="text-sm text-slate-400 p-2">Loading…</p>}
          {!loading && list.length === 0 && <p className="text-sm text-slate-400 p-2">No patients found.</p>}
          {list.map((p) => (
            <button
              key={p.patient_id}
              onClick={() => setSelected(p.patient_id)}
              className={`w-full text-left rounded-xl px-3 py-2 transition ${
                selected === p.patient_id ? "bg-brand-50 border border-brand-300" : "hover:bg-slate-50 border border-transparent"
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-semibold text-ink-900">{p.name}</span>
                <span className="text-xs font-mono text-brand-600">{p.patient_id}</span>
              </div>
              <div className="text-xs text-slate-400">{p.phone} {p.email ? `· ${p.email}` : ""}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Detail */}
      <div>
        {selected ? (
          <PatientDetail patientId={selected} />
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-400">
            Select a patient to view their appointments &amp; records.
          </div>
        )}
      </div>

      <NewPatientModal open={showNew} onClose={() => setShowNew(false)} onCreated={onCreated} />
    </div>
  );
}

function NewPatientModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (open) { setForm({ name: "", phone: "", email: "" }); setErr(""); }
  }, [open]);

  const submit = async () => {
    if (!form.name.trim()) { setErr("Name is required."); return; }
    setBusy(true); setErr("");
    try {
      const res = await adminCreatePatient(form);
      onCreated(res.patient);
    } catch {
      setErr("Could not create patient.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={() => !busy && onClose()}
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm grid place-items-center p-4"
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
          >
            <h3 className="font-display text-lg font-extrabold text-ink-900">New patient</h3>
            <p className="text-sm text-slate-500 mt-1">A Patient ID is generated automatically.</p>
            <input
              value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Full name" autoFocus
              className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-400 outline-none"
            />
            <input
              value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="Phone"
              className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-400 outline-none"
            />
            <input
              value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Email (optional)"
              className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-400 outline-none"
            />
            {err && <p className="text-sm text-accent-600 mt-2">{err}</p>}
            <div className="mt-5 flex gap-3">
              <button onClick={onClose} disabled={busy} className="btn-ghost flex-1">Cancel</button>
              <button onClick={submit} disabled={busy} className="btn-primary flex-1">
                {busy ? "Creating…" : "Create patient"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function PatientDetail({ patientId }) {
  const [data, setData] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [openAppt, setOpenAppt] = useState(null); // appointment id being viewed
  const [booking, setBooking] = useState(false);

  const load = () => adminPatientDetail(patientId).then(setData).catch(() => setData(null));
  useEffect(() => {
    load();
    getDoctors().then(setDoctors).catch(() => {});
    setOpenAppt(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  if (!data) return <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-400">Loading…</div>;
  const { patient, appointments, records } = data;
  const recsFor = (apptId) => records.filter((r) => r.appointment_id === apptId);
  const selectedAppt = appointments.find((a) => a.id === openAppt);

  return (
    <div className="space-y-5">
      {/* Patient header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-display text-xl font-extrabold text-ink-900">{patient.name}</h2>
          <p className="text-sm text-slate-500">{patient.phone} {patient.email ? `· ${patient.email}` : ""}</p>
        </div>
        <span className="font-mono text-sm bg-brand-600 text-white px-3 py-1.5 rounded-lg">{patient.patient_id}</span>
      </div>

      {selectedAppt ? (
        <AppointmentDetail
          appt={selectedAppt}
          records={recsFor(selectedAppt.id)}
          patientId={patientId}
          onBack={() => setOpenAppt(null)}
          onSaved={load}
        />
      ) : (
        <>
          {/* Appointment table */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-ink-900">Appointments ({appointments.length})</h3>
              <button onClick={() => setBooking(true)} className="btn-primary !py-2 !px-4 text-sm">
                + New appointment
              </button>
            </div>
            {appointments.length === 0 ? (
              <p className="text-sm text-slate-400">No appointments yet. Click “+ New appointment” to book one.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase tracking-wide text-slate-400">
                    <tr>
                      {["When", "Doctor", "Reason", "Records", "Status", ""].map((h) => (
                        <th key={h} className="text-left font-semibold py-2">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {appointments.map((a) => (
                      <tr key={a.id} onClick={() => setOpenAppt(a.id)} className="cursor-pointer hover:bg-slate-50">
                        <td className="py-3">
                          <div className="font-semibold text-ink-900">{a.date}</div>
                          <div className="text-slate-400">{a.time}</div>
                        </td>
                        <td className="py-3">Dr. {a.doctor_name}</td>
                        <td className="py-3 text-slate-500 max-w-[180px] truncate">{a.reason || "—"}</td>
                        <td className="py-3">
                          <span className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full">{recsFor(a.id).length} 📄</span>
                        </td>
                        <td className="py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${a.status === "cancelled" ? "bg-slate-200 text-slate-500" : "bg-green-100 text-green-700"}`}>
                            {a.status}
                          </span>
                        </td>
                        <td className="py-3 text-right text-brand-600 font-semibold">Open →</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      <BookingModal
        open={booking}
        onClose={() => { setBooking(false); load(); }}
        doctors={doctors}
        prefillPatient={patient}
        onBooked={() => load()}
        closeOnBook
      />
    </div>
  );
}

function AppointmentDetail({ appt, records, patientId, onBack, onSaved }) {
  const [note, setNote] = useState("");
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!note.trim() && files.length === 0) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("note", note);
      fd.append("appointment_id", appt.id);
      if (appt.doctor_id) fd.append("doctor_id", appt.doctor_id);
      [...files].forEach((f) => fd.append("files", f));
      await adminAddRecord(patientId, fd);
      setNote(""); setFiles([]);
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="text-sm font-semibold text-brand-600 hover:text-brand-700">
        ← Back to appointments
      </button>

      {/* Appointment summary */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="font-display text-lg font-extrabold text-ink-900">{appt.date} · {appt.time}</h3>
            <p className="text-sm text-slate-500">Dr. {appt.doctor_name} {appt.reason ? `· ${appt.reason}` : ""}</p>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full ${appt.status === "cancelled" ? "bg-slate-200 text-slate-500" : "bg-green-100 text-green-700"}`}>
            {appt.status}
          </span>
        </div>
      </div>

      {/* Upload / add record for THIS visit */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="font-semibold text-ink-900">Add notes / images to this visit</h3>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Doctor's notes for this visit…"
          className="mt-3 w-full border border-slate-200 rounded-xl px-3 py-2 h-24 resize-none focus:border-brand-400 outline-none"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-2 rounded-xl cursor-pointer">
            📎 Attach images
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => setFiles(e.target.files)} />
          </label>
          {files.length > 0 && <span className="text-xs text-slate-500">{files.length} file(s) selected</span>}
          <button onClick={save} disabled={saving || (!note.trim() && files.length === 0)} className="btn-primary !py-2 ml-auto">
            {saving ? "Saving…" : "Save record"}
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-400">OCR text extraction & voice-to-text come in Phase 2.</p>
      </div>

      {/* Records for this visit */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="font-semibold text-ink-900 mb-3">Records for this visit ({records.length})</h3>
        {records.length === 0 && <p className="text-sm text-slate-400">No notes or images yet for this visit.</p>}
        <div className="space-y-3">
          {records.map((r) => <RecordCard key={r.id} r={r} />)}
        </div>
      </div>
    </div>
  );
}

function RecordCard({ r }) {
  return (
    <div className="border border-slate-100 rounded-xl p-4">
      <div className="flex justify-between text-xs text-slate-400">
        <span>
          Uploaded {new Date(r.created_at).toLocaleString()}
          {r.created_by ? ` · by ${r.created_by}` : ""}
        </span>
        <span>{r.doctor_name ? `Dr. ${r.doctor_name}` : ""}</span>
      </div>
      {r.note && <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{r.note}</p>}
      {r.transcript && <p className="mt-2 text-sm text-slate-500 italic border-l-2 border-brand-200 pl-3">🎙 {r.transcript}</p>}
      {r.attachments?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {r.attachments.map((a) => (
            <a key={a.url} href={fileUrl(a.url)} target="_blank" rel="noreferrer">
              <img src={fileUrl(a.url)} alt={a.filename} className="w-24 h-24 object-cover rounded-lg border border-slate-200 hover:scale-105 transition" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
