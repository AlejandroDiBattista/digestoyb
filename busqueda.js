
function filtrarVigentes(ordenanzas) {
    return ordenanzas.filter(o => o.estado == "Vigente" && o.alcance == "General")
}

function contiene(palabra, o) {
    if (palabra == o.ordenanza) return true;
    if (o.asunto.toLowerCase().includes(palabra)) return true;
    if (o.estado.toLowerCase().includes(palabra)) return true;
    if (o.clasificacion.toLowerCase().includes(palabra)) true;
    return false;
}

function filtrarCondicion(ordenanzas, condicion) {
    let palabras = condicion.toLowerCase().split(" ");
    console.log(`Filtrando [${palabras}]`);
    let salida = ordenanzas.filter(o => palabras.every(palabra => contiene(palabra, o)));

    console.log(`Hay ${salida.length} (en ${ordenanzas.length}) para [${condicion}]`);

    return salida;
}

var ordenanzas = [];

function medir(operacion) {
    const inicio = new Date();
    operacion();
    const fin = new Date();
    const tiempoTranscurrido = fin - inicio;
    console.log(`La operación tardó ${tiempoTranscurrido} milisegundos..`);
}

async function cargar() {
    const inicio = new Date();
    const response = await fetch('/datos/ordenanzas.json');
    ordenanzas = await response.json();
    ordenanzas = filtrarVigentes(ordenanzas);

    console.log(`Hay ${ordenanzas.length} ordenanzas`);
    generarOrdenanzas(ordenanzas);
    const final = new Date();
    console.log(`Lista generada  ${final - inicio} ms`);
    instalar();
}


function instalar() {
    const campoBusqueda = document.getElementById('campoBusqueda');

    campoBusqueda.addEventListener('input', function () {
        const condicion = campoBusqueda.value;
        generarOrdenanzas(filtrarCondicion(ordenanzas, condicion));
    });
}

function generarOdenanza(o) {
    return `
        <div class="tarjeta">
            <a href="pdf/${o.ordenanza}.pdf">

                <div class="linea">
                    <div class="campo">
                        <label>Ordenanza</label>
                        <span>${o.ordenanza}</span>
                    </div>
                    <div class="campo">
                        <label>Sanción</label>
                        <span>${o.sancion}</span>
                    </div>
                    <div class="campo">
                        <label>Estado</label>
                        <span>${o.estado}</span>
                    </div>
                    <div class="campo">
                        <label>Alcance</label>
                        <span>${o.alcance}</span>
                    </div>
                </div>
                <div class="linea destacar">
                    ${o.asunto}
                </div>
                <div class="linea">
                    <div class="campo">
                        <label>Clasificación</label>
                        <span>${o.clasificacion}</span>
                    </div>
                </div>
            </a>
        </div>
    `;
}
function generarOrdenanzas(ordenanzas) {
    const inicio = new Date();
    const lista = document.getElementById('lista');

    var html = "";
    var i = 0;
    ordenanzas.forEach(o => {
        html += generarOdenanza(o);
        if (i++ == 10) {
            lista.innerHTML = html;
        }
    });
    const resultado = `Para ${ordenanzas.length} ordenanzas se generó ${Math.trunc(html.length / 100000) / 10} mb en ${(new Date()) - inicio}ms`;
    document.getElementById("medir").innerHTML = resultado;
    console.log(resultado);
    lista.innerHTML = html;
}



