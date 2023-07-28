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
