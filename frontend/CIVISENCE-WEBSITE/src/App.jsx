import React from "react";
import { FaRocket, FaBrain, FaTools } from "react-icons/fa";
import { AiOutlineLoading3Quarters } from "react-icons/ai";

function App() {
  return (
    <div className="relative flex items-center justify-center min-h-screen bg-black overflow-hidden text-white">

      {/* Animated Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-blue-900 to-black opacity-30 blur-3xl animate-pulse"></div>

      {/* Floating Glow Circles */}
      <div className="absolute w-72 h-72 bg-cyan-400 rounded-full blur-3xl opacity-20 animate-bounce top-10 left-10"></div>
      <div className="absolute w-96 h-96 bg-blue-600 rounded-full blur-3xl opacity-20 animate-ping bottom-10 right-10"></div>

      {/* Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]"></div>

      {/* Content */}
      <div className="relative z-10 text-center px-6">

        {/* Title */}
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-widest flex items-center justify-center gap-3 animate-pulse">
          <FaRocket className="text-cyan-400 animate-bounce" />
          Civi<span className="text-cyan-400">Sense</span>
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-xl md:text-2xl text-gray-300 flex items-center justify-center gap-2 animate-fadeIn">
          <FaBrain className="text-blue-400 animate-spin-slow" />
          AI Civic Intelligence Launching Soon
        </p>

        {/* Description */}
        <p className="mt-4 text-gray-400 max-w-xl mx-auto">
          Smart automation. Real-time civic reporting.
          <br />
          Advanced backend stress testing in progress.
        </p>

        {/* Loader */}
        <div className="flex justify-center mt-10">
          <AiOutlineLoading3Quarters className="text-5xl text-cyan-400 animate-spin" />
        </div>

        {/* Status */}
        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-gray-500 tracking-widest animate-pulse">
          <FaTools className="text-gray-400" />
          UNDER MASSIVE DEVELOPMENT • STAY TUNED
        </div>

      </div>
    </div>
  );
}

export default App;