function StatusTimeline({ items }) {
  return (
    <ol className="relative ml-3 border-s border-cyan-300/30">
      {items.map((item, index) => (
        <li key={`${item.label}-${index}`} className="mb-7 ms-6">
          <span className="absolute -start-[7px] mt-1 h-3.5 w-3.5 rounded-full border border-cyan-300/40 bg-cyan-300/75" />
          <h4 className="font-medium text-white">{item.label}</h4>
          <time className="text-xs uppercase tracking-[0.14em] text-slate-400">{item.timestamp}</time>
        </li>
      ))}
    </ol>
  );
}

export default StatusTimeline;
