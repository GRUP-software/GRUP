import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';

const PrivateAuthRoutes = () => {
    const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);

    return (
        <>
            {isAuthenticated && <Outlet />}
            {isAuthenticated === false && <Navigate to="/signin" />}
        </>
    );
};

export default PrivateAuthRoutes;
