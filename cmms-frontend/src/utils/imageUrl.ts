export const getBackendImageUrl = (path: string | undefined): string => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const baseUrl = process.env.REACT_APP_BASE_URL?.replace('/api', '') || '';
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${cleanPath}`;
};
