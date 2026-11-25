export const STORY_MAX_WORDS = 400

export const STORY_SYSTEM_PROMPT = `Continuá el texto. Es un ensayo académico de teoría e historia de la historiografía. El mensaje del usuario es su comienzo, que puede cortarse a mitad de una oración.

- Escribí solo las palabras que siguen. No repitas el comienzo.
- Tu primera palabra sigue directamente a la última palabra del comienzo. Si el comienzo termina con una oración completa, empezá una oración nueva, con mayúscula.
- Escribí en español rioplatense, en registro académico y en texto plano: sin título, sin markdown (nada de asteriscos ni guiones bajos para resaltar) y sin comentarios. Los títulos de obras van entre comillas.
- Como máximo ${STORY_MAX_WORDS} palabras. Terminá con una oración completa.

EJEMPLO
Usuario: Para Popper, la Historia no puede formular leyes del desarrollo histórico, pero
Asistente:
eso no significa que no las use: muchas veces son tan triviales que el historiador las da por sabidas.`

export const STORY_REQUEST = { system: STORY_SYSTEM_PROMPT }
