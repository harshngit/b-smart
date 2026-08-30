import { createSlice } from '@reduxjs/toolkit';

// Mock, frontend-only cart — not persisted or wired to a backend yet.
const cartSlice = createSlice({
  name: 'cart',
  initialState: {
    items: [], // { id, name, subtitle, brand, price, qty, category }
  },
  reducers: {
    addItem: (state, action) => {
      const { id, qty = 1 } = action.payload;
      const existing = state.items.find((i) => i.id === id);
      if (existing) {
        existing.qty += qty;
      } else {
        state.items.push({ ...action.payload, qty });
      }
    },
    removeItem: (state, action) => {
      state.items = state.items.filter((i) => i.id !== action.payload);
    },
    incrementQty: (state, action) => {
      const item = state.items.find((i) => i.id === action.payload);
      if (item) item.qty += 1;
    },
    decrementQty: (state, action) => {
      const item = state.items.find((i) => i.id === action.payload);
      if (item && item.qty > 1) item.qty -= 1;
    },
    clearCart: (state) => {
      state.items = [];
    },
  },
});

export const { addItem, removeItem, incrementQty, decrementQty, clearCart } = cartSlice.actions;
export default cartSlice.reducer;
