import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import styled from 'styled-components';
import { headers } from '../../hooks/axios';
import { Dots } from 'react-activity';
import { useState, useEffect } from 'react';

const DIV = styled.div`
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 10px;

    .question {
        font-size: var(--font-small_2);
    }
    .send {
        background-color: var(--app-color);
        font-size: var(--font-small_2);
        padding: 5px;
        color: white;
        border-radius: 5px;
        cursor: pointer;
        width: 90px;
        height: 25px;
        display: flex;
        justify-content: center;
        align-items: center;
    }
    .disable {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const ResendCode = ({ token, get_new_token }) => {
    const [timer, setTimer] = useState(0);

    useEffect(() => {
        let interval;
        if (timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [timer]);

    const mutation = useMutation({
        mutationFn: async () => {
            const response = await axios.get(
                `${import.meta.env.VITE_APP_SERVER_URL}accounts/resend-otp/`,
                {
                    headers: {
                        ...headers,
                        Authorization: token,
                    },
                }
            );
            return response;
        },
        retry: (failureCount, error) => {
            if (axios.isAxiosError(error) && error.response?.status === 400) {
                return false;
            }
            return failureCount < 1000;
        },
        retryDelay: 1000,
        onSuccess: (response) => {
            if (response.status === 200) {
                get_new_token(response.data.token);
                setTimer(60); // start 1-minute timer
            }
        },
    });

    const submit = () => {
        if (!mutation.isPending && timer === 0) {
            mutation.mutate();
        }
    };

    return (
        <DIV>
            <p className="question">Did not get a code?</p>
            <div
                className={
                    mutation.isPending || timer > 0 ? 'send disable' : 'send'
                }
                onClick={mutation.isPending || timer > 0 ? null : submit}
            >
                {mutation.isPending ? (
                    <Dots />
                ) : timer > 0 ? (
                    <>Retry in {timer}s</>
                ) : (
                    <>Resend code</>
                )}
            </div>
        </DIV>
    );
};

export default ResendCode;
