function ComplaintTable({ rows, columns, renderActions, emptyMessage = "No records found." }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-[0.12em] text-slate-300">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="px-4 py-3 font-medium">
                  {column.label}
                </th>
              ))}
              {renderActions ? <th className="px-4 py-3 font-medium">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (renderActions ? 1 : 0)}
                  className="px-4 py-8 text-center text-slate-300"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-white/6 text-slate-100">
                  {columns.map((column) => (
                    <td key={`${row.id}-${column.key}`} className="px-4 py-3 align-top">
                      {column.render ? column.render(row) : row[column.key]}
                    </td>
                  ))}
                  {renderActions ? <td className="px-4 py-3">{renderActions(row)}</td> : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ComplaintTable;
