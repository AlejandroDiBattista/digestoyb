// function expandirClasificacion(texto) {
//     const indices = texto.split("|").map(c => c.split("=>"));
//     return indices.map(indice => ({ "indice": normalizarClasificacion(indice[0]), "descripcion": allTrim(indice[1]) }));
// }

// function completarOrdenanzas(textos) {
//     const palabras = {}
//     textos.forEach(t => palabras[t.ordenanza] = t.palabras);

//     ordenanzas.forEach(o => {
//         o.sancion = traducirMeses(o.sancion);
//         o.palabrasAsunto = ` ${palabrasUnicas(o.asunto)} `;
//         o.palabrasTexto = palabrasUnicas(` ${palabras[o.ordenanza]} ${o.asunto} ${o.ordenanza} ${o.estado} ${o.alcance} `);
//         o.clasificacion = expandirClasificacion(o.clasificacion || "");
//     });

//     console.log(ordenanzas[0]);
// }

// function completarClasificaciones() {
//     let total = {};
//     ordenanzas.forEach(o => {
//         let indices = o.clasificacion.map(c => c.indice);
//         expandirIndices(indices).forEach(indice => total[indice] = (total[indice] || 0) + 1);
//     });

//     clasificaciones.forEach(clasificacion => {
//         clasificacion.cantidad = total[clasificacion.indice] || 0;
//         clasificacion.nivel = clasificacion.indice.split(".").length;
//     });
// }
// function expandirIndices(indices) {
//     let salida = [];
//     indices.forEach(indice => {
//         let actual = '';
//         indice.split('.').forEach(i => {
//             actual += i;
//             salida.push(actual);
//             actual += '.';
//         })
//     });
//     return sinRepetir(salida);
// }

