function sinAcento(texto) {
    const mapaAcentos = {
        'á': 'a','é': 'e','í': 'i','ó': 'o','ú': 'u',
        'Á': 'A','É': 'E','Í': 'I','Ó': 'O','Ú': 'U'
    };

    return texto.replace(/[áéíóúÁÉÍÓÚ]/g, (caracter) => mapaAcentos[caracter]);
}

function esClasificacion(palabra) {
    const formatoValido = /^\d+(\.\d+)*$/;
    return formatoValido.test(palabra);
}

function comienzaConMayuscula(cadena) {
    const patron = /^[A-Z]/;
    return patron.test(cadena);
}

function normalizarClasificacion(palabra) {
    if(esClasificacion(palabra)) return palabra;
    
    const digitos = palabra.split('.');
    const resultado = digitos.map(digito => digito.padStart(2, '0')).join('.');
    return resultado;
  }
  
function normalizarPalabra(palabra) {
    if(palabra.startsWith(":")) palabra = palabra.substring(1);
    if(comienzaConMayuscula(palabra)) palabra += ' ';
    return ` ${simplificar(palabra)}`;
}

function simplificar(texto) {
    return sinAcento(texto.toLowerCase());
}

function filtrarVigentes(ordenanzas) {
    return ordenanzas.filter(o => o.estado == "Vigente" && o.alcance == "General")
}

function contiene(palabra, o) {
    if(o.clasificacion.startsWith(normalizarClasificacion(palabra))) {
        return true;
    }
    
    if(palabra.startsWith(":")){
        return simplificar(` ${o.asunto} `).includes(normalizarPalabra(palabra));
    }
        
    return o.palabras.includes(normalizarPalabra(palabra));
}

function filtrarCondicion(ordenanzas, condicion) {
    let palabras = simplificar(condicion).split(" ");
    let salida = ordenanzas.filter(o => palabras.every(palabra => contiene(palabra, o)));
    return salida;
}

function palabrasUnicas(cadena) {
    const palabras = simplificar(cadena).split(' ');
    const palabrasUnicas = [...new Set(palabras)];
    return palabrasUnicas.join(' ');
}

async function medir(operacion, titulo = "Ejecutando") {
    console.log(`> ${titulo}`);
    const inicio = new Date();
    await operacion();
    console.log(`| ${new Date() - inicio}ms`);
}

var ordenanzas = [];
var clasificacion = [];

async function bajarJson(origen) {
    const response = await fetch(`./datos/${origen}.json`);
    return await response.json();
}

function generarOdenanza(o) {
    return `
        <div class="tarjeta">
            <a href="pdf/${o.ordenanza}.pdf">
                <div class="linea">
                    <div class="campo destacar">
                        <label>Ordenanza</label>
                        <span>${o.ordenanza}</span>
                    </div>
                    <div class="campo destacar">
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

function generarOrdenanzas(ordenanzas, maximo=100) {
    const inicio = new Date();

    var html = "";
    ordenanzas.slice(0, maximo).forEach(o => html += generarOdenanza(o));
    document.getElementById('lista').innerHTML = html;

    const resultado = ordenanzas.length == 0 ? 'No hay ordenanzas que cumpla los criterio de busqueda' : `Hay ${ordenanzas.length} ordenanzas (${(new Date()) - inicio} ms)`;
    document.getElementById("medir").innerHTML = resultado;
    console.log(resultado);
}

var demorar;
function buscar(condicion) {
    clearTimeout(demorar);
    const listado = filtrarCondicion(ordenanzas, condicion);

    generarOdenanza(listado, 10);
    demorar = setTimeout(() => generarOrdenanzas(listado, 1000), 100);
    escribirParametro(condicion);
}

function leerParametro(historia=false) {
    const origen = historia ? document.referrer : window.location.search;
    const parametros = new URLSearchParams(origen);
    return parametros.get('buscar');
}

function escribirParametro(valor){
    const nuevaUrl = `${window.location.pathname}?buscar=${valor}`;
    window.history.replaceState({}, '', nuevaUrl);
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

        generarOrdenanzas(ordenanzas);
        
        const final = new Date();
        console.log(`>> Hay ${ordenanzas.length} ordenanzas en ${final - inicio}ms`);

        instalar();
    });
}

function instalar() {
    console.log(`>> Estoy instalando. \n - Vengo de [${document.referrer}]\n - Estoy en [${window.location.search}]`);
 
    const campoBusqueda = document.getElementById('campoBusqueda');
    campoBusqueda.value = leerParametro(true);
    buscar(campoBusqueda.value);
    
    campoBusqueda.addEventListener('input', function () {
        const condicion = campoBusqueda.value;
        buscar(condicion);
    });

 
    window.addEventListener('popstate', function (event) {
        const condicion = campoBusqueda.value;
        console.log("Estoy regresando de la pagina siguiente");
        buscar(condicion);
    });
      
}