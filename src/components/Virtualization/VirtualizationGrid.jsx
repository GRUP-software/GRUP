import { VirtuosoGrid } from 'react-virtuoso';
import styled from 'styled-components';
import ListingComponent from '../listing/ListingComponent';
import ListingLoader from '../loaders/ListingLoader';
import { useEffect } from 'react';

const MainContent = styled.div`
    min-height: 1000px;
    height: fit-content;
    /* border: 10px solid red; */
    width: 100%;

    .grid-item {
        height: fit-content;
    }
`;

const Virtualization = ({
    data,
    loadersToShow,
    load_more,
    Component,
    component_click_action,
    scrollRef,
    type,
    rangeChanged,
}) => {
    useEffect(() => {
        // Clear after the first render when VirtuosoGrid has mounted
        if (scrollRef && scrollRef.current !== null) {
            scrollRef.current = null;
        }
    }, [scrollRef]); // run only once on mount
    return (
        <MainContent>
            <VirtuosoGrid
                useWindowScroll
                // initialTopMostItemIndex={
                //     scrollRef ? (scrollRef.current ?? 0) : 0
                // }
                initialTopMostItemIndex={scrollRef?.current ?? 0}
                data={[...data, ...Array(loadersToShow).fill(null)]}
                listClassName="grid-container"
                itemClassName="grid-item"
                itemContent={(index, item) =>
                    item ? (
                        <div onClick={() => component_click_action(index)}>
                            {Component ? (
                                <Component
                                    key={item.url}
                                    data={item}
                                    type={type}
                                />
                            ) : (
                                <ListingComponent data={item} />
                            )}
                        </div>
                    ) : (
                        <ListingLoader />
                    )
                }
                endReached={() => {
                    load_more(true);
                    // Call fetchMore(), show spinner, etc.
                }}
                rangeChanged={rangeChanged}
            />
        </MainContent>
    );
};

export default Virtualization;
