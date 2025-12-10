// db.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Ruta absoluta a la base de datos
const dbPath = path.join(__dirname, 'db', 'microservicios.db');

// Crear o abrir la base de datos
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error al conectar con la base de datos:', err.message);
  } else {
    console.log('✅ Conectado a la base de datos SQLite.');
  }
});

// Crear tablas si no existen
db.serialize(() => {
    // Usamos variables para la consulta para luego limpiarlas con .trim()
    const createServiciosTable = `
      CREATE TABLE IF NOT EXISTS servicios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        ubicacion TEXT NOT NULL,
        descripcion TEXT NOT NULL
      )
    `;

    const createSolicitudesTable = `
      CREATE TABLE IF NOT EXISTS solicitudes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario TEXT NOT NULL,
        servicio TEXT NOT NULL
      )
    `;

    // Ejecutamos las consultas con .trim() para evitar errores de espacio/salto de línea
    db.run(createServiciosTable.trim(), (err) => {
        if (err) {
            console.error('❌ Error al crear tabla servicios:', err.message);
        } else {
            console.log('Tabla servicios verificada/creada.');
        }
    });

    db.run(createSolicitudesTable.trim(), (err) => {
        if (err) {
            console.error('❌ Error al crear tabla solicitudes:', err.message);
        } else {
            console.log('Tabla solicitudes verificada/creada.');
        }
    });
});

module.exports = db;