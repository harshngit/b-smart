import { createSlice } from '@reduxjs/toolkit';

// Client-only cart (not server-persisted) for picking subservices from
// multiple different services/sellers before checking out together. Each
// item is a fully-formed booking-order item — the same shape the single
// "Book now" flow builds — plus a localId so the cart UI can key/remove rows
// before anything has a server-assigned id.
const initialState = {
  items: [],
};

const serviceCartSlice = createSlice({
  name: 'serviceCart',
  initialState,
  reducers: {
    addItem: (state, action) => {
      state.items.push({ localId: `${Date.now()}-${Math.random().toString(36).slice(2)}`, ...action.payload });
    },
    removeItem: (state, action) => {
      state.items = state.items.filter((item) => item.localId !== action.payload);
    },
    updateItem: (state, action) => {
      const { localId, changes } = action.payload;
      state.items = state.items.map((item) => (item.localId === localId ? { ...item, ...changes } : item));
    },
    clearCart: (state) => {
      state.items = [];
    },
  },
});

export const { addItem, removeItem, updateItem, clearCart } = serviceCartSlice.actions;
export default serviceCartSlice.reducer;
