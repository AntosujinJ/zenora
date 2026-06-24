import { motion } from "framer-motion";
import { Heading, Reveal } from "./ui.jsx";

export default function Doctors({ doctors, onBook }) {
  return (
    <section id="doctors" className="bg-slate-50/70 py-24">
      <div className="container-x">
        <Heading
          eyebrow="Our Team"
          title="Meet the doctors who care for you"
          subtitle="Experienced, friendly specialists you can trust with your health."
        />

        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctors.map((d, i) => (
            <Reveal key={d.id} delay={(i % 3) * 0.08}>
              <motion.div
                whileHover={{ y: -8 }}
                className="group h-full bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-soft transition border border-slate-100"
              >
                <div className="relative overflow-hidden">
                  <img
                    src={d.photo}
                    alt={d.name}
                    className="w-full h-60 object-cover group-hover:scale-105 transition duration-500"
                  />
                  <span className="absolute top-3 left-3 glass text-xs font-semibold px-3 py-1 rounded-full text-brand-700">
                    {d.specialty}
                  </span>
                </div>
                <div className="p-6">
                  <h3 className="font-display font-bold text-lg text-ink-900">
                    Dr. {d.name}
                  </h3>
                  <p className="mt-2 text-sm text-slate-500">{d.bio}</p>
                  <button
                    onClick={() => onBook(d.id)}
                    className="mt-5 w-full bg-brand-50 text-brand-700 hover:bg-brand-600 hover:text-white font-semibold py-2.5 rounded-xl transition"
                  >
                    Book with Dr. {d.name.split(" ")[0]}
                  </button>
                </div>
              </motion.div>
            </Reveal>
          ))}
          {doctors.length === 0 && (
            <p className="text-slate-400 col-span-full text-center">
              Loading doctors… (is the backend running and seeded?)
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
