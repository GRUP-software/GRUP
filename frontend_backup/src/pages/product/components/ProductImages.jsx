import styled from 'styled-components';
import { useState } from 'react';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import { FaShareAlt } from 'react-icons/fa';
import 'react-lazy-load-image-component/src/effects/blur.css';

const ImageSection = styled.div`
    display: grid;
    grid-template-columns: 100px 1fr;
    gap: 20px;
    margin-bottom: 30px;

    @media (max-width: 768px) {
        grid-template-columns: 1fr;
        gap: 15px;
    }
`;

const ThumbnailList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;

    @media (max-width: 768px) {
        flex-direction: row;
        order: 2;
        justify-content: center;
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
    aspect-ratio: 1.3;

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
    background: red;
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
