import { createSlice } from '@reduxjs/toolkit';

export const homeSlice = createSlice({
    name: 'home',
    initialState: {
        initial_load: false,
        loading: true,
        more_loading: false,
        pagination: null,
        products: [],
    },
    reducers: {
        setInitialLoad: (state, action) => {
            state.initial_load = action.payload;
        },
        setLoading: (state, action) => {
            state.loading = action.payload;
        },
        setMoreLoading: (state, action) => {
            state.more_loading = action.payload;
        },
        setPagination: (state, action) => {
            state.pagination = action.payload;
        },
        setNewProducts: (state, action) => {
            state.products = action.payload.sort(() => Math.random() - 0.5);
        },
        setInsertProducts: (state, action) => {
            var results = action.payload.sort(() => Math.random() - 0.5);
            state.products = [...state.products, ...results];
        },
    },
});

export const {
    setInitialLoad,
    setLoading,
    setMoreLoading,
    setPagination,
    setNewProducts,
    setInsertProducts,
} = homeSlice.actions;

export default homeSlice.reducer;
