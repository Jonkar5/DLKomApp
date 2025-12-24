import { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
    collection,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    orderBy,
    setDoc
} from 'firebase/firestore';

export const useFirestore = <T extends { id: string }>(collectionName: string) => {
    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        // Simple query: order by some field? 
        // For now, let's just get everything. We can refine queries later.
        const q = query(collection(db, collectionName));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items: T[] = [];
            snapshot.forEach((doc) => {
                items.push({ id: doc.id, ...doc.data() } as T);
            });
            setData(items);
            setLoading(false);
        }, (err) => {
            console.error(`Error fetching ${collectionName}:`, err);
            setError(err.message);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [collectionName]);

    const add = async (item: Omit<T, 'id'> | T) => {
        try {
            // If item has an ID (e.g. created by Date.now()), use it as doc ID
            // Otherwise let Firestore generate one
            const { id, ...rest } = item as any;
            if (id && typeof id === 'string' && id.length > 5) {
                await setDoc(doc(db, collectionName, id), rest);
            } else {
                await addDoc(collection(db, collectionName), rest);
            }
        } catch (err) {
            console.error(`Error adding to ${collectionName}:`, err);
            throw err;
        }
    };

    const update = async (id: string, updates: Partial<T>) => {
        try {
            const docRef = doc(db, collectionName, id);
            await updateDoc(docRef, updates as any);
        } catch (err) {
            console.error(`Error updating in ${collectionName}:`, err);
            throw err;
        }
    };

    const remove = async (id: string) => {
        try {
            const docRef = doc(db, collectionName, id);
            await deleteDoc(docRef);
        } catch (err) {
            console.error(`Error deleting from ${collectionName}:`, err);
            throw err;
        }
    };

    return { data, loading, error, add, update, remove };
};
