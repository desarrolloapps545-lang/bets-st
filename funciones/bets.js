const SUPABASE_URL = 'https://qbazuxfrctslfecvhcgf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_nYuymJruu67P9LMKihq81A_8LKBmbJo';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let apuestasData = [];
let currentApuesta = null;
let apostadorActual = null;

const SESSION_KEY = 'stadium_bets_apostador';

function formatPeso(valor) {
    const entero = Math.floor(valor);
    return '$ ' + entero.toLocaleString('es-CO');
}

function getSaludo() {
    const hora = new Date().getHours();
    if (hora >= 5 && hora < 12) return 'Buenos días';
    if (hora >= 12 && hora < 18) return 'Buenas tardes';
    return 'Buenas noches';
}

function updateClock() {
    const clock = document.getElementById('clock');
    if (clock) clock.textContent = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function getNombreCompleto(apostador) {
    if (!apostador) return '';
    if (apostador.nombre && typeof apostador.nombre === 'object') {
        return `${apostador.nombre.nombre || ''} ${apostador.nombre.apellido || ''}`.trim();
    }
    return apostador.nombre || '';
}

function updateWelcome() {
    const welcome = document.getElementById('welcome');
    if (welcome && apostadorActual) {
        welcome.textContent = `${getSaludo()}, ${getNombreCompleto(apostadorActual)}`;
    }
}

function getEstadoTexto(estado) {
    if (estado === 'cerrada') return 'Estado: CERRADA';
    return 'Estado: ACTIVA';
}

function getEstadoClase(estado) {
    if (estado === 'cerrada') return 'cerrada';
    return '';
}

function getResultadoClase(resultado) {
    if (resultado === 'Cumplida') return 'cumplida';
    if (resultado === 'No cumplida') return 'nocumplida';
    return '';
}

function createCard(apuesta) {
    const card = document.createElement('div');
    card.className = `card ${getEstadoClase(apuesta.estado)}`;
    card.dataset.id = apuesta.id;
    card.onclick = () => openModal(apuesta);

    const estadoClase = apuesta.estado === 'cerrada' ? 'badge-cerrada' : 'badge-activa';
    const resultadoClase = getResultadoClase(apuesta.resultado);

    let badgesHTML = `<span class="badge ${estadoClase}">${getEstadoTexto(apuesta.estado)}</span>`;
    if (apuesta.resultado && apuesta.resultado.trim()) {
        badgesHTML += `<span class="badge ${resultadoClase}">Resultado: ${apuesta.resultado}</span>`;
    }

    card.innerHTML = `
        <div class="card-header">
            <div style="flex: 1;">
                <div class="card-title">${escapeHtml(apuesta.apuesta)}</div>
                <div class="card-sub">${escapeHtml(apuesta.juego)}</div>
            </div>
            <div style="display: flex; flex-direction: column; gap: 6px; align-items: flex-end;">
                ${badgesHTML}
            </div>
        </div>
        <div class="tiles">
            <div class="tile">
                <div class="tile-caption">Monto Máximo</div>
                <div class="tile-value">${formatPeso(apuesta.monto_maximo)}</div>
            </div>
            <div class="tile">
                <div class="tile-caption">Multiplicador</div>
                <div class="tile-value">x${apuesta.multiplicador}</div>
            </div>
        </div>
    `;

    return card;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function renderCards() {
    const container = document.getElementById('cards');
    container.innerHTML = '';

    if (!apuestasData.length) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>Sin apuestas disponibles</h3>
            </div>
        `;
        return;
    }

    apuestasData.forEach(apuesta => {
        const card = createCard(apuesta);
        const existing = container.querySelector(`[data-id="${apuesta.id}"]`);
        if (existing) {
            existing.replaceWith(card);
        } else {
            container.appendChild(card);
        }
    });
}

async function cargarIdsApuestasHechas() {
    if (!apostadorActual) return [];
    
    try {
        const { data, error } = await sb
            .from('apuestas')
            .select('id_apuesta')
            .eq('cliente->>id_apostador', apostadorActual.id);

        if (error) {
            console.error('Error cargando apuestas hechas:', error);
            return [];
        }

        return (data || []).map(r => r.id_apuesta);
    } catch (error) {
        console.error('Error en cargarIdsApuestasHechas:', error);
        return [];
    }
}

async function loadApuestas() {
    try {
        const idsHechas = await cargarIdsApuestasHechas();
        
        const { data, error } = await sb
            .from('apuesta')
            .select('*')
            .eq('estado', 'activa')
            .order('fecha_creacion', { ascending: false });

        if (error) throw error;

        let nuevasApuestas = (data || []).filter(a => esHoy(a.fecha_creacion));
        
        if (idsHechas.length > 0) {
            nuevasApuestas = nuevasApuestas.filter(a => !idsHechas.includes(a.id));
        }

        const container = document.getElementById('cards');
        if (container.querySelector('.loading')) {
            container.innerHTML = '';
        }

        if (JSON.stringify(nuevasApuestas) !== JSON.stringify(apuestasData)) {
            apuestasData = nuevasApuestas;
            renderCards();
        }
    } catch (error) {
        console.error('Error cargando apuestas:', error);
        const container = document.getElementById('cards');
        if (container.querySelector('.loading')) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>Error al cargar apuestas</h3>
                    <p>${error.message}</p>
                </div>
            `;
        }
    }
}

function openModal(apuesta) {
    if (apuesta.estado !== 'activa') {
        alert('Esta apuesta ya no está disponible para jugar');
        return;
    }

    currentApuesta = apuesta;
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const modalActions = document.getElementById('modal-actions');

    modalTitle.textContent = apuesta.apuesta;
    modalBody.innerHTML = `
        <div class="modal-field">
            <label>Juego</label>
            <div class="value">${escapeHtml(apuesta.juego)}</div>
        </div>
        <div class="modal-field">
            <label>Monto Máximo</label>
            <div class="value">${formatPeso(apuesta.monto_maximo)}</div>
        </div>
        <div class="modal-field">
            <label>Multiplicador</label>
            <div class="value">x${apuesta.multiplicador}</div>
        </div>
        <div class="modal-field">
            <label>Monto a Apostar</label>
            <input type="number" id="montoApuesta" placeholder="Ingresa el monto a apostar" min="1000" step="1000" max="${apuesta.monto_maximo}">
            <div class="hint">Monto mínimo: $1.000 · Máximo: ${formatPeso(apuesta.monto_maximo)}</div>
        </div>
        <div class="modal-field">
            <label>Ganancia Posible</label>
            <div class="value" id="gananciaPosible">$ 0</div>
        </div>
        <div class="error-msg" id="errorMsg"></div>
    `;
    modalActions.innerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" id="btnJugar" onclick="realizarApuesta(${apuesta.monto_maximo}, ${apuesta.multiplicador})">Jugar</button>
    `;

    const montoInput = document.getElementById('montoApuesta');
    const gananciaEl = document.getElementById('gananciaPosible');

    montoInput.addEventListener('input', () => {
        const monto = parseFloat(montoInput.value) || 0;
        const ganancia = monto * apuesta.multiplicador;
        gananciaEl.textContent = formatPeso(ganancia);
    });

    montoInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            realizarApuesta(apuesta.monto_maximo, apuesta.multiplicador);
        }
    });

    modal.classList.add('active');
    setTimeout(() => montoInput.focus(), 100);
}

function closeModal() {
    const modal = document.getElementById('modal');
    modal.classList.remove('active');
    currentApuesta = null;
}

function realizarApuesta(montoMaximo, multiplicador) {
    const montoInput = document.getElementById('montoApuesta');
    const errorMsg = document.getElementById('errorMsg');
    const btnJugar = document.getElementById('btnJugar');

    const monto = parseFloat(montoInput.value);

    if (!monto || monto <= 0) {
        errorMsg.textContent = 'Ingresa un monto válido';
        montoInput.focus();
        return;
    }

    if (monto < 1000) {
        errorMsg.textContent = 'El monto mínimo es $1.000';
        montoInput.focus();
        return;
    }

    if (monto > montoMaximo) {
        errorMsg.textContent = `El monto no puede exceder ${formatPeso(montoMaximo)}`;
        montoInput.focus();
        return;
    }

    btnJugar.disabled = true;
    btnJugar.textContent = 'Procesando...';
    errorMsg.textContent = '';

    guardarApuesta(monto, multiplicador)
        .then(() => {
            alert(`¡Apuesta realizada con éxito!\n\nCliente: ${getNombreCompleto(apostadorActual)}\nApuesta: ${currentApuesta ? currentApuesta.apuesta : ''}\nMonto: ${formatPeso(monto)}\nGanancia posible: ${formatPeso(monto * multiplicador)}`);
            closeModal();
            loadApuestas();
        })
        .catch((error) => {
            console.error('Error completo:', error);
            const errorMsgEl = document.getElementById('errorMsg');
            if (errorMsgEl) {
                errorMsgEl.textContent = error.message || 'Error al guardar la apuesta. Intenta nuevamente.';
            }
        })
        .finally(() => {
            btnJugar.disabled = false;
            btnJugar.textContent = 'Jugar';
        });
}

async function guardarApuesta(monto, multiplicador) {
    if (!apostadorActual || !currentApuesta) {
        throw new Error('Sesión inválida. Recarga la página.');
    }

    try {
        console.log('Guardando apuesta para apostador:', apostadorActual.id, 'apuesta:', currentApuesta.id);

        const clienteJson = {
            id_apostador: apostadorActual.id,
            nombre: getNombreCompleto(apostadorActual)
        };

        const { data: existente, error: errorSelect } = await sb
            .from('apuestas')
            .select('*')
            .eq('id_apuesta', currentApuesta.id)
            .limit(1);

        if (errorSelect) {
            console.error('Error SELECT apuestas:', errorSelect);
            throw new Error(`Error al verificar apuesta: ${errorSelect.message || JSON.stringify(errorSelect)}`);
        }

        const existenteData = existente && existente.length > 0 ? existente[0] : null;

        if (existenteData) {
            console.log('Actualizando apuesta en apuestas...');
            const { error: errorUpdate } = await sb
                .from('apuestas')
                .update({
                    cliente: clienteJson,
                    juego_nombre: currentApuesta.juego,
                    monto: monto,
                    nombre_apuesta: currentApuesta.apuesta
                })
                .eq('id_apuesta', currentApuesta.id);

            if (errorUpdate) {
                console.error('Error UPDATE apuestas:', errorUpdate);
                throw new Error(`Error al actualizar: ${errorUpdate.message || JSON.stringify(errorUpdate)}`);
            }
        } else {
            console.log('Insertando nueva apuesta en apuestas...');
            const { error: errorInsert } = await sb
                .from('apuestas')
                .insert({
                    cliente: clienteJson,
                    juego_nombre: currentApuesta.juego,
                    monto: monto,
                    id_apuesta: currentApuesta.id,
                    nombre_apuesta: currentApuesta.apuesta
                });

            if (errorInsert) {
                console.error('Error INSERT apuestas:', errorInsert);
                throw new Error(`Error al insertar: ${errorInsert.message || JSON.stringify(errorInsert)}`);
            }
        }

        console.log('Actualizando participantes en apuesta...');
        const { data: apuestaData, error: errorSelectApuesta } = await sb
            .from('apuesta')
            .select('participantes')
            .eq('id', currentApuesta.id)
            .limit(1);

        if (errorSelectApuesta) {
            console.error('Error SELECT apuesta:', errorSelectApuesta);
        }

        let participantes = [];
        if (apuestaData && apuestaData.length > 0 && apuestaData[0].participantes && Array.isArray(apuestaData[0].participantes)) {
            participantes = [...apuestaData[0].participantes];
        }

        const participanteJson = {
            id_apostador: apostadorActual.id,
            nombre: getNombreCompleto(apostadorActual),
            monto: monto,
            ganancia: monto * multiplicador
        };

        const indiceExistente = participantes.findIndex(p => p && p.id_apostador === apostadorActual.id);
        if (indiceExistente !== -1) {
            participantes[indiceExistente] = participanteJson;
        } else {
            participantes.push(participanteJson);
        }

        const { error: errorUpdateApuesta } = await sb
            .from('apuesta')
            .update({
                participantes: participantes
            })
            .eq('id', currentApuesta.id);

        if (errorUpdateApuesta) {
            console.error('Error UPDATE apuesta participantes:', errorUpdateApuesta);
        }

        console.log('Todo guardado exitosamente');
        return true;
    } catch (error) {
        console.error('Error en guardarApuesta:', error);
        throw error;
    }
}

function logout() {
    apostadorActual = null;
    sessionStorage.removeItem(SESSION_KEY);
    window.location.href = 'index.html';
}

async function verificarSesion() {
    const guardado = sessionStorage.getItem(SESSION_KEY);
    if (!guardado) return false;

    try {
        const apostador = JSON.parse(guardado);
        
        const { data, error } = await sb
            .from('apostadores')
            .select('*')
            .eq('id', apostador.id)
            .limit(1);

        if (error || !data || data.length === 0) {
            sessionStorage.removeItem(SESSION_KEY);
            return false;
        }

        apostadorActual = data[0];
        return true;
    } catch (error) {
        console.error('Error verificando sesión:', error);
        sessionStorage.removeItem(SESSION_KEY);
        return false;
    }
}

document.getElementById('modal').addEventListener('click', (e) => {
    if (e.target.id === 'modal') closeModal();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});

document.getElementById('btnLogout').addEventListener('click', logout);

function esHoy(iso) {
    if (!iso) return false;
    try {
        const fecha = new Date(iso);
        const hoy = new Date();
        return fecha.getDate() === hoy.getDate() &&
               fecha.getMonth() === hoy.getMonth() &&
               fecha.getFullYear() === hoy.getFullYear();
    } catch (e) {
        return false;
    }
}

function connectRealtime() {
    const channel = sb
        .channel('public:apuesta')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'apuesta' }, async (payload) => {
            console.log('Realtime event recibido:', payload);
            const { eventType, new: newRecord, old } = payload;

            if (eventType === 'INSERT' && newRecord && newRecord.estado === 'activa' && esHoy(newRecord.fecha_creacion)) {
                const idsHechas = await cargarIdsApuestasHechas();
                if (!idsHechas.includes(newRecord.id)) {
                    const exists = apuestasData.find(a => a.id === newRecord.id);
                    if (!exists) {
                        apuestasData.unshift(newRecord);
                        renderCards();
                    }
                }
            } else if (eventType === 'UPDATE') {
                const index = apuestasData.findIndex(a => a.id === newRecord.id);
                if (index !== -1) {
                    if (newRecord.estado !== 'activa') {
                        apuestasData.splice(index, 1);
                        renderCards();
                    } else {
                        apuestasData[index] = newRecord;
                        renderCards();
                    }
                } else if (newRecord.estado === 'activa' && esHoy(newRecord.fecha_creacion)) {
                    const idsHechas = await cargarIdsApuestasHechas();
                    if (!idsHechas.includes(newRecord.id)) {
                        const exists = apuestasData.find(a => a.id === newRecord.id);
                        if (!exists) {
                            apuestasData.unshift(newRecord);
                            renderCards();
                        }
                    }
                }
            } else if (eventType === 'DELETE') {
                const index = apuestasData.findIndex(a => a.id === old.id);
                if (index !== -1) {
                    apuestasData.splice(index, 1);
                    renderCards();
                }
            }
        })
        .subscribe((status, err) => {
            console.log('Realtime status:', status);
            if (err) {
                console.error('Realtime error:', err);
            }
            if (status === 'SUBSCRIBED') {
                console.log('Realtime conectado');
            }
        });
}

async function init() {
    const tieneSesion = await verificarSesion();
    
    if (!tieneSesion) {
        window.location.href = 'index.html';
        return;
    }

    updateClock();
    setInterval(updateClock, 1000);
    updateWelcome();

    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.remove('hidden');
    }

    setTimeout(async () => {
        if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
        }
        updateWelcome();
        await loadApuestas();
        connectRealtime();
    }, 700);
}

init();
