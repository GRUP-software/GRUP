import styled from 'styled-components';
import { FaUserLarge } from 'react-icons/fa6';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import { useState } from 'react';
import { MdOutlineBrokenImage } from 'react-icons/md';
// import { THEMECONTEXT } from '../Contexts/ThemeContext';

const DIV = styled.div`
    border-radius: ${(props) =>
        props.$radius === undefined ? '100px' : `${props.$radius}px`};
    min-width: ${(props) =>
        props.$width === undefined ? '50px' : `${props.$width}px`};
    height: ${(props) =>
        props.$width === undefined ? '50px' : `${props.$width}px`};
    /* background-color: ${(props) =>
        props.$darkmode ? `var(--app-color3_5)` : `#f6f6f6`}; */
    background-color: var(--app-grey-color);
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;
    aspect-ratio: 1/1;
    transition: 0.2s;
    position: relative;

    cursor: ${(props) => (props.$cursor === undefined ? 'default' : 'pointer')};

    &:hover {
        filter: ${(props) =>
            props.$hover === undefined ? 'none' : 'brightness(80%)'};
    }
    .laz {
        width: 100%;
        height: 100%;
        border-radius: ${(props) =>
            props.$radius === undefined ? '50px' : `${props.$radius}px`};
    }
    .pic {
        width: 100%;
        height: 100%;
        border-radius: ${(props) =>
            props.$radius === undefined ? '50px' : `${props.$radius}px`};
        aspect-ratio: 1/1;
        object-fit: cover;
    }
    .piccccc {
        width: 70%;
        height: 70%;
        color: var(--app-dark-grey-color);
    }
    .image-err {
        width: 20px;
        height: 20px;
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
        margin: auto;
        color: var(--app-dark-grey-color);
    }
`;

const ImageCircle = ({ image, width, lazy, effect, hover, cursor, radius }) => {
    const [error, setError] = useState(false);
    // const { darkmode } = useContext(THEMECONTEXT);

    const err = () => {
        setError(true);
    };
    return (
        <DIV
            $width={width}
            $hover={hover}
            $cursor={cursor}
            $radius={radius}
            // $darkmode={darkmode}
        >
            {image === null ? (
                <FaUserLarge className="pic piccccc" />
            ) : error ? (
                <MdOutlineBrokenImage className="image-err" />
            ) : lazy === 'true' ? (
                <div className="laz">
                    <LazyLoadImage
                        rel="preload"
                        src={image}
                        className="pic"
                        alt="img"
                        effect={effect ? 'blur' : null}
                        onError={err}
                        draggable="false"
                    />
                </div>
            ) : (
                <img
                    rel="preload"
                    src={image}
                    className="pic"
                    alt="img"
                    onError={err}
                    loading="lazy"
                    draggable="false"
                />
            )}
        </DIV>
    );
};

export default ImageCircle;
