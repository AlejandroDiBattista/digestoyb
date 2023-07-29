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

function enviarWhatsapp(ordenanza) {
    let texto = `
*Digesto Digital Yerba Buena*
    
Bajar la ordenanza ${ordenanza} de 
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
    const url = generarUrl(ordenanza, 'pdf');
    invocarUrl(url, `${normalizarOrdenanza(ordenanza)}.pdf`, true);
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
    if (abrir)   enlace.target = "_blank"

    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
}
