// import { medir, mostrar, fin } from './medir.js';

const version = 'v0.5';

let busqueda = null;
let demorar = null;

let ordenanzas = [];
let clasificaciones = [];

let actual = "";
let anterior = "";

function generalizarVocales(texto) {
    return texto
        .replaceAll(/[aá]/gi, "[aá]")
        .replaceAll(/[eé]/gi, "[eé]")
        .replaceAll(/[ií]/gi, "[ií]")
        .replaceAll(/[oó]/gi, "[oó]")
        .replaceAll(/[uú]/gi, "[uú]")
}

String.prototype.sinAcento = function sinAcento() {
    const mapaAcentos = {
        'á': 'a','é': 'e','í': 'i','ó': 'o','ú': 'u',
        'Á': 'A','É': 'E','Í': 'I','Ó': 'O','Ú': 'U'
    };

    return this.replace(/[áéíóúÁÉÍÓÚ]/g, (caracter) => mapaAcentos[caracter]);
}

String.prototype.simplificar = function () {
    return this.toLowerCase().sinAcento();
}

String.prototype.allTrim = function () {
    return this.replace(/\s+/g, " ").trim();
};

function traducirMeses(cadena) {
    const mesesEnIngles = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const mesesEnEspañol = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

    for (let i = 0; i < mesesEnIngles.length; i++) {
        const expresionRegular = new RegExp(mesesEnIngles[i], 'gi');
        cadena = cadena.replace(expresionRegular, mesesEnEspañol[i]);
    }

    cadena = cadena.replace(/-/g, "/");
    return cadena;
}

function completarAño(texto) {
    return texto.replace(/([89]\d)$/g, "19$1").replace(/([012]\d)$/g, "20$1");
}

function comienzaConMayuscula(palabra) {
    const patron = /^[A-Z]/;
    return patron.test(palabra);
}

function esNumero(palabra) {
    const patron = /^[0-9]$/;
    return patron.test(palabra);
}

function esOrdenanza(palabra) {
    palabra = palabra.allTrim();
    const valido = /^#\d+$/;
    return valido.test(palabra);
}

function esClasificacion(palabra) {
    palabra = palabra.allTrim();
    palabra = palabra.replace(/(?=\d)>/g, '.').replace(/[^0-9.>]/g, ""); 
    
    const valido = /^\d+(\.\d*)*$/;
    const comienza = /(^>\d|\d>$)/;

    return valido.test(palabra) || comienza.test(palabra);
}

function esSoloOrdenanzaValida(texto) {
    if (!esOrdenanza(texto)) return false;

    const ordenanza = normalizarOrdenanza(texto);

    return ordenanzas.some(o => o.ordenanza == ordenanza);
}

// Mediciones
let mediciones = [];

function medir(titulo = "Ejecutando") {
    mostrar(`> ${titulo}`);
    mediciones.push(new Date());
}

function mostrar(...parametros) {
    const nivel = '   '.repeat(mediciones.length);
    console.log(nivel, ...parametros);
}

function fin() {
    const inicio = mediciones.pop();
    mostrar(`| ${new Date() - inicio}ms`);
}

// WEB
const plantillas = {};

async function cargarJson(origen) {
    const response = await fetch(`./datos/${origen}.json`);
    return await response.json();
}

async function cargarOrdenanza(ordenanza) {
    const origen = generarUrl(ordenanza, 'html', true);
    const parser = new DOMParser();
    const response = await fetch(origen);
    const html = parser.parseFromString((await response.text()), 'text/html');
    let texto = html.body.innerHTML;

    return texto;
}

function cargarPlantilla(Plantilla) {
    plantillas[Plantilla] ||= Handlebars.compile(document.getElementById(Plantilla).innerHTML);
    return plantillas[Plantilla];
}

// permite que el usuario baje un archivo

function enviarWhatsapp(ordenanza, asunto) {
    let texto = `
*Digesto Digital Yerba Buena*

Ordenanza N° ${ordenanza}

__${asunto}__

${generarUrl(ordenanza, 'pdf')}`;

    texto = encodeURIComponent(texto);
    url = `https://api.whatsapp.com/send/?text=${texto}&type=custom_url&app_absent=0`;

    invocarUrl(url, '', true);
}

function descargarJson(json, destino) {
    const contenidoJSON = JSON.stringify(json);

    const blob = new Blob([contenidoJSON], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    invocarUrl(url, destino, false);

    URL.revokeObjectURL(url);
}

function descargarPdf(ordenanza) {
    ordenanza = normalizarOrdenanza(ordenanza)
    const url = generarUrl(ordenanza, 'pdf');
    invocarUrl(url, `${ordenanza}.pdf`, true);
}

function generarUrl(ordenanza, tipo, local = false) {
    const base = local ? "." : 'https://digestoyb.netlify.app';

    // ordenanza = normalizarOrdenanza(ordenanza);
    tipo = tipo.toLowerCase();

    return `${base}/${tipo}/${ordenanza}.${tipo}`;
}

function invocarUrl(url, destino = null, abrir = false) {
    const enlace = document.createElement('a');

    enlace.href = url;
    if (destino) enlace.download = destino;
    if (abrir) enlace.target = "_blank"

    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
}

function esSoloClasificacion(texto) {
    return /^\s*[>.]+\s*$/.test(texto);
}

function normalizarClasificacion(palabra) {
    if(!esClasificacion(palabra)) return palabra;
    
    palabra = palabra.allTrim();
    palabra = palabra.replace(/>/g, '.').replace(/[^0-9.]/g, "");

    const digitos   = palabra.split('.').filter(x => x.length > 0);
    const resultado = digitos.map(digito => digito.padStart(2, '0')).join('.');
    
    return resultado.trim();
}

function normalizarOrdenanza(palabra) {
    return `${palabra}`.replace("#","").padStart(4,"0")
}

function normalizarPalabra(palabra) {
    if(palabra.startsWith(":")) palabra = palabra.substring(1);

    if(comienzaConMayuscula(palabra) || esNumero(palabra)) palabra += ' ';

    return ` ${palabra.simplificar()}`;
}

function filtrarVigentes(ordenanzas) {
    return ordenanzas.filter(o => o.estado == "Vigente" && o.alcance == "General")
}

function contieneIndice(o, indice) {
    indice = normalizarClasificacion(indice);
    return o.clasificacion.map(c => c.indice).some(i => i.startsWith(indice));
}

function contienePalabra(o, palabra) {
    if (esOrdenanza(palabra) && (o.ordenanza == normalizarOrdenanza(palabra))) {    // #xxx > Ordenanza
        return true;
    }
    
    if (esClasificacion(palabra) && contieneIndice(o, palabra)) {                   // NN.NN => Clasificacion
        return true;
    }
    
    if(palabra.startsWith(":")){                                                    // :xxx > Asunto
        return o.palabrasAsunto.includes(normalizarPalabra(palabra));
    }

    return o.palabrasTexto.includes(normalizarPalabra(palabra));
}

function filtrarCondicion(ordenanzas, condicion) {
    let palabras = condicion.simplificar().split(" ");
    let salida = ordenanzas.filter(o => palabras.every(palabra => contienePalabra(o, palabra)));

    return salida;
}

function sinRepetir(lista) {
    return [...new Set(lista)];
}

function palabrasUnicas(cadena) {
    const palabras = cadena.simplificar().split(' ');
    return sinRepetir(palabras).join(' ');
}

function rellenarPlantilla(platilla, datos) {
    scrollInicio();
    const cuerpo = document.getElementById('cuerpo'); 
    const conversor = cargarPlantilla(platilla);
    const html = conversor(datos);
    if (!document.startViewTransition) {
        cuerpo.innerHTML = html;
    } else {
        document.startViewTransition(() => cuerpo.innerHTML = html);
    }
}

function generar(condicion, ordenanzas) {
    if (esSoloClasificacion(condicion)) {
        generarClasificaciones(clasificaciones);
    } else if (esSoloOrdenanzaValida(condicion)) {
        generarPagina(normalizarOrdenanza(condicion));
    } else {
        generarOrdenanzas(condicion, ordenanzas);
    }
}

function generarOrdenanzas(condicion, ordenanzas) {
    ordenanzas.forEach(o => o.resaltado = resaltarPalabrasEnTexto(o.asunto, condicion) || o.asunto);
    rellenarPlantilla('plantilla-ordenanza', { "ordenanza": ordenanzas });
    mostrarEstado(ordenanzas);
}

function generarClasificaciones(clasificaciones) {
    rellenarPlantilla("plantilla-clasificacion", { "clasificacion": clasificaciones });
    mostrarEstado([], false);
}

async function generarPagina(ordenanza) {
    const pagina = await cargarOrdenanza(ordenanza);
    rellenarPlantilla("plantilla-pagina", { "ordenanza": ordenanza, "cuerpo": pagina });    
    setTimeout(() => alinearVolver(), 100);
    setTimeout(() => resaltarPalabras("#pagina", anterior), 200);
}

function generarNavegacion() {
    mostrar(`Generar Navegación: ${marcaActual}/${marcas}`)
    if (marcas == 0) return `<div id='navegacion'></div>`;
    return `
<div id='navegacion'>
    ${marcaActual + 1}/${marcas}
    <button onclick="irMarcaAnterior()"  class="minimo"><i class="bi bi-chevron-up"></i></button>
    <button onclick="irMarcaSiguiente()" class="minimo"><i class="bi bi-chevron-down"></i></button>
</div>`;
}

function mostrarEstado(ordenanzas, navegar = false) {
    const navegacion = generarNavegacion(marcaActual, marcas);
    mostrar(`Mostrar Estado > ${navegacion}`);
    const resultado = navegar ? navegacion : ordenanzas.length == 0 ?
        `No hay ordenanzas - ${version}` :
        `Hay ${ordenanzas.length} ${ordenanzas.length == 1 ? 'ordenanza' : 'ordenanzas'}`;
    
    document.getElementById("info").innerHTML = resultado;
}

async function cargar() {
    medir("Cargando datos");

    ordenanzas = await cargarJson('ordenanzas');
    ordenanzas = filtrarVigentes(ordenanzas);

    clasificaciones = await cargarJson('clasificaciones');
    clasificaciones = clasificaciones.filter(c => c.cantidad > 0);

    fin();
    
    instalar();
}

function instalar() {
    busqueda = document.getElementById('campoBusqueda');

    busqueda.addEventListener('input', () => buscar(busqueda.value));
    busqueda.addEventListener('focus', () => busqueda.select());

    window.addEventListener('scroll', () => busqueda.blur());
    window.addEventListener('resize', () => alinearVolver());
   
    buscar(leerParametro());
}


function buscar(condicion) {
    actual = condicion;
    busqueda.value = condicion;
    escribirParametro(condicion);
    
    const listado = filtrarCondicion(ordenanzas, condicion);
    mostrar(`EsOrdenanza: ${esSoloOrdenanzaValida(condicion) ? "SI" : "NO"} clasificacion: ${esSoloClasificacion(condicion) ? "SI" : "NO"}`  )
    
    clearTimeout(demorar);
    demorar = setTimeout(() => generar(condicion, listado), 50);
}

function alterarClasificacion() {
    if (esSoloClasificacion(actual)) {
        volver();
    } else {
        irClasificacion();
    }
}

function irOrdenanza(ordenanza) {
    anterior = busqueda.value;
    buscar(`#${normalizarOrdenanza(ordenanza)}`);
}

function irClasificacion() {
    anterior = busqueda.value;
    buscar(".");
}

function volver() {
    buscar(anterior);
    anterior = "";
    busqueda.focus();
}

function scrollInicio() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function leerParametro(historia = false) {
    const origen = historia ? document.referrer : window.location.search;
    const parametros = new URLSearchParams(origen);
    return parametros.get('buscar') || "";
}

function escribirParametro(valor) {
    const url = `${window.location.pathname}?buscar=${encodeURIComponent(valor)}`;
 
    window.history.replaceState({}, '', url);
}

function resaltarPalabras(selector, palabras, tag = 'mark') {
    marcas = 0;    
    const elementos = document.querySelectorAll(`${selector} *`);
    
    let n = 0;
    elementos.forEach(elemento => {
        const texto = resaltarPalabrasEnTexto(elemento.innerHTML, palabras);
        if (texto) {
            elemento.innerHTML = texto;
        }
    });

    const tags = document.querySelectorAll(".tag");
    marcas = tags.length;
    mostrarEstado([], true);

    fin();
}

function resaltarPalabrasEnTexto(texto, palabras, tag = 'mark') {
    palabras = palabras.allTrim().split(" ");
    palabrasLargas = palabras.filter(palabra => palabra.length > 2);

    if (palabrasLargas.length == 0) return null;

    palabras = palabras.map(x => `\\b${generalizarVocales(x)}\\b`);
    const buscarOrdenando  = new RegExp(`(${palabras.join("\\s+")})`, 'gi');
    
    if (buscarOrdenando.test(texto)) {
        return texto.replace(buscarOrdenando, x => `<${tag} class='tag' id='ir${++marcas}'>${x}<sup>${marcas}</sup></${tag}>`);
    } else {
        palabrasLargas = palabrasLargas.map(x => `\\b${generalizarVocales(x)}\\b`);
        const buscarDesordenado = new RegExp(`(${palabrasLargas.join("|")})`, 'gi');        
        if (buscarDesordenado.test(texto)) {
            return texto.replace(buscarDesordenado, x => `<${tag}>${x}</${tag}>`);
        }
    }

    return null;
}

let marcas = 0;
let marcaActual = 0;

function irArriba() {
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function irMarcaSiguiente() {
    irMarca(marcaActual + 1);
}

function irMarcaAnterior() {
    irMarca(marcaActual - 1);
}

function irMarca(marca) {
    const actual = document.querySelectorAll("mark.tag.actual")
    actual.forEach(x => x.className = "tag");

    const tags = document.querySelectorAll(".tag");
    marcas = tags.length;
    if (marcas == 0) return;

    marca = (marca + marcas) % marcas;
    const item = tags[marca];
    
    item.scrollIntoView(false);
    item.className += ' actual';

    marcaActual = marca;
    mostrarEstado([], true);
}

function listarMarcas() {
    medir(`Listado de Marcas x ${marcas}`)
    for (let m = 1; m < marcas; m++){
        const id = `ir${m}`;
        let elemento = document.getElementById(id);
        const r = elemento.getBoundingClientRect();
        mostrar(`marca : ${id} top : ${r.top} y :${r.y}`)
    }
    fin();
}

function alinearVolver() {
    const cabecera = document.getSelection("nav");
    const cuerpo = document.getElementById("cuerpo");
    const volver = document.getElementById("volver");
    const arriba = document.getElementById("arriba");
    
    if (volver == null || arriba == null) return;

    const top = cabecera.clientHeight + 16;
    const left = cuerpo.getBoundingClientRect().left - 16;
    const right = left + cuerpo.clientWidth - 32 - 8;
    
    mostrar(`Alineando boton ARRIBA > ${right} | ${cuerpo.getBoundingClientRect().right}`);

    volver.style.marginLeft = `${left}px`;
    volver.style.marginTop = `${top}px`;

    arriba.style.marginLeft = `${right}px`;
}