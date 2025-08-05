import styled from 'styled-components';
import { useState } from 'react';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import { FaShareAlt } from 'react-icons/fa';

const ImageSection = styled.div`
    display: flex;
    gap: 20px;
    margin-bottom: 30px;

    width: 100%;
    aspect-ratio: 1.4;

    @media (max-width: 768px) {
        flex-direction: column;
    }
`;

const ThumbnailList = styled.div`
    overflow-y: auto;
    padding: 10px;

    .list {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    @media (max-width: 768px) {
        order: 2;
        width: 100%;

        .list {
            flex-direction: row;
            flex-wrap: wrap;
            justify-content: center;
        }
    }
`;

const Thumbnail = styled.div`
    width: 50px;
    height: 50px;
    border-radius: 8px;
    overflow: hidden;
    cursor: pointer;
    border: 2px solid ${(props) => (props.$active ? '#4299e1' : '#e2e8f0')};
    transition: border-color 0.2s;

    &:hover {
        border-color: #4299e1;
    }

    @media (max-width: 768px) {
        width: 40px;
        height: 40px;
    }
`;

const StyledLazyThumbnail = styled(LazyLoadImage)`
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
`;

const MainImageContainer = styled.div`
    position: relative;
    background: white;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    aspect-ratio: 1.4;

    height: 100%;

    .share-label {
        opacity: 1;
        transform: translateY(0);
    }

    @media (max-width: 768px) {
        aspect-ratio: 1;
    }
`;

const MainImage = styled(LazyLoadImage)`
    width: 100%;
    height: 100%;
    object-fit: contain;
`;

const ShareLabel = styled.div`
    position: absolute;
    top: 12px;
    right: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--app-color2);
    color: white;
    padding: 12px;
    border-radius: 9999px;
    font-size: 0.875rem;
    font-weight: 600;
    opacity: 0;
    transform: translateY(-10px);
    z-index: 2;
    cursor: pointer;

    @media (max-width: 768px) {
        font-size: 0.75rem;
    }
`;

const ProductImages = ({ images }) => {
    const [activeImage, setActiveImage] = useState(0);

    return (
        <ImageSection>
            <ThumbnailList>
                <div className="list">
                    {images.map((image, index) => (
                        <Thumbnail
                            key={index}
                            $active={activeImage === index}
                            onClick={() => setActiveImage(index)}
                        >
                            <StyledLazyThumbnail
                                src={image}
                                alt={`Thumbnail ${index + 1}`}
                            />
                        </Thumbnail>
                    ))}
                </div>
            </ThumbnailList>

            <MainImageContainer>
                <ShareLabel className="share-label">
                    <FaShareAlt /> Share with family & friends
                </ShareLabel>
                <MainImage
                    src={images[activeImage]}
                    alt={`Main image ${activeImage + 1}`}
                />
            </MainImageContainer>
        </ImageSection>
    );
};

export default ProductImages;
