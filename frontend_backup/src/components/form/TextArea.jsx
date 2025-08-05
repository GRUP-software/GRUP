import styled from 'styled-components';
import { useRef } from 'react';

const DIV = styled.div`
    display: grid;
    gap: 10px;

    .top {
        display: flex;
    }
    .label {
        font-size: var(--font-medium);
    }
`;

const TEXTAREA = styled.textarea`
    width: 100%;
    border-radius: 10px;
    border: 1px solid #e6e6e6;
    background-color: #f8f8f8;
    padding: 15px 20px 15px 20px;
    font-size: var(--font-small);
    transition: 0.2s;
    resize: none;

    &:focus {
        outline: none !important;
        border: 1px solid var(--app-color);
    }
    &::-webkit-scrollbar {
        width: 12px;
        cursor: pointer;
    }

    &::-webkit-scrollbar-track {
        background-color: white;
    }

    &::-webkit-scrollbar-thumb {
        background-color: #888888;
        border: 2px solid white;
    }

    &::-webkit-scrollbar-thumb:hover {
        background-color: #5e5e5e;
    }
`;

const TextArea = ({
    label = null,
    name,
    placeholder,
    autoComplete = 'on',
    required = false,
    maxLength = null,
    value,
    defaultValue,
    rows = 5,
}) => {
    const inputRef = useRef(null);
    const handleChange = () => {
        // const percentage = (e.target.value.length / 1000) * 100;
        // setComment_percentage(percentage.toFixed(2)); // Limit the decimal places to two
        inputRef.current.style.height = 'auto';
        if (inputRef.current.scrollHeight < 100) {
            inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
        } else {
            inputRef.current.style.height = '150px';
        }
    };
    return (
        <DIV>
            <div className="top">
                {label && <label className="label">{label}</label>}
            </div>
            <TEXTAREA
                name={name}
                ref={inputRef}
                placeholder={placeholder}
                autoComplete={autoComplete}
                required={required}
                maxLength={maxLength}
                value={value}
                defaultValue={defaultValue}
                onChange={handleChange}
                rows={rows}
            />
        </DIV>
    );
};

export default TextArea;
