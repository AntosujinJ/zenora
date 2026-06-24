import axios from "axios";

// In dev, leave VITE_API_URL unset → calls go to "/api" (Vite proxies to :8000).
// In production, set VITE_API_URL to the backend URL, e.g. https://zenora-api.onrender.com
export const API_BASE = import.meta.env.VITE_API_URL || "";
const api = axios.create({ baseURL: `${API_BASE}/api` });

export const getClinic = () => api.get("/clinic").then((r) => r.data);
export const getDoctors = () => api.get("/doctors").then((r) => r.data);
export const getAvailability = (doctorId, date) =>
  api
    .get("/availability", { params: { doctor_id: doctorId, date } })
    .then((r) => r.data);
export const bookAppointment = (payload) =>
  api.post("/appointments", payload).then((r) => r.data);
export const sendChat = (messages, sessionId) =>
  api.post("/chat", { messages, session_id: sessionId }).then((r) => r.data);

// Payments
export const paymentConfig = () => api.get("/payments/config").then((r) => r.data);
export const createOrder = (payload) => api.post("/payments/order", payload).then((r) => r.data);
export const verifyPayment = (payload) => api.post("/payments/verify", payload).then((r) => r.data);

// Streaming chat: calls onToken(text) for each chunk as it arrives.
export async function streamChat(messages, sessionId, onToken) {
  const resp = await fetch(`${API_BASE}/api/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, session_id: sessionId }),
  });
  if (!resp.ok || !resp.body) throw new Error("stream failed");
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    onToken(decoder.decode(value, { stream: true }));
  }
}

// ---------------- Staff auth (JWT) ----------------
const TOKEN_STORE = "zenora_staff_token";
const USER_STORE = "zenora_staff_user";
export const getToken = () => localStorage.getItem(TOKEN_STORE) || "";
export const getStaffUser = () => {
  try { return JSON.parse(localStorage.getItem(USER_STORE) || "null"); } catch { return null; }
};
export const isLoggedIn = () => !!getToken();
export const clearAuth = () => {
  localStorage.removeItem(TOKEN_STORE);
  localStorage.removeItem(USER_STORE);
};
const staffHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

// Build an authenticated URL for a stored document (token in query so <img> works).
export const fileUrl = (url) =>
  url ? `${API_BASE}${url}${url.includes("?") ? "&" : "?"}token=${encodeURIComponent(getToken())}` : url;

export const staffLogin = async (username, password) => {
  const data = await api.post("/admin/login", { username, password }).then((r) => r.data);
  localStorage.setItem(TOKEN_STORE, data.token);
  localStorage.setItem(USER_STORE, JSON.stringify(data.user));
  return data;
};

export const adminAnalytics = (days = 30) =>
  api.get("/admin/analytics", { params: { days }, headers: staffHeaders() }).then((r) => r.data);
export const adminExportCsv = () =>
  api.get("/admin/export/appointments.csv", { headers: staffHeaders(), responseType: "blob" }).then((r) => r.data);
export const adminListStaff = () =>
  api.get("/admin/staff", { headers: staffHeaders() }).then((r) => r.data);
export const adminCreateStaff = (payload) =>
  api.post("/admin/staff", payload, { headers: staffHeaders() }).then((r) => r.data);

// Doctor dashboard
export const doctorMe = () =>
  api.get("/doctor/me", { headers: staffHeaders() }).then((r) => r.data);
export const doctorUpdateAvailability = (payload) =>
  api.put("/doctor/availability", payload, { headers: staffHeaders() }).then((r) => r.data);
export const doctorAppointments = (scope = "upcoming") =>
  api.get("/doctor/appointments", { params: { scope }, headers: staffHeaders() }).then((r) => r.data);
export const doctorPatients = () =>
  api.get("/doctor/patients", { headers: staffHeaders() }).then((r) => r.data);
export const doctorPatientDetail = (pid) =>
  api.get(`/doctor/patients/${pid}`, { headers: staffHeaders() }).then((r) => r.data);
export const doctorComplete = (id) =>
  api.post(`/doctor/appointments/${id}/complete`, {}, { headers: staffHeaders() }).then((r) => r.data);
export const doctorAddRecord = (pid, formData) =>
  api.post(`/doctor/patients/${pid}/records`, formData, { headers: staffHeaders() }).then((r) => r.data);
export const adminStats = () =>
  api.get("/admin/stats", { headers: staffHeaders() }).then((r) => r.data);
export const adminAppointments = (params) =>
  api.get("/admin/appointments", { params, headers: staffHeaders() }).then((r) => r.data);
export const adminCancel = (id) =>
  api.post(`/admin/appointments/${id}/cancel`, {}, { headers: staffHeaders() }).then((r) => r.data);
export const adminReschedule = (id, payload) =>
  api.post(`/admin/appointments/${id}/reschedule`, payload, { headers: staffHeaders() }).then((r) => r.data);
export const adminRecordPayment = (id, payload) =>
  api.post(`/admin/appointments/${id}/payment`, payload, { headers: staffHeaders() }).then((r) => r.data);

// Patients / EMR
export const lookupPatient = (params) =>
  api.get("/patients/lookup", { params }).then((r) => r.data);
export const adminPatients = (search = "") =>
  api.get("/admin/patients", { params: { search }, headers: staffHeaders() }).then((r) => r.data);
export const adminCreatePatient = (payload) =>
  api.post("/admin/patients", payload, { headers: staffHeaders() }).then((r) => r.data);
export const adminPatientDetail = (pid) =>
  api.get(`/admin/patients/${pid}`, { headers: staffHeaders() }).then((r) => r.data);
export const adminAddRecord = (pid, formData) =>
  api.post(`/admin/patients/${pid}/records`, formData, { headers: staffHeaders() }).then((r) => r.data);

export default api;
