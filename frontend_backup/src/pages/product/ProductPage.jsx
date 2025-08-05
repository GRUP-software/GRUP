import styled from 'styled-components';
import ProductHeader from './components/ProductHeader';
import ProductImages from './components/ProductImages';
import ProductInfo from './components/ProductInfo';
import ProductDescription from './components/ProductDescription';

const Container = styled.div`
    max-width: 1200px;
    margin: 0 auto;
    min-height: 100vh;
    width: 98%;
    margin-top: 30px;
    background: #f7fafc;
    padding: 10px;
    border-radius: 10px;
`;

const ProductGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 400px;
    gap: 30px;
    margin-bottom: 30px;
    width: 100%;

    @media (max-width: 1000px) {
        grid-template-columns: 1fr;
        gap: 20px;
    }
`;

const LeftColumn = styled.div``;

const RightColumn = styled.div`
    display: block;

    @media (max-width: 1000px) {
        display: none;
    }
`;
const Inner = styled.div`
    display: none;
    @media (max-width: 1000px) {
        display: block;
    }
`;

const ProductPage = () => {
    const productData = {
        title: 'Organic Fresh Apples',
        subtitle: 'Premium quality apples directly from local farms',
        rating: 4,
        reviewCount: 127,
        images: [
            'https://ng.jumia.is/unsafe/fit-in/300x300/filters:fill(white)/product/77/3810993/1.jpg?4140',
            'https://ng.jumia.is/unsafe/fit-in/300x300/filters:fill(white)/product/78/716178/1.jpg?7296',
            'https://ng.jumia.is/unsafe/fit-in/300x300/filters:fill(white)/product/41/226178/1.jpg?5581',
            'https://ng.jumia.is/unsafe/fit-in/300x300/filters:fill(white)/product/92/9700993/1.jpg?4064',
        ],
        currentPrice: 12000,
        originalPrice: 18,
        groupProgress: 45,
        groupTarget: 100,
        currentMembers: 45,
        description:
            'These premium organic apples are grown using sustainable farming practices. Each apple is hand-picked at peak ripeness to ensure maximum flavor and nutritional value. Perfect for snacking, baking, or adding to your favorite recipes.',
        specifications: {
            Origin: 'Local Organic Farms',
            Weight: '1kg per pack',
            Variety: 'Gala & Granny Smith',
            'Shelf Life': '2-3 weeks refrigerated',
            Certification: 'USDA Organic',
        },
    };

    return (
        <Container>
            <ProductGrid>
                <LeftColumn>
                    <ProductImages images={productData.images} />
                    <ProductHeader
                        title={productData.title}
                        subtitle={productData.subtitle}
                        rating={productData.rating}
                        reviewCount={productData.reviewCount}
                    />
                    <Inner>
                        <ProductInfo
                            currentPrice={productData.currentPrice}
                            originalPrice={productData.originalPrice}
                            groupProgress={productData.groupProgress}
                            groupTarget={productData.groupTarget}
                            currentMembers={productData.currentMembers}
                        />
                    </Inner>
                    <ProductDescription
                        description={productData.description}
                        specifications={productData.specifications}
                    />
                </LeftColumn>

                <RightColumn>
                    <ProductInfo
                        currentPrice={productData.currentPrice}
                        originalPrice={productData.originalPrice}
                        groupProgress={productData.groupProgress}
                        groupTarget={productData.groupTarget}
                        currentMembers={productData.currentMembers}
                    />
                </RightColumn>
            </ProductGrid>
        </Container>
    );
};

export default ProductPage;
