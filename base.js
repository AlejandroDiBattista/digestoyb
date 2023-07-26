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
    document.getElementById('cuerpo').innerHTML = plantilla(datos);
}

function generarOrdenanzas(ordenanzas, maximo = 100) {
    ordenanzas = ordenanzas.slice(0, maximo);
    generar('plantilla-ordenanza', { "ordenanza": ordenanzas });
}

function generarClasificaciones(clasificaciones) {
    generar("plantilla-clasificacion", { "clasificacion": clasificaciones });
}

async function generarPagina(ordenanza) {
    const pagina = await bajarOrdenanza(ordenanza);
    generar("plantilla-pagina", { "ordenanza": ordenanza, "cuerpo": pagina });    
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

function enviarWhatsapp(ordenanza) {
    let texto = `
    *Digesto digital Yerba Buena*

    Bajar la ordenanza ${ordenanza} de ${generarURL(ordenanza,'pdf')}`;
    texto = allTrim(texto).replace(/ +/g, '%20');

    return `https://api.whatsapp.com/send/?text=${texto}&type=custom_url&app_absent=0`;
}

function descargarJSONEnMemoria(jsonData, nombreArchivo) {
    // Crear el contenido JSON como texto
    const contenidoJSON = JSON.stringify(jsonData);

    // Crear un Blob con el contenido del JSON
    const blob = new Blob([contenidoJSON], { type: 'application/json' });

    // Crear un enlace para el archivo Blob
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombreArchivo;

    // Simular un clic en el enlace para descargar el archivo
    document.body.appendChild(enlace);
    enlace.click();

    // Limpiar el objeto URL y remover el enlace
    URL.revokeObjectURL(url);
    document.body.removeChild(enlace);
}

function descargarPDF(ordenanza) {
    const url = generarURL(ordenanza, 'pdf');
    // Crear un enlace simulado para el PDF
    const enlacePDF = document.createElement('a');
    enlacePDF.href = url;
    enlacePDF.target = '_blank'; // Para que se abra en una nueva pestaña (opcional)
    enlacePDF.download = `${normalizarOrdenanza(ordenanza)}.pdf`; // Nombre del archivo al descargar (puedes cambiarlo)

    // Simular un clic en el enlace para iniciar la descarga del PDF
    enlacePDF.click();
}

