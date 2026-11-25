# Spaceship · caja negra (versión en español)

Adaptación de [Spaceship IDE](https://github.com/chuanqisun/spaceship) (Chuanqi Sun, 2026, licencia MIT) para mostrar en una ponencia la complejidad de un modelo de lenguaje como **caja negra algorítmica**.

## Qué cambió respecto del original

- **Español y ensayo académico:** interfaz, prompts y ejes de control en español. En lugar de una historia de ficción, el modelo continúa un ensayo de historiografía que empieza con fragmentos de Mestre, A. (2021), _Informe sobre «La miseria del historicismo» de Karl Popper_ (`src/story/openings.ts`).
- **Modelos de NVIDIA (NIM):** Nemotron 3 Ultra (`nvidia/nemotron-3-ultra-550b-a55b`) escribe la continuación, elige los recuadros y da los puntajes; Nemotron 3.5 Lightning (`nvidia/nemotron-3.5-lightning-30b-a3b`), más rápido, propone los ejes. En las pruebas, Lightning invertía algunos puntajes, por eso quedaron en Ultra. Reemplazan a Cerebras y a Gemini del original (`src/llm/nim.ts`, `src/llm/decisions.ts`).
- **Modo rayos X** (botón naranja en la barra inferior): cada llamada al modelo con las instrucciones enviadas, el mensaje y la respuesta cruda.
- **Simulación en español:** sin modelo, se reproducen fragmentos del mismo informe palabra por palabra (`PASSAGE` en `src/text/completion.ts`).

## La idea que muestra

Los recuadros de «atención» y los puntajes **no se miden dentro del modelo**. Son respuestas que el propio modelo escribe cuando la interfaz se lo pregunta (ver el prompt en `src/text/live-attention.ts`), y la interfaz las dibuja encima del texto. El modo rayos X lo deja a la vista: todo lo que la interfaz conoce del modelo es texto que entra y texto que sale.

En **modo simulación** no hay ningún modelo: el texto está escrito de antemano y los recuadros, puntajes y conexiones se eligen al azar. Aun así, la interfaz se ve igual.

## Cómo usarlo

Requiere Node.js y una clave de NVIDIA NIM (build.nvidia.com).

1. Copiá `.env.example` como `.env` y poné tu clave: `NVIDIA_API_KEY=nvapi-…`. El archivo `.env` está en `.gitignore`: no se sube a GitHub.
2. Instalá y arrancá:

```
npm install
npm run dev
```

3. Abrí `http://localhost:5173/spaceship/` y pasá de **modo simulación** a **vuelo** con el botón de la barra inferior.

La clave la usa el servidor local de Vite (`vite.config.ts`), que reenvía las llamadas de la página a NVIDIA; nunca llega al navegador. Si cambiás la clave, reiniciá `npm run dev`.

- Arrastrá la perilla (el círculo) hacia abajo para que el texto avance; hacia arriba, para retroceder.
- Doble clic en la perilla: pide los recuadros de «atención». Doble clic sostenido: abre el abanico de ejes de control (postura, certeza, foco, fuentes…).
- Para el proyector, conviene ampliar con `Ctrl` + `+`: el texto es chico por diseño.

`scripts/nim-dev.mjs` prueba un modelo de NIM desde la terminal con la clave de `.env` (`node scripts/nim-dev.mjs nvidia/nemotron-3-ultra-550b-a55b`).

## Límites conocidos

- Necesita internet. La interfaz hace muchas llamadas mientras se arrastra la perilla (y cancela las que quedan viejas): el plan gratuito de NIM puede tener límites de uso por minuto.
- Los modelos de NIM no tienen un modo JSON garantizado: los puntajes se piden como JSON y se lee el primer objeto de la respuesta.
- `npm run build` falla por errores de tipo de los temporizadores (`Timeout` vs `number`) que ya estaban en el repositorio original; `npm run dev` funciona. La versión con NIM depende del servidor de desarrollo, que hace de intermediario.
