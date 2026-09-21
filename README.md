# 👾 JUEGO DE GALAGA

> Recreación del clásico juego de arcade Galaga de la década de los 80's, desarrollado dentro de Visual Studio Code utilizando modelos de Inteligencia Artificial a través de OpenRouter.

---

## 📌 Descripción

Este proyecto es una adaptación del legendario **Galaga Arcade (1980s)**. Incluye mecánicas clásicas, controles adaptados al teclado, efectos visuales iniciales inspirados en la saga de *Star Wars* y música de fondo del juego original.

Fue desarrollado integrando **OpenRouter** mediante la configuración del archivo `settings.json` en **Visual Studio Code**, permitiendo alternar entre múltiples modelos de IA para la generación del código sin consumir tokens de proveedores de pago.

---

## ✨ Características y Controles

* 🚀 **Iniciar el juego:** Presionar la tecla `<ENTER>`.
* ⏸️ **Pausar o Salir:** Presionar la tecla `<ESC>` (presionar una vez para pausar, presionar `<ESC>` nuevamente para salir o `<ENTER>` para reanudar).
* 💥 **Disparar:** Presionar la tecla `<SPACE BAR>` (Barra Espaciadora).
* ⬅️ ➡️ **Movimiento:** Teclas de cursor izquierda (`←`) y derecha (`→`) para esquivar los disparos enemigos.
* 👤 **Pantalla de Inicio:** Muestra el nombre del desarrollador (*Ricardo Ernesto Elías*) con una breve biografía presentada con el clásico efecto de desplazamiento de texto de *Star Wars*.

---

## ⚙️ Configuración del Entorno (OpenRouter en VS Code)

Para el desarrollo del juego se configuró OpenRouter dentro de `.vscode/settings.json` para enrutar las peticiones de los modelos de IA:

```json
{
  "openrouter.apiKey": "TU_API_KEY_AQUI",
  "openrouter.siteUrl": "https://github.com/tu-usuario/galaga-game",
  "openrouter.siteName": "Galaga Arcade Game"
}
```

---

## 📝 Historial de Prompts (Desarrollo Guiado por IA)

A continuación se detalla la secuencia de prompts utilizados durante el proceso de desarrollo e iteración del juego:

### 🎯 Primer Prompt: Estructura Inicial e Integración
> "Crea una aplicación de video juego que sea idéntica al juego Galaga de Arcade que se jugaba en maquinitas en la década de los 80's. Utiliza las imágenes de la carpeta `images` que ya se encuentra en esta carpeta para representar las naves y usa las skills que ya están disponibles en el folder `node_modules`. Además, al inicio del juego muestra mi nombre: *"Ricardo Ernesto Elías"* y una descripción que indique que *"soy Ingeniero en Ciencias de la Computación, apasionado por la música de los 70's y 80's y por el aprendizaje de nuevas tecnologías"*. Ese mensaje debe aparecer justo al iniciar el juego con el mismo efecto de las letras de la película la Guerra de Las Galaxias cuando inicia. Luego, deberá desaparecer e iniciar el juego al presionar la tecla `ENTER`. La nave del jugador debe controlarse con las teclas de cursor (derecha e izquierda), los disparos se deben realizar con la tecla `ENTER`, lo cual debe indicarse al inicio. Intenta usar la misma música del juego original para iniciar el juego y durante esté el juego en acción."

### 🎯 Segundo Prompt: Corrección de Controles y Pausa
> "Haz las siguientes correcciones:
> 1) La nave del jugador no está disparando aún. Debe hacerlo con la tecla `<BARRA ESPACIADORA>`, indícalo al inicio del juego, como lo indicas para iniciar un nuevo juego con la tecla `<ENTER>`.
> 2) Permite interrumpir el juego, presionando una vez la tecla `<ESC>` y luego, volver a presionar `<ESC>` para confirmar. La primera vez que se presiona `<ESC>`, solo deja pausado y si presiona `<ENTER>` en lugar de la tecla `<ESC>` reanudas el juego."

### 🎯 Tercer Prompt: Control de Disparo Único
> "Haz una nueva corrección. La nave del jugador se mantiene disparando todo el tiempo. Debes modificar para que únicamente dispare cuando el jugador presione la tecla de barra espaciadora. Indica también esto en el mensaje donde se indica que la tecla `<ENTER>` se usa para iniciar el juego y la tecla `<ESC>` para detenerlo y salir."

### 🎯 Cuarto Prompt: Ajuste Final de Movimiento y Física
> "Revisa nuevamente para corregir que ahora ya no se mueve la nave con las teclas de cursor izquierda y derecha. Mantén todo lo demás igual, únicamente corrige lo de las teclas cursoras para que el jugador pueda mover la nave y así esquivar los disparos. Revisa también que únicamente se lance un disparo de la nave del jugador al presionar la tecla de la barra espaciadora, sin alterar el comportamiento del resto de teclas que intervienen en el desarrollo del juego."

---

## 📄 Licencia

Este proyecto se distribuye bajo la licencia **MIT**.
