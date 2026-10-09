let apuestasData = [];
let idsHechasCache = [];
let currentApuesta = null;
let apostadorActual = null;

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
    if (apostador.datos && typeof apostador.datos === 'object') {
        return apostador.datos.nombre || '';
    }
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

function getEstadoTexto(estado, apostada, resultado) {
    if (resultado === 'Cumplida') return 'Ganada';
    if (resultado === 'No cumplida') return 'Perdida';
    if (estado === 'cerrada') return 'Estado: CERRADA';
    if (apostada) return 'Apostado';
    return 'Estado: ACTIVA';
}

function getEstadoClase(estado, apostada, resultado) {
    if (resultado === 'Cumplida') return 'ganada';
    if (resultado === 'No cumplida') return 'perdida';
    if (estado === 'cerrada') return 'cerrada';
    if (apostada) return 'apostada';
    return '';
}

function getBadgeClase(estado, apostada, resultado) {
    if (resultado === 'Cumplida') return 'badge-ganada';
    if (resultado === 'No cumplida') return 'badge-perdida';
    if (estado === 'cerrada') return 'badge-cerrada';
    if (apostada) return 'badge-apostada';
    return 'badge-activa';
}

function getResultadoClase(resultado) {
    if (resultado === 'Cumplida') return 'cumplida';
    if (resultado === 'No cumplida') return 'nocumplida';
    return '';
}

function getCorreo(apostador) {
    if (!apostador) return '';
    if (apostador.datos && typeof apostador.datos === 'object') {
        return apostador.datos.correo || '';
    }
    return '';
}

function createCard(apuesta, idsHechas) {
    const apostada = idsHechas && idsHechas.includes(apuesta.id);
    const estaCerrada = apuesta.estado === 'cerrada';
    const card = document.createElement('div');
    card.className = `card ${getEstadoClase(apuesta.estado, apostada, apuesta.resultado)}`;
    card.dataset.id = apuesta.id;
    if (!apostada && !estaCerrada && apuesta.estado === 'activa') {
        card.onclick = () => openModal(apuesta, idsHechas);
    }

    const estadoClase = getEstadoClase(apuesta.estado, apostada, apuesta.resultado);
    const badgeClase = getBadgeClase(apuesta.estado, apostada, apuesta.resultado);

    let badgesHTML = `<span class="badge ${badgeClase}">${getEstadoTexto(apuesta.estado, apostada, apuesta.resultado)}</span>`;

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
                <div class="tile-caption">Valor Apuesta</div>
                <div class="tile-value">${formatPeso(apuesta.monto_maximo)}</div>
            </div>
            <div class="tile">
                <div class="tile-caption">Ganancia</div>
                <div class="tile-value">${escapeHtml(apuesta.ganancia || '')}</div>
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

function renderCards(idsHechas) {
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
        const card = createCard(apuesta, idsHechas);
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
            .order('fecha_creacion', { ascending: false });

        if (error) throw error;

        let nuevasApuestas = (data || []).filter(a => esHoy(a.fecha_creacion));

        const container = document.getElementById('cards');
        if (container.querySelector('.loading')) {
            container.innerHTML = '';
        }

        if (JSON.stringify(nuevasApuestas) !== JSON.stringify(apuestasData) || JSON.stringify(idsHechas) !== JSON.stringify(idsHechasCache)) {
            apuestasData = nuevasApuestas;
            idsHechasCache = idsHechas;
            renderCards(idsHechas);
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

function openModal(apuesta, idsHechas) {
    if (apuesta.estado !== 'activa') {
        return;
    }

    if (idsHechas && idsHechas.includes(apuesta.id)) {
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
            <label>Valor Apuesta</label>
            <div class="value">${formatPeso(apuesta.monto_maximo)}</div>
        </div>
        <div class="modal-field">
            <label>Ganancia</label>
            <div class="value">${escapeHtml(apuesta.ganancia || '')}</div>
        </div>
        <div class="error-msg" id="errorMsg"></div>
    `;
    modalActions.innerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" id="btnJugar" onclick="realizarApuesta()">Jugar</button>
    `;

    const btnJugar = document.getElementById('btnJugar');

    btnJugar.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            realizarApuesta();
        }
    });

    modal.classList.add('active');
    setTimeout(() => btnJugar.focus(), 100);
}

function closeModal() {
    const modal = document.getElementById('modal');
    modal.classList.remove('active');
    currentApuesta = null;
}

function mostrarToastTemporal(mensaje) {
    const existente = document.querySelector('.toast-temporal');
    if (existente) {
        existente.remove();
    }

    const toast = document.createElement('div');
    toast.className = 'toast-temporal';
    toast.textContent = mensaje;
    document.body.appendChild(toast);

    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, 1200);
}

function realizarApuesta() {
    const errorMsg = document.getElementById('errorMsg');
    const btnJugar = document.getElementById('btnJugar');

    if (!currentApuesta) {
        return;
    }

    btnJugar.disabled = true;
    btnJugar.textContent = 'Procesando...';
    if (errorMsg) errorMsg.textContent = '';

    guardarApuesta()
        .then(() => {
            closeModal();
            mostrarToastTemporal('Apuesta jugada');
            setTimeout(() => {
                loadApuestas();
            }, 1200);
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

async function guardarApuesta() {
    if (!apostadorActual || !currentApuesta) {
        throw new Error('Sesión inválida. Recarga la página.');
    }

    try {
        console.log('Guardando apuesta para apostador:', apostadorActual.id, 'apuesta:', currentApuesta.id);

        const clienteJson = {
            id_apostador: apostadorActual.id,
            nombre: getNombreCompleto(apostadorActual),
            correo: getCorreo(apostadorActual)
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
                    monto: currentApuesta.monto_maximo,
                    ganancia: currentApuesta.ganancia || '',
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
                    monto: currentApuesta.monto_maximo,
                    ganancia: currentApuesta.ganancia || '',
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
            correo: getCorreo(apostadorActual),
            monto: currentApuesta.monto_maximo,
            ganancia: currentApuesta.ganancia || ''
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

async function logout() {
    apostadorActual = null;
    await cerrarSesion();
    window.location.href = 'index.html';
}

async function verificarSesionLocal() {
    const apostador = await verificarSesion();

    if (!apostador) {
        window.location.href = 'index.html';
        return false;
    }

    apostadorActual = apostador;
    return true;
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
                const exists = apuestasData.find(a => a.id === newRecord.id);
                if (!exists) {
                    apuestasData.unshift(newRecord);
                    idsHechasCache = idsHechas;
                    renderCards(idsHechas);
                }
            } else if (eventType === 'UPDATE') {
                const index = apuestasData.findIndex(a => a.id === newRecord.id);
                if (index !== -1) {
                    const estadoAnterior = apuestasData[index].estado;
                    apuestasData[index] = newRecord;
                    const idsHechas = await cargarIdsApuestasHechas();
                    idsHechasCache = idsHechas;
                    renderCards(idsHechas);
                    if (estadoAnterior === 'activa' && newRecord.estado === 'cerrada') {
                        console.log('Apuesta cerrada en tiempo real:', newRecord.id);
                    }
                } else if (newRecord && esHoy(newRecord.fecha_creacion)) {
                    const idsHechas = await cargarIdsApuestasHechas();
                    const exists = apuestasData.find(a => a.id === newRecord.id);
                    if (!exists) {
                        apuestasData.unshift(newRecord);
                        idsHechasCache = idsHechas;
                        renderCards(idsHechas);
                    }
                }
            } else if (eventType === 'DELETE') {
                const index = apuestasData.findIndex(a => a.id === old.id);
                if (index !== -1) {
                    apuestasData.splice(index, 1);
                    renderCards(idsHechasCache);
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
    const tieneSesion = await verificarSesionLocal();

    if (!tieneSesion) {
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
