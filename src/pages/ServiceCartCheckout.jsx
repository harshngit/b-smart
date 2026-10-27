import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { CheckCircle2, ChevronRight, Loader2, Trash2 } from 'lucide-react';
import { bookingTime, localDate } from '../myStore/data/bookingHelpers';
import serviceBookingService from '../services/serviceBookingService';
import PaymentSplitSlider from '../components/PaymentSplitSlider';
import { removeItem, clearCart } from '../store/serviceCartSlice';
import { fetchWallet } from '../store/walletSlice';

const panel = 'rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm';
const primary = 'rounded-lg bg-gradient-to-r from-insta-purple via-insta-pink to-insta-orange text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed';

// Strips the client-only display fields (serviceName, serviceImage, itemTotal,
// localId) back down to what POST /service-bookings/orders expects.
const toOrderItem = ({ service_id, booking_date, time_slot, selected_subservices, customer_address, notes }) => ({
  service_id, booking_date, time_slot, selected_subservices, customer_address, notes,
});

export default function ServiceCartCheckout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const items = useSelector((state) => state.serviceCart.items);
  const walletBalance = useSelector((state) => state.wallet.balance) || 0;
  const user = useSelector((state) => state.auth.userObject);
  const [coinsToUse, setCoinsToUse] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [placed, setPlaced] = useState(false);

  useEffect(() => { dispatch(fetchWallet()); }, [dispatch]);

  const totalAmount = items.reduce((sum, item) => sum + (Number(item.itemTotal) || 0), 0);

  const placeOrder = async () => {
    if (!items.length) return;
    setSubmitting(true);
    setError('');
    try {
      const result = await serviceBookingService.createOrder({
        items: items.map(toOrderItem),
        coins_to_use: coinsToUse,
      });
      const order = result?.order || result?.data?.order || {};
      const orderId = order._id || order.id;

      if (order.payment_status === 'paid') {
        dispatch(fetchWallet());
        dispatch(clearCart());
        setPlaced(true);
        return;
      }

      const razorpay = result?.razorpay || result?.data?.razorpay;
      if (!orderId || !razorpay?.order_id || !razorpay?.key_id) throw new Error('Razorpay order details were not returned.');
      const loaded = await serviceBookingService.loadRazorpay();
      if (!loaded) throw new Error('Payment gateway failed to load. Please try again.');
      const rzp = new window.Razorpay({
        key: razorpay.key_id,
        amount: razorpay.amount,
        currency: razorpay.currency || 'INR',
        name: 'BSmart',
        description: `${items.length} service${items.length > 1 ? 's' : ''}`,
        order_id: razorpay.order_id,
        prefill: { name: user?.name || user?.full_name || '', contact: user?.phone || '', email: user?.email || '' },
        handler: async (paymentResponse) => {
          try {
            await serviceBookingService.verifyOrderPayment(orderId, paymentResponse);
            dispatch(fetchWallet());
            dispatch(clearCart());
            setPlaced(true);
          } catch (err) {
            setError(err?.response?.data?.message || 'Payment verification failed. Please contact support.');
          } finally {
            setSubmitting(false);
          }
        },
        modal: { ondismiss: () => setSubmitting(false) },
        theme: { color: '#fa3f5e' },
      });
      rzp.on('payment.failed', (response) => {
        setError(response?.error?.description || 'Payment failed. Please try again.');
        setSubmitting(false);
      });
      rzp.open();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Could not place this order.');
      setSubmitting(false);
    }
  };

  if (placed) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 py-20 text-center">
        <CheckCircle2 size={44} className="mx-auto text-[#fa3f5e] mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Order placed</h1>
        <p className="text-sm text-gray-500 mt-3">Your bookings have been confirmed.</p>
        <Link to="/market/my-orders" className={`${primary} inline-block mt-6 px-5 py-3`}>View bookings</Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1280px] mx-auto px-4 md:px-6 py-6 bg-gray-50 dark:bg-black min-h-screen text-gray-900 dark:text-white">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mb-5">
        <Link to="/market" className="hover:text-[#fa3f5e]">Marketplace</Link>
        <ChevronRight size={14} aria-hidden="true" />
        <span aria-current="page" className="text-[#fa3f5e]">Service cart</span>
      </nav>

      {!items.length ? (
        <div className="py-20 text-center">
          <p className="text-gray-500 dark:text-gray-400">Your service cart is empty.</p>
          <Link to="/market" className={`${primary} inline-block mt-6 px-5 py-3`}>Browse services</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-5 items-start">
          <main className="min-w-0 space-y-3">
            <h1 className="text-xl font-bold">Service cart ({items.length})</h1>
            {items.map((item) => (
              <div key={item.localId} className={`${panel} p-4 flex items-start gap-3`}>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{item.serviceName}</p>
                  <p className="text-xs text-gray-500 mt-1">{localDate(new Date(item.booking_date))} · {bookingTime(item.time_slot?.start)}</p>
                  {item.selected_subservices?.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Subservices: {item.selected_subservices.map((s) => s.name).join(', ')}
                    </p>
                  )}
                  <p className="text-sm font-semibold text-[#fa3f5e] mt-2">₹{Number(item.itemTotal || 0).toLocaleString()}</p>
                </div>
                <button
                  type="button"
                  onClick={() => dispatch(removeItem(item.localId))}
                  aria-label={`Remove ${item.serviceName} from cart`}
                  className="text-gray-400 hover:text-red-500 shrink-0"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </main>
          <aside className={`${panel} p-4 lg:sticky lg:top-6 min-w-0 space-y-4`}>
            <h2 className="text-base font-bold">Order summary</h2>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Total</span>
              <span className="font-semibold text-[#fa3f5e]">₹{totalAmount.toLocaleString()}</span>
            </div>
            <div>
              <h3 className="text-sm font-bold mb-2">How to pay</h3>
              <PaymentSplitSlider totalAmount={totalAmount} walletBalance={walletBalance} value={coinsToUse} onChange={setCoinsToUse} />
            </div>
            {error && <p role="alert" className="text-xs text-[#fa3f5e]">{error}</p>}
            <button
              type="button"
              onClick={placeOrder}
              disabled={submitting}
              className={`${primary} w-full py-3 flex items-center justify-center gap-2`}
            >
              {submitting ? <><Loader2 size={16} className="animate-spin" />Processing...</> : 'Place order'}
            </button>
          </aside>
        </div>
      )}
    </div>
  );
}
