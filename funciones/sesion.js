const SESSION_KEY = 'stadium_bets_apostador';
const TOKEN_KEY = 'stadium_bets_token';

function generarToken() {
    const array = new Uint8Array(32);
    if (window.crypto && crypto.getRandomValues) {
        crypto.getRandomValues(array);
    } else {
        for (let i = 0; i < array.length; i++) {
            array[i] = Math.floor(Math.random() * 256);
        }
    }
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

function guardarSesionLocal(apostador, token) {
    localStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(apostador));
}

function limpiarSesionLocal() {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(SESSION_KEY);
}

function getTokenGuardado() {
    return localStorage.getItem(TOKEN_KEY);
}

async function iniciarSesion(apostador) {
    const token = generarToken();
    const idApostador = apostador.id;

    console.log('Iniciando sesion para apostador id:', idApostador);

    const { error: errorUpdate, count } = await sb
        .from('apostadores')
        .update({
            sesion: 'Activa',
            token_sesion: token,
            ultimo_ingreso: new Date().toISOString()
        }, { count: 'exact' })
        .eq('id', idApostador);

    if (errorUpdate) {
        console.error('Error iniciando sesion:', errorUpdate);
        return { ok: false, mensaje: errorUpdate.message || 'Error al iniciar sesión' };
    }

    if (!count || count === 0) {
        console.error('No se actualizo ninguna fila al iniciar sesion. id:', idApostador);

        const { data: verificar, error: errorVerificar } = await sb
            .from('apostadores')
            .select('id')
            .eq('id', idApostador)
            .limit(1);

        if (errorVerificar) {
            return { ok: false, mensaje: 'No se puede verificar el apostador: ' + errorVerificar.message };
        }

        if (!verificar || verificar.length === 0) {
            return { ok: false, mensaje: 'El apostador no existe en la base de datos' };
        }

        return { ok: false, mensaje: 'No tienes permiso para actualizar sesiones (RLS). Revisa las políticas de la tabla' };
    }

    guardarSesionLocal(apostador, token);
    return { ok: true };
}

async function cerrarSesion() {
    const token = getTokenGuardado();

    if (token) {
        const { error } = await sb
            .from('apostadores')
            .update({ sesion: 'Cerrada' })
            .eq('token_sesion', token);

        if (error) {
            console.error('Error cerrando sesion:', error);
        }
    }

    limpiarSesionLocal();
}

async function verificarSesion() {
    const token = getTokenGuardado();
    if (!token) return null;

    try {
        const { data, error } = await sb
            .from('apostadores')
            .select('*')
            .eq('token_sesion', token)
            .eq('sesion', 'Activa')
            .limit(1);

        if (error || !data || data.length === 0) {
            limpiarSesionLocal();
            return null;
        }

        sessionStorage.setItem(SESSION_KEY, JSON.stringify(data[0]));
        return data[0];
    } catch (error) {
        console.error('Error verificando sesion:', error);
        return null;
    }
}
