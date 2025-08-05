import styled from 'styled-components';
import { Link } from 'react-router-dom';

const DIV = styled.div`
    display: grid;
    gap: 10px;

    .top {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
    }
    .label {
        font-size: var(--font-medium);
    }
    .forgot-password {
        color: var(--app-color);
        cursor: pointer;
        text-decoration: none;
        font-size: var(--font-small_3);
    }
`;

const INPUT = styled.input`
    width: 100%;
    border-radius: 10px;
    border: 1px solid #e6e6e6;
    background-color: #f8f8f8;
    padding: 15px 20px 15px 20px;
    font-size: var(--font-small);
    transition: 0.2s;

    &:focus {
        outline: none !important;
        border: 1px solid var(--app-color);
    }

    /* &:valid {
        background-color: #a3b7c7;
    } */
`;

const Input = ({
    label = null,
    type = 'text',
    name,
    placeholder,
    autoComplete = 'on',
    required = false,
    maxLength,
    value,
    defaultValue,
    onChange,
    onBlur,
    onFocus,
    disabled = false,
    readOnly = false,
    id,
    custom_payload,
    minLength,
    min,
}) => {
    return (
        <DIV>
            <div className="top">
                {label && <label className="label">{label}</label>}
                {custom_payload?.page === 'login' && (
                    <Link to="/forgot-password" className="forgot-password">
                        Forgot password
                    </Link>
                )}
            </div>
            <INPUT
                type={type}
                name={name}
                id={id}
                placeholder={placeholder}
                autoComplete={autoComplete}
                required={required}
                maxLength={maxLength}
                value={value}
                defaultValue={defaultValue}
                onChange={onChange}
                onBlur={onBlur}
                onFocus={onFocus}
                disabled={disabled}
                readOnly={readOnly}
                minLength={minLength}
                min={min}
            />
        </DIV>
    );
};

export default Input;
