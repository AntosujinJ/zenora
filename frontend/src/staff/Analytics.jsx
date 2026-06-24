import { useEffect, useState } from "react";
import {
  Area, AreaChart, Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { adminAnalytics, adminExportCsv } from "../api.js";

const COLORS = ["#0d9488", "#14b8a6", "#2dd4bf", "#0ea5e9", "#f59e0b", "#fb7185", "#94a3b8"];

export default function Analytics() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    adminAnalytics(days).then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, [days]);

  const exportCsv = async () => {
    const blob = await adminExportCsv();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "appointments.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading || !data) {
    return <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-400">Loading analytics…</div>;
  }
  const t = data.totals;

  return (
    <div className="space-y-5">
      {/* toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1">
          {[7, 30, 90].map((d) => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${days === d ? "bg-brand-600 text-white" : "text-slate-500 hover:text-brand-600"}`}>
              {d}d
            </button>
          ))}
        </div>
        <button onClick={exportCsv} className="btn-ghost !py-2 text-sm">⬇ Export CSV</button>
      </div>

      {/* summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="Total appointments" value={t.appointments} />
        <Kpi label="Patients" value={t.patients} />
        <Kpi label="Revenue collected" value={`₹${t.revenue.toLocaleString()}`} accent />
        <Kpi label="Cancellation rate" value={`${t.cancellation_rate}%`} muted />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* bookings per day */}
        <Card title={`Bookings (last ${days} days)`}>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data.bookings_per_day} margin={{ left: -20, right: 10, top: 10 }}>
              <defs>
                <linearGradient id="gB" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#14b8a6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area type="monotone" dataKey="count" stroke="#0d9488" strokeWidth={2} fill="url(#gB)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* revenue per day */}
        <Card title={`Revenue collected (last ${days} days)`}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.revenue_per_day} margin={{ left: -10, right: 10, top: 10 }}>
              <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => `₹${v}`} />
              <Bar dataKey="amount" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* by status */}
        <Card title="Appointments by status">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={data.by_status} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                {data.by_status.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <Legend items={data.by_status} />
        </Card>

        {/* by payment method */}
        <Card title="Payments by method">
          {data.by_payment.length === 0 ? (
            <p className="text-sm text-slate-400 py-16 text-center">No payments yet.</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={data.by_payment} dataKey="amount" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                    {data.by_payment.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => `₹${v}`} />
                </PieChart>
              </ResponsiveContainer>
              <Legend items={data.by_payment.map((p) => ({ name: `${p.name} (₹${p.amount})`, value: p.value }))} />
            </>
          )}
        </Card>

        {/* by doctor */}
        <Card title="Appointments by doctor" wide>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.by_doctor} layout="vertical" margin={{ left: 30, right: 20 }}>
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#0d9488" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ label, value, accent, muted }) {
  return (
    <div className={`rounded-2xl p-5 border ${accent ? "bg-brand-600 text-white border-brand-600" : "bg-white border-slate-200"}`}>
      <div className={`text-2xl font-display font-extrabold ${muted ? "text-slate-400" : ""}`}>{value ?? "—"}</div>
      <div className={`text-sm mt-1 ${accent ? "text-brand-100" : "text-slate-500"}`}>{label}</div>
    </div>
  );
}

function Card({ title, children, wide }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 p-5 ${wide ? "lg:col-span-2" : ""}`}>
      <h3 className="font-semibold text-ink-900 mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Legend({ items }) {
  return (
    <div className="flex flex-wrap gap-3 justify-center mt-2">
      {items.map((it, i) => (
        <span key={it.name} className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
          {it.name} · {it.value}
        </span>
      ))}
    </div>
  );
}
