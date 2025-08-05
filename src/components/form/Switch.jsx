import styled from 'styled-components';

const DIV = styled.div`
    display: flex;
    gap: 15px;

    .switch {
        width: 40px;
        height: 25px;
        border-radius: 50px;
        display: flex;
        align-items: center;
        background-color: var(--app-grey-color);
        cursor: pointer;
        transition: 0.1s;
    }
    .circle {
        background-color: white;
        width: 15px;
        height: 15px;
        border-radius: 50px;
        margin-left: 5px;
        transition: 0.1s;
    }
    .active2 {
        transform: translateX(15px);
    }
`;

const Switch = ({ value, setValue, click, color }) => {
    const handleswitch = () => {
        setValue(!value);
    };
    return (
        <DIV>
            <div
                className="switch"
                onClick={click !== undefined ? click : handleswitch}
                style={{
                    backgroundColor: value
                        ? color !== undefined
                            ? color
                            : 'var(--app-color)'
                        : ' var(--app-dark-grey-color)',
                }}
            >
                <div
                    className={value === false ? 'circle' : 'circle active2'}
                />
            </div>
        </DIV>
    );
};

export default Switch;
