
function contiene(palabra, o){
    if(palabra == o.ordenanda) return true;
    if(o.asunto.includes(palabra)) return true;
    if(palabra == o.estado) return true;
    if(o.clasificacion.includes(palabra)) true;
    return false;
}

function buscar(ordenanzas, nodos, condicion){
    let palabras = condicion.split(" ");
    let salida = ordenanzas.filter( o => palabras.every(palabra => contiene(palabra, o)));

    console.log("Hay " + salida.length + " para [" + condicion +"]");

    return salida;
}

function sumar(a,b){ return a+b;}

export default {buscar, sumar} ;
