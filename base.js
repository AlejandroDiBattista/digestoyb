const version = 'v0.3';
let modoClasificacion = false;

let busqueda = null;
let demorar = null;
let criterio = "";
const plantillas = {};

let ordenanzas = [];
let clasificaciones = [];

let mediciones = [];

let actual = "";
let anterior = "";

function sinAcento(texto) {
    const mapaAcentos = {
        'á': 'a','é': 'e','í': 'i','ó': 'o','ú': 'u',
        'Á': 'A','É': 'E','Í': 'I','Ó': 'O','Ú': 'U'
    };

    return texto.replace(/[áéíóúÁÉÍÓÚ]/g, (caracter) => mapaAcentos[caracter]);
}

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

function allTrim(texto) {
    return texto.replace(/\s+/g," ").trim()
}

function comienzaConMayuscula(cadena) {
    const patron = /^[A-Z]/;
    return patron.test(cadena);
}

function esNumero(cadena) {
    const patron = /^[0-9]$/;
    return patron.test(cadena);
}

function esOrdenanza(palabra) {
    palabra = allTrim(palabra);

    const valido = /^#\d+$/;

    return valido.test(palabra);
}

function esClasificacion(palabra) {
    palabra = allTrim(palabra);
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

function esSoloClasificacion(texto) {
    return /^\s*[>.]+\s*$/.test(texto);
}

function normalizarClasificacion(palabra) {
    if(!esClasificacion(palabra)) return palabra;
    
    palabra = allTrim(palabra);
    palabra = palabra.replace(/>/g, '.').replace(/[^0-9.]/g, "");

    const digitos   = palabra.split('.').filter(x => x.length > 0);
    const resultado = digitos.map(digito => digito.padStart(2, '0')).join('.');
    
    return resultado.trim();
}

function normalizarOrdenanza(palabra) {
    return `${palabra}`.replace("#","").padStart(4,"0")
}

function completarAño(texto) {
    return texto.replace(/([89]\d)$/g, "19$1").replace(/([012]\d)$/g, "20$1");
}

function normalizarPalabra(palabra) {
    if(palabra.startsWith(":")) palabra = palabra.substring(1);

    if(comienzaConMayuscula(palabra) || esNumero(palabra)) palabra += ' ';

    return ` ${simplificar(palabra)}`;
}

function simplificar(texto) {
    return sinAcento(texto.toLowerCase());
}

function filtrarVigentes(ordenanzas) {
    return ordenanzas.filter(o => o.estado == "Vigente" && o.alcance == "General")
}

function contieneIndice(o, indice) {
    indice = normalizarClasificacion(indice);
    return o.clasificacion.map(c => c.indice).some(i => i.startsWith(indice));
}

function contienePalabra(palabra, o) {
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

function cargarPlantilla(idPlantilla) {
    plantillas[idPlantilla] ||= Handlebars.compile(document.getElementById(idPlantilla).innerHTML); 
    return plantillas[idPlantilla];
}

function generar(idPlatilla, datos) {
    const plantilla = cargarPlantilla(idPlatilla);
    const html = plantilla(datos);
    if (!document.startViewTransition) {
        document.getElementById('cuerpo').innerHTML = html;
    } else {
        document.startViewTransition(() => document.getElementById('cuerpo').innerHTML = html);
    }
    scrollInicio();
}

function generarOrdenanzas(ordenanzas, maximo = 100) {
    medir(`Generar ordenanzas x ${maximo}`);
    ordenanzas = ordenanzas.slice(0, maximo);
    generar('plantilla-ordenanza', { "ordenanza": ordenanzas });
    fin();
}

function generarClasificaciones(clasificaciones) {
    generar("plantilla-clasificacion", { "clasificacion": clasificaciones });
    mostrarEstado([]);
}

async function generarPagina(ordenanza) {
    const pagina = await bajarOrdenanza(ordenanza);
    generar("plantilla-pagina", { "ordenanza": ordenanza, "cuerpo": pagina });    
}

function mostrarEstado(ordenanzas) {
    const resultado = modoClasificacion ?
        "" :
            ordenanzas.length == 0 ?
                `No hay ordenanzas - ${version}` :
                `Hay ${ordenanzas.length} ${ordenanzas.length == 1 ? 'ordenanza' : 'ordenanzas'}`;
    
    document.getElementById("info").innerHTML = resultado;    
}

async function bajarJson(origen) {
    const response = await fetch(`./datos/${origen}.json`);
    return await response.json();
}

async function bajarOrdenanza(ordenanza) {
    const origen = generarURL(ordenanza, 'html', true);
    medir(`Bajar Ordenanza > ${origen}`);
    const parser = new DOMParser();
    const response = await fetch(origen);
    const html = parser.parseFromString((await response.text()), 'text/html');
    fin();
    return html.body.innerHTML;
}

async function cargar() {
    medir("Cargando datos");

    ordenanzas = await bajarJson('ordenanzas');
    ordenanzas = filtrarVigentes(ordenanzas);

    clasificaciones = await bajarJson('clasificaciones');
    clasificaciones = clasificaciones.filter(c => c.cantidad > 0);

    fin();
    
    instalar();
}


function generarURL(ordenanza, tipo, local = false) {
    const base = local ? "." : 'https://digestoyb.netlify.app';

    ordenanza = normalizarOrdenanza(ordenanza);
    tipo = tipo.toLowerCase();

    return `${base}/${tipo}/${ordenanza}.${tipo}`;
}

function invocarURL(url, destino=null, abrir=false) {
    const enlace = document.createElement('a');
    
    enlace.href = url;
    if (destino) {
        enlace.download = destino;
    }
    if (abrir) {
        enlace.target = "_blank"
    }

    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);    
}

function descargarJSON(json, destino) {
    const contenidoJSON = JSON.stringify(json);

    const blob = new Blob([contenidoJSON], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    invocarURL(url, destino, false);

    URL.revokeObjectURL(url);
}

function descargarPDF(ordenanza) {
    const url = generarURL(ordenanza, 'pdf');
    invocarURL(url, `${normalizarOrdenanza(ordenanza)}.pdf`, true);
}

function enviarWhatsapp(ordenanza) {
    let texto = `*Digesto digital Yerba Buena*
    
    Bajar la ordenanza ${ordenanza} de ${generarURL(ordenanza, 'pdf')}`;
    texto = encodeURIComponent(texto);

    url = `https://api.whatsapp.com/send/?text=${texto}&type=custom_url&app_absent=0`;
    invocarURL(url,'',true);
}

function scrollInicio() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function instalar() {
    busqueda = document.getElementById('campoBusqueda');

    busqueda.addEventListener('input', () => buscar(busqueda.value));
    busqueda.addEventListener('focus', () => busqueda.select());

    window.addEventListener('scroll', () => busqueda.blur());
   
    buscar(leerParametro());
}

function generarInteligente(condicion, ordenanzas) {
    if (esSoloClasificacion(condicion)) { 
        generarClasificaciones(clasificaciones);
    } else if (esSoloOrdenanzaValida(condicion)) {
        generarPagina(normalizarOrdenanza(condicion));
    } else {
        generarOrdenanzas(ordenanzas, 1000);
    }
}

function buscar(condicion) {
    actual = condicion;
    busqueda.value = condicion;
    clearTimeout(demorar);

    modoClasificacion = false;

    const listado = filtrarCondicion(ordenanzas, condicion);
    mostrar(`EsOrdenanza: ${esSoloOrdenanzaValida(condicion) ? "SI" : "NO"} clasificacion: ${esSoloClasificacion(condicion) ? "SI" : "NO"}`  )

    mostrarEstado(listado);

    demorar = setTimeout(() => generarInteligente(condicion, listado), 50);
    escribirParametro(condicion);
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

function alterarClasificacion() {
    if (esSoloClasificacion(actual)) {
        volver();
    } else {
        irClasificacion();
    }
}

function irOrdenanza(ordenanza) {
    anterior = busqueda.value;
    buscar("#" + normalizarOrdenanza(ordenanza));
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
