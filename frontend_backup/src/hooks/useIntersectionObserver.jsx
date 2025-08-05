import { useRef, useCallback } from 'react';

const useIntersectionObserver = ({
    loading = false,
    more_loading = false,
    function_action = () => {},
    custom_options = {},
}) => {
    const observerRef = useRef(null);

    return useCallback(
        (node) => {
            if (loading || more_loading) {
                return false;
            }
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
            observerRef.current = new IntersectionObserver((entries) => {
                function_action(entries[0].isIntersecting);
            }, custom_options);
            if (node) {
                observerRef.current.observe(node);
            }
        },
        [loading, more_loading, function_action, custom_options]
    );
};

export default useIntersectionObserver;
