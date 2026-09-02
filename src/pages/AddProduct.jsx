import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { ArrowLeft, ImagePlus, X, Plus } from 'lucide-react';
import { addProduct } from '../store/productsSlice';
import useMediaUploader from '../hooks/useMediaUploader';
import {
  CATEGORIES, STATUS_OPTIONS, MAX_IMAGES, inputCls, labelCls,
  Dropdown, RichTextField, VariantsTable, emptyVariant,
} from '../components/productForm/ProductFormFields';

const AddProduct = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [form, setForm] = useState({
    name: '', category: 'Fashion', vendor: '', price: '', status: 'Draft',
    description: '', material: '', dimensions: '', shippingReturns: '',
  });
  const [variants, setVariants] = useState([]);
  const {
    images, isDragging, fileInputRef,
    handleFileInput, handleDrop, handleDragOver, handleDragLeave, removeImage,
  } = useMediaUploader([], MAX_IMAGES);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const addVariant = () => setVariants((v) => [...v, emptyVariant()]);
  const updateVariant = (id, next) => setVariants((v) => v.map((x) => (x.id === id ? next : x)));
  const removeVariant = (id) => setVariants((v) => v.filter((x) => x.id !== id));

  const handleSave = (e) => {
    e.preventDefault();
    dispatch(addProduct({
      ...form,
      price: parseFloat(form.price) || 0,
      images: images.map((img) => img.url),
      variants: variants.map((v) => ({
        ...v,
        quantity: parseInt(v.quantity, 10) || 0,
        weight: parseFloat(v.weight) || 0,
        price: parseFloat(v.price) || 0,
      })),
    }));
    navigate('/market/my-store');
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black pb-24 max-w-[1100px] mx-auto px-4 pt-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to="/market/my-store" className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-[#fa3f5e] mb-1">
            <ArrowLeft size={14} /> Back to My Store
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Add Product</h1>
        </div>
        <div className="flex gap-2">
          <Link
            to="/market/my-store"
            className="px-4 py-2 rounded-lg text-sm font-bold border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
          >
            Discard
          </Link>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-insta-purple via-insta-pink to-insta-orange"
          >
            Save Product
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">
        Mock only — saved products live in memory for this session and reset on refresh.
      </p>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-start">
        {/* Main column */}
        <div className="space-y-5 min-w-0">
          {/* Media */}
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1">Media</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Add up to {MAX_IMAGES} images or videos to showcase your product.</p>

            <div
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 flex flex-col items-center justify-center text-center transition-colors ${
                isDragging
                  ? 'border-insta-pink bg-pink-50 dark:bg-gray-900'
                  : 'border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/40'
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-pink-100 dark:bg-pink-900/20 flex items-center justify-center mb-3">
                <ImagePlus size={20} className="text-[#fa3f5e]" />
              </div>
              <p className="text-sm font-semibold text-[#fa3f5e]">Click to upload or drag and drop</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">SVG, PNG, JPG or GIF (max. 800x400px) — or paste from clipboard</p>
              <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFileInput} />
            </div>

            {images.length > 0 && (
              <div className="flex gap-3 mt-4 overflow-x-auto pb-1">
                {images.map((img) => (
                  <div key={img.id} className="relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(img.id)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className={labelCls}>Product Name</label>
            <input name="name" value={form.name} onChange={handleChange} required placeholder="Classic Brown Leather Tote" className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Vendor</label>
            <input name="vendor" value={form.vendor} onChange={handleChange} required placeholder="Your brand name" className={inputCls} />
          </div>

          <RichTextField
            label="Shipping & Returns"
            value={form.shippingReturns}
            onChange={(html) => setForm((f) => ({ ...f, shippingReturns: html }))}
            placeholder="e.g. Ships in 3-5 business days. Free returns within 30 days."
          />

          {/* Variants */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Variants</h2>
              <button
                type="button"
                onClick={addVariant}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500"
              >
                <Plus size={14} /> Add Variant
              </button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Optional — add a variant (e.g. size or color) with its own photo, SKU, quantity, weight, category, price and status.
            </p>

            {variants.length > 0 && (
              <VariantsTable variants={variants} onChange={updateVariant} onRemove={removeVariant} />
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-5 lg:sticky lg:top-6">
          <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-4">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Organization</h2>
            <Dropdown label="Category" value={form.category} options={CATEGORIES} onChange={(v) => setForm((f) => ({ ...f, category: v }))} />
            <div>
              <label className={labelCls}>Price (USD)</label>
              <input name="price" type="number" min="0" step="0.01" value={form.price} onChange={handleChange} required placeholder="49.99" className={inputCls} />
            </div>
            <Dropdown label="Status" value={form.status} options={STATUS_OPTIONS} onChange={(v) => setForm((f) => ({ ...f, status: v }))} />
          </div>

          <RichTextField
            label="Description"
            value={form.description}
            onChange={(html) => setForm((f) => ({ ...f, description: html }))}
            placeholder="Describe your product..."
          />

          {/* Material & Dimensions — one box */}
          <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-4">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Material &amp; Dimensions</h2>
            <RichTextField
              label="Material"
              value={form.material}
              onChange={(html) => setForm((f) => ({ ...f, material: html }))}
              placeholder="e.g. Full-grain leather, brass hardware"
            />
            <RichTextField
              label="Dimensions"
              value={form.dimensions}
              onChange={(html) => setForm((f) => ({ ...f, dimensions: html }))}
              placeholder="e.g. 32cm x 24cm x 12cm"
            />
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddProduct;
