---
title: "CJCA: preparación, consejos y errores comunes"
description: "Te comparto cómo me preparé para la CJCA, qué aprendí durante el proceso, qué errores debes evitar y algunas recomendaciones para presentar el examen con mayor seguridad."
pubDate: 2026-06-03
heroImage: '../../../assets/cjca.jpg'
lang: "es"
---

En este post quiero compartir una guía basada en mi experiencia preparando y aprobando la certificación CJCA de Hack The Box.

A lo largo del post voy a hablar sobre mi preparación, la importancia de practicar con una metodología clara, el peso que tiene la documentación, el componente de análisis defensivo de la certificación y algunos errores que conviene evitar antes y durante el examen.

---

## Mi opinión general sobre la certificación

En mi opinión, CJCA es un muy buen punto de partida para quienes quieren comenzar a desarrollar una visión más completa de la ciberseguridad, porque mezcla dos mundos que muchas veces se estudian por separado: Red Team y Blue Team.

Por un lado, te obliga a pensar como atacante: enumerar servicios, explotar vulnerabilidades, obtener acceso, escalar privilegios y moverte dentro de un entorno. Pero, por otro lado, también te exige analizar evidencia, revisar logs, validar alertas, interpretar actividad sospechosa y justificar por qué algo representa o no una amenaza real.

Algo importante que debes entender es que la evaluación no está planteada como una serie de retos totalmente aislados. No se trata únicamente de resolver un punto, encontrar una flag y pasar automáticamente al siguiente. El enfoque se acerca más a un escenario práctico, donde conviene analizar el contexto, ordenar la información disponible y tomar decisiones con base en lo que vas observando.

Por eso, una parte importante del proceso es aprender a hacerse buenas preguntas:

* ¿Qué información tengo disponible?
* ¿Qué información me falta?
* ¿Lo que encontré realmente es útil?
* ¿Este archivo aporta algo al objetivo?
* ¿Este evento aporta contexto adicional?
* ¿Esta evidencia puede ayudarme a entender mejor otra parte del entorno?
* ¿Qué información debo conservar y qué puedo descartar?

Ese cambio de mentalidad es clave. Un hallazgo por sí solo no siempre significa demasiado. Lo importante es preguntarse si realmente aporta valor, si puede validarse, si tiene relación con otro punto del entorno o si ayuda a construir una mejor comprensión del escenario.

Lo mismo ocurre con archivos, logs, usuarios, procesos, conexiones de red o cualquier otro dato encontrado durante la evaluación. No todo tendrá la misma importancia. Parte de la dificultad está en interpretar la información disponible, identificar qué es relevante, descartar ruido y entender cómo se conectan los hallazgos entre sí.

Por esa razón considero que esta certificación evalúa mucho más que el conocimiento técnico o el uso de herramientas. También pone a prueba la metodología de trabajo, la capacidad de análisis y la forma en que documentamos nuestros hallazgos.


---

## ¿Cómo prepararse para la certificación?

Una de las preguntas más comunes antes de presentar CJCA es si el path de preparación de Hack The Box es suficiente para aprobar la certificación.

Hack The Box solicita completar su path de preparación, y en mi opinión es una base muy buena. El contenido empieza desde conceptos fundamentales y poco a poco va avanzando hacia temas más prácticos como redes, Linux, Windows, enumeración, explotación, WordPress, uso de herramientas y análisis de evidencias.

Aunque el path incluye ejercicios prácticos, considero que no deberíamos quedarnos únicamente con eso. El contenido te da las bases, pero para el examen también necesitas desarrollar una metodología propia de trabajo.

**¿A qué me refiero con metodología?**

Me refiero a la serie de pasos que seguimos al momento de abordar un entorno, desde la enumeración inicial hasta la explotación, post-explotación, análisis de evidencias y documentación. En cada fase necesitamos tener un proceso: saber qué revisar, cómo interpretar la información, cómo validar una hipótesis y cómo decidir cuál será el siguiente paso.

Por ejemplo, no se trata solo de lanzar herramientas, sino de entender qué estamos buscando. Durante la enumeración debemos identificar servicios, versiones, tecnologías y posibles rutas de ataque. Durante la explotación debemos validar si una vulnerabilidad realmente aplica al entorno. En la post-explotación debemos analizar qué información encontramos, qué permisos tenemos, qué accesos podemos ampliar y cómo todo eso se relaciona con el objetivo final.

Por eso considero que la mejor forma de prepararse es complementar el path con máquinas Easy de Hack The Box, tanto Linux como Windows, o con laboratorios similares. Al practicar en diferentes escenarios nos enfrentamos a servicios, errores, tecnologías y rutas de explotación distintas, lo cual nos ayuda a construir una metodología más sólida.

Al inicio, esta metodología puede sentirse como una lista rígida de pasos: escanear puertos, enumerar servicios, buscar vulnerabilidades, probar credenciales, revisar permisos, documentar hallazgos, etc. Pero a medida que resolvemos más máquinas, el proceso se vuelve más natural y orgánico.

Al final, prepararse para la CJCA no se trata de memorizar comandos o respuestas, sino de aprender a investigar, correlacionar información y construir una forma ordenada de resolver problemas.

---

## Máquinas recomendadas para practicar

Algo importante que quiero aclarar es que no recomiendo estas máquinas porque sean iguales al examen ni porque contengan necesariamente los mismos vectores de ataque. Las recomiendo porque ayudan a desarrollar una metodología de trabajo, que para mí fue una de las habilidades más importantes durante la preparación.

La idea no es memorizar rutas de explotación, sino practicar el proceso completo: enumerar, interpretar la información, investigar tecnologías, validar hipótesis, explotar cuando corresponde, revisar el sistema comprometido y documentar los hallazgos.

| Linux | Windows |
|---|---|
| Lame | Return |
| Broker | Legacy |
| Cap | Blue |
| Keeper | Devel |
| Blocky | Optimum |
| Backdoor | Bastion |

Aun así, no considero que debas quedarte únicamente con estas máquinas. Lo ideal es seguir practicando hasta que sientas que tu metodología es lo suficientemente sólida en distintos escenarios.

Mi recomendación es intentar resolverlas primero por tu cuenta. Esto ayuda a identificar tus propias debilidades: qué cosas no enumeraste, qué servicios pasaste por alto, qué comandos olvidaste ejecutar o en qué parte del proceso te quedaste bloqueado.

Después de intentarlo, puedes complementar con videos, writeups o guías para comparar tu ruta con la de otras personas. La idea no es copiar la solución, sino detectar piezas que faltaban en tu metodología e incorporarlas a tu forma de trabajar.

El catálogo de máquinas Easy en Hack The Box, tanto Linux como Windows, es bastante amplio. Sin embargo, considero importante no salirse demasiado del alcance del path de preparación.

Por ejemplo, si el path no profundiza en Active Directory, entonces dedicar tiempo a practicar entornos de AD no debería ser una prioridad específica para CJCA. Puede ser útil para tu crecimiento general, pero no necesariamente es lo más importante para prepararte para esta certificación.

Usa estas máquinas como punto de partida, pero no como una lista definitiva. El objetivo real es construir una metodología que puedas aplicar en diferentes escenarios, no aprenderte una ruta específica de explotación.

---

## Temas clave que conviene reforzar

### Permisos en Linux

Además de practicar máquinas, también recomiendo reforzar algunos conceptos que suelen aparecer de forma práctica durante la preparación. Uno de ellos es entender bien los permisos en Linux, especialmente cuando trabajamos con archivos y directorios.

A veces no basta con saber que un archivo existe. También necesitamos entender qué permisos tenemos sobre cada parte de la ruta. En Linux, los permisos no funcionan igual para archivos que para directorios. Por ejemplo, en un directorio, el permiso de lectura permite listar su contenido, pero el permiso de ejecución permite atravesarlo si conocemos el nombre exacto del archivo o subdirectorio.

Esto es importante porque, en ciertos escenarios, podríamos no poder listar un directorio con `ls`, pero sí acceder a un archivo si conocemos la ruta completa y tenemos los permisos necesarios para atravesar los directorios anteriores.

| Permiso en directorio | Qué permite |
| --- | --- |
| `r` lectura | Permite ver los nombres dentro del directorio, siempre que también existan los permisos necesarios para acceder. |
| `w` escritura | Permite crear, borrar o renombrar archivos dentro del directorio, normalmente junto con `x`. |
| `x` ejecución | Permite atravesar el directorio y acceder a elementos internos si se conoce su nombre exacto. |

Por eso, durante la enumeración no solo debemos preguntarnos “qué archivos existen”, sino también “qué rutas conocemos”, “qué permisos tenemos sobre cada directorio” y “qué información podríamos leer si encontramos una ruta válida”.

Este tipo de detalle ayuda mucho a construir metodología. No se trata de memorizar una ruta específica ni una técnica aislada, sino de entender cómo razona el sistema operativo y cómo podemos validar nuestras hipótesis de forma ordenada. En un examen práctico, esa diferencia puede ser clave: muchas veces el avance no viene de lanzar más herramientas, sino de interpretar correctamente permisos, rutas, usuarios, grupos y archivos accesibles.

### Post-explotación con herramientas de enumeración

Otro punto importante es practicar la post-explotación de forma ordenada. Después de obtener acceso a un sistema, no deberíamos limitarnos a buscar una flag o revisar archivos al azar. Lo ideal es tener una metodología clara para entender el entorno: usuario actual, grupos, permisos, procesos, servicios, tareas programadas, configuraciones, credenciales expuestas, rutas interesantes y posibles formas de escalar privilegios.

En esta fase, las herramientas de enumeración pueden ser muy útiles, especialmente cuando nos quedamos atorados o sentimos que ya revisamos lo más evidente. Una de las más conocidas es **PEASS-ng**, que incluye scripts como `linpeas` y `winpeas` para apoyar la enumeración en Linux y Windows.

Puedes revisar el proyecto aquí: <a href="https://github.com/peass-ng/PEASS-ng/" target="_blank" rel="noopener noreferrer">
  PEASS-ng en GitHub
</a>

La idea no es depender completamente de estas herramientas ni ejecutar scripts sin entender su salida. Lo importante es usarlas como apoyo dentro de nuestra metodología de post-explotación: revisar los hallazgos, interpretar qué significan, validar manualmente lo relevante y decidir el siguiente paso con base en evidencia.

Incluir herramientas como PEASS-ng en la práctica ayuda a reconocer patrones comunes, detectar configuraciones débiles y reforzar el hábito de enumerar antes de intentar escalar privilegios. Al final, la herramienta no reemplaza la metodología, pero sí puede ayudarnos a ser más ordenados y a no pasar por alto detalles importantes.

---

## ¿Y qué hay de la parte Blue Team?

En mi caso, debo ser honesto: fuera del contenido incluido en el path de preparación, no realicé demasiada práctica adicional enfocada específicamente en Blue Team.

Sin embargo, si sientes que esta es tu área más débil, o simplemente quieres llegar con más confianza, los **Sherlocks de Hack The Box** o laboratorios similares pueden ayudarte bastante. Este tipo de retos está enfocado en análisis de evidencias, investigación de incidentes, correlación de eventos y construcción de conclusiones a partir de logs.

Esto es importante porque en la parte Blue Team no basta con ver una alerta y marcarla como **True Positive** o **False Positive**. También debes explicar por qué llegaste a esa conclusión.

Por ejemplo, imaginemos una alerta relacionada con múltiples intentos fallidos de inicio de sesión. Una forma muy básica de justificarla sería decir:

> Se observaron cinco intentos fallidos de inicio de sesión y luego un inicio de sesión exitoso para el mismo usuario.

El problema con esa explicación es que, por sí sola, no dice demasiado. Podría tratarse de un usuario que olvidó su contraseña, un error de escritura o un intento legítimo. La clave está en investigar qué ocurrió antes y después de ese inicio de sesión exitoso.

Una explicación más completa sería:

> Se observaron cinco intentos fallidos de inicio de sesión contra una cuenta privilegiada desde la misma dirección IP. Minutos después, se registró un inicio de sesión exitoso desde esa misma IP. Luego del acceso, se identificó ejecución de comandos de reconocimiento, descarga de archivos hacia un directorio temporal y ejecución de una herramienta relacionada con escalada de privilegios, como JuicyPotato. Esta secuencia permite concluir que no se trató únicamente de intentos fallidos aislados, sino de una posible intrusión seguida de actividad post-explotación.

La diferencia entre ambos ejemplos es importante. En el primero solo estamos mencionando eventos aislados. En el segundo estamos construyendo una línea temporal: intentos fallidos, acceso exitoso, ejecución de comandos, descarga de herramientas y posible escalada de privilegios.

Ese tipo de análisis es mucho más útil para un reporte, porque no solo dice qué ocurrió, sino por qué esos eventos se relacionan entre sí y cómo respaldan la conclusión.

Por eso, al practicar Blue Team, mi recomendación es no quedarte únicamente con la alerta inicial. Intenta responder preguntas como:

* ¿Qué usuario estuvo involucrado?
* ¿Desde qué IP ocurrió la actividad?
* ¿El inicio de sesión fue exitoso después de varios fallos?
* ¿Qué procesos se ejecutaron después?
* ¿Hubo descarga de archivos?
* ¿Se usaron directorios sospechosos como `/tmp`, `Temp` o `Public`?
* ¿La actividad coincide con reconocimiento, persistencia, escalada de privilegios o movimiento lateral?

En resumen, para la parte Blue Team no necesitas memorizar cada alerta posible. Lo importante es aprender a investigar, construir una línea lógica de análisis y justificar tus conclusiones con evidencia clara.

---


## Errores que debes evitar

Después de pasar por el proceso de preparación y presentar el examen, hay varios errores que considero importantes mencionar. Algunos los cometí directamente y otros los fui identificando durante la preparación o al momento de construir el reporte.

La idea de esta sección no es asustar, sino ayudarte a evitar problemas que pueden afectar tu desempeño, especialmente cuando el tiempo es limitado y necesitas mantener una línea de trabajo ordenada.

### Error 1: No leer las instrucciones cuidadosamente

Al momento de iniciar el examen, recibirás instrucciones importantes sobre el alcance, los objetivos y la forma en que debes abordar la evaluación.

Uno de mis principales errores fue no leerlas con suficiente cuidado. Asumí que ya sabía por dónde empezar y comencé a investigar una línea que no era la prioridad en ese momento.

Puede parecer un detalle menor, pero en una certificación práctica el tiempo es un recurso muy valioso. Dedicar varias horas a una línea de investigación incorrecta puede afectar el resto del examen.

Mi recomendación es sencilla: antes de ejecutar un solo comando, lee completamente las instrucciones, identifica qué te están pidiendo y define claramente cuál debería ser tu primer objetivo.

### Error 2: No documentar desde el minuto uno

Una de las mejores decisiones que tomé fue documentar todo desde el primer momento.

En mi caso utilicé Obsidian como herramienta principal de organización. La idea era construir mi reporte mientras realizaba el examen, para luego tener gran parte del trabajo adelantado al momento de completar la plantilla final en SysReptor.

Cada vez que obtenía un resultado relevante, agregaba inmediatamente:

* El comando ejecutado.
* El resultado obtenido.
* La evidencia o captura correspondiente.
* Observaciones importantes.
* Posibles siguientes pasos.

Esto me permitió mantener un historial claro de cada acción realizada y evitar tener que reconstruir procesos horas después.

También recomiendo revisar el recurso de **Bruno Rocha Moura** sobre reportes para CPTS: <a href="https://www.brunorochamoura.com/posts/cpts-report/" target="_blank" rel="noopener noreferrer">
  Leer recurso sobre reportes CPTS
</a>



Aunque está orientado a CPTS, muchos de los principios de documentación, estructura y presentación de evidencias también son aplicables a CJCA. Puede servir como una excelente referencia para entender cómo presentar hallazgos de forma clara, ordenada y profesional.

### Error 3: Confiar demasiado en la memoria

Después de varias horas de examen, múltiples hosts, comandos, credenciales, eventos y hallazgos, es muy fácil olvidar detalles importantes.

Lo que parece obvio cuando lo encuentras puede ser difícil de recordar al momento de redactar el reporte. Por eso no recomiendo depender de la memoria.

Para evitarlo, organicé mis notas en Obsidian creando una carpeta por cada máquina o sección del examen. Ahí fui guardando la información relevante conforme la encontraba.

Por ejemplo:

* Usuarios.
* Contraseñas.
* Direcciones IP.
* Flags.
* Archivos importantes.
* Ubicaciones interesantes.
* Credenciales.
* Comandos relevantes.
* Notas rápidas sobre posibles líneas de investigación.

Esto me permitió centralizar la información importante y tenerla disponible cuando la necesitaba, sin depender de recordar cada detalle al final.

### Error 4: No darle la importancia necesaria al reporte

Si hay algo que me gustaría enfatizar de esta certificación es la importancia del reporte.

Es fácil caer en la idea de que lo más importante es encontrar las flags, pero el reporte es la evidencia real de todo el trabajo realizado durante el examen.

Piensa en el reporte como la forma en que vas a demostrar tus hallazgos. No basta con llegar al resultado final; también debes explicar cómo llegaste hasta él.

Durante el examen intentaba hacerme estas preguntas:

> ¿Cómo explicaría este paso a otra persona?

> ¿Qué necesitaría ver un evaluador para entender cómo llegué hasta aquí?

Una flag por sí sola cuenta muy poco si no existe una línea lógica que explique el proceso. Lo que realmente aporta valor es demostrar cómo investigaste, qué decisiones tomaste, qué evidencia encontraste y por qué llegaste a determinada conclusión.

Si encuentras información relevante, obtienes acceso a un sistema o identificas actividad sospechosa, debes ser capaz de explicar qué hiciste, qué observaste y cómo esa evidencia respalda tu hallazgo.

Por eso recomiendo pensar en el reporte desde el primer minuto del examen y no únicamente cuando llega el momento de redactarlo. Mientras mejor documentado tengas el proceso, más fácil será construir una narrativa clara y sólida.

### Error 5: No tomar suficientes capturas

Una de las recomendaciones que recibí en la retroalimentación del examen fue tomar más capturas.

Durante el examen sentía que tenía suficiente evidencia, pero al momento de redactar el reporte me di cuenta de que en algunas partes la narrativa quedaba incompleta. Sabía cómo había llegado a ciertos hallazgos, pero me faltaban capturas para demostrar mejor el proceso.

Por eso tuve que regresar a tomar evidencia adicional de puntos que no había documentado tan bien como pensaba.

Mi recomendación es simple: documenta cada paso relevante. Si dudas si una captura vale la pena, probablemente sí la vale.

Es mejor tener evidencia de sobra que descubrir al final que falta una captura importante para explicar cómo llegaste a un hallazgo.


---
## Recursos adicionales

### Recurso adicional para practicar Blue Team

Para quienes quieran practicar esta parte con un enfoque más cercano al análisis defensivo, he creado un recurso específico llamado **CJCA: Laboratorio Blue Team para practicar triage de alertas**.

El laboratorio se llama **Aurelius Blue Alert Lab** y está diseñado para practicar triage de alertas en **Elastic/Kibana** desde un entorno seguro, sintético y orientado al análisis. El escenario simula a **Aurelius Labs**, una empresa ficticia donde el objetivo del analista es revisar un conjunto de alertas, investigar los logs relacionados y clasificarlas como **True Positive** o **False Positive** utilizando evidencia concreta.

La idea principal es sencilla: se cargan eventos en Elastic, se revisan las alertas en Kibana, se investigan los logs asociados y se justifica cada clasificación con base en lo observado.

Puedes revisar el laboratorio aquí: <a href="/blog/cjca-blue-team-laboratorio/" target="_blank" rel="noopener noreferrer">
  CJCA: Laboratorio Blue Team para practicar triage de alertas
</a>

---

### Recurso adicional para practicar el reporte

He creado un recurso enfocado específicamente en cómo reportar con un estilo orientado a **CJCA**. En este material explico las partes principales que debería incluir un reporte, cómo organizar la evidencia, cómo redactar hallazgos de forma clara y cómo presentar el análisis sin limitarse únicamente a pegar comandos o capturas.

El recurso también incluye un ejemplo práctico, lo cual puede servir como referencia para entender cómo transformar la información recolectada durante la práctica en un reporte más ordenado y útil.

La idea no es memorizar una plantilla, sino acostumbrarse a documentar con intención: explicar qué se hizo, qué se encontró, por qué es relevante y cómo se llegó a cada conclusión.

Puedes revisar el recurso aquí:  <a href="/blog/cja_reporte/" target="_blank" rel="noopener noreferrer">
  Guía para crear un reporte estilo CJCA
</a>

---


## Conclusión

En general, considero que CJCA es una certificación muy interesante para quienes quieren desarrollar habilidades prácticas y tener una primera experiencia en escenarios más cercanos a un entorno real.

Lo que más me gustó de la certificación es que no se limita únicamente a explotar máquinas o encontrar flags. También exige analizar información, relacionar evidencias, justificar conclusiones y documentar los hallazgos de forma clara.

Si tuviera que resumir lo aprendido durante esta experiencia, destacaría varios puntos importantes:

* Construir una metodología propia.
* Practicar más allá del path de preparación.
* Aprender a investigar y formular mejores preguntas.
* Documentar desde el primer minuto.
* No subestimar la importancia del reporte.
* Pensar como investigador, no solo como alguien que busca una flag.

Al final, CJCA no solo evalúa conocimientos técnicos. También pone a prueba la forma en que abordas un problema, cómo interpretas la información disponible, cómo conectas diferentes hallazgos y cómo comunicas tus resultados.

Mi recomendación final es preparar la certificación con calma, practicar con intención y darle mucha importancia a la documentación. Mientras más ordenado sea tu proceso durante la preparación y el examen, más fácil será construir un reporte sólido y demostrar realmente el trabajo que realizaste.
