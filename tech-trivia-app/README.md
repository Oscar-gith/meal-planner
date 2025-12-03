# 🎯 Tech Trivia - Aplicación de Trivia Tecnológica

Aplicación web interactiva de trivia tecnológica con reconocimiento de voz e inteligencia artificial para eventos corporativos de Globant.

## ✨ Características

- **3 equipos compitiendo simultáneamente**
- **Reconocimiento de voz** usando Web Speech API (español e inglés)
- **Transcripción en tiempo real** de las respuestas
- **Timer de 60 segundos** por pregunta
- **Evaluación automática con IA** usando Claude API de Anthropic
- **Sistema de puntuación ajustable** manualmente por el facilitador
- **Tabla de puntuación acumulativa**
- **12 preguntas** sobre conceptos tecnológicos relevantes para Project Managers
- **Diseño responsive** con colores de Globant (verde #A4CF30 y negro #161616)

## 🛠️ Stack Técnico

- **React** con TypeScript y Hooks
- **Vite** como build tool
- **Tailwind CSS** para estilos
- **Web Speech API** para reconocimiento de voz
- **Claude API** (Anthropic) para evaluación de respuestas

## 📋 Requisitos Previos

- Node.js (v18 o superior)
- Navegador compatible con Web Speech API (Chrome o Edge recomendados)
- API Key de Anthropic para la evaluación con IA

## 🚀 Instalación

1. Clona el repositorio:
```bash
git clone <url-del-repo>
cd tech-trivia-app
```

2. Instala las dependencias:
```bash
npm install
```

3. Inicia el servidor de desarrollo:
```bash
npm run dev
```

4. Abre tu navegador en `http://localhost:5173`

## 🎮 Cómo Usar la Aplicación

### 1. Configuración Inicial
- Ingresa los nombres de los 3 equipos
- Selecciona el idioma del reconocimiento de voz (español o inglés)
- Opcionalmente, configura tu API Key de Anthropic (necesaria para la evaluación con IA)
- Haz clic en "Iniciar Trivia"

### 2. Durante el Juego
- Se muestra la pregunta actual con su categoría
- Haz clic en "Iniciar Respuestas" para comenzar la ronda
- Cada equipo presiona su botón "🎤 Grabar" para responder hablando
- Las respuestas se transcriben en tiempo real
- El timer cuenta regresivo desde 60 segundos
- Al finalizar el tiempo o presionar "Finalizar Respuestas", se muestran todas las transcripciones

### 3. Evaluación
- Se muestran las 3 respuestas transcritas y la respuesta correcta
- Haz clic en "Evaluar con IA" para obtener puntuaciones sugeridas (requiere API Key)
- Claude analiza cada respuesta y sugiere un puntaje de 0-10

### 4. Asignación de Puntos
- Revisa las respuestas y análisis de cada equipo
- Ajusta los puntos manualmente si es necesario usando los botones +/-
- Confirma los puntos para continuar a la siguiente pregunta

### 5. Resultados Finales
- Al completar las 12 preguntas, se muestra el ganador
- Podio con los resultados finales de todos los equipos
- Opción para iniciar una nueva partida

## 📚 Banco de Preguntas

La aplicación incluye 12 preguntas sobre:
- APIs REST y SOAP
- Arquitectura de microservicios
- Cloud Computing (IaaS, PaaS, SaaS)
- Metodologías Agile y Scrum
- DevOps y CI/CD
- Docker y contenedores
- Kubernetes
- Machine Learning
- Arquitectura MVC
- Ciberseguridad (XSS)
- Frontend vs Backend
- Servicios de AWS

## 🔑 Obtener API Key de Anthropic

1. Visita [https://console.anthropic.com](https://console.anthropic.com)
2. Crea una cuenta o inicia sesión
3. Ve a "API Keys" en el menú
4. Genera una nueva API Key
5. Cópiala y úsala en la aplicación

**Nota:** Puedes usar la aplicación sin API Key, pero tendrás que asignar los puntos manualmente sin la ayuda de la evaluación automática con IA.

## 🌐 Compatibilidad de Navegadores

El reconocimiento de voz requiere:
- ✅ Google Chrome (Windows, Mac, Android)
- ✅ Microsoft Edge (Windows, Mac)
- ⚠️ Safari (soporte limitado)
- ❌ Firefox (no soportado actualmente)

## 🏗️ Build para Producción

```bash
npm run build
```

Los archivos de producción se generarán en la carpeta `dist/`

## 📱 Uso en Eventos

Para proyectar en pantalla grande:
1. Abre la aplicación en pantalla completa (F11)
2. Conecta 3 micrófonos (uno por equipo) o usa el micrófono del ambiente
3. Cada equipo se acerca al micrófono cuando le toca responder
4. El facilitador controla el flujo de la aplicación

## 🎨 Personalización

Los colores de Globant están definidos en `tailwind.config.js`:
```javascript
colors: {
  'globant-green': '#A4CF30',
  'globant-dark': '#161616',
}
```

## 🤝 Contribuciones

Este proyecto fue creado para eventos corporativos de Globant. Para modificaciones o mejoras, contacta al equipo de desarrollo.

## 📄 Licencia

Propiedad de Globant - Uso interno corporativo

---

**Desarrollado con ❤️ para eventos de Globant**
