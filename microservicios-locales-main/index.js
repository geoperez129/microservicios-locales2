const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const axios = require('axios');
const db = require('./db'); // Asegúrate de que db.js esté correcto

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware (Correcto y NECESARIO para leer JSON)
app.use(cors());
app.use(bodyParser.json());

// Servir archivos estáticos (HTML, CSS, JS)
app.use(express.static(__dirname));

// ----------- RUTAS DE LA API -----------

// 1. OBTENER todos los servicios (GET /servicios)
app.get('/servicios', (req, res) => {
    db.all('SELECT * FROM servicios', (err, rows) => {
        if (err) {
            console.error(err);
            res.status(500).json({ error: 'Error al obtener servicios' });
        } else {
            const servicios_con_coords = rows.map(s => {
                try {
                    const { direccion, lat, lon } = JSON.parse(s.ubicacion);
                    return { ...s, direccion, lat: parseFloat(lat), lon: parseFloat(lon) };
                } catch (e) {
                    return { ...s, direccion: s.ubicacion, lat: 0, lon: 0 };
                }
            });
            res.json(servicios_con_coords);
        }
    });
});

// 2. CREAR nuevo servicio (POST /servicios)
app.post('/servicios', async (req, res) => {
    const { nombre, direccion, descripcion } = req.body;
    
    if (!nombre || !direccion || !descripcion) {
        return res.status(400).json({ error: 'Faltan campos requeridos.' });
    }

    try {
        const nominatim_url = 'https://nominatim.openstreetmap.org/search';
        const geoResponse = await axios.get(nominatim_url, {
            params: { q: direccion, format: 'json', limit: 1 },
            headers: { 'User-Agent': 'MicroserviciosLocalesApp/1.0' }
        });

        if (geoResponse.data && geoResponse.data.length > 0) {
            const { lat, lon } = geoResponse.data[0];
            const ubicacion_data = JSON.stringify({ direccion, lat: parseFloat(lat), lon: parseFloat(lon) });

            db.run(
                'INSERT INTO servicios (nombre, ubicacion, descripcion) VALUES (?, ?, ?)',
                [nombre, ubicacion_data, descripcion],
                function (err) {
                    if (err) {
                        console.error('Error al insertar en DB:', err);
                        return res.status(500).json({ error: 'Error al agregar servicio en DB' });
                    }
                    res.json({ id: this.lastID, lat: parseFloat(lat), lon: parseFloat(lon) });
                }
            );

        } else {
            res.status(404).json({ error: 'No se pudo geocodificar la dirección. Por favor, sé más específico.' });
        }

    } catch (error) {
        console.error('Error en la geocodificación o API:', error.message);
        res.status(500).json({ error: 'Error interno al procesar el servicio.' });
    }
});

// 3. ACTUALIZAR servicio (PUT /servicios/:id)
app.put('/servicios/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre, direccion, descripcion } = req.body;

    if (!nombre || !direccion || !descripcion) {
        return res.status(400).json({ error: 'Faltan campos requeridos para la actualización.' });
    }

    try {
        const nominatim_url = 'https://nominatim.openstreetmap.org/search';
        const geoResponse = await axios.get(nominatim_url, {
            params: { q: direccion, format: 'json', limit: 1 },
            headers: { 'User-Agent': 'MicroserviciosLocalesApp/1.0' }
        });

        if (geoResponse.data && geoResponse.data.length > 0) {
            const { lat, lon } = geoResponse.data[0];
            const ubicacion_data = JSON.stringify({ direccion, lat: parseFloat(lat), lon: parseFloat(lon) });

            db.run(
                'UPDATE servicios SET nombre = ?, ubicacion = ?, descripcion = ? WHERE id = ?',
                [nombre, ubicacion_data, descripcion, id],
                function (err) {
                    if (err) {
                        console.error('Error al actualizar en DB:', err);
                        return res.status(500).json({ error: 'Error al actualizar servicio en DB' });
                    }
                    if (this.changes === 0) {
                        return res.status(404).json({ error: 'Servicio no encontrado para actualizar' });
                    }
                    res.json({ message: `Servicio con ID ${id} actualizado.`, updatedID: id });
                }
            );
        } else {
            res.status(404).json({ error: 'No se pudo geocodificar la nueva dirección.' });
        }

    } catch (error) {
        console.error('Error en la geocodificación o API durante la actualización:', error.message);
        res.status(500).json({ error: 'Error interno al actualizar el servicio.' });
    }
});

// 4. ELIMINAR servicio (DELETE /servicios/:id)
app.delete('/servicios/:id', (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM servicios WHERE id = ?', id, function (err) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error al eliminar servicio' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Servicio no encontrado' });
        }
        res.json({ message: `Servicio con ID ${id} eliminado correctamente.`, deletedID: id });
    });
});

// 5. OBTENER todas las solicitudes (GET /solicitudes)
app.get('/solicitudes', (req, res) => {
    db.all('SELECT * FROM solicitudes', (err, rows) => {
        if (err) {
            console.error(err);
            res.status(500).json({ error: 'Error al obtener solicitudes' });
        } else {
            res.json(rows);
        }
    });
});

// 6. CREAR nueva solicitud (POST /solicitudes)
app.post('/solicitudes', (req, res) => {
    const { usuario, servicio } = req.body;

    if (!usuario || !servicio) {
        console.error('❌ Error de datos (400): req.body incompleto o vacío. Cuerpo recibido:', req.body);
        return res.status(400).json({ 
            error: 'Faltan campos requeridos (usuario/servicio). Revisa el middleware body-parser en index.js o el frontend.'
        });
    }

    db.run(
        'INSERT INTO solicitudes (usuario, servicio) VALUES (?, ?)',
        [usuario, servicio],
        function (err) {
            if (err) {
                console.error('❌ Error SQL (500): No se pudo insertar la solicitud:', err.message);
                return res.status(500).json({ error: 'Error interno al guardar la solicitud en la base de datos' });
            } 
            if (this.lastID > 0) {
                res.json({ id: this.lastID, mensaje: 'Solicitud agregada con éxito' });
            } else {
                console.error('⚠️ Fallo silencioso: La inserción SQL no reportó un lastID.');
                return res.status(500).json({ error: 'Fallo al confirmar la inserción en la base de datos.' });
            }
        }
    );
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
