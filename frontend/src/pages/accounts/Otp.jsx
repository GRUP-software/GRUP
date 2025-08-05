import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import axios from 'axios';

import styled from 'styled-components';

// Components
import Form from '../../components/form/Form';
import Input from '../../components/form/Input';
import Button from '../../components/form/Button';
import Error from '../../components/form/Error';

// Store
import { login } from '../../store/authSlice';
import { headers } from '../../hooks/axios';
import { useState } from 'react';
import ResendCode from './ResendCode';

const PAGE = styled.div`
    padding-top: 80px;
    padding-bottom: 200px;
`;

const FORM = styled.form`
    display: grid;
    gap: 30px;
`;

const Otp = () => {
    const dispatch = useDispatch();
    const location = useLocation();
    const navigate = useNavigate();
    const ROUTED_DATA = location.state || null;
    const [token, setToken] = useState(ROUTED_DATA?.token);

    const get_new_token = (token) => {
        setToken(token);
    };

    const mutation = useMutation({
        mutationFn: async (object) => {
            const response = await axios.post(
                `${import.meta.env.VITE_APP_SERVER_URL}accounts/verify/`,
                {
                    otp: object.otp.trim(),
                    platform: 'web',
                },
                {
                    headers: {
                        ...headers,
                        Authorization: token,
                    },
                    withCredentials: true,
                }
            );
            return response;
        },
        retry: (failureCount, error) => {
            if (axios.isAxiosError(error) && error.response?.status === 400) {
                return false; // Don't retry on 400 errors
            }
            return failureCount < 1000; // Retry up to 1000 times for other errors
        },
        retryDelay: 1000, // Always wait 1 second between retries
        onSuccess: (response) => {
            if (response.status === 200) {
                dispatch(login(response.access));
                navigate('/');
            }
        },
        // onError: (error) => {
        //     console.error('Login failed:', error);
        // },
    });
    const submit = (e) => {
        e.preventDefault();
        const otp = e.target.otp.value;
        mutation.mutate({ otp });
    };

    return (
        <PAGE>
            <Form
                title={'Verify account'}
                title2="We've sent your OTP to your email. If it's not in your inbox, check your spam or junk folder."
            >
                <FORM onSubmit={submit}>
                    <Input
                        label="OTP"
                        name="otp"
                        type="number"
                        placeholder="Type your otp"
                        required={true}
                        min="0"
                    />
                    <ResendCode token={token} get_new_token={get_new_token} />
                    {mutation.isError && (
                        <Error text={mutation.error?.response?.data?.msg} />
                    )}

                    <Button
                        text="Submit"
                        width="200px"
                        height="50px"
                        loading={mutation.isPending}
                    />
                </FORM>
            </Form>
        </PAGE>
    );
};

export default Otp;
