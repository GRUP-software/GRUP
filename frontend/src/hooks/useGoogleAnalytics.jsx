import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ReactGA from 'react-ga4';

const useGoogleAnalytics = () => {
    const location = useLocation();

    useEffect(() => {
        const TRACKING_ID = import.meta.env
            .VITE_APP_GOOGLE_ANALYTICS_TRACKING_ID;
        if (TRACKING_ID) {
            ReactGA.initialize(TRACKING_ID);
        }
    }, []);

    useEffect(() => {
        ReactGA.send({
            hitType: 'pageview',
            page: location.pathname + location.search,
        });
    }, [location]);
};

export default useGoogleAnalytics;
