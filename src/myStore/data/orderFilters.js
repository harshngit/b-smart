export const ORDER_TABS = ['New', 'Processing', 'Shipped', 'Completed', 'All Orders'];
export const money = (value) => `₹${Number(value).toFixed(2)}`;
export const orderDate = (value) => new Date(`${value}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
// null = no status filter (used by the 'All Orders' tab)
const TAB_STATUSES = { New: ['Pending', 'Confirmed'], Processing: ['Processing'], Shipped: ['Shipped'], Completed: ['Delivered', 'Cancelled'], 'All Orders': null };

export function filterOrders(orders, { tab = 'New', search = '', payment = 'All status', from = '', to = '', oldest = false } = {}) {
  const query = search.trim().toLowerCase();
  const statuses = tab in TAB_STATUSES ? TAB_STATUSES[tab] : TAB_STATUSES.New;
  return orders.filter((order) => (!statuses || statuses.includes(order.status))
    && (!query || `${order.id} ${order.orderNumber || ''} ${order.customer} ${order.items.map((item) => item.name).join(' ')}`.toLowerCase().includes(query))
    && (payment === 'All status' || order.paymentStatus === payment)
    && (!from || order.date >= from) && (!to || order.date <= to))
    .sort((a, b) => oldest ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date));
}
