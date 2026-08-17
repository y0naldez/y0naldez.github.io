---
title: "Cómo prepararte para el CPTS: metodología, máquinas y consejos para el examen"
description: "Consejos basados en mi experiencia con el CPTS: máquinas recomendadas, credential hunting, pivoting, Active Directory, documentación y errores que conviene evitar."
pubDate: 2026-08-14T12:00:00-06:00
heroImage: '../../../assets/cpts/cover.png'
lang: "es"
category: "CPTS"
---

Prepararte para el **Certified Penetration Testing Specialist (CPTS)** no consiste únicamente en completar el path de Academy ni en memorizar una colección de comandos.

El examen te obliga a conectar vulnerabilidades, credenciales, usuarios, servicios y redes dentro de una cadena de ataque mucho más amplia.

En esta guía encontrarás una metodología de preparación, máquinas recomendadas, temas que conviene reforzar y varios errores que deberías evitar durante el examen.

El contenido no revela respuestas, credenciales ni soluciones del entorno. Su objetivo es ayudarte a desarrollar una metodología que puedas adaptar al escenario que tengas delante.

---

## Cómo funciona el CPTS

Primero hay que entender qué evalúa realmente la certificación.

El examen no funciona como una colección de vulnerabilidades aisladas. Lo que vas a encontrar son **distintas técnicas conectadas entre sí dentro de múltiples cadenas de ataque**.

Por ejemplo, una vulnerabilidad puede darte unas credenciales. Esas credenciales quizá te permitan entrar a otro servicio, comprometer una nueva máquina y, durante la enumeración, encontrar información que termine siendo útil bastante más adelante.

Entonces, más que pensar:

> “Encontré la flag, siguiente máquina.”

Conviene acostumbrarse a pensar:

> “¿Qué usuarios encontré? ¿Qué credenciales tengo ahora? ¿Qué servicios nuevos puedo probar? ¿A qué redes o sistemas tengo acceso?”

Esa información puede ser importante varios pasos después.

La clave es entender que **cada hallazgo puede convertirse en el punto de partida del siguiente**.

---

## No memorices ataques: practica variantes

No te quedes únicamente con el comando o el payload que funcionó en un laboratorio.

Parece algo básico, pero intenta practicar distintas variantes de las técnicas que aparecen en el path de preparación.

La idea es que, cuando encuentres una vulnerabilidad, no pienses solamente:

> “¿Qué comando tengo que usar?”

Hazte también estas preguntas:

> “¿Qué capacidad me da esta vulnerabilidad y qué caminos puedo abrir a partir de ella?”

En el examen probablemente no encontrarás exactamente el mismo escenario que viste en Academy. Lo importante es entender la técnica lo suficiente como para adaptarla cuando cambien las condiciones.

### Ejemplo: LFI

Imagina que durante la enumeración encuentras un parámetro vulnerable a **Local File Inclusion** y confirmas que puedes leer archivos del servidor.

En ese punto sería un error limitarte a revisar archivos típicos del sistema o configuraciones conocidas. Ya tienes una capacidad importante, así que lo siguiente es pensar qué otras cosas puedes extraer de ella.

El código fuente de la aplicación podría contener los siguientes elementos:

- Credenciales.
- Rutas internas.
- Endpoints ocultos.
- Configuraciones sensibles.
- Lógica que te lleve al siguiente paso de la cadena.

Puede que ese código no sea legible directamente y tengas que recurrir a wrappers como `php://filter`.

En otro escenario, el mismo parámetro podría permitirte acceder a recursos internos y, al combinarlo con otras técnicas o con herramientas como `proxychains`, terminar convirtiendo el LFI en ejecución de código.

Aunque ya tengas una variante que funciona, **no asumas que ahí termina la vulnerabilidad**.

La pregunta debería ser:

> “Ya confirmé el LFI. ¿De qué otras formas puedo aprovechar esta capacidad y qué nuevo camino puede abrirme?”

Esa es la mentalidad que conviene practicar para la certificación: probar variantes de una misma técnica y reconocer cuándo una vulnerabilidad puede convertirse en el puente hacia la siguiente parte de la cadena.

---

## Máquinas recomendadas

Si estás organizando tu preparación, estas son algunas máquinas de Hack The Box que vale la pena priorizar.

No porque vayan a replicar exactamente lo que encontrarás en el examen, sino porque ayudan a practicar técnicas y conceptos que conviene dominar antes de presentarte.

La meta es que llegues con soltura en las siguientes áreas:

- SQL Injection.
- LFI.
- Credential hunting.
- Password cracking.
- Enumeración de servicios.
- Active Directory.
- Abuso de permisos.
- Pivoting.
- Escalada de privilegios.

### Easy

1. **Trick**
2. **ServMon**
3. **Squashed**
4. **Return**
5. **Forest**

### Medium

6. **Union**
7. **Unattended**
8. **Jeeves**
9. **UpDown**
10. **Inception**
11. **Breach**
12. **Authority**
13. **Administrator**
14. **VulnCicada**
15. **Voleur**
16. **TombWatcher**

### Hard

17. **Phoenix**
18. **Vintage**

### Insane

19. **Ghost**

No necesitas completar todas las máquinas en orden. Utiliza la lista para identificar las áreas en las que tienes menos práctica y elige objetivos que te obliguen a reforzarlas.

---

## Credential hunting: qué buscar durante la post-explotación

Conseguir una shell y la flag no significa que terminaste.

A partir de ese momento comienza otra fase de enumeración dentro del sistema comprometido: **el credential hunting**.

Revisa todo lo que pueda darte nuevas pistas, por ejemplo:

- Archivos de configuración.
- Backups.
- Claves SSH.
- Archivos cifrados.
- Sesiones guardadas.
- Historiales.
- Credenciales.
- Cualquier otro artefacto que pueda servir más adelante.

Una herramienta de credential hunting puede ahorrarte bastante trabajo durante esta fase.

Durante el examen utilicé <a href="https://github.com/NeCr00/Credential-Hunting" target="_blank" rel="noopener noreferrer">
  Credential-Hunting de NeCr00
</a>.

Su función es recorrer el sistema de forma pasiva y buscar archivos, configuraciones y patrones que puedan contener credenciales o información sensible.

A partir de esa herramienta también preparé <a href="https://github.com/y0naldez/Credential-Hunting" target="_blank" rel="noopener noreferrer">
  mi propio fork de Credential-Hunting
</a>.

He añadido y mejorado algunos patrones de búsqueda para detectar elementos como sesiones guardadas, claves cifradas y otros artefactos útiles durante la post-explotación. La idea es continuar actualizándolo conforme lo pruebe en más máquinas y laboratorios.

### Ejemplo de salida

La siguiente captura muestra un ejemplo de la salida de **Credential-Hunting** al identificar archivos que contienen posibles credenciales o información relevante para continuar la búsqueda.

![Ejemplo de Credential-Hunting detectando posibles credenciales y archivos de interés](../../../assets/cpts/console.jpg)

Es importante dejar algo claro: **estas herramientas no sustituyen a las utilidades especializadas**.

En Windows, por ejemplo, pueden seguir siendo necesarias herramientas como las siguientes:

- LaZagne.
- Rubeus.
- Mimikatz, cuando el escenario lo permita.
- Utilidades específicas para enumerar sesiones.

La herramienta automatizada te ayuda a ampliar la búsqueda, pero todavía necesitas entender qué estás buscando y por qué puede ser importante.

---

## Pivoting

El **pivoting** es otro concepto que necesitas dominar antes de iniciar el examen.

Durante el examen utilicé <a href="https://github.com/nicocha30/ligolo-ng" target="_blank" rel="noopener noreferrer">
  Ligolo-ng
</a>.

Es una herramienta práctica para trabajar con redes internas porque simplifica bastante la creación de rutas y túneles.

Pero la herramienta es lo de menos si todavía no entiendes cómo funciona el acceso entre redes.

No llegues al examen intentando aprender pivoting sobre la marcha. Antes deberías poder trabajar con los siguientes escenarios:

- Pivoting simple.
- Doble pivot.
- Port forwarding.
- Acceso a redes internas.
- Rutas que atraviesan uno o varios saltos.

Al final, el escenario base suele ser el mismo:

> “Comprometimos una máquina que tiene acceso a una red que nuestro host no puede alcanzar directamente.”

Para practicarlo en Hack The Box, puedes utilizar estas máquinas:

- **Reddish**.
- **Vault**.
- **Tentacle**.
- **Inception**.

Los escenarios de pivoting más elaborados suelen aparecer en máquinas de mayor dificultad. Son útiles para acostumbrarte a trabajar con rutas, túneles y saltos más complejos.

Conviene llevar esta parte muy practicada. Si llegas al examen con dudas, puedes perder bastante tiempo resolviendo problemas de conectividad en lugar de concentrarte en la enumeración y la explotación.

---

## Active Directory

Otro punto clave de la preparación es **Active Directory**.

Esta parte tiene bastante peso dentro de la cadena completa del assessment, así que conviene llegar con una metodología clara para enumerar, interpretar permisos y decidir qué hacer cada vez que consigues una nueva identidad.

Los siguientes temas te ayudarán a construir una base más sólida.

### 1. Reconocimiento del dominio

Antes de explotar cualquier cosa, entiende el dominio.

Como mínimo, identifica estos elementos:

- La dirección IP y el rango de red.
- Los usuarios.
- Los grupos.
- Las computadoras.
- Los controladores de dominio.
- Las relaciones de confianza o *trusts*.
- Los servicios.
- Los recursos compartidos o *shares*.

El objetivo es construir un mapa inicial del entorno antes de empezar a tomar decisiones.

### 2. Enumeración mediante RPC

No ignores RPC.

Puede darte usuarios, grupos y otra información útil incluso antes de conseguir una posición privilegiada.

Una enumeración temprana puede descubrir identidades que después podrás probar contra otros servicios o utilizar para ampliar la información del dominio.

### 3. Enumeración mediante SMB

Revisa siempre los **shares y sus permisos**.

Al revisar cada recurso compartido, hazte estas preguntas:

- ¿Qué puedo leer?
- ¿Qué puedo modificar?
- ¿Cómo puedo aprovechar ese acceso?

Un permiso de lectura puede exponerte credenciales, backups o configuraciones sensibles. Un permiso de escritura puede abrir caminos para subir archivos, modificar scripts o provocar la captura de hashes.

Cada vez que consigas una nueva cuenta, **vuelve a enumerar los shares y sus permisos**. Esa identidad puede tener acceso a recursos que antes no podías ver.

### 4. Enumeración mediante LDAP

LDAP también puede proporcionarte información muy valiosa:

- Usuarios.
- Grupos.
- Atributos.
- Servicios.
- ACLs.
- Relaciones entre objetos.
- Objetos eliminados.

La clave no es solo enumerar, sino entender **qué dato puede abrirte un nuevo camino dentro del dominio**.

### 5. Kerberoasting

No memorices únicamente el comando para solicitar tickets. Para entender la técnica, necesitas tener claros estos conceptos:

- **¿Qué es un SPN?** Es el identificador que vincula un servicio con la cuenta bajo la que se ejecuta. Localizar cuentas con un SPN registrado permite identificar posibles objetivos de Kerberoasting.
- **¿Por qué puedes solicitar un TGS?** Porque un usuario autenticado en el dominio puede pedir a Kerberos un ticket de servicio para acceder a un servicio que tenga un SPN registrado. No necesitas conocer la contraseña de la cuenta de servicio para solicitarlo.
- **¿Qué parte del ticket intentas descifrar?** Una parte del TGS está cifrada con una clave derivada de la contraseña de la cuenta de servicio. Esto permite probar contraseñas sin conexión hasta encontrar una que genere la clave correcta.
- **¿Qué debes hacer después de recuperar una cuenta?** Validar sus credenciales contra los servicios disponibles y repetir la enumeración de grupos, recursos compartidos, sesiones, permisos y relaciones del dominio.

Entender estas respuestas es más útil que memorizar una sintaxis. Así podrás reconocer una oportunidad de Kerberoasting aunque cambien la herramienta, el dominio o la cuenta objetivo.

La técnica no termina cuando recuperas la contraseña. La cuenta obtenida debe convertirse en un nuevo punto de enumeración.

### 6. AS-REP Roasting

Antes de aplicar AS-REP Roasting, entiende qué significa que una cuenta no requiera preautenticación de Kerberos, por qué esa configuración permite obtener material cifrado y cómo identificar las cuentas afectadas.

Después, al igual que con cualquier credencial nueva, valida dónde puede utilizarse y qué acceso adicional proporciona.

### 7. ACEs y ACLs

Esta es una de las áreas de Active Directory en las que más vale la pena profundizar.

Durante la enumeración encontrarás distintos permisos y relaciones entre objetos. Más que memorizar el nombre de cada permiso o asociarlo directamente con un comando, lo importante es entender **qué capacidad te proporciona y sobre qué objeto la tienes**.

Por ejemplo, no memorices algo como:

> “GenericWrite significa ejecutar este comando.”

La pregunta debería ser:

> “Tengo GenericWrite, pero ¿sobre qué objeto?”

No es lo mismo tener ese permiso sobre los siguientes objetos:

- Un usuario.
- Un grupo.
- Una cuenta de equipo.
- Una cuenta de servicio.
- Otro objeto del dominio.

Dependiendo del objeto, las posibilidades cambian por completo.

Incluso puedes tener dos o más permisos sobre un mismo objetivo, pero eso no significa que todos sean igual de útiles. Según el tipo de objeto y lo que quieras conseguir, un permiso puede abrir un camino mucho más interesante que otro.

Active Directory es demasiado amplio para intentar aprenderlo a partir de una sola máquina o una única ruta de ataque.

No queda de otra: **devora la mayor cantidad de máquinas de Active Directory que puedas**.

Con el tiempo notarás que muchas técnicas vuelven a aparecer, pero casi siempre dentro de contextos distintos. Cambian las relaciones, los permisos disponibles y la forma en que necesitas combinarlos para avanzar.

La meta es que puedas adaptarte al escenario que tienes delante en lugar de depender de una secuencia que ya hayas visto.

### Recurso recomendado: notas de Active Directory de ArtesOscuras

Para profundizar en estos temas, puedes consultar las <a href="https://github.com/ArtesOscuras/Notes/tree/main/Active%20Directory" target="_blank" rel="noopener noreferrer">
  notas de Active Directory creadas por ArtesOscuras
</a>.

El repositorio organiza distintas técnicas y formas de abuso en secciones dedicadas a **Kerberos**, **persistencia**, **relaciones de confianza**, **DNS**, **MSSQL**, **gMSA** y recopilación de información con **BloodHound**, entre otros temas.

También incluye un apartado específico sobre abuso de DACLs con notas para permisos y técnicas como:

- `GenericAll`, `GenericWrite` y `AllExtendedRights`.
- `WriteDACL`, `WriteOwner` y `WriteSPN`.
- `AddMember` y `AddSelf`.
- `ForceChangePassword`.
- `AddKeyCredentialLink` o *Shadow Credentials*.

Más que utilizar el repositorio como una lista de comandos, úsalo como referencia para ampliar tus propias notas. Para cada técnica, documenta qué permiso necesitas, sobre qué tipo de objeto puede aplicarse, qué resultado produce y cómo validar que el abuso funcionó. De esta forma tendrás una guía que podrás adaptar al contexto del dominio en lugar de depender de una receta fija.

---

## La famosa flag 8

Si buscas experiencias del CPTS en Reddit o en otros foros, probablemente encontrarás varias menciones a **la famosa Flag 8**.

Puede llegar a ser frustrante porque la cadena se alarga y te obliga a **reevaluar el dominio a medida que consigues nuevas cuentas**.

Ese es precisamente el punto.

Una credencial nueva puede producir cualquiera de estos cambios:

- Darte acceso a un recurso compartido diferente.
- Mostrarte nuevos permisos.
- Habilitar el acceso mediante WinRM o RDP.
- Abrir una ruta nueva en BloodHound.
- Volver viable una técnica que antes no lo era.

Durante esta parte no basta con enumerar una vez y continuar.

Cada nueva identidad puede cambiar lo que tienes disponible. Si no vuelves a revisar el entorno desde la perspectiva de esa cuenta, es fácil pasar por alto el siguiente paso.

Para recorrer una cadena de este tipo, conviene saber combinar herramientas como las siguientes:

- NetExec.
- BloodHound.
- PowerView.
- Rubeus.
- LaZagne.
- Certipy.

Probablemente tendrás que combinar varias dentro de la misma cadena.

La idea central de esta parte puede resumirse así:

> **Cada nueva cuenta puede desbloquear la siguiente parte de la cadena. No des por terminada la enumeración solo porque ya la hiciste una vez.**

---

## Consejos y errores que debes evitar

La parte técnica es importante, pero durante un examen largo la organización, la evidencia y el manejo del tiempo pueden marcar la diferencia.

Estos son los errores que más conviene evitar.

### 1. Dejar el reporte para el final

Uno de los errores más comunes es pensar:

> “Primero termino el examen y después documento todo.”

El problema es que, cuando llegas al final, ya tienes demasiados pasos, comandos y evidencias acumuladas. Reconstruir toda la cadena puede llevarte muchísimo tiempo.

Mantén un **borrador técnico mientras avanzas**.

No hace falta escribirlo directamente en SysReptor ni preocuparte todavía por que quede perfecto. Registra qué encontraste, qué comando utilizaste, qué resultado obtuviste y qué hiciste después.

Por ejemplo:

#### Domain Enumeration

The Tester executed the following command to enumerate the domain:

```bash
sudo nxc smb <IP> -u '' -p ''
```

**Result:**

```text
[Añadir resultado relevante]
```

```text
[Añadir evidencia fotográfica]
```

Después puedes continuar con el siguiente paso.

#### Vulnerable File or Service

The Tester identified a vulnerable file or service that allowed access to additional information.

```bash
<COMANDO>
```

**Evidence:**

```text
[Añadir evidencia fotográfica]
```

La idea es que el borrador crezca junto con tu progreso.

Cuando llegue el momento de preparar el reporte final, no tendrás que recordar cómo llegaste a cada punto. Ya tendrás la cadena documentada y solo te quedará ordenarla, mejorar la redacción y pasarla a la plantilla.

### 2. Toma más capturas de las que crees necesarias

Es mejor terminar con capturas de sobra que descubrir, mientras redactas, que te falta una evidencia importante.

Cuando estás resolviendo el examen puede parecer obvio que cierto paso funcionó. Sin embargo, al escribir el reporte empiezan a aparecer preguntas como:

> “¿Tengo evidencia de que este usuario realmente tenía ese permiso?”

> “¿Tomé una captura del hash antes de crackearlo?”

> “¿Tengo evidencia de la conexión con este usuario?”

Si no tienes esa evidencia, probablemente tendrás que volver al entorno, reconstruir parte de la cadena y repetir acciones únicamente para obtener una captura.

Por eso, **si dudas si deberías tomar una captura, tómala**.

Recuerda que cualquier contraseña, hash o credencial sensible debe estar censurada o parcialmente oculta. La evidencia debe demostrar el hallazgo sin exponer credenciales completas.

Ejemplo:

![Ejemplo de evidencia con información sensible censurada](../../../assets/cpts/hash.png)

### 3. Cuando alcances los puntos necesarios, prioriza el reporte

Cuando obtengas la **flag 12**, cambia de prioridad.

Hasta ese momento tu objetivo principal era avanzar dentro del entorno. A partir de ahí, el reporte debería convertirse en lo más importante.

Obtener los puntos es solamente una parte del examen.

Puedes conseguir suficientes flags o incluso comprometer prácticamente todo el entorno, pero un reporte deficiente puede hacer que repruebes.

Cuando ya tengas los puntos necesarios, comienza a trabajar seriamente en la versión final. Después, si tienes tiempo y todo está bien documentado, puedes volver a intentar las flags restantes.

Y aquí también quiero quitarte un poco de presión:

> **No pasa absolutamente nada si no consigues todas las flags.**

Las flags adicionales no te convierten automáticamente en un mejor pentester ni existe un reconocimiento especial por terminar el examen con todo.

Primero asegúrate de tener:

1. los puntos necesarios;
2. una buena documentación;
3. evidencia suficiente;
4. y un reporte sólido.

Después puedes volver por lo demás.

### 4. Organiza tus notas por máquinas y rutas de ataque

No lleves todas tus notas en un único documento gigante y desordenado.

Utiliza Obsidian, Notion, CherryTree o la herramienta que prefieras, pero mantén una estructura clara.

La que utilicé fue parecida a esta:

```text
Máquinas
├── DC01
│   ├── FLAGS
│   └── RUTA
│
├── DC02
│   ├── FLAGS
│   └── RUTA
│
└── DEV01
    ├── FLAGS
    └── RUTA
```

Dentro de `FLAGS` guardaba directamente la respuesta y su evidencia.

Por ejemplo:

#### 8. Submit the user flag on DC01

```text
AAAABBBCCCDD111
```

```text
Evidencia fotográfica de la flag
```

Y después:

#### 9. Submit the root flag on DC01

```text
AAAABBBCCCDD222
```

```text
Evidencia fotográfica de la flag
```

Dentro de `RUTA`, en cambio, documentaba todo el proceso utilizado para comprometer la máquina.

Prácticamente lo escribía como si estuviera preparando un tutorial:

```text
Enumeración
    ↓
Vulnerabilidad encontrada
    ↓
Credenciales
    ↓
Nuevo usuario
    ↓
Privilege Escalation
    ↓
Flag
```

Incluía comandos, resultados importantes, explicaciones y capturas.

Esto me ayudó muchísimo porque, cuando llegó el momento de trabajar en SysReptor, gran parte del contenido ya estaba preparado. En muchos casos solo tuve que ordenar las notas, mejorar la redacción y convertirlas en una versión profesional.

### 5. Guarda hashes, credenciales y usuarios de forma organizada

Conforme avances, acumularás usuarios, contraseñas, hashes, tickets de Kerberos, claves SSH y cuentas de distintos sistemas.

Si toda esa información queda repartida entre terminales y notas sueltas, tarde o temprano perderás algo importante.

Lo mejor es tener un archivo o una tabla dedicada exclusivamente a las credenciales:

| Usuario | Dominio/Host | Password / Hash | Tipo | Validado en |
|---|---|---|---|---|
| `user1` | `DOMAIN` | `Pass********` | Plaintext | SMB, WinRM |
| `svc_sql` | `DOMAIN` | `$krb5tgs$...` | TGS | Pendiente de cracking |
| `Administrator` | `DC01` | `aad3b...` | NTLM | WinRM |

Esto cobra todavía más importancia cuando llegas a Active Directory. Una credencial que no te servía al principio puede resultar útil más adelante contra una máquina, un servicio o un recurso que todavía no habías descubierto.

### 6. Reenumera con cada identidad nueva

Una nueva cuenta no es únicamente otra credencial para guardar.

Cada vez que consigas un usuario, vuelve a comprobar los siguientes puntos:

- Acceso mediante SMB.
- Acceso mediante WinRM.
- Acceso mediante RDP.
- Acceso mediante SSH.
- Recursos compartidos.
- Permisos y ACLs.
- Sesiones disponibles.
- Nuevas relaciones en BloodHound.
- Cualquier servicio que hayas descubierto previamente.

El entorno no cambió, pero **tu perspectiva dentro de él sí**.

Un recurso que era invisible o inaccesible con la cuenta anterior puede convertirse en el siguiente paso de la cadena.

### 7. Descansa

Este consejo parece una tontería hasta que llevas demasiadas horas mirando la misma terminal:

> **Descansa.**

Tienes **10 días**. Esto no es una carrera de caballos y no te conviertes en mejor pentester por terminar antes.

Si llevas horas atascado, llega un punto en el que empiezas a repetir comandos, ignorar pistas evidentes y cometer errores que normalmente no cometerías.

Cierra la terminal. Come algo. Toma una siesta. Sal a tocar pasto. Haz ejercicio. Mira una serie.

Haz cualquier cosa que permita que tu cabeza deje de pensar durante un rato en el examen.

La clave es encontrar un equilibrio. **Tienes tiempo: úsalo bien.**

### 8. Lleva el control del tiempo de spawn

No pierdas de vista el temporizador del entorno.

Al inicio tendrás aproximadamente **3000 minutos** y puede parecer suficiente, pero es fácil olvidarlo conforme avanzas en el examen.

En mi experiencia, la opción de extensión estuvo disponible cuando el contador bajó de los **100 minutos**, y cada extensión añadió aproximadamente **200 minutos**.

Revisa periódicamente el contador y extiende el entorno cuando la plataforma te permita hacerlo. Así evitarás perder el acceso y parte de tu progreso por un descuido.

No esperes a estar trabajando en una parte crítica para recordar que el entorno está a punto de expirar.

---

## Conclusión

El CPTS no se supera memorizando una ruta de ataque.

Necesitas aprender a enumerar, interpretar lo que encuentras, adaptar las técnicas y volver a evaluar el entorno cada vez que obtienes una nueva identidad o nivel de acceso.

Los puntos principales de esta guía pueden resumirse así:

- Entiende las técnicas en lugar de memorizar comandos.
- Practica variantes y cadenas de ataque completas.
- Domina el pivoting antes del examen.
- Profundiza en Active Directory.
- Documenta mientras avanzas.
- Guarda más evidencia de la que crees necesaria.
- Prioriza un reporte sólido cuando ya tengas los puntos.

Conseguir una flag demuestra que encontraste un camino.

Ser capaz de explicar ese camino, reproducirlo y documentar su impacto demuestra que entendiste la evaluación.
