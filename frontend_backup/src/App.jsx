import 'react-lazy-load-image-component/src/effects/blur.css';
import 'react-activity/dist/Digital.css';

// Higher-Order Components (HOC)
import { Providers } from './hoc/BuildProviderTree';

import NavBar from './components/navbar/NavBar';
import Home from './pages/home/Home';
import ProductPage from './pages/product/ProductPage';
import ProfilePage from './pages/profile/ProfilePage';
import SignIn from './pages/accounts/SignIn';
import SignUp from './pages/accounts/SignUp';
import AboutUs from './pages/about';
import ContactUs from './pages/contact';
import EditProfile from './pages/profile/EditProfile';
import { Routes, Route } from 'react-router-dom';
import useScrolltotop from './hooks/useScrolltotop';

// Private Routes
import PrivateOfflineRoutes from './privateRoutes/PrivateOfflineRoutes';
import PrivateAuthRoutes from './privateRoutes/PrivateAuthRoutes';

function App() {
    useScrolltotop();

    const global_routes = [
        { path: '/', element: <Home /> },
        { path: '/product/:url', element: <ProductPage /> },
        { path: '/about', element: <AboutUs /> },
        { path: '/contact', element: <ContactUs /> },
    ];
    const private_offline_routes = [
        { path: '/register', element: <SignUp /> },
        { path: '/signin', element: <SignIn /> },
    ];
    const private_auth_routes = [
        { path: '/account', element: <ProfilePage /> },
        { path: '/edit-profile', element: <EditProfile /> },
    ];
    return (
        <Providers>
            <div className="App">
                <NavBar />
                <Routes>
                    {global_routes.map((route) => (
                        <Route
                            key={route.path}
                            path={route.path}
                            element={route.element}
                        />
                    ))}
                    <Route element={<PrivateOfflineRoutes />}>
                        {private_offline_routes.map((route) => (
                            <Route
                                key={route.path}
                                path={route.path}
                                element={route.element}
                            />
                        ))}
                    </Route>
                    <Route element={<PrivateAuthRoutes />}>
                        {private_auth_routes.map((route) => (
                            <Route
                                key={route.path}
                                path={route.path}
                                element={route.element}
                            />
                        ))}
                    </Route>
                </Routes>
            </div>
        </Providers>
    );
}

export default App;
