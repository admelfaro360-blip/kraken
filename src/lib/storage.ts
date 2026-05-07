export const fetchUsers = async (): Promise<any[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, USERS_COLLECTION));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (e) {
    // Si falla por permisos, devolvemos array vacío para que el login falle limpiamente
    console.warn('Error al obtener usuarios:', e);
    return [];
  }
};
