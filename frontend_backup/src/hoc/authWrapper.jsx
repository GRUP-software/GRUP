import { useEffect, createContext } from 'react';
import { useDispatch } from 'react-redux';
import { login, setisAuthenticated } from '../store/authSlice';
import useLogout from '../hooks/useLogout';

export const AuthContext = createContext();

const AuthWrapper = ({ children }) => {
    const dispatch = useDispatch();
    const logout = useLogout();

    useEffect(() => {
        try {
            const token = localStorage.getItem('token');
            const user = JSON.parse(localStorage.getItem('user'));

            if (token && user) {
                dispatch(
                    login({
                        token: token,
                        user: user,
                    })
                );
            } else {
                dispatch(setisAuthenticated(false));
            }
        } catch {
            logout();
        }
    }, [dispatch, logout]);

    return <AuthContext.Provider value={{}}>{children}</AuthContext.Provider>;
};

export default AuthWrapper;
