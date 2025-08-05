import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

const PrivateOfflineRoutes = () => {
    const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
    const location = useLocation();
    const ROUTED_DATA = location.state || null;

    return (
        <>
            {isAuthenticated === false && <Outlet />}
            {isAuthenticated &&
                (ROUTED_DATA?.listing_url ? (
                    <Navigate to={`/listing/${ROUTED_DATA?.listing_url}`} />
                ) : (
                    <Navigate to="/" />
                ))}
        </>
    );
};

export default PrivateOfflineRoutes;
