import styled from 'styled-components';
import PhoneInput from 'react-phone-number-input';

const DIV = styled.div`
    display: grid;
    gap: 10px;

    /* Customize the input box */
    .PhoneInputInput {
        width: 100%;
        border-radius: 10px;
        border: 1px solid #e6e6e6;
        background-color: #f8f8f8;
        padding: 15px 20px 15px 20px;
        font-size: var(--font-small);
        transition: 0.2s;
    }

    .PhoneInputInput:focus {
        outline: none !important;
        border: 1px solid var(--app-color);
    }

    /* Customize the dropdown arrow icon */
    .PhoneInputCountryIcon {
        width: 30px;
        height: 20px;
        /* Add your custom icon styling here */
    }
    .top {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
    }
    .label {
        font-size: var(--font-medium);
    }
`;

const PhoneNumberInput = ({
    placeholder = 'Enter phone number',
    value,
    onChange,
    label,
}) => {
    return (
        <DIV>
            <div className="top">
                {label && <label className="label">{label}</label>}
            </div>
            <PhoneInput
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                defaultCountry="NG"
                maxLength={18}
                required
            />
        </DIV>
    );
};

export default PhoneNumberInput;
