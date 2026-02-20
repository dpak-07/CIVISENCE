import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  FaCheckCircle,
  FaClock,
  FaBrain,
  FaCity,
  FaRocket,
  FaTools,
} from "react-icons/fa";
import "./App.css";

const COUNTDOWN_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const COUNTDOWN_STORAGE_KEY = "civisense_coming_soon_launch_at";

const getLaunchTarget = () => {
  const now = Date.now();

  if (typeof window === "undefined") {
    return now + COUNTDOWN_DURATION_MS;
  }

  const saved = Number(window.localStorage.getItem(COUNTDOWN_STORAGE_KEY));
  if (Number.isFinite(saved) && saved > now) {
    return saved;
  }

  const launchAt = now + COUNTDOWN_DURATION_MS;
  window.localStorage.setItem(COUNTDOWN_STORAGE_KEY, String(launchAt));
  return launchAt;
};

const getCountdownParts = (remainingMs) => {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds };
};

function TypewriterText({
  text,
  startDelay = 0,
  speed = 28,
  showCursor = false,
}) {
  const [visible, setVisible] = useState("");

  useEffect(() => {
    let typeTimer;
    let startTimer;
    let index = 0;

    const typeNext = () => {
      if (index <= text.length) {
        setVisible(text.slice(0, index));
        index += 1;
        typeTimer = setTimeout(typeNext, speed);
      }
    };

    startTimer = setTimeout(typeNext, startDelay);

    return () => {
      clearTimeout(startTimer);
      clearTimeout(typeTimer);
    };
  }, [text, startDelay, speed]);

  return (
    <>
      <span>{visible}</span>
      {showCursor && visible.length < text.length ? (
        <span className="civ-cursor" aria-hidden="true">
          |
        </span>
      ) : null}
    </>
  );
}

function App() {
  const [launchTarget] = useState(getLaunchTarget);
  const [remainingMs, setRemainingMs] = useState(() =>
    Math.max(0, launchTarget - Date.now())
  );

  useEffect(() => {
    const tick = () => {
      setRemainingMs(Math.max(0, launchTarget - Date.now()));
    };

    tick();
    const interval = setInterval(tick, 1000);

    return () => clearInterval(interval);
  }, [launchTarget]);

  const countdown = getCountdownParts(remainingMs);

  return (
    <main className="civ-shell">
      <div className="civ-grid" />
      <div className="civ-noise" />
      <motion.div
        className="civ-orb civ-orb-a"
        animate={{ x: [0, 50, -20, 0], y: [0, -30, 20, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="civ-orb civ-orb-b"
        animate={{ x: [0, -60, 30, 0], y: [0, 25, -35, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />

      <section className="civ-wrap civ-wrap-coming">
        <motion.p
          className="civ-chip"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <FaCity />
          <TypewriterText
            text="CiviSense Control Layer"
            startDelay={80}
            speed={22}
          />
        </motion.p>

        <motion.h1
          className="civ-title civ-title-coming"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          <TypewriterText
            text="Coming Soon"
            startDelay={220}
            speed={80}
            showCursor
          />
        </motion.h1>

        <motion.p
          className="civ-subtitle"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          <TypewriterText
            text="We are preparing the next phase of CiviSense with stronger AI routing, better municipal workflows, and a faster complaint experience."
            startDelay={520}
            speed={18}
          />
        </motion.p>

        <motion.div
          className="civ-timer-wrap"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
        >
          <p className="civ-timer-label">Launch Countdown (7 Days)</p>
          <div className="civ-timer-grid">
            <div className="civ-timer-box">
              <strong>{String(countdown.days).padStart(2, "0")}</strong>
              <span>Days</span>
            </div>
            <div className="civ-timer-box">
              <strong>{String(countdown.hours).padStart(2, "0")}</strong>
              <span>Hours</span>
            </div>
            <div className="civ-timer-box">
              <strong>{String(countdown.minutes).padStart(2, "0")}</strong>
              <span>Minutes</span>
            </div>
            <div className="civ-timer-box">
              <strong>{String(countdown.seconds).padStart(2, "0")}</strong>
              <span>Seconds</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="civ-status-row"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
        >
          <span className="civ-badge">
            <FaRocket />
            <TypewriterText
              text="Launching public preview soon"
              startDelay={1150}
              speed={20}
            />
          </span>
          <span className="civ-badge">
            <FaClock />
            <TypewriterText
              text="Real-time system tuning in progress"
              startDelay={1450}
              speed={20}
            />
          </span>
        </motion.div>

        <motion.div
          className="civ-cards civ-cards-coming"
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.45 }}
        >
          <motion.article
            className="civ-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.55 }}
            whileHover={{ y: -6, scale: 1.01 }}
          >
            <span className="civ-card-icon">
              <FaTools />
            </span>
            <h2>
              <TypewriterText
                text="Platform Hardening"
                startDelay={1850}
                speed={28}
              />
            </h2>
            <p>
              <TypewriterText
                text="Backend and AI services are being optimized for production load."
                startDelay={2050}
                speed={16}
              />
            </p>
          </motion.article>

          <motion.article
            className="civ-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.65 }}
            whileHover={{ y: -6, scale: 1.01 }}
          >
            <span className="civ-card-icon">
              <FaBrain />
            </span>
            <h2>
              <TypewriterText
                text="AI Decision Layer"
                startDelay={2450}
                speed={28}
              />
            </h2>
            <p>
              <TypewriterText
                text="Priority engine and quality checks are under active validation."
                startDelay={2650}
                speed={16}
              />
            </p>
          </motion.article>

          <motion.article
            className="civ-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.75 }}
            whileHover={{ y: -6, scale: 1.01 }}
          >
            <span className="civ-card-icon">
              <FaCheckCircle />
            </span>
            <h2>
              <TypewriterText
                text="Release Readiness"
                startDelay={3050}
                speed={28}
              />
            </h2>
            <p>
              <TypewriterText
                text="Final integrations are in progress before wider municipal rollout."
                startDelay={3250}
                speed={16}
              />
            </p>
          </motion.article>
        </motion.div>

        <motion.p
          className="civ-credit"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.9 }}
        >
          <TypewriterText
            text="Designed by Deepak and Priya Dharshini"
            startDelay={3650}
            speed={34}
            showCursor
          />
        </motion.p>
      </section>
    </main>
  );
}

export default App;
