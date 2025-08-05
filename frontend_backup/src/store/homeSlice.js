import { createSlice } from '@reduxjs/toolkit';

export const homeSlice = createSlice({
    name: 'home',
    initialState: {
        initial_load: false,
        loading: true,
        more_loading: false,
        pagination: null,
        products: [
            {
                icon: 'https://ng.jumia.is/unsafe/fit-in/300x300/filters:fill(white)/product/77/3810993/1.jpg?4140',
                name: 'Organic Corn',
                price: 10002,
                discount: '35%',
            },
            {
                icon: 'https://ng.jumia.is/unsafe/fit-in/300x300/filters:fill(white)/product/77/3810993/1.jpg?4140',
                name: 'Fresh Apples',
                price: 8000,
                discount: '25%',
            },
            {
                icon: 'https://ng.jumia.is/unsafe/fit-in/300x300/filters:fill(white)/product/77/3810993/1.jpg?4140',
                name: 'Baby Carrots',
                price: 6000,
                discount: '40%',
            },
            {
                icon: 'https://ng.jumia.is/unsafe/fit-in/300x300/filters:fill(white)/product/77/3810993/1.jpg?4140',
                name: 'Leafy Greens',
                price: 4000,
                discount: '30%',
            },
            {
                icon: 'https://ng.jumia.is/unsafe/fit-in/300x300/filters:fill(white)/product/77/3810993/1.jpg?4140',
                name: 'Leafy Greens',
                price: 4000,
                discount: '30%',
            },
            {
                icon: 'https://ng.jumia.is/unsafe/fit-in/300x300/filters:fill(white)/product/77/3810993/1.jpg?4140',
                name: 'Leafy Greens',
                price: 4000,
                discount: '30%',
            },
            {
                icon: 'https://ng.jumia.is/unsafe/fit-in/300x300/filters:fill(white)/product/77/3810993/1.jpg?4140',
                name: 'Leafy Greens',
                price: 4000,
                discount: '30%',
            },
            {
                icon: 'https://ng.jumia.is/unsafe/fit-in/300x300/filters:fill(white)/product/77/3810993/1.jpg?4140',
                name: 'Leafy Greens',
                price: 4000,
                discount: '30%',
            },
            {
                icon: 'https://ng.jumia.is/unsafe/fit-in/300x300/filters:fill(white)/product/77/3810993/1.jpg?4140',
                name: 'Leafy Greens',
                price: 4000,
                discount: '30%',
            },
            {
                icon: 'https://ng.jumia.is/unsafe/fit-in/300x300/filters:fill(white)/product/77/3810993/1.jpg?4140',
                name: 'Leafy Greens',
                price: 4000,
                discount: '30%',
            },
            {
                icon: 'https://ng.jumia.is/unsafe/fit-in/300x300/filters:fill(white)/product/77/3810993/1.jpg?4140',
                name: 'Leafy Greens',
                price: 4000,
                discount: '30%',
            },
            {
                icon: 'https://ng.jumia.is/unsafe/fit-in/300x300/filters:fill(white)/product/77/3810993/1.jpg?4140',
                name: 'Leafy Greens',
                price: 4000,
                discount: '30%',
            },
            {
                icon: 'https://ng.jumia.is/unsafe/fit-in/300x300/filters:fill(white)/product/77/3810993/1.jpg?4140',
                name: 'Leafy Greens',
                price: 4000,
                discount: '30%',
            },
            {
                icon: 'https://ng.jumia.is/unsafe/fit-in/300x300/filters:fill(white)/product/77/3810993/1.jpg?4140',
                name: 'Leafy Greens',
                price: 4000,
                discount: '30%',
            },
        ],
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
