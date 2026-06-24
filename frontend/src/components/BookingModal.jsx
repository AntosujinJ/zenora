import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getAvailability, bookAppointment, lookupPatient, paymentConfig, createOrder, verifyPayment } from "../api.js";

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function BookingModal({ open, onClose, doctors, preselectedDoctor, prefillPatient = null, onBooked, closeOnBook = false, bookingPackage = null }) {
  const pkgAmount = bookingPackage ? Number(String(bookingPackage.price).replace(/[^\d]/g, "")) : null;
  const [step, setStep] = useState(1);
  const [doctorId, setDoctorId] = useState("");
  const [date, setDate] = useState(todayStr());
  const [slots, setSlots] = useState([]);
  const [time, setTime] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [form, setForm] = useState({ patient_name: "", patient_phone: "", patient_email: "", reason: "", patient_id: "" });
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [error, setError] = useState("");
  const [lookupMsg, setLookupMsg] = useState("");
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [payCfg, setPayCfg] = useState(null);

  useEffect(() => { paymentConfig().then(setPayCfg).catch(() => {}); }, []);

  const payNow = async () => {
    setPaying(true);
    try {
      const order = await createOrder({ appointment_id: confirmation.id, amount_inr: pkgAmount || undefined });
      if (order.demo) {
        await verifyPayment({ razorpay_order_id: order.order_id, appointment_id: confirmation.id });
        setPaid(true);
        return;
      }
      const rzp = new window.Razorpay({
        key: order.key_id,
        amount: order.amount_inr * 100,
        currency: "INR",
        name: "Zenora Clinic",
        description: "Consultation fee",
        order_id: order.order_id,
        prefill: { name: form.patient_name, email: form.patient_email, contact: form.patient_phone },
        theme: { color: "#0d9488" },
        handler: async (res) => {
          await verifyPayment({
            razorpay_order_id: res.razorpay_order_id,
            razorpay_payment_id: res.razorpay_payment_id,
            razorpay_signature: res.razorpay_signature,
            appointment_id: confirmation.id,
          });
          setPaid(true);
        },
      });
      rzp.on("payment.failed", () => setPaying(false));
      rzp.open();
    } catch {
      // ignore — user can retry
    } finally {
      setPaying(false);
    }
  };

  // Reset whenever the modal opens.
  useEffect(() => {
    if (open) {
      setStep(1);
      setDoctorId(preselectedDoctor || "");
      setDate(todayStr());
      setTime("");
      setConfirmation(null);
      setError("");
      setLookupMsg("");
      setPaid(false);
      setPaying(false);
      setForm({
        patient_name: prefillPatient?.name || "",
        patient_phone: prefillPatient?.phone || "",
        patient_email: prefillPatient?.email || "",
        reason: bookingPackage ? bookingPackage.name : "",
        patient_id: prefillPatient?.patient_id || "",
      });
    }
  }, [open, preselectedDoctor, prefillPatient, bookingPackage]);

  const findReturning = async () => {
    const id = form.patient_id.trim();
    const phone = form.patient_phone.trim();
    if (!id || !phone) {
      setLookupMsg("Enter your Patient ID and the phone number on file.");
      return;
    }
    setLookupMsg("Verifying…");
    try {
      const res = await lookupPatient({ patient_id: id, phone });
      if (res.found) {
        setForm((f) => ({
          ...f,
          patient_name: res.patient.name || f.patient_name,
          patient_email: res.patient.email || f.patient_email,
        }));
        setLookupMsg(`✅ Welcome back, ${res.patient.name}! Details filled in.`);
      } else {
        setLookupMsg("Couldn't verify — check your Patient ID and phone, or just book as new.");
      }
    } catch {
      setLookupMsg("Couldn't verify right now. Please enter your details below.");
    }
  };

  // Fetch slots whenever doctor + date are chosen.
  useEffect(() => {
    if (doctorId && date && step === 2) {
      setLoadingSlots(true);
      setTime("");
      getAvailability(doctorId, date)
        .then((d) => setSlots(d.slots))
        .catch(() => setSlots([]))
        .finally(() => setLoadingSlots(false));
    }
  }, [doctorId, date, step]);

  const doctor = doctors.find((d) => d.id === doctorId);

  const submit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        doctor_id: doctorId,
        date,
        time,
        patient_name: form.patient_name,
        patient_phone: form.patient_phone,
        reason: form.reason,
      };
      if (form.patient_email.trim()) payload.patient_email = form.patient_email.trim();
      if (form.patient_id.trim()) payload.patient_id = form.patient_id.trim();
      if (pkgAmount) payload.amount = pkgAmount;
      const appt = await bookAppointment(payload);
      onBooked?.(appt);
      if (closeOnBook) {
        onClose();
        return;
      }
      setConfirmation(appt);
      setStep(4);
    } catch (e) {
      setError(e?.response?.data?.detail || "Could not book. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm grid place-items-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
          >
            <div className="flex justify-between items-center">
              <h3 className="font-extrabold text-lg text-slate-900">
                {step === 4 ? "You're booked! 🎉" : "Book an appointment"}
              </h3>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl">×</button>
            </div>

            {step < 4 && (
              <div className="flex gap-1 mt-4 mb-5">
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    className={`h-1.5 flex-1 rounded-full ${s <= step ? "bg-brand-500" : "bg-slate-200"}`}
                  />
                ))}
              </div>
            )}

            {bookingPackage && step < 4 && (
              <div className="mb-4 flex items-center justify-between rounded-xl bg-brand-50 border border-brand-200 px-4 py-3">
                <div>
                  <div className="text-xs text-brand-600">Booking checkup</div>
                  <div className="font-semibold text-brand-800">{bookingPackage.name}</div>
                </div>
                <div className="font-display text-xl font-extrabold text-brand-700">{bookingPackage.price}</div>
              </div>
            )}

            {/* STEP 1 — choose doctor */}
            {step === 1 && (
              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-700">Choose a doctor</label>
                <div className="space-y-2 max-h-64 overflow-auto">
                  {doctors.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setDoctorId(d.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition ${
                        doctorId === d.id ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:border-brand-300"
                      }`}
                    >
                      <img src={d.photo} className="w-10 h-10 rounded-full object-cover" alt="" />
                      <div>
                        <div className="font-semibold text-slate-900">Dr. {d.name}</div>
                        <div className="text-xs text-slate-500">{d.specialty}</div>
                      </div>
                    </button>
                  ))}
                </div>
                <button
                  disabled={!doctorId}
                  onClick={() => setStep(2)}
                  className="w-full bg-brand-500 disabled:bg-slate-300 text-white font-semibold py-2.5 rounded-xl transition"
                >
                  Continue
                </button>
              </div>
            )}

            {/* STEP 2 — date + slot */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Pick a date</label>
                  <input
                    type="date"
                    value={date}
                    min={todayStr()}
                    onChange={(e) => setDate(e.target.value)}
                    className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Available times</label>
                  {loadingSlots ? (
                    <p className="text-sm text-slate-500 mt-2">Loading slots…</p>
                  ) : slots.length === 0 ? (
                    <p className="text-sm text-slate-500 mt-2">No slots this day. Try another date.</p>
                  ) : (
                    <div className="mt-2 grid grid-cols-4 gap-2 max-h-40 overflow-auto">
                      {slots.map((s) => (
                        <button
                          key={s}
                          onClick={() => setTime(s)}
                          className={`text-sm py-1.5 rounded-lg border transition ${
                            time === s ? "border-brand-500 bg-brand-500 text-white" : "border-slate-200 hover:border-brand-300"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setStep(1)} className="flex-1 border border-slate-200 font-semibold py-2.5 rounded-xl">Back</button>
                  <button
                    disabled={!time}
                    onClick={() => setStep(3)}
                    className="flex-1 bg-brand-500 disabled:bg-slate-300 text-white font-semibold py-2.5 rounded-xl"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3 — patient details */}
            {step === 3 && (
              <div className="space-y-3">
                <div className="text-sm bg-brand-50 text-brand-700 rounded-lg p-3">
                  Dr. {doctor?.name} · {date} · {time}
                </div>
                <div className="rounded-lg border border-dashed border-slate-300 p-3">
                  <label className="text-xs font-semibold text-slate-500">Returning patient? Verify with your Patient ID + phone</label>
                  <input
                    placeholder="Patient ID (e.g. ZN-0001)"
                    value={form.patient_id}
                    onChange={(e) => setForm({ ...form, patient_id: e.target.value })}
                    className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm uppercase"
                  />
                  <div className="flex gap-2 mt-2">
                    <input
                      placeholder="Phone on file"
                      value={form.patient_phone}
                      onChange={(e) => setForm({ ...form, patient_phone: e.target.value })}
                      className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    />
                    <button type="button" onClick={findReturning} className="px-4 rounded-lg bg-slate-100 hover:bg-brand-100 text-sm font-semibold">
                      Find
                    </button>
                  </div>
                  {lookupMsg && <p className="text-xs mt-1 text-slate-500">{lookupMsg}</p>}
                </div>
                <input
                  placeholder="Full name"
                  value={form.patient_name}
                  onChange={(e) => setForm({ ...form, patient_name: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2"
                />
                <input
                  placeholder="Phone number"
                  value={form.patient_phone}
                  onChange={(e) => setForm({ ...form, patient_phone: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2"
                />
                <input
                  placeholder="Email (optional)"
                  value={form.patient_email}
                  onChange={(e) => setForm({ ...form, patient_email: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2"
                />
                <textarea
                  placeholder="Reason for visit (optional)"
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 h-20 resize-none"
                />
                {error && <p className="text-sm text-red-600">{error}</p>}
                <div className="flex gap-2">
                  <button onClick={() => setStep(2)} className="flex-1 border border-slate-200 font-semibold py-2.5 rounded-xl">Back</button>
                  <button
                    disabled={!form.patient_name || !form.patient_phone || submitting}
                    onClick={submit}
                    className="flex-1 bg-brand-500 disabled:bg-slate-300 text-white font-semibold py-2.5 rounded-xl"
                  >
                    {submitting ? "Booking…" : "Confirm Booking"}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4 — confirmation */}
            {step === 4 && confirmation && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
                <div className="text-5xl">✅</div>
                <p className="mt-3 text-slate-700">
                  Your appointment with <b>Dr. {doctor?.name}</b> is confirmed for{" "}
                  <b>{confirmation.date}</b> at <b>{confirmation.time}</b>.
                </p>
                {confirmation.patient_id && (
                  <div className="mt-4 rounded-xl bg-brand-50 border border-brand-200 p-3">
                    <div className="text-xs text-brand-600">
                      {confirmation.is_new_patient ? "Your Patient ID (save it for next time)" : "Welcome back — your Patient ID"}
                    </div>
                    <div className="font-display text-2xl font-extrabold text-brand-700 tracking-wide">
                      {confirmation.patient_id}
                    </div>
                  </div>
                )}
                <p className="mt-2 text-xs text-slate-400">Ref: {confirmation.id.slice(0, 8)}</p>

                {payCfg && !paid && (
                  <div className="mt-4 rounded-xl border border-slate-200 p-4">
                    <div className="text-sm text-slate-600">{bookingPackage ? bookingPackage.name : "Amount payable"}</div>
                    <div className="font-display text-2xl font-extrabold text-ink-900">₹{pkgAmount ?? payCfg.consultation_fee_inr}</div>
                    {payCfg.live ? (
                      <button
                        onClick={payNow}
                        disabled={paying}
                        className="mt-3 w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-60"
                      >
                        {paying ? "Processing…" : `Pay ₹${pkgAmount ?? payCfg.consultation_fee_inr} now`}
                      </button>
                    ) : (
                      <p className="mt-2 text-sm text-slate-500">💳 Pay at the clinic, or set up online payments to collect now.</p>
                    )}
                  </div>
                )}
                {paid && (
                  <div className="mt-4 rounded-xl bg-green-50 border border-green-200 p-3 text-green-700 font-semibold">
                    ✅ Payment received — see you at your appointment!
                  </div>
                )}

                <button onClick={onClose} className="mt-5 w-full bg-brand-500 text-white font-semibold py-2.5 rounded-xl">
                  {paid ? "Done" : "I'll pay at the clinic"}
                </button>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
