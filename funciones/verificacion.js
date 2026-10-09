const SUPABASE_URL = 'https://qbazuxfrctslfecvhcgf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_nYuymJruu67P9LMKihq81A_8LKBmbJo';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

async function verificarApostador(nombreCompleto, correo) {
    try {
        const { data, error } = await sb
            .from('apostadores')
            .select('*')
            .eq('datos->>correo', correo)
            .limit(1);

        if (error) {
            console.error('Error verificando apostador:', error);
            return { error: true, mensaje: error.message || 'Error al verificar' };
        }

        if (data && data.length > 0) {
            return data[0];
        }

        const { data: nuevo, error: errorInsert } = await sb
            .from('apostadores')
            .insert({ datos: { nombre: nombreCompleto, correo: correo } })
            .select()
            .single();

        if (errorInsert) {
            console.error('Error creando apostador:', errorInsert);
            return { error: true, mensaje: errorInsert.message || 'Error al registrar' };
        }

        return nuevo;
    } catch (error) {
        console.error('Error en verificarApostador:', error);
        return { error: true, mensaje: 'Error de conexión' };
    }
}

async function obtenerApostadorPorId(id) {
    try {
        const { data, error } = await sb
            .from('apostadores')
            .select('*')
            .eq('id', id)
            .limit(1);

        if (error || !data || data.length === 0) {
            return null;
        }

        return data[0];
    } catch (error) {
        console.error('Error en obtenerApostadorPorId:', error);
        return null;
    }
}
