// Referencias a las secciones
const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const errorMsg = document.getElementById('error-msg');
const nombreUsuarioSpan = document.getElementById('nombre-usuario');

// ================= 1. BASE DE DATOS DE USUARIOS =================
const usuariosPermitidos = {
    "10110": { password: "santiago", nombre: "Santiago" },
    "10717": { password: "gabriela", nombre: "Gabriela" },
    "10196": { password: "camila", nombre: "Camila" }
};

// Preguntamos si ya hay una sesión guardada de antes de recargar la página
let usuarioActual = sessionStorage.getItem('sesionActiva'); 


// ================= 2. VERIFICAR SESIÓN AL CARGAR =================
// Esta función revisa si sobrevivimos a un F5 o Live Server
// ================= 2. VERIFICAR SESIÓN AL CARGAR =================
function revisarEstadoDeSesion() {
    if (usuarioActual && usuariosPermitidos[usuarioActual]) {
        nombreUsuarioSpan.textContent = `Bienvenido(a), ${usuariosPermitidos[usuarioActual].nombre}`;
        loginSection.style.display = "none";
        dashboardSection.style.display = "block";
        cargarDatosDeMemoria();
        cargarRecomendacionIA(usuarioActual); // <-- ¡FALTA ESTO! 
    } else {
        dashboardSection.style.display = "none";
        loginSection.style.display = "flex";
    }
}


// ================= 3. LÓGICA DE LOGIN Y CIERRE =================
// ================= 3. LÓGICA DE LOGIN Y CIERRE =================
function iniciarSesion() {
    const cedula = document.getElementById('cedula').value;
    const password = document.getElementById('password').value;

    if (usuariosPermitidos[cedula] && usuariosPermitidos[cedula].password === password.toLowerCase()) {
        usuarioActual = cedula; 
        sessionStorage.setItem('sesionActiva', cedula);
        nombreUsuarioSpan.textContent = `Bienvenido(a), ${usuariosPermitidos[cedula].nombre}`;
        loginSection.style.display = "none";
        dashboardSection.style.display = "block";
        errorMsg.style.display = "none";

        cargarDatosDeMemoria();
        cargarRecomendacionIA(cedula); // <-- ¡FALTA ESTO!
    } else {
        errorMsg.style.display = "block";
    }
}

function cerrarSesion() {
    document.getElementById('cedula').value = "";
    document.getElementById('password').value = "";
    
    usuarioActual = null; 
    
    // Borramos la sesión para que nadie más pueda entrar si recarga la página
    sessionStorage.removeItem('sesionActiva'); 
    
    dashboardSection.style.display = "none";
    loginSection.style.display = "flex";
}


// ================= 4. MANEJO DE DATOS Y KPIs =================
const datosPorDefecto = {
    humedad: "--",
    temperatura: "--",
    lux: "--",
    aire: "--"
};

function actualizarKPIs(datos) {
    const hum = isNaN(datos.humedad) ? "--" : parseFloat(datos.humedad).toFixed(0);
    const temp = isNaN(datos.temperatura) ? "--" : parseFloat(datos.temperatura).toFixed(1);
    const lux = isNaN(datos.lux) ? "--" : parseFloat(datos.lux).toFixed(0);
    const aire = isNaN(datos.aire) ? "--" : parseFloat(datos.aire).toFixed(0);

    document.getElementById('kpi-humedad').innerHTML = `${hum}<span class="kpi-unidad">%</span>`;
    document.getElementById('kpi-temp').innerHTML = `${temp}<span class="kpi-unidad">°C</span>`;
    document.getElementById('kpi-lux').innerHTML = `${lux}<span class="kpi-unidad"> lx</span>`;
    document.getElementById('kpi-aire').innerHTML = `${aire}<span class="kpi-unidad"> MQ135</span>`;
}

function cargarDatosDeMemoria() {
    const llaveMemoria = `agroDatos_${usuarioActual}`;
    const datosGuardados = localStorage.getItem(llaveMemoria);
    
    if (datosGuardados) {
        actualizarKPIs(JSON.parse(datosGuardados));
        document.getElementById('csv-status').textContent = "Mostrando tus últimos datos guardados.";
    } else {
        actualizarKPIs(datosPorDefecto);
        document.getElementById('csv-status').textContent = "No tienes datos guardados. Por favor carga tu CSV.";
    }
}


// ================= 5. LEER EL CSV Y RESTRICCIÓN DINÁMICA =================
document.getElementById('csv-file').addEventListener('change', function(evento) {
    const archivo = evento.target.files[0];
    const statusMsg = document.getElementById('csv-status');
    
    if (archivo) {
        const lector = new FileReader();
        
        lector.onload = function(e) {
            const contenidoCsv = e.target.result;
            const filas = contenidoCsv.trim().split('\n').filter(fila => fila.length > 5);
            
            let archivoEsValido = true;
            let mensajeError = "";

            for (let i = 1; i < filas.length; i++) {
                const columnas = filas[i].split(',');
                for (let j = 1; j <= 5; j++) {
                    if (isNaN(parseFloat(columnas[j]))) {
                        archivoEsValido = false;
                        mensajeError = `Error en la fila ${i + 1}. Valor no numérico.`;
                        break;
                    }
                }
                if (!archivoEsValido) break;
            }

            if (!archivoEsValido) {
                statusMsg.style.color = "#e63946";
                statusMsg.textContent = `[RESTRICCIÓN] Rechazado: ${mensajeError}`;
                document.getElementById('csv-file').value = ""; 
                return;
            }

            // ... (código anterior de la restricción dinámica) ...

            const ultimaFila = filas[filas.length - 1].split(',');
            const nuevosDatos = {
                temperatura: ultimaFila[1],
                lux: ultimaFila[3],
                aire: ultimaFila[4],
                humedad: ultimaFila[5]
            };

            // 1. Actualizamos los números en pantalla
            actualizarKPIs(nuevosDatos);
            
            // 2. Guardamos en memoria
            const llaveMemoria = `agroDatos_${usuarioActual}`;
            localStorage.setItem(llaveMemoria, JSON.stringify(nuevosDatos));
            
            statusMsg.style.color = "var(--verde-principal)";
            statusMsg.textContent = `¡Datos cargados! Consultando a la Inteligencia Artificial... ⏳`;

            // ================= ¡LA NUEVA MAGIA! =================
            // 3. Enviamos los datos al servidor Python
            fetch('http://localhost:5000/generar-recomendacion', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nuevosDatos) // Mandamos los datos del CSV a Python
            })
            .then(respuesta => respuesta.json())
            .then(datosIA => {
                if (datosIA.error) throw new Error(datosIA.error);

                // Pintamos la respuesta de la IA en la caja de recomendaciones
                const contenedor = document.getElementById('recomendaciones-contenedor');
                contenedor.innerHTML = `
                    <div class="recomendacion-item">
                        <strong>💧 Decisión:</strong> ${datosIA.decision_hidrica} 
                        ${datosIA.volumen_riego_ml > 0 ? `(${datosIA.volumen_riego_ml} ml)` : ""}
                    </div>
                    <div class="recomendacion-item">
                        <strong>🌡️ Microclima:</strong> ${datosIA.ajuste_microclima}
                    </div>
                    <div class="recomendacion-item" style="font-size: 13px; line-height: 1.4;">
                        <strong>📊 Análisis:</strong> <br>
                        ${datosIA.analisis_general}
                    </div>
                    <div style="font-size: 11px; text-align: right; color: #888; margin-top: 10px;">
                        Analizado el: ${datosIA.fecha_analisis}
                    </div>
                `;
                statusMsg.textContent = `¡Análisis completado para ${usuariosPermitidos[usuarioActual].nombre}! ✅`;
            })
            .catch(error => {
                statusMsg.style.color = "#e63946";
                statusMsg.textContent = "Error al contactar a la IA. Revisa si el servidor Python está encendido.";
                console.error(error);
            });
            // ======================================================
            
        }; // Cierre del lector.onload

        lector.readAsText(archivo);
    }
});
// ================= 6. LEER RECOMENDACIONES DE LA IA (JSON) =================
async function cargarRecomendacionIA(cedula) {
    const contenedor = document.getElementById('recomendaciones-contenedor');
    const archivoJson = `recomendacion_${cedula}.json`; // Busca el archivo del usuario actual

    try {
        // Le pedimos al navegador que busque el archivo JSON
        const respuesta = await fetch(archivoJson);
        
        // Si el archivo no existe (error 404), lanzamos un error a propósito
        if (!respuesta.ok) {
            throw new Error("No hay JSON para este usuario");
        }

        // Convertimos el archivo a un objeto JavaScript
        const datosIA = await respuesta.json();

        // Construimos el HTML dinámico con los datos de Gemini
        contenedor.innerHTML = `
            <div class="recomendacion-item">
                <strong>💧 Decisión:</strong> ${datosIA.decision_hidrica} 
                ${datosIA.volumen_riego_ml > 0 ? `(${datosIA.volumen_riego_ml} ml)` : ""}
            </div>
            <div class="recomendacion-item">
                <strong>🌡️ Microclima:</strong> ${datosIA.ajuste_microclima}
            </div>
            <div class="recomendacion-item" style="font-size: 13px; line-height: 1.4;">
                <strong>📊 Análisis:</strong> <br>
                ${datosIA.analisis_general}
            </div>
            <div style="font-size: 11px; text-align: right; color: #888; margin-top: 10px;">
                Analizado el: ${datosIA.fecha_analisis}
            </div>
        `;

    } catch (error) {
        // Si no hay archivo JSON para este usuario, mostramos una alerta amigable
        contenedor.innerHTML = `
            <div class="recomendacion-item" style="background-color: #ffebee; border-left: 5px solid #d32f2f; color: #d32f2f;">
                <strong>Aviso:</strong> Aún no hay recomendaciones generadas para ti hoy.
            </div>
        `;
    }
}
// ¡IMPORTANTE! Ejecutamos esta función apenas el código arranca
revisarEstadoDeSesion();