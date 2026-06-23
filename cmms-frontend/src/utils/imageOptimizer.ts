export const optimizeImageBeforeUpload = (file: File, maxWidth: number = 800, quality: number = 0.8): Promise<File> => {
    return new Promise((resolve, reject) => {
        if (!file.type.match(/image.*/)) {
            return resolve(file); // Not an image, skip
        }

        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
                height = Math.round(height * (maxWidth / width));
                width = maxWidth;
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) return resolve(file);

            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob((blob) => {
                if (blob) {
                    const optimizedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
                        type: 'image/jpeg',
                        lastModified: Date.now(),
                    });
                    resolve(optimizedFile);
                } else {
                    resolve(file); // Fallback
                }
            }, 'image/jpeg', quality);
        };
        img.onerror = () => {
            resolve(file); // Fallback
        };
    });
};
