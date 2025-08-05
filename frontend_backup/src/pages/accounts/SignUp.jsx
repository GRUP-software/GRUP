import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';

import styled from 'styled-components';
import 'react-phone-number-input/style.css';

// Components
import Form from '../../components/form/Form';
import Input from '../../components/form/Input';
import Button from '../../components/form/Button';
// import PhoneNumberInput from '../../components/form/PhoneNumberInput';
import Error from '../../components/form/Error';
import { headers } from '../../hooks/axios';
import { Helmet } from 'react-helmet';
import { useDispatch } from 'react-redux';
import { login } from '../../store/authSlice';

const PAGE = styled.div`
    padding-top: 80px;
    padding-bottom: 200px;
`;

const FORM = styled.form`
    display: grid;
    gap: 30px;
    .down {
        display: flex;
        justify-content: center;
        gap: 10px;
        font-size: var(--font-small);
    }
    .go-to {
        text-decoration: none;
        color: var(--app-color);
    }
`;

const SignUp = () => {
    const dispatch = useDispatch();
    const [error_msg, setError_msg] = useState(null);

    const navigate = useNavigate();
    const mutation = useMutation({
        mutationFn: async (formData) => {
            const response = await axios.post(
                `${import.meta.env.VITE_APP_SERVER_URL}auth/signup`,
                {
                    email: formData.email.trim(),
                    password: formData.password.trim(),
                    name: `${formData.first_name.trim()} ${formData.last_name.trim()}`,
                    referralCode: formData.referralCode.trim(),
                    // phonenumber: formData.phonenumber.trim(),
                    // platform: 'web',
                },
                {
                    headers: headers,
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
            if (response.status === 201) {
                dispatch(login(response.data));
                navigate('/');
            }
        },
        onError: (response) => {
            if (response.status === 400) {
                setError_msg(response.response.data.message);
            }
        },
    });
    const submit = (e) => {
        e.preventDefault();
        setError_msg(null);

        const first_name = e.target.first_name.value;
        const last_name = e.target.last_name.value;
        const email = e.target.email.value;
        const password = e.target.password.value;
        const password2 = e.target.password2.value;
        const referralCode = e.target.referralCode.value;

        if (password !== password2) {
            setError_msg('Password does not match');
        } else {
            mutation.mutate({
                first_name,
                last_name,
                email,
                // phonenumber,
                password,
                referralCode,
            });
        }
    };

    return (
        <PAGE>
            <Helmet>
                <title>Register and start saving today!</title>
                <link
                    rel="canonical"
                    href={`${import.meta.env.VITE_APP_URL}signup/`}
                />
            </Helmet>
            <Form title={'Register and start saving today!'}>
                <FORM onSubmit={submit}>
                    <Input
                        label="Firstname"
                        name="first_name"
                        type="text"
                        placeholder="Type your firstname"
                        required={true}
                    />
                    <Input
                        label="Lastname"
                        name="last_name"
                        type="text"
                        placeholder="Type your lastname"
                        required={true}
                    />
                    <Input
                        label="Email"
                        name="email"
                        type="email"
                        placeholder="Type your email"
                        required={true}
                    />
                    <Input
                        label="Referral Code"
                        name="referralCode"
                        type="text"
                        placeholder="Optional"
                        required={false}
                    />
                    {/* <PhoneNumberInput
                        value={phonenumber}
                        onChange={setPhonenumber}
                    /> */}
                    <Input
                        label="Password"
                        name="password"
                        type="password"
                        placeholder="Type your password"
                        required={true}
                        minLength={'8'}
                    />
                    <Input
                        label="Confirm password"
                        name="password2"
                        type="password"
                        placeholder="Confirm your password"
                        required={true}
                        minLength={'8'}
                    />
                    {(error_msg || mutation.isError) && (
                        <Error
                            text={
                                error_msg || mutation.error?.response?.data?.msg
                            }
                        />
                    )}
                    <Button
                        text="Register"
                        width="100%"
                        height="50px"
                        loading={mutation.isPending}
                    />
                    <div className="down">
                        <p>Already have an account?</p>
                        <Link to="/signin" className="go-to">
                            Log in here
                        </Link>
                    </div>
                </FORM>
            </Form>
        </PAGE>
    );
};

export default SignUp;
