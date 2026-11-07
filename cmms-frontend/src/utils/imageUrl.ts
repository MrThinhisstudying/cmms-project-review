export const getBackendImageUrl = (path: string | undefined): string => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path;

    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const apiBase = (process.env.REACT_APP_BASE_URL || '').replace(/\/+$/, '');

    // Nếu không cấu hình apiBase (chạy dev qua proxy)
    if (!apiBase) {
        return cleanPath;
    }

    // Nếu path bắt đầu bằng /uploads, trên production Nginx chỉ route /api sang backend
    // Nên ta dẫn qua /api/uploads/... để đảm bảo Nginx chuyển tiếp vào NestJS backend
    if (cleanPath.startsWith('/uploads/')) {
        if (apiBase.endsWith('/api')) {
            return `${apiBase}${cleanPath}`;
        }
        return `${apiBase}/api${cleanPath}`;
    }

    // Nếu path đã có /api ở đầu
    if (cleanPath.startsWith('/api/')) {
        const hostWithoutApi = apiBase.replace(/\/api$/, '');
        return `${hostWithoutApi}${cleanPath}`;
    }

    return `${apiBase}${cleanPath}`;
};
