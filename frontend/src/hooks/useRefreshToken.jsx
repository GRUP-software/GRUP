import axios from 'axios';
import { useDispatch } from 'react-redux';
import { setAccessToken } from '../store/authSlice';
import { headers } from './axios';

const useRefreshToken = () => {
    const dispatch = useDispatch();

    const refresh = async () => {
        try {
            const response = await axios.post(
                `${import.meta.env.VITE_APP_SERVER_URL}accounts/refresh/`,
                {
                    platform: 'web',
                },
                {
                    withCredentials: true,
                    headers: headers,
                }
            );
            if (response.status === 200) {
                dispatch(setAccessToken(response.data.access));
            }
            return response.data.access;
        } catch (error) {
            if (error?.response?.status === 403) {
                return 403;
            }
        }
    };

    return refresh;
};

export default useRefreshToken;
