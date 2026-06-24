import { useEffect, useState } from "react";
import { motion, useScroll } from "framer-motion";
import Navbar from "./components/Navbar.jsx";
import Hero from "./components/Hero.jsx";
import Partners from "./components/Partners.jsx";
import Services from "./components/Services.jsx";
import Packages from "./components/Packages.jsx";
import WhyUs from "./components/WhyUs.jsx";
import Stats from "./components/Stats.jsx";
import HowItWorks from "./components/HowItWorks.jsx";
import Doctors from "./components/Doctors.jsx";
import Testimonials from "./components/Testimonials.jsx";
import FAQ from "./components/FAQ.jsx";
import CTA from "./components/CTA.jsx";
import Footer from "./components/Footer.jsx";
import BookingModal from "./components/BookingModal.jsx";
import ChatWidget from "./components/ChatWidget.jsx";
import { getClinic, getDoctors } from "./api.js";

export default function App() {
  const { scrollYProgress } = useScroll();
  const [clinic, setClinic] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [preselectedDoctor, setPreselectedDoctor] = useState(null);
  const [bookingPackage, setBookingPackage] = useState(null);

  useEffect(() => {
    getClinic().then((c) => setClinic(c && typeof c === "object" ? c : null)).catch(() => {});
    getDoctors().then((d) => setDoctors(Array.isArray(d) ? d : [])).catch(() => setDoctors([]));
  }, []);

  const openBooking = (doctorId = null) => {
    setPreselectedDoctor(typeof doctorId === "string" ? doctorId : null);
    setBookingPackage(null);
    setBookingOpen(true);
  };

  const openPackage = (pkg) => {
    setPreselectedDoctor(null);
    setBookingPackage(pkg);
    setBookingOpen(true);
  };

  return (
    <div className="min-h-screen">
      <motion.div
        style={{ scaleX: scrollYProgress }}
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-500 via-brand-600 to-sky-500 origin-left z-[60]"
      />
      <Navbar clinic={clinic} onBook={() => openBooking()} />
      <Hero clinic={clinic} onBook={() => openBooking()} />
      <Partners />
      <Services />
      <Packages onBook={openPackage} />
      <WhyUs />
      <Stats />
      <HowItWorks />
      <Doctors doctors={doctors} onBook={openBooking} />
      <Testimonials />
      <FAQ />
      <CTA onBook={() => openBooking()} />
      <Footer clinic={clinic} onBook={() => openBooking()} />

      <BookingModal
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        doctors={doctors}
        preselectedDoctor={preselectedDoctor}
        bookingPackage={bookingPackage}
      />
      <ChatWidget />
    </div>
  );
}
