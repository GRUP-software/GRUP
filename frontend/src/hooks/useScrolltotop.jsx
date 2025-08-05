import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

const useScrolltotop = () => {
    const { pathname } = useLocation();

    useLayoutEffect(() => {
        if (pathname !== '/') {
            window.scrollTo(0, 0);
        }
    }, [pathname]);
};

export default useScrolltotop;
