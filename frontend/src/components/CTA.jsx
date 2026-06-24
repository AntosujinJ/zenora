import { Reveal } from "./ui.jsx";

export default function CTA({ onBook }) {
  return (
    <section className="container-x py-12">
      <Reveal>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800 text-white px-8 py-14 text-center shadow-soft">
          <div className="absolute -top-20 -left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -right-10 w-72 h-72 bg-accent-500/20 rounded-full blur-3xl" />
          <div className="relative">
            <h2 className="font-display text-3xl md:text-4xl font-extrabold">
              Ready to feel your best?
            </h2>
            <p className="mt-3 text-brand-100 max-w-xl mx-auto">
              Book your appointment in under a minute. Our team — and our AI
              assistant — are ready whenever you are.
            </p>
            <button
              onClick={onBook}
              className="mt-8 inline-flex items-center gap-2 bg-white text-brand-700 font-bold px-8 py-3.5 rounded-xl hover:bg-brand-50 transition active:scale-[0.98]"
            >
              Book your appointment →
            </button>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
