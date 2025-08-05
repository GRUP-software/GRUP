import { createSlice } from '@reduxjs/toolkit';

export const authSlice = createSlice({
    name: 'auth',
    initialState: {
        accessToken: null,
        isAuthenticated: null,
        userData: null,
    },
    reducers: {
        login: (state, action) => {
            state.isAuthenticated = true;
            localStorage.setItem('token', action.payload.token);
            localStorage.setItem('user', JSON.stringify(action.payload.user));
            state.accessToken = action.payload.token;
            state.userData = action.payload.user;
        },
        setisAuthenticated: (state, action) => {
            state.isAuthenticated = action.payload;
        },
        setAccessToken: (state, action) => {
            state.accessToken = action.payload;
        },

        resetAuthSliceData: (state) => {
            state.isAuthenticated = false;
            state.accessToken = null;
            state.userData = null;
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        },
    },
});

export const { login, setAccessToken, setisAuthenticated, resetAuthSliceData } =
    authSlice.actions;

export default authSlice.reducer;
