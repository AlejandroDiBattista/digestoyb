require 'nokogiri'
require 'fileutils'
require 'json'
require 'csv'

def remove_style_content(origen, destino)
  begin
    puts "Limpiando #{origen}"
    texto = File.read(origen)

    doc = Nokogiri::HTML(texto)

    doc.xpath('//style').each do |element|
      element.remove
    end

    File.write(destino, doc.to_html)

  rescue StandardError => e
    puts "Error al procesar el archivo #{origen}: #{e.message}"
  end
end

def process_html_files(carpeta)
  FileUtils.mkdir_p('tmp') unless Dir.exist?('tmp')

  Dir.glob(File.join(carpeta, '*.html')).each do |file|
    destino = File.join('tmp', File.basename(file))
    remove_style_content(file, destino)
  end
end

# # Reemplaza '/ruta/a/tu/directorio' con la ruta del directorio que quieres procesar
base = './html/'
# process_html_files(base)

def contar_palabras_en_ordenanzas(json_file_path, output_csv_file_path)
  begin
    ordenanzas_data = JSON.parse(File.read(json_file_path))

    palabras_count = Hash.new(0)

    ordenanzas_data.each do |ordenanza|
      palabras_asunto = ordenanza['palabrasAsunto'].split(' ')
      palabras_texto = ordenanza['palabrasTexto'].split(' ')

      palabras_asunto.each { |palabra| palabras_count[palabra.downcase] += 1 }
      palabras_texto.each { |palabra| palabras_count[palabra.downcase] += 1 }
    end

    CSV.open(output_csv_file_path, 'w') do |csv|
      csv << ['palabra', 'frecuencia']
      palabras_count.each { |palabra, frecuencia| csv << [palabra, frecuencia] }
    end

    puts "Archivo CSV generado exitosamente: #{output_csv_file_path}"
  rescue StandardError => e
    puts "Error: #{e.message}"
  end
end

# Reemplaza '/ruta/a/tu/ordenanzas.json' con la ruta correcta del archivo JSON de entrada
# Reemplaza '/ruta/a/tu/resultados.csv' con la ruta donde deseas guardar el archivo CSV de salida
contar_palabras_en_ordenanzas('./datos/ordenanzas.json', './datos/palabras.csv')

