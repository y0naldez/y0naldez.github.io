---
title: "CJCA: Laboratorio Blue Team para practicar triage de alertas"
description: "Aurelius Blue Alert Lab, un laboratorio defensivo y sintético inspirado en la parte Blue Team de CJCA para practicar análisis de alertas, logs y Kibana."
pubDate: 2026-06-26T12:00:00-06:00
heroImage: '../../../assets/cjca_blue.png'
lang: "es"
category: "CJCA"
---

En este post quiero compartir un laboratorio que he creado para practicar la parte defensiva de CJCA desde un enfoque seguro, sintético y orientado al análisis de alertas.

El laboratorio se llama **Aurelius Blue Alert Lab** y está diseñado para practicar triage de alertas en **Elastic/Kibana**. El escenario simula a **Aurelius Labs**, una empresa ficticia donde el objetivo del analista es revisar un conjunto de alertas y clasificarlas como **True Positive** o **False Positive** utilizando evidencia encontrada en los logs.

La idea principal es sencilla: se cargan eventos en Elastic, se revisan las alertas en Kibana, se investigan los logs relacionados y se justifica cada clasificación con evidencia concreta.

> **Nota importante:**  
> El laboratorio **no contiene información del examen real de CJCA**, no replica alertas oficiales, no utiliza infraestructura real de la certificación y no expone preguntas, flags, escenarios, credenciales ni evidencias pertenecientes al examen.
>
> Su propósito es servir como recurso de práctica para mejorar metodología, análisis de logs, uso de Kibana y redacción de evidencia defensiva.

---

## ¿Por qué crear un laboratorio Blue Team para CJCA?

Cuando se practica para certificaciones orientadas a seguridad práctica, muchas veces el enfoque principal suele estar en la explotación, enumeración, acceso inicial o escalada de privilegios. Sin embargo, en evaluaciones como CJCA también es importante saber analizar eventos desde el punto de vista defensivo.

La parte Blue Team no consiste únicamente en marcar una alerta como verdadera o falsa. También requiere revisar evidencia, correlacionar eventos, entender el comportamiento observado y explicar por qué una alerta representa actividad maliciosa real o por qué corresponde a ruido, actividad benigna o falta de evidencia suficiente.

Por eso decidí crear un laboratorio que permita practicar esa lógica de análisis sin depender de contenido del examen real.

El objetivo es que puedas enfrentarte a un escenario controlado donde tenga que responder preguntas como:

- ¿Qué alerta se generó?
- ¿Qué host está involucrado?
- ¿Qué usuario aparece en los eventos?
- ¿Qué ocurrió antes y después del timestamp de la alerta?
- ¿Existen procesos, conexiones, autenticaciones o cambios sospechosos?
- ¿La evidencia confirma actividad maliciosa?
- ¿La alerta debe clasificarse como True Positive o False Positive?
- ¿Cómo puedo justificar mi respuesta de forma clara?

Este tipo de práctica ayuda a desarrollar criterio defensivo, no solo memoria de comandos.

---

## ¿Qué es Aurelius Blue Alert Lab?

**Aurelius Blue Alert Lab** es un laboratorio defensivo y completamente ficticio para practicar análisis de alertas en **Elastic/Kibana**.

El escenario simula una empresa llamada **Aurelius Labs**. Dentro del entorno encontrarás un dataset de eventos que podrás cargar en Elasticsearch para investigarlo posteriormente desde Kibana. A partir de esos logs, tu objetivo será revisar las alertas del laboratorio y clasificarlas como **True Positive** o **False Positive**, siempre utilizando evidencia concreta para justificar cada decisión.

El laboratorio incluye un total de **20 alertas**. Cada una fue diseñada para que puedas practicar el proceso de investigación: revisar eventos, aplicar filtros, correlacionar información, validar comportamientos sospechosos y explicar por qué una alerta debe considerarse verdadera o falsa.

Con esta práctica podrás reforzar habilidades como:

- Navegar en Kibana Discover.
- Buscar eventos por timestamps y ventanas de tiempo.
- Filtrar por host, usuario, proceso, IP o tipo de evento.
- Correlacionar eventos relacionados.
- Identificar ruido o falsos positivos.
- Validar actividad sospechosa con evidencia.
- Redactar conclusiones defensivas de forma clara.

La idea no es simplemente resolver un reto aislado, sino que puedas practicar el flujo completo de investigación que normalmente seguirías al analizar alertas dentro de un entorno SIEM.

---

## Diferencia frente a Sherlocks convencionales

Los Sherlocks son una excelente forma de practicar Blue Team, análisis forense, DFIR y detección. Sin embargo, este laboratorio tiene un objetivo diferente.

**Aurelius Blue Alert Lab** fue creado como un recurso de preparación estilo CJCA para que puedas practicar la lógica de clasificación de alertas en un formato más cercano a una revisión defensiva basada en evidencia.

La diferencia no está en que este laboratorio sea “mejor” que un Sherlock, sino en el enfoque que propone:

- Trabajarás con **20 alertas** que deben clasificarse como **True Positive** o **False Positive**.
- El análisis se realiza sobre evidencia disponible en logs dentro de **Elastic/Kibana**.
- Deberás justificar cada decisión con eventos concretos, no solo con intuición.
- El escenario es completamente sintético, seguro y creado únicamente con fines educativos.
- El formato está pensado para que puedas practicar metodología, correlación de eventos y redacción defensiva.

Esto te permite practicar la parte Blue sin depender de spoilers, sin copiar escenarios reales y sin revelar información sensible de la certificación.

---

## Repositorio del laboratorio

Todo el contenido del laboratorio se encuentra disponible en el siguiente repositorio:

<a href="https://github.com/y0naldez/cjca-soc-alert-investigation-lab.git" target="_blank" rel="noopener noreferrer">
  Ver repositorio en GitHub
</a>


```text
https://github.com/y0naldez/cjca-soc-alert-investigation-lab.git
```

Dentro del repositorio encontrarás los archivos necesarios para levantar el entorno, cargar los eventos e iniciar la investigación en Kibana.

La estructura principal del repositorio es:

```text
alerts/
dataset/
docs/
README.es.md
README.md
docker-compose.yml
```

### `alerts/`

En esta carpeta encontrarás las alertas del laboratorio y los archivos de explicación para revisión.

```text
alerts.md
alerts_answer_explanations_es.md
alerts_answer_explanations_en.md
```

El archivo principal para practicar es `alerts.md`, donde se listan las 20 alertas que deberás investigar. La recomendación es que primero trabajes sobre ese archivo sin revisar las respuestas.

Los archivos de explicaciones pueden utilizarse al finalizar para comparar tu análisis, revisar tu razonamiento y entender qué evidencia apoyaba cada clasificación.

### `dataset/`

En esta carpeta encontrarás los eventos que se cargan en Elasticsearch.

```text
index_template.json
aurelius_all_events_bulk.ndjson
```

El archivo `index_template.json` define el template/mapping del índice, mientras que `aurelius_all_events_bulk.ndjson` contiene los eventos del laboratorio en formato compatible con la Bulk API de Elasticsearch.

Estos eventos son la base del análisis. A partir de ellos podrás buscar actividad por timestamp, host, usuario, proceso, IP, tipo de evento y otros campos relevantes.

### `docs/`

En esta carpeta encontrarás las guías de ingesta para cargar correctamente los eventos en Elastic/Kibana.

```text
ingesta_elastic_kibana_es.md
elastic_kibana_ingestion_en.md
```

La documentación está disponible en español e inglés para que puedas seguir el proceso de configuración e ingesta paso a paso.

### `docker-compose.yml`

El laboratorio puede levantarse localmente con Docker usando el archivo `docker-compose.yml`.

Esto facilita la práctica, ya que puedes ejecutar Elasticsearch y Kibana sin configurar manualmente cada componente desde cero.

---

## Flujo general del laboratorio

El flujo recomendado para realizar la práctica es el siguiente:

1. Clonar el repositorio.
2. Levantar Elasticsearch y Kibana con Docker.
3. Aplicar el template del índice.
4. Ingestar los eventos del dataset.
5. Crear el Data View en Kibana.
6. Ajustar el rango de tiempo correcto en Discover.
7. Revisar cada alerta del archivo `alerts.md`.
8. Buscar evidencia en los logs.
9. Clasificar cada alerta como **True Positive** o **False Positive**.
10. Validar tus respuestas y revisar la explicación de cada caso.

La idea es que primero intentes resolver el laboratorio sin mirar las respuestas. Empieza investigando las alertas directamente en Kibana, revisa los eventos relacionados, formula tu conclusión y documenta la evidencia que respalda tu decisión.

Después de completar tu análisis, puedes comparar tus respuestas con las explicaciones del repositorio o usar la sección interactiva que preparé para validar cada alerta de forma más directa.

---

## Práctica interactiva

Además de los archivos incluidos en el repositorio, preparé una sección interactiva para que puedas comprobar tus respuestas después de investigar las alertas en Kibana.

La recomendación es usarla al final del ejercicio: primero revisa los logs, clasifica cada alerta como **True Positive** o **False Positive**, y luego valida tu respuesta junto con una breve explicación del caso.

<a href="/labs/aurelius-blue-alert-lab/" target="_blank" rel="noopener noreferrer">
  Abrir práctica interactiva de alertas
</a>

---



## Recomendaciones para resolver el laboratorio

Mi recomendación es que trabajes cada alerta como si fuera parte de un reporte real.

Primero identifica el timestamp de la alerta y define una ventana de análisis. Luego filtra por host, usuario, proceso, dirección IP o cualquier otro campo relevante. Después revisa eventos anteriores y posteriores para entender el contexto.

No te limites únicamente al evento que disparó la alerta. Muchas veces la respuesta está en la correlación: un inicio de sesión, un proceso ejecutado después, una conexión saliente, un cambio de archivo o incluso la ausencia de eventos que deberían existir si la alerta fuera real.

También es importante documentar búsquedas negativas. En Blue Team, no encontrar cierta evidencia también puede ser relevante si se explica correctamente.

Por ejemplo, si una alerta sugiere fuerza bruta, pero no existen múltiples intentos fallidos, múltiples usuarios probados, varios intentos desde la misma IP o un login exitoso posterior, esa ausencia de evidencia puede apoyar una clasificación como **False Positive**.

La clave es que tu conclusión no dependa solo de una impresión, sino de una revisión ordenada de los eventos disponibles.

---

## Conclusión

**Aurelius Blue Alert Lab** busca servir como un espacio de práctica para desarrollar criterio defensivo, ordenar investigaciones y justificar decisiones con evidencia realista dentro de un entorno controlado.

Más que resolver alertas de forma mecánica, la idea es que puedas fortalecer la forma en que analizas, correlacionas y documentas lo que observas en los logs.

Espero que este laboratorio te ayude a practicar con mayor confianza la parte Blue Team de CJCA y a construir una metodología más clara para investigar alertas, justificar decisiones y documentar evidencia en escenarios defensivos.
