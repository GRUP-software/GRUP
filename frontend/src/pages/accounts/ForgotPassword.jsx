import styled from 'styled-components';
import Button from '../../components/form/Button';
import Form from '../../components/form/Form';
import Input from '../../components/form/Input';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Error from '../../components/form/Error';
import { headers } from '../../hooks/axios';
import ResendCode from './ResendCode';

const PAGE = styled.div`
    padding-top: 80px;
    padding-bottom: 200px;
`;

const FORM = styled.form`
    display: grid;
    gap: 30px;
`;

const ForgotPassword = () => {
    const navigate = useNavigate();
    const [nextScreenpayload, setNextScreenPayload] = useState(null);
    const [error_msg, setError_msg] = useState(null);

    const get_new_token = (token) => {
        setNextScreenPayload((prev) => ({
            ...prev,
            token: token,
        }));
    };

    const forgot_password_mutation = useMutation({
        mutationFn: async (formData) => {
            const response = await axios.post(
                `${import.meta.env.VITE_APP_SERVER_URL}accounts/forgot-password/`,
                {
                    email: formData.email.trim(),
                },
                {
                    headers: headers,
                }
            );
            return response.data;
        },
        onSuccess: (data) => {
            setNextScreenPayload(data);
        },
    });
    const submit_forgot_password = (e) => {
        e.preventDefault();
        const email = e.target.email.value;

        forgot_password_mutation.mutate({ email });
    };

    const change_password_mutation = useMutation({
        mutationFn: async (formData) => {
            const response = await axios.post(
                `${import.meta.env.VITE_APP_SERVER_URL}accounts/change-password/`,
                {
                    otp: formData.otp.trim(),
                    password: formData.password.trim(),
                },
                {
                    headers: {
                        ...headers,
                        Authorization: nextScreenpayload.token,
                    },
                }
            );
            return response.data;
        },
        retry: (failureCount, error) => {
            if (axios.isAxiosError(error) && error.response?.status === 400) {
                return false; // Don't retry on 400 errors
            }
            return failureCount < 1000; // Retry up to 1000 times for other errors
        },
        retryDelay: 1000, // Always wait 1 second between retries
        onSuccess: () => {
            navigate('/login');
        },
        onError: () => {
            setError_msg('Invalid otp');
        },
    });
    const submit_change_password = (e) => {
        e.preventDefault();
        setError_msg(null);

        const otp = e.target.otp.value;
        const password = e.target.password.value;
        const password2 = e.target.password2.value;

        if (password !== password2) {
            setError_msg('Password does not match');
        } else {
            change_password_mutation.mutate({ otp, password, password2 });
        }
    };

    return (
        <PAGE>
            {!nextScreenpayload ? (
                <Form
                    title={'Forgot password'}
                    title2="Enter your email to get an otp"
                >
                    <FORM onSubmit={submit_forgot_password}>
                        <Input
                            label="Email"
                            name="email"
                            type="email"
                            placeholder="Type your email"
                            required={true}
                        />
                        <Button
                            text="Next"
                            width="200px"
                            height="50px"
                            loading={forgot_password_mutation.isPending}
                        />
                    </FORM>
                </Form>
            ) : (
                <Form
                    title={'Change password'}
                    title2="Check your email for your otp"
                >
                    <FORM onSubmit={submit_change_password}>
                        <Input
                            label="OTP"
                            name="otp"
                            type="number"
                            placeholder="Type your otp"
                            required={true}
                            min="0"
                        />
                        <ResendCode
                            token={nextScreenpayload.token}
                            get_new_token={get_new_token}
                        />
                        <Input
                            label="New password"
                            name="password"
                            type="password"
                            placeholder="Type your password"
                            required={true}
                            minLength={'6'}
                        />
                        <Input
                            label="Confirm password"
                            name="password2"
                            type="password"
                            placeholder="Confirm your password"
                            required={true}
                            minLength={'6'}
                        />
                        {(change_password_mutation.isError || error_msg) && (
                            <Error
                                text={
                                    change_password_mutation.error?.response
                                        ?.data?.msg || error_msg
                                }
                            />
                        )}
                        <Button
                            text="Submit"
                            width="200px"
                            height="50px"
                            loading={change_password_mutation.isPending}
                        />
                    </FORM>
                </Form>
            )}
        </PAGE>
    );
};

export default ForgotPassword;
