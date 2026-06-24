import { Heading, Reveal } from "./ui.jsx";
import { steps } from "../content.js";

export default function HowItWorks() {
  return (
    <section className="container-x py-24">
      <Heading
        eyebrow="How it works"
        title="Booking in four easy steps"
        subtitle="No phone calls, no waiting rooms for paperwork — just a few taps."
      />

      <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-5 relative">
        {steps.map((s, i) => (
          <Reveal key={s.n} delay={i * 0.1}>
            <div className="relative h-full rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="font-display text-5xl font-extrabold text-brand-100">
                {s.n}
              </div>
              <h3 className="mt-2 font-display font-bold text-lg text-ink-900">
                {s.title}
              </h3>
              <p className="mt-2 text-sm text-slate-500">{s.desc}</p>
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-10 -right-3 text-brand-300 text-2xl">
                  →
                </div>
              )}
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
