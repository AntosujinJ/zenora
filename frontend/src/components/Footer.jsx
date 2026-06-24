import Logo from "./Logo.jsx";

export default function Footer({ clinic, onBook }) {
  return (
    <footer id="contact" className="bg-ink-900 text-slate-300">
      <div className="container-x py-16 grid md:grid-cols-4 gap-10">
        <div className="md:col-span-1">
          <Logo light />
          <p className="mt-4 text-sm text-slate-400 leading-relaxed">
            Compassionate, modern healthcare for you and your family — powered by
            caring doctors and smart technology.
          </p>
          <div className="mt-5 flex gap-3">
            {["𝕏", "f", "in", "◎"].map((s) => (
              <a
                key={s}
                href="#"
                className="w-9 h-9 grid place-items-center rounded-lg bg-white/5 hover:bg-brand-600 transition"
              >
                {s}
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-white">Explore</h4>
          <ul className="mt-4 space-y-2.5 text-sm">
            {[["Services", "#services"], ["Why us", "#why"], ["Doctors", "#doctors"], ["Reviews", "#reviews"], ["FAQ", "#faq"]].map(([l, h]) => (
              <li key={h}><a href={h} className="hover:text-white transition">{l}</a></li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-white">Contact</h4>
          <ul className="mt-4 space-y-2.5 text-sm text-slate-400">
            <li>📞 {clinic?.phone || "+91 98765 43210"}</li>
            <li>📍 {clinic?.address || "12 Wellness Road, Kochi"}</li>
            <li>🕒 {clinic?.hours || "Mon-Sat 9AM - 6PM"}</li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-white">Ready to book?</h4>
          <p className="mt-4 text-sm text-slate-400">
            Get seen by a specialist this week.
          </p>
          <button
            onClick={onBook}
            className="mt-4 w-full bg-brand-600 hover:bg-brand-500 text-white font-semibold py-2.5 rounded-xl transition"
          >
            Book Appointment
          </button>
        </div>
      </div>

      <div className="border-t border-white/10 py-5 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} {clinic?.name || "Zenora Clinic"}. All rights reserved · Demo for portfolio use.
        <a href="/staff" className="ml-2 text-slate-400 hover:text-white underline">Staff login</a>
      </div>
    </footer>
  );
}
