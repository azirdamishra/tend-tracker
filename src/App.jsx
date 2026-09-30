import { useState, useEffect, useMemo } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Plus, Trash2, Pencil, X, Wallet, Grid3x3, Target, Clock, RotateCcw } from 'lucide-react';

// ---------- design tokens ----------
const C = {
  paper: '#F4F2ED',
  ink: '#262321',
  inkSoft: '#736C61',
  plum: '#5B3A57',
  plumTint: '#EDE3EA',
  sage: '#6E8F71',
  gold: '#B8862B',
  rose: '#B3616B',
  line: '#E3DFD5',
  card: '#FFFFFF',
};

const PALETTE = ['#5B3A57', '#3E6E8E', '#6E8F71', '#B8862B', '#B3616B', '#8A6E4B', '#4B7A6F', '#7A5C8A'];

const TAGS = [
  { id: 'necessary', label: 'Necessary', color: C.sage },
  { id: 'planned', label: 'Planned', color: C.gold },
  { id: 'impulse', label: 'Impulse / emotional', color: C.rose },
];

const DEFAULT_CATEGORIES = [
  { id: 'shopping', name: 'Shopping', color: '#5B3A57', subs: [
    { id: 'clothes', name: 'Clothes' }, { id: 'beauty', name: 'Beauty' },
    { id: 'maintenance', name: 'Maintenance' }, { id: 'shoes', name: 'Shoes' },
    { id: 'accessories', name: 'Accessories' },
  ]},
  { id: 'hobbies', name: 'Hobbies', color: '#3E6E8E', subs: [
    { id: 'bead', name: 'Bead supplies' }, { id: 'art', name: 'Art supplies' },
    { id: 'embroidery', name: 'Embroidery supplies' }, { id: 'gymgear', name: 'Gym gear' },
  ]},
  { id: 'health', name: 'Supplements & meds', color: '#6E8F71', subs: [
    { id: 'minoxidil', name: 'Minoxidil' }, { id: 'omega3', name: 'Omega 3' },
  ]},
  { id: 'necessities', name: 'Monthly necessities', color: '#B8862B', subs: [
    { id: 'investment', name: 'Investment' }, { id: 'rent', name: 'Rent' }, { id: 'utilities', name: 'Utilities' },
  ]},
  { id: 'groceries', name: 'Groceries', color: '#8A6E4B', subs: [
    { id: 'personal', name: 'Personal' }, { id: 'common', name: 'Common (flat)' },
  ]},
];

// ---------- utils ----------
function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }
function todayStr() { return new Date().toISOString().slice(0, 10); }
function fmtDate(dstr) {
  const d = new Date(dstr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function startOfWeek(d) {
  const dt = new Date(d);
  const day = dt.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  dt.setDate(dt.getDate() + diff);
  dt.setHours(0, 0, 0, 0);
  return dt;
}
function addDays(d, n) { const dt = new Date(d); dt.setDate(dt.getDate() + n); return dt; }
function monthKey(dstr) { return dstr.slice(0, 7); }
function monthLabel(key) {
  const [y, m] = key.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
}
function inPeriod(dateStr, period) {
  const d = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  if (period === 'week') return d >= startOfWeek(now);
  if (period === 'month') return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  if (period === '3m') return d >= new Date(now.getFullYear(), now.getMonth() - 2, 1);
  return true;
}
function money(n) { return Number(n || 0).toLocaleString('en-IN'); }

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap');
  .tend-root { font-family:'Inter',sans-serif; color:${C.ink}; background:${C.paper}; min-height:100vh; }
  .tend-serif { font-family:'Fraunces', serif; }
  .tend-card { background:${C.card}; border:1px solid ${C.line}; border-radius:10px; padding:20px; }
  .tend-chip { display:inline-flex; align-items:center; gap:6px; padding:7px 14px; border-radius:16px; font-size:13px; cursor:pointer; border:1px solid ${C.line}; background:#fff; transition:background .15s ease, color .15s ease, border-color .15s ease; }
  .tend-tab { padding:8px 14px; border-radius:8px; font-size:14px; cursor:pointer; display:flex; align-items:center; gap:6px; white-space:nowrap; color:${C.inkSoft}; border:none; background:none; }
  .tend-tab.active { background:${C.plumTint}; color:${C.plum}; font-weight:600; }
  .tend-input { border:1px solid ${C.line}; border-radius:8px; padding:9px 12px; font-size:14px; font-family:'Inter',sans-serif; width:100%; background:#fff; color:${C.ink}; }
  .tend-label { display:block; font-size:12px; color:${C.inkSoft}; margin-bottom:6px; margin-top:18px; font-weight:500; }
  .tend-label:first-child { margin-top:0; }
  .tend-btn { border-radius:8px; padding:10px 18px; font-size:14px; font-weight:600; cursor:pointer; border:1px solid transparent; }
  .tend-btn-primary { background:${C.plum}; color:#fff; }
  .tend-btn-primary:disabled { opacity:0.4; cursor:not-allowed; }
  .tend-btn-ghost { background:transparent; color:${C.inkSoft}; border:1px solid ${C.line}; }
  .tend-iconbtn { background:none; border:none; cursor:pointer; color:${C.inkSoft}; display:flex; align-items:center; padding:4px; }
  .tend-select { border:1px solid ${C.line}; border-radius:8px; padding:8px 10px; font-size:13px; background:#fff; color:${C.ink}; }
  .tend-root ::-webkit-scrollbar { height:6px; width:6px; }
  .tend-chip:focus-visible, .tend-btn:focus-visible, .tend-tab:focus-visible, .tend-iconbtn:focus-visible { outline:2px solid ${C.plum}; outline-offset:2px; }
  @media (prefers-reduced-motion: reduce) { .tend-root * { transition:none !important; } }
`;

// ---------- small shared pieces ----------
function ColorDot({ color, size = 10 }) {
  return <span style={{ display: 'inline-block', width: size, height: size, borderRadius: '50%', background: color || '#999', flexShrink: 0 }} />;
}

function Segmented({ options, value, onChange }) {
  return (
    <div style={{ display: 'inline-flex', border: `1px solid ${C.line}`, borderRadius: 8, padding: 2, background: '#fff' }}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className="tend-tab"
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            background: value === o.value ? C.plum : 'transparent',
            color: value === o.value ? '#fff' : C.inkSoft,
            fontWeight: value === o.value ? 600 : 400,
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ConfirmDelete({ onConfirm }) {
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 3000);
    return () => clearTimeout(t);
  }, [confirming]);

  if (confirming) {
    return (
      <span className="flex items-center gap-2" style={{ fontSize: 12 }}>
        <button onClick={onConfirm} style={{ color: C.rose, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>Confirm</button>
        <button onClick={() => setConfirming(false)} style={{ color: C.inkSoft, background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
      </span>
    );
  }
  return (
    <button onClick={() => setConfirming(true)} className="tend-iconbtn" aria-label="Delete">
      <Trash2 size={14} />
    </button>
  );
}

// A "+ New" chip that turns into a text input on click, for adding a
// category or sub-category inline without leaving the current screen.
// Enter creates it; Escape or clicking away discards it.
function QuickAddChip({ placeholder, onAdd }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');

  function reset() { setValue(''); setEditing(false); }
  function commit() {
    const trimmed = value.trim();
    if (trimmed) onAdd(trimmed);
    reset();
  }

  if (!editing) {
    return (
      <button
        type="button"
        className="tend-chip"
        onClick={() => setEditing(true)}
        style={{ borderStyle: 'dashed', color: C.inkSoft }}
      >
        <Plus size={12} style={{ marginRight: 2, verticalAlign: -1 }} />New
      </button>
    );
  }

  return (
    <input
      autoFocus
      className="tend-input"
      style={{ width: 150, padding: '6px 10px' }}
      placeholder={placeholder}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') reset(); }}
      onBlur={reset}
    />
  );
}

function CompositionBar({ data, total }) {
  return (
    <div>
      <div className="flex w-full" style={{ height: 30, borderRadius: 6, overflow: 'hidden', border: `1px solid ${C.line}` }}>
        {data.map((d) => (total > 0 && d.value > 0) ? (
          <div key={d.key} style={{ width: `${(d.value / total) * 100}%`, background: d.color }} title={`${d.label}`} />
        ) : null)}
      </div>
      <div className="flex flex-wrap gap-5 mt-3">
        {data.map((d) => (
          <div key={d.key} className="flex items-center gap-2" style={{ fontSize: 13 }}>
            <ColorDot color={d.color} size={9} />
            <span style={{ color: C.inkSoft }}>{d.label}</span>
            <span style={{ fontWeight: 600 }}>{total > 0 ? Math.round((d.value / total) * 100) : 0}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopList({ items, max }) {
  if (items.length === 0) return <div style={{ color: C.inkSoft, fontSize: 13 }}>Nothing here yet.</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map((it) => (
        <div key={it.label}>
          <div className="flex justify-between" style={{ fontSize: 13, marginBottom: 4 }}>
            <span className="flex items-center gap-2"><ColorDot color={it.color} size={8} />{it.label}</span>
            <span style={{ fontWeight: 600 }}>{money(it.value)}</span>
          </div>
          <div style={{ height: 6, background: C.line, borderRadius: 3 }}>
            <div style={{ height: 6, width: `${max > 0 ? (it.value / max) * 100 : 0}%`, background: it.color, borderRadius: 3 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="tend-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
      <div className="tend-serif" style={{ fontSize: 20, marginBottom: 8 }}>Nothing logged yet</div>
      <div style={{ color: C.inkSoft, fontSize: 14 }}>{text}</div>
    </div>
  );
}

// ---------- Overview ----------
function OverviewTab({ categories, expenses, currency }) {
  const [period, setPeriod] = useState('month');

  const filtered = useMemo(() => expenses.filter((e) => inPeriod(e.date, period)), [expenses, period]);
  const total = useMemo(() => filtered.reduce((s, e) => s + e.amount, 0), [filtered]);

  const byCategory = useMemo(() => {
    const map = {};
    filtered.forEach((e) => { map[e.categoryId] = (map[e.categoryId] || 0) + e.amount; });
    return Object.entries(map).map(([catId, value]) => {
      const cat = categories.find((c) => c.id === catId);
      return { name: cat ? cat.name : 'Deleted category', value, color: cat ? cat.color : '#999999' };
    }).sort((a, b) => b.value - a.value);
  }, [filtered, categories]);

  const byTag = useMemo(() => TAGS.map((t) => ({
    key: t.id, label: t.label, color: t.color,
    value: filtered.filter((e) => e.tag === t.id).reduce((s, e) => s + e.amount, 0),
  })), [filtered]);

  const topSubs = useMemo(() => {
    const map = {};
    filtered.forEach((e) => {
      const key = e.categoryId + '::' + e.subId;
      if (!map[key]) {
        const cat = categories.find((c) => c.id === e.categoryId);
        const sub = cat ? cat.subs.find((s) => s.id === e.subId) : null;
        map[key] = { label: (sub ? sub.name : 'Other') + (cat ? ' · ' + cat.name : ''), color: cat ? cat.color : '#999999', value: 0 };
      }
      map[key].value += e.amount;
    });
    return Object.values(map).sort((a, b) => b.value - a.value).slice(0, 6);
  }, [filtered, categories]);
  const maxSub = topSubs.length ? topSubs[0].value : 0;

  const weeklyData = useMemo(() => {
    const now = new Date();
    const weeks = [];
    for (let i = 7; i >= 0; i--) {
      const start = addDays(startOfWeek(now), -7 * i);
      const end = addDays(start, 7);
      const label = `${start.getDate()}/${start.getMonth() + 1}`;
      const value = expenses.filter((e) => {
        const d = new Date(e.date + 'T00:00:00');
        return d >= start && d < end;
      }).reduce((s, e) => s + e.amount, 0);
      weeks.push({ label, value });
    }
    return weeks;
  }, [expenses]);

  const monthlyImpulse = useMemo(() => {
    const map = {};
    expenses.forEach((e) => {
      const mk = monthKey(e.date);
      if (!map[mk]) map[mk] = { total: 0, impulse: 0 };
      map[mk].total += e.amount;
      if (e.tag === 'impulse') map[mk].impulse += e.amount;
    });
    const keys = Object.keys(map).sort().slice(-6);
    return keys.map((k) => ({ label: monthLabel(k), value: map[k].total ? Math.round((map[k].impulse / map[k].total) * 100) : 0 }));
  }, [expenses]);

  const insight = useMemo(() => {
    if (monthlyImpulse.length < 2) return null;
    const curr = monthlyImpulse[monthlyImpulse.length - 1];
    const prev = monthlyImpulse[monthlyImpulse.length - 2];
    const diff = curr.value - prev.value;
    if (diff === 0) return `Impulse tags held steady at ${curr.value}% of spend this month.`;
    return `Impulse-tagged spending is ${curr.value}% of the total this month, ${diff > 0 ? 'up' : 'down'} ${Math.abs(diff)} points from last month.`;
  }, [monthlyImpulse]);

  if (expenses.length === 0) {
    return <EmptyState text="Add your first expense and this page fills in with charts of where your money's actually going." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 4 }}>
            {period === 'week' ? 'This week' : period === 'month' ? 'This month' : 'Last 3 months'}
          </div>
          <div className="tend-serif" style={{ fontSize: 40, fontWeight: 600 }}>{currency}{money(total)}</div>
        </div>
        <Segmented value={period} onChange={setPeriod} options={[
          { value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }, { value: '3m', label: '3 months' },
        ]} />
      </div>

      {total === 0 ? (
        <div style={{ color: C.inkSoft, fontSize: 14 }}>Nothing logged for this period yet.</div>
      ) : (
        <>
          <div className="tend-card">
            <div style={{ fontWeight: 600, marginBottom: 16 }}>Where it went</div>
            <div className="flex flex-wrap gap-8 items-center">
              <div style={{ width: 220, height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={2} stroke="none">
                      {byCategory.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v) => `${currency}${money(v)}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ flex: 1, minWidth: 180 }}>
                {byCategory.map((c, i) => (
                  <div key={i} className="flex justify-between items-center" style={{ padding: '6px 0' }}>
                    <span className="flex items-center gap-2" style={{ fontSize: 14 }}><ColorDot color={c.color} />{c.name}</span>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{Math.round((c.value / total) * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="tend-card">
            <div style={{ fontWeight: 600, marginBottom: 16 }}>Necessary, planned, or impulse?</div>
            <CompositionBar data={byTag} total={total} />
          </div>

          <div className="tend-card">
            <div style={{ fontWeight: 600, marginBottom: 16 }}>Top places money goes</div>
            <TopList items={topSubs} max={maxSub} />
          </div>

          <div className="tend-card">
            <div style={{ fontWeight: 600, marginBottom: 16 }}>Weekly spend, last 8 weeks</div>
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.line} vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: C.inkSoft }} axisLine={{ stroke: C.line }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: C.inkSoft }} axisLine={false} tickLine={false} width={44} />
                  <Tooltip formatter={(v) => `${currency}${money(v)}`} />
                  <Bar dataKey="value" fill={C.plum} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {monthlyImpulse.length > 1 && (
            <div className="tend-card">
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Impulse share over time</div>
              {insight && <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 16 }}>{insight}</div>}
              <div style={{ height: 140 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyImpulse}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.line} vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: C.inkSoft }} axisLine={{ stroke: C.line }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: C.inkSoft }} axisLine={false} tickLine={false} width={36} unit="%" />
                    <Tooltip formatter={(v) => `${v}%`} />
                    <Line type="monotone" dataKey="value" stroke={C.rose} strokeWidth={2} dot={{ r: 3, fill: C.rose }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------- Add / Edit expense ----------
function AddExpenseTab({ categories, currency, editingExpense, onSave, onCancelEdit, onAddCategory, onAddSub }) {
  const [date, setDate] = useState(todayStr());
  const [categoryId, setCategoryId] = useState(null);
  const [subId, setSubId] = useState(null);
  const [amount, setAmount] = useState('');
  const [tag, setTag] = useState('necessary');
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (editingExpense) {
      setDate(editingExpense.date);
      setCategoryId(editingExpense.categoryId);
      setSubId(editingExpense.subId);
      setAmount(String(editingExpense.amount));
      setTag(editingExpense.tag);
      setNote(editingExpense.note || '');
    }
  }, [editingExpense]);

  const selectedCategory = categories.find((c) => c.id === categoryId) || null;

  function reset() {
    setDate(todayStr()); setCategoryId(null); setSubId(null); setAmount(''); setTag('necessary'); setNote('');
  }

  function handleSave() {
    const amt = parseFloat(amount);
    const subOk = subId || (selectedCategory && selectedCategory.subs.length === 0);
    if (!categoryId || !subOk || !amt || amt <= 0) return;
    const expense = {
      id: editingExpense ? editingExpense.id : uid(),
      date, categoryId, subId: subId || null, amount: amt, tag, note: note.trim(),
      createdAt: editingExpense ? editingExpense.createdAt : Date.now(),
    };
    onSave(expense, !!editingExpense);
    if (editingExpense) {
      onCancelEdit();
    } else {
      reset();
      setSaved(true);
      setTimeout(() => setSaved(false), 1600);
    }
  }

  const canSave = categoryId && (subId || (selectedCategory && selectedCategory.subs.length === 0)) && parseFloat(amount) > 0;

  return (
    <div className="tend-card" style={{ maxWidth: 480 }}>
      {editingExpense && (
        <div className="flex justify-between items-center" style={{ marginBottom: 16, padding: '8px 12px', background: C.plumTint, borderRadius: 8, fontSize: 13, color: C.plum }}>
          <span>Editing an expense</span>
          <button onClick={onCancelEdit} className="tend-iconbtn" style={{ color: C.plum }}><X size={14} /></button>
        </div>
      )}

      <label className="tend-label">Date</label>
      <input type="date" className="tend-input" value={date} onChange={(e) => setDate(e.target.value)} />

      <label className="tend-label">Category</label>
      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c.id}
            className="tend-chip"
            onClick={() => { setCategoryId(c.id); setSubId(null); }}
            style={{
              background: categoryId === c.id ? c.color : '#fff',
              borderColor: c.color,
              color: categoryId === c.id ? '#fff' : C.ink,
            }}
          >
            {c.name}
          </button>
        ))}
        <QuickAddChip
          placeholder="New category"
          onAdd={(name) => {
            const id = onAddCategory(name);
            if (id) { setCategoryId(id); setSubId(null); }
          }}
        />
      </div>

      {selectedCategory && (
        <>
          <label className="tend-label">
            What kind? {selectedCategory.subs.length === 0 && <span style={{ fontWeight: 400 }}>— optional</span>}
          </label>
          <div className="flex flex-wrap gap-2">
            {selectedCategory.subs.map((s) => (
              <button
                key={s.id}
                className="tend-chip"
                onClick={() => setSubId(s.id)}
                style={{
                  background: subId === s.id ? selectedCategory.color : '#fff',
                  borderColor: selectedCategory.color,
                  color: subId === s.id ? '#fff' : C.ink,
                }}
              >
                {s.name}
              </button>
            ))}
            <QuickAddChip
              placeholder="New kind"
              onAdd={(name) => {
                const id = onAddSub(selectedCategory.id, name);
                if (id) setSubId(id);
              }}
            />
          </div>
        </>
      )}

      <label className="tend-label">Amount</label>
      <div className="flex items-center gap-2">
        <span style={{ fontSize: 15, color: C.inkSoft }}>{currency}</span>
        <input type="number" step="0.01" min="0" className="tend-input" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
      </div>

      <label className="tend-label">How did this feel? <span style={{ fontWeight: 400 }}>— just for you, no right answer</span></label>
      <div className="flex flex-wrap gap-2">
        {TAGS.map((t) => (
          <button
            key={t.id}
            className="tend-chip"
            onClick={() => setTag(t.id)}
            style={{
              background: tag === t.id ? t.color : '#fff',
              borderColor: t.color,
              color: tag === t.id ? '#fff' : C.ink,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <label className="tend-label">Note (optional)</label>
      <input type="text" className="tend-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. saw it on instagram" />

      <div className="flex items-center gap-3" style={{ marginTop: 22 }}>
        <button className="tend-btn tend-btn-primary" disabled={!canSave} onClick={handleSave}>
          {editingExpense ? 'Update expense' : 'Save expense'}
        </button>
        {saved && <span style={{ color: C.sage, fontSize: 13, fontWeight: 600 }}>Saved ✓</span>}
      </div>
    </div>
  );
}

// ---------- Categories ----------
function CategoriesTab({ categories, onChange, onAddCategory, onAddSub, onReset }) {
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState(PALETTE[0]);
  const [subInputs, setSubInputs] = useState({});

  function updateCategory(id, patch) { onChange(categories.map((c) => (c.id === id ? { ...c, ...patch } : c))); }
  function deleteCategory(id) { onChange(categories.filter((c) => c.id !== id)); }
  function addSub(catId) {
    const text = (subInputs[catId] || '').trim();
    if (!text) return;
    onAddSub(catId, text);
    setSubInputs((prev) => ({ ...prev, [catId]: '' }));
  }
  function deleteSub(catId, subId) {
    onChange(categories.map((c) => (c.id === catId ? { ...c, subs: c.subs.filter((s) => s.id !== subId) } : c)));
  }
  function addCategory() {
    if (!newCatName.trim()) return;
    onAddCategory(newCatName, newCatColor);
    setNewCatName('');
    setNewCatColor(PALETTE[categories.length % PALETTE.length]);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {categories.map((c) => (
        <div key={c.id} className="tend-card">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                {PALETTE.map((p) => (
                  <button
                    key={p}
                    onClick={() => updateCategory(c.id, { color: p })}
                    aria-label={`Set color ${p}`}
                    style={{ width: 16, height: 16, borderRadius: 4, background: p, border: c.color === p ? `2px solid ${C.ink}` : '1px solid transparent', cursor: 'pointer' }}
                  />
                ))}
              </div>
              <input
                value={c.name}
                onChange={(e) => updateCategory(c.id, { name: e.target.value })}
                style={{ fontWeight: 600, fontSize: 16, border: 'none', background: 'transparent', outline: 'none' }}
              />
            </div>
            <ConfirmDelete onConfirm={() => deleteCategory(c.id)} />
          </div>
          <div className="flex flex-wrap items-center gap-2" style={{ marginTop: 14 }}>
            {c.subs.map((s) => (
              <span key={s.id} className="tend-chip" style={{ cursor: 'default' }}>
                {s.name}
                <button onClick={() => deleteSub(c.id, s.id)} className="tend-iconbtn" style={{ padding: 0 }} aria-label={`Remove ${s.name}`}>
                  <X size={12} />
                </button>
              </span>
            ))}
            <input
              className="tend-input"
              style={{ width: 180 }}
              placeholder="Add subcategory + Enter"
              value={subInputs[c.id] || ''}
              onChange={(e) => setSubInputs((prev) => ({ ...prev, [c.id]: e.target.value }))}
              onKeyDown={(e) => { if (e.key === 'Enter') addSub(c.id); }}
            />
          </div>
        </div>
      ))}

      <div className="tend-card">
        <div style={{ fontWeight: 600, marginBottom: 12 }}>New category</div>
        <div className="flex flex-wrap items-center gap-3">
          <input className="tend-input" style={{ width: 200 }} placeholder="e.g. Books" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addCategory(); }} />
          <div className="flex gap-1">
            {PALETTE.map((p) => (
              <button key={p} onClick={() => setNewCatColor(p)} style={{ width: 18, height: 18, borderRadius: 4, background: p, border: newCatColor === p ? `2px solid ${C.ink}` : '1px solid transparent', cursor: 'pointer' }} />
            ))}
          </div>
          <button className="tend-btn tend-btn-primary" onClick={addCategory}><Plus size={14} style={{ marginRight: 4, verticalAlign: -2 }} />Add category</button>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={onReset} className="tend-iconbtn" style={{ fontSize: 13, gap: 6 }}>
          <RotateCcw size={13} /> Reset all data
        </button>
      </div>
    </div>
  );
}

// ---------- Goals ----------
function GoalsTab({ goals, onChange, currency }) {
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [addAmounts, setAddAmounts] = useState({});

  function addGoal() {
    if (!name.trim() || !parseFloat(target)) return;
    onChange([...goals, { id: uid(), name: name.trim(), target: parseFloat(target), saved: 0, targetDate: targetDate || null }]);
    setName(''); setTarget(''); setTargetDate(''); setShowNew(false);
  }
  function deleteGoal(id) { onChange(goals.filter((g) => g.id !== id)); }
  function contribute(id) {
    const amt = parseFloat(addAmounts[id]);
    if (!amt) return;
    onChange(goals.map((g) => (g.id === id ? { ...g, saved: g.saved + amt } : g)));
    setAddAmounts((prev) => ({ ...prev, [id]: '' }));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {goals.length === 0 && !showNew && (
        <EmptyState text="Add a goal for a trip, a bike, a PC — whatever you're saving toward — and track it separately from day-to-day spend." />
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {goals.map((g) => {
          const pct = Math.min(100, Math.round((g.saved / g.target) * 100));
          const daysLeft = g.targetDate ? Math.ceil((new Date(g.targetDate) - new Date()) / 86400000) : null;
          return (
            <div key={g.id} className="tend-card">
              <div className="flex justify-between items-start">
                <div className="tend-serif" style={{ fontWeight: 600, fontSize: 17 }}>{g.name}</div>
                <ConfirmDelete onConfirm={() => deleteGoal(g.id)} />
              </div>
              <div style={{ fontSize: 13, color: C.inkSoft, marginTop: 4 }}>
                {currency}{money(g.saved)} of {currency}{money(g.target)}
                {daysLeft !== null ? ` · ${daysLeft >= 0 ? daysLeft + ' days left' : 'past target date'}` : ''}
              </div>
              <div style={{ height: 8, background: C.line, borderRadius: 4, marginTop: 10 }}>
                <div style={{ height: 8, width: pct + '%', background: C.gold, borderRadius: 4, transition: 'width 0.6s ease' }} />
              </div>
              <div style={{ fontSize: 12, marginTop: 4, color: C.inkSoft }}>{pct}%</div>
              <div className="flex gap-2" style={{ marginTop: 12 }}>
                <input
                  type="number" step="0.01" min="0"
                  className="tend-input"
                  placeholder="Add amount"
                  value={addAmounts[g.id] || ''}
                  onChange={(e) => setAddAmounts((prev) => ({ ...prev, [g.id]: e.target.value }))}
                />
                <button className="tend-btn tend-btn-ghost" onClick={() => contribute(g.id)}>Add</button>
              </div>
            </div>
          );
        })}
      </div>

      {!showNew ? (
        <button className="tend-btn tend-btn-primary" style={{ alignSelf: 'flex-start' }} onClick={() => setShowNew(true)}>
          <Plus size={14} style={{ marginRight: 4, verticalAlign: -2 }} />New goal
        </button>
      ) : (
        <div className="tend-card" style={{ maxWidth: 380 }}>
          <label className="tend-label">Goal name</label>
          <input className="tend-input" placeholder="e.g. Goa trip, new PC" value={name} onChange={(e) => setName(e.target.value)} />
          <label className="tend-label">Target amount</label>
          <div className="flex items-center gap-2">
            <span style={{ color: C.inkSoft }}>{currency}</span>
            <input type="number" step="0.01" min="0" className="tend-input" value={target} onChange={(e) => setTarget(e.target.value)} />
          </div>
          <label className="tend-label">Target date (optional)</label>
          <input type="date" className="tend-input" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          <div className="flex gap-2" style={{ marginTop: 18 }}>
            <button className="tend-btn tend-btn-primary" onClick={addGoal}>Save goal</button>
            <button className="tend-btn tend-btn-ghost" onClick={() => setShowNew(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- History ----------
function HistoryTab({ categories, expenses, currency, onEdit, onDelete }) {
  const [filterCat, setFilterCat] = useState('all');
  const [filterTag, setFilterTag] = useState('all');

  const filtered = expenses
    .filter((e) => (filterCat === 'all' || e.categoryId === filterCat) && (filterTag === 'all' || e.tag === filterTag))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);

  const grouped = {};
  filtered.forEach((e) => { (grouped[e.date] = grouped[e.date] || []).push(e); });
  const dates = Object.keys(grouped).sort().reverse();

  return (
    <div>
      <div className="flex flex-wrap gap-2" style={{ marginBottom: 20 }}>
        <select className="tend-select" value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
          <option value="all">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="tend-select" value={filterTag} onChange={(e) => setFilterTag(e.target.value)}>
          <option value="all">All tags</option>
          {TAGS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </div>

      {dates.length === 0 && <EmptyState text="No expenses match these filters yet." />}

      {dates.map((date) => {
        const dayTotal = grouped[date].reduce((s, e) => s + e.amount, 0);
        return (
          <div key={date} style={{ marginBottom: 24 }}>
            <div className="flex justify-between" style={{ borderBottom: `1px solid ${C.line}`, paddingBottom: 6, marginBottom: 8 }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{fmtDate(date)}</span>
              <span style={{ color: C.inkSoft, fontSize: 14 }}>{currency}{money(dayTotal)}</span>
            </div>
            {grouped[date].map((e) => {
              const cat = categories.find((c) => c.id === e.categoryId);
              const sub = cat ? cat.subs.find((s) => s.id === e.subId) : null;
              const tagInfo = TAGS.find((t) => t.id === e.tag);
              return (
                <div key={e.id} className="flex justify-between items-center" style={{ padding: '10px 0', borderBottom: `1px solid ${C.line}` }}>
                  <div className="flex items-center gap-3">
                    <ColorDot color={cat ? cat.color : '#999999'} />
                    <div>
                      <div style={{ fontSize: 14 }}>
                        {sub ? sub.name : 'Other'} <span style={{ color: C.inkSoft, fontSize: 12 }}>· {cat ? cat.name : 'Deleted category'}</span>
                      </div>
                      {e.note && <div style={{ fontSize: 12, fontStyle: 'italic', color: C.inkSoft }}>{e.note}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <ColorDot color={tagInfo ? tagInfo.color : '#999999'} size={8} />
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{currency}{money(e.amount)}</span>
                    <button onClick={() => onEdit(e.id)} className="tend-iconbtn" aria-label="Edit"><Pencil size={14} /></button>
                    <ConfirmDelete onConfirm={() => onDelete(e.id)} />
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ---------- App ----------
export default function App() {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [expenses, setExpenses] = useState([]);
  const [goals, setGoals] = useState([]);
  const [currency, setCurrency] = useState('₹');
  const [tab, setTab] = useState('overview');
  const [editingId, setEditingId] = useState(null);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [saveError, setSaveError] = useState(null);

  async function safeGet(key) {
    try {
      const r = await window.storage.get(key, false);
      return r ? JSON.parse(r.value) : null;
    } catch (e) {
      return null;
    }
  }
  async function safeSet(key, value) {
    try {
      await window.storage.set(key, JSON.stringify(value), false);
      setSaveError(null); // a later save succeeding clears any earlier warning
    } catch (e) {
      console.error('storage set failed', key, e);
      setSaveError("Couldn't save your last change — check that the server is running, then try again.");
    }
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [c, e, g, cur] = await Promise.all([
          safeGet('categories'), safeGet('expenses'), safeGet('goals'), safeGet('currency'),
        ]);
        if (!mounted) return;
        if (c) setCategories(c); else await safeSet('categories', DEFAULT_CATEGORIES);
        if (e) setExpenses(e);
        if (g) setGoals(g);
        if (cur) setCurrency(cur);
      } catch (err) {
        console.error(err);
        if (mounted) setLoadError(true);
      }
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  function updateCategories(next) { setCategories(next); safeSet('categories', next); }
  function updateGoals(next) { setGoals(next); safeSet('goals', next); }
  function updateCurrency(next) { setCurrency(next); safeSet('currency', next); }

  // Shared by the Categories tab's own "new category"/"add subcategory" form
  // and the Add Expense tab's inline quick-add chips, so both entry points
  // create categories/subs the same way. Returns the new id (or null if the
  // name was blank) so a caller can auto-select what it just created.
  function handleAddCategory(name, color) {
    const trimmed = (name || '').trim();
    if (!trimmed) return null;
    const cat = { id: uid(), name: trimmed, color: color || PALETTE[categories.length % PALETTE.length], subs: [] };
    updateCategories([...categories, cat]);
    return cat.id;
  }
  function handleAddSub(catId, subName) {
    const trimmed = (subName || '').trim();
    if (!trimmed) return null;
    const sub = { id: uid(), name: trimmed };
    updateCategories(categories.map((c) => (c.id === catId ? { ...c, subs: [...c.subs, sub] } : c)));
    return sub.id;
  }

  function handleSaveExpense(expense, isEdit) {
    const next = isEdit ? expenses.map((e) => (e.id === expense.id ? expense : e)) : [...expenses, expense];
    setExpenses(next);
    safeSet('expenses', next);
  }
  function handleDeleteExpense(id) {
    const next = expenses.filter((e) => e.id !== id);
    setExpenses(next);
    safeSet('expenses', next);
  }
  function handleEditRequest(id) { setEditingId(id); setTab('add'); }
  function handleCancelEdit() { setEditingId(null); }

  async function handleReset() {
    await Promise.all(['categories', 'expenses', 'goals', 'currency'].map((k) => window.storage.delete(k, false).catch(() => {})));
    setCategories(DEFAULT_CATEGORIES);
    setExpenses([]);
    setGoals([]);
    setCurrency('₹');
    await safeSet('categories', DEFAULT_CATEGORIES);
    setResetConfirm(false);
  }

  const editingExpense = expenses.find((e) => e.id === editingId) || null;

  const TABS = [
    { id: 'overview', label: 'Overview', icon: Wallet },
    { id: 'add', label: editingExpense ? 'Edit' : 'Add', icon: Plus },
    { id: 'categories', label: 'Categories', icon: Grid3x3 },
    { id: 'goals', label: 'Goals', icon: Target },
    { id: 'history', label: 'History', icon: Clock },
  ];

  if (loading) {
    return (
      <div className="tend-root flex items-center justify-center" style={{ height: 300 }}>
        <style>{styles}</style>
        <span style={{ color: C.inkSoft }}>Loading your ledger…</span>
      </div>
    );
  }

  return (
    <div className="tend-root">
      <style>{styles}</style>
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '28px 16px 60px' }}>
        <div className="flex justify-between items-start flex-wrap gap-3" style={{ marginBottom: 22 }}>
          <div>
            <div className="tend-serif" style={{ fontSize: 30, fontWeight: 600 }}>Tend</div>
            <div style={{ fontSize: 13, color: C.inkSoft }}>a spending diary, not a spreadsheet</div>
          </div>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 12, color: C.inkSoft }}>Currency</span>
            <input
              className="tend-input"
              style={{ width: 54, textAlign: 'center', padding: '7px 4px' }}
              value={currency}
              onChange={(e) => updateCurrency(e.target.value.slice(0, 3))}
            />
          </div>
        </div>

        {loadError && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: '#FBEEEE', color: C.rose, borderRadius: 8, fontSize: 13 }}>
            Couldn't load saved data — starting fresh for this session.
          </div>
        )}

        {saveError && (
          <div
            className="flex justify-between items-center gap-3"
            style={{ marginBottom: 16, padding: '10px 14px', background: '#FBEEEE', color: C.rose, borderRadius: 8, fontSize: 13 }}
          >
            <span>{saveError}</span>
            <button onClick={() => setSaveError(null)} className="tend-iconbtn" style={{ color: C.rose, flexShrink: 0 }} aria-label="Dismiss">
              <X size={14} />
            </button>
          </div>
        )}

        <div className="flex gap-1" style={{ overflowX: 'auto', marginBottom: 26, borderBottom: `1px solid ${C.line}`, paddingBottom: 10 }}>
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                className={`tend-tab ${tab === t.id ? 'active' : ''}`}
                onClick={() => { setTab(t.id); if (t.id !== 'add') setEditingId(null); }}
              >
                <Icon size={15} />{t.label}
              </button>
            );
          })}
        </div>

        {tab === 'overview' && <OverviewTab categories={categories} expenses={expenses} currency={currency} />}
        {tab === 'add' && (
          <AddExpenseTab
            categories={categories}
            currency={currency}
            editingExpense={editingExpense}
            onSave={handleSaveExpense}
            onCancelEdit={handleCancelEdit}
            onAddCategory={handleAddCategory}
            onAddSub={handleAddSub}
          />
        )}
        {tab === 'categories' && (
          <CategoriesTab
            categories={categories}
            onChange={updateCategories}
            onAddCategory={handleAddCategory}
            onAddSub={handleAddSub}
            onReset={() => setResetConfirm(true)}
          />
        )}
        {tab === 'goals' && <GoalsTab goals={goals} onChange={updateGoals} currency={currency} />}
        {tab === 'history' && (
          <HistoryTab categories={categories} expenses={expenses} currency={currency} onEdit={handleEditRequest} onDelete={handleDeleteExpense} />
        )}

        {resetConfirm && (
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(38,35,33,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
            onClick={() => setResetConfirm(false)}
          >
            <div className="tend-card" style={{ maxWidth: 360 }} onClick={(e) => e.stopPropagation()}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Reset all data?</div>
              <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 18 }}>
                This clears every expense, category and goal saved here. This can't be undone.
              </div>
              <div className="flex gap-2 justify-end">
                <button className="tend-btn tend-btn-ghost" onClick={() => setResetConfirm(false)}>Cancel</button>
                <button className="tend-btn tend-btn-primary" style={{ background: C.rose }} onClick={handleReset}>Reset everything</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
