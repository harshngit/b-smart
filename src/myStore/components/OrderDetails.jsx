import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Check, Coins, Copy, CreditCard, MapPin, Package, PackageCheck,
  Truck, UserRound, Wallet, X,
} from 'lucide-react';
import { Checkbox, Dropdown, inputCls, labelCls } from '../../components/productForm/ProductFormFields';
import { COURIERS, canShipOrder, shipOrder, updateOrderFulfillment } from '../../store/ordersSlice';
import { OrderProductImage, PaymentBadge } from './OrderUI';
import { money } from '../data/orderFilters';

function StepNumber({ number, done }) {
  return (
    <span className={`inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${done ? 'bg-[#fa3f5e] text-white shadow-sm shadow-[#fa3f5e]/20' : 'bg-gray-100 text-gray-500 dark:bg-gray-800'}`}>
      {done ? <Check size={14} /> : number}
    </span>
  );
}

function SummaryCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/60">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">{label}</p>
        {React.createElement(Icon, { size: 17, className: 'text-[#fa3f5e]' })}
      </div>
      <p className="mt-3 break-words text-sm font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}

export default function OrderDetails({ order, closeTo, onStatusChange, updating = false, apiEnabled = false }) {
  const dispatch = useDispatch();
  const products = useSelector((state) => state.products.items);
  const headingRef = useRef(null);

  useEffect(() => { headingRef.current?.focus({ preventScroll: true }); }, [order?.id]);

  if (!order) {
    return (
      <aside className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h2 ref={headingRef} tabIndex={-1} className="font-bold text-gray-900 dark:text-white">Order not found</h2>
        <Link to={closeTo} className="mt-3 inline-block text-sm text-[#fa3f5e]">Back to orders</Link>
      </aside>
    );
  }

  const editable = ['Pending', 'Confirmed', 'Processing'].includes(order.status);
  const update = (changes) => dispatch(updateOrderFulfillment({ id: order.id, ...changes }));
  const setStatus = (status) => {
    if (apiEnabled) onStatusChange?.(order.id, status);
    else if (status === 'Shipped') dispatch(shipOrder(order.id));
  };
  const canAdvanceToProcessing = ['Pending', 'Confirmed'].includes(order.status);
  const canAdvanceToShipped = ['Confirmed', 'Processing'].includes(order.status);
  const canAdvanceToDelivered = order.status === 'Shipped';
  const earnings = Math.max(0, order.amount - order.coinsDiscount);
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const progressSteps = ['Confirmed', 'Processing', 'Shipped', 'Delivered'];
  const normalizedStatus = ['Pending', 'New'].includes(order.status) ? 'Confirmed' : order.status;
  const activeStep = progressSteps.indexOf(normalizedStatus);
  const cancelled = order.status === 'Cancelled';

  const copyOrderId = async () => {
    try {
      await navigator.clipboard?.writeText(String(order.id));
    } catch {
      // Non-critical convenience action.
    }
  };

  return (
    <aside aria-label="Order details" className="space-y-5">
      <section className="relative overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-insta-purple via-insta-pink to-insta-orange" />
        <div className="p-5 md:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-bold text-gray-900 outline-none dark:text-white">Order details</h2>
                <PaymentBadge status={order.paymentStatus} />
              </div>
              <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <span>Order <span className="font-semibold text-[#fa3f5e]">#{order.id}</span></span>
                <button type="button" onClick={copyOrderId} aria-label="Copy order id" className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-50 hover:text-[#fa3f5e] dark:hover:bg-gray-800">
                  <Copy size={15} />
                </button>
              </div>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-400">
                Review customer items, payment, delivery details, and move the order through fulfillment.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${cancelled ? 'bg-red-50 text-red-500 dark:bg-red-900/20' : 'bg-pink-50 text-[#fa3f5e] dark:bg-pink-900/20'}`}>{order.status}</span>
              <Link to={closeTo} aria-label="Close order details" className="rounded-xl border border-gray-200 p-2 text-gray-400 transition-colors hover:bg-gray-50 hover:text-[#fa3f5e] dark:border-gray-700 dark:hover:bg-gray-800">
                <X size={17} />
              </Link>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard label="Customer" value={order.customer} icon={UserRound} />
            <SummaryCard label="Items" value={`${itemCount} item${itemCount === 1 ? '' : 's'}`} icon={Package} />
            <SummaryCard label="Total" value={money(order.amount)} icon={CreditCard} />
            <SummaryCard label="Earnings" value={money(order.paymentStatus === 'Refunded' ? 0 : earnings)} icon={Wallet} />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 md:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Order progress</h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">A quick view of where this order sits.</p>
          </div>
          {order.courier && <span className="rounded-full bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-300">{order.courier} {order.trackingNumber ? `- ${order.trackingNumber}` : ''}</span>}
        </div>
        {cancelled ? (
          <div className="flex items-center gap-3 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-600 dark:bg-red-900/20 dark:text-red-300">
            <X size={18} />
            This order has been cancelled.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-4">
            {progressSteps.map((step, index) => {
              const done = activeStep >= index;
              const current = activeStep === index;
              return (
                <div key={step} className="relative flex items-center gap-3 md:block">
                  {index < progressSteps.length - 1 && <span className={`absolute left-[calc(50%+18px)] right-[calc(-50%+18px)] top-5 hidden h-0.5 md:block ${activeStep > index ? 'bg-[#fa3f5e]' : 'bg-gray-200 dark:bg-gray-800'}`} />}
                  <span className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full ${done ? 'bg-[#fa3f5e] text-white' : 'bg-gray-100 text-gray-400 dark:bg-gray-800'}`}>
                    {done ? <Check size={18} /> : index + 1}
                  </span>
                  <div className="md:mt-3">
                    <p className={`text-sm font-bold ${done ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>{step}</p>
                    <p className="mt-0.5 text-xs text-gray-400">{current ? 'Current step' : done ? 'Completed' : 'Waiting'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-3xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800 md:px-6">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Purchased items</h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Line items included in this order.</p>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {order.items.map((item) => (
              <div key={item.productId} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center md:px-6">
                <OrderProductImage item={item} products={products} className="h-16 w-16" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold leading-6 text-gray-900 dark:text-white">{item.name}</p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Qty: {item.quantity} x {money(item.unitPrice)}</p>
                </div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{money(item.unitPrice * item.quantity)}</p>
              </div>
            ))}
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-4 flex items-center gap-2">
              <MapPin size={18} className="text-[#fa3f5e]" />
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Delivery address</h3>
            </div>
            <address className="not-italic text-sm leading-6 text-gray-500 dark:text-gray-400">
              <span className="font-bold text-gray-900 dark:text-white">{order.address.name}</span><br />
              {order.address.street}<br />
              {order.address.city}, {order.address.region} {order.address.postalCode}<br />
              {order.address.country}
            </address>
          </section>

          <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-4 flex items-center gap-2">
              <CreditCard size={18} className="text-[#fa3f5e]" />
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Payment</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400"><CreditCard size={15} /><span className="flex-1">{order.paymentStatus === 'Refunded' ? 'Payment refunded' : 'Payment received'}</span><span className="font-semibold text-gray-800 dark:text-gray-200">{money(order.amount)}</span></div>
              <div className="flex items-center gap-2 text-insta-purple"><Coins size={15} /><span className="flex-1">B-Coins discount</span><span className="font-semibold">-{money(order.coinsDiscount)}</span></div>
              <div className="flex items-center gap-2 border-t border-gray-100 pt-3 text-[#fa3f5e] dark:border-gray-800"><Wallet size={15} /><span className="flex-1 font-semibold">Your earnings</span><span className="font-bold">{money(order.paymentStatus === 'Refunded' ? 0 : earnings)}</span></div>
            </div>
          </section>
        </aside>
      </div>

      <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 md:p-6">
        {editable ? (
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Fulfill order</h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Confirm, pack, assign shipping, and notify the customer.</p>
              </div>
              {apiEnabled && <span className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-bold text-green-600 dark:bg-green-900/20">Live updates</span>}
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-2xl border border-gray-100 p-4 dark:border-gray-800">
                <div className="flex items-start gap-3"><StepNumber number={1} done={order.confirmed} /><div className="flex-1"><Checkbox checked={order.confirmed} onChange={(confirmed) => apiEnabled && confirmed ? setStatus('Confirmed') : update({ confirmed })} label="Confirm items" /><p className="mt-1 text-[11px] text-gray-400">{order.confirmed ? 'All items confirmed' : 'Check the items in this order'}</p></div></div>
              </div>
              <div className="rounded-2xl border border-gray-100 p-4 dark:border-gray-800">
                <div className="flex items-start gap-3"><StepNumber number={2} done={order.packed} /><fieldset disabled={!order.confirmed && !apiEnabled} className="flex-1 disabled:opacity-50"><Checkbox checked={order.packed} onChange={(packed) => apiEnabled && packed ? setStatus('Processing') : update({ packed })} label="Pack order" /><p className="mt-1 text-[11px] text-gray-400">{order.packed ? 'Order packed and ready' : 'Pack all confirmed items'}</p></fieldset></div>
              </div>
              <div className="rounded-2xl border border-gray-100 p-4 dark:border-gray-800 lg:col-span-2">
                <div className="flex items-start gap-3"><StepNumber number={3} done={!!(order.courier && order.trackingNumber.trim())} /><div className="grid min-w-0 flex-1 gap-3 md:grid-cols-2"><Dropdown label="Courier" value={order.courier || 'Select courier'} options={COURIERS} onChange={(courier) => update({ courier })} /><div><label htmlFor="order-tracking" className={labelCls}>Tracking number</label><input id="order-tracking" value={order.trackingNumber} maxLength={80} onChange={(event) => update({ trackingNumber: event.target.value })} placeholder="Enter tracking number" className={inputCls} /></div></div></div>
              </div>
              <div className="rounded-2xl border border-gray-100 p-4 dark:border-gray-800 lg:col-span-2">
                <div className="flex items-center gap-3"><StepNumber number={4} done={order.notifyCustomer} /><div className="flex-1"><p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Notify customer</p><p className="mt-1 text-[11px] text-gray-400">Send shipping confirmation</p></div><button type="button" role="switch" aria-checked={order.notifyCustomer} aria-label="Notify customer" onClick={() => update({ notifyCustomer: !order.notifyCustomer })} className={`h-6 w-10 rounded-full p-0.5 transition-colors ${order.notifyCustomer ? 'bg-[#fa3f5e]' : 'bg-gray-300 dark:bg-gray-700'}`}><span className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${order.notifyCustomer ? 'translate-x-4' : ''}`} /></button></div>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              {apiEnabled && canAdvanceToProcessing && <button type="button" disabled={updating} onClick={() => setStatus('Processing')} className="flex-1 rounded-xl border border-[#fa3f5e]/40 py-3 text-sm font-bold text-[#fa3f5e] disabled:cursor-not-allowed disabled:opacity-40">Move to processing</button>}
              <button type="button" disabled={updating || (apiEnabled ? !canAdvanceToShipped : !canShipOrder(order))} onClick={() => setStatus('Shipped')} className="flex-1 rounded-xl bg-gradient-to-r from-insta-purple via-insta-pink to-insta-orange py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">{updating ? 'Updating...' : 'Mark as shipped'}</button>
            </div>
            {apiEnabled ? <p className="mt-2 text-[11px] text-gray-400">Status updates are sent to the order tracking API.</p> : !canShipOrder(order) && <p className="mt-2 text-[11px] text-gray-400">Confirm and pack the items, then enter the courier and tracking number.</p>}
          </div>
        ) : (
          <div className="space-y-3 rounded-2xl bg-gray-50 p-4 dark:bg-gray-800/60">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-200">{order.status === 'Cancelled' ? <X size={17} /> : order.status === 'Delivered' ? <PackageCheck size={17} className="text-green-500" /> : <Truck size={17} className="text-[#fa3f5e]" />}<span role="status">{order.status === 'Shipped' ? 'Order shipped' : order.status === 'Delivered' ? 'Order delivered' : 'Order cancelled'}</span></div>
            {order.courier && <p className="break-words text-xs text-gray-500 dark:text-gray-400">{order.courier} - {order.trackingNumber}</p>}
            <PaymentBadge status={order.paymentStatus} />
            {apiEnabled && canAdvanceToDelivered && <button type="button" disabled={updating} onClick={() => setStatus('Delivered')} className="w-full rounded-xl bg-gradient-to-r from-insta-purple via-insta-pink to-insta-orange py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">{updating ? 'Updating...' : 'Mark as delivered'}</button>}
          </div>
        )}
      </section>
    </aside>
  );
}
