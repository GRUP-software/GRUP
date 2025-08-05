import styled from 'styled-components';
import ProductHeader from './components/ProductHeader';
import ProductImages from './components/ProductImages';
import ProductInfo from './components/ProductInfo';
import ProductDescription from './components/ProductDescription';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import HomeLoader from '../../components/loaders/HomeLoader';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { headers } from '../../hooks/axios';
import { Helmet } from 'react-helmet';

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

const Notfound = styled.div`
    display: flex;
    justify-content: center;
    height: 100%;
    margin: auto;
    font-size: 25px;
    color: var(--app-color2);
`;

const ProductGrid = styled.div`
    display: flex;
    justify-content: space-between;
    width: 100%;
    gap: 10px;

    @media (max-width: 1000px) {
        flex-direction: column;
    }
`;

const LeftColumn = styled.div`
    width: 70%;

    @media (max-width: 1000px) {
        width: 100%;
    }
`;

const RightColumn = styled.div`
    display: block;

    width: 30%;

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
    const params = useParams();
    const axiosPrivate = useAxiosPrivate();
    const accessToken = useSelector((state) => state.auth.accessToken);

    const { isLoading, data } = useQuery({
        queryKey: ['productData', params.url],
        queryFn: async () => {
            try {
                const response = await axiosPrivate.get(
                    `${import.meta.env.VITE_APP_SERVER_URL}products/slug/${params.url}`,
                    {
                        headers: {
                            ...headers,
                            Authorization: accessToken,
                        },
                    }
                );
                return response.data.data;
            } catch (error) {
                if (
                    axios.isAxiosError(error) &&
                    error.response?.status === 404
                ) {
                    return error.response.data; // Return data from 400 response
                }
                throw error; // Throw other errors to trigger retries
            }
        },
        retry: (failureCount, error) => {
            if (axios.isAxiosError(error) && error.response?.status === 400) {
                return false; // Don't retry on 400 errors
            }
            return failureCount < 1000; // Retry up to 1000 times for other errors
        },
        retryDelay: 1000, // Always wait 1 second between retries
    });

    const [productData, setProductData] = useState(data);
    useEffect(() => {
        setProductData(data);
    }, [data]);

    // const productData = {
    //     title: 'Organic Fresh Apples',
    //     subtitle: 'Premium quality apples directly from local farms',
    //     rating: 4,
    //     reviewCount: 127,
    //     images: [
    //         'https://ng.jumia.is/unsafe/fit-in/300x300/filters:fill(white)/product/77/3810993/1.jpg?4140',
    //         'https://ng.jumia.is/unsafe/fit-in/300x300/filters:fill(white)/product/78/716178/1.jpg?7296',
    //         'https://ng.jumia.is/unsafe/fit-in/300x300/filters:fill(white)/product/41/226178/1.jpg?5581',
    //         'https://ng.jumia.is/unsafe/fit-in/300x300/filters:fill(white)/product/92/9700993/1.jpg?4064',
    //     ],
    //     currentPrice: 12000,
    //     originalPrice: 18,
    //     groupProgress: 45,
    //     groupTarget: 100,
    //     currentMembers: 45,
    //     description:
    //         'These premium organic apples are grown using sustainable farming practices. Each apple is hand-picked at peak ripeness to ensure maximum flavor and nutritional value. Perfect for snacking, baking, or adding to your favorite recipes.',
    //     specifications: {
    //         Origin: 'Local Organic Farms',
    //         Weight: '1kg per pack',
    //         Variety: 'Gala & Granny Smith',
    //         'Shelf Life': '2-3 weeks refrigerated',
    //         Certification: 'USDA Organic',
    //     },
    // };

    return (
        <Container>
            {isLoading && <HomeLoader />}

            {productData && productData.message && (
                <Notfound>{productData.message}</Notfound>
            )}
            {!isLoading && productData && !productData.message && (
                <ProductGrid>
                    <Helmet>
                        <title>Grup - {productData.title}</title>
                        <meta
                            name="description"
                            content="Buy Together, Save Together"
                        />
                    </Helmet>
                    <LeftColumn>
                        <ProductImages images={productData.images} />
                        <ProductHeader
                            title={productData.title}
                            subtitle={productData.title}
                            rating={productData.rating}
                            reviewCount={productData.reviewCount}
                        />
                        <Inner>
                            <ProductInfo
                                currentPrice={productData.price}
                                originalPrice={productData.basePrice}
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
                            currentPrice={productData.price}
                            originalPrice={productData.basePrice}
                            groupProgress={productData.groupProgress}
                            groupTarget={productData.groupTarget}
                            currentMembers={productData.currentMembers}
                        />
                    </RightColumn>
                </ProductGrid>
            )}
        </Container>
    );
};

export default ProductPage;
