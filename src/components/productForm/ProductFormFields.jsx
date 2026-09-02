import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Bold, Underline, Link as LinkIcon, ImagePlus, Trash2 } from 'lucide-react';

export const CATEGORIES = ['Fashion', 'Tech', 'Home', 'Beauty'];
export const STATUS_OPTIONS = ['Draft', 'Active', 'Out of Stock'];
export const MAX_IMAGES = 10;

export const inputCls = "w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-insta-pink/20 focus:border-insta-pink dark:text-white";
export const labelCls = "text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block";
const cellInputCls = "w-full px-2.5 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-insta-pink/20 focus:border-insta-pink dark:text-white";

// ─── Custom dropdown (matches the app's existing gender-select pattern) ────────
export const Dropdown = ({ label, value, options, onChange, className = '', labelClassName = labelCls }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className={className}>
      {label && <label className={labelClassName}>{label}</label>}
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 bg-gray-50 dark:bg-gray-900 border rounded-lg text-sm text-left transition-all ${
            open ? 'border-insta-pink ring-2 ring-insta-pink/20' : 'border-gray-200 dark:border-gray-800'
          }`}
        >
          <span className="text-gray-900 dark:text-white">{value}</span>
          <ChevronDown size={16} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-xl z-20 overflow-hidden max-h-56 overflow-y-auto">
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => { onChange(opt); setOpen(false); }}
                className={`w-full text-left px-3.5 py-2.5 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
                  value === opt ? 'text-insta-pink font-semibold bg-insta-pink/5' : 'text-gray-700 dark:text-gray-200'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Lightweight rich text field: Bold / Underline / Link ──────────────────────
export const RichTextField = ({ label, value, onChange, placeholder }) => {
  const ref = useRef(null);

  const exec = (command, arg = null) => {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    onChange(ref.current?.innerHTML || '');
  };

  const handleLink = () => {
    const url = window.prompt('Link URL');
    if (url) exec('createLink', url);
  };

  return (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-insta-pink/20 focus-within:border-insta-pink">
        <div className="flex items-center gap-1 px-2 py-1.5 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('bold')} className="w-7 h-7 rounded flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700">
            <Bold size={14} />
          </button>
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('underline')} className="w-7 h-7 rounded flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700">
            <Underline size={14} />
          </button>
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={handleLink} className="w-7 h-7 rounded flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700">
            <LinkIcon size={14} />
          </button>
        </div>
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          onInput={() => onChange(ref.current?.innerHTML || '')}
          data-placeholder={placeholder}
          dangerouslySetInnerHTML={{ __html: value }}
          className="min-h-[100px] px-3.5 py-2.5 text-sm bg-white dark:bg-black text-gray-900 dark:text-white focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400"
        />
      </div>
    </div>
  );
};

// ─── Variants table ─────────────────────────────────────────────────────────────
export const emptyVariant = () => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  photo: null,
  sku: '',
  quantity: '',
  weight: '',
  category: 'Fashion',
  price: '',
  status: 'Active',
});

const VariantTableRow = ({ variant, onChange, onRemove }) => {
  const fileRef = useRef(null);

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (file) onChange({ ...variant, photo: URL.createObjectURL(file) });
    e.target.value = '';
  };

  return (
    <tr className="border-b border-gray-100 dark:border-gray-800 last:border-0">
      <td className="p-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-12 h-12 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-gray-900"
        >
          {variant.photo
            ? <img src={variant.photo} alt="" className="w-full h-full object-cover" />
            : <ImagePlus size={16} className="text-gray-400" />}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
        </button>
      </td>
      <td className="p-2 min-w-[110px]">
        <input value={variant.sku} onChange={(e) => onChange({ ...variant, sku: e.target.value })} placeholder="SKU-001" className={cellInputCls} />
      </td>
      <td className="p-2 min-w-[90px]">
        <input type="number" min="0" value={variant.quantity} onChange={(e) => onChange({ ...variant, quantity: e.target.value })} placeholder="0" className={cellInputCls} />
      </td>
      <td className="p-2 min-w-[90px]">
        <input type="number" min="0" step="0.01" value={variant.weight} onChange={(e) => onChange({ ...variant, weight: e.target.value })} placeholder="0.5" className={cellInputCls} />
      </td>
      <td className="p-2 min-w-[130px]">
        <Dropdown value={variant.category} options={CATEGORIES} onChange={(v) => onChange({ ...variant, category: v })} />
      </td>
      <td className="p-2 min-w-[100px]">
        <input type="number" min="0" step="0.01" value={variant.price} onChange={(e) => onChange({ ...variant, price: e.target.value })} placeholder="49.99" className={cellInputCls} />
      </td>
      <td className="p-2 min-w-[140px]">
        <Dropdown value={variant.status} options={STATUS_OPTIONS} onChange={(v) => onChange({ ...variant, status: v })} />
      </td>
      <td className="p-2">
        <button
          type="button"
          onClick={onRemove}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500"
        >
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  );
};

export const VariantsTable = ({ variants, onChange, onRemove }) => (
  <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-gray-50 dark:bg-gray-900 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">
          <th className="p-2">Photo</th>
          <th className="p-2">SKU</th>
          <th className="p-2">Qty</th>
          <th className="p-2">Weight (kg)</th>
          <th className="p-2">Category</th>
          <th className="p-2">Price (USD)</th>
          <th className="p-2">Status</th>
          <th className="p-2" />
        </tr>
      </thead>
      <tbody>
        {variants.map((v) => (
          <VariantTableRow key={v.id} variant={v} onChange={(next) => onChange(v.id, next)} onRemove={() => onRemove(v.id)} />
        ))}
      </tbody>
    </table>
  </div>
);
