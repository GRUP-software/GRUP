import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import styled from 'styled-components';

// Components
import Form from '../../components/form/Form';
import Input from '../../components/form/Input';
import Button from '../../components/form/Button';
import Error from '../../components/form/Error';

// Store
// import { login } from '../../store/authSlice';
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

const SignIn = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const mutation = useMutation({
        mutationFn: async (formData) => {
            const response = await axios.post(
                `${import.meta.env.VITE_APP_SERVER_URL}auth/login`,
                {
                    email: formData.email.trim(),
                    password: formData.password.trim(),
                    platform: 'web',
                }
                // {
                //     withCredentials: true,
                // }
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
                dispatch(login(response.data));
                navigate('/');
            }
        },
        // onError: (error) => {
        //     console.error('Login failed:', error);
        // },
    });
    const submit = (e) => {
        e.preventDefault();
        const email = e.target.email.value;
        const password = e.target.password.value;

        mutation.mutate({ email, password });
    };

    return (
        <PAGE>
            <Helmet>
                <title>Sign In</title>
                <link
                    rel="canonical"
                    href={`${import.meta.env.VITE_APP_URL}login/`}
                />
            </Helmet>
            <Form title={'Sign in to your account'}>
                <FORM onSubmit={submit}>
                    <Input
                        label="Email"
                        name="email"
                        type="email"
                        placeholder="Type your email"
                        required={true}
                    />
                    <Input
                        label="Password"
                        name="password"
                        type="password"
                        placeholder="Type your password"
                        required={true}
                        // custom_payload={{
                        //     page: 'login',
                        // }}
                    />
                    {mutation.isError && (
                        <Error text={mutation.error?.response?.data?.message} />
                    )}
                    <Button
                        text="Sign in"
                        width="100%"
                        height="50px"
                        loading={mutation.isPending}
                    />

                    <div className="down">
                        <p>Don&apos;t have an account?</p>
                        <Link to="/register" className="go-to">
                            Sign up
                        </Link>
                    </div>
                </FORM>
            </Form>
        </PAGE>
    );
};

export default SignIn;
