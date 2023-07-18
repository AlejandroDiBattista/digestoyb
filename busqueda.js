
function contiene(palabra, o) {
    if (palabra == o.ordenanda) return true;
    if (o.asunto.includes(palabra)) return true;
    if (palabra == o.estado) return true;
    if (o.clasificacion.includes(palabra)) true;
    return false;
}

function buscar(ordenanzas, nodos, condicion) {
    let palabras = condicion.split(" ");
    let salida = ordenanzas.filter(o => palabras.every(palabra => contiene(palabra, o)));

    console.log("Hay " + salida.length + " para [" + condicion + "]");

    return salida;
}

function sumar(a, b) { return a + b; }

var ordenanzas = [];
function mostrarPrueba() {
    fetch('/datos/ordenanzas.json')
        .then(response => response.json())
        .then(data => {
            ordenanzas = data;
            console.log(`Hay ${ordenanzas.length} ordenanzas`);
        })
        .catch(error => {
            console.error('Error al cargar el archivo JSON:', error);
        });
    console.log("Hola Mundo");
}

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
    console.log(`Hay ${ordenanzas.length} ordenanzas`);
    generarOrdenanzas(ordenanzas);
    const final = new Date();
    console.log(`Lista generada  ${final - inicio} ms`);
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
    console.log(`Generando ${ordenanzas.length}`);
    let o = ordenanzas[0];
    const vigentes = ordenanzas.filter(o => o.estado == "Vigente" && o.alcance == "General");
    const lista = document.getElementById('lista');

    var html = "";
    var i = 0;
    vigentes.slice(0,10).forEach(o => {
        html += generarOdenanza(o);
        if (i++ == 10) {
            lista.innerHTML = html;
            console.log(`Demoró ${(new Date() - inicio)}ms`)
        }
    });
    console.log(`Para ${vigentes.length} ordenanzas se generó ${html.length} caracteres`)
    lista.innerHTML = html;
    const final = new Date();
    const demora = final - inicio;
    document.getElementById("medir").innerHTML = `Para ${vigentes.length} ordenanzas se generó ${html.length / 1000000} mb en ${demora}ms`
}

function generarLista() {
    cargar();
}