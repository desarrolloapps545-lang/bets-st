async function login() {
    const nombreInput = document.getElementById('loginNombre');
    const correoInput = document.getElementById('loginCorreo');
    const loginHint = document.getElementById('loginHint');
    const btnLogin = document.getElementById('btnLogin');

    const nombreCompleto = nombreInput.value.trim();
    const correo = correoInput.value.trim();

    if (!nombreCompleto || !correo) {
        loginHint.textContent = 'Ingresa tu nombre completo y correo';
        return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
        loginHint.textContent = 'Ingresa un correo válido';
        return;
    }

    btnLogin.disabled = true;
    btnLogin.textContent = 'Entrando...';
    loginHint.textContent = '';

    const apostador = await verificarApostador(nombreCompleto, correo);

    if (!apostador || apostador.error) {
        loginHint.textContent = apostador && apostador.mensaje
            ? apostador.mensaje
            : 'Error al registrar. Intenta nuevamente.';
        btnLogin.disabled = false;
        btnLogin.textContent = 'Entrar';
        return;
    }

    const resultado = await iniciarSesion(apostador);

    if (!resultado || !resultado.ok) {
        loginHint.textContent = resultado && resultado.mensaje
            ? resultado.mensaje
            : 'Error al iniciar sesión. Intenta nuevamente.';
        btnLogin.disabled = false;
        btnLogin.textContent = 'Entrar';
        return;
    }

    window.location.href = 'bets.html';
}

async function init() {
    const apostador = await verificarSesion();

    if (apostador) {
        window.location.href = 'bets.html';
        return;
    }

    document.getElementById('btnLogin').addEventListener('click', login);
    document.getElementById('loginNombre').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') login();
    });
    document.getElementById('loginCorreo').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') login();
    });
}

init();
