import styled from 'styled-components';

const DIV = styled.div`
    background-color: white;
    color: red;
    padding: 10px;
    display: flex;
    justify-content: center;
    outline: 1px solid red;
    font-size: var(--font-small);
    border-radius: 5px;
`;

const Error = ({ text }) => {
    return (
        <DIV>
            <p>{text}</p>
        </DIV>
    );
};

export default Error;
