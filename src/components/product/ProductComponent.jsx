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
    const discount = Math.round(
        ((product.basePrice - product.price) / product.basePrice) * 100
    );
    return (
        <ProductCard
            key={index}
            // style={{ position: 'relative' }}
            to={`/product/${product.slug}`}
        >
            <DiscountBadge>SAVE {discount}%</DiscountBadge>
            <ProductIcon>
                <LazyLoadImage src={product.images[0]} className="image" />
            </ProductIcon>

            <ProductName>{product.title}</ProductName>

            <ProductPrice>{formatNumberTONaira(product.price)}</ProductPrice>
            <ProductBasePrice>
                {formatNumberTONaira(product.basePrice)}
            </ProductBasePrice>
        </ProductCard>
    );
};

export default ProductComponent;
