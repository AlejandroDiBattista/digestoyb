const version = 'v0.22';
let modoClasificacion = false;
let demorar = null;
let criterio = "";

let ordenanzas = [];
let clasificaciones = [];

let plantillaOrdenanza = null;
let plantillaClasificacion = null;

function sinAcento(texto) {
    const mapaAcentos = {
        'á': 'a','é': 'e','í': 'i','ó': 'o','ú': 'u',
        'Á': 'A','É': 'E','Í': 'I','Ó': 'O','Ú': 'U'
    };

    return texto.replace(/[áéíóúÁÉÍÓÚ]/g, (caracter) => mapaAcentos[caracter]);
}

function traducirMeses(cadena) {
    const mesesEnIngles = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const mesesEnEspañol = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

    for (let i = 0; i < mesesEnIngles.length; i++) {
        const expresionRegular = new RegExp(mesesEnIngles[i], 'gi');
        cadena = cadena.replace(expresionRegular, mesesEnEspañol[i]);
    }

    return cadena;
}

function allTrim(texto) {
    return texto.replace(/\s+/g," ").trim()
}

function comienzaConMayuscula(cadena) {
    const patron = /^[A-Z]/;
    return patron.test(cadena);
}

function esClasificacion(palabra) {
    palabra = allTrim(palabra);
    palabra = palabra.replace(/>(?=\d)/g, '.').replace(/[^0-9.>]/g, ""); 
    
    const valido = /^\d+(\.\d*)*$/;
    const comienza = /(^>\d|\d>$)/;

    return valido.test(palabra) || comienza.test(palabra);
}

function normalizarClasificacion(palabra) {
    if(!esClasificacion(palabra)) return palabra;
    
    palabra = allTrim(palabra);
    palabra = palabra.replace(/>(?=\d)/g, '.').replace(/[^0-9.]/g, "");

    const digitos   = palabra.split('.').filter(x => x.length > 0);
    const resultado = digitos.map(digito => digito.padStart(2, '0')).join('.');
    
    return resultado.trim();
}

function normalizarOrdenanza(palabra) {
    return palabra.replace("#","").padStart(4,"0")
}

function completarAño(texto) {
    return texto.replace(/([89]\d)$/g, "19$1").replace(/([012]\d)$/g, "20$1");
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

function contienePalabra(palabra, o) {
    if (palabra.startsWith("#") && (o.ordenanza == normalizarOrdenanza(palabra))) { // #xxx > Ordenanza
        return true;
    }
    
    if( esClasificacion(palabra) && expandirIndices(o.clasificacion.map(c => c.indice)).includes(normalizarClasificacion(palabra))) {              // NN.NN => Clasificacion
        return true;
    }
    
    if(palabra.startsWith(":")){                                                    // :xxx > Asunto
        return o.palabrasAsunto.includes(normalizarPalabra(palabra));
    }
        
    return o.palabrasTexto.includes(normalizarPalabra(palabra));
}

function filtrarCondicion(ordenanzas, condicion) {
    let palabras = simplificar(condicion).split(" ");
    let salida = ordenanzas.filter(o => palabras.every(palabra => contienePalabra(palabra, o)));

    return salida;
}

function sinRepetir(lista) {
    return [...new Set(lista)];
}

function palabrasUnicas(cadena) {
    const palabras = simplificar(cadena).split(' ');
    return sinRepetir(palabras).join(' ');
}

async function medir(operacion, titulo = "Ejecutando") {
    console.log(`> ${titulo}`);
    const inicio = new Date();
    await operacion();
    console.log(`| ${new Date() - inicio}ms`);
}

async function bajarJson(origen) {
    const response = await fetch(`./datos/${origen}.json`);
    return await response.json();
}

function cargarPlantilla(idPlantilla) {
    return Handlebars.compile(document.getElementById(idPlantilla).innerHTML);
}

function generarOrdenanzas(ordenanzas, maximo = 100) {
    ordenanzas = ordenanzas.slice(0, maximo);
    document.getElementById('cuerpo').innerHTML = plantillaOrdenanza({ "ordenanza": ordenanzas });
}

function generarClasificaciones() {
    document.getElementById('cuerpo').innerHTML = plantillaClasificacion({ "clasificacion": clasificaciones });
}

function mostrarEstado(ordenanzas) {
    const resultado = modoClasificacion ?
        "Elegir clasificación" :
            ordenanzas.length == 0 ?
                `No hay ordenanzas - ${version}` :
                `Hay ${ordenanzas.length} ${ordenanzas.length == 1 ? 'ordenanza' : 'ordenanzas'}`;
    
    document.getElementById("info").innerHTML = resultado;    
}

function buscar(condicion) {
    clearTimeout(demorar);
    modoClasificacion = false;
    mostrarClasificacion();
    
    const listado = filtrarCondicion(ordenanzas, condicion);
    mostrarEstado(listado);
    
    generarOrdenanzas(listado, 10);
    demorar = setTimeout(() => generarOrdenanzas(listado, 1000), 200);
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

function expandirIndices(indices) {     
    let salida = [];
    
    indices.forEach(indice => {
        let actual = '';
        indice.split('.').forEach(i => {
            actual += i;
            salida.push(actual);
            actual += '.';
        })
    });

    return sinRepetir(salida);
}

function expandirClasificacion(texto) {
    const indices = texto.split("|").map(c => c.split("=>"));
    return indices.map(indice => ({ "indice": normalizarClasificacion(indice[0]), "descripcion": allTrim(indice[1]) }));
}

function completarOrdenanzas(textos) {
    const palabras = {}
    textos.forEach(t => palabras[t.ordenanza] = t.palabras);

    ordenanzas.forEach(o => {
        o.sancion = traducirMeses(o.sancion);
        o.palabrasAsunto = ` ${palabrasUnicas(o.asunto)} `;
        o.palabrasTexto  = palabrasUnicas(` ${palabras[o.ordenanza]} ${o.asunto} ${o.ordenanza} ${o.estado} ${o.alcance} `);
        o.clasificacion  = expandirClasificacion(o.clasificacion || "");
    });

    console.log(ordenanzas[0]);
}

function completarClasificaciones() {
    let total = {};
    ordenanzas.forEach(o => {
        let indices = o.clasificacion.map(c => c.indice);
        expandirIndices(indices).forEach(indice => total[indice] = (total[indice] || 0) + 1);
    });
    
    clasificaciones.forEach(clasificacion => {
        clasificacion.cantidad = total[clasificacion.indice] || 0;
        clasificacion.nivel = clasificacion.indice.split(".").length;
    });
}

async function cargar() {
    await medir(async () => {
        ordenanzas = await bajarJson('ordenanzas');
        ordenanzas = filtrarVigentes(ordenanzas);

        const textos = await bajarJson('textos');
        completarOrdenanzas(textos);

        clasificaciones = await bajarJson('clasificacion');
        completarClasificaciones();

        plantillaOrdenanza = cargarPlantilla("plantilla-ordenanza");
        plantillaClasificacion = cargarPlantilla("plantilla-clasificacion");

        instalar();
        buscar('');
    });
}

async function cargarPagina(numero) {
    const origen = "./html/" + numero.padStart(4, "0") + ".html";
    const parser = new DOMParser();
    const response = await fetch(origen);
    const htmlDoc = parser.parseFromString((await response.text()), 'text/html');
    document.getElementById("cuerpo").innerHTML = `<div id="marco"><button class="clasificacion volver" onclick="volver()"> ◀ Volver </button>${htmlDoc.body.innerHTML}</div>`;
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
}

function mostrarClasificacion() {
    document.querySelector("button.clasificacion").innerHTML = modoClasificacion ? "Ocultar Clasificación" : "Mostrar Clasificación";
}

function alterarClasificacion() {
    modoClasificacion = !modoClasificacion;
    mostrarClasificacion();
    if (modoClasificacion) {
        generarClasificaciones();
    } else {
        buscar("");
    }
}

function volver() {
    buscar("");
}