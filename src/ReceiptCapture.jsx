import { useEffect, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';

// Subset of App.jsx's design tokens — duplicated rather than imported to
// avoid a circular import between this file and App.jsx (which renders
// this component).
const C = {
  ink: '#262321',
  inkSoft: '#736C61',
  sage: '#6E8F71',
  rose: '#B3616B',
  line: '#E3DFD5',
};

function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }
function todayStr() { return new Date().toISOString().slice(0, 10); }

// Downscales a photo on a canvas before it ever leaves the browser — keeps
// the upload small and bounds OCR time/memory on a 1GB Pi.
function downscaleImage(file, maxDim = 1600, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale) || 1;
      const h = Math.round(img.height * scale) || 1;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read image')); };
    img.src = url;
  });
}

function summaryNote(names) {
  if (names.length <= 3) return names.join(', ');
  return `${names.slice(0, 3).join(', ')} +${names.length - 3} more`;
}

const MAX_PHOTOS = 5;

// Alternate mode for AddExpenseTab: photograph a receipt, get a draft list
// of items back from local OCR, fix up whatever it got wrong, then save it
// as one grocery expense and choose which items also restock Inventory.
export function ReceiptCapture({ categories, inventoryCategories, currency, defaultCategoryId, onSave }) {
  const [images, setImages] = useState([]); // [{ id, dataUrl }]
  const [status, setStatus] = useState('capture'); // capture | scanning | reviewing
  const [scanError, setScanError] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [rows, setRows] = useState([]);
  const [date, setDate] = useState(todayStr());
  const [categoryId, setCategoryId] = useState(defaultCategoryId || null);
  const [subId, setSubId] = useState(null);
  const [note, setNote] = useState('');
  const [totalOverride, setTotalOverride] = useState('');
  const [totalTouched, setTotalTouched] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef(null);

  const selectedCategory = categories.find((c) => c.id === categoryId) || null;

  const subtotal = rows.reduce((sum, r) => {
    const price = parseFloat(r.price);
    const qty = parseFloat(r.quantity);
    return sum + (price > 0 && qty > 0 ? price * qty : 0);
  }, 0);

  // Keeps the total in sync with the editable item rows until the user
  // types into the total field themselves (e.g. to account for tax).
  useEffect(() => {
    if (!totalTouched) setTotalOverride(subtotal > 0 ? subtotal.toFixed(2) : '');
  }, [subtotal, totalTouched]);

  async function handleFiles(fileList) {
    const files = Array.from(fileList).slice(0, MAX_PHOTOS - images.length);
    if (files.length === 0) return;
    try {
      const next = await Promise.all(files.map(async (f) => ({ id: uid(), dataUrl: await downscaleImage(f) })));
      setImages((prev) => [...prev, ...next]);
    } catch {
      setScanError("Couldn't read one of those photos — try a different one.");
    }
  }

  function removeImage(id) { setImages((prev) => prev.filter((i) => i.id !== id)); }

  async function handleScan() {
    if (images.length === 0) return;
    setStatus('scanning');
    setScanError(null);
    try {
      const res = await fetch('/api/receipt/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: images.map((i) => i.dataUrl) }),
      });
      if (!res.ok) throw new Error('Scan failed');
      const { items, warnings: scanWarnings } = await res.json();
      setRows(items.map((it) => ({
        id: uid(), name: it.name, price: String(it.price), quantity: '1', addToInventory: false, inventoryCategoryId: null,
      })));
      setWarnings(scanWarnings || []);
    } catch {
      setScanError("Couldn't read that receipt — check that the server's running, or just add items by hand below.");
    }
    setStatus('reviewing');
  }

  function addBlankRow() {
    setRows((prev) => [...prev, { id: uid(), name: '', price: '', quantity: '1', addToInventory: false, inventoryCategoryId: null }]);
  }
  function updateRow(id, patch) { setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r))); }
  function removeRow(id) { setRows((prev) => prev.filter((r) => r.id !== id)); }

  function reset() {
    setImages([]); setStatus('capture'); setScanError(null); setWarnings([]); setRows([]);
    setDate(todayStr()); setCategoryId(defaultCategoryId || null); setSubId(null); setNote('');
    setTotalOverride(''); setTotalTouched(false);
  }

  function handleSave() {
    const validRows = rows.filter((r) => r.name.trim() && parseFloat(r.price) > 0 && parseFloat(r.quantity) > 0);
    const amt = parseFloat(totalOverride);
    const subOk = subId || (selectedCategory && selectedCategory.subs.length === 0);
    if (!categoryId || !subOk || !amt || amt <= 0) return;

    const expense = {
      id: uid(),
      date,
      categoryId,
      subId: subId || null,
      amount: amt,
      tag: 'necessary',
      note: note.trim() || summaryNote(validRows.map((r) => r.name.trim())),
      createdAt: Date.now(),
      items: validRows.map((r) => ({ name: r.name.trim(), price: parseFloat(r.price), quantity: parseFloat(r.quantity) })),
    };
    const inventoryDrafts = validRows
      .filter((r) => r.addToInventory)
      .map((r) => ({ name: r.name.trim(), categoryId: r.inventoryCategoryId, quantity: parseFloat(r.quantity), price: parseFloat(r.price) }));
    if (inventoryDrafts.length) expense.inventoryDrafts = inventoryDrafts;

    onSave(expense, false);
    reset();
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  }

  const canSave = Boolean(
    rows.some((r) => r.name.trim() && parseFloat(r.price) > 0)
    && categoryId
    && (subId || (selectedCategory && selectedCategory.subs.length === 0))
    && parseFloat(totalOverride) > 0,
  );

  return (
    <div className="tend-card" style={{ maxWidth: 480 }}>
      {status !== 'reviewing' ? (
        <>
          <label className="tend-label">Receipt photos</label>
          <div className="flex flex-wrap gap-2">
            {images.map((img) => (
              <div key={img.id} style={{ position: 'relative', width: 64, height: 64 }}>
                <img src={img.dataUrl} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, border: `1px solid ${C.line}` }} />
                <button
                  type="button"
                  onClick={() => removeImage(img.id)}
                  className="tend-iconbtn"
                  style={{ position: 'absolute', top: -6, right: -6, background: '#fff', borderRadius: '50%', boxShadow: `0 0 0 1px ${C.line}` }}
                  aria-label="Remove photo"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            {images.length < MAX_PHOTOS && (
              <button
                type="button"
                className="tend-chip"
                style={{ borderStyle: 'dashed', width: 64, height: 64, justifyContent: 'center' }}
                onClick={() => fileInputRef.current?.click()}
                aria-label="Add a photo"
              >
                <Plus size={16} />
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            style={{ display: 'none' }}
            onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
          />

          {scanError && <div style={{ color: C.rose, fontSize: 13, marginTop: 10 }}>{scanError}</div>}

          <div className="flex items-center gap-3" style={{ marginTop: 18 }}>
            <button className="tend-btn tend-btn-primary" disabled={images.length === 0 || status === 'scanning'} onClick={handleScan}>
              {status === 'scanning' ? 'Reading receipt…' : 'Scan receipt'}
            </button>
            <button className="tend-btn tend-btn-ghost" onClick={() => setStatus('reviewing')}>
              Skip, add items by hand
            </button>
          </div>
          {status === 'scanning' && (
            <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 8 }}>
              This runs on the Pi itself, so it can take a few real seconds per photo.
            </div>
          )}
        </>
      ) : (
        <>
          {warnings.length > 0 && <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 12 }}>{warnings.join(' ')}</div>}
          {scanError && <div style={{ color: C.rose, fontSize: 13, marginBottom: 12 }}>{scanError}</div>}

          <label className="tend-label">Items</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rows.map((row) => (
              <div key={row.id} className="tend-card" style={{ padding: 12 }}>
                <div className="flex gap-2 items-center">
                  <input
                    className="tend-input"
                    placeholder="Item name"
                    value={row.name}
                    onChange={(e) => updateRow(row.id, { name: e.target.value })}
                    style={{ flex: 1 }}
                  />
                  <input
                    type="number" step="0.01" min="0"
                    className="tend-input"
                    placeholder="Price"
                    value={row.price}
                    onChange={(e) => updateRow(row.id, { price: e.target.value })}
                    style={{ width: 80 }}
                  />
                  <input
                    type="number" step="1" min="1"
                    className="tend-input"
                    placeholder="Qty"
                    value={row.quantity}
                    onChange={(e) => updateRow(row.id, { quantity: e.target.value })}
                    style={{ width: 60 }}
                  />
                  <button type="button" className="tend-iconbtn" onClick={() => removeRow(row.id)} aria-label="Remove item">
                    <X size={14} />
                  </button>
                </div>
                <label className="flex items-center gap-2" style={{ marginTop: 8, fontSize: 12, color: C.inkSoft, cursor: 'pointer' }}>
                  <input type="checkbox" checked={row.addToInventory} onChange={(e) => updateRow(row.id, { addToInventory: e.target.checked })} />
                  Add to inventory?
                </label>
                {row.addToInventory && (
                  <select
                    className="tend-select"
                    style={{ marginTop: 6 }}
                    value={row.inventoryCategoryId || ''}
                    onChange={(e) => updateRow(row.id, { inventoryCategoryId: e.target.value || null })}
                  >
                    <option value="">Unsorted (sort it later in Inventory)</option>
                    {inventoryCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
              </div>
            ))}
          </div>
          <button type="button" className="tend-chip" style={{ borderStyle: 'dashed', marginTop: 10, color: C.inkSoft }} onClick={addBlankRow}>
            <Plus size={12} style={{ marginRight: 2, verticalAlign: -1 }} />Add item
          </button>

          <label className="tend-label">Date</label>
          <input type="date" className="tend-input" value={date} onChange={(e) => setDate(e.target.value)} />

          <label className="tend-label">Category</label>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c.id}
                className="tend-chip"
                onClick={() => { setCategoryId(c.id); setSubId(null); }}
                style={{ background: categoryId === c.id ? c.color : '#fff', borderColor: c.color, color: categoryId === c.id ? '#fff' : C.ink }}
              >
                {c.name}
              </button>
            ))}
          </div>

          {selectedCategory && selectedCategory.subs.length > 0 && (
            <>
              <label className="tend-label">What kind?</label>
              <div className="flex flex-wrap gap-2">
                {selectedCategory.subs.map((s) => (
                  <button
                    key={s.id}
                    className="tend-chip"
                    onClick={() => setSubId(s.id)}
                    style={{ background: subId === s.id ? selectedCategory.color : '#fff', borderColor: selectedCategory.color, color: subId === s.id ? '#fff' : C.ink }}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </>
          )}

          <label className="tend-label">Note (optional)</label>
          <input type="text" className="tend-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Leave blank to auto-fill from the items" />

          <label className="tend-label">Total paid</label>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 15, color: C.inkSoft }}>{currency}</span>
            <input
              type="number" step="0.01" min="0"
              className="tend-input"
              value={totalOverride}
              onChange={(e) => { setTotalOverride(e.target.value); setTotalTouched(true); }}
            />
          </div>
          {subtotal > 0 && (
            <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 4 }}>
              Items add up to {currency}{subtotal.toFixed(2)} — adjust above for tax or discounts.
            </div>
          )}

          <div className="flex items-center gap-3" style={{ marginTop: 22 }}>
            <button className="tend-btn tend-btn-primary" disabled={!canSave} onClick={handleSave}>Save expense</button>
            <button className="tend-btn tend-btn-ghost" onClick={reset}>Start over</button>
            {saved && <span style={{ color: C.sage, fontSize: 13, fontWeight: 600 }}>Saved ✓</span>}
          </div>
        </>
      )}
    </div>
  );
}
