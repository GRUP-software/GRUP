import { useCallback, useEffect } from 'react';
import useRefreshToken from './useRefreshToken';
import { axiosPrivate } from './axios';

const useAxiosPrivate = () => {
    const refresh = useRefreshToken();

    const clear_storage_and_reload = useCallback(() => {
        localStorage.clear();
        window.location.reload();
    }, []);

    useEffect(() => {
        const requestIntercept = axiosPrivate.interceptors.request.use(
            async (config) => {
                try {
                    if (localStorage.getItem(0)) {
                        var auth = localStorage.getItem(0);
                    } else {
                        auth = null;
                    }
                } catch {
                    clear_storage_and_reload();
                }
                if (!config.headers['Authorization'] && auth) {
                    const newAccessToken = await refresh();
                    if (newAccessToken === 403) {
                        clear_storage_and_reload();
                        return;
                    }
                    config.headers['Authorization'] = newAccessToken;
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        const responseIntercept = axiosPrivate.interceptors.response.use(
            (response) => response,
            async (error) => {
                const prevRequest = error?.config;
                if (error?.response?.status === 403 && !prevRequest?.sent) {
                    prevRequest.sent = true;
                    const newAccessToken = await refresh();
                    if (newAccessToken === 403) {
                        clear_storage_and_reload();
                        return;
                    }
                    prevRequest.headers['Authorization'] = newAccessToken;
                    return axiosPrivate(prevRequest);
                }
                return Promise.reject(error);
            }
        );

        return () => {
            axiosPrivate.interceptors.request.eject(requestIntercept);
            axiosPrivate.interceptors.response.eject(responseIntercept);
        };
    }, [refresh, clear_storage_and_reload]);

    return axiosPrivate;
};

export default useAxiosPrivate;
