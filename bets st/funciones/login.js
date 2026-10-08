const SUPABASE_URL = 'https://qbazuxfrctslfecvhcgf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_nYuymJruu67P9LMKihq81A_8LKBmbJo';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const SESSION_KEY = 'stadium_bets_apostador';

async function verificarApostador(nombre, apellido) {
    try {
        const { data, error } = await sb
            .from('apostadores')
            .select('*')
            .contains('nombre', { nombre: nombre, apellido: apellido })
            .limit(1);

        if (error) {
            console.error('Error verificando apostador:', error);
            return null;
        }

        if (data && data.length > 0) {
            return data[0];
        }

        const { data: nuevo, error: errorInsert } = await sb
            .from('apostadores')
            .insert({ nombre: { nombre: nombre, apellido: apellido } })
            .select()
            .single();

        if (errorInsert) {
            console.error('Error creando apostador:', errorInsert);
            return null;
        }

        return nuevo;
    } catch (error) {
        console.error('Error en verificarApostador:', error);
        return null;
    }
}

async function login() {
    const nombreInput = document.getElementById('loginNombre');
    const apellidoInput = document.getElementById('loginApellido');
    const loginHint = document.getElementById('loginHint');
    const btnLogin = document.getElementById('btnLogin');

    const nombre = nombreInput.value.trim();
    const apellido = apellidoInput.value.trim();

    if (!nombre || !apellido) {
        loginHint.textContent = 'Ingresa tu nombre y apellido';
        return;
    }

    btnLogin.disabled = true;
    btnLogin.textContent = 'Entrando...';
    loginHint.textContent = '';

    const apostador = await verificarApostador(nombre, apellido);

    if (!apostador) {
        loginHint.textContent = 'Error al registrar. Intenta nuevamente.';
        btnLogin.disabled = false;
        btnLogin.textContent = 'Entrar';
        return;
    }

    sessionStorage.setItem(SESSION_KEY, JSON.stringify(apostador));
    btnLogin.disabled = false;
    btnLogin.textContent = 'Entrar';
    window.location.href = 'bets.html';
}

document.getElementById('btnLogin').addEventListener('click', login);
document.getElementById('loginNombre').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') login();
});
document.getElementById('loginApellido').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') login();
});
