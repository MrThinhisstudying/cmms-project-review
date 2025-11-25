import {DEFAULT_PAGE, DEFAULT_SIZE} from 'src/constants/paging';

export const formatPaging = (page: string | number = DEFAULT_PAGE, size: string | number = DEFAULT_SIZE) => {
    const _page = parseInt(page as string);
    const _size = parseInt(size as string);

    let query = {
        take: _size,
        skip: _size * (_page - 1),
    };

    return {
        pageable: {
            page: _page,
            size: _size,
        },
        query,
    };
};
