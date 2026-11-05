export const optimizeImageBeforeUpload = (
    file: File,
    maxDimension: number = 400,
    quality: number = 0.8
): Promise<File> => {
    return new Promise((resolve) => {
        if (!file.type.match(/image.*/)) {
            return resolve(file);
        }

        const objectUrl = URL.createObjectURL(file);
        const img = new Image();
        img.src = objectUrl;
        img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            let width = img.width;
            let height = img.height;

            // Giới hạn cả chiều rộng và chiều cao theo maxDimension
            if (width > maxDimension || height > maxDimension) {
                if (width >= height) {
                    height = Math.round(height * (maxDimension / width));
                    width = maxDimension;
                } else {
                    width = Math.round(width * (maxDimension / height));
                    height = maxDimension;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) return resolve(file);

            ctx.drawImage(img, 0, 0, width, height);

            // Ưu tiên nén sang WebP ngay trên trình duyệt để giảm tối đa dung lượng
            canvas.toBlob(
                (blob) => {
                    if (blob && blob.size < file.size) {
                        const ext = blob.type === 'image/webp' ? '.webp' : '.jpg';
                        const optimizedFile = new File(
                            [blob],
                            file.name.replace(/\.[^/.]+$/, ext),
                            {
                                type: blob.type || 'image/webp',
                                lastModified: Date.now(),
                            }
                        );
                        resolve(optimizedFile);
                    } else {
                        resolve(file);
                    }
                },
                'image/webp',
                quality
            );
        };
        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(file);
        };
    });
};
