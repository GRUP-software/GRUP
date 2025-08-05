import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import homeReducer from './homeSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        home: homeReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({ serializableCheck: false }), // this is used to allow non serializable data like image files
});
