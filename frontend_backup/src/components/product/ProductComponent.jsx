import styled from 'styled-components';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import { formatNumberTONaira } from '../../utils/format-number';
import { Link } from 'react-router-dom';

const ProductCard = styled(Link)`
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border-radius: 10px;
    padding: 20px;
    text-align: center;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
    text-decoration: none;

    &:hover {
        transform: translateY(-8px);
        box-shadow: 0 15px 30px rgba(0, 0, 0, 0.15);
    }

    @media (max-width: 768px) {
        padding: 15px;
    }
`;

const ProductIcon = styled.div`
    margin-bottom: 10px;
    aspect-ratio: 1/1;

    .image {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
`;

const ProductName = styled.h3`
    font-size: var(--font-small_3);
    font-weight: 600;
    color: #5b5b5b;
    margin-bottom: 8px;
    text-align: left;

    @media (max-width: 768px) {
        font-size: var(--font-small_3);
    }
`;

const ProductBasePrice = styled.div`
    font-size: 16px;
    color: #a18282;
    font-weight: bold;
    text-align: left;
    text-decoration: line-through;
`;

const ProductPrice = styled.div`
    font-size: 20px;
    color: red;
    font-weight: bold;
    text-align: left;
`;

const DiscountBadge = styled.div`
    background: #426d68;
    color: white;
    font-size: 15px;
    font-weight: 700;
    padding: 3px 6px;
    border-radius: 50px;
    position: absolute;
    top: -8px;
    right: -8px;
    border: 1px solid #426d68;

    @media (max-width: 768px) {
        font-size: 0.6rem;
    }
`;

const ProductComponent = ({ index, product }) => {
    // Extract product safely with fallback values
    const basePrice = product?.basePrice || 0;
    const price = product?.price || 0;
    const title = product?.title || "Untitled Product";
    const imageUrl = product?.images?.[0] || "/placeholder.png";

    // Safe discount calculation
    const discount =
        basePrice > 0
            ? Math.round(((basePrice - price) / basePrice) * 100)
            : 0;

    return (
        <ProductCard
            key={index}
            delay={index * 0.1}
            style={{ position: 'relative' }}
            to="/product/url"
        >
            {discount > 0 && <DiscountBadge>SAVE {discount}%</DiscountBadge>}

            <ProductIcon>
                <LazyLoadImage src={imageUrl} className="image" alt={title} />
            </ProductIcon>

            <ProductName>{title}</ProductName>
            <ProductBasePrice>{formatNumberTONaira(basePrice)}</ProductBasePrice>
            <ProductPrice>{formatNumberTONaira(price)}</ProductPrice>
        </ProductCard>
    );
};

export default ProductComponent;
