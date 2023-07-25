const version = 'v0.22';
let modoClasificacion = false;
let demorar = null;
let criterio = "";
let ordenanzas = [];
let clasificaciones = [];
let plantillaOrdenanza = "";

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

function contiene(palabra, o) {
    if (palabra.startsWith("#") && (o.ordenanza == normalizarOrdenanza(palabra))) { // #xxx > Ordenanza
        return true;
    }
    
    if( esClasificacion(palabra) && extraerIndices(o.clasificacion).includes(normalizarClasificacion(palabra))) {              // NN.NN => Clasificacion
        return true;
    }
    
    if(palabra.startsWith(":")){                                                    // :xxx > Asunto
        return o.palabrasAsunto.includes(normalizarPalabra(palabra));
    }
        
    return o.palabrasTexto.includes(normalizarPalabra(palabra));
}

function filtrarCondicion(ordenanzas, condicion) {
    let palabras = simplificar(condicion).split(" ");
    let salida = ordenanzas.filter(o => palabras.every(palabra => contiene(palabra, o)));

    return salida;
}

function sinRepeatir(lista) {
    return [...new Set(lista)];
}

function palabrasUnicas(cadena) {
    const palabras = simplificar(cadena).split(' ');
    return sinRepeatir(palabras).join(' ');
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

function rellenarPlantilla(plantilla, dato) {
    for (let campo in dato) {
        plantilla = plantilla.replace(`{{${campo}}}`, dato[campo]);
    }
    return plantilla;
}

function generarOdenanza(o) {
    return plantillaOrdenanza(o);
}

function mostrarEstado(ordenanzas) {
    const resultado = modoClasificacion ?
        "Elegir clasificación" :
            ordenanzas.length == 0 ?
                `No hay ordenanzas - ${version}` :
                `Hay ${ordenanzas.length} ${ordenanzas.length == 1 ? 'ordenanza' : 'ordenanzas'}`;
    
    document.getElementById("info").innerHTML = resultado;    
}

function generarOrdenanzas(ordenanzas, maximo = 100) {
    ordenanzas = ordenanzas.slice(0, maximo);
    document.getElementById('cuerpo').innerHTML = plantillaOrdenanza({"ordenanza": ordenanzas});
}

function generarClasificacion(clasificacion) {
    let { indice, descripcion, cantidad } = clasificacion;
    let nivel = indice.split(".").length;
    let subIndice = indice.split(".")[nivel - 1];
    return `
        <button class="nivel_${nivel}" onclick="buscar('${indice}>')">
            <span><b>${indice}</b> ${descripcion}</span> <i>${cantidad || ""}</i>
        </button>
    `;
}

function generarClasificaciones() {
    let html = "";
    clasificaciones.forEach(c => html += generarClasificacion(c));
    document.getElementById('cuerpo').innerHTML = `<div id="clasificacion">${html}</div>`;
}

function buscar(condicion) {
    clearTimeout(demorar);
    modoClasificacion = false;
    mostrarClasificacion();
    
    const listado = filtrarCondicion(ordenanzas, condicion);
    mostrarEstado(listado);
    
    generarOdenanza(listado, 10);
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

function extraerIndices(indices) {     
    let salida = [];
    indices.forEach(entrada => {
        let { indice, descripcion } = entrada;
        let actual = '';

        indice.split('.').forEach(i => {
            actual += i;
            salida.push(actual);
            actual += '.';
        });
    })
    return sinRepeatir(salida);
}

function contarClasificaciones() {
    let total = {};
    ordenanzas.forEach(o => {
        extraerIndices(o.clasificacion).forEach(indice => total[indice] = (total[indice] || 0) + 1)
    });

    clasificaciones.forEach(clasificacion => {
        clasificacion.cantidad = total[clasificacion.indice] || 0;
    });
}

function extraerClasificacion(texto) {
    const indices = texto.split("|").map(c => c.split("=>"));
    return indices.map(x => ({ "indice": normalizarClasificacion(x[0]), "descripcion": allTrim(x[1]) }));
}

async function cargar() {
    await medir(async () => {
        const inicio = new Date();

        ordenanzas = await bajarJson('ordenanzas');
        ordenanzas = filtrarVigentes(ordenanzas);

        const textos = await bajarJson('textos');
        const palabras = {}
        textos.forEach(t => palabras[t.ordenanza] = t.palabras);
        ordenanzas.forEach(o => {
            // o.sancion = completarAño(o.sancion);
            o.sancion = traducirMeses(o.sancion);
            o.palabrasAsunto = ` ${palabrasUnicas(o.asunto)} `;
            o.palabrasTexto = palabrasUnicas(` ${palabras[o.ordenanza]} ${o.asunto} ${o.ordenanza} ${o.estado} ${o.alcance} `);
            o.clasificacion = extraerClasificacion(o.clasificacion || "");
        });

        clasificaciones = await bajarJson('clasificacion');
        contarClasificaciones();

        const final = new Date();
        console.log(`>> Hay ${ordenanzas.length} ordenanzas en ${final - inicio}ms`);

        plantillaOrdenanza = cargarPlantilla("plantilla-ordenanza");
        console.log(plantillaOrdenanza);
        instalar();
        buscar("");
    });
}

async function cargarPagina(numero) {
    console.log(`>> Cargando Pagina ${numero}`);

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