import toast from 'react-hot-toast';
import { useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

export const NotificationListener = ({ userId }: { userId: string | null }) => {
    useEffect(() => {
        if (!userId) return;
        const q = query(
            collection(db, 'user_notifications', userId, 'notifications'),
            orderBy('createdAt', 'desc')
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    // Logic to show alert/notification
                    toast.success(`New Notification: ${change.doc.data().message}`);
                }
            });
        });
        return () => unsubscribe();
    }, [userId]);
    return null;
};
