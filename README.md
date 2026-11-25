# 🕹️ Spaceship IDE · caja negra (versión en español)

¡Pilotear ideas como un piloto espacial!

![Grabación de pantalla](./extra/screencast.gif)

## Esta versión

Este repositorio es una adaptación en español de [Spaceship IDE](https://github.com/chuanqisun/spaceship), de Chuanqi Sun (2026, licencia MIT), hecha para una ponencia de historiografía. Su propósito es mostrar la complejidad de un modelo de lenguaje como **caja negra algorítmica**.

- **En español:** la interfaz, los prompts y los ejes de control. El modelo continúa un ensayo académico que arranca con fragmentos de Mestre, A. (2021), _Informe sobre «La miseria del historicismo» de Karl Popper_, en lugar de una historia de ficción.
- **Modelos de NVIDIA NIM** en lugar de Cerebras y Gemini: Nemotron 3 Ultra escribe la continuación, elige los recuadros y da los puntajes; Nemotron 3.5 Lightning propone los ejes.
- **Modo rayos X:** muestra cada llamada al modelo con las instrucciones enviadas, el mensaje y la respuesta cruda.

La idea central: los recuadros de «atención» y los puntajes **no se miden dentro del modelo**. Son respuestas que el propio modelo escribe cuando la interfaz se lo pregunta, y la interfaz las dibuja encima del texto. El modo rayos X lo deja a la vista: todo lo que la interfaz conoce del modelo es texto que entra y texto que sale.

Instrucciones de uso, cambios en detalle y límites: [LEEME.md](./LEEME.md).

---

_Lo que sigue es el README original de Chuanqi Sun, traducido al español. Las demos y la página enlazadas son las del proyecto original, en inglés._

## Demos

Se puede ver en [Instagram](https://www.instagram.com/reels/DfyQPhFtW-z/) y [YouTube](https://www.youtube.com/watch?v=3WmNLWUmcnY). El simulador original se puede probar en [https://chuanqisun.github.io/spaceship/](https://chuanqisun.github.io/spaceship/), con la opción de pasar al modo en vivo con tus propias claves de API de Cerebras y Gemini. Las claves quedan en el almacenamiento local del navegador. Hacelo bajo tu propia responsabilidad.

## Conjetura

> En un futuro cercano, los LLM y los modelos de decisión van a alcanzar una interactividad de 60 FPS.

Cuando eso pase, ¿qué nuevos paradigmas de interacción se van a habilitar? Este proyecto muestra interacciones plausibles y deseables para ese futuro.

1. **Monitor de foco**: ¿podemos visualizar a qué le está prestando atención el LLM, y usar eso para guiar la atención humana hacia lo importante?

   ![monitor de foco](./extra/clips/focus-monitor.gif)

2. **Bloqueo de atención**: ¿podemos obligar al LLM a prestarle más atención a ciertas frases para sesgar su comportamiento futuro?

   ![bloqueo de atención](./extra/clips/attention-lock.gif)

3. **Dirección por vectores de futuro**: ¿podemos descomponer la tarea en vectores propios, ajustar cada uno por separado y recomponerlos para influir en el texto que viene?

   ![dirección del futuro](./extra/clips/future-steering.gif)

4. **Regeneración en tiempo real**: cuando generar texto es barato y rápido, ¿podemos explorar futuros alternativos deslizándonos por el texto?

   ![regeneración en tiempo real](./extra/clips/realtime-regeneration.gif)

## Proceso de diseño

Usé Claude Code para la mayor parte de la implementación, pero me ocupé personalmente de la interfaz y la experiencia de uso. Itero con un muestrario de estilos interactivo: le pido a la IA opciones de diseño variadas, le doy comentarios y ella itera. Los materiales de diseño se pueden ver en la [página extra](https://chuanqisun.github.io/spaceship/extra/style-1.html).

Para lograr la experiencia en tiempo real tengo que usar una generación especulativa agresiva y manejar la invalidación de caché según lo que hace el usuario. Por ejemplo, cuando la perilla principal retrocede, tengo que vaciar los textos futuros y cancelar los pedidos en curso. Hay muchas consideraciones como esta en todo el sistema, y llevaron mucho criterio humano: Claude no las resolvió de una.

## Teoría

Actualmente me concentro en sistemas que ayuden a las personas a dar forma a ideas en tiempo real. Este proyecto es un paso pequeño hacia mi [próxima tesis](https://code.chuanqisun.com/master-thesis/) en el MIT Media Lab, donde investigo cómo acoplar sistemas semánticos y simbólicos para potenciar la creatividad humana, la autonomía y el gusto por el oficio.

## Comunidad

Este repositorio puede ser la plataforma de lanzamiento conceptual para nuevos diseños y aplicaciones. Esto es lo que construyó la comunidad. ¡Abrí un PR para sumar el tuyo!

- [Spaceship Writer](https://marketplace.visualstudio.com/items?itemName=brentlee-personal.spaceship-writer), una extensión de VS Code de [brentlee](https://github.com/brentlee-personal), adaptación independiente del diseño de dirección por vectores de futuro de Chuanqi Sun ([código](https://github.com/brentlee-personal/spaceship-vscode) · [demo en VS Code sobre Linux](https://github.com/brentlee-personal/spaceship-vscode/releases/download/v0.3.0/spaceship-writer-0.3.0-linux.mp4))
- [Spaceship Lime](https://spaceship-lime.vercel.app), para dirigir modelos locales en el navegador, de [Philippe](https://github.com/philippe-page)
- [Story Pilot](https://beyondchat.design/lab/story-pilot/), patrón de diseño destilado por [Dominik](https://www.linkedin.com/in/dominikwitzke/)

## Cita

Si construís sobre este trabajo, citalo así:

```bibtex
@misc{sun2026spaceship,
  author       = {Sun, Chuanqi},
  title        = {Spaceship {IDE}: Steer Your Ideas in Realtime, Space Pilot Style},
  year         = {2026},
  publisher    = {GitHub},
  howpublished = {\url{https://github.com/chuanqisun/spaceship}},
  note         = {Demo: \url{https://chuanqisun.github.io/spaceship/}}
}
```
