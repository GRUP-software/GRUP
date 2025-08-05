import styled from 'styled-components';
import { LuShare } from 'react-icons/lu';

const DIV = styled.div`
    -webkit-backdrop-filter: ${(props) =>
        props.$blur ? `saturate(200%) blur(5px)` : 'none'};
    backdrop-filter: ${(props) =>
        props.$blur ? `saturate(200%) blur(5px)` : 'none'};
    background-color: ${(props) =>
        props.$blur ? `rgba(15, 15, 15, 0.4)` : 'white'};
    border: ${(props) =>
        props.$blur ? `none` : '1px solid var(--app-grey-color);'};
    border-radius: 50%;
    cursor: pointer;
    width: 35px;
    height: 35px;
    display: flex;
    justify-content: center;
    align-items: center;

    &:hover {
        filter: brightness(80%);
    }
    .sha {
        font-size: var(--font-large);
        color: ${(props) => (props.$blur ? `white` : 'black')};
    }
`;

const Share = ({ title, text, blur, url }) => {
    const share_link = async () => {
        if (navigator.share) {
            try {
                navigator.share({
                    title: title,
                    text: text,
                    url: url,
                });
            } catch {
                return null;
            }
        } else {
            return null;
        }
    };

    return (
        <DIV $blur={blur} onClick={share_link}>
            <LuShare className="sha" />
        </DIV>
    );
};

export default Share;
