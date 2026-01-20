import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "../firebase";

/**
 * Uploads a file (Blob or File) to Firebase Storage
 */
export const uploadToStorage = async (file: Blob | File, path: string): Promise<{ url: string, storagePath: string }> => {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    return { url, storagePath: path };
};

/**
 * Deletes a file from Firebase Storage
 */
export const deleteFromStorage = async (path: string): Promise<void> => {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
};

/**
 * Triggers a native share on mobile or a download on PC
 */
export const shareOrDownloadFile = async (url: string, fileName: string) => {
    try {
        const response = await fetch(url);
        const blob = await response.blob();

        // Check if Mobile Share is available
        if (navigator.share && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
            const file = new File([blob], fileName, { type: blob.type });
            await navigator.share({
                files: [file],
                title: fileName,
                text: 'Enviar a OneDrive/PC'
            });
            return true;
        } else {
            // Desktop Download
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            return true;
        }
    } catch (error) {
        console.error("Error sharing/downloading file:", error);
        return false;
    }
};

/**
 * Implementation of ZIP export for multiple files
 */
export const generateZip = async (files: { url: string, name: string }[]): Promise<Blob | null> => {
    // Note: JSZip should be imported where this is used if we want to avoid top-level issues
    // but we'll assume it's available in the project.
    try {
        // @ts-ignore
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();

        for (const file of files) {
            const response = await fetch(file.url);
            const blob = await response.blob();
            zip.file(file.name, blob);
        }

        return await zip.generateAsync({ type: 'blob' });
    } catch (error) {
        console.error("Error generating ZIP:", error);
        return null;
    }
};
