import styled from 'styled-components';
import ProductComponent from '../../../components/product/ProductComponent';
import { useDispatch, useSelector } from 'react-redux';
import { useEffect, useCallback, useRef } from 'react';
import { headers } from '../../../hooks//axios';
import {
    setLoading,
    setNewProducts,
    setInitialLoad,
} from '../../../store/homeSlice';
import axios from 'axios';
import HomeLoader from '../../../components/loaders/HomeLoader';

const CardsSection = styled.div`
    max-width: 1500px;
    margin: auto;
    margin-top: 50px;
`;

const PRODUCTS = styled.div`
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
    width: 100%;

    @media (max-width: 1130px) {
        grid-template-columns: repeat(3, 1fr);
    }

    @media (max-width: 950px) {
        grid-template-columns: repeat(2, 1fr);
    }
`;

const Products = () => {
    const dispatch = useDispatch();
    const initial_load = useSelector((state) => state.home.initial_load);
    const loading = useSelector((state) => state.home.loading);
    const products = useSelector((state) => state.home.products);
    const loadFirstControllerRef = useRef(null);
    const networkreloadRef = useRef(null);

    const load_first = useCallback(async () => {
        loadFirstControllerRef.current = new AbortController();
        dispatch(setLoading(true));

        try {
            const response = await axios.get(
                `${import.meta.env.VITE_APP_SERVER_URL}products/`,
                {
                    headers: headers,
                    signal: loadFirstControllerRef.current.signal,
                }
            );
            if (response.status === 200) {
                dispatch(setNewProducts(response.data.data));
                dispatch(setLoading(false));
                dispatch(setInitialLoad(true));
            }
        } catch (error) {
            if (error.code === 'ERR_CANCELED') {
                return null;
            } else if (error.code === 'ERR_NETWORK') {
                networkreloadRef.current = setTimeout(() => {
                    load_first();
                }, [2000]);
            }
        }
    }, [dispatch]);

    useEffect(() => {
        if (initial_load === false) {
            load_first();
        }
        // if (scrollRef.current != null) {
        //     dispatch(setLastClickedIndex(null));
        // }

        return () => {
            if (loadFirstControllerRef.current) {
                loadFirstControllerRef.current.abort();
            }

            if (networkreloadRef.current) {
                clearTimeout(networkreloadRef.current);
            }
        };
    }, [initial_load, load_first, dispatch]);

    return (
        <CardsSection>
            {loading ? (
                <HomeLoader />
            ) : (
                <PRODUCTS>
                    {products.length === 0 ? (
                        <p>No products yet</p>
                    ) : (
                        products.map((product, index) => (
                            <ProductComponent
                                key={index}
                                product={product}
                                index={index}
                            />
                        ))
                    )}
                </PRODUCTS>
            )}
        </CardsSection>
    );
};

export default Products;
