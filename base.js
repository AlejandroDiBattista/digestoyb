const version = 'v0.22';
let modoClasificacion = false;
let demorar = null;
let criterio = "";

let ordenanzas = [];
let clasificaciones = [];

let plantillaOrdenanza = null;
let plantillaClasificacion = null;
let plantillaPagina = null;

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
    return `${palabra}`.replace("#","").padStart(4,"0")
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

function contieneIndice(o, indice) {
    indice = normalizarClasificacion(indice);
    return o.clasificacion.map(c => c.indice).some(i => i.startsWith(indice));
}

function contienePalabra(palabra, o) {
    if (palabra.startsWith("#") && (o.ordenanza == normalizarOrdenanza(palabra))) { // #xxx > Ordenanza
        return true;
    }
    
    if (esClasificacion(palabra) && contieneIndice(o, palabra)) {              // NN.NN => Clasificacion
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

const plantillas = {};

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
    ordenanzas = ordenanzas.slice(0, maximo);
    generar('plantilla-ordenanza', { "ordenanza": ordenanzas });
}

function generarClasificaciones(clasificaciones) {
    generar("plantilla-clasificacion", { "clasificacion": clasificaciones });
    mostrarEstado();
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
async function bajarJson(origen) {
    const response = await fetch(`./datos/${origen}.json`);
    return await response.json();
}

async function cargar() {
    await medir(async () => {
        ordenanzas = await bajarJson('ordenanzas');
        ordenanzas = filtrarVigentes(ordenanzas);

        clasificaciones = await bajarJson('clasificaciones');

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


async function bajarOrdenanza(ordenanza) {
    const origen = generarURL(ordenanza, 'html', true);
    console.log(`Bajar Ordenanza > ${origen}`);
    const parser = new DOMParser();
    const response = await fetch(origen);
    const htmlDoc = parser.parseFromString((await response.text()), 'text/html');
    return htmlDoc.body.innerHTML;
}

function ocultarTeclado() {
    const campo = document.getElementById('campoBusqueda');
    campo.blur();
}

function instalar() {
    console.log(`>> Estoy instalando. \n - Vengo de [${document.referrer}]\n - Estoy en [${window.location.search}]`);
 
    // busqueda.value = leerParametro(true);
    // buscar(busqueda.value);
    
    buscar('');
    const busqueda = document.getElementById('campoBusqueda');
    busqueda.addEventListener('input', () =>  buscar(busqueda.value));
    window.addEventListener('scroll', ocultarTeclado);
}

function mostrarClasificacion() {
    // document.querySelector("button.clasificacion").innerHTML = modoClasificacion ? "Ocultar Clasificación" : "Mostrar Clasificación";
}

function alterarClasificacion() {
    modoClasificacion = !modoClasificacion;
    // mostrarClasificacion();
    if (modoClasificacion) {
        generarClasificaciones(clasificaciones);
    } else {
        buscar("");
    }
}

function volver() {
    buscar("");
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
