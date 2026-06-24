import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { streamChat } from "../api.js";

const SESSION = Math.random().toString(36).slice(2);

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! 👋 I'm the clinic assistant. Ask me about our doctors, hours, or how to book an appointment." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);

    // Add an empty assistant bubble we fill in as tokens stream in.
    setMessages([...next, { role: "assistant", content: "" }]);
    try {
      let acc = "";
      await streamChat(next, SESSION, (token) => {
        acc += token;
        setMessages([...next, { role: "assistant", content: acc }]);
      });
    } catch {
      setMessages([...next, { role: "assistant", content: "Sorry, I couldn't reach the assistant. Please make sure Ollama is running." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-brand-500 text-white text-2xl shadow-xl grid place-items-center"
      >
        {open ? "×" : "💬"}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 z-50 w-[350px] max-w-[calc(100vw-3rem)] h-[460px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-100"
          >
            <div className="bg-brand-500 text-white px-4 py-3">
              <div className="font-bold">Clinic Assistant</div>
              <div className="text-xs text-brand-100">Powered by on-device AI</div>
            </div>

            <div className="flex-1 overflow-auto p-3 space-y-3 bg-slate-50">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                      m.role === "user"
                        ? "bg-brand-500 text-white rounded-br-sm"
                        : "bg-white border border-slate-200 text-slate-700 rounded-bl-sm"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && messages[messages.length - 1]?.content === "" && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 px-3 py-2 rounded-2xl text-sm text-slate-400">
                    typing…
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            <div className="p-3 border-t border-slate-100 flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Type a message…"
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
              <button
                onClick={send}
                disabled={loading}
                className="bg-brand-500 disabled:bg-slate-300 text-white px-4 rounded-lg text-sm font-semibold"
              >
                Send
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
