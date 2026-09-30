import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  MapPin, Plus, Check, CreditCard, ChevronRight, Lock, CheckCircle2, X,
  Home, Briefcase, Wallet, ShieldCheck, Package, Loader2, ReceiptText,
} from 'lucide-react';
import { setCartItems } from '../store/cartSlice';
import { placeOrder } from '../store/ordersSlice';
import { fetchWallet } from '../store/walletSlice';
import { inputCls } from '../components/productForm/ProductFormFields';
import checkoutService, { loadRazorpay } from '../services/checkoutService';
import addressService from '../services/addressService';

const panel = 'bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-sm';
const primary = 'rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-insta-purple via-insta-pink to-insta-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-insta-pink focus-visible:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed';
const money = (value) => `Rs ${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const blankAddress = { label: '', name: '', phone: '', address_line1: '', city: '', state: '', pincode: '' };

function ProductImage({ item }) {
  const [failed, setFailed] = useState(false);
  const image = item.images?.[0] || item.image;
  return (
    <div className="w-14 h-14 shrink-0 rounded-lg bg-gray-50 dark:bg-gray-800 overflow-hidden flex items-center justify-center">
      {image && !failed
        ? <img src={image} alt={item.name} onError={() => setFailed(true)} className="w-full h-full object-cover" />
        : <Package size={24} className="text-[#fa3f5e]" />}
    </div>
  );
}

function AddressDrawer({ addresses, selected, loading, actionId, onClose, onSelect, onSave, onDelete, onSetDefault }) {
  const [pending, setPending] = useState(selected);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState(blankAddress);

  useEffect(() => {
    setPending(selected);
  }, [selected]);

  const submit = (event) => {
    event.preventDefault();
    if (Object.values(form).some((value) => !String(value).trim())) return;
    onSave(form, editingId).then((saved) => {
      if (saved?.id) setPending(saved.id);
      setAdding(false);
      setEditingId('');
      setForm(blankAddress);
    });
  };

  const startEdit = (address) => {
    setAdding(true);
    setEditingId(address.id);
    setForm({
      label: address.label || '',
      name: address.name || '',
      phone: address.phone || '',
      address_line1: address.address_line1 || '',
      city: address.city || '',
      state: address.state || '',
      pincode: address.pincode || '',
    });
  };

  const cancelForm = () => {
    setAdding(false);
    setEditingId('');
    setForm(blankAddress);
  };

  return (
    <aside aria-labelledby="address-title" className="min-w-0 w-full lg:sticky lg:top-0 h-[min(720px,90dvh)] lg:h-[calc(100dvh-32px)] bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-l border-gray-100 dark:border-gray-800 shadow-sm rounded-xl">
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-4 border-b border-gray-100 dark:border-gray-800 px-5 py-5">
          <button type="button" onClick={onClose} aria-label="Close address selector" className="p-1 text-gray-500"><X size={19} /></button>
          <h2 id="address-title" className="text-sm font-semibold">Select address</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Saved addresses</p>
          {loading && <p className="flex items-center gap-2 text-xs text-gray-500"><Loader2 size={14} className="animate-spin" />Loading addresses...</p>}
          {!loading && !addresses.length && <p className="text-xs leading-5 text-gray-500 dark:text-gray-400">No saved addresses yet. Add one to continue checkout.</p>}
          {addresses.map((address) => (
            <label key={address.id} className={`flex items-center gap-3 rounded-xl border p-4 cursor-pointer ${pending === address.id ? 'border-[#fa3f5e] bg-pink-50/40 dark:bg-pink-900/10' : 'border-gray-200 dark:border-gray-700'}`}>
              <input type="radio" name="delivery-address" value={address.id} checked={pending === address.id} onChange={() => setPending(address.id)} className="accent-[#fa3f5e] w-4 h-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <span className="text-[#fa3f5e]">{address.label === 'Work' ? <Briefcase size={18} /> : <Home size={18} />}</span>
                  {address.label}
                  {address.is_default && <span className="rounded bg-purple-50 dark:bg-purple-900/20 px-2 py-1 text-[10px] text-insta-purple">Default</span>}
                </p>
                <p className="text-xs leading-6 text-gray-500 dark:text-gray-400 mt-2 break-words">
                  {address.name} · {address.phone}<br />
                  {address.address_line1}<br />
                  {address.city}, {address.state} {address.pincode}
                </p>
                <div className="flex flex-wrap items-center gap-3 mt-3 text-[11px] font-semibold">
                  <button type="button" onClick={(event) => { event.preventDefault(); startEdit(address); }} className="text-gray-600 dark:text-gray-300">Edit</button>
                  {!address.is_default && <button type="button" disabled={actionId === address.id} onClick={(event) => { event.preventDefault(); onSetDefault(address.id); }} className="text-insta-purple disabled:opacity-50">{actionId === address.id ? 'Setting...' : 'Set default'}</button>}
                  <button type="button" disabled={actionId === address.id} onClick={(event) => { event.preventDefault(); onDelete(address.id); }} className="text-[#fa3f5e] disabled:opacity-50">{actionId === address.id ? 'Deleting...' : 'Delete'}</button>
                </div>
              </div>
            </label>
          ))}
          <button type="button" onClick={() => (adding ? cancelForm() : setAdding(true))} aria-expanded={adding} className="w-full flex items-center justify-center gap-2 border border-dashed border-[#fa3f5e]/40 rounded-lg py-4 text-xs font-semibold text-[#fa3f5e]">
            <Plus size={18} />{adding ? 'Cancel address form' : 'Add new address'}
          </button>
          {adding && (
            <form onSubmit={submit} className="space-y-3">
              {[
                ['label', 'Address label'],
                ['name', 'Recipient name'],
                ['phone', 'Phone'],
                ['address_line1', 'Street address'],
                ['city', 'City'],
                ['state', 'State'],
                ['pincode', 'Pincode'],
              ].map(([key, label]) => (
                <label key={key} className="block text-xs text-gray-500 dark:text-gray-400">
                  {label}
                  <input required maxLength={key === 'phone' ? 20 : 150} name={key} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className={`${inputCls} mt-1`} />
                </label>
              ))}
              <button disabled={Boolean(actionId)} className={`${primary} w-full py-3`}>{actionId ? 'Saving...' : editingId ? 'Update address' : 'Save address'}</button>
            </form>
          )}
        </div>
        <div className="p-5 border-t border-gray-100 dark:border-gray-800">
          <button type="button" disabled={!pending} onClick={() => onSelect(pending)} className={`${primary} w-full py-3`}>Use this address</button>
        </div>
      </div>
    </aside>
  );
}

export default function Checkout() {
  const items = useSelector((state) => state.cart.items).filter((item) => !item.saved && item.selected !== false);
  const products = useSelector((state) => state.products.items);
  const user = useSelector((state) => state.auth.userObject);
  const balance = Math.max(0, Number(useSelector((state) => state.wallet?.balance) || 0));
  const dispatch = useDispatch();
  const [step, setStep] = useState('Details');
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [addressActionId, setAddressActionId] = useState('');
  const [addressOpen, setAddressOpen] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('wallet');
  const [sameBilling, setSameBilling] = useState(true);
  const [billing, setBilling] = useState('');
  const [placed, setPlaced] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [checkingOut, setCheckingOut] = useState(false);
  const [orderMessage, setOrderMessage] = useState('');
  const [confirmedOrder, setConfirmedOrder] = useState(null);

  const address = addresses.find((entry) => entry.id === selectedAddress) || addresses[0] || blankAddress;
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const discount = 0;
  const total = subtotal;
  const payment = step === 'Payment';
  const walletInsufficient = payment && paymentMethod === 'wallet' && balance < total;

  const loadAddresses = useCallback(async ({ keepSelected = true } = {}) => {
    setAddressesLoading(true);
    try {
      const list = await addressService.list();
      setAddresses(list);
      setSelectedAddress((current) => (keepSelected && list.some((entry) => entry.id === current) ? current : list[0]?.id || ''));
      return list;
    } catch (err) {
      setCheckoutError(err?.response?.data?.message || 'Could not load saved addresses.');
      return [];
    } finally {
      setAddressesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAddresses({ keepSelected: false });
  }, [loadAddresses]);

  const saveAddress = async (entry, editingId = '') => {
    setAddressActionId(editingId || 'new');
    setCheckoutError('');
    try {
      const saved = editingId ? await addressService.update(editingId, entry) : await addressService.create(entry);
      const list = await loadAddresses({ keepSelected: true });
      const selected = list.find((item) => item.id === saved.id) || saved;
      setSelectedAddress(selected.id);
      return selected;
    } catch (err) {
      setCheckoutError(err?.response?.data?.message || 'Could not save this address.');
      throw err;
    } finally {
      setAddressActionId('');
    }
  };

  const deleteAddress = async (id) => {
    setAddressActionId(id);
    setCheckoutError('');
    try {
      await addressService.remove(id);
      await loadAddresses({ keepSelected: false });
    } catch (err) {
      setCheckoutError(err?.response?.data?.message || 'Could not delete this address.');
    } finally {
      setAddressActionId('');
    }
  };

  const setDefaultAddress = async (id) => {
    setAddressActionId(id);
    setCheckoutError('');
    try {
      await addressService.setDefault(id);
      const list = await loadAddresses({ keepSelected: true });
      if (list.some((entry) => entry.id === id)) setSelectedAddress(id);
    } catch (err) {
      setCheckoutError(err?.response?.data?.message || 'Could not set this address as default.');
    } finally {
      setAddressActionId('');
    }
  };

  const buildShippingAddress = () => ({
    name: address.name || user?.name || user?.full_name || user?.username || 'Customer',
    phone: address.phone || user?.phone || user?.mobile_number || '',
    address_line1: address.address_line1 || address.address || '',
    city: address.city || '',
    state: address.state || '',
    pincode: address.pincode || address.zip || '',
  });

  const recordLocalOrder = (apiOrder, shippingAddress, status = 'Pending', paymentStatus = 'Pending') => {
    const customer = shippingAddress.name || user?.name || user?.full_name || user?.username || 'Customer';
    const action = placeOrder({
      buyerId: String(user?._id || user?.id || ''),
      apiOrderId: apiOrder?._id || apiOrder?.id || apiOrder?.order_id || '',
      customer,
      productId: items[0].id,
      product: items[0].name,
      qty: items.reduce((sum, item) => sum + item.qty, 0),
      items: items.map((item) => ({
        productId: item.id,
        name: item.name,
        quantity: item.qty,
        unitPrice: item.price,
        variant: item.variant,
        images: item.images || [],
        image: item.image,
      })),
      amount: apiOrder?.amount ?? apiOrder?.total_amount ?? total,
      paymentMethod,
      paymentStatus,
      status,
      address: {
        name: customer,
        street: shippingAddress.address_line1,
        city: shippingAddress.city,
        region: shippingAddress.state,
        postalCode: shippingAddress.pincode,
        country: 'India',
      },
    });
    dispatch(action);
    return action.payload;
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!sameBilling && !billing.trim()) return;
    if (!payment) { setStep('Payment'); return; }
    if (walletInsufficient) return;

    const shippingAddress = buildShippingAddress();
    if (Object.values(shippingAddress).some((value) => !String(value).trim())) {
      setCheckoutError('Please complete the delivery address.');
      return;
    }

    setCheckingOut(true);
    setCheckoutError('');
    try {
      const result = await checkoutService.checkout({ paymentMethod, shippingAddress });
      const apiOrder = result?.order || result?.data?.order || result?.data;
      const backendOrderId = apiOrder?._id || apiOrder?.id || apiOrder?.order_id || result?.id || result?._id;

      if (paymentMethod === 'wallet') {
        const localOrder = recordLocalOrder(apiOrder, shippingAddress, 'Confirmed', 'Paid');
        setConfirmedOrder(localOrder);
        dispatch(setCartItems([]));
        dispatch(fetchWallet());
        setOrderMessage('Your wallet payment is confirmed and the cart has been cleared.');
        setPlaced(true);
        return;
      }

      const razorpay = result?.razorpay || result?.data?.razorpay;
      if (!razorpay?.order_id || !razorpay?.key_id) {
        throw new Error('Razorpay order details were not returned.');
      }
      const loaded = await loadRazorpay();
      if (!loaded) throw new Error('Payment gateway failed to load. Please try again.');

      const rzp = new window.Razorpay({
        key: razorpay.key_id,
        amount: razorpay.amount,
        currency: razorpay.currency || 'INR',
        name: 'BSmart',
        description: 'Marketplace order',
        order_id: razorpay.order_id,
        prefill: {
          name: shippingAddress.name,
          contact: shippingAddress.phone,
          email: user?.email || '',
        },
        handler: async (paymentResponse) => {
          if (!backendOrderId) {
            setCheckoutError('Order id was not returned for payment verification.');
            setCheckingOut(false);
            return;
          }
          try {
            const verified = await checkoutService.verifyPayment(backendOrderId, paymentResponse);
            const verifiedOrder = verified?.order || verified?.data?.order || apiOrder;
            const localOrder = recordLocalOrder(verifiedOrder, shippingAddress, 'Confirmed', 'Paid');
            setConfirmedOrder(localOrder);
            dispatch(setCartItems([]));
            setOrderMessage('Payment verified. Your order is confirmed and the cart has been cleared.');
            setPlaced(true);
          } catch (err) {
            setCheckoutError(err?.response?.data?.message || 'Payment verification failed. Please contact support.');
          } finally {
            setCheckingOut(false);
          }
        },
        modal: { ondismiss: () => setCheckingOut(false) },
        theme: { color: '#fa3f5e' },
      });
      rzp.on('payment.failed', (response) => {
        setCheckoutError(response?.error?.description || 'Payment failed. Please try again.');
        setCheckingOut(false);
      });
      rzp.open();
    } catch (err) {
      setCheckoutError(err?.response?.data?.message || err.message || 'Checkout failed. Please try again.');
      setCheckingOut(false);
    }
  };

  const itemList = (
    <div className="divide-y divide-gray-100 dark:divide-gray-800">
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
          <ProductImage item={{ ...products.find((product) => product.id === item.id), ...item }} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-gray-900 dark:text-white break-words">{item.name}</p>
            <p className="text-xs text-gray-400 mt-1">Qty: {item.qty}</p>
          </div>
          <span className="text-xs font-semibold text-gray-900 dark:text-white shrink-0">{money(item.price * item.qty)}</span>
        </div>
      ))}
    </div>
  );

  const billingControl = (
    <>
      <label className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-300">
        <input type="checkbox" checked={sameBilling} onChange={(event) => setSameBilling(event.target.checked)} className="accent-[#fa3f5e] w-4 h-4" />
        {payment ? 'Use delivery address as billing address' : 'Billing address is the same as delivery address'}
      </label>
      {!sameBilling && <label className="block text-xs text-gray-500 mt-3">Billing address<textarea required value={billing} onChange={(event) => setBilling(event.target.value)} className={`${inputCls} mt-2`} /></label>}
    </>
  );

  const successItems = confirmedOrder?.items?.length ? confirmedOrder.items : items.map((item) => ({
    productId: item.id,
    name: item.name,
    quantity: item.qty,
    unitPrice: item.price,
    variant: item.variant,
    images: item.images || [],
    image: item.image,
  }));
  const successOrderId = confirmedOrder?.apiOrderId || confirmedOrder?.id || 'Processing';
  const successDate = confirmedOrder?.createdAt ? new Date(confirmedOrder.createdAt) : new Date();
  const successPaymentMethod = confirmedOrder?.paymentMethod || paymentMethod;
  const successTotal = confirmedOrder?.amount ?? total;

  if (placed) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black px-4 py-8 text-gray-900 dark:text-white md:px-6">
        <div className="mx-auto w-full max-w-5xl space-y-5">
          <section className="text-center">
            <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-pink-50 text-[#fa3f5e] ring-8 ring-white dark:bg-pink-900/20 dark:ring-gray-900">
              <CheckCircle2 size={44} strokeWidth={2.4} />
            </span>
            <h1 className="mt-5 text-2xl font-bold text-gray-900 dark:text-white md:text-3xl">Order placed successfully!</h1>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-400">
              Thank you for your order. Your payment has been verified and your order is now confirmed.
            </p>
            {orderMessage && <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">{orderMessage}</p>}
          </section>

          <section className={`${panel} p-4 md:p-5`} aria-label="Order information">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['Order ID', successOrderId],
                ['Order Date', successDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })],
                ['Payment Method', successPaymentMethod === 'wallet' ? 'Wallet' : 'Razorpay'],
                ['Total Amount', money(successTotal)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/60">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
                  <p className="mt-1 break-words text-sm font-bold text-gray-900 dark:text-white">{value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className={`${panel} overflow-hidden`} aria-label="Order summary">
            <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-4 dark:border-gray-800 md:px-5">
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white">Order Summary</h2>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{successItems.length} {successItems.length === 1 ? 'item' : 'items'} purchased</p>
              </div>
              <ReceiptText size={22} className="text-[#fa3f5e]" />
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {successItems.length ? successItems.map((item) => {
                const productMatch = products.find((product) => String(product.id) === String(item.productId));
                const variantText = item.variant ? [item.variant.color, item.variant.size].filter(Boolean).join(' / ') : '';
                return (
                  <div key={`${item.productId}-${item.name}`} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center md:px-5">
                    <ProductImage item={{ ...productMatch, ...item }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.name}</p>
                      {variantText && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Variant: {variantText}</p>}
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Qty: {item.quantity}</p>
                    </div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{money(Number(item.unitPrice || 0) * Number(item.quantity || 1))}</p>
                  </div>
                );
              }) : (
                <p className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400 md:px-5">Order details are being prepared. You can view the full order in My Orders.</p>
              )}
            </div>
          </section>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
            <Link to="/market" className="flex min-h-11 items-center justify-center rounded-lg border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-300 hover:bg-white dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-900">
              Continue Shopping
            </Link>
            <Link to="/market/my-orders" className={`${primary} flex min-h-11 items-center justify-center px-5 py-3`}>
              View My Orders
            </Link>
          </div>

          <section className={`${panel} grid gap-3 p-4 sm:grid-cols-3 md:p-5`} aria-label="Order status">
            {['Payment verified', 'Order confirmed', 'Order details available in My Orders'].map((status) => (
              <div key={status} className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                <CheckCircle2 size={18} className="shrink-0 text-[#fa3f5e]" />
                {status}
              </div>
            ))}
          </section>
        </div>
      </div>
    );
  }

  if (!items.length) {
    return <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-gray-50 dark:bg-black"><p className="text-gray-500">Your cart is empty.</p><Link to="/cart" className="text-[#fa3f5e]">Back to cart</Link></div>;
  }

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-black w-full max-w-[1300px] ml-auto px-4 md:px-6 pt-4 pb-12 text-gray-900 dark:text-white grid gap-4 items-start ${addressOpen && !payment ? 'lg:grid-cols-[minmax(0,1fr)_280px]' : 'grid-cols-1'}`}>
      <div className="min-w-0">
        <h1 className={payment ? 'sr-only' : 'text-xl font-bold mb-4'}>Checkout</h1>
        <nav aria-label="Checkout progress" className={payment ? 'w-full md:w-[64%] pt-2 mb-8' : 'max-w-[300px] mb-5'}>
          <ol className="flex">
            {['Cart', 'Details', 'Payment'].map((label, index) => {
              const complete = index === 0 || (index === 1 && payment);
              const current = label === step;
              const content = <><span className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${complete || current ? 'bg-[#fa3f5e] text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-400'}`}>{complete ? <Check size={14} /> : index + 1}</span><span className={`mt-2 text-[11px] ${current ? 'font-semibold' : 'text-gray-400'}`}>{label}</span></>;
              return <li key={label} className="relative flex-1">{index < 2 && <span aria-hidden="true" className={`absolute top-3 left-1/2 w-full h-px ${complete && (index === 0 || payment) ? 'bg-[#fa3f5e]' : 'bg-gray-200 dark:bg-gray-700'}`} />}{label === 'Cart' ? <Link to="/cart" className="relative flex flex-col items-center">{content}</Link> : <button type="button" aria-current={current ? 'step' : undefined} onClick={() => setStep(label)} className="relative w-full flex flex-col items-center">{content}</button>}</li>;
            })}
          </ol>
        </nav>

        <form onSubmit={submit} className={`grid grid-cols-1 gap-4 items-start ${payment ? 'md:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)] md:gap-6' : 'md:grid-cols-[minmax(0,2fr)_minmax(190px,1fr)]'}`}>
          <main className="min-w-0 space-y-3">
            {!payment ? (
              <>
                <section className={`${panel} p-3 flex items-start gap-3`}>
                  <span className="p-2 rounded-full bg-pink-50 dark:bg-pink-900/20 text-[#fa3f5e]"><MapPin size={20} /></span>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-sm font-semibold">Delivery address</h2>
                    <p className="text-xs font-semibold mt-2">{address.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">{address.name} · {address.phone}<br />{address.address_line1}, {address.city}, {address.state} {address.pincode}</p>
                  </div>
                  <button type="button" onClick={() => setAddressOpen(true)} className="flex items-center gap-1 text-xs text-[#fa3f5e] py-1">Change <ChevronRight size={14} /></button>
                </section>
                <section className={`${panel} p-3`}><h2 className="text-sm font-semibold mb-4">Order summary</h2>{itemList}</section>
                <section className={`${panel} p-3`}>
                  <button type="button" onClick={() => setStep('Payment')} className="flex items-center gap-3 w-full text-xs pb-4 mb-4 border-b border-gray-100 dark:border-gray-800">
                    <CreditCard size={20} className="text-[#fa3f5e]" />
                    <span className="flex-1 text-left">{paymentMethod === 'wallet' ? 'Wallet coins' : 'Razorpay'}</span>
                    <ChevronRight size={16} />
                  </button>
                  {billingControl}
                </section>
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold">Choose payment method</h2>
                <div role="radiogroup" aria-label="Payment method" className="space-y-3">
                  {[
                    ['wallet', 'Wallet coins', Wallet],
                    ['razorpay', 'Razorpay', CreditCard],
                  ].map(([id, label, Icon]) => (
                    <div key={id}>
                      <label className={`${panel} flex items-center gap-3 px-3 py-2.5 min-h-[64px] cursor-pointer ${paymentMethod === id ? '!border-[#fa3f5e]' : ''}`}>
                        <input type="radio" name="payment-method" value={id} checked={paymentMethod === id} onChange={() => setPaymentMethod(id)} className="w-4 h-4 shrink-0 accent-[#fa3f5e]" />
                        <span className="w-12 h-10 shrink-0 rounded-lg border border-gray-100 dark:border-gray-800 flex items-center justify-center text-gray-700 dark:text-gray-300">{React.createElement(Icon, { size: 23 })}</span>
                        <span className="flex-1 min-w-0 text-sm font-semibold">{label}</span>
                        {paymentMethod === id ? <span className="rounded bg-[#fa3f5e] text-white px-2 py-1 text-[10px]">Selected</span> : <ChevronRight size={17} className="text-gray-400" />}
                      </label>
                      {id === 'wallet' && paymentMethod === id && <p className="px-4 pt-2 text-xs text-gray-400">{balance.toLocaleString('en-IN')} coins available{walletInsufficient ? ' - insufficient balance for this order.' : ''}</p>}
                      {id === 'razorpay' && paymentMethod === id && <p className="px-4 pt-2 text-xs text-gray-400">Opens Razorpay Checkout. Stock and cart update after payment verification.</p>}
                    </div>
                  ))}
                </div>
                <section className={`${panel} p-3`}>{billingControl}</section>
                <div className="flex items-start gap-3 px-2 py-2">
                  <ShieldCheck size={30} className="text-[#fa3f5e] shrink-0" />
                  <div>
                    <h3 className="text-xs font-semibold">Secure payment</h3>
                    <p className="text-xs text-gray-400 mt-1">Wallet orders are confirmed immediately. Razorpay orders stay pending until verified.</p>
                  </div>
                </div>
              </>
            )}
          </main>

          <aside className={`${panel} min-w-0 lg:sticky lg:top-4 ${payment ? 'p-5' : 'p-3'}`} aria-label="Payment summary">
            {payment && <><h2 className="text-sm font-semibold mb-5">Order summary</h2><div className="pb-5 mb-5 border-b border-gray-100 dark:border-gray-800">{itemList}</div></>}
            <dl className="space-y-4 text-xs text-gray-500 dark:text-gray-400 pb-5 border-b border-gray-100 dark:border-gray-800">
              <div className="flex justify-between gap-3"><dt>Subtotal</dt><dd>{money(subtotal)}</dd></div>
              {!payment && <div className="flex justify-between gap-3"><dt>Delivery</dt><dd className="text-[#fa3f5e] font-semibold">Free</dd></div>}
              <div className="flex justify-between gap-3 text-insta-purple"><dt>Wallet discount</dt><dd>{money(discount)}</dd></div>
            </dl>
            <div className="flex justify-between items-center py-3 gap-3"><span className="text-sm font-semibold">{payment ? 'Amount due' : 'Total'}</span><strong className="text-xl text-[#fa3f5e]">{money(total)}</strong></div>
            {checkoutError && <p role="alert" className="text-xs text-red-500 mb-3">{checkoutError}</p>}
            <button type="submit" disabled={checkingOut || walletInsufficient} className={`${primary} w-full py-3 flex items-center justify-center gap-2`}>
              {checkingOut ? <><Loader2 size={16} className="animate-spin" />Processing</> : payment ? <><Lock size={16} />Pay {money(total)}</> : 'Place order'}
            </button>
            {!payment && <p className="text-[10px] text-gray-400 text-center mt-3"><Lock size={11} className="inline mr-1" />Secure checkout<br />Review payment in the next step</p>}
          </aside>
        </form>
        {!payment && <p className="text-[11px] text-gray-400 mt-5">Wallet uses coins at 1 coin = Rs 1. Razorpay opens the secure payment gateway.</p>}
      </div>

      {addressOpen && !payment && (
        <AddressDrawer
          addresses={addresses}
          selected={selectedAddress}
          loading={addressesLoading}
          actionId={addressActionId}
          onClose={() => setAddressOpen(false)}
          onSelect={(id) => { setSelectedAddress(id); setAddressOpen(false); }}
          onSave={saveAddress}
          onDelete={deleteAddress}
          onSetDefault={setDefaultAddress}
        />
      )}
    </div>
  );
}
