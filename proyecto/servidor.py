import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
from dotenv import load_dotenv
from datetime import datetime

# 1. Configurar el servidor y la IA
app = Flask(__name__)
CORS(app) # Permite que el HTML se conecte sin bloqueos de seguridad

load_dotenv()
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
modelo = genai.GenerativeModel('gemini-2.5-flash')

# 2. Crear la "Ruta" (El equivalente a tu AWS Lambda)
@app.route('/generar-recomendacion', methods=['POST'])
def generar_recomendacion():
    try:
        # Recibimos los datos que JavaScript nos manda desde el CSV
        datos_cultivo = request.json
        print(f"📥 Datos recibidos desde la web: {datos_cultivo}")

        prompt = f"""
        Eres un agrónomo experto. Analiza estos datos de telemetría:
        - Humedad del Suelo: {datos_cultivo['humedad']}%
        - Temperatura: {datos_cultivo['temperatura']}°C
        - Luz: {datos_cultivo['lux']} Lux
        - Calidad del Aire: {datos_cultivo['aire']}
        
        Reglas: Si humedad suelo < 50% = REGAR (50ml). Si es >= 50% = ESPERAR (0ml).
        
        Responde ÚNICAMENTE con un JSON válido con esta estructura:
        {{
          "fecha_analisis": "{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
          "decision_hidrica": "REGAR o ESPERAR",
          "volumen_riego_ml": numero,
          "ajuste_microclima": "texto corto",
          "analisis_general": "texto analisis"
        }}
        """
        
        respuesta = modelo.generate_content(prompt)
        texto_limpio = respuesta.text.replace('```json', '').replace('```', '').strip()
        recomendacion_json = json.loads(texto_limpio)
        
        print("✅ Recomendación generada con éxito. Enviando a la web...")
        
        # Devolvemos el JSON a la página web
        return jsonify(recomendacion_json)

    except Exception as e:
        print(f"❌ Error: {e}")
        return jsonify({"error": str(e)}), 500

# 3. Encender el servidor local
if __name__ == '__main__':
    print("🚀 Servidor IA de AgroFlow corriendo en http://localhost:5000")
    app.run(debug=True, port=5000)