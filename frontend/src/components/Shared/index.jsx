// src/components/Shared/index.jsx
// Sab shared components ek file mein — import as needed

// ── Spinner ───────────────────────────────────────────────────────
export function Spinner({ text = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-400 text-sm">{text}</p>
    </div>
  )
}

// ── PageTitle ─────────────────────────────────────────────────────
export function PageTitle({ title, subtitle, children }) {
  return (
    <div className="flex justify-between items-start mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{title}</h1>
        {subtitle && <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">{subtitle}</p>}
      </div>
      {children && <div className="flex gap-2">{children}</div>}
    </div>
  )
}

// ── StatCard ──────────────────────────────────────────────────────
export function StatCard({ title, value, icon: Icon, color = 'blue' }) {
  const styles = {
    blue:    'from-blue-500/20 to-indigo-500/20 text-blue-600 dark:text-blue-400 border-blue-200/50 dark:border-blue-500/20',
    emerald: 'from-emerald-500/20 to-teal-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-500/20',
    amber:   'from-amber-500/20 to-orange-500/20 text-amber-600 dark:text-amber-400 border-amber-200/50 dark:border-amber-500/20',
    rose:    'from-rose-500/20 to-red-500/20 text-rose-600 dark:text-rose-400 border-rose-200/50 dark:border-rose-500/20',
    purple:  'from-purple-500/20 to-fuchsia-500/20 text-purple-600 dark:text-purple-400 border-purple-200/50 dark:border-purple-500/20',
    indigo:  'from-indigo-500/20 to-blue-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-200/50 dark:border-indigo-500/20',
  }

  const iconStyles = {
    blue:    'bg-blue-500/10 text-blue-600 shadow-blue-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-600 shadow-emerald-500/20',
    amber:   'bg-amber-500/10 text-amber-600 shadow-amber-500/20',
    rose:    'bg-rose-500/10 text-rose-600 shadow-rose-500/20',
    purple:  'bg-purple-500/10 text-purple-600 shadow-purple-500/20',
    indigo:  'bg-indigo-500/10 text-indigo-600 shadow-indigo-500/20',
  }

  return (
    <div className="card group p-6">
      <div className="flex justify-between items-center mb-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-lg ${iconStyles[color] || iconStyles.blue}`}>
          {Icon && <Icon size={24} />}
        </div>
        <div className={`h-1.5 w-1.5 rounded-full bg-${color}-500 animate-pulse`}></div>
      </div>
      <div>
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">{title}</p>
        <div className="flex items-baseline gap-1">
          <p className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">{value ?? '0'}</p>
          <span className="text-[10px] font-bold text-emerald-500">+12%</span>
        </div>
      </div>
      {/* Decorative gradient overlay */}
      <div className={`absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-br transition-opacity opacity-0 group-hover:opacity-100 blur-2xl rounded-full ${styles[color] || styles.blue}`} />
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────────────
export function Modal({ title, onClose, children, size = 'md' }) {
  const widths = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-4xl' }
  return (
    <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300"
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl w-full border border-white dark:border-white/5 transition-all scale-in duration-300 max-h-[95vh] flex flex-col ${widths[size]}`}>
        <div className="flex justify-between items-center px-10 py-8 shrink-0">
          <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">{title}</h2>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all">&times;</button>
        </div>
        <div className="px-10 pb-10 overflow-y-auto thin-scrollbar">{children}</div>
      </div>
    </div>
  )
}

// ── FormField ─────────────────────────────────────────────────────
export function FormField({ label, error, children }) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>}
      {children}
      {error && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{error}</p>}
    </div>
  )
}

// ── EmptyState ────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, text, subtext }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
      {Icon && <Icon size={48} className="mb-3 opacity-40" />}
      <p className="font-medium text-gray-500 dark:text-gray-400">{text}</p>
      {subtext && <p className="text-sm mt-1">{subtext}</p>}
    </div>
  )
}

// ── StatusBadge ───────────────────────────────────────────────────
export function StatusBadge({ status }) {
  const map = {
    PENDING:   'badge-amber',
    APPROVED:  'badge-green',
    REJECTED:  'badge-red',
    CANCELLED: 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-400 px-2 py-0.5 rounded-full text-xs font-medium',
    CONDUCTED: 'badge-green',
    SKIPPED:   'badge-amber',
    HOLIDAY:   'badge-blue',
    PAID:      'badge-green',
    UNPAID:    'badge-red',
  }
  return <span className={map[status] || 'badge-blue'}>{status}</span>
}

// ── Pagination ────────────────────────────────────────────────────
export function Pagination({ meta, page, setPage }) {
  if (!meta || meta.pages <= 1) return null
  
  const currentPage = parseInt(page || meta.page || 1)
  const totalPages = parseInt(meta.pages)
  const canPrev = currentPage > 1
  const canNext = currentPage < totalPages

  return (
    <div className="flex justify-between items-center px-4 py-3 border-t bg-gray-50 dark:bg-slate-900/50 dark:border-slate-700 text-sm transition-colors duration-200">
      <span className="text-gray-500 dark:text-gray-400">
        Page {currentPage} of {totalPages} — {meta.total} total
      </span>
      <div className="flex gap-2">
        <button 
          onClick={() => setPage(currentPage - 1)} 
          disabled={!canPrev}
          className="px-3 py-1 border dark:border-slate-600 rounded disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-slate-800 dark:text-gray-300 transition-opacity"
        >
          ← Prev
        </button>
        <button 
          onClick={() => setPage(currentPage + 1)} 
          disabled={!canNext}
          className="px-3 py-1 border dark:border-slate-600 rounded disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-slate-800 dark:text-gray-300 transition-opacity"
        >
          Next →
        </button>
      </div>
    </div>
  )
}

// ── ConfirmDialog ─────────────────────────────────────────────────
export function ConfirmDialog({ title, message, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 max-w-sm w-full mx-4 transition-colors duration-200">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-2">{title}</h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-5">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 btn-outline">Cancel</button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 btn-danger">
            {loading ? 'Please wait...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}
