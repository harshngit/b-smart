import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Bell,
  Box,
  Check,
  Coins,
  Copy,
  CreditCard,
  Mail,
  MapPin,
  Package,
  PackageCheck,
  Phone,
  Printer,
  ReceiptText,
  RotateCw,
  Truck,
  UserRound,
  Wallet,
  Weight,
  X,
} from 'lucide-react';
import { Dropdown, inputCls, labelCls } from '../../components/productForm/ProductFormFields';
import { COURIERS, canShipOrder, shipOrder, updateOrderFulfillment } from '../../store/ordersSlice';
import { OrderProductImage, PaymentBadge, StatusBadge } from './OrderUI';
import { money, orderDate } from '../data/orderFilters';

const STATUS_OPTIONS = ['Confirmed', 'Processing', 'Shipped', 'Delivered'];

function InfoCard({ label, value, helper, icon: Icon }) {
  return (
    <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
          <p className="mt-3 break-words text-lg font-bold text-gray-950 dark:text-white">{value}</p>
          {helper && <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-gray-400">{helper}</p>}
        </div>
        {Icon && <Icon size={17} className="mt-0.5 flex-shrink-0 text-[#fa3f5e]" />}
      </div>
    </div>
  );
}

function Panel({ title, subtitle, icon: Icon, action, children, className = '' }) {
  return (
    <section className={`overflow-hidden rounded-xl border border-blue-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 ${className}`}>
      <div className="flex items-start justify-between gap-3 border-b border-blue-50 px-5 py-4 dark:border-gray-800">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {Icon && <Icon size={16} className="text-[#fa3f5e]" />}
            <h3 className="text-sm font-bold text-gray-950 dark:text-white">{title}</h3>
          </div>
          {subtitle && <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-gray-400">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`h-7 w-12 rounded-full p-0.5 transition-colors ${checked ? 'bg-[#d90445]' : 'bg-gray-300 dark:bg-gray-700'}`}
    >
      <span className={`block h-6 w-6 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
  );
}

const initials = (name = 'Customer') => String(name)
  .split(' ')
  .filter(Boolean)
  .map((part) => part[0])
  .slice(0, 2)
  .join('');

export default function OrderDetails({ order, allOrders = [], productCatalog = {}, closeTo, onStatusChange, onFulfillmentChange, onPrintSlip, updating = false, apiEnabled = false }) {
  const dispatch = useDispatch();
  const products = useSelector((state) => state.products.items);
  const headingRef = useRef(null);
  const [selectedStatus, setSelectedStatus] = useState(
    order && !['Pending', 'New'].includes(order.status) ? order.status : 'Confirmed'
  );
  const [syncedStatus, setSyncedStatus] = useState(order?.status);
  if (order && order.status !== syncedStatus) {
    setSyncedStatus(order.status);
    if (!['Pending', 'New'].includes(order.status)) setSelectedStatus(order.status);
  }

  useEffect(() => { headingRef.current?.focus({ preventScroll: true }); }, [order?.id]);

  if (!order) {
    return (
      <aside className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h2 ref={headingRef} tabIndex={-1} className="font-bold text-gray-900 outline-none dark:text-white">Order not found</h2>
        <Link to={closeTo} className="mt-3 inline-block text-sm text-[#fa3f5e]">Back to orders</Link>
      </aside>
    );
  }

  const editable = ['Pending', 'Confirmed', 'Processing'].includes(order.status);
  const update = (changes) => {
    if (apiEnabled) onFulfillmentChange?.(order.id, changes);
    else dispatch(updateOrderFulfillment({ id: order.id, ...changes }));
  };
  const setStatus = (status) => {
    if (apiEnabled) {
      onStatusChange?.(order.id, status, {
        courier: order.courier,
        tracking_number: order.trackingNumber,
        confirmed_items: order.confirmed,
        packed: order.packed,
        notify_customer: order.notifyCustomer,
      });
    } else if (status === 'Shipped') dispatch(shipOrder(order.id));
  };
  const needsShippingInfo = selectedStatus === 'Shipped';
  const canSubmitStatus = !needsShippingInfo || (order.courier && order.trackingNumber?.trim());
  const handleUpdateStatus = () => {
    if (apiEnabled) {
      onStatusChange?.(order.id, selectedStatus, {
        courier: order.courier,
        tracking_number: order.trackingNumber,
        notify_customer: order.notifyCustomer,
      });
    } else if (selectedStatus === 'Shipped') dispatch(shipOrder(order.id));
  };

  // No platform commission exists for product orders today — sellers keep the
  // full payment, minus whatever the buyer covered with bCoins.
  const earnings = Math.max(0, order.amount - order.coinsDiscount);
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const uniqueItems = order.items.length;
  const progressSteps = ['Confirmed', 'Processing', 'Shipped', 'Delivered'];
  const normalizedStatus = ['Pending', 'New'].includes(order.status) ? 'Confirmed' : order.status;
  const activeStep = progressSteps.indexOf(normalizedStatus);
  const cancelled = order.status === 'Cancelled';
  const canAdvanceToDelivered = order.status === 'Shipped';
  const orderTime = order.time || '';
  // Real contact details come from the shipping address / buyer account —
  // left blank (not faked) when the buyer didn't provide them.
  const customerEmail = order.address?.email || '';
  const customerPhone = order.address?.phone || '';

  // Real repeat-customer stat, computed from this seller's own order list —
  // not fabricated.
  const customerOrders = allOrders.filter((entry) => entry.customer === order.customer);
  const customerOrderCount = customerOrders.length;
  const customerTotalSpent = customerOrders.reduce((sum, entry) => sum + entry.amount, 0);

  // Real per-item package weight/dimensions/SKU, looked up from the seller's
  // own product catalog (none of this is snapshotted onto the order itself).
  const itemCatalogEntries = order.items.map((item) => productCatalog[String(item.productId)] || null);
  const itemWeights = itemCatalogEntries.map((entry) => entry?.packageWeight || '');
  const shippableEntry = itemCatalogEntries.find((entry) => entry?.packageWeight || entry?.dimensions);

  const copyOrderId = async () => {
    try {
      await navigator.clipboard?.writeText(String(order.orderNumber || order.id));
    } catch {
      // Copy is a convenience action; silently ignore browsers without clipboard access.
    }
  };

  // Only real, timestamped/known events — no invented "payment verified at
  // 2:14 PM" style entries. Shown oldest-first.
  const timelineEvents = [
    { label: 'Order placed', time: `${orderDate(order.date)}${orderTime ? `, ${orderTime}` : ''}`, color: 'bg-emerald-500' },
    order.courier ? { label: `Courier assigned — ${order.courier}`, time: order.trackingNumber ? `AWB ${order.trackingNumber}` : '', color: 'bg-blue-500' } : null,
    order.status === 'Shipped' || order.status === 'Delivered' ? { label: 'Order shipped', time: '', color: 'bg-[#d90445]' } : null,
    order.status === 'Delivered' ? { label: 'Order delivered', time: '', color: 'bg-emerald-500' } : null,
    cancelled ? { label: 'Order cancelled', time: '', color: 'bg-red-500' } : null,
  ].filter(Boolean);

  const downloadAuditLog = () => {
    const lines = [
      `Order ${order.orderNumber || order.id}`,
      `Customer: ${order.customer}`,
      '',
      'Timeline:',
      ...timelineEvents.map((event) => `  - ${event.label}${event.time ? ` (${event.time})` : ''}`),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `order-${order.orderNumber || order.id}-timeline.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const copyAddress = async () => {
    try {
      await navigator.clipboard?.writeText([order.address.name, order.address.street, `${order.address.city}, ${order.address.region} ${order.address.postalCode}`, order.address.country].filter(Boolean).join('\n'));
    } catch {
      // Best-effort convenience action.
    }
  };

  return (
    <aside aria-label="Order details" className="space-y-5">
      <section className="space-y-6">
        <Link to={closeTo} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-[#fa3f5e] dark:text-gray-500">
          Orders <span className="text-slate-300 dark:text-gray-700">/</span> <span className="text-slate-600 dark:text-gray-300">Order #{order.orderNumber || order.id}</span>
        </Link>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-bold text-gray-950 outline-none dark:text-white">Order #{order.orderNumber || order.id}</h2>
              <button type="button" onClick={copyOrderId} aria-label="Copy order number" className="rounded-lg p-1.5 text-gray-400 transition hover:bg-pink-50 hover:text-[#fa3f5e] dark:hover:bg-pink-900/20">
                <Copy size={14} />
              </button>
              <PaymentBadge status={order.paymentStatus} />
              <StatusBadge status={order.status} />
            </div>
            <p className="mt-1.5 text-xs text-slate-500 dark:text-gray-400">Placed on {orderDate(order.date)}{orderTime ? ` · ${orderTime}` : ''}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={onPrintSlip} className="inline-flex items-center gap-2 rounded-xl border border-blue-100 bg-white px-3 py-2 text-xs font-bold text-gray-700 shadow-sm transition hover:border-[#fa3f5e]/30 hover:text-[#fa3f5e] dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
              <Printer size={14} />
              Print Packing Slip
            </button>
            <Link to={closeTo} aria-label="Close order details" className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-blue-100 bg-white text-gray-500 shadow-sm transition hover:border-[#fa3f5e]/30 hover:text-[#fa3f5e] dark:border-gray-800 dark:bg-gray-950">
              <X size={16} />
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InfoCard label="Customer" value={order.customer} helper={`${customerOrderCount} order${customerOrderCount === 1 ? '' : 's'} from this buyer`} icon={UserRound} />
          <InfoCard label="Items" value={`${itemCount} item${itemCount === 1 ? '' : 's'}`} helper={`${uniqueItems} unique line item${uniqueItems === 1 ? '' : 's'}`} icon={Package} />
          <InfoCard label="Total" value={money(order.amount)} helper={`${customerOrderCount} order${customerOrderCount === 1 ? '' : 's'} = ${money(customerTotalSpent)} total`} icon={ReceiptText} />
          <InfoCard label="Your earnings" value={money(order.paymentStatus === 'Refunded' ? 0 : earnings)} helper="No marketplace fee on product orders" icon={Wallet} />
        </div>
      </section>

      <Panel title="Order Delivery Pipeline" subtitle="Fulfillment lifecycle for this order">
        <div className="px-5 py-6">
          {cancelled ? (
            <div className="flex items-center gap-3 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-600 dark:bg-red-900/20 dark:text-red-300">
              <X size={18} />
              This order has been cancelled.
            </div>
          ) : (
            <>
              <div className="hidden items-center md:flex">
                {progressSteps.map((step, index) => {
                  const done = activeStep > index;
                  const current = activeStep === index;
                  const segmentColor = (segmentIndex) => (activeStep > segmentIndex ? 'bg-emerald-500' : activeStep === segmentIndex ? 'bg-[#d90445]' : 'bg-blue-100 dark:bg-gray-800');
                  return (
                    <div key={step} className="flex flex-1 items-center">
                      <div className={`h-0.5 flex-1 ${index === 0 ? 'invisible' : segmentColor(index - 1)}`} />
                      <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold shadow-sm ${done ? 'bg-emerald-500 text-white' : current ? 'bg-[#d90445] text-white' : 'bg-slate-50 text-slate-400 ring-1 ring-blue-100 dark:bg-gray-800 dark:ring-gray-700'}`}>
                        {done ? <Check size={18} /> : index + 1}
                      </span>
                      <div className={`h-0.5 flex-1 ${index === progressSteps.length - 1 ? 'invisible' : segmentColor(index)}`} />
                    </div>
                  );
                })}
              </div>
              <div className="grid gap-4 md:mt-3 md:grid-cols-4">
                {progressSteps.map((step, index) => {
                  const done = activeStep > index;
                  const current = activeStep === index;
                  // Only the "Confirmed" step has a real timestamp on the order
                  // object; "Courier assigned" only shows once a courier is
                  // actually set — nothing here is a guessed/estimated time.
                  const caption = index === 0 ? `${orderDate(order.date)}${orderTime ? `, ${orderTime}` : ''}`
                    : index === 2 && order.courier ? `${order.courier} assigned`
                    : null;
                  return (
                    <div key={step} className="flex items-center gap-3 md:block md:text-center">
                      <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold md:hidden ${done ? 'bg-emerald-500 text-white' : current ? 'bg-[#d90445] text-white' : 'bg-slate-50 text-slate-400 ring-1 ring-blue-100 dark:bg-gray-800 dark:ring-gray-700'}`}>
                        {done ? <Check size={17} /> : index + 1}
                      </span>
                      <div>
                        <p className={`text-sm font-bold ${done || current ? 'text-gray-950 dark:text-white' : 'text-slate-400'}`}>{index + 1}. {step}</p>
                        <p className={`mt-0.5 text-[11px] font-medium ${current ? 'text-[#d90445]' : done ? 'text-emerald-600' : 'text-slate-400'}`}>{current ? 'Current step' : done ? 'Completed' : 'Waiting'}</p>
                        {caption && <p className="mt-0.5 text-[10px] text-slate-400">{caption}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <Panel
            title="Purchased items"
            subtitle="Line items in this order."
            action={<span className="rounded-md bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-500 dark:bg-gray-800 dark:text-gray-300">{uniqueItems} line item{uniqueItems === 1 ? '' : 's'}</span>}
          >
            <div className="divide-y divide-blue-50 dark:divide-gray-800">
              {order.items.map((item, index) => (
                <div key={item.productId} className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center">
                  <OrderProductImage item={item} products={products} className="h-16 w-20 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold leading-6 text-gray-950 dark:text-white">{item.name}</p>
                    {(item.variant?.color || item.variant?.size || itemCatalogEntries[index]?.sku) && (
                      <p className="mt-1 text-[11px] text-slate-500 dark:text-gray-400">
                        {[item.variant?.color, item.variant?.size, itemCatalogEntries[index]?.sku ? `SKU: ${itemCatalogEntries[index].sku}` : null].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                      <span className="text-slate-600 dark:text-gray-400">Qty: {item.quantity} x {money(item.unitPrice)}</span>
                      {itemWeights[index] && <span className="rounded-md bg-slate-50 px-2 py-0.5 font-semibold text-slate-500 dark:bg-gray-800 dark:text-gray-400">{itemWeights[index]}</span>}
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-lg font-bold text-gray-950 dark:text-white">{money(item.unitPrice * item.quantity)}</p>
                    <p className="text-[11px] text-slate-500">{money(item.unitPrice)} / unit</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-blue-50 p-4 dark:border-gray-800 space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-600 dark:text-gray-400"><span>Items subtotal</span><span className="font-semibold text-gray-900 dark:text-white">{money(order.amount)}</span></div>
              <div className="flex items-center justify-between text-slate-600 dark:text-gray-400"><span>Shipping</span><span className="font-semibold text-emerald-600">Free</span></div>
              {order.coinsDiscount > 0 && <p className="text-[10px] text-slate-400">Includes {money(order.coinsDiscount)} paid via bCoins</p>}
              <div className="flex items-center justify-between border-t border-blue-50 dark:border-gray-800 pt-1.5 text-sm font-bold text-gray-950 dark:text-white"><span>Total paid by customer</span><span>{money(order.amount)}</span></div>
            </div>
          </Panel>

          <Panel
            title="Fulfillment Workflow"
            subtitle="Update fulfillment status, courier details, and customer notifications."
            action={apiEnabled && <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-900/20"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Live updates</span>}
          >
            {editable ? (
              <div className="space-y-4 p-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <Dropdown label="Order Status" value={selectedStatus} options={STATUS_OPTIONS} onChange={setSelectedStatus} />
                  <Dropdown label="Courier Partner" value={order.courier || 'Select courier'} options={COURIERS} onChange={(courier) => update({ courier })} />
                </div>
                <div>
                  <label htmlFor="order-tracking" className={labelCls}>Tracking AWB Number (Optional)</label>
                  <div className="relative">
                    <input id="order-tracking" value={order.trackingNumber} maxLength={80} onChange={(event) => update({ trackingNumber: event.target.value })} placeholder="e.g. BLUEDART-8823901" className={`${inputCls} pr-10`} />
                    <ReceiptText size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-blue-100 p-4 dark:border-gray-800">
                  <Bell size={17} className="text-[#fa3f5e]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-950 dark:text-white">Notify customer</p>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-gray-400">Send a status update notification to the buyer.</p>
                  </div>
                  <Toggle checked={order.notifyCustomer} onChange={() => update({ notifyCustomer: !order.notifyCustomer })} label="Notify customer" />
                </div>
                <button type="button" disabled={updating || (apiEnabled ? !canSubmitStatus : !canShipOrder(order))} onClick={handleUpdateStatus} className="w-full rounded-xl bg-gradient-to-r from-insta-purple via-insta-pink to-insta-orange py-3 text-sm font-bold text-white shadow-lg shadow-pink-900/10 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">
                  <span className="inline-flex items-center justify-center gap-2"><RotateCw size={15} className={updating ? 'animate-spin' : ''} />{updating ? 'Updating...' : `Update to ${selectedStatus}`}</span>
                </button>
                <p className="text-center text-[11px] text-slate-400">{needsShippingInfo && !canSubmitStatus ? 'Enter courier and tracking number to mark as shipped.' : 'This updates the order for the buyer immediately.'}</p>
              </div>
            ) : (
              <div className="p-5">
                <div className="rounded-xl bg-slate-50 p-4 dark:bg-gray-950">
                  <div className="flex items-center gap-2 text-sm font-bold text-gray-950 dark:text-white">{order.status === 'Cancelled' ? <X size={17} /> : order.status === 'Delivered' ? <PackageCheck size={17} className="text-green-500" /> : <Truck size={17} className="text-[#fa3f5e]" />}<span role="status">{order.status === 'Shipped' ? 'Order shipped' : order.status === 'Delivered' ? 'Order delivered' : 'Order cancelled'}</span></div>
                  {order.courier && <p className="mt-2 break-words text-xs text-slate-500 dark:text-gray-400">{order.courier} - {order.trackingNumber}</p>}
                  <div className="mt-3"><PaymentBadge status={order.paymentStatus} /></div>
                  {apiEnabled && canAdvanceToDelivered && <button type="button" disabled={updating} onClick={() => setStatus('Delivered')} className="mt-4 w-full rounded-xl bg-[#d90445] py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">{updating ? 'Updating...' : 'Mark as delivered'}</button>}
                </div>
              </div>
            )}
          </Panel>

          <Panel
            title="Fulfillment Timeline & Activity"
            subtitle="Real, recorded events only — no estimated times."
            action={<button type="button" onClick={downloadAuditLog} className="text-[10px] font-bold text-[#d90445] hover:text-[#fa3f5e]">Download log</button>}
          >
            <div className="space-y-4 p-5">
              {timelineEvents.map((event, index) => (
                <div key={`${event.label}-${index}`} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className={`h-2.5 w-2.5 rounded-full ${event.color}`} />
                    {index < timelineEvents.length - 1 && <span className="mt-1 w-px flex-1 bg-blue-100 dark:bg-gray-800" />}
                  </div>
                  <div className="min-w-0 pb-3">
                    <p className="text-sm font-semibold text-gray-950 dark:text-white">{event.label}</p>
                    {event.time && <p className="text-[11px] text-slate-400">{event.time}</p>}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <aside className="space-y-5">
          <Panel
            title="Customer Profile"
            icon={UserRound}
            action={customerOrderCount > 1 && <span className="rounded-md bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-600 dark:bg-blue-900/20 dark:text-blue-300">Repeat buyer</span>}
          >
            <div className="p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-gray-700 dark:bg-blue-900/20 dark:text-blue-200">{initials(order.customer).toUpperCase()}</span>
                <div>
                  <p className="text-sm font-bold text-gray-950 dark:text-white">{order.customer}</p>
                  <p className="text-xs text-slate-500 dark:text-gray-400">{customerOrderCount} order{customerOrderCount === 1 ? '' : 's'} total</p>
                </div>
              </div>
              <div className="mt-4 space-y-2 text-xs">
                <div className="flex items-center gap-2.5 rounded-lg bg-slate-50 px-3 py-2 dark:bg-gray-950"><Phone size={13} className="text-slate-400" /><span className="flex-1 text-slate-500 dark:text-gray-400">Phone</span><span className="font-semibold text-gray-950 dark:text-white">{customerPhone || 'Not provided'}</span></div>
                <div className="flex items-center gap-2.5 rounded-lg bg-slate-50 px-3 py-2 dark:bg-gray-950"><Mail size={13} className="text-slate-400" /><span className="flex-1 text-slate-500 dark:text-gray-400">Email</span><span className="font-semibold text-gray-950 dark:text-white truncate">{customerEmail || 'Not provided'}</span></div>
                <div className="flex items-center gap-2.5 rounded-lg bg-slate-50 px-3 py-2 dark:bg-gray-950"><Wallet size={13} className="text-slate-400" /><span className="flex-1 text-slate-500 dark:text-gray-400">Total spent</span><span className="font-semibold text-gray-950 dark:text-white">{money(customerTotalSpent)}</span></div>
              </div>
            </div>
          </Panel>

          <Panel title="Delivery address" icon={MapPin} action={<button type="button" onClick={copyAddress} aria-label="Copy address" className="rounded-lg p-1.5 text-gray-400 transition hover:bg-pink-50 hover:text-[#fa3f5e] dark:hover:bg-pink-900/20"><Copy size={14} /></button>}>
            <div className="p-5">
              <address className="not-italic text-sm leading-6 text-slate-600 dark:text-gray-400">
                <span className="font-bold text-gray-950 dark:text-white">{order.address.name}</span><br />
                {order.address.street}<br />
                {order.address.city}, {order.address.region} {order.address.postalCode}<br />
                {order.address.country}
              </address>
            </div>
          </Panel>

          <Panel title="Shipping Logistics" icon={Truck}>
            <div className="space-y-3 p-5 text-sm">
              <div className="flex items-center gap-2 text-slate-600 dark:text-gray-400"><Truck size={15} /><span className="flex-1">Courier</span><span className="font-bold text-gray-950 dark:text-white">{order.courier || 'Not assigned yet'}</span></div>
              {order.trackingNumber && <div className="flex items-center gap-2 text-slate-600 dark:text-gray-400"><ReceiptText size={15} /><span className="flex-1">Tracking AWB</span><span className="font-bold text-gray-950 dark:text-white">{order.trackingNumber}</span></div>}
              {shippableEntry?.packageWeight && <div className="flex items-center gap-2 text-slate-600 dark:text-gray-400"><Weight size={15} /><span className="flex-1">Package weight</span><span className="font-bold text-gray-950 dark:text-white">{shippableEntry.packageWeight}</span></div>}
              {shippableEntry?.dimensions && <div className="flex items-center gap-2 text-slate-600 dark:text-gray-400"><Box size={15} /><span className="flex-1">Parcel dimensions</span><span className="font-bold text-gray-950 dark:text-white">{shippableEntry.dimensions}</span></div>}
              {!shippableEntry?.packageWeight && !shippableEntry?.dimensions && <p className="text-[11px] text-slate-400">No package weight/dimensions on file for these items yet.</p>}
            </div>
          </Panel>

          <Panel title="Payout" icon={CreditCard}>
            <div className="space-y-3 p-5 text-sm">
              <div className="flex items-center gap-2 text-slate-600 dark:text-gray-400"><CreditCard size={15} /><span className="flex-1">Payment received</span><span className="font-bold text-gray-950 dark:text-white">{money(order.amount)}</span></div>
              {order.coinsDiscount > 0 && <div className="flex items-center gap-2 text-slate-600 dark:text-gray-400"><Coins size={15} /><span className="flex-1">B-Coins discount</span><span className="font-bold text-[#d90445]">-{money(order.coinsDiscount)}</span></div>}
              <div className="flex items-center gap-2 text-slate-600 dark:text-gray-400"><Truck size={15} /><span className="flex-1">Delivery fee</span><span className="font-bold text-emerald-600">Free</span></div>
              <div className="flex items-center gap-2 border-t border-blue-50 pt-3 text-[#d90445] dark:border-gray-800"><Wallet size={15} /><span className="flex-1 font-bold">Your earnings</span><span className="font-bold">{money(order.paymentStatus === 'Refunded' ? 0 : earnings)}</span></div>
              <p className="text-[11px] text-slate-400">No marketplace commission is deducted from product orders.</p>
            </div>
          </Panel>
        </aside>
      </div>
    </aside>
  );
}
