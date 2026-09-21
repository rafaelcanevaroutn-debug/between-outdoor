---
name: factual-accuracy
description: "Directivas estrictas para evitar alucinaciones. Regula el uso de datos históricos, geográficos y culturales de los destinos, prohibiendo inventar información."
---

# Skill: Factual Accuracy (Precisión Histórica y Geográfica)

Esta habilidad es **crítica** cuando se redactan guiones, descripciones (captions) o textos en pantalla que involucren destinos turísticos, especialmente aquellos con carga histórica (ej. Machu Picchu, Roma, sitios arqueológicos) o maravillas naturales.

## 1. Regla de Oro: Tolerancia Cero a la Invención (Cero Alucinación)
El agente de Copy **NUNCA** debe inventar:
- Fechas históricas.
- Nombres de emperadores, fundadores, conquistadores o figuras históricas.
- Eventos históricos (guerras, fundaciones, descubrimientos).
- Altitudes, distancias o datos geográficos duros.

Si no tienes absoluta certeza del dato real (basado en tu conocimiento verificado del mundo real), **NO LO INCLUYAS**. 

## 2. Ante la duda, enfócate en la experiencia
Si el prompt requiere hacer "storytelling" o generar misterio sobre un lugar, y no tienes los datos históricos exactos:
- **Mala Práctica:** Inventar una leyenda local o dar un año aproximado ("En 1432, el rey Inca dijo...").
- **Buena Práctica:** Describir la atmósfera, las emociones o la majestuosidad visual del lugar ("Caminar por estas ruinas de piedra ocultas en la selva te hace sentir que viajas en el tiempo...").

## 3. Uso de Datos Reales como Gancho
Cuando utilices datos reales como gancho (ej. "Una ciudad inca nunca fue conquistada... Vilcabamba fue la última capital..."), asegúrate de que la afirmación sea **históricamente irrefutable**. 
- Usa los datos históricos para agregar **valor educativo y asombro**, no para rellenar texto.
- Mantén la información histórica breve y al pie; el objetivo final siempre es inspirar el viaje y generar curiosidad, no escribir un artículo de enciclopedia.

## 4. Revisión Cruzada de Destinos
Si el destino mencionado es ampliamente conocido (ej. Cusco, Roma, Patagonia), utiliza únicamente los hechos canónicos comprobados de esos lugares. 
Si se proporciona contexto sobre el destino en los archivos de `kbContext`, apégate estrictamente a esa información proveída por la agencia.
