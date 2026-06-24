import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Logo from "../components/Logo.jsx";
import Patients from "./Patients.jsx";
import DoctorDashboard from "./DoctorDashboard.jsx";
import Analytics from "./Analytics.jsx";
import {
  adminAppointments,
  adminCancel,
  adminCreateStaff,
  adminListStaff,
  adminRecordPayment,
  adminReschedule,
  adminStats,
  clearAuth,
  getAvailability,
  paymentConfig,
  getDoctors,
  getStaffUser,
  isLoggedIn,
  staffLogin,
} from "../api.js";

export default function StaffDashboard() {
  const [authed, setAuthed] = useState(isLoggedIn());

  if (!authed) return <Login onSuccess={() => setAuthed(true)} />;
  const user = getStaffUser();
  if (user?.role === "doctor") return <DoctorDashboard onLogout={() => setAuthed(false)} />;
  return <Dashboard onLogout={() => setAuthed(false)} />;
}

/* ---------------- Login ---------------- */
function Login({ onSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await staffLogin(username.trim(), password);
      onSuccess();
    } catch {
      setErr("Wrong username or password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen mesh-bg grid place-items-center px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm glass rounded-2xl shadow-soft p-8"
      >
        <div className="flex justify-center mb-6">
          <Logo />
        </div>
        <h1 className="font-display text-xl font-extrabold text-ink-900 text-center">
          Staff sign in
        </h1>
        <p className="text-sm text-slate-500 text-center mt-1">
          Use your staff account to continue
        </p>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          autoComplete="username"
          className="mt-6 w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none"
          autoFocus
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoComplete="current-password"
          className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none"
        />
        {err && <p className="text-sm text-accent-600 mt-2">{err}</p>}
        <button type="submit" disabled={busy} className="btn-primary w-full mt-4">
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <a href="/" className="block text-center text-sm text-slate-400 mt-4 hover:text-brand-600">
          ← Back to website
        </a>
      </form>
    </div>
  );
}

/* ---------------- Dashboard ---------------- */
const REMINDER_LABELS = { 1440: "24h", 120: "2h" };

function Dashboard({ onLogout }) {
  const [stats, setStats] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ scope: "upcoming", doctor_id: "", status: "", payment: "", search: "" });
  const [tab, setTab] = useState("appointments");
  const [jumpPatient, setJumpPatient] = useState(null);
  const user = getStaffUser();
  const isAdmin = user?.role === "admin";
  const openPatient = (pid) => { if (pid) { setJumpPatient(pid); setTab("patients"); } };

  const logout = () => {
    clearAuth();
    onLogout();
  };

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      Object.entries(filters).forEach(([k, v]) => v && (params[k] = v));
      const [s, a] = await Promise.all([adminStats(), adminAppointments(params)]);
      setStats(s);
      setRows(a);
    } catch (e) {
      if (e?.response?.status === 401) logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getDoctors().then(setDoctors).catch(() => {});
  }, []);
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const doCancel = async () => {
    setCancelling(true);
    try {
      await adminCancel(cancelTarget.id);
      setCancelTarget(null);
      load();
    } finally {
      setCancelling(false);
    }
  };

  // Reschedule
  const [reTarget, setReTarget] = useState(null);
  const [reDate, setReDate] = useState("");
  const [reSlots, setReSlots] = useState([]);
  const [reTime, setReTime] = useState("");
  const [reBusy, setReBusy] = useState(false);
  const [reErr, setReErr] = useState("");

  const openReschedule = (a) => {
    setReTarget(a); setReDate(a.date); setReTime(""); setReSlots([]); setReErr("");
  };
  useEffect(() => {
    if (reTarget && reDate) {
      setReTime("");
      getAvailability(reTarget.doctor_id, reDate).then((d) => setReSlots(d.slots)).catch(() => setReSlots([]));
    }
  }, [reTarget, reDate]);
  const doReschedule = async () => {
    setReBusy(true); setReErr("");
    try {
      await adminReschedule(reTarget.id, { date: reDate, time: reTime });
      setReTarget(null);
      load();
    } catch (e) {
      setReErr(e?.response?.data?.detail || "Could not reschedule.");
    } finally {
      setReBusy(false);
    }
  };

  // Payment
  const [payTarget, setPayTarget] = useState(null);
  const [payMethod, setPayMethod] = useState("cash");
  const [payAmount, setPayAmount] = useState(500);
  const [payBusy, setPayBusy] = useState(false);
  const [fee, setFee] = useState(500);
  useEffect(() => { paymentConfig().then((c) => setFee(c.consultation_fee_inr)).catch(() => {}); }, []);
  const openPay = (a) => { setPayTarget(a); setPayMethod("cash"); setPayAmount(a.paid_amount || a.amount_due || fee); };
  const doPay = async () => {
    setPayBusy(true);
    try {
      await adminRecordPayment(payTarget.id, { amount: Number(payAmount), method: payMethod });
      setPayTarget(null);
      load();
    } finally { setPayBusy(false); }
  };

  // Stat cards double as quick filters.
  const cardFilter = (scope, status) => setFilters((f) => ({ ...f, scope, status }));
  const isSel = (scope, status) => filters.scope === scope && filters.status === status;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="hidden sm:inline text-sm font-semibold text-slate-400 border-l border-slate-200 pl-3">
              Staff Dashboard
            </span>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <span className="hidden sm:flex flex-col items-end leading-tight">
                <span className="text-sm font-semibold text-ink-900">{user.name}</span>
                <span className="text-xs text-slate-400 capitalize">{user.role}</span>
              </span>
            )}
            <button onClick={logout} className="btn-ghost !px-4 !py-2 text-sm">
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 lg:px-10 py-8">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white border border-slate-200 rounded-xl p-1 w-fit">
          {[
            ["appointments", "Appointments"],
            ["patients", "Patients"],
            ...(isAdmin ? [["analytics", "Analytics"], ["team", "Team"]] : []),
          ].map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                tab === t ? "bg-brand-600 text-white" : "text-slate-500 hover:text-brand-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "patients" && <Patients initialPatient={jumpPatient} />}
        {tab === "analytics" && isAdmin && <Analytics />}
        {tab === "team" && isAdmin && <Team />}

        {tab === "appointments" && (
          <>
        {/* Stats — also act as quick filters */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard label="Today" value={stats?.today}
            onClick={() => cardFilter("today", "confirmed")} selected={isSel("today", "confirmed")} />
          <StatCard label="Upcoming" value={stats?.upcoming}
            onClick={() => cardFilter("upcoming", "confirmed")} selected={isSel("upcoming", "confirmed")} />
          <StatCard label="Total active" value={stats?.total}
            onClick={() => cardFilter("all", "confirmed")} selected={isSel("all", "confirmed")} />
          <StatCard label="Cancelled" value={stats?.cancelled} muted
            onClick={() => cardFilter("all", "cancelled")} selected={isSel("all", "cancelled")} />
          <StatCard
            label="Collected today"
            value={`₹${stats?.collected_today ?? 0}`}
            onClick={() => setFilters((f) => ({ ...f, scope: "all", status: "", payment: "paid" }))}
            selected={filters.payment === "paid"}
          />
        </div>

        {/* Filters */}
        <div className="mt-8 flex flex-wrap gap-3 items-center">
          <Select
            value={filters.scope}
            onChange={(v) => setFilters((f) => ({ ...f, scope: v }))}
            options={[["upcoming", "Upcoming"], ["today", "Today"], ["all", "All time"]]}
          />
          <Select
            value={filters.doctor_id}
            onChange={(v) => setFilters((f) => ({ ...f, doctor_id: v }))}
            options={[["", "All doctors"], ...doctors.map((d) => [d.id, `Dr. ${d.name}`])]}
          />
          <Select
            value={filters.status}
            onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
            options={[["", "Any status"], ["confirmed", "Confirmed"], ["completed", "Completed"], ["cancelled", "Cancelled"]]}
          />
          <Select
            value={filters.payment}
            onChange={(v) => setFilters((f) => ({ ...f, payment: v }))}
            options={[["", "Any payment"], ["paid", "Paid"], ["unpaid", "Unpaid"]]}
          />
          <input
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            placeholder="Search name / phone / email…"
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm flex-1 min-w-[200px] focus:border-brand-400 outline-none"
          />
        </div>

        {/* Table */}
        <div className="mt-5 bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  {["When", "Patient", "Contact", "Doctor", "Reason", "Reminders", "Payment", "Status", ""].map((h) => (
                    <th key={h} className="text-left font-semibold px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && (
                  <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-400">Loading…</td></tr>
                )}
                {!loading && rows.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-400">No appointments found.</td></tr>
                )}
                {!loading && rows.map((a) => (
                  <tr key={a.id} className={a.status === "cancelled" ? "opacity-50" : ""}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-semibold text-ink-900">{a.date}</div>
                      <div className="text-slate-500">{a.time}</div>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => openPatient(a.patient_id)} className="font-medium text-brand-700 hover:underline">
                        {a.patient_name}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      <div>{a.patient_phone || "—"}</div>
                      <div className="text-xs">{a.patient_email || ""}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-ink-900">Dr. {a.doctor_name}</div>
                      <div className="text-xs text-slate-400">{a.doctor_specialty}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 max-w-[160px] truncate">{a.reason || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {[1440, 120].map((off) => (
                          <span
                            key={off}
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              (a.reminders_sent || []).includes(off)
                                ? "bg-brand-100 text-brand-700"
                                : "bg-slate-100 text-slate-400"
                            }`}
                            title={(a.reminders_sent || []).includes(off) ? "Sent" : "Not sent yet"}
                          >
                            {REMINDER_LABELS[off]}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {a.payment_status === "paid" ? (
                        <span className="text-xs">
                          <span className="font-semibold text-green-700">₹{a.paid_amount}</span>
                          <span className="text-slate-400 capitalize"> · {a.payment_method || "paid"}</span>
                        </span>
                      ) : (
                        <button onClick={() => openPay(a)} className="text-xs font-semibold text-brand-600 hover:text-brand-700">
                          Record payment
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {a.status === "confirmed" && (
                        <div className="flex gap-3 justify-end">
                          <button
                            onClick={() => openReschedule(a)}
                            className="text-brand-600 hover:text-brand-700 font-semibold text-xs"
                          >
                            Reschedule
                          </button>
                          <button
                            onClick={() => setCancelTarget(a)}
                            className="text-accent-600 hover:text-accent-500 font-semibold text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
          </>
        )}
      </main>

      {/* Cancel confirmation card */}
      <AnimatePresence>
        {cancelTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !cancelling && setCancelTarget(null)}
            className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm grid place-items-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center"
            >
              <div className="w-14 h-14 mx-auto rounded-full bg-rose-100 text-rose-600 grid place-items-center text-2xl">
                ⚠️
              </div>
              <h3 className="mt-4 font-display text-lg font-extrabold text-ink-900">
                Cancel this appointment?
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                <b className="text-ink-900">{cancelTarget.patient_name}</b> with Dr.{" "}
                {cancelTarget.doctor_name} on <b>{cancelTarget.date}</b> at{" "}
                <b>{cancelTarget.time}</b>.
              </p>
              <p className="mt-2 text-xs text-slate-400">
                The slot is freed and the patient is emailed a cancellation notice.
              </p>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setCancelTarget(null)}
                  disabled={cancelling}
                  className="btn-ghost flex-1"
                >
                  Keep it
                </button>
                <button
                  onClick={doCancel}
                  disabled={cancelling}
                  className="flex-1 bg-accent-600 hover:bg-accent-500 text-white font-semibold px-6 py-3 rounded-xl transition active:scale-[0.98] disabled:opacity-60"
                >
                  {cancelling ? "Cancelling…" : "Yes, cancel"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reschedule modal */}
      <AnimatePresence>
        {reTarget && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => !reBusy && setReTarget(null)}
            className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm grid place-items-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
            >
              <h3 className="font-display text-lg font-extrabold text-ink-900">Reschedule appointment</h3>
              <p className="mt-1 text-sm text-slate-500">
                {reTarget.patient_name} · Dr. {reTarget.doctor_name} · currently {reTarget.date} {reTarget.time}
              </p>

              <label className="block mt-4 text-sm font-medium text-slate-600">New date</label>
              <input type="date" value={reDate} min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setReDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />

              <div className="mt-4">
                <span className="text-sm font-medium text-slate-600">New time</span>
                {reSlots.length === 0 ? (
                  <p className="text-sm text-slate-400 mt-2">No open slots that day. Try another date.</p>
                ) : (
                  <div className="mt-2 grid grid-cols-4 gap-2 max-h-40 overflow-auto">
                    {reSlots.map((s) => (
                      <button key={s} onClick={() => setReTime(s)}
                        className={`text-sm py-1.5 rounded-lg border transition ${reTime === s ? "border-brand-500 bg-brand-500 text-white" : "border-slate-200 hover:border-brand-300"}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {reErr && <p className="mt-3 text-sm text-accent-600">{reErr}</p>}
              <div className="mt-6 flex gap-3">
                <button onClick={() => setReTarget(null)} disabled={reBusy} className="btn-ghost flex-1">Cancel</button>
                <button onClick={doReschedule} disabled={reBusy || !reTime} className="btn-primary flex-1">
                  {reBusy ? "Saving…" : "Confirm new time"}
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-400">The patient is emailed about the new time.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Record payment modal */}
      <AnimatePresence>
        {payTarget && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => !payBusy && setPayTarget(null)}
            className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm grid place-items-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
            >
              <h3 className="font-display text-lg font-extrabold text-ink-900">Record payment</h3>
              <p className="mt-1 text-sm text-slate-500">{payTarget.patient_name} · Dr. {payTarget.doctor_name} · {payTarget.date} {payTarget.time}</p>

              <label className="block mt-4 text-sm font-medium text-slate-600">Amount (₹)</label>
              <input type="number" min="0" value={payAmount} onChange={(e) => setPayAmount(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />

              <label className="block mt-4 text-sm font-medium text-slate-600">Method</label>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {["cash", "card", "upi", "online"].map((m) => (
                  <button key={m} onClick={() => setPayMethod(m)}
                    className={`py-2 rounded-lg text-sm font-medium border capitalize transition ${payMethod === m ? "border-brand-500 bg-brand-500 text-white" : "border-slate-200 hover:border-brand-300"}`}>
                    {m}
                  </button>
                ))}
              </div>

              <div className="mt-6 flex gap-3">
                <button onClick={() => setPayTarget(null)} disabled={payBusy} className="btn-ghost flex-1">Cancel</button>
                <button onClick={doPay} disabled={payBusy || !payAmount} className="btn-primary flex-1">
                  {payBusy ? "Saving…" : `Mark ₹${payAmount} paid`}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------------- Team (admin only) ---------------- */
function Team() {
  const [list, setList] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [form, setForm] = useState({ name: "", username: "", password: "", role: "staff", doctor_id: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const load = () => adminListStaff().then(setList).catch(() => {});
  useEffect(() => { load(); getDoctors().then(setDoctors).catch(() => {}); }, []);

  const add = async (e) => {
    e.preventDefault();
    if (!form.username.trim() || !form.password) { setErr("Username and password are required."); return; }
    if (form.role === "doctor" && !form.doctor_id) { setErr("Pick which doctor profile this account is for."); return; }
    setBusy(true); setErr(""); setMsg("");
    try {
      await adminCreateStaff({ ...form, username: form.username.trim() });
      setMsg(`Created account "${form.username.trim()}"`);
      setForm({ name: "", username: "", password: "", role: "staff", doctor_id: "" });
      load();
    } catch (e2) {
      setErr(e2?.response?.data?.detail || "Could not create the account.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-5">
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="font-semibold text-ink-900 mb-3">Staff accounts ({list.length})</h3>
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wide text-slate-400">
            <tr>{["Name", "Username", "Role"].map((h) => <th key={h} className="text-left font-semibold py-2">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.map((u) => (
              <tr key={u.username}>
                <td className="py-2.5 font-medium text-ink-900">{u.name}</td>
                <td className="py-2.5 text-slate-500">{u.username}</td>
                <td className="py-2.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${u.role === "admin" ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-600"}`}>{u.role}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form onSubmit={add} className="bg-white rounded-2xl border border-slate-200 p-5 h-fit">
        <h3 className="font-semibold text-ink-900">Add staff account</h3>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name"
          className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 outline-none" />
        <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="Username"
          className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 outline-none" />
        <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Password"
          className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 outline-none" />
        <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
          className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:border-brand-400 outline-none">
          <option value="staff">Staff</option>
          <option value="doctor">Doctor</option>
          <option value="admin">Admin</option>
        </select>
        {form.role === "doctor" && (
          <select value={form.doctor_id} onChange={(e) => setForm({ ...form, doctor_id: e.target.value })}
            className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:border-brand-400 outline-none">
            <option value="">Link to doctor profile…</option>
            {doctors.map((d) => <option key={d.id} value={d.id}>Dr. {d.name} — {d.specialty}</option>)}
          </select>
        )}
        {err && <p className="text-sm text-accent-600 mt-2">{err}</p>}
        {msg && <p className="text-sm text-green-600 mt-2">{msg}</p>}
        <button type="submit" disabled={busy} className="btn-primary w-full mt-4">
          {busy ? "Creating…" : "Create account"}
        </button>
      </form>
    </div>
  );
}

function StatCard({ label, value, muted, onClick, selected }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-2xl p-5 border transition ${
        selected
          ? "bg-brand-600 text-white border-brand-600 shadow-soft"
          : "bg-white border-slate-200 hover:border-brand-300 hover:shadow-sm"
      }`}
    >
      <div className={`text-3xl font-display font-extrabold ${!selected && muted ? "text-slate-400" : ""}`}>
        {value ?? "—"}
      </div>
      <div className={`text-sm mt-1 ${selected ? "text-brand-100" : "text-slate-500"}`}>{label}</div>
    </button>
  );
}

function StatusBadge({ status }) {
  const map = {
    confirmed: "bg-green-100 text-green-700",
    cancelled: "bg-slate-200 text-slate-500",
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${map[status] || "bg-slate-100 text-slate-600"}`}>
      {status}
    </span>
  );
}

function Select({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:border-brand-400 outline-none"
    >
      {options.map(([v, label]) => (
        <option key={v} value={v}>{label}</option>
      ))}
    </select>
  );
}
