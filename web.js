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
    invocarURL(url, '', true);
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
    let texto = html.body.innerHTML;
    fin();
    return texto;
}
