function sinAcento(cadena) {
    const mapaAcentos = {
        'á': 'a','é': 'e','í': 'i','ó': 'o','ú': 'u',
        'Á': 'A','É': 'E','Í': 'I','Ó': 'O','Ú': 'U'
    };

    return cadena.replace(/[áéíóúÁÉÍÓÚ]/g, (caracter) => mapaAcentos[caracter]);
}

function simplificar(texto) {
    // return texto.toLowerCase();
    return sinAcento(texto.toLowerCase());
}

function filtrarVigentes(ordenanzas) {
    return ordenanzas.filter(o => o.estado == "Vigente" && o.alcance == "General")
}

function comienzaConMayuscula(cadena) {
    const patron = /^[A-Z]/;
    return patron.test(cadena);
}

function contiene(palabra, o) {
    var enAsunto = palabra.startsWith(":");
    if (enAsunto) palabra = palabra.substring(1);

    palabra += comienzaConMayuscula(palabra) ? ` ` : ``;
    const palabras = enAsunto ? ` ${simplificar(o.asunto)} ` : o.palabras;

    return palabras.includes(` ${simplificar(palabra)}`);
}

function filtrarCondicion(ordenanzas, condicion) {
    let palabras = sinAcento(condicion).toLowerCase().split(" ");
    console.log(`Filtrando [${palabras}]`);

    let salida = ordenanzas.filter(o => palabras.every(palabra => contiene(palabra, o)));

    console.log(`Hay ${salida.length} (en ${ordenanzas.length}) para [${condicion}]`);

    return salida;
}

function palabrasUnicas(cadena) {
    const palabras = cadena.toLowerCase().split(' ');
    const palabrasUnicas = [...new Set(palabras)];
    return palabrasUnicas.join(' ');
}

async function medir(operacion, titulo = "Ejecutando") {
    console.log(titulo);
    const inicio = new Date();
    await operacion();
    const fin = new Date();
    const tiempoTranscurrido = fin - inicio;
    console.log(`La operación tardó ${tiempoTranscurrido} milisegundos.`);
}

var intervalo;
function ejecutar(accion) {
    clearInterval(intervalo); // Si hay un intervalo en curso lo detenemos y
    intervalo = setInterval(accion, 100);
}

var ordenanzas = [];
var clasificacion = [];

async function bajarJson(origen) {
    const response = await fetch(`/datos/${origen}.json`);
    return await response.json();
}

async function cargar() {
    await medir(async () => {
        const inicio = new Date();

        ordenanzas = await bajarJson('ordenanzas');
        ordenanzas = filtrarVigentes(ordenanzas);

        const textos = await bajarJson('textos');
        const palabras = {}
        textos.forEach(t => palabras[t.ordenanza] = t.palabras);

        ordenanzas.forEach(o => o.palabras = palabrasUnicas(` ${palabras[o.ordenanza]} ${o.asunto} ${o.ordenanza} ${o.estado} ${o.alcance} ${o.clasificacion}`));

        clasificacion = await bajarJson('clasificacion');

        console.log(`Hay ${ordenanzas.length} ordenanzas`);
        console.log(ordenanzas[0]);

        generarOrdenanzas(ordenanzas);

        const final = new Date();
        console.log(`Lista generada  ${final - inicio} ms`);
        instalar();
    });
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



