import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import wishlistService from '../services/wishlistService';

export const fetchWishlist = createAsyncThunk('wishlist/fetch', async (_, thunkAPI) => {
  try {
    return await wishlistService.list();
  } catch (error) {
    return thunkAPI.rejectWithValue(error?.response?.data?.message || 'Could not load wishlist.');
  }
});

export const addWishlistItem = createAsyncThunk('wishlist/addItem', async (productId, thunkAPI) => {
  try {
    return await wishlistService.addItem(productId);
  } catch (error) {
    return thunkAPI.rejectWithValue(error?.response?.data?.message || 'Could not add to wishlist.');
  }
});

export const removeWishlistItem = createAsyncThunk('wishlist/removeItem', async (productId, thunkAPI) => {
  try {
    return await wishlistService.removeItem(productId);
  } catch (error) {
    return thunkAPI.rejectWithValue(error?.response?.data?.message || 'Could not remove from wishlist.');
  }
});

export const clearWishlist = createAsyncThunk('wishlist/clear', async (_, thunkAPI) => {
  try {
    return await wishlistService.clear();
  } catch (error) {
    return thunkAPI.rejectWithValue(error?.response?.data?.message || 'Could not clear wishlist.');
  }
});

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState: {
    products: [],
    loading: false,
    error: '',
  },
  reducers: {},
  extraReducers: (builder) => {
    const pending = (state) => {
      state.loading = true;
      state.error = '';
    };
    const fulfilled = (state, action) => {
      state.loading = false;
      state.products = action.payload || [];
      state.error = '';
    };
    const rejected = (state, action) => {
      state.loading = false;
      state.error = action.payload || 'Wishlist update failed.';
    };

    builder
      .addCase(fetchWishlist.pending, pending)
      .addCase(fetchWishlist.fulfilled, fulfilled)
      .addCase(fetchWishlist.rejected, rejected)
      .addCase(addWishlistItem.pending, pending)
      .addCase(addWishlistItem.fulfilled, fulfilled)
      .addCase(addWishlistItem.rejected, rejected)
      .addCase(removeWishlistItem.pending, pending)
      .addCase(removeWishlistItem.fulfilled, fulfilled)
      .addCase(removeWishlistItem.rejected, rejected)
      .addCase(clearWishlist.pending, pending)
      .addCase(clearWishlist.fulfilled, fulfilled)
      .addCase(clearWishlist.rejected, rejected);
  },
});

export default wishlistSlice.reducer;
