import { resetAuthSliceData } from '../store/authSlice';

import { useDispatch } from 'react-redux';

const useLogout = () => {
    const dispatch = useDispatch();

    const logout = () => {
        dispatch(resetAuthSliceData());
    };

    return logout;
};

export default useLogout;
