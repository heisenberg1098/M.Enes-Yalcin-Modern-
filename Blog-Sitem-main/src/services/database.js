import { db } from '../config/firebase.js';
import { collection, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export async function fetchProjects() {
    try {
        // Optimised: Sadece son 10 projeyi çek (Lazy loading için altyapı)
        const q = query(collection(db, "websiteler"), orderBy("tarih", "desc"), limit(10));
        const querySnapshot = await getDocs(q);
        
        const projects = [];
        querySnapshot.forEach((doc) => {
            projects.push({ id: doc.id, ...doc.data() });
        });
        return projects;
    } catch (error) {
        console.error("Projeler çekilirken hata:", error);
        return [];
    }
}