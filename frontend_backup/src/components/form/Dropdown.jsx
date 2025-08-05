import styled from 'styled-components';

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
        font-size: var(--font-small);
    }
`;

const SELECT = styled.select`
    width: 100%;
    border-radius: 10px;
    border: 1px solid #e6e6e6;
    background-color: #f8f8f8;
    padding: 15px 20px;
    font-size: var(--font-small);
    transition: 0.2s;
    width: ${(props) => (props.$width ? props.$width : '100%')};
    -webkit-appearance: none; /* Removes iOS default styling */
    -moz-appearance: none;
    appearance: none;
    color: black;
    background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="black" d="M7 10l5 5 5-5z"/></svg>');
    background-repeat: no-repeat;
    background-position: right 10px center;
    background-size: 16px;
    cursor: pointer;

    &:focus {
        outline: none !important;
        border: 1px solid var(--app-color);
    }
`;

const Dropdown = ({
    label = null,
    name,
    required = false,
    value,
    defaultValue,
    onChange,
    onBlur,
    onFocus,
    disabled = false,
    options = [], // Array of { value, label } objects
    id,
    width,
}) => {
    return (
        <DIV>
            <div className="top">
                {label && <label className="label">{label}</label>}
            </div>
            <SELECT
                $width={width}
                name={name}
                id={id}
                required={required}
                value={value}
                defaultValue={defaultValue}
                onChange={onChange}
                onBlur={onBlur}
                onFocus={onFocus}
                disabled={disabled}
            >
                <option value="" disabled className="option">
                    Select an option
                </option>
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </SELECT>
        </DIV>
    );
};

export default Dropdown;
