// ... (imports previos)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('Intentando login para:', username);
      
      // 1. Intentar Firebase Auth primero (si es un email)
      if (username.includes('@')) {
        try {
          await signInWithEmailAndPassword(auth, username, password);
          console.log('Firebase Auth exitoso');
          toast.success('Sesión iniciada correctamente');
          navigate('/');
          return;
        } catch (authErr: any) {
          console.warn('Firebase Auth falló, probando verificación manual...', authErr.code);
          // Si el error no es de red, continuamos a la verificación manual
        }
      }

      // 2. Verificación manual contra la colección 'users' de Firestore
      // Útil para usuarios migrados o que usan 'username' en lugar de email
      const users = await fetchUsers();
      
      const user = users.find(u => {
        const matchUser = u.username?.toLowerCase() === username.toLowerCase();
        const matchEmail = u.email?.toLowerCase() === username.toLowerCase();
        const matchPass = u.password === password;
        return (matchUser || matchEmail) && matchPass;
      });

      if (user) {
        // Guardar sesión local
        localStorage.setItem('kraken_user', JSON.stringify({
          uid: user.id || user.email || 'local-user',
          email: user.email,
          displayName: user.username || user.email,
          role: user.role || 'user',
          isLocal: true
        }));
        
        toast.success('Acceso concedido');
        setTimeout(() => { window.location.href = '/'; }, 500);
      } else {
        setError('Usuario o contraseña incorrectos');
        toast.error('Credenciales no válidas');
      }
    } catch (err: any) {
      console.error('Error en proceso de login:', err);
      setError('Error al conectar con el servidor. Verifica las reglas de Firestore.');
      toast.error('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

// ... (resto del componente)
